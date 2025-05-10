import os
import json
import django
from datetime import datetime
from django.utils import timezone
from django.db.models import Prefetch

# Thiết lập môi trường Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'bookingandmanagementapis.settings')
django.setup()

# Import các model từ app bem
from bem.models import User, Event, Tag, Ticket, Payment, Review, DiscountCode, Notification, ChatMessage, EventTrendingLog, UserNotification

def export_dummy_data(output_file='dummy_data.json'):
    """
    Xuất dữ liệu từ cơ sở dữ liệu MySQL sang file dummy_data.json
    """
    data = {
        'users': [],
        'tags': [],
        'events': [],
        'discount_codes': [],
        'tickets': [],
        'payments': [],
        'reviews': [],
        'notifications': [],
        'chat_messages': [],
        'event_trending_logs': []
    }

    # 1. Xuất dữ liệu User
    print("Đang xuất dữ liệu User...")
    users = User.objects.all()
    for user in users:
        user_data = {
            'username': user.username,
            'email': user.email,
            'password': 'password123',  # Mật khẩu không xuất được vì đã băm, sử dụng giá trị mặc định
            'role': user.role,
            'phone': user.phone,
            'is_active': user.is_active,
            'is_staff': user.is_staff,
            'is_superuser': user.is_superuser
        }
        data['users'].append(user_data)
        print(f"Đã xuất user: {user.username}")

    # 2. Xuất dữ liệu Tag
    print("\nĐang xuất dữ liệu Tag...")
    tags = Tag.objects.all()
    for tag in tags:
        tag_data = {
            'name': tag.name
        }
        data['tags'].append(tag_data)
        print(f"Đã xuất tag: {tag.name}")

    # 3. Xuất dữ liệu Event
    print("\nĐang xuất dữ liệu Event...")
    events = Event.objects.prefetch_related('tags').select_related('organizer')
    for event in events:
        event_data = {
            'title': event.title,
            'description': event.description,
            'category': event.category,
            'start_time': event.start_time.strftime('%Y-%m-%dT%H:%M:%S'),
            'end_time': event.end_time.strftime('%Y-%m-%dT%H:%M:%S'),
            'location': event.location,
            'latitude': float(event.latitude),
            'longitude': float(event.longitude),
            'organizer': event.organizer.username,
            'ticket_price': float(event.ticket_price),
            'total_tickets': event.total_tickets,
            'is_active': event.is_active,
            'tags': [tag.name for tag in event.tags.all()]
        }
        data['events'].append(event_data)
        print(f"Đã xuất event: {event.title}")

    # 4. Xuất dữ liệu DiscountCode
    print("\nĐang xuất dữ liệu DiscountCode...")
    discount_codes = DiscountCode.objects.all()
    for dc in discount_codes:
        dc_data = {
            'code': dc.code,
            'discount_percentage': float(dc.discount_percentage),
            'user_group': dc.user_group,
            'is_active': dc.is_active,
            'valid_from': dc.valid_from.strftime('%Y-%m-%dT%H:%M:%S'),
            'valid_to': dc.valid_to.strftime('%Y-%m-%dT%H:%M:%S'),
            'max_uses': dc.max_uses,
            'used_count': dc.used_count
        }
        data['discount_codes'].append(dc_data)
        print(f"Đã xuất discount code: {dc.code}")

    # 5. Xuất dữ liệu Ticket
    print("\nĐang xuất dữ liệu Ticket...")
    tickets = Ticket.objects.select_related('event', 'user')
    for ticket in tickets:
        ticket_data = {
            'event': ticket.event.title,
            'user': ticket.user.username,
            'is_paid': ticket.is_paid,
            'is_checked_in': ticket.is_checked_in
        }
        data['tickets'].append(ticket_data)
        print(f"Đã xuất ticket cho user {ticket.user.username} tại event {ticket.event.title}")

    # 6. Xuất dữ liệu Payment
    print("\nĐang xuất dữ liệu Payment...")
    payments = Payment.objects.prefetch_related('tickets').select_related('user', 'discount_code')
    for payment in payments:
        ticket_pairs = []
        for ticket in payment.tickets.all():
            ticket_pairs.append([
                ticket.event.title,
                ticket.user.username
            ])
        payment_data = {
            'user': payment.user.username,
            'amount': float(payment.amount),
            'payment_method': payment.payment_method,
            'status': payment.status,
            'transaction_id': payment.transaction_id,
            'paid_at': payment.paid_at.strftime('%Y-%m-%dT%H:%M:%S') if payment.paid_at else None,
            'discount_code': payment.discount_code.code if payment.discount_code else None,
            'tickets': ticket_pairs
        }
        data['payments'].append(payment_data)
        print(f"Đã xuất payment với transaction_id {payment.transaction_id}")

    # 7. Xuất dữ liệu Review
    print("\nĐang xuất dữ liệu Review...")
    reviews = Review.objects.select_related('event', 'user')
    for review in reviews:
        review_data = {
            'event': review.event.title,
            'user': review.user.username,
            'rating': review.rating,
            'comment': review.comment
        }
        data['reviews'].append(review_data)
        print(f"Đã xuất review cho event {review.event.title} bởi user {review.user.username}")

    # 8. Xuất dữ liệu Notification
    print("\nĐang xuất dữ liệu Notification...")
    notifications = Notification.objects.select_related('event')
    for notification in notifications:
        notification_data = {
            'event': notification.event.title if notification.event else None,
            'title': notification.title,
            'message': notification.message,
            'notification_type': notification.notification_type,
            'is_read': False  # Giả định is_read=False vì thuộc UserNotification
        }
        data['notifications'].append(notification_data)
        print(f"Đã xuất notification: {notification.title}")

    # 9. Xuất dữ liệu ChatMessage
    print("\nĐang xuất dữ liệu ChatMessage...")
    chat_messages = ChatMessage.objects.select_related('event', 'sender', 'receiver')
    for chat in chat_messages:
        chat_data = {
            'event': chat.event.title,
            'sender': chat.sender.username,
            'receiver': chat.receiver.username,
            'message': chat.message,
            'is_from_organizer': chat.is_from_organizer
        }
        data['chat_messages'].append(chat_data)
        print(f"Đã xuất chat message trong event {chat.event.title} bởi {chat.sender.username}")

    # 10. Xuất dữ liệu EventTrendingLog
    print("\nĐang xuất dữ liệu EventTrendingLog...")
    trending_logs = EventTrendingLog.objects.select_related('event')
    for log in trending_logs:
        log_data = {
            'event': log.event.title,
            'view_count': log.view_count
        }
        data['event_trending_logs'].append(log_data)
        print(f"Đã xuất trending log cho event {log.event.title}")

    # Lưu dữ liệu vào file JSON
    print(f"\nĐang lưu dữ liệu vào {output_file}...")
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=4, ensure_ascii=False)
    print(f"Đã xuất dữ liệu thành công vào {output_file}")

if __name__ == '__main__':
    export_dummy_data()