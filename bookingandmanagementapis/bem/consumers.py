# bem/consumers.py
import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from oauth2_provider.models import AccessToken
from django.utils import timezone
from bem.models import ChatMessage, Event, Ticket, User
from bem.serializers import ChatMessageSerializer

class ChatConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.event_id = self.scope['url_route']['kwargs']['event_id']
        self.room_group_name = f'chat_{self.event_id}'
        headers = dict(self.scope['headers'])
        auth_header = headers.get(b'authorization', b'').decode()

        if not auth_header.startswith('Bearer '):
            await self.close(code=4001)
            return

        token = auth_header.replace('Bearer ', '')
        try:
            token_obj = await database_sync_to_async(AccessToken.objects.get)(token=token)
            if token_obj.expires < timezone.now():
                await self.close(code=4002)
                return
            self.user = token_obj.user
        except AccessToken.DoesNotExist:
            await self.close(code=4003)
            return

        # Kiểm tra quyền truy cập
        event = await database_sync_to_async(Event.objects.get)(id=self.event_id)
        if timezone.make_aware(timezone.datetime(2025, 5, 22, 15, 50)) > event.end_time:
            await self.close(code=4004)
            return

        is_organizer = event.organizer == self.user
        has_ticket = await database_sync_to_async(Ticket.objects.filter(
            event=event, user=self.user, is_paid=True
        ).exists)()

        if not (is_organizer or has_ticket):
            await self.close(code=4004)
            return

        await self.channel_layer.group_add(self.room_group_name, self.channel_name)
        await self.accept()

        # Gửi lịch sử tin nhắn (50 tin nhắn gần nhất)
        messages = await database_sync_to_async(
            lambda: list(ChatMessage.objects.filter(event_id=self.event_id).order_by('-created_at')[:50])
        )()
        serializer = ChatMessageSerializer(messages, many=True)
        await self.send(text_data=json.dumps({'history': serializer.data}))

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(self.room_group_name, self.channel_name)

    async def receive(self, text_data):
        text_data_json = json.loads(text_data)
        message = text_data_json['message']
        receiver_id = text_data_json.get('receiver_id')

        if not message.strip():
            return

        chat_message = await database_sync_to_async(ChatMessage.objects.create)(
            event_id=self.event_id,
            sender=self.user,
            receiver_id=receiver_id,
            message=message,
            is_from_organizer=(self.user == await database_sync_to_async(Event.objects.get)(id=self.event_id).organizer)
        )

        serializer = ChatMessageSerializer(chat_message)
        if receiver_id:
            # Tin nhắn riêng: gửi tới sender và receiver
            receiver = await database_sync_to_async(User.objects.get)(id=receiver_id)
            receiver_channel = f'user_{receiver_id}'
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'chat_message',
                    'message': serializer.data,
                    'target_users': [self.user.id, receiver_id],
                }
            )
        else:
            # Tin nhắn nhóm: gửi tới tất cả trong phòng
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'chat_message',
                    'message': serializer.data,
                }
            )

    async def chat_message(self, event):
        message_data = event['message']
        target_users = event.get('target_users')
        if target_users and self.user.id not in target_users:
            return
        await self.send(text_data=json.dumps({'message': message_data}))