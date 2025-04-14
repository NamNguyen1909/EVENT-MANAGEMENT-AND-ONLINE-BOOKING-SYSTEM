from django.contrib import admin
from django.db.models import Count
from django.template.response import TemplateResponse
from django.utils.safestring import mark_safe
from django import forms
from ckeditor_uploader.widgets import CKEditorUploadingWidget
from django.urls import path
from .models import (
    User, Event, Ticket, Payment, Review, DiscountCode, Notification, ChatMessage
)

# Form tùy chỉnh cho Event
class EventForm(forms.ModelForm):
    description = forms.CharField(widget=CKEditorUploadingWidget, required=False)

    class Meta:
        model = Event
        fields = '__all__'

# Form tùy chỉnh cho Notification
class NotificationForm(forms.ModelForm):
    message = forms.CharField(widget=CKEditorUploadingWidget, required=False)

    class Meta:
        model = Notification
        fields = '__all__'

# Form tùy chỉnh cho ChatMessage
class ChatMessageForm(forms.ModelForm):
    message = forms.CharField(widget=CKEditorUploadingWidget)

    class Meta:
        model = ChatMessage
        fields = '__all__'

# Admin cho User
class UserAdmin(admin.ModelAdmin):
    list_display = ['id', 'username', 'email', 'role', 'is_active', 'created_at']
    search_fields = ['username', 'email']
    list_filter = ['role', 'is_active', 'created_at']
    list_editable = ['role', 'is_active']
    readonly_fields = ['avatar_view']

    def avatar_view(self, user):
        if user.avatar:
            return mark_safe(f"<img src='{user.avatar.url}' width='200' />")
        return "No avatar"

# Admin cho Event
class EventAdmin(admin.ModelAdmin):
    list_display = ['id', 'title', 'category', 'start_datetime', 'organizer', 'status', 'is_public']
    search_fields = ['title', 'category']
    list_filter = ['category', 'status', 'is_public', 'start_datetime']
    list_editable = ['status', 'is_public']
    readonly_fields = ['image_view', 'location_image_view']
    form = EventForm

    def image_view(self, event):
        if event.image:
            return mark_safe(f"<img src='{event.image.url}' width='200' />")
        return "No image"

    def location_image_view(self, event):
        if event.location_image:
            return mark_safe(f"<img src='{event.location_image.url}' width='200' />")
        return "No location image"

    class Media:
        css = {
            'all': ('/static/css/admin_styles.css',)  # Tùy chỉnh CSS nếu cần
        }

# Admin cho Ticket
class TicketAdmin(admin.ModelAdmin):
    list_display = ['id', 'event', 'user', 'price', 'status', 'purchase_date']
    search_fields = ['event__title', 'user__username', 'qr_code']
    list_filter = ['status', 'purchase_date']
    list_editable = ['status']

# Admin cho Notification
class NotificationAdmin(admin.ModelAdmin):
    list_display = ['id', 'user', 'title', 'type', 'is_read', 'created_at']
    search_fields = ['title', 'user__username']
    list_filter = ['type', 'is_read', 'created_at']
    form = NotificationForm

# Admin cho ChatMessage
class ChatMessageAdmin(admin.ModelAdmin):
    list_display = ['id', 'event', 'sender', 'message_preview', 'created_at']
    search_fields = ['message', 'sender__username', 'event__title']
    list_filter = ['created_at']
    form = ChatMessageForm

    def message_preview(self, obj):
        return obj.message[:50] + ('...' if len(obj.message) > 50 else '')

# Custom Admin Site
class MyAdminSite(admin.AdminSite):
    site_header = 'Event Management System'
    site_title = 'Event Admin'
    index_title = 'Welcome to Event Management Admin'

    def get_urls(self):
        return [
            path('event-stats/', self.event_stats, name='event-stats'),
        ] + super().get_urls()

    def event_stats(self, request):
        # Thống kê số lượng sự kiện theo danh mục
        event_stats = Event.objects.values('category').annotate(event_count=Count('id')).order_by('category')
        # Thống kê số lượng vé đã bán theo sự kiện
        ticket_stats = Event.objects.annotate(ticket_count=Count('tickets')).values('title', 'ticket_count')

        return TemplateResponse(request, 'admin/event_stats.html', {
            'event_stats': event_stats,
            'ticket_stats': ticket_stats,
        })

# Khởi tạo admin site
admin_site = MyAdminSite(name='event_admin')

# Đăng ký các model
admin_site.register(User, UserAdmin)
admin_site.register(Event, EventAdmin)
admin_site.register(Ticket, TicketAdmin)
admin_site.register(Payment)
admin_site.register(Review)
admin_site.register(DiscountCode)
admin_site.register(Notification, NotificationAdmin)
admin_site.register(ChatMessage, ChatMessageAdmin)