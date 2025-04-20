from django.db.models.signals import post_save, pre_save, post_delete
from django.dispatch import receiver
from django.db import transaction
from django.utils import timezone
from .models import Payment, User, Event, Ticket


# Signal để cập nhật total_spent của User khi Payment được lưu
@receiver(post_save, sender=Payment)
def update_user_total_spent(sender, instance, **kwargs):
    if instance.status:
        with transaction.atomic():
            user = instance.user
            user.total_spent += instance.amount
            user.save()


# Signal để cập nhật is_active của Event trước khi lưu
@receiver(pre_save, sender=Event)
def update_event_status(sender, instance, **kwargs):
    if instance.end_time < timezone.now():
        instance.is_active = False


# Signal để cập nhật sold_tickets của Event khi Ticket được tạo
@receiver(post_save, sender=Ticket)
def update_sold_tickets_on_save(sender, instance, created, **kwargs):
    if created:  # Chỉ tăng khi tạo mới Ticket
        with transaction.atomic():
            event = instance.event
            event.sold_tickets = event.tickets.count()  # type: ignore
            event.save()


# Signal để cập nhật sold_tickets của Event khi Ticket bị xóa
@receiver(post_delete, sender=Ticket)
def update_sold_tickets_on_delete(sender, instance, **kwargs):
    with transaction.atomic():
        event = instance.event
        event.sold_tickets = event.tickets.count()  # type: ignore
        event.save()