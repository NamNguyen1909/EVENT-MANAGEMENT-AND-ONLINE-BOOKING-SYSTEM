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

        # Kiểm tra xác thực
        if not self.user or not self.user.is_authenticated:
            logger.error(f"Người dùng chưa xác thực: {self.user}")
            await self.close(code=4001)
            return

        logger.info(f"Người dùng đã xác thực: {self.user.username} (ID: {self.user.id})")

        try:
            # Lấy dữ liệu sự kiện từ database
            event_data = await database_sync_to_async(
                lambda: Event.objects.filter(id=self.event_id).values('id', 'end_time', 'organizer_id').first()
            )()
            if not event_data:
                raise Event.DoesNotExist

            logger.debug(f"Tìm thấy sự kiện: {event_data['id']}, end_time={event_data['end_time']}")

            # Kiểm tra end_time
            now = await database_sync_to_async(timezone.now)()
            if event_data['end_time'] < now:
                logger.error(f"Sự kiện {self.event_id} đã kết thúc")
                await self.accept()
                await self.send(text_data=json.dumps({'error': 'Sự kiện đã kết thúc.'}))
                await self.close(code=4004)
                return

            # Kiểm tra quyền truy cập
            is_organizer = event_data['organizer_id'] == self.user.id
            has_ticket = await database_sync_to_async(
                lambda: Ticket.objects.filter(event_id=self.event_id, user=self.user, is_paid=True).exists()
            )()
            if not (is_organizer or has_ticket):
                logger.error(f"Người dùng {self.user.username} không có quyền truy cập sự kiện {self.event_id}")
                await self.accept()
                await self.send(text_data=json.dumps({'error': 'Bạn không có quyền truy cập phòng chat.'}))
                await self.close(code=4004)
                return

            logger.info(f"Người dùng {self.user.username} có quyền: is_organizer={is_organizer}, has_ticket={has_ticket}")

            # Thêm vào nhóm và chấp nhận kết nối
            await self.channel_layer.group_add(self.room_group_name, self.channel_name)
            await self.accept()
            logger.info(f"Kết nối WebSocket thành công cho người dùng {self.user.username} (ID: {self.user.id}) đến sự kiện {self.event_id}")

            # Gửi lịch sử tin nhắn
            messages = await database_sync_to_async(
                lambda: list(ChatMessage.objects.filter(event_id=self.event_id).order_by('-created_at')[:50])
            )()
            serializer_data = await database_sync_to_async(
                lambda: ChatMessageSerializer(messages, many=True).data
            )()
            await self.send(text_data=json.dumps({'history': serializer_data}))
            logger.debug(f"Đã gửi {len(messages)} tin nhắn gần đây đến người dùng {self.user.username}")

        except Event.DoesNotExist:
            logger.error(f"Sự kiện {self.event_id} không tìm thấy")
            await self.accept()
            await self.send(text_data=json.dumps({'error': 'Sự kiện không tồn tại.'}))
            await self.close(code=4005)
        except Exception as e:
            logger.error(f"Lỗi trong connect: {str(e)}")
            await self.accept()
            await self.send(text_data=json.dumps({'error': 'Lỗi kết nối.'}))
            await self.close(code=4000)

    async def disconnect(self, close_code):
        event_id = getattr(self, 'event_id', 'unknown')
        user = getattr(self, 'user', 'unknown')
        logger.info(f"Ngắt kết nối WebSocket cho sự kiện {event_id}, người dùng {user}, mã {close_code}")
        room_group_name = getattr(self, 'room_group_name', 'unknown')
        await self.channel_layer.group_discard(room_group_name, self.channel_name)

    async def receive(self, text_data):
        from bem.models import ChatMessage, Event, User, Ticket
        logger.debug(f"Nhận tin nhắn cho sự kiện {self.event_id}: {text_data}")

        try:
            # Kiểm tra lại token
            auth_header = dict(self.scope['headers']).get(b'authorization', b'').decode()
            if auth_header.startswith('Bearer '):
                token = auth_header.replace('Bearer ', '')
                token_obj = await database_sync_to_async(AccessToken.objects.get)(token=token)
                is_valid = await database_sync_to_async(lambda: token_obj.is_valid())()
                if not is_valid:
                    logger.error(f"Token không hợp lệ hoặc đã hết hạn cho người dùng {self.user.username}")
                    await self.send(text_data=json.dumps({'error': 'Token không hợp lệ.'}))
                    await self.close(code=4001)
                    return
            else:
                logger.error(f"Không có token Bearer hợp lệ trong receive cho người dùng {self.user.username}")
                await self.send(text_data=json.dumps({'error': 'Token không hợp lệ.'}))
                await self.close(code=4001)
                return

            # Kiểm tra sự kiện
            event = await database_sync_to_async(
                lambda: Event.objects.select_related('organizer').get(id=self.event_id)
            )()
            now = await database_sync_to_async(timezone.now)()
            if event.end_time < now:
                logger.error(f"Sự kiện {self.event_id} đã kết thúc trong receive")
                await self.send(text_data=json.dumps({'error': 'Sự kiện đã kết thúc.'}))
                await self.close(code=4004)
                return

            # Kiểm tra quyền truy cập của người gửi
            is_organizer = await database_sync_to_async(
                lambda: event.organizer_id == self.user.id
            )()
            has_ticket = await database_sync_to_async(
                lambda: Ticket.objects.filter(event=event, user=self.user, is_paid=True).exists()
            )()
            if not (is_organizer or has_ticket):
                logger.error(f"Người dùng {self.user.username} không có quyền truy cập sự kiện {self.event_id}")
                await self.send(text_data=json.dumps({'error': 'Bạn không có quyền truy cập phòng chat.'}))
                await self.close(code=4004)
                return

            # Xử lý tin nhắn
            text_data_json = json.loads(text_data)
            message = text_data_json['message'].strip()
            receiver_id = text_data_json.get('receiver_id')

            if not message:
                logger.warning(f"Tin nhắn rỗng từ người dùng {self.user.username}")
                await self.send(text_data=json.dumps({'error': 'Tin nhắn không được để trống.'}))
                return
            if len(message) > 1000:
                logger.warning(f"Tin nhắn quá dài từ người dùng {self.user.username}")
                await self.send(text_data=json.dumps({'error': 'Tin nhắn quá dài.'}))
                return

            # Kiểm tra quyền truy cập của người nhận nếu có
            receiver = None
            if receiver_id:
                try:
                    receiver = await database_sync_to_async(
                        lambda: User.objects.get(id=receiver_id)
                    )()
                    # Người nhận có quyền nếu là người tổ chức hoặc có vé đã thanh toán
                    has_access = await database_sync_to_async(
                        lambda: receiver.id == event.organizer_id or Ticket.objects.filter(event=event, user=receiver, is_paid=True).exists()
                    )()
                    logger.debug(f"Kiểm tra quyền truy cập người nhận {receiver_id}: is_organizer={receiver.id == event.organizer_id}, has_ticket={await database_sync_to_async(lambda: Ticket.objects.filter(event=event, user=receiver, is_paid=True).exists())()}")
                    if not has_access:
                        logger.warning(f"Người nhận {receiver_id} không có quyền truy cập sự kiện {self.event_id}")
                        await self.send(text_data=json.dumps({'error': 'Người nhận không tham gia sự kiện này.'}))
                        return
                except User.DoesNotExist:
                    logger.error(f"Người nhận {receiver_id} không tồn tại")
                    await self.send(text_data=json.dumps({'error': 'Người nhận không tồn tại.'}))
                    return

            # Lưu tin nhắn
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
            logger.debug(f"Tin nhắn đã lưu: {message_data}")

            # Gửi tin nhắn
            try:
                if receiver_id:
                    receiver_channel = f'user_{receiver_id}'
                    await self.channel_layer.group_send(receiver_channel, {
                        'type': 'chat_message',
                        'message': message_data,
                    })
                    logger.info(f"Tin nhắn riêng đã gửi đến người dùng {receiver_id}")
                else:
                    await self.channel_layer.group_send(self.room_group_name, {
                        'type': 'chat_message',
                        'message': message_data,
                    })
                    logger.info(f"Tin nhắn công khai đã gửi đến nhóm {self.room_group_name}")
                await self.send(text_data=json.dumps({'status': 'Tin nhắn đã được gửi thành công.'}))
            except Exception as e:
                logger.warning(f"Không thể gửi tin nhắn đến người dùng {receiver_id if receiver_id else 'nhóm'}: {str(e)}")
                await self.send(text_data=json.dumps({'warning': 'Tin nhắn đã lưu nhưng người nhận hiện không online.'}))

        except Event.DoesNotExist:
            logger.error(f"Sự kiện {self.event_id} không tìm thấy trong receive")
            await self.send(text_data=json.dumps({'error': 'Sự kiện không tồn tại.'}))
            await self.close(code=4005)
        except json.JSONDecodeError:
            logger.error(f"Dữ liệu JSON không hợp lệ: {text_data}")
            await self.send(text_data=json.dumps({'error': 'Dữ liệu không hợp lệ.'}))
        except AccessToken.DoesNotExist:
            logger.error(f"Token không tìm thấy trong receive cho người dùng {self.user.username}")
            await self.send(text_data=json.dumps({'error': 'Token không hợp lệ.'}))
            await self.close(code=4001)
        except Exception as e:
            logger.error(f"Lỗi trong receive: {str(e)}")
            await self.send(text_data=json.dumps({'error': 'Không thể xử lý tin nhắn.'}))

    async def chat_message(self, event):
        await self.send(text_data=json.dumps({'message': event['message']}))
        logger.debug(f"Đã gửi tin nhắn đến client: {event['message']}")