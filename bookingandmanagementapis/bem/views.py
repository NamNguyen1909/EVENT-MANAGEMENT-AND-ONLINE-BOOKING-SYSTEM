from rest_framework import viewsets, generics, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.pagination import PageNumberPagination
from rest_framework.filters import SearchFilter, OrderingFilter
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Count, Avg, F
from django.shortcuts import get_object_or_404
from django.core.mail import send_mail
from django.conf import settings
from django.utils import timezone
from datetime import timedelta
import uuid
import qrcode
import io
import base64
from .models import (
    User, Event, Ticket, Payment, Review, DiscountCode, Notification, ChatMessage
)
from . import serializers, perms
from django.db.models import Q

# Custom Pagination
class ItemPaginator(PageNumberPagination):
    page_size = 10
    page_size_query_param = 'page_size'
    max_page_size = 100

# User ViewSet
class UserViewSet(viewsets.ViewSet, generics.CreateAPIView, generics.ListAPIView):
    queryset = User.objects.filter(is_active=True)
    serializer_class = serializers.UserSerializer
    pagination_class = ItemPaginator
    filter_backends = [SearchFilter, OrderingFilter]
    search_fields = ['username', 'email']
    ordering_fields = ['created_at', 'username']

    def get_permissions(self):
        if self.action in ['get_current_user', 'tickets', 'payments', 'reviews', 'notifications']:
            return [permissions.IsAuthenticated()]
        return [permissions.AllowAny()]

    def create(self, request, *args, **kwargs):
        role = request.data.get('role', 'guest')  # Default to guest
        if role not in ['admin', 'organizer', 'guest']:
            return Response({"error": "Invalid role."}, status=status.HTTP_400_BAD_REQUEST)
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        user.role = role
        user.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(methods=['get', 'patch'], detail=False, url_path='current-user')
    def get_current_user(self, request):
        user = request.user
        if request.method == 'PATCH':
            serializer = self.get_serializer(user, data=request.data, partial=True)
            serializer.is_valid(raise_exception=True)
            serializer.save()
        return Response(self.get_serializer(user).data)

    @action(methods=['get'], detail=True, url_path='tickets')
    def get_tickets(self, request, pk):
        user = self.get_object()
        tickets = user.tickets.all()
        page = self.paginate_queryset(tickets)
        serializer = serializers.TicketSerializer(page or tickets, many=True)
        return self.get_paginated_response(serializer.data) if page else Response(serializer.data)

    @action(methods=['get'], detail=True, url_path='payments')
    def get_payments(self, request, pk):
        user = self.get_object()
        payments = user.payments.all()
        page = self.paginate_queryset(payments)
        serializer = serializers.PaymentSerializer(page or payments, many=True)
        return self.get_paginated_response(serializer.data) if page else Response(serializer.data)

    @action(methods=['get'], detail=True, url_path='reviews')
    def get_reviews(self, request, pk):
        user = self.get_object()
        reviews = user.reviews.all()
        page = self.paginate_queryset(reviews)
        serializer = serializers.ReviewSerializer(page or reviews, many=True)
        return self.get_paginated_response(serializer.data) if page else Response(serializer.data)

    @action(methods=['get'], detail=True, url_path='notifications')
    def get_notifications(self, request, pk):
        user = self.get_object()
        notifications = user.notifications.all()
        page = self.paginate_queryset(notifications)
        serializer = serializers.NotificationSerializer(page or notifications, many=True)
        return self.get_paginated_response(serializer.data) if page else Response(serializer.data)

# Event ViewSet
class EventViewSet(viewsets.ViewSet, generics.ListAPIView, generics.RetrieveAPIView, generics.CreateAPIView):
    queryset = Event.objects.filter(is_public=True)
    serializer_class = serializers.EventSerializer
    pagination_class = ItemPaginator
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['category', 'status']
    search_fields = ['title', 'description']
    ordering_fields = ['start_datetime', 'ticket_price']

    def get_permissions(self):
        if self.action in ['list', 'retrieve', 'suggest_events', 'hot_events']:
            return [permissions.IsAuthenticated()]
        elif self.action == 'create':
            return [perms.IsOrganizerUser()]
        return [perms.IsAdminOrOrganizer(), perms.IsEventOrganizer()]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        event = serializer.save(organizer=request.user)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    def get_queryset(self):
        queryset = self.queryset
        q = self.request.query_params.get('q')
        if q:
            queryset = queryset.filter(Q(title__icontains=q) | Q(description__icontains=q))
        category = self.request.query_params.get('category')
        if category:
            queryset = queryset.filter(category=category)
        return queryset

    @action(methods=['get'], detail=True, url_path='tickets')
    def get_tickets(self, request, pk):
        event = self.get_object()
        tickets = event.tickets.all()
        page = self.paginate_queryset(tickets)
        serializer = serializers.TicketSerializer(page or tickets, many=True)
        return self.get_paginated_response(serializer.data) if page else Response(serializer.data)

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
        serializer = serializers.ReviewSerializer( page or reviews, many=True)
        return self.get_paginated_response(serializer.data) if page else Response(serializer.data)

    @action(methods=['get'], detail=True, url_path='chat-messages')
    def get_chat_messages(self, request, pk):
        event = self.get_object()
        messages = event.chat_messages.all()
        page = self.paginate_queryset(messages)
        serializer = serializers.ChatMessageSerializer(page or messages, many=True)
        return self.get_paginated_response(serializer.data) if page else Response(serializer.data)

    @action(detail=False, methods=['get'], url_path='suggest')
    def suggest_events(self, request):
        user = request.user
        user_tickets = Ticket.objects.filter(user=user).values('event__category').distinct()
        categories = [ticket['event__category'] for ticket in user_tickets]
        queryset = Event.objects.filter(
            status='upcoming',
            is_public=True,
            start_datetime__gte=timezone.now()
        )
        if categories:
            queryset = queryset.filter(category__in=categories)
        suggested_events = queryset.order_by('start_datetime')[:5]
        serializer = self.get_serializer(suggested_events, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'], url_path='hot')
    def hot_events(self, request):
        hot_events = Event.objects.filter(
            status='upcoming',
            is_public=True,
            start_datetime__gte=timezone.now()
        ).annotate(tickets_sold=Count('tickets')).order_by('-tickets_sold')[:5]
        serializer = self.get_serializer(hot_events, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['get'], url_path='statistics')
    def get_statistics(self, request, pk):
        event = self.get_object()
        if not (request.user == event.organizer or request.user.role == 'admin'):
            return Response({"error": "Permission denied"}, status=status.HTTP_403_FORBIDDEN)
        tickets_sold = event.tickets.count()
        revenue = sum(ticket.price for ticket in event.tickets.all())
        data = {
            'tickets_sold': tickets_sold,
            'revenue': revenue,
            'average_rating': event.reviews.aggregate(avg=Avg('rating'))['avg'] or 0
        }
        return Response(data)

# Ticket ViewSet
class TicketViewSet(viewsets.ViewSet, generics.ListAPIView, generics.RetrieveAPIView, generics.UpdateAPIView):
    queryset = Ticket.objects.all()
    serializer_class = serializers.TicketSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = ItemPaginator

    def get_permissions(self):
        if self.action in ['book_ticket', 'check_in']:
            return [permissions.IsAuthenticated()]
        elif self.action in ['update']:
            return [perms.IsTicketOwner()]
        return super().get_permissions()

    def get_queryset(self):
        return self.queryset.filter(user=self.request.user)

    @action(detail=False, methods=['post'], url_path='book')
    def book_ticket(self, request):
        event_id = request.data.get('event_id')
        discount_code = request.data.get('discount_code')
        try:
            event = Event.objects.get(id=event_id, status='upcoming', is_public=True)
        except Event.DoesNotExist:
            return Response({"error": "Event not found or not available."}, status=status.HTTP_404_NOT_FOUND)

        if event.available_tickets <= 0:
            return Response({"error": "No tickets available."}, status=status.HTTP_400_BAD_REQUEST)

        price = event.ticket_price
        discount = 0
        if discount_code:
            try:
                discount_obj = DiscountCode.objects.get(
                    code=discount_code,
                    event=event,
                    is_active=True,
                    valid_until__gte=timezone.now(),
                    used_count__lt=F('max_uses')
                )
                discount = (price * discount_obj.discount_percent) / 100
                price -= discount
                discount_obj.used_count += 1
                discount_obj.save()
            except DiscountCode.DoesNotExist:
                return Response({"error": "Invalid or expired discount code."}, status=status.HTTP_400_BAD_REQUEST)

        qr_code = str(uuid.uuid4())[:8]
        qr = qrcode.QRCode(version=1, box_size=10, border=5)
        qr.add_data(qr_code)
        qr.make(fit=True)
        img = qr.make_image(fill='black', back_color='white')
        buffer = io.BytesIO()
        img.save(buffer, format="PNG")
        qr_code_image = base64.b64encode(buffer.getvalue()).decode('utf-8')

        ticket = Ticket(
            event=event,
            user=request.user,
            price=price,
            qr_code=qr_code,
            status='purchased',
            purchase_date=timezone.now()
        )
        ticket.save()

        payment = Payment(
            ticket=ticket,
            user=request.user,
            payment_method='manual',
            amount=price,
            status='completed',
            payment_date=timezone.now()
        )
        payment.save()

        event.available_tickets -= 1
        event.save()

        notification = Notification(
            user=request.user,
            event=event,
            title="Ticket Purchased",
            message=f"You have successfully purchased a ticket for {event.title}!",
            type="info",
            is_read=False
        )
        notification.save()

        send_mail(
            subject=f"Ticket Confirmation for {event.title}",
            message=f"Dear {request.user.username},\n\nYou have successfully purchased a ticket for {event.title}.\nQR Code: {qr_code}\n\nThank you!",
            from_email=settings.EMAIL_HOST_USER,
            recipient_list=[request.user.email],
            fail_silently=True
        )

        return Response({
            "message": "Ticket booked successfully.",
            "ticket": serializers.TicketSerializer(ticket).data,
            "qr_code_image": qr_code_image
        }, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=['post'], url_path='check-in')
    def check_in(self, request):
        qr_code = request.data.get('qr_code')
        try:
            ticket = Ticket.objects.get(qr_code=qr_code, status='purchased')
        except Ticket.DoesNotExist:
            return Response({"error": "Invalid or already checked-in ticket."}, status=status.HTTP_404_NOT_FOUND)

        if ticket.check_in_date:
            return Response({"error": "Ticket already checked in."}, status=status.HTTP_400_BAD_REQUEST)

        ticket.status = 'checked_in'
        ticket.check_in_date = timezone.now()
        ticket.save()
        return Response({"message": "Check-in successful.", "ticket": serializers.TicketSerializer(ticket).data})

# Payment ViewSet
class PaymentViewSet(viewsets.ViewSet, generics.ListAPIView):
    queryset = Payment.objects.all()
    serializer_class = serializers.PaymentSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = ItemPaginator

    def get_queryset(self):
        return self.queryset.filter(user=self.request.user)

# DiscountCode ViewSet
class DiscountCodeViewSet(viewsets.ViewSet, generics.ListAPIView, generics.CreateAPIView):
    queryset = DiscountCode.objects.filter(is_active=True)
    serializer_class = serializers.DiscountCodeSerializer
    pagination_class = ItemPaginator

    def get_permissions(self):
        if self.action == 'create':
            return [perms.IsOrganizerUser()]
        return [permissions.IsAuthenticated()]

# Notification ViewSet
class NotificationViewSet(viewsets.ViewSet, generics.ListAPIView):
    queryset = Notification.objects.all()
    serializer_class = serializers.NotificationSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = ItemPaginator

    def get_queryset(self):
        return self.queryset.filter(user=self.request.user)

    @action(detail=False, methods=['post'], url_path='create-notification')
    def create_notification(self, request):
        user_id = request.data.get('user_id')
        event_id = request.data.get('event_id')
        title = request.data.get('title')
        message = request.data.get('message')
        notification_type = request.data.get('type', 'info')

        if not (request.user.role in ['admin', 'organizer']):
            return Response({"error": "Permission denied"}, status=status.HTTP_403_FORBIDDEN)

        try:
            user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return Response({"error": "User not found."}, status=status.HTTP_404_NOT_FOUND)

        event = None
        if event_id:
            try:
                event = Event.objects.get(id=event_id)
            except Event.DoesNotExist:
                return Response({"error": "Event not found."}, status=status.HTTP_404_NOT_FOUND)

        notification = Notification(
            user=user,
            event=event,
            title=title,
            message=message,
            type=notification_type,
            is_read=False
        )
        notification.save()

        send_mail(
            subject=title,
            message=message,
            from_email=settings.EMAIL_HOST_USER,
            recipient_list=[user.email],
            fail_silently=True
        )

        return Response({
            "message": "Notification created and email sent.",
            "notification": serializers.NotificationSerializer(notification).data
        }, status=status.HTTP_201_CREATED)

# ChatMessage ViewSet
class ChatMessageViewSet(viewsets.ViewSet, generics.CreateAPIView, generics.ListAPIView):
    queryset = ChatMessage.objects.all()
    serializer_class = serializers.ChatMessageSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = ItemPaginator

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
        event_id = self.request.query_params.get('event')
        if event_id:
            return self.queryset.filter(event_id=event_id)
        return self.queryset