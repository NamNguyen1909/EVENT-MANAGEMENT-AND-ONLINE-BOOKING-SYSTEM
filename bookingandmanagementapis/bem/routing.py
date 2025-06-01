import logging
from django.urls import re_path
from . import consumers

logger = logging.getLogger(__name__)
logger.info("Loading websocket_urlpatterns")
websocket_urlpatterns = [
    re_path(r'ws/chat/(?P<event_id>\d+)/$', consumers.ChatConsumer.as_asgi()),
]
logger.debug(f"WebSocket patterns loaded: {websocket_urlpatterns}")