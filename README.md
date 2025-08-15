# Event Management and Online Booking System

## Table of Contents
- [Introduction](#introduction)
- [Technologies Used](#technologies-used)
- [Key Features](#key-features)
- [Setup Instructions](#setup-instructions)
- [API Documentation](#api-documentation)
- [Contact](#contact)

## Introduction
A comprehensive event management platform with mobile app support, featuring real-time chat, secure payment integration, QR code check-in, and personalized event recommendations. Supports multiple user roles: administrators, event organizers, attendees, and staff.

## Technologies Used
- **Backend**: Django 5.1.6 + DRF 3.15.2, MySQL/PostgreSQL, Redis, Django Channels (WebSocket)
- **Frontend**: React Native with Expo, React Navigation
- **Authentication**: OAuth2 Toolkit (JWT support available)
- **Payment**: VNPAY integration
- **Storage**: Cloudinary for media files
- **Notifications**: Firebase Cloud Messaging (FCM)
- **Deployment**: Render.com

## Key Features
- **Reserve-before-Payment System**: Advanced ticket booking with reservation capability
- **Real-time Chat**: WebSocket-powered communication between attendees and organizers
- **QR Code Check-in**: Staff-managed event entry system
- **Push Notifications**: FCM integration for event reminders and updates
- **Payment Integration**: Secure VNPAY payment processing
- **Event Analytics**: Dashboard for tracking sales, revenue, and engagement
- **Personalized Recommendations**: AI-driven event suggestions based on user behavior

## Setup Instructions

### Prerequisites
- Python 3.9+, Node.js 16+, MySQL/PostgreSQL, Redis 6.0+
- Expo CLI: `npm install -g @expo/cli`
- Accounts: Firebase, VNPAY, Cloudinary, Render.com

### Backend Setup

1. **Clone & Install**:
   ```bash
   git clone [repository-url]
   cd bookingandmanagementapis
   python -m venv bemvenv
   # Windows: bemvenv\Scripts\activate
   # Linux/macOS: source bemvenv/bin/activate
   pip install -r requirements.txt
   ```

2. **Environment Configuration**:
   Create `.env` file in `bookingandmanagementapis/` directory:
   ```env
   # Database
   DATABASE_URL=mysql://user:password@localhost:3306/bem_db
   
   # Django Security
   SECRET_KEY=your_secret_key_here_change_this_in_production
   DEBUG=True
   ALLOWED_HOSTS=localhost,127.0.0.1,192.168.1.8
   
   # VNPAY Payment Gateway
   VNPAY_TMN_CODE=your_vnpay_tmn_code_here
   VNPAY_HASH_SECRET=your_vnpay_hash_secret_here
   
   # Cloudinary File Storage
   CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
   CLOUDINARY_API_KEY=your_cloudinary_api_key
   CLOUDINARY_API_SECRET=your_cloudinary_api_secret
   
   # Firebase Configuration
   FIREBASE_SERVICE_ACCOUNT_JSON={"type":"service_account",...}
   
   # OAuth2 Authentication
   CLIENT_ID=your_oauth2_client_id_here
   CLIENT_SECRET=your_oauth2_client_secret_here
   
   # Redis Configuration
   REDIS_URL=redis://localhost:6379
   
   # Email Configuration
   EMAIL_HOST_USER=your_email@gmail.com
   EMAIL_HOST_PASSWORD=your_app_password_here
   ```

   **⚠️ Important**: 
   - Never commit the `.env` file to version control
   - Change all default values in production
   - Use strong, unique values for SECRET_KEY
   - For production, set DEBUG=False
   ```

3. **Database Setup**:
   ```bash
   # Create database
   mysql -u root -p
   CREATE DATABASE bem_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   
   # Run migrations
   python manage.py migrate
   python manage.py createsuperuser
   ```

4. **Start Services**:
   ```bash
   # Start Redis (required for WebSocket)
   redis-server
   
   # Start Django server
   python manage.py runserver
   ```

### Frontend Setup

1. **Install & Configure**:
   ```bash
   cd bemmobile
   npm install
   ```

2. **Update API Configuration** in `configs/Apis.js`:
   ```javascript
   export const HOST = 'http://192.168.1.xxx:8000';  // Your local IP
   ```

3. **Firebase Setup**:
   - Place `google-services.json` in `android/app/`
   - Configure FCM in the app

4. **Run App**:
   ```bash
   # Development (limited features)
   npx expo start
   
   # Production build (full features including QR scanner)
   npx expo run:android  # or npx expo run:ios
   ```

### Production Deployment

**Backend (Render.com)**:
- Set environment variables in Render dashboard
- Deploy using provided `build.sh`

**Frontend**:
```bash
npx expo build:android  # or :ios
```

## API Documentation

### Core Endpoints
- **Authentication**: `POST /o/token/` - OAuth2 login
- **Users**: `GET/POST /users/` - User management
- **Events**: `GET/POST /events/` - Event CRUD operations
- **Tickets**: `POST /tickets/book-ticket/` - Reserve tickets
- **Payments**: `POST /payments/pay-unpaid-tickets/` - Process payments
- **Chat**: `WebSocket /ws/chat/{event_id}/` - Real-time messaging

### Full API Documentation
- **Swagger UI**: `http://localhost:8000/swagger/`
- **ReDoc**: `http://localhost:8000/redoc/`
- **Admin Panel**: `http://localhost:8000/admin/`

## Contact
- **Nam Nguyen**: namnguyen19092004@gmail.com
- **Phu Nguyen**: npphus@gmail.com

---
*For detailed setup instructions, troubleshooting, and contribution guidelines, see the full documentation.*