// configs/Apis.js
import axios from "axios";

// Sử dụng địa chỉ IP của máy tính chạy backend
// const BASE_URL = "http://192.168.1.7:8000/";
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
  userNotifications: "notifications/my-notifications/",
  userSentMessages: "users/sent-messages/",
  deactivateUser: "users/deactivate/",

  // Events
  events: "events/",
  eventDetail: (eventId) => `events/${eventId}/`,
  eventTickets: (eventId) => `events/${eventId}/tickets/`,
  eventReviews: "reviews/",
  eventChatMessages: (eventId) => `events/${eventId}/chat-messages/`,
  suggestEvents: "events/suggest/",
  hotEvents: "events/hot/",
  eventStatistics: (eventId) => `events/${eventId}/statistics/`,
  myEvents: "events/my-events/", 
  categories: 'events/categories/',

  // Tags
  tags: "tags",
  tagDetail: (tagId) => `tags/${tagId}/`,

  // Tickets
  tickets: "tickets/",
  ticketDetail: (ticketId) => `tickets/${ticketId}/`,
  bookTicket: "tickets/book-ticket/",
  checkInTicket: "tickets/check-in/",

  // Payments
  payments: "payments/",
  paymentDetail: (paymentId) => `payments/${paymentId}/`,
  confirmPayment: (paymentId) => `payments/${paymentId}/confirm/`,
  payUnpaidTickets: "payments/pay-unpaid-tickets/",

  // Discount Codes
  discountCodes: "discount-codes/",
  discountCodeDetail: "discount-codes/user-group-discount-codes/",

  // Notifications
  notifications: "notifications/",
  myNotifications: "notifications/my-notifications/",
  eventNotifications: (eventId) => `notifications/event-notifications/?event_id=${eventId}`,
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
  return axios.create({
    baseURL: BASE_URL,
    adapter: ["fetch", "xhr", "http"],
    headers: {
      'Authorization': `Bearer ${token}`,
      'User-Agent': 'EventManagementApp/1.0',
      'Accept-Encoding': 'gzip, deflate, br',
      'Content-Type': 'application/json',
    },
    withCredentials: false,
    maxRedirects: 5,
  });
};

// Tạo instance axios không cần xác thực
export const Apis = axios.create({
  baseURL: BASE_URL,
});

export default Apis;