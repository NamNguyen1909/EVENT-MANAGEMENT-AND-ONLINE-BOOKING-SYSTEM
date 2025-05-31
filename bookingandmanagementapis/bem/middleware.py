import logging
from channels.db import database_sync_to_async
from django.contrib.auth.models import AnonymousUser
from django.core.cache import cache
from django.utils import timezone
from oauth2_provider.models import AccessToken

logger = logging.getLogger(__name__)

class TokenAuthMiddleware:
    def __init__(self, inner):
        self.inner = inner

    async def __call__(self, scope, receive, send):
        logger.debug("Starting TokenAuthMiddleware processing")
        headers = dict(scope['headers'])
        auth_header = headers.get(b'authorization', b'').decode()

        if not auth_header.startswith('Bearer '):
            logger.warning("No valid Bearer token provided in Authorization header")
            scope['user'] = AnonymousUser()
            return await self.inner(scope, receive, send)

        token = auth_header.replace('Bearer ', '')
        logger.debug(f"Processing token: {token[:10]}... (masked for security)")
        cache_key = f"token_{token}"

        # Kiểm tra cache với async
        logger.debug("Checking cache for token")
        cached_user = await database_sync_to_async(cache.get)(cache_key)
        if cached_user is not None:
            try:
                logger.debug("Verifying token in database")
                token_exists = await database_sync_to_async(
                    lambda: AccessToken.objects.filter(token=token, user=cached_user).exists()
                )()
                if token_exists:
                    logger.debug(f"User {cached_user.username} retrieved from cache")
                    scope['user'] = cached_user
                    return await self.inner(scope, receive, send)
                else:
                    logger.warning("Token found in cache but not in database, clearing cache")
                    await database_sync_to_async(cache.delete)(cache_key)
            except Exception as e:
                logger.error(f"Error validating cached token: {str(e)}")
                await database_sync_to_async(cache.delete)(cache_key)

        # Kiểm tra token trong database với async
        try:
            logger.debug("Fetching token from database")
            token_data = await database_sync_to_async(
                lambda: AccessToken.objects.filter(token=token).values('user', 'scope', 'expires').first()
            )()
            if not token_data:
                logger.warning("Token not found in database")
                scope['user'] = AnonymousUser()
                return await self.inner(scope, receive, send)

            logger.debug("Checking token validity")
            is_valid = await database_sync_to_async(
                lambda: token_data['expires'] > timezone.now()
            )()
            if is_valid:
                token_scope = token_data['scope']
                logger.debug(f"Token scope: {token_scope}")
                if 'websocket' not in token_scope.split():
                    logger.warning(f"Token lacks 'websocket' scope: {token_scope}")
                    scope['user'] = AnonymousUser()
                    return await self.inner(scope, receive, send)

                user = await database_sync_to_async(lambda: AccessToken.objects.get(token=token).user)()
                scope['user'] = user
                logger.debug("Calculating TTL for cache")
                ttl = await database_sync_to_async(
                    lambda: int((token_data['expires'] - timezone.now()).total_seconds())
                )()
                logger.debug(f"Setting cache with TTL: {ttl}")
                await database_sync_to_async(cache.set)(cache_key, user, timeout=ttl)
                logger.info(f"Token valid for user: {user.username}, cached with TTL {ttl}s")
            else:
                logger.warning("Token expired or invalid")
                scope['user'] = AnonymousUser()
        except Exception as e:
            logger.error(f"Error processing token: {str(e)}")
            scope['user'] = AnonymousUser()

        return await self.inner(scope, receive, send)