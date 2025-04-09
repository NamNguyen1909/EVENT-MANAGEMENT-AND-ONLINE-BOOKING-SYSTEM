from rest_framework import viewsets, generics, status, parsers, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import (
    User, Permission, UserPermission, Event, Ticket, Payment,
    Review, DiscountCode, Notification, ChatMessage
)
from . import serializers, paginators, perms
from django.shortcuts import get_object_or_404

# ViewSet cho User
class UserViewSet(viewsets.ViewSet, generics.CreateAPIView, generics.ListAPIView):
    queryset = User.objects.filter(is_active=True)
    serializer_class = serializers.UserSerializer
    parser_classes = [parsers.MultiPartParser]
    pagination_class = paginators.ItemPaginator

    def get_permissions(self):
        if self.action in ['get_current_user', 'tickets', 'payments', 'reviews', 'notifications']:
            return [permissions.IsAuthenticated()]
        return [permissions.AllowAny()]

    @action(methods=['get', 'patch'], detail=False, url_path='current-user')
    def get_current_user(self, request):
        user = request.user
        if request.method == 'PATCH':
            for key, value in request.data.items():
                if key in ['phone', 'preferences']:
                    setattr(user, key, value)
                elif key == 'password':
                    user.set_password(value)
            user.save()
        return Response(serializers.UserDetailSerializer(user).data)

    @action(methods=['get'], detail=True, url_path='tickets')
    def get_tickets(self, request, pk):
        user = self.get_object()
        tickets = user.tickets.all()
        page = self.paginate_queryset(tickets)
        if page is not None:
            serializer = serializers.TicketSerializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        return Response(serializers.TicketSerializer(tickets, many=True).data)

    @action(methods=['get'], detail=True, url_path='payments')
    def get_payments(self, request, pk):
        user = self.get_object()
        payments = user.payments.all()
        page = self.paginate_queryset(payments)
        if page is not None:
            serializer = serializers.PaymentSerializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        return Response(serializers.PaymentSerializer(payments, many=True).data)

    @action(methods=['get'], detail=True, url_path='reviews')
    def get_reviews(self, request, pk):
        user = self.get_object()
        reviews = user.reviews.all()
        page = self.paginate_queryset(reviews)
        if page is not None:
            serializer = serializers.ReviewSerializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        return Response(serializers.ReviewSerializer(reviews, many=True).data)

    @action(methods=['get'], detail=True, url_path='notifications')
    def get_notifications(self, request, pk):
        user = self.get_object()
        notifications = user.notifications.all()
        page = self.paginate_queryset(notifications)
        if page is not None:
            serializer = serializers.NotificationSerializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        return Response(serializers.NotificationSerializer(notifications, many=True).data)

# ViewSet cho Permission
class PermissionViewSet(viewsets.ViewSet, generics.ListAPIView):
    queryset = Permission.objects.all()
    serializer_class = serializers.PermissionSerializer
    pagination_class = paginators.ItemPaginator

# ViewSet cho Event
class EventViewSet(viewsets.ViewSet, generics.ListAPIView, generics.RetrieveAPIView):
    queryset = Event.objects.filter(is_public=True)
    serializer_class = serializers.EventSerializer
    pagination_class = paginators.ItemPaginator

    def get_queryset(self):
        query = self.queryset
        q = self.request.query_params.get('q')
        if q:
            query = query.filter(title__icontains=q)
        category = self.request.query_params.get('category')
        if category:
            query = query.filter(category=category)
        return query

    @action(methods=['get'], detail=True, url_path='tickets')
    def get_tickets(self, request, pk):
        event = self.get_object()
        tickets = event.tickets.all()
        page = self.paginate_queryset(tickets)
        if page is not None:
            serializer = serializers.TicketSerializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        return Response(serializers.TicketSerializer(tickets, many=True).data)

    @action(methods=['get', 'post'], detail=True, url_path='reviews')
    def manage_reviews(self, request, pk):
        event = self.get_object()
        if request.method == 'POST':
            if not request.user.is_authenticated:
                return Response({"detail": "Authentication required"}, status=status.HTTP_401_UNAUTHORIZED)
            serializer = serializers.ReviewSerializer(data={
                'user': request.user.pk,
                'event': pk,
                'rating': request.data.get('rating'),
                'comment': request.data.get('comment')
            })
            serializer.is_valid(raise_exception=True)
            review = serializer.save()
            return Response(serializers.ReviewSerializer(review).data, status=status.HTTP_201_CREATED)
        reviews = event.reviews.all()
        page = self.paginate_queryset(reviews)
        if page is not None:
            serializer = serializers.ReviewSerializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        return Response(serializers.ReviewSerializer(reviews, many=True).data)

    @action(methods=['get'], detail=True, url_path='chat-messages')
    def get_chat_messages(self, request, pk):
        event = self.get_object()
        messages = event.chat_messages.all()
        page = self.paginate_queryset(messages)
        if page is not None:
            serializer = serializers.ChatMessageSerializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        return Response(serializers.ChatMessageSerializer(messages, many=True).data)

# ViewSet cho Ticket
class TicketViewSet(viewsets.ViewSet, generics.ListAPIView, generics.RetrieveAPIView, generics.UpdateAPIView, generics.DestroyAPIView):
    queryset = Ticket.objects.all()
    serializer_class = serializers.TicketSerializer
    permission_classes = [permissions.IsAuthenticated, perms.IsTicketOwner]
    pagination_class = paginators.ItemPaginator

    def get_queryset(self):
        return self.queryset.filter(user=self.request.user)

# ViewSet cho Payment
class PaymentViewSet(viewsets.ViewSet, generics.CreateAPIView, generics.ListAPIView):
    queryset = Payment.objects.all()
    serializer_class = serializers.PaymentSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = paginators.ItemPaginator

    def get_queryset(self):
        return self.queryset.filter(user=self.request.user)

# ViewSet cho DiscountCode
class DiscountCodeViewSet(viewsets.ViewSet, generics.ListAPIView):
    queryset = DiscountCode.objects.filter(is_active=True)
    serializer_class = serializers.DiscountCodeSerializer
    pagination_class = paginators.ItemPaginator

# ViewSet cho Notification
class NotificationViewSet(viewsets.ViewSet, generics.ListAPIView):
    queryset = Notification.objects.all()
    serializer_class = serializers.NotificationSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = paginators.ItemPaginator

    def get_queryset(self):
        return self.queryset.filter(user=self.request.user)

# ViewSet cho ChatMessage
class ChatMessageViewSet(viewsets.ViewSet, generics.CreateAPIView, generics.ListAPIView, generics.UpdateAPIView, generics.DestroyAPIView):
    queryset = ChatMessage.objects.all()
    serializer_class = serializers.ChatMessageSerializer
    permission_classes = [permissions.IsAuthenticated, perms.IsChatMessageSender]
    pagination_class = paginators.ItemPaginator

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data={
            'sender': request.user.pk,
            'event': request.data.get('event'),
            'message': request.data.get('message')
        })
        serializer.is_valid(raise_exception=True)
        message = serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    def get_queryset(self):
        return self.queryset.filter(sender=self.request.user)