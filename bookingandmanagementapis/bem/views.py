from django.forms import ValidationError
from django.test import RequestFactory
from rest_framework.exceptions import PermissionDenied
from rest_framework import viewsets, generics, status, permissions, filters, mixins
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.pagination import PageNumberPagination
from rest_framework.filters import SearchFilter, OrderingFilter
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Count, Avg, Q, F, Case, When, IntegerField
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
    IsTicketOwner, IsChatMessageSender, IsEventOwnerOrAdmin,ReviewOwner, IsOrganizerUser
)
from .paginators import ItemPaginator

import hashlib
import hmac
import urllib.parse
from datetime import datetime
from django.http import JsonResponse, HttpResponse
from django.shortcuts import redirect
from django.views.decorators.csrf import csrf_exempt
import json

from cloudinary.uploader import upload

@csrf_exempt
def ping_view(request):
    """Use cron-job.org to ping this endpoint every 10 minutes to keep the server render.com alive."""
    return JsonResponse({"status": "alive"})

@csrf_exempt
def auto_create_notifications_for_upcoming_events(request):
    """
    Luôn tạo notification mới cho các sự kiện sắp diễn ra (7 ngày và 1 ngày tới).
    Nếu event đổi ngày, đến mốc mới sẽ lại tạo notification mới.
    """
    today = timezone.now().date()
    upcoming_events = Event.objects.filter(
        start_time__date__in=[today + timedelta(days=7), today + timedelta(days=1)]
    )

    count = 0
    for event in upcoming_events:
        message = f"Sự kiện '{event.title}' sẽ diễn ra vào {event.start_time.date()}!"
        notification = Notification.objects.create(
            event=event,
            notification_type='reminder',
            title="Sự kiện sắp diễn ra",
            message=message,
        )

        # Lấy tất cả user có vé đã thanh toán cho event này
        ticket_owners = Ticket.objects.filter(event=event, is_paid=True).values_list('user', flat=True).distinct()
        for user_id in ticket_owners:
            UserNotification.objects.create(user_id=user_id, notification=notification)
            user = User.objects.get(id=user_id)
            send_mail(
                subject="Sự kiện sắp diễn ra",
                message=f"Kính gửi {user.username},\n\n{message}\n\nTrân trọng!",
                from_email=settings.EMAIL_HOST_USER,
                recipient_list=[user.email],
                fail_silently=False,
            )
        count += 1

    return JsonResponse({"message": f"Đã tạo notification cho {count} sự kiện."})


class UserViewSet(viewsets.ViewSet, generics.CreateAPIView, generics.ListAPIView):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    pagination_class = ItemPaginator
    filter_backends = [SearchFilter, OrderingFilter]
    search_fields = ['username', 'email', 'phone']
    ordering_fields = ['created_at', 'username']

    def get_permissions(self):
        if self.action in ['get_current_user', 'tickets', 'payments', 'notifications', 'sent_messages', 'profile', 'deactivate']:
            return [permissions.IsAuthenticated()]
        elif self.action in ['list', 'admin_deactivate']:
            return [IsAdminUser()]
        elif self.action == 'create':
            return [permissions.AllowAny()]
        return [permissions.IsAuthenticated()]

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

    @action(methods=['post'], detail=True, url_path='admin-deactivate')
    def admin_deactivate(self, request, pk=None):
        user = get_object_or_404(User, pk=pk)
        user.is_active = False
        user.save()
        return Response({"detail": f"Tài khoản {user.username} đã bị vô hiệu hóa bởi admin."}, status=status.HTTP_200_OK)

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



 

# ViewSet cho Event
#Xem sự kiện
# Cho phép người dùng xem danh sách sự kiện và chi tiết sự kiện
# Chỉ admin và organizer mới có quyền tạo và chỉnh sửa sự kiện
class EventViewSet(viewsets.ViewSet, generics.ListAPIView, generics.RetrieveAPIView, generics.CreateAPIView, generics.UpdateAPIView):
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
        if self.action in ['list', 'hot_events', 'categories']:
            # Không yêu cầu xác thực cho list, hot_events
            return [permissions.AllowAny()]
        elif self.action in ['retrieve', 'get_chat_messages','suggest_events', 'get_statistics']:
            # Yêu cầu đăng nhập để xem chi tiết sự kiện hoặc tin nhắn chat
            return [permissions.IsAuthenticated()]
        elif self.action in ['create']:
            return [IsOrganizerUser()]
        elif self.action in ['update', 'partial_update', 'my_events']:
            return [IsOrganizerOwner()]
        return [IsAdminOrOrganizer(), IsEventOrganizer()]

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
        # Nếu người dùng đã đăng nhập, áp dụng logic lọc theo vai trò
        if self.request.user.is_authenticated:
            if user.role == 'attendee':
                queryset = self.queryset.all()
            elif user.role == 'organizer':
                queryset = self.queryset.filter(organizer=user)
            elif user.role == 'admin':
                queryset = self.queryset.all()
            else:
                queryset = self.queryset.none()
        else:
            # Nếu chưa đăng nhập, chỉ hiển thị các sự kiện công khai (is_active=True)
            queryset = self.queryset.filter(is_active=True)

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

    @action(detail=False, methods=['get'], url_path='categories')
    def categories(self, request):
        categories = dict(Event.CATEGORY_CHOICES)
        return Response(categories)
    
    @action(detail=False, methods=['get'], url_path='suggest_events')
    def suggest_events(self, request):
        user = request.user
        if not user.is_authenticated:
            return Response({"error": "Authentication required to get suggested events."}, status=status.HTTP_401_UNAUTHORIZED)

        # Lấy danh sách tag và category liên quan đến người dùng
        user_tags = user.tags.all()
        user_ticket_categories = Ticket.objects.filter(
            user=user
        ).values_list('event__category', flat=True).distinct()

        # Truy vấn sự kiện theo tag hoặc category
        suggested_events = Event.objects.active().filter(
            Q(tags__in=user_tags) | Q(category__in=user_ticket_categories),
            start_time__gte=timezone.now()
        ).annotate(
            matching_tags=Count('tags', filter=Q(tags__in=user_tags)),
            is_matching_category=Case(
                When(category__in=user_ticket_categories, then=1),
                default=0,
                output_field=IntegerField()
            )
        ).order_by(
            '-matching_tags',
            '-is_matching_category',
            'start_time'
        ).distinct()[:10]

        serializer = EventSerializer(suggested_events, many=True, context={'request': request})
        return Response(serializer.data)


class TagViewSet(viewsets.ViewSet, generics.ListAPIView, generics.CreateAPIView, generics.UpdateAPIView, generics.DestroyAPIView):
    queryset = Tag.objects.all().order_by('id')
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


class TicketViewSet(viewsets.ViewSet, generics.ListAPIView,generics.UpdateAPIView):
    queryset = Ticket.objects.all()
    serializer_class = TicketSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = ItemPaginator

    def get_permissions(self):
        if self.action in ['book_ticket', 'check_in']:
            return [permissions.IsAuthenticated()]
        elif self.action in ['update', 'destroy', 'retrieve']:
            return [IsTicketOwner()]
        return super().get_permissions()

    def get_queryset(self):
        if not self.request.user.is_authenticated:
            return self.queryset.none()
        return self.queryset.filter(user=self.request.user).select_related('event')

    #Xem chi tiết vé (xem chi tiết,hiện QR để scan check-in)
    # Chỉ cho phép người dùng xem vé của mình
    def retrieve(self, request, pk=None):
        try:
            ticket = self.get_queryset().get(pk=pk)
        except Ticket.DoesNotExist:
            return Response({"error": "Không tìm thấy vé."}, status=status.HTTP_404_NOT_FOUND)
        serializer = self.get_serializer(ticket)
        return Response(serializer.data)
    #đặt 1 vé cho sự kiện
    @action(detail=False, methods=['post'], url_path='book-ticket')
    def book_ticket(self, request):
        event_id = request.data.get('event_id')
        try:
            event = Event.objects.get(id=event_id, is_active=True, start_time__gte=timezone.now())
        except Event.DoesNotExist:
            return Response({"error": "Sự kiện không tồn tại hoặc không khả dụng."}, status=status.HTTP_404_NOT_FOUND)

        if event.tickets.filter(is_paid=True).count() >= event.total_tickets:
            return Response({"error": "Hết vé."}, status=status.HTTP_400_BAD_REQUEST)

        #Tạo vé, KHÔNG tạo QR
        ticket = Ticket(event=event, user=request.user)
        ticket.save()

        return Response({
            "message": "Vé đã được đặt thành công.",
            "ticket": TicketSerializer(ticket).data,
            "qr_code_url": None  # Chưa có QR
        }, status=status.HTTP_201_CREATED)


    @action(detail=False, methods=['post'], url_path='check-in')
    def check_in(self, request):
        ticket_uuid = request.data.get('uuid')
        try:
            ticket = Ticket.objects.get(uuid=ticket_uuid, is_paid=True)
        except Ticket.DoesNotExist:
            return Response({"error": "Vé không hợp lệ hoặc chưa thanh toán."}, status=status.HTTP_404_NOT_FOUND)

        if ticket.is_checked_in:
            return Response({"error": "Vé đã được check-in."}, status=status.HTTP_400_BAD_REQUEST)

        ticket.check_in()
        return Response({"message": "Check-in thành công.", "ticket": TicketSerializer(ticket).data})


def vnpay_encode(value):
    # Encode giống VNPay: dùng quote_plus để chuyển space thành '+'
    from urllib.parse import quote_plus
    return quote_plus(str(value), safe='')

@csrf_exempt
def create_payment_url(request):
    import pytz
    tz = pytz.timezone("Asia/Ho_Chi_Minh")

    vnp_TmnCode = 'GUPETCYO'
    vnp_HashSecret = 'E2G0Y153XRTW37LVRKW8DJ1TGEQ9RK6I'
    vnp_Url = 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html'
    vnp_ReturnUrl = 'https://event-management-and-online-booking.onrender.com/vnpay/redirect?from=app'

    #Nhận các thông tin đơn hàng từ request
    amount = request.GET.get("amount", "10000")  # đơn vị VND
    order_type = "other"
    #Tạo mã giao dịch và ngày giờ
    order_id = datetime.now(tz).strftime('%H%M%S')
    create_date = datetime.now(tz).strftime('%Y%m%d%H%M%S')
    ip_address = request.META.get('REMOTE_ADDR')

    #Tạo dữ liệu gửi lên VNPay
    input_data = {
        "vnp_Version": "2.1.0",
        "vnp_Command": "pay",
        "vnp_TmnCode": vnp_TmnCode,
        "vnp_Amount": str(int(float(amount)) * 100),
        "vnp_CurrCode": "VND",
        "vnp_TxnRef": order_id,
        "vnp_OrderInfo": "Thanh toan don hang",
        "vnp_OrderType": order_type,
        "vnp_Locale": "vn",
        "vnp_ReturnUrl": vnp_ReturnUrl,
        "vnp_IpAddr": ip_address,
        "vnp_CreateDate": create_date
    }
    print("Input data before signing:", input_data)
    #Tạo chữ ký (vnp_SecureHash) để đảm bảo dữ liệu không bị giả mạo
    sorted_data = sorted(input_data.items())
    query_string = '&'.join(
        f"{k}={vnpay_encode(v)}"
        for k, v in sorted(input_data.items())
        if v
    )
    # Chỉ lấy các key có giá trị, không lấy vnp_SecureHash
    hash_data = '&'.join(
        f"{k}={vnpay_encode(v)}"
        for k, v in sorted(input_data.items())
        if v and k != "vnp_SecureHash"
    )

    secure_hash = hmac.new(
        bytes(vnp_HashSecret, 'utf-8'),
        bytes(hash_data, 'utf-8'),
        hashlib.sha512
    ).hexdigest()
    # Tạo payment_url đầy đủ để redirect người dùng
    payment_url = f"{vnp_Url}?{query_string}&vnp_SecureHash={secure_hash}"
    #Trả kết quả về frontend
    return JsonResponse({"payment_url": payment_url})

def vnpay_response_message(code):
    mapping = {
        "00": "Giao dịch thành công.",
        "07": "Trừ tiền thành công. Giao dịch bị nghi ngờ (liên quan tới lừa đảo, giao dịch bất thường).",
        "09": "Thẻ/Tài khoản chưa đăng ký InternetBanking.",
        "10": "Xác thực thông tin thẻ/tài khoản không đúng quá 3 lần.",
        "11": "Hết hạn chờ thanh toán. Vui lòng thực hiện lại giao dịch.",
        "12": "Thẻ/Tài khoản bị khóa.",
        "13": "Sai mật khẩu xác thực giao dịch (OTP).",
        "24": "Khách hàng hủy giao dịch.",
        "51": "Tài khoản không đủ số dư.",
        "65": "Tài khoản vượt quá hạn mức giao dịch trong ngày.",
        "75": "Ngân hàng thanh toán đang bảo trì.",
        "79": "Sai mật khẩu thanh toán quá số lần quy định.",
        "99": "Lỗi khác hoặc không xác định.",
    }
    return mapping.get(code, "Lỗi không xác định.")

def vnpay_redirect(request):
    from_app = request.GET.get('from') == 'app'
    vnp_ResponseCode = request.GET.get('vnp_ResponseCode')
    # ... lấy các tham số khác nếu cần

    if vnp_ResponseCode is None:
        return HttpResponse("Thiếu tham số vnp_ResponseCode.", status=400)

    message = vnpay_response_message(vnp_ResponseCode)

    # Trường hợp mở từ WebView trong app
    if from_app:
        return HttpResponse(f"""
            <html>
            <head>
                <meta charset="utf-8"/>
                <style>
                    body {{
                        background: #f5f6fa;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        height: 100vh;
                        margin: 0;
                    }}
                    .result-box {{
                        background: #fff;
                        border-radius: 12px;
                        box-shadow: 0 2px 8px rgba(0,0,0,0.08);
                        padding: 32px 48px;
                        text-align: center;
                    }}
                    .result-title {{
                        color: #2d8cf0;
                        font-size: 3rem;
                        margin-bottom: 12px;
                    }}
                    .result-message {{
                        color: #333;
                        font-size: 1.7rem;
                    }}
                </style>
            </head>
            <body>
                <div class="result-box">
                    <div class="result-title">Kết quả thanh toán</div>
                    <div class="result-message">{message}</div>
                </div>
                <script>
                setTimeout(function() {{
                    window.close();
                }}, 1500);
                </script>
            </body>
            </html>
        """)
    else:
        deeplink = f"bemmobile://payment-result?vnp_ResponseCode={vnp_ResponseCode}&message={urllib.parse.quote(message)}"
        return redirect(deeplink)

class PaymentViewSet(viewsets.ViewSet, generics.ListAPIView, generics.UpdateAPIView, generics.DestroyAPIView):
    queryset = Payment.objects.all()
    serializer_class = PaymentSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = ItemPaginator

    def get_permissions(self):
        if self.action == 'destroy':
            return [IsAdminUser()]
        elif self.action =='retrieve':
            return [permissions.IsAuthenticated()]
        return super().get_permissions()

    def get_queryset(self):
        user = self.request.user
        if not user.is_authenticated:
            return Payment.objects.none()
        return self.queryset.filter(user=self.request.user).select_related('discount_code')

    def retrieve(self, request, pk=None):
        try:
            payment = self.get_queryset().get(pk=pk)
        except Payment.DoesNotExist:
            return Response({"error": "Không tìm thấy thanh toán."}, status=status.HTTP_404_NOT_FOUND)
        serializer = self.get_serializer(payment)
        return Response(serializer.data)

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

        # Cập nhật total_spent của user
        user = payment.user
        user.total_spent += payment.amount
        user.save()

        # Tăng used_count cho discount_code nếu có, theo số lượng vé được giảm giá
        if payment.discount_code:
            discount_obj = payment.discount_code
            num_tickets = payment.tickets.count()
            discount_obj.used_count += num_tickets
            discount_obj.save()

        tickets = payment.tickets.all()
        # Tạo QR code cho các vé vừa thanh toán thành công (nếu chưa có)

        for ticket in tickets:
            if not ticket.qr_code:
                qr = qrcode.QRCode(version=1, box_size=10, border=5)
                qr.add_data(str(ticket.uuid))
                qr.make(fit=True)
                img = qr.make_image(fill='black', back_color='white')
                buffer = io.BytesIO()
                img.save(buffer, format="PNG")
                buffer.seek(0)
                upload_result = upload(buffer, folder="ticket_qr_codes")
                ticket.qr_code = upload_result['secure_url']
                ticket.save()

        if tickets:
            event = tickets.first().event
            notification, created = Notification.objects.get_or_create(
                event=event,
                notification_type='reminder',
                title="Thanh toán thành công",
                message=(
                    f"Thanh toán {payment.amount} cho {tickets.count()} vé sự kiện {event.title} đã hoàn tất."
                ),
            )
            notification.save()
            UserNotification.objects.get_or_create(user=request.user, notification=notification)


            # Tạo tin nhắn từ organizer đến attendee
            organizer = event.organizer
            ChatMessage.objects.create(
                event=event,
                sender=organizer,
                receiver=user,
                message="Tôi có thể giúp gì cho bạn ?",
                is_from_organizer=True
            )
        send_mail(
            subject=f"Thanh toán thành công ",
            message=f"Kính gửi {user.username},\n\nThanh toán {payment.amount} cho {tickets.count()} vé sự kiện {event.title} đã được xác nhận thành công.\n\nTrân trọng!",
            from_email=settings.EMAIL_HOST_USER,
            recipient_list=[user.email],
            fail_silently=False,
        )

        return Response({
            "message": "Thanh toán xác nhận thành công.",
            "payment": PaymentSerializer(payment).data
        })

    @action(detail=False, methods=['post'], url_path='pay-unpaid-tickets')
    def pay_unpaid_tickets_for_event(self, request):
        user = request.user
        event_id = request.data.get('event_id')
        discount_code_id = request.data.get('discount_code_id')
        ticket_ids = request.data.get('ticket_ids', [])

        if not event_id:
            return Response({"error": "Thiếu event_id."}, status=status.HTTP_400_BAD_REQUEST)
        if not ticket_ids or not isinstance(ticket_ids, list):
            return Response({"error": "Thiếu danh sách ticket_ids."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            event = Event.objects.get(id=event_id)
        except Event.DoesNotExist:
            return Response({"error": "Sự kiện không tồn tại."}, status=status.HTTP_404_NOT_FOUND)

        # Chỉ lấy đúng các vé user truyền lên, chưa thanh toán, đúng event
        unpaid_tickets = Ticket.objects.filter(
            user=user, is_paid=False, event=event, id__in=ticket_ids
        )
        if unpaid_tickets.count() != len(ticket_ids):
            return Response({"error": "Một số vé không hợp lệ hoặc đã thanh toán."}, status=status.HTTP_400_BAD_REQUEST)
        
        total_amount = sum(ticket.event.ticket_price for ticket in unpaid_tickets)

        #Xử lý mã giảm giá
        discount_obj = None
        discount = 0
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
                if discount_obj.user_group != user.get_customer_group().value:
                    return Response({"error": "Mã giảm giá không áp dụng cho nhóm khách hàng này."}, status=status.HTTP_400_BAD_REQUEST)
                discount = (total_amount * discount_obj.discount_percentage) / 100
                total_amount -= discount
            except DiscountCode.DoesNotExist:
                return Response({"error": "Mã giảm giá không hợp lệ hoặc đã hết hạn."}, status=status.HTTP_400_BAD_REQUEST)

        #Xử lý payment
        payment = Payment(
            user=user,
            amount=total_amount,
            payment_method=request.data.get('payment_method', 'momo'),
            status=False,
            transaction_id=str(uuid.uuid4()),
            discount_code=discount_obj
        )
        payment.save()
        for ticket in (unpaid_tickets):
            ticket.payment = payment
            ticket.save()

        # notification = Notification(
        #     event=event,
        #     notification_type='reminder',
        #     title="Tạo Payment - Vui lòng thanh toán",
        #     message=f"Payment cho vé sự kiện {event.title} đã được tạo. Vui lòng hoàn tất thanh toán.",
        #     # is_read=False
        # )
        # notification.save()

        # Tạo UserNotification để liên kết Notification với User
        # UserNotification.objects.get_or_create(user=user, notification=notification)

        # send_mail(
        #     subject=f"Xác Nhận Tạo Payment cho {event.title}",
        #     message=f"Kính gửi {user.username},\n\nPayment cho vé sự kiện {event.title} đã được tạo. Vui lòng hoàn tất thanh toán.\n\nTrân trọng!",
        #     from_email=settings.EMAIL_HOST_USER,
        #     recipient_list=[user.email],
        #     fail_silently=False,
        # )

        # Giả lập payment_url cho ví dụ, thực tế cần tích hợp SDK hoặc API cổng thanh toán
        payment_method = request.data.get('payment_method', 'momo')
        payment_url = None

        if payment_method == 'vnpay':
            # Gọi trực tiếp hàm create_payment_url
            factory = RequestFactory()
            fake_request = factory.get(
                '/vnpay/create_payment_url/',
                {'amount': total_amount}
            )
            response = create_payment_url(fake_request)
            payment_url = response.data['payment_url'] if hasattr(response, 'data') else json.loads(response.content)['payment_url']
        else:
            # MoMo hoặc phương thức khác
            payment_url = f"https://api.momo.vn/pay?amount={total_amount}&orderId={payment.transaction_id}"

        return Response({
            "message": "Tạo payment thành công. Vui lòng thanh toán.",
            "payment": PaymentSerializer(payment).data,
            "payment_url": payment_url
        })


class DiscountCodeViewSet(viewsets.ViewSet, generics.ListAPIView, generics.CreateAPIView,generics.DestroyAPIView):
    queryset = DiscountCode.objects.filter(is_active=True)
    serializer_class = DiscountCodeSerializer
    pagination_class = ItemPaginator

    def get_permissions(self):
        if self.action in ['create','destroy']:
            return [IsAdminUser()]
        return [permissions.IsAuthenticated()]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=['get'], url_path='user-group-discount-codes')
    def user_group_discount_codes(self, request):
        user = request.user
        if not user.is_authenticated:
            return Response({"error": "Authentication required."}, status=status.HTTP_401_UNAUTHORIZED)
        user_group = user.get_customer_group().value
        now = timezone.now()
        discount_codes = DiscountCode.objects.filter(
            is_active=True,
            user_group=user_group,
            valid_from__lte=now,
            valid_to__gte=now
        ).exclude(
            max_uses__isnull=False,
            used_count__gte=F('max_uses')
        )
        serializer = self.get_serializer(discount_codes, many=True)
        return Response(serializer.data)


class NotificationViewSet(viewsets.ViewSet):
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

    @action(detail=False, methods=['get'], url_path='my-notifications')
    def my_notifications(self, request):
        if not request.user.is_authenticated:
            return Response({"error": "Yêu cầu xác thực."}, status=status.HTTP_401_UNAUTHORIZED)

        user_notifications = UserNotification.objects.filter(user=request.user).select_related('notification__event').order_by('-notification__created_at')
        notifications = [un.notification for un in user_notifications]

        paginator = ItemPaginator()
        page = paginator.paginate_queryset(notifications, request)
        serializer = NotificationSerializer(
            page or notifications,
            many=True,
            context={'request': request}  # Truyền context để get_is_read truy cập request.user
        )

        if page is not None:
            return paginator.get_paginated_response(serializer.data)
        return Response(serializer.data)

    @action(detail=False, methods=['get'], url_path='event-notifications')
    def event_notifications(self, request):
        event_id = request.query_params.get('event_id')
        if not event_id:
            return Response({"error": "Thiếu tham số event_id."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            notifications = Notification.objects.filter(event_id=event_id).order_by('id')
        except ValueError:
            return Response({"error": "event_id không hợp lệ."}, status=status.HTTP_400_BAD_REQUEST)

        paginator = ItemPaginator()
        page = paginator.paginate_queryset(notifications, request)
        serializer = NotificationSerializer(
            page or notifications,
            many=True,
            context={'request': request}  # Truyền context
        )

        if page is not None:
            return paginator.get_paginated_response(serializer.data)
        return Response(serializer.data)

    @action(detail=False, methods=['post'], url_path='create-notification')
    def create_notification(self, request):
        event_id = request.data.get('event_id')
        title = request.data.get('title')
        message = request.data.get('message')
        notification_type = request.data.get('notification_type', 'reminder')

        if not title or not message:
            return Response({"error": "Thiếu tiêu đề hoặc nội dung thông báo."}, status=status.HTTP_400_BAD_REQUEST)

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
            message=message
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
            "notification": NotificationSerializer(notification, context={'request': request}).data
        }, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'], url_path='mark-as-read')
    def mark_as_read(self, request, pk=None):
        if not request.user.is_authenticated:
            return Response({"error": "Yêu cầu xác thực."}, status=status.HTTP_401_UNAUTHORIZED)

        try:
            notification = Notification.objects.get(pk=pk)
        except Notification.DoesNotExist:
            return Response({"error": "Không tìm thấy thông báo."}, status=status.HTTP_404_NOT_FOUND)

        user_notification, created = UserNotification.objects.get_or_create(
            user=request.user,
            notification=notification,
            defaults={'is_read': False}
        )
        user_notification.is_read = True
        user_notification.read_at = timezone.now()
        user_notification.save()

        return Response({"message": "Thông báo đã được đánh dấu là đã đọc."}, status=status.HTTP_200_OK)

class ChatMessageViewSet(viewsets.ModelViewSet):
    serializer_class = ChatMessageSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        event_id = self.request.query_params.get('event_id')
        if not event_id:
            return ChatMessage.objects.none()
        return ChatMessage.objects.filter(
            event_id=event_id
        ).filter(
            Q(receiver_id=self.request.user.id) |
            Q(sender_id=self.request.user.id) |
            Q(receiver_id__isnull=True)
        ).order_by('-created_at')

    def list(self, request, *args, **kwargs):
        event_id = request.query_params.get('event_id')
        if not event_id:
            return Response({"error_code": "MISSING_EVENT_ID", "detail": "Event ID is required."}, status=400)
        return super().list(request, *args, **kwargs)

# # Giả sử bạn có class ReviewOwner để kiểm tra quyền
# class ReviewOwner(permissions.BasePermission):
#     def has_object_permission(self, request, view, obj):
#         return obj.user == request.user

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
            return [ReviewOwner()]
        elif self.action == 'create':
            return [permissions.IsAuthenticated()]
        elif self.action == 'event_reviews_for_organizer':
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
            from django.db.models import Case, When, Value, IntegerField
            queryset = queryset.annotate(
                is_current_user=Case(
                    When(user=user, then=Value(0)),
                    default=Value(1),
                    output_field=IntegerField(),
                )
            ).order_by('is_current_user')
        return queryset

    def perform_create(self, serializer):
        """Gán người dùng hiện tại khi tạo review hoặc phản hồi, và tạo thông báo nếu là phản hồi từ organizer."""
        user = self.request.user
        parent_review = serializer.validated_data.get('parent_review')

        if parent_review:
            # Nếu là phản hồi, không kiểm tra điều kiện "đã review"
            event = parent_review.event
            if user.role != 'organizer' or event.organizer != user:
                raise PermissionDenied("Bạn không có quyền phản hồi đánh giá này.")

            # Lưu phản hồi
            review = serializer.save(user=user)

            # Tạo thông báo cho người dùng đã viết đánh giá gốc
            notification = Notification(
                event=event,
                notification_type='reply',
                title="Phản hồi từ người tổ chức",
                message=f"Người tổ chức đã phản hồi đánh giá của bạn cho sự kiện {event.title}.",
            )
            notification.save()

            # Tạo UserNotification để liên kết với người dùng gốc
            UserNotification.objects.get_or_create(
                user=parent_review.user,
                notification=notification
            )

            # Gửi email thông báo (tùy chọn)
            send_mail(
                subject=f"Phản hồi từ người tổ chức cho sự kiện {event.title}",
                message=f"Kính gửi {parent_review.user.username},\n\nNgười tổ chức đã phản hồi đánh giá của bạn cho sự kiện {event.title}. Vui lòng kiểm tra ứng dụng để xem chi tiết.\n\nTrân trọng!",
                from_email=settings.EMAIL_HOST_USER,
                recipient_list=[parent_review.user.email],
                fail_silently=False,
            )
        else:
            # Nếu là review gốc, kiểm tra user chưa review event
            event = serializer.validated_data.get('event')
            if Review.objects.filter(user=user, event=event, parent_review__isnull=True).exists():
                raise ValidationError("Bạn đã có đánh giá cho sự kiện này.")

            serializer.save(user=user)

    @action(detail=False, methods=['get'], url_path='event-reviews-organizer')
    def event_reviews_for_organizer(self, request):
        """
        Lấy danh sách review của một sự kiện, yêu cầu người dùng là organizer của sự kiện.
        Query param: event_id (bắt buộc)
        """
        event_id = request.query_params.get('event_id')
        if not event_id:
            raise ValidationError("Tham số event_id là bắt buộc.")

        try:
            event = Event.objects.get(id=event_id)
        except Event.DoesNotExist:
            raise ValidationError("Sự kiện không tồn tại.")

        user = request.user
        if not user.is_authenticated:
            raise PermissionDenied("Bạn cần đăng nhập để thực hiện hành động này.")
        if user.role != 'organizer' or event.organizer != user:
            raise PermissionDenied("Bạn không có quyền xem đánh giá của sự kiện này.")

        reviews = Review.objects.filter(event=event).prefetch_related('replies')
        page = self.paginate_queryset(reviews)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = self.get_serializer(reviews, many=True)
        return Response(serializer.data)



class EventTrendingLogViewSet(viewsets.ViewSet,generics.ListAPIView, generics.RetrieveAPIView):
    queryset = EventTrendingLog.objects.filter(event__is_active=True)
    serializer_class = EventTrendingLogSerializer
    pagination_class = ItemPaginator
    permission_classes = [permissions.AllowAny]

    def retrieve(self, request, *args, **kwargs):
        trending_log = self.get_object()
        event = trending_log.event
        serializer = EventDetailSerializer(event)
        return Response(serializer.data)