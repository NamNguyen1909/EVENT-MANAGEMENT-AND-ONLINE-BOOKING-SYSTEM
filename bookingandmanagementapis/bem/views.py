from rest_framework import viewsets, generics, status, permissions, filters, mixins
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.pagination import PageNumberPagination
from rest_framework.filters import SearchFilter, OrderingFilter
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Count, Avg, Q
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
        elif self.action in ['create']:
            return [permissions.AllowAny()]

    def create(self, request, *args, **kwargs):
        role = request.data.get('role', 'attendee')
        if role not in ['admin', 'organizer', 'attendee']:
            return Response({"error": "Vai trò không hợp lệ."}, status=status.HTTP_400_BAD_REQUEST)
        serializer = self.get_serializer(data=request.data)
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
        tickets = user.tickets.all().select_related('event')
        page = self.paginate_queryset(tickets)
        serializer = serializers.TicketSerializer(page or tickets, many=True)
        return self.get_paginated_response(serializer.data) if page else Response(serializer.data)

    @action(methods=['get'], detail=True, url_path='payments')
    def get_payments(self, request, pk):
        user = self.get_object()
        payments = user.payments.all().select_related('discount_code')
        page = self.paginate_queryset(payments)
        serializer = serializers.PaymentSerializer(page or payments, many=True)
        return self.get_paginated_response(serializer.data) if page else Response(serializer.data)

    @action(methods=['get'], detail=True, url_path='reviews')
    def get_reviews(self, request, pk):
        user = self.get_object()
        reviews = user.event_reviews.all().select_related('event')
        page = self.paginate_queryset(reviews)
        serializer = serializers.ReviewSerializer(page or reviews, many=True)
        return self.get_paginated_response(serializer.data) if page else Response(serializer.data)

    @action(methods=['get'], detail=True, url_path='notifications')
    def get_notifications(self, request, pk):
        user = self.get_object()
        # Lọc thông báo dựa trên vé của người dùng
        tickets = Ticket.objects.filter(user=user).values('event_id')
        notifications = Notification.objects.filter(event__id__in=tickets).select_related('event')
        page = self.paginate_queryset(notifications)
        serializer = serializers.NotificationSerializer(page or notifications, many=True)
        return self.get_paginated_response(serializer.data) if page else Response(serializer.data)

    @action(methods=['get'], detail=True, url_path='sent-messages')
    def get_sent_messages(self, request, pk):
        user = self.get_object()
        messages = user.sent_messages.all().select_related('event', 'receiver')
        page = self.paginate_queryset(messages)
        serializer = serializers.ChatMessageSerializer(page or messages, many=True)
        return self.get_paginated_response(serializer.data) if page else Response(serializer.data)


# ViewSet cho Event
#Xem sự kiện
# Cho phép người dùng xem danh sách sự kiện và chi tiết sự kiện
# Chỉ admin và organizer mới có quyền tạo và chỉnh sửa sự kiện
class EventViewSet(viewsets.ViewSet, generics.ListAPIView, generics.RetrieveAPIView, generics.CreateAPIView,generics.UpdateAPIView):
    queryset = Event.objects.all()
    pagination_class = ItemPaginator
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['category', 'is_active']
    search_fields = ['title', 'description', 'location','category']
    ordering_fields = ['start_time', 'ticket_price']
    parser_classes = [parsers.MultiPartParser, parsers.FormParser, parsers.JSONParser]

    def get_serializer_class(self):
        if self.action in ['retrieve', 'create', 'update', 'partial_update']:
            return EventDetailSerializer
        return EventSerializer

    def get_permissions(self):
        if self.action in ['list', 'retrieve', 'suggest_events', 'hot_events', 'get_chat_messages']:
            return [permissions.IsAuthenticated()]
        elif self.action in ['create']:
            return [IsOrganizer()]
        elif self.action in ['update', 'partial_update', 'my_events']:
            return [IsOrganizerOwner()]
        elif self.action == 'manage_reviews':
            # GET cho phép tất cả, POST yêu cầu xác thực sẽ kiểm tra trong view
            return [permissions.AllowAny()]
        return [perms.IsAdminOrOrganizer(), perms.IsEventOrganizer()]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        event = serializer.save(organizer=request.user)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    def update(self, request, *args, **kwargs):
        event = self.get_object()
        serializer = EventDetailSerializer(event, data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data, status=status.HTTP_200_OK)

    def partial_update(self, request, *args, **kwargs):
        event = self.get_object()
        serializer = EventDetailSerializer(event, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data, status=status.HTTP_200_OK)

    def get_queryset(self):
        user = self.request.user
        if user.role == 'attendee':
            queryset = self.queryset.all()  # xem được cả sự kiện đã kết thúc để xem review
        elif user.role == 'organizer':
            queryset = self.queryset.filter(organizer=user)
        elif user.role == 'admin':
            queryset = self.queryset.all()
        else:
            queryset = self.queryset.none()

        q = self.request.query_params.get('q')
        if q:
            queryset = queryset.filter(Q(title__icontains=q) | Q(description__icontains=q) | Q(location__icontains=q) | Q(category__icontains=q))
        return queryset

    @action(methods=['get'], detail=True, url_path='tickets')
    def get_tickets(self, request, pk):
        event = self.get_object()
        tickets = event.tickets.filter(is_paid=True).select_related('user')
        page = self.paginate_queryset(tickets)
        serializer = TicketSerializer(page or tickets, many=True)
        return self.get_paginated_response(serializer.data) if page else Response(serializer.data)

    @action(methods=['get', 'post'], detail=True, url_path='reviews')
    def manage_reviews(self, request, pk):
        event = self.get_object()
        if request.method == 'POST':
            if not request.user.is_authenticated:
                return Response({"detail": "Yêu cầu xác thực."}, status=status.HTTP_401_UNAUTHORIZED)
            serializer = ReviewSerializer(data={
                'user': request.user.pk,
                'event': pk,
                'rating': request.data.get('rating'),
                'comment': request.data.get('comment')
            })
            serializer.is_valid(raise_exception=True)
            review = serializer.save()
            return Response(ReviewSerializer(review).data, status=status.HTTP_201_CREATED)
        reviews = event.reviews.all().select_related('user')
        page = self.paginate_queryset(reviews)
        serializer = ReviewSerializer(page or reviews, many=True)
        return self.get_paginated_response(serializer.data) if page else Response(serializer.data)

    @action(methods=['get'], detail=True, url_path='chat-messages')
    def get_chat_messages(self, request, pk):
        event = self.get_object()
        messages = event.chat_messages.all().select_related('sender', 'receiver')
        page = self.paginate_queryset(messages)
        serializer = ChatMessageSerializer(page or messages, many=True)
        return self.get_paginated_response(serializer.data) if page else Response(serializer.data)

    @action(detail=False, methods=['get'], url_path='suggest')
    def suggest_events(self, request):
        user = request.user
        user_tickets = Ticket.objects.filter(user=user).values('event__category').distinct()
        categories = [ticket['event__category'] for ticket in user_tickets]
        queryset = Event.objects.filter(
            is_active=True,
            start_time__gte=timezone.now()
        ).select_related('organizer').prefetch_related('tags')
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
        ).annotate(tickets_sold=Count('tickets', filter=Q(tickets__is_paid=True))).order_by('-tickets_sold')[:5]
        serializer = self.get_serializer(hot_events, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['get'], url_path='statistics')
    def get_statistics(self, request, pk):
        event = self.get_object()
        if not (request.user == event.organizer or request.user.role == 'admin'):
            return Response({"error": "Không có quyền truy cập."}, status=status.HTTP_403_FORBIDDEN)
        tickets_sold = event.tickets.filter(is_paid=True).count()
        revenue = sum(ticket.event.ticket_price for ticket in event.tickets.filter(is_paid=True))
        data = {
            'tickets_sold': tickets_sold,
            'revenue': revenue,
            'average_rating': event.reviews.aggregate(avg=Avg('rating'))['avg'] or 0
        }
        return Response(data)
    @action(detail=False, methods=['get'], url_path='my-events')
    def my_events(self, request):
        """Trả về danh sách các sự kiện do organizer hiện tại tổ chức."""
        user = request.user
        if user.role != 'organizer':
            return Response({"error": "You do not have permission to view this."}, status=403)
        events = Event.objects.filter(organizer=user)
        serializer = EventSerializer(events, many=True)
        return Response(serializer.data)


# ViewSet cho Tag
class TagViewSet(
    viewsets.GenericViewSet,
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    mixins.CreateModelMixin,
    mixins.UpdateModelMixin,
    mixins.DestroyModelMixin
):
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


# ViewSet cho Ticket
class TicketViewSet(viewsets.ViewSet, generics.ListAPIView, generics.RetrieveAPIView, generics.UpdateAPIView):
    queryset = Ticket.objects.all()
    serializer_class = serializers.TicketSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = ItemPaginator

    def get_permissions(self):
        if self.action in ['book_ticket', 'check_in']:
            return [permissions.IsAuthenticated()]
        elif self.action in ['update', 'destroy']:
            return [perms.IsTicketOwner()]
        return super().get_permissions()

    def get_queryset(self):
        return self.queryset.filter(user=self.request.user).select_related('event')

    @action(detail=False, methods=['post'], url_path='book')
    def book_ticket(self, request):
        event_id = request.data.get('event_id')
        discount_code_id = request.data.get('discount_code_id')
        try:
            event = Event.objects.get(id=event_id, is_active=True, start_time__gte=timezone.now())
        except Event.DoesNotExist:
            return Response({"error": "Sự kiện không tồn tại hoặc không khả dụng."}, status=status.HTTP_404_NOT_FOUND)

        if event.tickets.filter(is_paid=True).count() >= event.total_tickets:
            return Response({"error": "Hết vé."}, status=status.HTTP_400_BAD_REQUEST)

        price = event.ticket_price
        discount = 0
        discount_obj = None
        if discount_code_id:
            try:
                discount_obj = DiscountCode.objects.get(
                    id=discount_code_id,
                    is_active=True,
                    valid_from__lte=timezone.now(),
                    valid_to__gte=timezone.now()
                )
                if discount_obj.max_uses is not None and discount_obj.used_count >= discount_obj.max_uses:
                    return Response({"error": "Mã giảm giá đã hết lượt sử dụng."}, status=status.HTTP_400_BAD_REQUEST)
                if discount_obj.user_group != request.user.get_customer_group().value:
                    return Response({"error": "Mã giảm giá không áp dụng cho nhóm khách hàng này."}, status=status.HTTP_400_BAD_REQUEST)
                discount = (price * discount_obj.discount_percentage) / 100
                price -= discount
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
            payment_method=request.data.get('payment_method', 'momo'),
            status=False,
            transaction_id=str(uuid.uuid4()),
            discount_code=discount_obj
        )
        payment.save()
        payment.tickets.add(ticket)

        notification = Notification(
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
        return self.queryset.filter(user=self.request.user).select_related('discount_code')

    @action(detail=True, methods=['post'], url_path='confirm')
    def confirm_payment(self, request, pk):
        payment = self.get_object()
        if payment.status:
            return Response({"error": "Thanh toán đã được xử lý."}, status=status.HTTP_400_BAD_REQUEST)
        if payment.user != request.user:
            return Response({"error": "Không có quyền xác nhận thanh toán này."}, status=status.HTTP_403_FORBIDDEN)

        payment.status = True
        payment.paid_at = timezone.now()
        payment.save()

        tickets = payment.tickets.all()
        if tickets:
            event = tickets.first().event #có vấn đề khi lấy sự kiện từ vé đầu tiên
            # Vấn đề với việc lấy sự kiện từ vé đầu tiên (tickets.first().event) trong confirm_payment
            """
            - **Tính hợp lý**:
              - **Trường hợp bob_jones và john_doe**:
                - Mỗi thanh toán chỉ liên quan đến một vé của một sự kiện duy nhất (ticket_002: Music Festival 2025, ticket_003: Tech Conference 2025).
                - Lấy vé đầu tiên (tickets.first().event) là hợp lý, vì không có vé nào khác để xem xét, và sự kiện được lấy sẽ chính xác.
              - **Trường hợp jane_smith**:
                - Thanh toán trans_001 liên quan đến hai vé của hai sự kiện khác nhau: ticket_001 (Music Festival 2025) và ticket_004 (Marathon 2025).
                - Lấy vé đầu tiên (ticket_001) dẫn đến thông báo chỉ đề cập đến Music Festival 2025, bỏ qua Marathon 2025.
                - **Vấn đề**: Thông báo không bao quát cả hai sự kiện, có thể gây nhầm lẫn cho người dùng, vì họ mong đợi thông báo đầy đủ.

            - **Hạn chế**:
              - Logic hiện tại giả định tất cả vé trong một thanh toán thuộc cùng một sự kiện, nhưng dữ liệu cho thấy có thể có nhiều sự kiện (như trans_001).
              - Không kiểm tra xem các vé có thuộc cùng sự kiện hay không, dẫn đến rủi ro khi hệ thống mở rộng.

            - **Giải pháp đề xuất**:
              1. Tạo thông báo riêng cho từng sự kiện bằng cách lặp qua các vé và lấy tập hợp sự kiện duy nhất.
              2. Tạo một thông báo tổng quát liệt kê tất cả các sự kiện trong nội dung.
              3. Gửi email thông báo để tăng trải nghiệm người dùng.
            """
            notification = Notification(
                event=event,
                notification_type='reminder',
                title="Thanh Toán Thành Công",
                message=f"Thanh toán cho vé sự kiện {event.title} đã hoàn tất.",
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
        # Lọc thông báo dựa trên vé của người dùng
        tickets = Ticket.objects.filter(user=self.request.user).values('event_id')
        return self.queryset.filter(event__id__in=tickets).select_related('event')

    @action(detail=False, methods=['post'], url_path='create-notification')
    def create_notification(self, request):
        event_id = request.data.get('event_id')
        title = request.data.get('title')
        message = request.data.get('message')
        notification_type = request.data.get('notification_type', 'reminder')

        if not (request.user.role in ['admin', 'organizer']):
            return Response({"error": "Không có quyền truy cập."}, status=status.HTTP_403_FORBIDDEN)

        event = None
        if event_id:
            try:
                event = Event.objects.get(id=event_id)
            except Event.DoesNotExist:
                return Response({"error": "Sự kiện không tồn tại."}, status=status.HTTP_404_NOT_FOUND)

        notification = Notification(
            event=event,
            notification_type=notification_type,
            title=title,
            message=message,
            is_read=False
        )
        notification.save()

        # Gửi email cho tất cả người dùng có vé của sự kiện
        if event:
            ticket_owners = User.objects.filter(tickets__event=event).distinct()
            recipient_emails = [user.email for user in ticket_owners if user.email]
            if recipient_emails:
                send_mail(
                    subject=title,
                    message=message,
                    from_email=settings.EMAIL_HOST_USER,
                    recipient_list=recipient_emails,
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
            return self.queryset.filter(event_id=event_id).filter(
                Q(receiver=self.request.user) | Q(sender=self.request.user)
            ).select_related('sender', 'receiver')
        return self.queryset.filter(
            Q(receiver=self.request.user) | Q(sender=self.request.user)
        ).select_related('sender', 'receiver')


# ViewSet cho EventTrendingLog
class EventTrendingLogViewSet(viewsets.ViewSet):
    queryset = EventTrendingLog.objects.all()
    serializer_class = serializers.EventTrendingLogSerializer
    permission_classes = [perms.IsAdminOrOrganizer]
    pagination_class = ItemPaginator
    filter_backends = [OrderingFilter]
    ordering_fields = ['last_updated', 'view_count', 'ticket_sold_count']

    def list(self, request, *args, **kwargs):
        queryset = self.queryset.select_related('event')
        for backend in self.filter_backends:
            queryset = backend().filter_queryset(request, queryset, self)
        paginator = self.pagination_class()
        page = paginator.paginate_queryset(queryset, request)
        serializer = self.serializer_class(page or queryset, many=True)
        return paginator.get_paginated_response(serializer.data) if page else Response(serializer.data)

    def retrieve(self, request, pk=None, *args, **kwargs):
        log = get_object_or_404(self.queryset, pk=pk)
        serializer = self.serializer_class(log)
        return Response(serializer.data)