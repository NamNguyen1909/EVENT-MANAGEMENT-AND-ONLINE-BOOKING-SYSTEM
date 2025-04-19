from django.db.models.signals import post_save, pre_save
from django.dispatch import receiver
from django.db import transaction
from django.utils import timezone
from .models import Payment, User, Event


# Signal để cập nhật total_spent
@receiver(post_save, sender=Payment)
def update_user_total_spent(sender, instance, **kwargs):
    if instance.status:
        with transaction.atomic():
            user = instance.user
            user.total_spent += instance.amount
            user.save()


# Signal để cập nhật is_active
@receiver(pre_save, sender=Event)
def update_event_status(sender, instance, **kwargs):
    if instance.end_time < timezone.now():
        instance.is_active = False