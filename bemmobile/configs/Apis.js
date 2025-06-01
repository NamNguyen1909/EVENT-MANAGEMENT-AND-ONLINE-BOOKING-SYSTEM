// import Config from 'react-native-config';
// import { Platform } from 'react-native';
// import axios from 'axios';

// const isDev = __DEV__;

// const BASE_URL = isDev 
//   ? 'http://192.168.1.8:8000/' 
//   : 'https://0ffd-2402-800-6346-a652-19c1-2fb5-cf7e-b45f.ngrok-free.app/';

// const WS_BASE_URL = isDev 
//   ? 'ws://192.168.1.8:8000/' 
//   : 'wss://0ffd-2402-800-6346-a652-19c1-2fb5-cf7e-b45f.ngrok-free.app/';
// configs/Apis.js
import axios from "axios";

// Sử dụng địa chỉ IP của máy tính chạy backend
const BASE_URL = "http://192.168.1.8:8000/";


const BASE_URL = "https://event-management-and-online-booking.onrender.com/";




// const BASE_URL = "http://192.168.44.105:8000/";
// const BASE_URL = "http://192.168.1.8:8000/";



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
  hotEvents: "events/hot/",
  eventStatistics: (eventId) => `events/${eventId}/statistics/`,
  myEvents: "events/my-events/", 
  categories: 'events/categories/',
  suggestEvents: 'events/suggest_events/',

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
  
// Reviews
  reviews: "reviews/",
  createReview: "reviews/", // POST
  updateReview: (reviewId) => `reviews/${reviewId}/`, // PUT/PATCH
  deleteReview: (reviewId) => `reviews/${reviewId}/`, // DELETE
  getEventReviews: (eventId) => `reviews/?event_id=${eventId}`, // GET (danh sách review của 1 sự kiện)
  getReviewsOrganizer: (eventId) => `/reviews/event-reviews-organizer/?event_id=${eventId}`, // GET (danh sách review cho organizer)
  replyReview: "reviews/", // POST (tạo phản hồi)


};

// Tạo instance axios với xác thực
// export const authApis = (token) => {
//   return axios.create({
//     baseURL: BASE_URL,
//     // adapter: ["fetch", "xhr", "http"],
//     headers: {
//       'Authorization': `Bearer ${token}`,
//       'User-Agent': 'EventManagementApp/1.0',
//       'Accept-Encoding': 'gzip, deflate, br',
//       'Content-Type': 'application/json',
//     },
//     withCredentials: false,
//     maxRedirects: 5,
//   });
// };
export const authApis = (token) => axios.create({
  baseURL: BASE_URL,
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  withCredentials: false,
});

// Tạo instance axios không cần xác thực
export const Apis = axios.create({
  baseURL: BASE_URL,
});

export default Apis;