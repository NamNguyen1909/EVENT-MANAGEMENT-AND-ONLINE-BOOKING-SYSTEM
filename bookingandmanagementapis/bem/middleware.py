# bem/middleware.py
from channels.db import database_sync_to_async
from oauth2_provider.models import AccessToken
from django.utils import timezone

class TokenAuthMiddleware:
    def __init__(self, inner):
        self.inner = inner

    async def __call__(self, scope, receive, send):
        headers = dict(scope['headers'])
        auth_header = headers.get(b'authorization', b'').decode()
        if auth_header.startswith('Bearer '):
            token = auth_header.replace('Bearer ', '')
            try:
                token_obj = await database_sync_to_async(AccessToken.objects.get)(token=token)
                if token_obj.expires >= timezone.now():
                    scope['user'] = token_obj.user
                else:
                    scope['user'] = None
            except AccessToken.DoesNotExist:
                scope['user'] = None
        else:
            scope['user'] = None
        return await self.inner(scope, receive, send)