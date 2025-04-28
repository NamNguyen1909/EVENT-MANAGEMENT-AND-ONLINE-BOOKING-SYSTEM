from rest_framework import viewsets, generics, status, permissions, filters, mixins
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.pagination import PageNumberPagination
from rest_framework.filters import SearchFilter, OrderingFilter
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
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
    ChatMessage, EventTrendingLog, UserNotification
)
from .serializers import (
    UserSerializer, UserDetailSerializer, EventSerializer, EventDetailSerializer,
    TicketSerializer, ReviewSerializer, ChatMessageSerializer, TagSerializer,
    NotificationSerializer,
    DiscountCodeSerializer, PaymentSerializer, EventTrendingLogSerializer
)
from .perms import (
    IsAdminUser, IsAdminOrOrganizer, IsEventOrganizer, IsOrganizer, IsOrganizerOwner,
    IsTicketOwner, IsChatMessageSender, IsEventOwnerOrAdmin
)
from .paginators import ItemPaginator


class UserViewSet(viewsets.ViewSet, generics.CreateAPIView):
    serializer_class = UserSerializer
    pagination_class = ItemPaginator
    filter_backends = [SearchFilter, OrderingFilter]
    search_fields = ['username', 'email', 'phone']
    ordering_fields = ['created_at', 'username']

    def get_permissions(self):
        if self.action in ['get_current_user', 'tickets', 'payments', 'notifications', 'sent_messages', 'profile', 'deactivate']:
            return [permissions.IsAuthenticated()]
        elif self.action in ['create']:
            return [permissions.AllowAny()]
        return [permissions.IsAuthenticated()]

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
        else:
            serializer = UserDetailSerializer(user)
            return Response(serializer.data)

    @action(methods=['post'], detail=False, url_path='deactivate')
    def deactivate(self, request):
        user = request.user
        user.is_active = False
        user.save()
        return Response({"detail": "Tài khoản đã bị xóa!."}, status=status.HTTP_200_OK)

    @action(methods=['get'], detail=False, url_path='tickets')
    def get_tickets(self, request):
        user = request.user
        tickets = user.tickets.all().select_related('event')
        page = self.paginate_queryset(tickets)
        serializer = TicketSerializer(page or tickets, many=True)
        return self.get_paginated_response(serializer.data) if page else Response(serializer.data)

    @action(methods=['get'], detail=False, url_path='payments')
    def get_payments(self, request):
        user = request.user
        payments = user.payments.all().select_related('discount_code')
        page = self.paginate_queryset(payments)
        serializer = PaymentSerializer(page or payments, many=True)
        return self.get_paginated_response(serializer.data) if page else Response(serializer.data)

    # lazy loading / infinite scroll

    # Backend (API) vẫn phân trang bình thường (?page=1, ?page=2, ...)
    # Frontend (Vue/React/Next.js...) sẽ:
    # Gọi GET /api/my-notifications/?page=1 khi vừa load
    # Khi kéo xuống gần cuối danh sách → gọi GET /api/my-notifications/?page=2 để load tiếp
    # Append (nối thêm) vào danh sách đang hiển thị

    @action(detail=False, methods=['get'], url_path='my-notifications')
    def my_notifications(self, request):
        user = request.user
        user_notifications = UserNotification.objects.filter(user=user).select_related('notification__event')
        notifications = [un.notification for un in user_notifications]
        page = self.paginate_queryset(notifications)
        serializer = NotificationSerializer(page or notifications, many=True)
        return self.get_paginated_response(serializer.data) if page else Response(serializer.data)

    @action(methods=['get'], detail=False, url_path='sent-messages')
    def get_sent_messages(self, request):
        user = request.user
        messages = user.sent_messages.all().select_related('event', 'receiver')
        page = self.paginate_queryset(messages)
        serializer = ChatMessageSerializer(page or messages, many=True)
        return self.get_paginated_response(serializer.data) if page else Response(serializer.data)

    # @action(methods=['get'], detail=False, url_path='reviews')
    # def get_reviews(self, request):
    #     user = request.user
    #     reviews = user.event_reviews.all().select_related('event')
    #     page = self.paginate_queryset(reviews)
    #     serializer = ReviewSerializer(page or reviews, many=True)
    #     return self.get_paginated_response(serializer.data) if page else Response(serializer.data)



    # lazy loading / infinite scroll

    # Backend (API) vẫn phân trang bình thường (?page=1, ?page=2, ...)
    # Frontend (Vue/React/Next.js...) sẽ:
    # Gọi GET /api/my-notifications/?page=1 khi vừa load
    # Khi kéo xuống gần cuối danh sách → gọi GET /api/my-notifications/?page=2 để load tiếp
    # Append (nối thêm) vào danh sách đang hiển thị
    @action(detail=False, methods=['get'], url_path='my-notifications')
    def my_notifications(self, request):
        user = request.user
        tickets = Ticket.objects.filter(user=user).values('event_id')
        notifications = Notification.objects.filter(event__id__in=tickets).select_related('event')
        page = self.paginate_queryset(notifications)
        serializer = serializers.NotificationSerializer(page or notifications, many=True)
        return self.get_paginated_response(serializer.data) if page else Response(serializer.data)

    @action(methods=['get'], detail=False, url_path='sent-messages')
    def get_sent_messages(self, request):
        user = request.user

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
    search_fields = ['title', 'description', 'location', 'category']
    ordering_fields = ['start_time', 'ticket_price']
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_serializer_class(self):
        if self.action in ['retrieve', 'create', 'update', 'partial_update']:
            return EventDetailSerializer
        return EventSerializer

    def get_permissions(self):
        if self.action in ['list', 'retrieve', 'suggest_events', 'hot_events', 'get_chat_messages']:
            return [permissions.IsAuthenticated()]
        elif self.action in ['create']:
            return [perms.IsOrganizerUser()]
        elif self.action in ['update', 'partial_update', 'my_events']:
            return [perms.IsOrganizerOwner()]
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
            queryset = self.queryset.all()
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
        user = request.user
        if user.role != 'organizer':
            return Response({"error": "You do not have permission to view this."}, status=403)
        events = Event.objects.filter(organizer=user)
        serializer = EventSerializer(events, many=True)
        return Response(serializer.data)


class TagViewSet(viewsets.ViewSet, generics.ListAPIView, generics.CreateAPIView, generics.UpdateAPIView, generics.DestroyAPIView):
    queryset = Tag.objects.all()
    serializer_class = TagSerializer
    pagination_class = ItemPaginator
    filter_backends = [SearchFilter]
    search_fields = ['name']

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update']:
            return [IsAdminOrOrganizer()]
        elif self.action == 'destroy':
            return [IsAdminUser()]
        return [permissions.AllowAny()]


class TicketViewSet(viewsets.ViewSet, generics.ListAPIView, generics.RetrieveAPIView, generics.UpdateAPIView):
    queryset = Ticket.objects.all()
    serializer_class = TicketSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = ItemPaginator

    def get_permissions(self):
        if self.action in ['book_ticket', 'check_in']:
            return [permissions.IsAuthenticated()]
        elif self.action in ['update', 'destroy']:
            return [IsTicketOwner()]
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

        #Tham khảo do không tạo UserNotification cho thông báo → User không được liên kết với thông báo.
        # # Tạo UserNotification để liên kết thông báo với user
        # UserNotification.objects.create(user=request.user, notification=notification)

        send_mail(
            subject=f"Xác Nhận Đặt Vé cho {event.title}",
            message=f"Kính gửi {request.user.username},\n\nBạn đã đặt vé cho {event.title}.\nMã QR: {qr_code}\nVui lòng thanh toán để hoàn tất.\n\nTrân trọng!",
            from_email=settings.EMAIL_HOST_USER,
            recipient_list=[request.user.email],
            fail_silently=True
        )

        return Response({
            "message": "Vé đã được đặt thành công.",
            "ticket": TicketSerializer(ticket).data,
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
        return Response({"message": "Check-in thành công.", "ticket": TicketSerializer(ticket).data})


class PaymentViewSet(viewsets.ViewSet, generics.ListAPIView, generics.UpdateAPIView):
    queryset = Payment.objects.all()
    serializer_class = PaymentSerializer
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
            event = tickets.first().event
            notification = Notification(
                event=event,
                notification_type='reminder',
                title="Thanh Toán Thành Công",
                message=f"Thanh toán cho vé sự kiện {event.title} đã hoàn tất.",
                is_read=False
            )
            notification.save()
            # notification.users.add(request.user)
            # Tham khảo:
            #
            # Khi tạo thông báo (Notification), nhìn chung cách làm là phù hợp.
            # Tuy nhiên có một vấn đề:
            #
            # - Dòng `notification.users.add(request.user)` đã bị comment.
            # - Thực tế model Notification không có field `users`.
            #   (Field này thuộc về model trung gian UserNotification.)
            #
            # → Vì vậy, thay vì dùng `notification.users.add(user)`,
            #   cần tạo đối tượng UserNotification để liên kết Notification với User.
            #
            # Kết luận:
            # - Hiện tại, logic tạo thông báo đang không gắn kết Notification với từng User cụ thể.
            # - Thiếu thao tác tạo bản ghi UserNotification.

            # #Giải pháp
            # # Tạo UserNotification để liên kết thông báo với user
            # UserNotification.objects.create(user=request.user, notification=notification)

        return Response({
            "message": "Thanh toán xác nhận thành công.",
            "payment": PaymentSerializer(payment).data
        })


class DiscountCodeViewSet(viewsets.ViewSet, generics.ListAPIView, generics.CreateAPIView):
    queryset = DiscountCode.objects.filter(is_active=True)
    serializer_class = DiscountCodeSerializer
    pagination_class = ItemPaginator

    def get_permissions(self):
        if self.action == 'create':
            return [IsAdminOrOrganizer()]
        return [permissions.IsAuthenticated()]


class NotificationViewSet(viewsets.ViewSet, generics.ListAPIView):
    queryset = Notification.objects.all()
    serializer_class = NotificationSerializer
    pagination_class = ItemPaginator

    def get_permissions(self):
        if self.action == 'my_notifications':
            permission_classes = [permissions.IsAuthenticated]
        elif self.action == 'event_notifications':
            permission_classes = [permissions.AllowAny]
        elif self.action == 'create_notification':
            permission_classes = [IsEventOwnerOrAdmin]
        elif self.action == 'mark_as_read':
            permission_classes = [permissions.IsAuthenticated]
        else:
            permission_classes = [IsEventOwnerOrAdmin]
        return [permission() for permission in permission_classes]

    def get_queryset(self):
        return Notification.objects.none()

    @action(detail=False, methods=['get'], url_path='my-notifications')
    def my_notifications(self, request):
        user = request.user
        user_notifications = UserNotification.objects.filter(user=user).select_related('notification__event')
        notifications = [un.notification for un in user_notifications]
        page = self.paginate_queryset(notifications)
        serializer = self.get_serializer(page or notifications, many=True)
        return self.get_paginated_response(serializer.data) if page else Response(serializer.data)

    @action(detail=False, methods=['get'], url_path='event-notifications')
    def event_notifications(self, request):
        event_id = request.query_params.get('event_id')
        notifications = Notification.objects.filter(event_id=event_id)
        page = self.paginate_queryset(notifications)
        serializer = self.get_serializer(page or notifications, many=True)
        return self.get_paginated_response(serializer.data) if page else Response(serializer.data)

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

        # Tạo UserNotification cho các user có vé
        if event:
            ticket_owners = Ticket.objects.filter(event=event).values_list('user', flat=True).distinct()
            user_notifications = [
                UserNotification(user_id=user_id, notification=notification)
                for user_id in ticket_owners
            ]
            UserNotification.objects.bulk_create(user_notifications)

        return Response({
            "message": "Thông báo đã được tạo thành công.",
            "notification": NotificationSerializer(notification).data
        }, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'], url_path='mark-as-read')
    def mark_as_read(self, request, pk=None):
        try:
            notification = self.get_object()
            user_notification, created = UserNotification.objects.get_or_create(
                user=request.user, notification=notification
            )
            user_notification.is_read = True
            user_notification.read_at = timezone.now()
            user_notification.save()
            return Response({'message': 'Thông báo đã được đánh dấu là đã đọc.'})
        except Notification.DoesNotExist:
            return Response({'error': 'Không tìm thấy thông báo.'}, status=404)


class ChatMessageViewSet(viewsets.ViewSet, generics.CreateAPIView, generics.ListAPIView):
    queryset = ChatMessage.objects.all()
    serializer_class = ChatMessageSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = ItemPaginator

    def get_permissions(self):
        if self.action in ['retrieve', 'update', 'partial_update', 'destroy']:
            return [IsChatMessageSender()]
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

# Đánh giá sự kiện

# Override get_permissions để phân quyền: create yêu cầu xác thực, update/partial_update/destroy yêu cầu ReviewOwner,
# list cho phép tất cả.
# Override get_queryset để lọc review theo event_id và ưu tiên review của user hiện tại đứng đầu.
# Override perform_create để kiểm tra user chưa review event mới cho tạo review, nếu đã có thì báo lỗi.
# Bo vệ quyền sửa/xóa review chỉ cho chủ sở hữu, và đảm bảo mỗi user chỉ được review 1 event 1 lần.
class ReviewViewSet(viewsets.ViewSet, generics.ListCreateAPIView, generics.UpdateAPIView, generics.DestroyAPIView):
    queryset = Review.objects.all()
    serializer_class = ReviewSerializer
    pagination_class = ItemPaginator

    def get_permissions(self):
        if self.action in ['update', 'partial_update', 'destroy']:
            return [perms.ReviewOwner()]
        elif self.action == 'create':
            return [permissions.IsAuthenticated()]
        return [permissions.AllowAny()]

    def get_queryset(self):
        """Trả về danh sách review cho sự kiện, ưu tiên review của user hiện tại đứng đầu."""
        event_id = self.request.query_params.get('event_id')
        queryset = Review.objects.all()
        if event_id:
            queryset = queryset.filter(event_id=event_id)
        user = self.request.user
        if user.is_authenticated:
            # Sắp xếp sao cho review của user hiện tại đứng đầu
            queryset = sorted(queryset, key=lambda r: r.user != user)
        return queryset

    def perform_create(self, serializer):
        """Gán người dùng hiện tại khi tạo review, kiểm tra user chưa review event."""
        user = self.request.user
        event = serializer.validated_data.get('event')
        if Review.objects.filter(user=user, event=event).exists():
            raise serializers.ValidationError("Bạn đã có đánh giá cho sự kiện này.")
        serializer.save(user=user)


class EventTrendingLogViewSet(mixins.ListModelMixin, mixins.RetrieveModelMixin, viewsets.GenericViewSet):
    queryset = EventTrendingLog.objects.filter(event__is_active=True)
    serializer_class = EventTrendingLogSerializer
    pagination_class = ItemPaginator
    permission_classes = [permissions.AllowAny]

    def retrieve(self, request, *args, **kwargs):
        trending_log = self.get_object()
        event = trending_log.event
        serializer = EventDetailSerializer(event)
        return Response(serializer.data)