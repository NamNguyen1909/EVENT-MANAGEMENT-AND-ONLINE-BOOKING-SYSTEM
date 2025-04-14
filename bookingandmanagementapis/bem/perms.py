from rest_framework import permissions

# Quyền chỉ cho phép quản trị viên (role='admin')
class IsAdminUser(permissions.BasePermission):
    def has_permission(self, request, view):
        # Kiểm tra xem user có đăng nhập và có role là 'admin' không
        return request.user and request.user.is_authenticated and request.user.role == 'admin'

# Quyền chỉ cho phép nhà tổ chức (role='organizer')
class IsOrganizerUser(permissions.BasePermission):
    def has_permission(self, request, view):
        # Kiểm tra xem user có đăng nhập và có role là 'organizer' không
        return request.user and request.user.is_authenticated and request.user.role == 'organizer'

# Quyền chỉ cho phép khách tham gia (role='guest')
# class IsGuestUser(permissions.BasePermission):
#     def has_permission(self, request, view):
#         # Kiểm tra xem user có đăng nhập và có role là 'guest' không
#         return request.user and request.user.is_authenticated and request.user.role == 'guest'

# Quyền cho phép quản trị viên hoặc nhà tổ chức
class IsAdminOrOrganizer(permissions.BasePermission):
    def has_permission(self, request, view):
        # Kiểm tra xem user có đăng nhập và có role là 'admin' hoặc 'organizer' không
        return request.user and request.user.is_authenticated and request.user.role in ['admin', 'organizer']

# Quyền chỉ cho phép chủ sở hữu vé chỉnh sửa/xóa
class IsTicketOwner(permissions.BasePermission):
    def has_object_permission(self, request, view, obj):
        # Kiểm tra xem user hiện tại có phải là chủ sở hữu của vé không
        return obj.user == request.user

# Quyền chỉ cho phép người tổ chức sự kiện quản lý nội dung liên quan
class IsEventOrganizer(permissions.BasePermission):
    def has_object_permission(self, request, view, obj):
        # Kiểm tra xem user hiện tại có phải là người tổ chức sự kiện không
        return obj.organizer == request.user

# Quyền chỉ cho phép người gửi tin nhắn chỉnh sửa/xóa tin nhắn
# class IsChatMessageSender(permissions.BasePermission):
#     def has_object_permission(self, request, view, obj):
#         # Kiểm tra xem user hiện tại có phải là người gửi tin nhắn không
#         return obj.sender == request.user