from rest_framework import serializers
from .models import (
    User, Event, Tag, Ticket, Payment, Review, DiscountCode, Notification,
    ChatMessage, EventTrendingLog
)


# Serializer cho Tag
class TagSerializer(serializers.ModelSerializer):
    class Meta:
        model = Tag
        fields = ['id', 'name']


# Serializer cho User
class UserSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=True)

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'password', 'phone', 'role']
        read_only_fields = ['id']

    def create(self, validated_data):
        password = validated_data.pop('password')
        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data['email'],
            password=password,
            phone=validated_data.get('phone'),
            role=validated_data.get('role', 'attendee')
        )
        return user

    def update(self, instance, validated_data):
        password = validated_data.pop('password', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        if password:
            instance.set_password(password)
        instance.save()
        return instance


# Serializer cho Event
class EventSerializer(serializers.ModelSerializer):
    organizer = serializers.PrimaryKeyRelatedField(queryset=User.objects.filter(role='organizer'))
    tags = TagSerializer(many=True, read_only=True)

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data['poster'] = instance.poster.url if instance.poster else ''
        return data

    def validate_organizer(self, value):
        if value.role != 'organizer':
            raise serializers.ValidationError("Chỉ người tổ chức mới có thể tạo sự kiện.")
        return value

    class Meta:
        model = Event
        fields = [
            'id', 'organizer', 'title', 'description', 'category', 'start_time',
            'end_time', 'is_active', 'location', 'latitude', 'longitude',
            'total_tickets', 'ticket_price', 'sold_tickets', 'tags', 'poster',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at', 'sold_tickets']


# Serializer cho Ticket
class TicketSerializer(serializers.ModelSerializer):
    event = serializers.PrimaryKeyRelatedField(queryset=Event.objects.all())
    user = serializers.PrimaryKeyRelatedField(queryset=User.objects.all())
    qr_code = serializers.SerializerMethodField()

    def get_qr_code(self, obj):
        return obj.qr_code.url if obj.qr_code else ''

    def validate(self, attrs):
        event = attrs.get('event')
        if event and event.sold_tickets >= event.total_tickets:
            raise serializers.ValidationError("Hết vé cho sự kiện này.")
        return attrs

    class Meta:
        model = Ticket
        fields = [
            'id', 'user', 'event', 'qr_code', 'is_paid', 'purchase_date',
            'is_checked_in', 'check_in_date', 'created_at'
        ]
        read_only_fields = ['created_at', 'purchase_date', 'check_in_date', 'qr_code']


# Serializer cho Payment
class PaymentSerializer(serializers.ModelSerializer):
    user = serializers.PrimaryKeyRelatedField(queryset=User.objects.all())
    tickets = TicketSerializer(many=True, read_only=True)
    discount_code = serializers.PrimaryKeyRelatedField(queryset=DiscountCode.objects.all(), allow_null=True)
    transaction_id = serializers.SerializerMethodField()

    def get_transaction_id(self, obj):
        return obj.get_display_transaction_id()

    def validate_discount_code(self, value):
        if value and not value.is_valid():
            raise serializers.ValidationError("Mã giảm giá không hợp lệ hoặc đã hết hạn.")
        return value

    class Meta:
        model = Payment
        fields = [
            'id', 'user', 'tickets', 'amount', 'payment_method', 'status', 'paid_at',
            'transaction_id', 'discount_code'
        ]
        read_only_fields = ['amount', 'paid_at', 'transaction_id']


# Serializer cho Review
class ReviewSerializer(serializers.ModelSerializer):
    event = serializers.PrimaryKeyRelatedField(queryset=Event.objects.all())
    user = serializers.PrimaryKeyRelatedField(queryset=User.objects.all())

    def validate_rating(self, value):
        if not (1 <= value <= 5):
            raise serializers.ValidationError("Điểm đánh giá phải từ 1 đến 5.")
        return value

    class Meta:
        model = Review
        fields = [
            'id', 'event', 'user', 'rating', 'comment', 'created_at'
        ]
        read_only_fields = ['created_at']


# Serializer cho DiscountCode
class DiscountCodeSerializer(serializers.ModelSerializer):
    class Meta:
        model = DiscountCode
        fields = [
            'id', 'code', 'discount_percentage', 'valid_from', 'valid_to',
            'user_group', 'max_uses', 'used_count', 'is_active'
        ]
        read_only_fields = ['used_count']


# Serializer cho Notification
class NotificationSerializer(serializers.ModelSerializer):
    user = serializers.PrimaryKeyRelatedField(queryset=User.objects.all())
    event = serializers.PrimaryKeyRelatedField(queryset=Event.objects.all(), allow_null=True)

    class Meta:
        model = Notification
        fields = [
            'id', 'user', 'event', 'notification_type', 'title', 'message',
            'is_read', 'created_at'
        ]
        read_only_fields = ['created_at']


# Serializer cho ChatMessage
class ChatMessageSerializer(serializers.ModelSerializer):
    event = serializers.PrimaryKeyRelatedField(queryset=Event.objects.all())
    sender = serializers.PrimaryKeyRelatedField(queryset=User.objects.all())
    receiver = serializers.PrimaryKeyRelatedField(queryset=User.objects.all())

    def validate(self, attrs):
        is_from_organizer = attrs.get('is_from_organizer', False)
        sender = attrs.get('sender')
        if is_from_organizer and sender.role != 'organizer':
            raise serializers.ValidationError("Chỉ người tổ chức mới có thể gửi tin nhắn với tư cách người tổ chức.")
        return attrs

    class Meta:
        model = ChatMessage
        fields = [
            'id', 'event', 'sender', 'receiver', 'message',
            'is_from_organizer', 'created_at'
        ]
        read_only_fields = ['created_at']


# Serializer cho EventTrendingLog
class EventTrendingLogSerializer(serializers.ModelSerializer):
    event = serializers.PrimaryKeyRelatedField(queryset=Event.objects.all())

    class Meta:
        model = EventTrendingLog
        fields = [
            'id', 'event', 'view_count', 'ticket_sold_count', 'last_updated'
        ]
        read_only_fields = ['last_updated']


# Serializer chi tiết cho User
class UserDetailSerializer(serializers.ModelSerializer):
    organized_events = EventSerializer(many=True, read_only=True)
    tickets = TicketSerializer(many=True, read_only=True)
    payments = PaymentSerializer(many=True, read_only=True)
    event_reviews = ReviewSerializer(many=True, read_only=True)
    notifications = NotificationSerializer(many=True, read_only=True)
    sent_messages = ChatMessageSerializer(many=True, read_only=True)
    tags = TagSerializer(many=True, read_only=True)

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data['avatar'] = instance.avatar.url if instance.avatar else ''
        data['customer_group'] = instance.get_customer_group().value
        return data

    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'role', 'phone', 'avatar', 'total_spent',
            'tags', 'is_active', 'is_staff', 'is_superuser', 'created_at', 'updated_at',
            'organized_events', 'tickets', 'payments', 'event_reviews',
            'notifications', 'sent_messages'
        ]
        read_only_fields = ['created_at', 'updated_at', 'is_staff', 'is_superuser', 'total_spent']


# Serializer chi tiết cho Event
class EventDetailSerializer(serializers.ModelSerializer):
    organizer = UserSerializer(read_only=True)
    tickets = TicketSerializer(many=True, read_only=True)
    reviews = ReviewSerializer(many=True, read_only=True)
    event_notifications = NotificationSerializer(many=True, read_only=True)
    chat_messages = ChatMessageSerializer(many=True, read_only=True)
    tags = TagSerializer(many=True, read_only=True)

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data['poster'] = instance.poster.url if instance.poster else ''
        data['sold_tickets'] = instance.sold_tickets
        return data

    class Meta:
        model = Event
        fields = [
            'id', 'organizer', 'title', 'description', 'category', 'start_time',
            'end_time', 'is_active', 'location', 'latitude', 'longitude',
            'total_tickets', 'ticket_price', 'sold_tickets', 'tags', 'poster',
            'created_at', 'updated_at', 'tickets', 'reviews', 'event_notifications',
            'chat_messages'
        ]
        read_only_fields = ['created_at', 'updated_at', 'sold_tickets']