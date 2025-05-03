// configs/Apis.js
import axios from "axios";

// Sử dụng địa chỉ IP của máy tính chạy backend
// const BASE_URL = "http://192.168.1.5:8000";
// const BASE_URL = "http://127.0.0.1:8000/";
const BASE_URL = "http://192.168.44.105:8000";


export const endpoints = {
  // Authentication
  login: "/o/token/",
  refreshToken: "/token/refresh/",

  // Users
  register: "/users/",
  currentUser: "/users/current-user/",
  userTickets: "/users/tickets/",
  userPayments: "/users/payments/",
  userNotifications: "/users/my-notifications/",
  userSentMessages: "/users/sent-messages/",
  deactivateUser: "/users/deactivate/",

  // Events
  events: "/events",
  eventDetail: (eventId) => `/events/${eventId}`,
  eventTickets: (eventId) => `/events/${eventId}/tickets`,
  eventReviews: (eventId) => `/events/${eventId}/reviews`,
  eventChatMessages: (eventId) => `/events/${eventId}/chat-messages`,
  suggestEvents: "/events/suggest",
  hotEvents: "/events/hot",
  eventStatistics: (eventId) => `/events/${eventId}/statistics`,
  myEvents: "/events/my-events",

  // Tags
  tags: "/tags",
  tagDetail: (tagId) => `/tags/${tagId}`,

  // Tickets
  tickets: "/tickets",
  ticketDetail: (ticketId) => `/tickets/${ticketId}`,
  bookTicket: "/tickets/book",
  checkInTicket: "/tickets/check-in",

  // Payments
  payments: "/payments",
  paymentDetail: (paymentId) => `/payments/${paymentId}`,
  confirmPayment: (paymentId) => `/payments/${paymentId}/confirm`,

  // Discount Codes
  discountCodes: "/discount-codes",

  // Notifications
  notifications: "/notifications",
  myNotifications: "/notifications/my-notifications",
  eventNotifications: (eventId) => `/notifications/event-notifications/?event_id=${eventId}`,
  createNotification: "/notifications/create-notification",
  markNotificationAsRead: (notificationId) => `/notifications/${notificationId}/mark-as-read`,

  // Chat Messages
  chatMessages: "/chat-messages",
  chatMessageDetail: (messageId) => `/chat-messages/${messageId}`,

  // Event Trending Logs
  eventTrendingLogs: "/event-trending-logs",
  eventTrendingLogDetail: (logId) => `/event-trending-logs/${logId}`,
};

// Tạo instance axios với xác thực
export const authApis = (token) => {
  return axios.create({
    baseURL: BASE_URL,
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
};

// Tạo instance axios không cần xác thực
const Apis = axios.create({
  baseURL: BASE_URL,
});

// Thêm interceptor để log phương thức
Apis.interceptors.request.use(
  (config) => {
    console.log('Request method:', config.method);
    console.log('Request URL:', config.url);
    return config;
  },
  (error) => Promise.reject(error)
);

export default Apis;
