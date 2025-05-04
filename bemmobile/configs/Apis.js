// configs/Apis.js
import axios from "axios";

// Sử dụng địa chỉ IP của máy tính chạy backend
// const BASE_URL = "http://192.168.1.5:8000/";
// const BASE_URL = "http://127.0.0.1:8000/";
const BASE_URL = "http://192.168.44.105:8000/";

export const endpoints = {
  // Authentication
  login: "o/token/",
  refreshToken: "token/refresh/",

  // Users
  register: "users/",
  currentUser: "users/current-user/",
  userTickets: "users/tickets/",
  userPayments: "users/payments/",
  userNotifications: "users/my-notifications/",
  userSentMessages: "users/sent-messages/",
  deactivateUser: "users/deactivate/",

  // Events
  events: "events/",
  eventDetail: (eventId) => `events/${eventId}/`,
  eventTickets: (eventId) => `events/${eventId}/tickets/`,
  eventReviews: (eventId) => `events/${eventId}/reviews/`,
  eventChatMessages: (eventId) => `events/${eventId}/chat-messages/`,
  suggestEvents: "events/suggest/",
  hotEvents: "events/hot/",
  eventStatistics: (eventId) => `events/${eventId}/statistics/`,
  myEvents: "events/my-events/", 

  // Tags
  tags: "tags",
  tagDetail: (tagId) => `tags/${tagId}/`,

  // Tickets
  tickets: "tickets/",
  ticketDetail: (ticketId) => `tickets/${ticketId}/`,
  bookTicket: "tickets/book/",
  checkInTicket: "tickets/check-in/",

  // Payments
  payments: "payments/",
  paymentDetail: (paymentId) => `payments/${paymentId}/`,
  confirmPayment: (paymentId) => `payments/${paymentId}/confirm/`,

  // Discount Codes
  discountCodes: "discount-codes/",

  // Notifications
  notifications: "notifications/",
  myNotifications: "notifications/my-notifications/",
  eventNotifications: (eventId) => `notifications/event-notifications/?event_id=${eventId}/`,
  createNotification: "notifications/create-notification/",
  markNotificationAsRead: (notificationId) => `notifications/${notificationId}/mark-as-read/`,

  // Chat Messages
  chatMessages: "chat-messages/",
  chatMessageDetail: (messageId) => `chat-messages/${messageId}/`,

  // Event Trending Logs
  eventTrendingLogs: "event-trending-logs/",
  eventTrendingLogDetail: (logId) => `event-trending-logs/${logId}/`,
};

// Tạo instance axios với xác thực
export const authApis = (token) => {
  const api = axios.create({
    baseURL: BASE_URL,
    adapter: ["fetch", "xhr", "http"],
    headers: {
      'User-Agent': 'EventManagementApp/1.0',
      'Accept-Encoding': 'gzip, deflate, br',
      'Connection': 'keep-alive',
      'Cache-Control': 'no-cache',
      'Content-Type': 'application/json',
      'Origin': 'http://localhost',
    },
    withCredentials: false,
    maxRedirects: 5, // Cho phép follow redirect
    validateStatus: function (status) {
      return status >= 200 && status < 400; // Cho phép xử lý redirect
    },
  });

  // Thêm interceptor để log request
  api.interceptors.request.use(
    (config) => {
      config.headers.Authorization = `Bearer ${token}`;
      console.log('>>> Request method:', config.method);
      console.log('>>> Request URL:', config.url);
      console.log('>>> Request headers:', config.headers);
      console.log('>>> Request origin:', config.headers.origin || 'Not set');
      console.log('>>> Full request config:', config);
      return config;
    },
    (error) => {
      console.log('>>> Request error:', error);
      return Promise.reject(error);
    }
  );

  // Thêm interceptor để log response
  api.interceptors.response.use(
    (response) => {
      console.log('>>> Response status:', response.status);
      console.log('>>> Response headers:', response.headers);
      console.log('>>> Response data:', response.data);
      return response;
    },
    (error) => {
      console.log('>>> Response error:', error.response || error);
      return Promise.reject(error);
    }
  );

  return api;
};

// Tạo instance axios không cần xác thực
const Apis = axios.create({
  baseURL: BASE_URL,
});

// Thêm interceptor để log phương thức
Apis.interceptors.request.use(
  (config) => {
    console.log('>>> Request method (non-auth):', config.method);
    console.log('>>> Request URL (non-auth):', config.url);
    return config;
  },
  (error) => Promise.reject(error)
);

export default Apis;