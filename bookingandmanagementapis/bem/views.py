from rest_framework import viewsets, generics, status, permissions, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.pagination import PageNumberPagination
from rest_framework.filters import SearchFilter, OrderingFilter
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Count, Avg, Q, F
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
    User, Event, Tag, Ticket, Payment, Review, DiscountCode, Notification,
    ChatMessage, EventTrendingLog
)
from . import serializers, perms
from .paginators import ItemPaginator


# Phân trang tùy chỉnh
# class ItemPaginator(PageNumberPagination):
#     page_size = 10
#     page_size_query_param = 'page_size'
#     max_page_size = 100


# ViewSet cho User
class UserViewSet(viewsets.ViewSet, generics.CreateAPIView, generics.ListAPIView):
    queryset = User.objects.filter(is_active=True)
    serializer_class = serializers.UserSerializer
    pagination_class = ItemPaginator
    filter_backends = [SearchFilter, OrderingFilter]
    search_fields = ['username', 'email', 'phone']
    ordering_fields = ['created_at', 'username']

    def get_permissions(self):
        if self.action in ['get_current_user', 'tickets', 'payments', 'reviews', 'notifications', 'sent_messages']:
            return [permissions.IsAuthenticated()]
        return [permissions.AllowAny()]

    def create(self, request, *args, **kwargs):
        role = request.data.get('role', 'attendee')
        if role not in ['admin', 'organizer', 'attendee']:
            return Response({"error": "Vai trò không hợp lệ."}, status=status.HTTP_400_BAD_REQUEST)
        data = request.data.copy()  # Sao chép dữ liệu yêu cầu
        data['role'] = role  # Đảm bảo role được đưa vào dữ liệu
        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
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
        tickets = user.purchased_tickets.all()
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
        reviews = user.event_reviews.all()
        page = self.paginate_queryset(reviews)
        serializer = serializers.ReviewSerializer(page or reviews, many=True)
        return self.get_paginated_response(serializer.data) if page else Response(serializer.data)

    @action(methods=['get'], detail=True, url_path='notifications')
    def get_notifications(self, request, pk):
        user = self.get_object()
        notifications = user.user_notifications.all()
        page = self.paginate_queryset(notifications)
        serializer = serializers.NotificationSerializer(page or notifications, many=True)
        return self.get_paginated_response(serializer.data) if page else Response(serializer.data)

    @action(methods=['get'], detail=True, url_path='sent-messages')
    def get_sent_messages(self, request, pk):
        user = self.get_object()
        messages = user.sent_messages.all()
        page = self.paginate_queryset(messages)
        serializer = serializers.ChatMessageSerializer(page or messages, many=True)
        return self.get_paginated_response(serializer.data) if page else Response(serializer.data)


# ViewSet cho Event
class EventViewSet(viewsets.ViewSet, generics.ListAPIView, generics.RetrieveAPIView, generics.CreateAPIView):
    queryset = Event.objects.filter(is_active=True)
    serializer_class = serializers.EventSerializer
    pagination_class = ItemPaginator
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['category', 'is_active']
    search_fields = ['title', 'description', 'location']
    ordering_fields = ['start_time', 'ticket_price']

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
            queryset = queryset.filter(Q(title__icontains=q) | Q(description__icontains=q) | Q(location__icontains=q))
        category = self.request.query_params.get('category')
        if category:
            queryset = queryset.filter(category=category)
        return queryset

    @action(methods=['get'], detail=True, url_path='tickets')
    def get_tickets(self, request, pk):
        event = self.get_object()
        tickets = event.sold_tickets.all()
        page = self.paginate_queryset(tickets)
        serializer = serializers.TicketSerializer(page or tickets, many=True)
        return self.get_paginated_response(serializer.data) if page else Response(serializer.data)

    @action(methods=['get', 'post'], detail=True, url_path='reviews')
    def manage_reviews(self, request, pk):
        event = self.get_object()
        if request.method == 'POST':
            if not request.user.is_authenticated:
                return Response({"detail": "Yêu cầu xác thực."}, status=status.HTTP_401_UNAUTHORIZED)
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
        serializer = serializers.ReviewSerializer(page or reviews, many=True)
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
            is_active=True,
            start_time__gte=timezone.now()
        )
        if categories:
            queryset = queryset.filter(category__in=categories)
        suggested_events = queryset.order_by('start_time')[:5]
        serializer = self.get_serializer(suggested_events, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'], url_path='hot')
    def hot_events(self, request):
        hot_events = Event.objects.filter(
            is_active=True,
            start_time__gte=timezone.now()
        ).annotate(tickets_sold=Count('sold_tickets')).order_by('-tickets_sold')[:5]
        serializer = self.get_serializer(hot_events, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['get'], url_path='statistics')
    def get_statistics(self, request, pk):
        event = self.get_object()
        if not (request.user == event.organizer or request.user.role == 'admin'):
            return Response({"error": "Không có quyền truy cập."}, status=status.HTTP_403_FORBIDDEN)
        tickets_sold = event.sold_tickets.count()
        revenue = sum(ticket.event.ticket_price for ticket in event.sold_tickets.filter(is_paid=True))
        data = {
            'tickets_sold': tickets_sold,
            'revenue': revenue,
            'average_rating': event.reviews.aggregate(avg=Avg('rating'))['avg'] or 0
        }
        return Response(data)


# ViewSet cho Tag
class TagViewSet(viewsets.ViewSet):
    queryset = Tag.objects.all()
    serializer_class = serializers.TagSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = ItemPaginator
    filter_backends = [SearchFilter]
    search_fields = ['name']

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [perms.IsAdminOrOrganizer()]
        return [permissions.IsAuthenticated()]

    def list(self, request, *args, **kwargs):
        queryset = self.queryset
        # Áp dụng tìm kiếm
        for backend in self.filter_backends:
            queryset = backend().filter_queryset(request, queryset, self)
        # Áp dụng phân trang
        paginator = self.pagination_class()
        page = paginator.paginate_queryset(queryset, request)
        serializer = self.serializer_class(page or queryset, many=True)
        return paginator.get_paginated_response(serializer.data) if page else Response(serializer.data)

    def retrieve(self, request, pk=None, *args, **kwargs):
        tag = get_object_or_404(self.queryset, pk=pk)
        serializer = self.serializer_class(tag)
        return Response(serializer.data)

    def create(self, request, *args, **kwargs):
        serializer = self.serializer_class(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    def update(self, request, pk=None, *args, **kwargs):
        tag = get_object_or_404(self.queryset, pk=pk)
        serializer = self.serializer_class(tag, data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

    def partial_update(self, request, pk=None, *args, **kwargs):
        tag = get_object_or_404(self.queryset, pk=pk)
        serializer = self.serializer_class(tag, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

    def destroy(self, request, pk=None, *args, **kwargs):
        tag = get_object_or_404(self.queryset, pk=pk)
        tag.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


# ViewSet cho Ticket
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
            event = Event.objects.get(id=event_id, is_active=True, start_time__gte=timezone.now())
        except Event.DoesNotExist:
            return Response({"error": "Sự kiện không tồn tại hoặc không khả dụng."}, status=status.HTTP_404_NOT_FOUND)

        if event.sold_tickets.count() >= event.total_tickets:
            return Response({"error": "Hết vé."}, status=status.HTTP_400_BAD_REQUEST)

        price = event.ticket_price
        discount = 0
        if discount_code:
            try:
                discount_query = DiscountCode.objects.filter(
                    code=discount_code,
                    is_active=True,
                    valid_from__lte=timezone.now(),
                    valid_to__gte=timezone.now()
                )
                discount_query = discount_query.filter(Q(max_uses__isnull=True) | Q(used_count__lt=F('max_uses')))
                discount_obj = discount_query.get()
                if discount_obj.user_group != request.user.get_customer_group().value:
                    return Response({"error": "Mã giảm giá không áp dụng cho nhóm khách hàng này."}, status=status.HTTP_400_BAD_REQUEST)
                discount = (price * discount_obj.discount_percentage) / 100
                price -= discount
                discount_obj.used_count += 1
                discount_obj.save()
            except DiscountCode.DoesNotExist:
                return Response({"error": "Mã giảm giá không hợp lệ hoặc đã hết hạn."}, status=status.HTTP_400_BAD_REQUEST)

        qr_code = str(uuid.uuid4())
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
            qr_code=qr_code,
            is_paid=False
        )
        ticket.save()

        payment = Payment(
            user=request.user,
            amount=price,
            payment_method='momo',  # Mặc định, có thể thay đổi qua request
            status='pending',
            transaction_id=str(uuid.uuid4())
        )
        payment.tickets.add(ticket)
        payment.save()

        notification = Notification(
            user=request.user,
            event=event,
            notification_type='reminder',
            title="Vé Đã Được Đặt",
            message=f"Bạn đã đặt vé cho sự kiện {event.title}. Vui lòng thanh toán để xác nhận!",
            is_read=False
        )
        notification.save()

        send_mail(
            subject=f"Xác Nhận Đặt Vé cho {event.title}",
            message=f"Kính gửi {request.user.username},\n\nBạn đã đặt vé cho {event.title}.\nMã QR: {qr_code}\nVui lòng thanh toán để hoàn tất.\n\nTrân trọng!",
            from_email=settings.EMAIL_HOST_USER,
            recipient_list=[request.user.email],
            fail_silently=True
        )

        return Response({
            "message": "Vé đã được đặt thành công.",
            "ticket": serializers.TicketSerializer(ticket).data,
            "qr_code_image": qr_code_image,
            "payment_id": payment.id
        }, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=['post'], url_path='check-in')
    def check_in(self, request):
        qr_code = request.data.get('qr_code')
        try:
            ticket = Ticket.objects.get(qr_code=qr_code, is_paid=True)
        except Ticket.DoesNotExist:
            return Response({"error": "Vé không hợp lệ hoặc chưa thanh toán."}, status=status.HTTP_404_NOT_FOUND)

        if ticket.is_checked_in:
            return Response({"error": "Vé đã được check-in."}, status=status.HTTP_400_BAD_REQUEST)

        ticket.check_in()
        return Response({"message": "Check-in thành công.", "ticket": serializers.TicketSerializer(ticket).data})


# ViewSet cho Payment
class PaymentViewSet(viewsets.ViewSet, generics.ListAPIView, generics.UpdateAPIView):
    queryset = Payment.objects.all()
    serializer_class = serializers.PaymentSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = ItemPaginator

    def get_queryset(self):
        return self.queryset.filter(user=self.request.user)

    @action(detail=True, methods=['post'], url_path='confirm')
    def confirm_payment(self, request, pk):
        payment = self.get_object()
        if payment.status != 'pending':
            return Response({"error": "Thanh toán đã được xử lý."}, status=status.HTTP_400_BAD_REQUEST)
        if payment.user != request.user:
            return Response({"error": "Không có quyền xác nhận thanh toán này."}, status=status.HTTP_403_FORBIDDEN)

        payment.status = 'completed'
        payment.paid_at = timezone.now()
        payment.save()

        for ticket in payment.tickets.all():
            ticket.mark_as_paid(payment.paid_at)
            request.user.total_spent += ticket.event.ticket_price
            request.user.save()

        notification = Notification(
            user=request.user,
            event=payment.tickets.first().event,
            notification_type='reminder',
            title="Thanh Toán Thành Công",
            message=f"Thanh toán cho vé sự kiện {payment.tickets.first().event.title} đã hoàn tất.",
            is_read=False
        )
        notification.save()

        return Response({"message": "Thanh toán xác nhận thành công.", "payment": serializers.PaymentSerializer(payment).data})


# ViewSet cho DiscountCode
class DiscountCodeViewSet(viewsets.ViewSet, generics.ListAPIView, generics.CreateAPIView):
    queryset = DiscountCode.objects.filter(is_active=True)
    serializer_class = serializers.DiscountCodeSerializer
    pagination_class = ItemPaginator

    def get_permissions(self):
        if self.action == 'create':
            return [perms.IsAdminOrOrganizer()]
        return [permissions.IsAuthenticated()]


# ViewSet cho Notification
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
        notification_type = request.data.get('notification_type', 'reminder')

        if not (request.user.role in ['admin', 'organizer']):
            return Response({"error": "Không có quyền truy cập."}, status=status.HTTP_403_FORBIDDEN)

        try:
            user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return Response({"error": "Người dùng không tồn tại."}, status=status.HTTP_404_NOT_FOUND)

        event = None
        if event_id:
            try:
                event = Event.objects.get(id=event_id)
            except Event.DoesNotExist:
                return Response({"error": "Sự kiện không tồn tại."}, status=status.HTTP_404_NOT_FOUND)

        notification = Notification(
            user=user,
            event=event,
            notification_type=notification_type,
            title=title,
            message=message,
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
            "message": "Thông báo đã được tạo và email đã được gửi.",
            "notification": serializers.NotificationSerializer(notification).data
        }, status=status.HTTP_201_CREATED)


# ViewSet cho ChatMessage
class ChatMessageViewSet(viewsets.ViewSet, generics.CreateAPIView, generics.ListAPIView):
    queryset = ChatMessage.objects.all()
    serializer_class = serializers.ChatMessageSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = ItemPaginator

    def get_permissions(self):
        if self.action in ['retrieve', 'update', 'partial_update', 'destroy']:
            return [perms.IsChatMessageSender()]
        return [permissions.IsAuthenticated()]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data={
            'sender': request.user.pk,
            'event': request.data.get('event'),
            'receiver': request.data.get('receiver'),
            'message': request.data.get('message'),
            'is_from_organizer': request.user.role == 'organizer' and request.data.get('is_from_organizer', False)
        })
        serializer.is_valid(raise_exception=True)
        message = serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    def get_queryset(self):
        event_id = self.request.query_params.get('event')
        if event_id:
            return self.queryset.filter(event_id=event_id, receiver=self.request.user) | self.queryset.filter(sender=self.request.user)
        return self.queryset.filter(receiver=self.request.user) | self.queryset.filter(sender=self.request.user)


# ViewSet cho EventTrendingLog
class EventTrendingLogViewSet(viewsets.ViewSet):
    queryset = EventTrendingLog.objects.all()
    serializer_class = serializers.EventTrendingLogSerializer
    permission_classes = [perms.IsAdminOrOrganizer]
    pagination_class = ItemPaginator
    filter_backends = [OrderingFilter]
    ordering_fields = ['last_updated', 'view_count', 'ticket_sold_count']

    def list(self, request, *args, **kwargs):
        queryset = self.queryset
        # Áp dụng sắp xếp
        for backend in self.filter_backends:
            queryset = backend().filter_queryset(request, queryset, self)
        # Áp dụng phân trang
        paginator = self.pagination_class()
        page = paginator.paginate_queryset(queryset, request)
        serializer = self.serializer_class(page or queryset, many=True)
        return paginator.get_paginated_response(serializer.data) if page else Response(serializer.data)

    def retrieve(self, request, pk=None, *args, **kwargs):
        log = get_object_or_404(self.queryset, pk=pk)
        serializer = self.serializer_class(log)
        return Response(serializer.data)