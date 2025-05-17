"""
ASGI config for bookingandmanagementapis project.

It exposes the ASGI callable as a module-level variable named ``application``.

For more information on this file, see
https://docs.djangoproject.com/en/5.1/howto/deployment/asgi/
"""

# bookingandmanagementapis/asgi.py
import os
from django.core.asgi import get_asgi_application
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.security.websocket import AllowedHostsOriginValidator
from channels.auth import AuthMiddlewareStack

# Thiết lập settings trước khi import bất kỳ module nào liên quan đến mô hình
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'bookingandmanagementapis.settings')

# Khởi tạo ứng dụng Django để tải apps
django_asgi_app = get_asgi_application()

# Import routing sau khi ứng dụng được khởi tạo
import bem.routing

application = ProtocolTypeRouter({
    'http': django_asgi_app,
    'websocket': AllowedHostsOriginValidator(
        AuthMiddlewareStack(
            URLRouter(bem.routing.websocket_urlpatterns)
        )
    ),
})
