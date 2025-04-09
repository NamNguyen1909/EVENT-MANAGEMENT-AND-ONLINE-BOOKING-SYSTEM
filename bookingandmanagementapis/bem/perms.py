from rest_framework import permissions

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