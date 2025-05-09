import os
import json
import django
from datetime import datetime
import django.utils.timezone as timezone
from django.db import transaction
from django.core.exceptions import ValidationError
import uuid
import qrcode
import io
from cloudinary.uploader import upload
from decimal import Decimal

# Thiết lập môi trường Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'bookingandmanagementapis.settings')
django.setup()

# Import các model từ app bem
from bem.models import User, Event, Tag, Ticket, Payment, Review, DiscountCode, Notification, ChatMessage, EventTrendingLog, UserNotification

def parse_datetime(dt_str):
    """Parse ISO datetime string with optional milliseconds."""
    try:
        return timezone.make_aware(datetime.fromisoformat(dt_str.replace('Z', '+00:00')))
    except ValueError as e:
        print(f"Error parsing datetime {dt_str}: {e}")
        return None

def generate_qr_code(ticket_uuid):
    """Generate QR code and upload to Cloudinary."""
    qr = qrcode.QRCode(version=1, box_size=10, border=5)
    qr.add_data(str(ticket_uuid))
    qr.make(fit=True)
    img = qr.make_image(fill='black', back_color='white')
    buffer = io.BytesIO()
    img.save(buffer, format="PNG")
    try:
        upload_result = upload(buffer.getvalue(), resource_type="image", folder="qr_codes")
        return upload_result['secure_url']
    except Exception as e:
        print(f"Error uploading QR code to Cloudinary: {e}")
        return None

def load_dummy_data():
    print("Bắt đầu nhập dữ liệu...")
    try:
        # Đọc file JSON
        with open('dummy_data.json', 'r', encoding='utf-8') as f:
            data = json.load(f)
    except FileNotFoundError:
        print("Không tìm thấy file dummy_data.json")
        return
    except json.JSONDecodeError as e:
        print(f"Error decoding JSON: {e}")
        return

    with transaction.atomic():
        # 1. Nhập dữ liệu cho Tag
        print("\nĐang nhập dữ liệu cho Tag...")
        tags_map = {}
        for tag_data in data.get('tags', []):
            tag, created = Tag.objects.get_or_create(name=tag_data['name'])
            tags_map[tag.name] = tag
            print(f"{'Đã tạo' if created else 'Đã tồn tại'} tag: {tag.name}")

        # 2. Nhập dữ liệu cho User
        print("\nĐang nhập dữ liệu cho User...")
        users_map = {}
        for user_data in data.get('users', []):
            if User.objects.filter(username=user_data['username']).exists():
                print(f"User {user_data['username']} đã tồn tại, bỏ qua...")
                continue
            user = User(
                username=user_data['username'],
                email=user_data['email'],
                role=user_data['role'],
                phone=user_data.get('phone', None),
                total_spent=Decimal(str(user_data.get('total_spent', 0))),
                is_active=user_data.get('is_active', True),
                is_staff=user_data.get('is_staff', False),
                is_superuser=user_data.get('is_superuser', False),
                created_at=timezone.now()  # JSON lacks created_at
            )
            user.set_password(user_data['password'])
            user.save()
            # Add tags
            user.tags.set([tags_map[tag] for tag in user_data.get('tags', []) if tag in tags_map])
            users_map[user.username] = user
            print(f"Đã tạo user: {user.username}")

        # 3. Nhập dữ liệu cho Event
        print("\nĐang nhập dữ liệu cho Event...")
        events_map = {}
        for event_data in data.get('events', []):
            if Event.objects.filter(title=event_data['title']).exists():
                print(f"Event {event_data['title']} đã tồn tại, bỏ qua...")
                continue
            organizer_username = event_data['organizer']
            if organizer_username not in users_map:
                print(f"Organizer {organizer_username} không tồn tại, bỏ qua event {event_data['title']}...")
                continue
            organizer = users_map[organizer_username]
            if organizer.role != 'organizer':
                print(f"User {organizer_username} không phải organizer, bỏ qua event {event_data['title']}...")
                continue
            start_time = parse_datetime(event_data['start_time'])
            end_time = parse_datetime(event_data['end_time'])
            if not (start_time and end_time):
                print(f"Invalid datetime for event {event_data['title']}, bỏ qua...")
                continue
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
                ticket_price=Decimal(str(event_data['ticket_price'])),
                total_tickets=event_data['total_tickets'],
                sold_tickets=0,  # Will be updated by tickets
                is_active=event_data.get('is_active', True)
            )
            try:
                event.full_clean()
                event.save()
                # Add tags
                event.tags.set([tags_map[tag] for tag in event_data.get('tags', []) if tag in tags_map])
                events_map[event.title] = event
                print(f"Đã tạo event: {event.title}")
            except ValidationError as e:
                print(f"Validation error for event {event.title}: {e}, bỏ qua...")

        # 4. Nhập dữ liệu cho DiscountCode
        print("\nĐang nhập dữ liệu cho DiscountCode...")
        discount_codes_map = {}
        for discount_data in data.get('discount_codes', []):
            if DiscountCode.objects.filter(code=discount_data['code']).exists():
                print(f"DiscountCode {discount_data['code']} đã tồn tại, bỏ qua...")
                continue
            valid_from = parse_datetime(discount_data['valid_from'])
            valid_to = parse_datetime(discount_data['valid_to'])
            if not (valid_from and valid_to):
                print(f"Invalid datetime for discount code {discount_data['code']}, bỏ qua...")
                continue
            discount = DiscountCode(
                code=discount_data['code'],
                discount_percentage=Decimal(str(discount_data['discount_percentage'])),
                user_group=discount_data['user_group'],
                is_active=discount_data.get('is_active', True),
                valid_from=valid_from,
                valid_to=valid_to,
                max_uses=discount_data.get('max_uses', None),
                used_count=discount_data.get('used_count', 0)
            )
            try:
                discount.full_clean()
                discount.save()
                discount_codes_map[discount.code] = discount
                print(f"Đã tạo discount code: {discount.code}")
            except ValidationError as e:
                print(f"Validation error for discount code {discount.code}: {e}, bỏ qua...")

        # 5. Nhập dữ liệu cho Ticket
        print("\nĐang nhập dữ liệu cho Ticket...")
        tickets_map = {}
        for ticket_data in data.get('tickets', []):
            event_title = ticket_data['event']
            user_username = ticket_data['user']
            if event_title not in events_map or user_username not in users_map:
                print(f"Event {event_title} hoặc User {user_username} không tồn tại, bỏ qua ticket...")
                continue
            event = events_map[event_title]
            user = users_map[user_username]
            if Ticket.objects.filter(event=event, user=user, is_paid=ticket_data['is_paid']).exists():
                print(f"Ticket cho user {user_username} tại event {event_title} đã tồn tại, bỏ qua...")
                continue
            # Generate QR code using ticket UUID
            ticket_uuid = uuid.uuid4()
            qr_code_url = generate_qr_code(ticket_uuid)
            if not qr_code_url:
                print(f"Failed to generate QR code for ticket, bỏ qua...")
                continue
            purchase_date = parse_datetime(ticket_data['purchase_date']) if ticket_data.get('purchase_date') else None
            check_in_date = parse_datetime(ticket_data['check_in_date']) if ticket_data.get('check_in_date') else None
            ticket = Ticket(
                event=event,
                user=user,
                uuid=ticket_uuid,
                qr_code=qr_code_url,
                is_paid=ticket_data.get('is_paid', False),
                purchase_date=purchase_date,
                is_checked_in=ticket_data.get('is_checked_in', False),
                check_in_date=check_in_date
            )
            try:
                ticket.full_clean()
                ticket.save()
                if ticket.is_paid:
                    event.sold_tickets += 1
                    event.save(update_fields=['sold_tickets'])
                tickets_map[f"{event_title}_{user_username}"] = ticket
                print(f"Đã tạo ticket cho user {user.username} tại event {event.title}")
            except ValidationError as e:
                print(f"Validation error for ticket {event.title} - {user.username}: {e}, bỏ qua...")

        # 6. Nhập dữ liệu cho Payment
        print("\nĐang nhập dữ liệu cho Payment...")
        for payment_data in data.get('payments', []):
            user_username = payment_data['user']
            if user_username not in users_map:
                print(f"User {user_username} không tồn tại, bỏ qua payment...")
                continue
            user = users_map[user_username]
            discount_code = None
            if payment_data.get('discount_code'):
                if payment_data['discount_code'] in discount_codes_map:
                    discount_code = discount_codes_map[payment_data['discount_code']]
                else:
                    print(f"DiscountCode {payment_data['discount_code']} không tồn tại, bỏ qua discount code...")
            transaction_id = payment_data['transaction_id'].replace('v <<-', '')  # Fix invalid ID
            if Payment.objects.filter(transaction_id=transaction_id).exists():
                print(f"Payment với transaction_id {transaction_id} đã tồn tại, bỏ qua...")
                continue
            tickets = []
            for ticket_pair in payment_data.get('tickets', []):
                event_title, user_username = ticket_pair
                key = f"{event_title}_{user_username}"
                if key in tickets_map:
                    tickets.append(tickets_map[key])
                else:
                    print(f"Không tìm thấy ticket cho {key}, bỏ qua...")
            if not tickets:
                print(f"Không có vé hợp lệ cho payment của user {user.username}, bỏ qua payment...")
                continue
            total_amount = sum(ticket.event.ticket_price for ticket in tickets)
            final_amount = total_amount
            if discount_code and discount_code.is_valid():
                if discount_code.user_group == user.get_customer_group():
                    discount = total_amount * (discount_code.discount_percentage / 100)
                    final_amount -= discount
                    discount_code.used_count += 1
                    discount_code.save(update_fields=['used_count'])
                else:
                    print(f"User {user.username} không thuộc nhóm {discount_code.user_group}, bỏ qua discount...")
                    discount_code = None
            payment_amount = Decimal(str(payment_data['amount']))
            if abs(final_amount - payment_amount) > Decimal('0.01'):
                print(f"Warning: Amount mismatch for user {user.username}: JSON={payment_amount}, Calculated={final_amount}, using JSON value")
            paid_at = parse_datetime(payment_data['paid_at']) if payment_data.get('paid_at') else None
            payment = Payment(
                user=user,
                amount=payment_amount,
                payment_method=payment_data['payment_method'],
                status=payment_data.get('status', False),
                transaction_id=transaction_id,
                paid_at=paid_at,
                discount_code=discount_code
            )
            try:
                payment.full_clean()
                payment.save()
                payment.tickets.set(tickets)
                if payment.status:
                    for ticket in tickets:
                        if not ticket.is_paid:
                            ticket.mark_as_paid(paid_at)
                            user.total_spent += ticket.event.ticket_price
                    user.save(update_fields=['total_spent'])
                print(f"Đã tạo payment cho user {user.username} với transaction_id {payment.transaction_id}")
            except ValidationError as e:
                print(f"Validation error for payment {transaction_id}: {e}, bỏ qua...")

        # 7. Nhập dữ liệu cho Review
        print("\nĐang nhập dữ liệu cho Review...")
        for review_data in data.get('reviews', []):
            event_title = review_data['event']
            user_username = review_data['user']
            if event_title not in events_map or user_username not in users_map:
                print(f"Event {event_title} hoặc User {user_username} không tồn tại, bỏ qua review...")
                continue
            event = events_map[event_title]
            user = users_map[user_username]
            if Review.objects.filter(event=event, user=user).exists():
                print(f"Review của user {user.username} cho event {event.title} đã tồn tại, bỏ qua...")
                continue
            review = Review(
                event=event,
                user=user,
                rating=review_data['rating'],
                comment=review_data.get('comment', None),
                parent_review=None
            )
            try:
                review.full_clean()
                review.save()
                print(f"Đã tạo review cho event {event.title} bởi user {user.username}")
            except ValidationError as e:
                print(f"Validation error for review {event.title} - {user.username}: {e}, bỏ qua...")

        # 8. Nhập dữ liệu cho Notification
        print("\nĐang nhập dữ liệu cho Notification...")
        notifications_map = {}
        for notif_data in data.get('notifications', []):
            event_title = notif_data.get('event')
            event = events_map.get(event_title) if event_title else None
            if event_title and not event:
                print(f"Event {event_title} không tồn tại, bỏ qua notification...")
                continue
            if Notification.objects.filter(title=notif_data['title'], message=notif_data['message']).exists():
                print(f"Notification {notif_data['title']} đã tồn tại, bỏ qua...")
                continue
            notification = Notification(
                event=event,
                title=notif_data['title'],
                message=notif_data['message'],
                notification_type=notif_data.get('notification_type', 'reminder')
            )
            try:
                notification.full_clean()
                notification.save()
                notifications_map[notif_data['id']] = notification
                # Create UserNotification for ticket owners
                if event:
                    ticket_owners = Ticket.objects.filter(event=event).values_list('user', flat=True).distinct()
                    for user_id in ticket_owners:
                        UserNotification.objects.get_or_create(
                            user_id=user_id,
                            notification=notification,
                            defaults={'is_read': False}
                        )
                print(f"Đã tạo notification: {notification.title}")
            except ValidationError as e:
                print(f"Validation error for notification {notif_data['title']}: {e}, bỏ qua...")

        # 9. Nhập dữ liệu cho ChatMessage
        print("\nĐang nhập dữ liệu cho ChatMessage...")
        for chat_data in data.get('chat_messages', []):
            event_title = chat_data['event']
            sender_username = chat_data['sender']
            receiver_username = chat_data['receiver']
            if event_title not in events_map or sender_username not in users_map or receiver_username not in users_map:
                print(f"Event {event_title}, Sender {sender_username} hoặc Receiver {receiver_username} không tồn tại, bỏ qua chat message...")
                continue
            event = events_map[event_title]
            sender = users_map[sender_username]
            receiver = users_map[receiver_username]
            is_from_organizer = chat_data.get('is_from_organizer', False)
            if is_from_organizer and sender.role != 'organizer':
                print(f"Sender {sender.username} không phải organizer, bỏ qua chat message...")
                continue
            chat_message = ChatMessage(
                event=event,
                sender=sender,
                receiver=receiver,
                message=chat_data['message'],
                is_from_organizer=is_from_organizer
            )
            try:
                chat_message.full_clean()
                chat_message.save()
                print(f"Đã tạo chat message trong event {event.title} bởi {sender.username}")
            except ValidationError as e:
                print(f"Validation error for chat message {event.title} - {sender.username}: {e}, bỏ qua...")

        # 10. Nhập dữ liệu cho EventTrendingLog
        print("\nĐang nhập dữ liệu cho EventTrendingLog...")
        for trending_data in data.get('event_trending_logs', []):
            event_title = trending_data['event']
            if event_title not in events_map:
                print(f"Event {event_title} không tồn tại, bỏ qua event trending log...")
                continue
            event = events_map[event_title]
            if EventTrendingLog.objects.filter(event=event).exists():
                print(f"EventTrendingLog cho event {event.title} đã tồn tại, bỏ qua...")
                continue
            trending_log = EventTrendingLog(
                event=event,
                view_count=trending_data.get('view_count', 0),
                total_revenue=Decimal(str(trending_data.get('total_revenue', 0))),
                trending_score=Decimal(str(trending_data.get('trending_score', 0))),
                interest_score=Decimal(str(trending_data.get('interest_score', 0)))
            )
            try:
                trending_log.full_clean()
                trending_log.save()
                print(f"Đã tạo event trending log cho event {event.title}")
            except ValidationError as e:
                print(f"Validation error for trending log {event.title}: {e}, bỏ qua...")

    print("\nHoàn tất nhập dữ liệu!")

if __name__ == '__main__':
    load_dummy_data()