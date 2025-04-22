from rest_framework import permissions


# Quyền chỉ cho phép quản trị viên (role='admin')
class IsAdminUser(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and request.user.role == 'admin'


# Quyền chỉ cho phép nhà tổ chức (role='organizer')
class IsOrganizerUser(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and request.user.role == 'organizer'

    def has_object_permission(self, request, view, obj):
        # Cho phép organizer chỉnh sửa sự kiện của chính họ
        return request.user.is_authenticated and request.user == obj.organizer


# Quyền chỉ cho phép người tham gia (role='attendee')
class IsAttendeeUser(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and request.user.role == 'attendee'


# Quyền cho phép quản trị viên hoặc nhà tổ chức
class IsAdminOrOrganizer(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and request.user.role in ['admin', 'organizer']


# Quyền chỉ cho phép chủ sở hữu vé chỉnh sửa/xóa
class IsTicketOwner(permissions.BasePermission):
    def has_object_permission(self, request, view, obj):
        return obj.user == request.user


# Quyền chỉ cho phép người tổ chức sự kiện quản lý nội dung liên quan
class IsEventOrganizer(permissions.BasePermission):
    def has_object_permission(self, request, view, obj):
        return obj.organizer == request.user


# Quyền chỉ cho phép người gửi tin nhắn chỉnh sửa/xóa tin nhắn
class IsChatMessageSender(permissions.BasePermission):
    def has_object_permission(self, request, view, obj):
        return obj.sender == request.user


# Quyền chỉ cho phép người nhận hoặc người gửi tin nhắn xem nội dung
class IsChatMessageParticipant(permissions.BasePermission):
    def has_object_permission(self, request, view, obj):
        return request.user in [obj.sender, obj.receiver]