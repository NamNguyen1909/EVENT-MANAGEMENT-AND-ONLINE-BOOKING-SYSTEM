# bem/consumers.py
import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from oauth2_provider.models import AccessToken
from .models import ChatMessage, Event, User
from .serializers import ChatMessageSerializer

class ChatConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.event_id = self.scope['url_route']['kwargs']['event_id']
        self.room_group_name = f'chat_event_{self.event_id}'

        query_string = self.scope['query_string'].decode()
        token = dict(qc.split('=') for qc in query_string.split('&') if '=' in qc).get('token')
        if not token:
            await self.close()
            return

        try:
            token_obj = await database_sync_to_async(AccessToken.objects.get)(token=token)
            self.user = token_obj.user
        except AccessToken.DoesNotExist:
            await self.close()
            return

        if not await self.can_access_chat():
            await self.close()
            return

        await self.channel_layer.group_add(self.room_group_name, self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(self.room_group_name, self.channel_name)

    async def receive(self, text_data):
        text_data_json = json.loads(text_data)
        message = text_data_json['message']
        receiver_id = text_data_json.get('receiver_id')

        chat_message = await self.save_message(message, receiver_id)
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'chat_message',
                'message': ChatMessageSerializer(chat_message).data
            }
        )

    async def chat_message(self, event):
        await self.send(text_data=json.dumps({'message': event['message']}))

    @database_sync_to_async
    def can_access_chat(self):
        try:
            event = Event.objects.get(id=self.event_id)
            from .models import Ticket
            return (
                self.user == event.organizer or
                Ticket.objects.filter(user=self.user, event=event, is_paid=True).exists()
            )
        except Event.DoesNotExist:
            return False

    @database_sync_to_async
    def save_message(self, message, receiver_id):
        event = Event.objects.get(id=self.event_id)
        receiver = User.objects.get(id=receiver_id) if receiver_id else None
        is_from_organizer = self.user.role == 'organizer'
        return ChatMessage.objects.create(
            event=event,
            sender=self.user,
            receiver=receiver,
            message=message,
            is_from_organizer=is_from_organizer
        )