# EVENT-MANAGEMENT-AND-ONLINE-BOOKING-SYSTEM

## Table of Contents
- [Introduction](#introduction)
- [Technologies Used](#technologies-used)
- [Features](#features)
- [Setup Instructions](#setup-instructions)
- [API Endpoints](#aPI-endpoints)
- [License](#license)
- [Contributing](#contributing)
- [Contact](#contact)
## Introduction
### HỆ THỐNG QUẢN LÝ SỰ KIỆN VÀ ĐẶT VÉ TRỰC TUYẾN
- Đăng ký tài khoản: người dùng có thể đăng ký với vai trò quản trị viên, nhà tổ chức sự
kiện, hoặc khách tham gia.
- Tạo sự kiện: nhà tổ chức đăng tải sự kiện với các thông tin chi tiết như ngày giờ, địa
điểm (kết nối Google Maps), số lượng vé, giá vé, và mô tả sự kiện.
- Đặt vé trực tuyến: người dùng tìm kiếm sự kiện theo loại hình (âm nhạc, hội thảo, thể
thao…) và đặt vé online qua các cổng thanh toán như MoMo, VNPAY.
- Quản lý vé và check-in: sau khi đặt vé thành công, người dùng nhận mã QR. Nhân viên
quét mã QR tại sự kiện để xác nhận check-in.
- Thông báo và nhắc nhở: hệ thống gửi email hoặc push notification nhắc người dùng về
sự kiện sắp diễn ra hoặc thông báo sự thay đổi.
- Đánh giá sự kiện: người tham gia có thể đánh giá và viết nhận xét về sự kiện. Nhà tổ
chức theo dõi phản hồi để cải thiện chất lượng.
- Thống kê và báo cáo: quản trị viên và nhà tổ chức xem báo cáo số lượng vé bán ra,
doanh thu, và mức độ quan tâm qua biểu đồ trực quan.
- *Tích hợp chat real-time: người tham gia có thể trao đổi với ban tổ chức hoặc thảo luận
với nhau trước sự kiện qua chat trực tuyến.
- Tính năng nổi bật: gợi ý sự kiện dựa trên sở thích, tạo mã giảm giá cho từng nhóm
khách hàng, và theo dõi xu hướng sự kiện hot.
## Technologies Used
- **Node.js** – Backend runtime environment used to build RESTful APIs for handling application logic and data processing.
- **VNPAY** – Integrated as the primary payment gateway for secure transaction processing.
- **Firebase Cloud Messaging (FCM)** – Used to deliver real-time push notifications to users.
- **Render.com** – Cloud platform for hosting and deploying the backend services.
- **Cron-job.org** – Scheduled task service for automating recurring jobs (e.g., generating notifications for upcoming events).

## Features
- Seamless payment integration with VNPAY.
- Real-time email and push notifications for user activities and order updates.
- 
## Setup Instructions
## API Endpoints
### users
- **GET** /users/: Get all users.
- **POST** /users/: Create a new user.
- **GET** /users/current-user/: Get current user details.
- **PATCH** /users/current-user/: Update current user details.
- **POST** /users/deactivate/: Deactivate a user.
- **GET** /users/my-notifications/: Get user's notifications.
- **GET** /users/payments/: Get user's payments.
- **GET** /users/sent-messages/: Get user's sent messages.
- **GET** /users/tickets/: Get user's tickets.
- **POST** /users/{id}/admin-deactivate/: Admin deactivate user by ID.
### events
- **GET** /events/: Get all events.
- **POST** /events/: Create a new event.
- **GET** /events/categories/: Get event categories.
- **GET** /events/hot/: Get hot events.
- **GET** /events/my-events/: Get user's events.
- **GET** /events/suggest_events/: Get suggested events.
- **GET** /events/{id}/: Get event by ID.
- **PUT** /events/{id}/: Update an event by ID.
- **PATCH** /events/{id}/: Partially update an event by ID.
- **GET** /events/{id}/chat-messages/: Get chat messages for an event.
- **GET** /events/{id}/statistics/: Get statistics for an event.
- **GET** /events/{id}/tickets/: Get tickets for an event.
### payments
- **GET** /payments/: Get all payments.
- **POST** /payments/pay-unpaid-tickets/: Pay unpaid tickets.
- **POST** /payments/webhook/: Handle payment webhook.
- **GET** /payments/{id}/: Get payment by ID.
- **PUT** /payments/{id}/: Update a payment by ID.
- **PATCH** /payments/{id}/: Partially update a payment by ID.
- **DELETE** /payments/{id}/: Delete a payment by ID.
- **POST** /payments/{id}/confirm/: Confirm a payment by ID.
### tickets
- **GET** /tickets/: Get all tickets.
- **POST** /tickets/book-ticket/: Book a ticket.
- **POST** /tickets/check-in/: Check in a ticket.
- **GET** /tickets/{id}/: Get ticket by ID.
- **PUT** /tickets/{id}/: Update a ticket by ID.
- **PATCH** /tickets/{id}/: Partially update a ticket by ID.
### chat-messages
- **GET** /chat-messages/: Get all chat messages.
- **POST** /chat-messages/: Create a new chat message.
### discount-codes
- **GET** /discount-codes/: Get all discount codes.
- **POST** /discount-codes/: Create a new discount code.
- **GET** /discount-codes/user-group-discount-codes/: Get user group discount codes.
- **DELETE** /discount-codes/{id}/: Delete a discount code by ID.
### event-trending-logs
- **GET** /event-trending-logs/: Get all event trending logs.
- **GET** /event-trending-logs/{event}/: Get trending logs for a specific event.
### notifications
- **POST** /notifications/create-notification/: Create a new notification.
- **GET** /notifications/event-notifications/: Get event notifications.
- **GET** /notifications/my-notifications/: Get user's notifications.
- **POST** /notifications/{id}/mark-as-read/: Mark a notification as read by ID.
### reviews
- **GET** /reviews/: Get all reviews.
- **POST** /reviews/: Create a new review.
- **GET** /reviews/event-reviews-organizer/: Get event reviews for organizer.
- **PUT** /reviews/{id}/: Update a review by ID.
- **PATCH** /reviews/{id}/: Partially update a review by ID.
- **DELETE** /reviews/{id}/: Delete a review by ID.
### tags
- **GET** /tags/: Get all tags.
- **POST** /tags/: Create a new tag.
- **PUT** /tags/{id}/: Update a tag by ID.
- **PATCH** /tags/{id}/: Partially update a tag by ID.
- **DELETE** /tags/{id}/: Delete a tag by ID.
## License
This project is licensed under the MIT License. See the LICENSE file for details.
## Contributing
Contributions are welcome! Please fork the repository and submit a pull request for any improvements or bug fixes.
## Contact
For any inquiries or support, please contact us at:
- namnguyen19092004@gmail.com
- npphus@gmail.com
