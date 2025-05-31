"""
ASGI config for bookingandmanagementapis project.

It exposes the ASGI callable as a module-level variable named ``application``.

For more information on this file, see
https://docs.djangoproject.com/en/5.1/howto/deployment/asgi/
"""

# bookingandmanagementapis/asgi.py
import os
import logging
from django.core.asgi import get_asgi_application
from channels.routing import ProtocolTypeRouter, URLRouter

logger = logging.getLogger(__name__)
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'bookingandmanagementapis.settings')
django_asgi_app = get_asgi_application()

from bem.middleware import TokenAuthMiddleware
import bem.routing

application = ProtocolTypeRouter({
    'http': django_asgi_app,
    'websocket': TokenAuthMiddleware(
        URLRouter(bem.routing.websocket_urlpatterns)
    ),
})
logger.info("ASGI application started with WebSocket support")
