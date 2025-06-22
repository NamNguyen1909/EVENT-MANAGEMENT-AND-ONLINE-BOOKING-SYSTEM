# Event Management and Online Booking System

## Table of Contents
- [Introduction](#introduction)
- [Technologies Used](#technologies-used)
- [Features](#features)
- [Setup Instructions](#setup-instructions)
- [API Endpoints](#api-endpoints)
- [License](#license)
- [Contributing](#contributing)
- [Contact](#contact)

## Introduction
The **Event Management and Online Booking System** is a comprehensive platform designed to streamline event organization and ticket booking processes. It caters to various user roles, including administrators, event organizers, attendees, and staff, providing a seamless experience for creating, managing, and attending events. Key functionalities include real-time chat, secure payment integration, QR code-based check-in, and personalized event recommendations.

### Key Features
- **User Registration**: Users can register as administrators, event organizers, or attendees.
- **Event Creation**: Organizers can post events with full details including date, time, location (integrated with Google Maps), number of tickets, ticket prices, and event description.
- **Online Ticket Booking**: Users can search for events by category (e.g., music, seminars, sports, etc.) and book tickets online via payment gateways such as MoMo and VNPAY.
- **Ticket Management & Check-in**: After a successful booking, users receive a QR code. Staff can scan the QR code at the event to confirm check-in.
- **Notifications & Reminders**: The system sends email or push notifications to remind users about upcoming events or inform them of any changes.
- **Event Reviews**: Attendees can rate and leave comments about events. Organizers can monitor feedback to improve event quality.
- **Analytics & Reporting**: Administrators and organizers can view reports on ticket sales, revenue, and user engagement through visualized charts.
- **Real-time Chat Integration**: Attendees can communicate with organizers or discuss with each other before the event via live chat.
- **Highlighted Features**: Event suggestions based on user interests, targeted discount codes for different customer segments, and tracking of trending events.

## Technologies Used
- **Backend**:
  - **Django** & **Django REST Framework**: For building robust RESTful APIs handling user management, event creation, ticket booking, and more.
  - **PostgreSQL**: Relational database for storing user, event, and transaction data (configurable).
- **Frontend**:
  - **React Native**: Cross-platform mobile app development for iOS and Android.
- **Payment Integration**:
  - **VNPAY**: Secure payment gateway for transaction processing.
- **Notifications**:
  - **Firebase Cloud Messaging (FCM)**: Real-time push notifications for user updates and event reminders.
- **Hosting & Deployment**:
  - **Render.com**: Cloud platform for hosting backend services.
- **Task Scheduling**:
  - **Cron-job.org**: Schedules automated API calls for tasks like generating event notifications.
- **Other**:
  - **WebSocket**: For real-time chat functionality.
  - **Google Maps API**: For event location integration.

## Features
- **Secure Payment Processing**: Seamless integration with VNPAY for ticket purchases.
- **Real-time Notifications**: Email and push notifications for booking confirmations, event reminders, and updates.
- **QR Code Check-in**: Efficient event entry with staff-managed QR code scanning.
- **Real-time Chat**: Enables communication between attendees and organizers.
- **Event Analytics**: Visual dashboards for tracking ticket sales, revenue, and engagement.
- **Personalized Experience**: Event suggestions based on user preferences and behavior.
- **Discount Management**: Flexible discount code creation for targeted promotions.
- **Scalable Architecture**: Supports multiple user roles and high transaction volumes.

## Setup Instructions
### Prerequisites
- Python 3.9+
- Node.js 16+
- PostgreSQL 13+
- Render.com account (for deployment)
- Firebase project (for FCM)
- VNPAY merchant account
- Google Maps API key
- Expo CLI (`npm install -g expo-cli`)

### Backend Setup
1. **Clone the Repository**:
   ```bash
   git clone https://github.com/your-username/event-management-system.git
   cd event-management-system/backend
   ```
2. **Create a Virtual Environment**:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```
3. **Install Dependencies**:
   ```bash
   pip install -r requirements.txt
   ```
4. **Configure Environment Variables**:
   - Create a `.env` file in the `backend` directory with the following:
     ```env
     SECRET_KEY=your_django_secret_key
     DATABASE_URL=postgresql://user:password@localhost:5432/event_db
     VNPAY_TMN_CODE=your_vnpay_tmn_code
     VNPAY_HASH_SECRET=your_vnpay_hash_secret
     GOOGLE_MAPS_API_KEY=your_google_maps_api_key
     FIREBASE_CREDENTIALS_PATH=/path/to/firebase-credentials.json
     ```
   - **Note**: The project on GitHub is configured for online deployment on Render.com. For local setup, ensure `DATABASE_URL` points to your local PostgreSQL instance.
5. **Run Migrations**:
   ```bash
   python manage.py migrate
   ```
6. **Create Superuser** (optional):
   ```bash
   python manage.py createsuperuser
   ```
7. **Start the Development Server**:
   ```bash
   python manage.py runserver
   ```
   - **Local**: Access the API at `http://localhost:8000`.
   - **Online**: If deployed, access at `https://event-management-and-online-booking.onrender.com/`.

### Frontend Setup
1. **Navigate to the Frontend Directory**:
   ```bash
   cd ../frontend
   ```
2. **Install Dependencies**:
   ```bash
   npm install
   ```
3. **Configure API Endpoint**:
   - Update the API base URL in `frontend/src/configs/Apis.js`:
     ```javascript
     // For local development
     const BASE_URL = 'http://localhost:8000/api/';
     // For online deployment
     // const BASE_URL = 'https://event-management-and-online-booking.onrender.com/api/';
     ```
   - **Note**: The GitHub project is configured for online deployment. For local testing, use the local URL (`http://localhost:8000/api/`).
4. **Run the Mobile App**:
   - For development with Expo Go:
     ```bash
     npx expo start
     ```
     - Scan the QR code with the Expo Go app on your iOS or Android device.
   - **To use the Scan feature (QR code scanning)**:
     - The scan functionality requires native modules (e.g., `react-native-camera` or similar). Therefore, you must build a native app using:
       ```bash
       npx expo run:android  # For Android
       npx expo run:ios      # For iOS
       ```
     - Ensure an Android emulator/physical device or Xcode (for iOS) is set up.
     - These commands generate native builds, enabling features like QR code scanning that are not supported in Expo Go.
   - **Note**: Ensure the device/emulator has camera permissions enabled for QR code scanning.

### Deployment
- **Backend**: Deploy to Render.com by connecting your GitHub repository and configuring the environment variables. Use the online URL `https://event-management-and-online-booking.onrender.com/`.
- **Frontend**: Build APKs/IPAs using `npx expo run:android` or `npx expo run:ios` for production. Distribute via Google Play Store or Apple App Store.
- **Cron Jobs**: Set up scheduled tasks on Cron-job.org to trigger notification APIs.

## API Endpoints
### Users
- `GET /users/`: Retrieve all users (admin only).
- `POST /users/`: Register a new user.
- `GET /users/current-user/`: Get current user details.
- `PATCH /users/current-user/`: Update current user details.
- `POST /users/deactivate/`: Deactivate a user account.
- `GET /users/my-notifications/`: Get user's notifications.
- `GET /users/payments/`: Get user's payment history.
- `GET /users/sent-messages/`: Get user's sent messages.
- `GET /users/tickets/`: Get user's tickets.
- `POST /users/{id}/admin-deactivate/`: Deactivate a user by ID (admin only).

### Events
- `GET /events/`: List all public events.
- `POST /events/`: Create a new event (organizer only).
- `GET /events/categories/`: List event categories.
- `GET /events/hot/`: List trending events.
- `GET /events/my-events/`: List user's events (organizer only).
- `GET /events/suggest_events/`: Get personalized event suggestions.
- `GET /events/{id}/`: Get event details by ID.
- `PUT /events/{id}/`: Update an event by ID (organizer only).
- `PATCH /events/{id}/`: Partially update an event by ID (organizer only).
- `GET /events/{id}/chat-messages/`: Get chat messages for an event.
- `GET /events/{id}/statistics/`: Get event statistics (organizer/admin only).
- `GET /events/{id}/tickets/`: Get tickets for an event.

### Payments
- `GET /payments/`: List all payments (admin only).
- `POST /payments/pay-unpaid-tickets/`: Pay unpaid tickets.
- `POST /payments/webhook/`: Handle payment webhook (VNPAY).
- `GET /payments/{id}/`: Get payment details by ID.
- `PUT /payments/{id}/`: Update a payment by ID (admin only).
- `PATCH /payments/{id}/`: Partially update a payment by ID (admin only).
- `DELETE /payments/{id}/`: Delete a payment by ID (admin only).
- `POST /payments/{id}/confirm/`: Confirm a payment by ID.

### Tickets
- `GET /tickets/`: List all tickets (admin only).
- `POST /tickets/book-ticket/`: Book a ticket.
- `POST /tickets/check-in/`: Check in a ticket (staff only).
- `GET /tickets/{id}/`: Get ticket details by ID.
- `PUT /tickets/{id}/`: Update a ticket by ID (admin only).
- `PATCH /tickets/{id}/`: Partially update a ticket by ID (admin only).

### Chat Messages
- `GET /chat-messages/`: List all chat messages (admin only).
- `POST /chat-messages/`: Create a new chat message.

### Discount Codes
- `GET /discount-codes/`: List all discount codes (admin/organizer only).
- `POST /discount-codes/`: Create a new discount code (admin/organizer only).
- `GET /discount-codes/user-group-discount-codes/`: Get discount codes for user groups.
- `DELETE /discount-codes/{id}/`: Delete a discount code by ID (admin/organizer only).

### Event Trending Logs
- `GET /event-trending-logs/`: List all trending logs (admin only).
- `GET /event-trending-logs/{event}/`: Get trending logs for a specific event.

### Notifications
- `POST /notifications/create-notification/`: Create a new notification (admin/organizer only).
- `GET /notifications/event-notifications/`: Get event-related notifications.
- `GET /notifications/my-notifications/`: Get user's notifications.
- `POST /notifications/{id}/mark-as-read/`: Mark a notification as read.

### Reviews
- `GET /reviews/`: List all reviews.
- `POST /reviews/`: Create a new review.
- `GET /reviews/event-reviews-organizer/`: Get reviews for organizer's events.
- `PUT /reviews/{id}/`: Update a review by ID.
- `PATCH /reviews/{id}/`: Partially update a review by ID.
- `DELETE /reviews/{id}/`: Delete a review by ID.

### Tags
- `GET /tags/`: List all tags.
- `POST /tags/`: Create a new tag (admin/organizer only).
- `PUT /tags/{id}/`: Update a tag by ID (admin/organizer only).
- `PATCH /tags/{id}/`: Partially update a tag by ID (admin/organizer only).
- `DELETE /tags/{id}/`: Delete a tag by ID (admin/organizer only).

## License

## Contributing
Contributions are welcome! To contribute:
1. Fork the repository.
2. Create a new branch (`git checkout -b feature/your-feature`).
3. Commit your changes (`git commit -m "Add your feature"`).
4. Push to the branch (`git push origin feature/your-feature`).
5. Submit a pull request.

Please ensure your code follows the project's coding standards and includes relevant tests.

## Contact
For inquiries or support, please contact:
- **Nam Nguyen**: namnguyen19092004@gmail.com
- **Phu Nguyen**: npphus@gmail.com
