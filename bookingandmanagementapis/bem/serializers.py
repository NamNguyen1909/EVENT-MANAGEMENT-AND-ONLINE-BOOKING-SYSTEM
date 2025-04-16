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
        # Lấy password và xóa khỏi validated_data để không truyền trực tiếp vào create_user
        password = validated_data.pop('password')
        # Tạo user mới
        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data['email'],
            password=password,  # create_user sẽ tự động mã hóa password
            phone=validated_data.get('phone')
        )
        # Lưu các trường khác nếu cần
        for field, value in validated_data.items():
            if field != 'username' and field != 'email' and field != 'phone':
                setattr(user, field, value)
        user.save()
        return user

    def update(self, instance, validated_data):
        # Xử lý cập nhật password nếu có
        password = validated_data.pop('password', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        if password:
            instance.set_password(password)  # Mã hóa password
        instance.save()
        return instance


# Serializer cho Event
class EventSerializer(serializers.ModelSerializer):
    organizer = serializers.PrimaryKeyRelatedField(queryset=User.objects.all())
    tags = TagSerializer(many=True, read_only=True)

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data['poster'] = instance.poster.url if instance.poster else ''
        return data

    class Meta:
        model = Event
        fields = [
            'id', 'organizer', 'title', 'description', 'category', 'start_time',
            'end_time', 'is_active', 'location', 'latitude', 'longitude',
            'total_tickets', 'ticket_price', 'tags', 'poster', 'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at']


# Serializer cho Ticket
class TicketSerializer(serializers.ModelSerializer):
    event = serializers.PrimaryKeyRelatedField(queryset=Event.objects.all())
    user = serializers.PrimaryKeyRelatedField(queryset=User.objects.all())

    class Meta:
        model = Ticket
        fields = [
            'id', 'user', 'event', 'qr_code', 'is_paid', 'purchase_date',
            'is_checked_in', 'check_in_date', 'created_at'
        ]
        read_only_fields = ['created_at', 'purchase_date', 'check_in_date']


# Serializer cho Payment
class PaymentSerializer(serializers.ModelSerializer):
    user = serializers.PrimaryKeyRelatedField(queryset=User.objects.all())
    tickets = serializers.PrimaryKeyRelatedField(queryset=Ticket.objects.all(), many=True)

    class Meta:
        model = Payment
        fields = [
            'id', 'user', 'tickets', 'amount', 'payment_method', 'status',
            'paid_at', 'transaction_id'
        ]
        read_only_fields = ['created_at', 'paid_at']


# Serializer cho Review
class ReviewSerializer(serializers.ModelSerializer):
    event = serializers.PrimaryKeyRelatedField(queryset=Event.objects.all())
    user = serializers.PrimaryKeyRelatedField(queryset=User.objects.all())

    class Meta:
        model = Review
        fields = [
            'id', 'event', 'user', 'rating', 'comment', 'is_approved', 'created_at'
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
    purchased_tickets = TicketSerializer(many=True, read_only=True, source='purchased_tickets')
    payments = PaymentSerializer(many=True, read_only=True)
    event_reviews = ReviewSerializer(many=True, read_only=True, source='event_reviews')
    user_notifications = NotificationSerializer(many=True, read_only=True, source='user_notifications')
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
            'organized_events', 'purchased_tickets', 'payments', 'event_reviews',
            'user_notifications', 'sent_messages'
        ]
        read_only_fields = ['created_at', 'updated_at', 'is_staff', 'is_superuser']


# Serializer chi tiết cho Event
class EventDetailSerializer(serializers.ModelSerializer):
    organizer = UserSerializer(read_only=True)
    sold_tickets = TicketSerializer(many=True, read_only=True)
    reviews = ReviewSerializer(many=True, read_only=True)
    event_notifications = NotificationSerializer(many=True, read_only=True, source='event_notifications')
    chat_messages = ChatMessageSerializer(many=True, read_only=True)
    tags = TagSerializer(many=True, read_only=True)

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data['poster'] = instance.poster.url if instance.poster else ''
        return data

    class Meta:
        model = Event
        fields = [
            'id', 'organizer', 'title', 'description', 'category', 'start_time',
            'end_time', 'is_active', 'location', 'latitude', 'longitude',
            'total_tickets', 'ticket_price', 'tags', 'poster', 'created_at', 'updated_at',
            'sold_tickets', 'reviews', 'event_notifications', 'chat_messages'
        ]
        read_only_fields = ['created_at', 'updated_at']