from rest_framework import serializers
from .models import (
    User, Event, Ticket, Payment, Review, DiscountCode, Notification, ChatMessage
)

# Serializer cho User
class UserSerializer(serializers.ModelSerializer):
    def to_representation(self, instance):
        data = super().to_representation(instance)
        data['avatar'] = instance.avatar.url if instance.avatar else ''  # Lấy URL từ Cloudinary hoặc trả về ''
        return data

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'role', 'phone', 'avatar', 'is_active', 'created_at', 'updated_at', 'preferences']
        extra_kwargs = {
            'password': {'write_only': True}  # Đảm bảo password không hiển thị trong response
        }
        read_only_fields = ['created_at', 'updated_at']

    def create(self, validated_data):
        user = User(**validated_data)
        user.set_password(validated_data['password'])  # Mã hóa mật khẩu
        user.save()
        return user

# Serializer cho Event
class EventSerializer(serializers.ModelSerializer):
    def to_representation(self, instance):
        data = super().to_representation(instance)
        data['image'] = instance.image.url if instance.image else ''
        data['location_image'] = instance.location_image.url if instance.location_image else ''
        return data

    organizer = serializers.PrimaryKeyRelatedField(queryset=User.objects.all())

    class Meta:
        model = Event
        fields = [
            'id', 'title', 'description', 'category', 'start_datetime', 'end_datetime',
            'location_name', 'location_lat', 'location_lng', 'location_address',
            'organizer', 'ticket_price', 'total_tickets', 'available_tickets',
            'status', 'image', 'location_image', 'is_public', 'created_at', 'updated_at', 'tags'
        ]
        read_only_fields = ['created_at', 'updated_at']

# Serializer cho Ticket
class TicketSerializer(serializers.ModelSerializer):
    event = serializers.PrimaryKeyRelatedField(queryset=Event.objects.all())
    user = serializers.PrimaryKeyRelatedField(queryset=User.objects.all())

    class Meta:
        model = Ticket
        fields = ['id', 'event', 'user', 'price', 'qr_code', 'status', 'purchase_date', 'check_in_date']
        read_only_fields = ['purchase_date']

# Serializer cho Payment
class PaymentSerializer(serializers.ModelSerializer):
    ticket = serializers.PrimaryKeyRelatedField(queryset=Ticket.objects.all())
    user = serializers.PrimaryKeyRelatedField(queryset=User.objects.all())

    class Meta:
        model = Payment
        fields = ['id', 'ticket', 'user', 'payment_method', 'amount', 'status', 'stripe_transaction_id', 'payment_date']
        read_only_fields = ['payment_date']

# Serializer cho Review
class ReviewSerializer(serializers.ModelSerializer):
    event = serializers.PrimaryKeyRelatedField(queryset=Event.objects.all())
    user = serializers.PrimaryKeyRelatedField(queryset=User.objects.all())

    class Meta:
        model = Review
        fields = ['id', 'event', 'user', 'rating', 'comment', 'created_at']
        read_only_fields = ['created_at']

# Serializer cho DiscountCode
class DiscountCodeSerializer(serializers.ModelSerializer):
    event = serializers.PrimaryKeyRelatedField(queryset=Event.objects.all(), allow_null=True)

    class Meta:
        model = DiscountCode
        fields = ['id', 'code', 'discount_percent', 'event', 'valid_until', 'max_uses', 'used_count', 'is_active']

# Serializer cho Notification
class NotificationSerializer(serializers.ModelSerializer):
    user = serializers.PrimaryKeyRelatedField(queryset=User.objects.all())
    event = serializers.PrimaryKeyRelatedField(queryset=Event.objects.all(), allow_null=True)

    class Meta:
        model = Notification
        fields = ['id', 'user', 'event', 'title', 'message', 'type', 'is_read', 'created_at']
        read_only_fields = ['created_at']

# Serializer cho ChatMessage
class ChatMessageSerializer(serializers.ModelSerializer):
    event = serializers.PrimaryKeyRelatedField(queryset=Event.objects.all())
    sender = serializers.PrimaryKeyRelatedField(queryset=User.objects.all())

    class Meta:
        model = ChatMessage
        fields = ['id', 'event', 'sender', 'message', 'created_at']
        read_only_fields = ['created_at']

# Serializer chi tiết cho User
class UserDetailSerializer(serializers.ModelSerializer):
    organized_events = EventSerializer(many=True, read_only=True, source='organized_events')
    tickets = TicketSerializer(many=True, read_only=True)
    payments = PaymentSerializer(many=True, read_only=True)
    reviews = ReviewSerializer(many=True, read_only=True)
    notifications = NotificationSerializer(many=True, read_only=True)
    chat_messages = ChatMessageSerializer(many=True, read_only=True)

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data['avatar'] = instance.avatar.url if instance.avatar else ''
        return data

    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'role', 'phone', 'avatar', 'is_active',
            'created_at', 'updated_at', 'preferences', 'organized_events',
            'tickets', 'payments', 'reviews', 'notifications', 'chat_messages'
        ]
        read_only_fields = ['created_at', 'updated_at']

# Serializer chi tiết cho Event
class EventDetailSerializer(serializers.ModelSerializer):
    organizer = UserSerializer(read_only=True)
    tickets = TicketSerializer(many=True, read_only=True)
    reviews = ReviewSerializer(many=True, read_only=True)
    discount_codes = DiscountCodeSerializer(many=True, read_only=True)
    notifications = NotificationSerializer(many=True, read_only=True)
    chat_messages = ChatMessageSerializer(many=True, read_only=True)

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data['image'] = instance.image.url if instance.image else ''
        data['location_image'] = instance.location_image.url if instance.location_image else ''
        return data

    class Meta:
        model = Event
        fields = [
            'id', 'title', 'description', 'category', 'start_datetime', 'end_datetime',
            'location_name', 'location_lat', 'location_lng', 'location_address',
            'organizer', 'ticket_price', 'total_tickets', 'available_tickets',
            'status', 'image', 'location_image', 'is_public', 'created_at', 'updated_at',
            'tags', 'tickets', 'reviews', 'discount_codes', 'notifications', 'chat_messages'
        ]
        read_only_fields = ['created_at', 'updated_at']