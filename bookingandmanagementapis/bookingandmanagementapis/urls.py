"""
URL configuration for bookingandmanagementapis project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.1/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path, include, re_path
from rest_framework import permissions
from drf_yasg.views import get_schema_view
from drf_yasg import openapi
from bem.admin import admin_site

# Tạo schema view cho tài liệu API (Swagger/Redoc)
schema_view = get_schema_view(
    openapi.Info(
        title="Event Management API",
        default_version='v1',
        description="APIs for Event Management System",
        contact=openapi.Contact(email="your.email@example.com"),
        license=openapi.License(name="Your Name @2025"),
    ),
    public=True,
    permission_classes=(permissions.AllowAny,),
)

urlpatterns = [
    # Bao gồm các URL từ app bookingandmanagementapis
    path('', include('bem.urls')),

    # Admin site tùy chỉnh
    path('admin/', admin_site.urls),

    # CKEditor
    re_path(r'^ckeditor/', include('ckeditor_uploader.urls')),

    # Swagger/Redoc cho tài liệu API
    re_path(r'^swagger(?P<format>\.json|\.yaml)$', schema_view.without_ui(cache_timeout=0), name='schema-json'),
    re_path(r'^swagger/$', schema_view.with_ui('swagger', cache_timeout=0), name='schema-swagger-ui'),
    re_path(r'^redoc/$', schema_view.with_ui('redoc', cache_timeout=0), name='schema-redoc'),

    # OAuth2
    path('o/', include('oauth2_provider.urls', namespace='oauth2_provider')),
]
