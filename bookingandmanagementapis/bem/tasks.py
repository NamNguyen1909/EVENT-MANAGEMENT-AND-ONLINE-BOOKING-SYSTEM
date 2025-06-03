from datetime import timezone
from django.http import JsonResponse
from django.utils.timezone import now, timedelta


def auto_create_notifications_for_upcoming_events(request):
    """
    Luôn tạo notification mới cho các sự kiện sắp diễn ra (7 ngày và 1 ngày tới).
    Nếu event đổi ngày, đến mốc mới sẽ lại tạo notification mới.
    """
    # today = timezone.now().date()
    # upcoming_events = Event.objects.filter(
    #     start_time__date__in=[today + timedelta(days=7), today + timedelta(days=1)]
    # )

    # count = 0
    # for event in upcoming_events:
    #     message = f"Sự kiện '{event.title}' sẽ diễn ra vào {event.start_time.date()}!"
    #     notification = Notification.objects.create(
    #         event=event,
    #         notification_type='reminder',
    #         title="Sự kiện sắp diễn ra",
    #         message=message,
    #     )

    #     # Lấy tất cả user có vé đã thanh toán cho event này
    #     ticket_owners = Ticket.objects.filter(event=event, is_paid=True).values_list('user', flat=True).distinct()
    #     for user_id in ticket_owners:
    #         UserNotification.objects.create(user_id=user_id, notification=notification)
    #         user = User.objects.get(id=user_id)
    #         send_mail(
    #             subject="Sự kiện sắp diễn ra",
    #             message=f"Kính gửi {user.username},\n\n{message}\n\nTrân trọng!",
    #             from_email=settings.EMAIL_HOST_USER,
    #             recipient_list=[user.email],
    #             fail_silently=False,
    #         )
    #     count += 1

    today = timezone.now().date()
    target_dates = [today + timedelta(days=7), today + timedelta(days=1)]
    print("Today:", today)
    print("Target dates:", target_dates)
    events = Event.objects.all()
    for e in events:
        print("Event:", e.title, e.start_time, e.start_time.date())
    upcoming_events = Event.objects.filter(
        start_time__date__in=target_dates
    )
    print("Upcoming events:", list(upcoming_events))

    # return JsonResponse({"message": f"Đã tạo notification cho {count} sự kiện."})
    return JsonResponse({"message": "Đã kiểm tra sự kiện sắp diễn ra."})

if __name__ == "__main__":
    import os
    import django
    import sys

    # Thêm BASE_DIR vào sys.path để Python tìm thấy project
    sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')))

    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "bookingandmanagementapis.settings")
    django.setup()

    # Import models SAU khi đã setup Django
    from models import Event, Notification, Ticket, User, UserNotification
    from django.conf import settings
    from django.core.mail import send_mail

    # Đặt lại code của hàm ở đây hoặc truyền các model vào hàm nếu cần
    # Hoặc copy code xử lý vào đây để test

    auto_create_notifications_for_upcoming_events(None)