import os
import json
import django
from datetime import datetime
from django.utils.timezone import make_aware

# Thiết lập môi trường Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'bookingandmanagementapis.settings')
django.setup()

# Import các model từ app bem
from bem.models import User, Event, Tag, Ticket, Payment, Review, DiscountCode, Notification, ChatMessage, EventTrendingLog

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
            total_spent=user_data['total_spent'],
            is_active=user_data['is_active'],
            is_staff=user_data['is_staff'],
            is_superuser=user_data['is_superuser']
        )
        user.set_password(user_data['password'])
        user.save()
        print(f"Đã tạo user: {user.username}")

    # 2. Nhập dữ liệu cho Tag
    print("\nĐang nhập dữ liệu cho Tag...")
    for tag_data in data.get('tags', []):
        if Tag.objects.filter(name=tag_data['name']).exists():
            print(f"Tag {tag_data['name']} đã tồn tại, bỏ qua...")
            continue
        tag = Tag(name=tag_data['name'])
        tag.save()
        print(f"Đã tạo tag: {tag.name}")

    # 3. Nhập dữ liệu cho Event
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
        start_time = make_aware(datetime.strptime(event_data['start_time'], '%Y-%m-%dT%H:%M:%S'))
        end_time = make_aware(datetime.strptime(event_data['end_time'], '%Y-%m-%dT%H:%M:%S'))
        event = Event(
            title=event_data['title'],
            description=event_data['description'],
            category=event_data['category'],
            start_time=start_time,
            end_time=end_time,
            location=event_data['location'],
            latitude=event_data['latitude'],
            longitude=event_data['longitude'],
            organizer=organizer,
            ticket_price=event_data['ticket_price'],
            total_tickets=event_data['total_tickets'],
            is_active=event_data['is_active']
        )
        event.save()
        # Thêm tags vào event
        for tag_name in event_data['tags']:
            try:
                tag = Tag.objects.get(name=tag_name)
                event.tags.add(tag)
            except Tag.DoesNotExist:
                print(f"Tag {tag_name} không tồn tại, bỏ qua tag này cho event {event.title}...")
        event.save()
        print(f"Đã tạo event: {event.title}")

    # 4. Nhập dữ liệu cho Ticket
    print("\nĐang nhập dữ liệu cho Ticket...")
    for ticket_data in data.get('tickets', []):
        try:
            event = Event.objects.get(title=ticket_data['event'])
            user = User.objects.get(username=ticket_data['user'])
        except (Event.DoesNotExist, User.DoesNotExist) as e:
            print(f"Event {ticket_data['event']} hoặc User {ticket_data['user']} không tồn tại, bỏ qua ticket...")
            continue
        # Không cần thiết lập created_at vì nó tự động
        purchase_date = make_aware(datetime.strptime(ticket_data['purchase_date'], '%Y-%m-%dT%H:%M:%S')) if ticket_data.get('purchase_date') else None
        check_in_date = make_aware(datetime.strptime(ticket_data['check_in_date'], '%Y-%m-%dT%H:%M:%S')) if ticket_data.get('check_in_date') else None
        ticket = Ticket(
            event=event,
            user=user,
            qr_code=ticket_data['qr_code'],
            is_paid=ticket_data['is_paid'],
            is_checked_in=ticket_data['is_checked_in'],
            purchase_date=purchase_date,
            check_in_date=check_in_date
        )
        ticket.save()
        print(f"Đã tạo ticket cho user {user.username} tại event {event.title}")

    # 5. Nhập dữ liệu cho Payment
    print("\nĐang nhập dữ liệu cho Payment...")
    for payment_data in data.get('payments', []):
        try:
            user = User.objects.get(username=payment_data['user'])
        except User.DoesNotExist:
            print(f"User {payment_data['user']} không tồn tại, bỏ qua payment...")
            continue
        paid_at = make_aware(datetime.strptime(payment_data['paid_at'], '%Y-%m-%dT%H:%M:%S')) if payment_data.get('paid_at') else None
        payment = Payment(
            user=user,
            amount=payment_data['amount'],
            payment_method=payment_data['payment_method'],
            status=payment_data['status'],
            transaction_id=payment_data['transaction_id'],
            paid_at=paid_at
        )
        payment.save()
        # Thêm tickets vào payment
        for qr_code in payment_data['tickets']:
            try:
                ticket = Ticket.objects.get(qr_code=qr_code)
                payment.tickets.add(ticket)
            except Ticket.DoesNotExist:
                print(f"Ticket {qr_code} không tồn tại, bỏ qua ticket này cho payment...")
        payment.save()
        print(f"Đã tạo payment cho user {user.username}")

    # 6. Nhập dữ liệu cho Review
    print("\nĐang nhập dữ liệu cho Review...")
    for review_data in data.get('reviews', []):
        try:
            event = Event.objects.get(title=review_data['event'])
            user = User.objects.get(username=review_data['user'])
        except (Event.DoesNotExist, User.DoesNotExist) as e:
            print(f"Event {review_data['event']} hoặc User {review_data['user']} không tồn tại, bỏ qua review...")
            continue
        created_at = make_aware(datetime.strptime(review_data['created_at'], '%Y-%m-%dT%H:%M:%S'))
        review = Review(
            event=event,
            user=user,
            rating=review_data['rating'],
            comment=review_data['comment'],
            is_approved=review_data['is_approved'],
            created_at=created_at
        )
        review.save()
        print(f"Đã tạo review cho event {event.title} bởi user {user.username}")

    # 7. Nhập dữ liệu cho DiscountCode
    print("\nĐang nhập dữ liệu cho DiscountCode...")
    for discount_data in data.get('discount_codes', []):
        if DiscountCode.objects.filter(code=discount_data['code']).exists():
            print(f"DiscountCode {discount_data['code']} đã tồn tại, bỏ qua...")
            continue
        valid_from = make_aware(datetime.strptime(discount_data['valid_from'], '%Y-%m-%dT%H:%M:%S'))
        valid_to = make_aware(datetime.strptime(discount_data['valid_to'], '%Y-%m-%dT%H:%M:%S'))
        discount = DiscountCode(
            code=discount_data['code'],
            discount_percentage=discount_data['discount_percentage'],
            user_group=discount_data['user_group'],
            is_active=discount_data['is_active'],
            valid_from=valid_from,
            valid_to=valid_to,
            max_uses=discount_data['max_uses'],
            used_count=discount_data['used_count']
        )
        discount.save()
        print(f"Đã tạo discount code: {discount.code}")

    # 8. Nhập dữ liệu cho Notification
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
            notification_type=notif_data['notification_type'],
            is_read=notif_data['is_read'],
            created_at=created_at
        )
        notification.save()
        print(f"Đã tạo notification cho user {user.username}")

    # 9. Nhập dữ liệu cho ChatMessage
    print("\nĐang nhập dữ liệu cho ChatMessage...")
    for chat_data in data.get('chat_messages', []):
        try:
            event = Event.objects.get(title=chat_data['event'])
            sender = User.objects.get(username=chat_data['sender'])
            receiver = User.objects.get(username=chat_data['receiver'])
        except (Event.DoesNotExist, User.DoesNotExist) as e:
            print(f"Event {chat_data['event']}, Sender {chat_data['sender']} hoặc Receiver {chat_data['receiver']} không tồn tại, bỏ qua chat message...")
            continue
        created_at = make_aware(datetime.strptime(chat_data['created_at'], '%Y-%m-%dT%H:%M:%S'))
        chat_message = ChatMessage(
            event=event,
            sender=sender,
            receiver=receiver,
            message=chat_data['message'],
            is_from_organizer=chat_data['is_from_organizer'],
            created_at=created_at
        )
        chat_message.save()
        print(f"Đã tạo chat message trong event {event.title} bởi {sender.username}")

    # 10. Nhập dữ liệu cho EventTrendingLog
    print("\nĐang nhập dữ liệu cho EventTrendingLog...")
    for trending_data in data.get('event_trending_logs', []):
        try:
            event = Event.objects.get(title=trending_data['event'])
        except Event.DoesNotExist:
            print(f"Event {trending_data['event']} không tồn tại, bỏ qua event trending log...")
            continue
        last_updated = make_aware(datetime.strptime(trending_data['last_updated'], '%Y-%m-%dT%H:%M:%S'))
        trending_log = EventTrendingLog(
            event=event,
            view_count=trending_data['view_count'],
            ticket_sold_count=trending_data['ticket_sold_count'],
            last_updated=last_updated
        )
        trending_log.save()
        print(f"Đã tạo event trending log cho event {event.title}")

if __name__ == '__main__':
    load_dummy_data()