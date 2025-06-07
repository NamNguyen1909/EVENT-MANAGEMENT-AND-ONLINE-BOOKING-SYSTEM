import json
import logging
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.utils import timezone
from bem.serializers import ChatMessageSerializer
from oauth2_provider.models import AccessToken

logger = logging.getLogger(__name__)

class ChatConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        from bem.models import ChatMessage, Event, Ticket, User
        logger.debug(f"WebSocket connect attempt for event_id={self.scope['url_route']['kwargs']['event_id']}")
        
        self.event_id = self.scope['url_route']['kwargs']['event_id']
        self.room_group_name = f'chat_{self.event_id}'
        self.user = self.scope['user']

        # Authentication check
        if not self.user or not self.user.is_authenticated:
            logger.error(f"Unauthenticated user: {self.user}")
            await self.close(code=4001)
            return

        logger.info(f"Authenticated user: {self.user.username} (ID: {self.user.id})")

        try:
            # Fetch event data from database
            event_data = await database_sync_to_async(
                lambda: Event.objects.filter(id=self.event_id).values('id', 'end_time', 'organizer_id').first()
            )()
            if not event_data:
                raise Event.DoesNotExist

            logger.debug(f"Found event: {event_data['id']}, end_time={event_data['end_time']}")

            # Check event end time
            now = await database_sync_to_async(timezone.now)()
            if event_data['end_time'] < now:
                logger.error(f"Event {self.event_id} has ended")
                await self.accept()
                await self.send(text_data=json.dumps({'error': 'Sự kiện đã kết thúc.'}))
                await self.close(code=4004)
                return

            # Check access permissions
            is_organizer = event_data['organizer_id'] == self.user.id
            has_ticket = await database_sync_to_async(
                lambda: Ticket.objects.filter(event_id=self.event_id, user=self.user, is_paid=True).exists()
            )()
            if not (is_organizer or has_ticket):
                logger.error(f"User {self.user.username} has no access to event {self.event_id}")
                await self.accept()
                await self.send(text_data=json.dumps({'error': 'Bạn không có quyền truy cập phòng chat.'}))
                await self.close(code=4004)
                return

            logger.info(f"User {self.user.username} has access: is_organizer={is_organizer}, has_ticket={has_ticket}")

            # Add to event and user-specific groups
            await self.channel_layer.group_add(self.room_group_name, self.channel_name)
            await self.channel_layer.group_add(f'user_{self.user.id}', self.channel_name)
            await self.accept()
            logger.info(f"WebSocket connection successful for user {self.user.username} (ID: {self.user.id}) to event {self.event_id}")

            # Send message history
            messages = await database_sync_to_async(
                lambda: list(ChatMessage.objects.filter(event_id=self.event_id).order_by('-created_at')[:50])
            )()
            serializer_data = await database_sync_to_async(
                lambda: ChatMessageSerializer(messages, many=True).data
            )()
            await self.send(text_data=json.dumps({'history': serializer_data}))
            logger.debug(f"Sent {len(messages)} recent messages to user {self.user.username}")

        except Event.DoesNotExist:
            logger.error(f"Event {self.event_id} not found")
            await self.accept()
            await self.send(text_data=json.dumps({'error': 'Sự kiện không tồn tại.'}))
            await self.close(code=4005)
        except Exception as e:
            logger.error(f"Error in connect: {str(e)}")
            await self.accept()
            await self.send(text_data=json.dumps({'error': 'Lỗi kết nối.'}))
            await self.close(code=4000)

    async def disconnect(self, close_code):
        event_id = getattr(self, 'event_id', 'unknown')
        user = getattr(self, 'user', 'unknown')
        logger.info(f"WebSocket disconnection for event {event_id}, user {user}, code {close_code}")
        room_group_name = getattr(self, 'room_group_name', 'unknown')
        await self.channel_layer.group_discard(room_group_name, self.channel_name)
        if hasattr(self, 'user') and self.user.is_authenticated:
            await self.channel_layer.group_discard(f'user_{self.user.id}', self.channel_name)

    async def receive(self, text_data):
        from bem.models import ChatMessage, Event, User, Ticket
        logger.debug(f"Received message for event {self.event_id}: {text_data}")

        try:
            # Validate token
            auth_header = dict(self.scope['headers']).get(b'authorization', b'').decode()
            if auth_header.startswith('Bearer '):
                token = auth_header.replace('Bearer ', '')
                token_obj = await database_sync_to_async(AccessToken.objects.get)(token=token)
                is_valid = await database_sync_to_async(lambda: token_obj.is_valid())()
                if not is_valid:
                    logger.error(f"Invalid or expired token for user {self.user.username}")
                    await self.send(text_data=json.dumps({'error': 'Token không hợp lệ.'}))
                    await self.close(code=4001)
                    return
            else:
                logger.error(f"No valid Bearer token in receive for user {self.user.username}")
                await self.send(text_data=json.dumps({'error': 'Token không hợp lệ.'}))
                await self.close(code=4001)
                return

            # Check event
            event = await database_sync_to_async(
                lambda: Event.objects.select_related('organizer').get(id=self.event_id)
            )()
            now = await database_sync_to_async(timezone.now)()
            if event.end_time < now:
                logger.error(f"Event {self.event_id} has ended in receive")
                await self.send(text_data=json.dumps({'error': 'Sự kiện đã kết thúc.'}))
                await self.close(code=4004)
                return

            # Check sender's access permissions
            is_organizer = await database_sync_to_async(
                lambda: event.organizer_id == self.user.id
            )()
            has_ticket = await database_sync_to_async(
                lambda: Ticket.objects.filter(event=event, user=self.user, is_paid=True).exists()
            )()
            if not (is_organizer or has_ticket):
                logger.error(f"User {self.user.username} has no access to event {self.event_id}")
                await self.send(text_data=json.dumps({'error': 'Bạn không có quyền truy cập phòng chat.'}))
                await self.close(code=4004)
                return

            # Process message
            text_data_json = json.loads(text_data)
            message = text_data_json['message'].strip()
            receiver_id = text_data_json.get('receiver_id')

            if not message:
                logger.warning(f"Empty message from user {self.user.username}")
                await self.send(text_data=json.dumps({'error': 'Tin nhắn không được để trống.'}))
                return
            if len(message) > 1000:
                logger.warning(f"Message too long from user {self.user.username}")
                await self.send(text_data=json.dumps({'error': 'Tin nhắn quá dài.'}))
                return

            # Check receiver's access if specified
            receiver = None
            if receiver_id:
                try:
                    receiver = await database_sync_to_async(
                        lambda: User.objects.get(id=receiver_id)
                    )()
                    has_access = await database_sync_to_async(
                        lambda: receiver.id == event.organizer_id or Ticket.objects.filter(event=event, user=receiver, is_paid=True).exists()
                    )()
                    if not has_access:
                        logger.warning(f"Receiver {receiver_id} has no access to event {self.event_id}")
                        await self.send(text_data=json.dumps({'error': 'Người nhận không tham gia sự kiện này.'}))
                        return
                except User.DoesNotExist:
                    logger.error(f"Receiver {receiver_id} does not exist")
                    await self.send(text_data=json.dumps({'error': 'Người nhận không tồn tại.'}))
                    return

            # Save message
            chat_message = await database_sync_to_async(ChatMessage.objects.create)(
                event=event,
                sender=self.user,
                receiver=receiver,
                message=message,
                is_from_organizer=is_organizer
            )
            serializer_data = await database_sync_to_async(
                lambda: ChatMessageSerializer(chat_message).data
            )()
            message_data = serializer_data
            logger.debug(f"Saved message: {message_data}")

            # Gửi push notification nếu là tin nhắn riêng
            if receiver:
                from bem.utils import send_fcm_v1
                message_body = f"{self.user.username} - {event.title}: {message[:50]}..."
                await database_sync_to_async(send_fcm_v1)(
                    receiver,
                    title="Tin nhắn mới",
                    body=message_body,
                    data={
                        "event_id": str(event.id),
                        "message_id": str(chat_message.id),
                        "type": "chat_message"
                    }
                )

            # Gửi tin nhắn
            try:
                if receiver_id:
                    # Send private message to receiver
                    await self.channel_layer.group_send(f'user_{receiver_id}', {
                        'type': 'chat_message',
                        'message': message_data,
                    })
                    # Send message back to sender for history update
                    await self.send(text_data=json.dumps({'message': message_data}))
                    logger.info(f"Private message sent to user {receiver_id}")
                else:
                    await self.channel_layer.group_send(self.room_group_name, {
                        'type': 'chat_message',
                        'message': message_data,
                    })
                    logger.info(f"Public message sent to group {self.room_group_name}")
                await self.send(text_data=json.dumps({'status': 'Tin nhắn đã được gửi thành công.'}))
            except Exception as e:
                logger.warning(f"Could not send message to {receiver_id if receiver_id else 'group'}: {str(e)}")
                await self.send(text_data=json.dumps({'warning': 'Tin nhắn đã lưu nhưng người nhận hiện không online.'}))

        except Event.DoesNotExist:
            logger.error(f"Event {self.event_id} not found in receive")
            await self.send(text_data=json.dumps({'error': 'Sự kiện không tồn tại.'}))
            await self.close(code=4005)
        except json.JSONDecodeError:
            logger.error(f"Invalid JSON data: {text_data}")
            await self.send(text_data=json.dumps({'error': 'Dữ liệu không hợp lệ.'}))
        except AccessToken.DoesNotExist:
            logger.error(f"Token not found in receive for user {self.user.username}")
            await self.send(text_data=json.dumps({'error': 'Token không hợp lệ.'}))
            await self.close(code=4001)
        except Exception as e:
            logger.error(f"Error in receive: {str(e)}")
            await self.send(text_data=json.dumps({'error': 'Không thể xử lý tin nhắn.'}))

    async def chat_message(self, event):
        await self.send(text_data=json.dumps({'message': event['message']}))
        logger.debug(f"Sent message to client: {event['message']}")