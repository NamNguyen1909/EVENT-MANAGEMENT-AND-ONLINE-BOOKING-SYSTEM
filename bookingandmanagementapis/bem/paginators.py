from rest_framework.pagination import PageNumberPagination

class ItemPaginator(PageNumberPagination):
    page_size = 10  # Mặc định 10 mục mỗi trang
    page_size_query_param = 'page_size'
    max_page_size = 100