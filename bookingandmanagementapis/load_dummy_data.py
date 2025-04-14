import os
import json
import django
from datetime import datetime
from django.utils.timezone import make_aware

# Thiết lập môi trường Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'bookingandmanagementapis.settings')
django.setup()

# Import các model từ app bem
from bem.models import User, Event, Ticket, Payment, Review, DiscountCode, Notification, ChatMessage

def load_dummy_data():
    # Đọc file JSON
    with open('dummy_data.json', 'r', encoding='utf-8') as f:
        data = json.load(f)

    # 1. Nhập dữ liệu cho User
    print("Đang nhập dữ liệu cho User...")
    for user_data in data.get('users', []):
        if User.objects.filter(username=user_data['username']).exists():
            print(f"User {user_data['username']} đã tồn tại, bỏ qua...")
            continue
        user = User(
            username=user_data['username'],
            email=user_data['email'],
            role=user_data['role'],
            phone=user_data['phone'],
            is_active=user_data['is_active'],
            is_staff=user_data['is_staff'],
            is_superuser=user_data['is_superuser']
        )
        user.set_password(user_data['password'])
        user.save()
        print(f"Đã tạo user: {user.username}")

    # 2. Nhập dữ liệu cho Event
    print("\nĐang nhập dữ liệu cho Event...")
    for event_data in data.get('events', []):
        if Event.objects.filter(title=event_data['title']).exists():
            print(f"Event {event_data['title']} đã tồn tại, bỏ qua...")
            continue
        try:
            organizer = User.objects.get(username=event_data['organizer'])
        except User.DoesNotExist:
            print(f"Organizer {event_data['organizer']} không tồn tại, bỏ qua event {event_data['title']}...")
            continue
        start_datetime = make_aware(datetime.strptime(event_data['start_datetime'], '%Y-%m-%dT%H:%M:%S'))
        end_datetime = make_aware(datetime.strptime(event_data['end_datetime'], '%Y-%m-%dT%H:%M:%S'))
        event = Event(
            title=event_data['title'],
            description=event_data['description'],
            category=event_data['category'],
            start_datetime=start_datetime,
            end_datetime=end_datetime,
            location_name=event_data['location_name'],
            location_lat=event_data['location_lat'],
            location_lng=event_data['location_lng'],
            location_address=event_data['location_address'],
            organizer=organizer,
            ticket_price=event_data['ticket_price'],
            total_tickets=event_data['total_tickets'],
            available_tickets=event_data['available_tickets'],
            status=event_data['status'],
            is_public=event_data['is_public'],
            tags=event_data['tags']
        )
        event.save()
        print(f"Đã tạo event: {event.title}")

    # 3. Nhập dữ liệu cho Ticket
    print("\nĐang nhập dữ liệu cho Ticket...")
    for ticket_data in data.get('tickets', []):
        try:
            event = Event.objects.get(title=ticket_data['event'])
            user = User.objects.get(username=ticket_data['user'])
        except (Event.DoesNotExist, User.DoesNotExist) as e:
            print(f"Event {ticket_data['event']} hoặc User {ticket_data['user']} không tồn tại, bỏ qua ticket...")
            continue
        purchase_date = make_aware(datetime.strptime(ticket_data['purchase_date'], '%Y-%m-%dT%H:%M:%S'))
        ticket = Ticket(
            event=event,
            user=user,
            price=ticket_data['price'],
            qr_code=ticket_data['qr_code'],
            status=ticket_data['status'],
            purchase_date=purchase_date
        )
        ticket.save()
        print(f"Đã tạo ticket cho user {user.username} tại event {event.title}")

    # 4. Nhập dữ liệu cho Payment
    print("\nĐang nhập dữ liệu cho Payment...")
    for payment_data in data.get('payments', []):
        try:
            ticket = Ticket.objects.get(qr_code=payment_data['ticket'])
            user = User.objects.get(username=payment_data['user'])
        except (Ticket.DoesNotExist, User.DoesNotExist) as e:
            print(f"Ticket {payment_data['ticket']} hoặc User {payment_data['user']} không tồn tại, bỏ qua payment...")
            continue
        payment_date = make_aware(datetime.strptime(payment_data['payment_date'], '%Y-%m-%dT%H:%M:%S'))
        payment = Payment(
            ticket=ticket,
            user=user,
            payment_method=payment_data['payment_method'],
            amount=payment_data['amount'],
            status=payment_data['status'],
            stripe_transaction_id=payment_data['stripe_transaction_id'],
            payment_date=payment_date
        )
        payment.save()
        print(f"Đã tạo payment cho ticket {ticket.qr_code}")

    # 5. Nhập dữ liệu cho Review
    print("\nĐang nhập dữ liệu cho Review...")
    for review_data in data.get('reviews', []):
        try:
            event = Event.objects.get(title=review_data['event'])
            user = User.objects.get(username=review_data['user'])
        except (Event.DoesNotExist, User.DoesNotExist) as e:
            print(f"Event {review_data['event']} hoặc User {review_data['user']} không tồn tại, bỏ qua review...")
            continue
        review = Review(
            event=event,
            user=user,
            rating=review_data['rating'],
            comment=review_data['comment']
        )
        review.save()
        print(f"Đã tạo review cho event {event.title} bởi user {user.username}")

    # 6. Nhập dữ liệu cho DiscountCode
    print("\nĐang nhập dữ liệu cho DiscountCode...")
    for discount_data in data.get('discount_codes', []):
        try:
            event = Event.objects.get(title=discount_data['event'])
        except Event.DoesNotExist:
            print(f"Event {discount_data['event']} không tồn tại, bỏ qua discount code...")
            continue
        valid_until = make_aware(datetime.strptime(discount_data['valid_until'], '%Y-%m-%dT%H:%M:%S'))
        discount = DiscountCode(
            code=discount_data['code'],
            discount_percent=discount_data['discount_percent'],
            event=event,
            valid_until=valid_until,
            max_uses=discount_data['max_uses'],
            used_count=discount_data['used_count'],
            is_active=discount_data['is_active']
        )
        discount.save()
        print(f"Đã tạo discount code {discount.code} cho event {event.title}")

    # 7. Nhập dữ liệu cho Notification
    print("\nĐang nhập dữ liệu cho Notification...")
    for notif_data in data.get('notifications', []):
        try:
            user = User.objects.get(username=notif_data['user'])
            event = Event.objects.get(title=notif_data['event'])
        except (User.DoesNotExist, Event.DoesNotExist) as e:
            print(f"User {notif_data['user']} hoặc Event {notif_data['event']} không tồn tại, bỏ qua notification...")
            continue
        created_at = make_aware(datetime.strptime(notif_data['created_at'], '%Y-%m-%dT%H:%M:%S'))
        notification = Notification(
            user=user,
            event=event,
            title=notif_data['title'],
            message=notif_data['message'],
            type=notif_data['type'],
            is_read=notif_data['is_read'],
            created_at=created_at
        )
        notification.save()
        print(f"Đã tạo notification cho user {user.username}")

    # 8. Nhập dữ liệu cho ChatMessage
    print("\nĐang nhập dữ liệu cho ChatMessage...")
    for chat_data in data.get('chat_messages', []):
        try:
            event = Event.objects.get(title=chat_data['event'])
            sender = User.objects.get(username=chat_data['sender'])
        except (Event.DoesNotExist, User.DoesNotExist) as e:
            print(f"Event {chat_data['event']} hoặc Sender {chat_data['sender']} không tồn tại, bỏ qua chat message...")
            continue
        created_at = make_aware(datetime.strptime(chat_data['created_at'], '%Y-%m-%dT%H:%M:%S'))
        chat_message = ChatMessage(
            event=event,
            sender=sender,
            message=chat_data['message'],
            created_at=created_at
        )
        chat_message.save()
        print(f"Đã tạo chat message trong event {event.title} bởi {sender.username}")

if __name__ == '__main__':
    load_dummy_data()