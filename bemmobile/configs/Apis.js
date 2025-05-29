import Config from 'react-native-config';
import { Platform } from 'react-native';
import axios from 'axios';

const isDev = __DEV__;

const BASE_URL = isDev 
  ? 'http://192.168.1.8:8000/' 
  : 'https://0ffd-2402-800-6346-a652-19c1-2fb5-cf7e-b45f.ngrok-free.app/';

const WS_BASE_URL = isDev 
  ? 'ws://192.168.1.8:8000/' 
  : 'wss://0ffd-2402-800-6346-a652-19c1-2fb5-cf7e-b45f.ngrok-free.app/';

export const endpoints = {
  login: 'o/token/',
  refreshToken: 'token/refresh/',
  register: 'users/',
  currentUser: 'users/current-user/',
  userTickets: 'users/tickets/',
  userPayments: 'users/payments/',
  userNotifications: 'notifications/my-notifications/',
  userSentMessages: 'users/sent-messages/',
  deactivateUser: 'users/deactivate/',
  events: 'events/',
  eventDetail: (eventId) => `events/${eventId}/`,
  eventTickets: (eventId) => `events/${eventId}/tickets/`,
  eventReviews: 'reviews/',
  eventChatMessages: (eventId) => `events/${eventId}/chat-messages/`,
  hotEvents: 'events/hot/',
  eventStatistics: (eventId) => `events/${eventId}/statistics/`,
  myEvents: 'events/my-events/',
  categories: 'events/categories/',
  suggestEvents: 'events/suggest_events/',
  tags: 'tags',
  tagDetail: (tagId) => `tags/${tagId}/`,
  tickets: 'tickets/',
  ticketDetail: (ticketId) => `tickets/${ticketId}/`,
  bookTicket: 'tickets/book-ticket/',
  checkInTicket: 'tickets/check-in/',
  payments: 'payments/',
  paymentDetail: (paymentId) => `payments/${paymentId}/`,
  confirmPayment: (paymentId) => `payments/${paymentId}/confirm/`,
  payUnpaidTickets: 'payments/pay-unpaid-tickets/',
  discountCodes: 'discount-codes/',
  discountCodeDetail: 'discount-codes/user-group-discount-codes/',
  notifications: 'notifications/',
  myNotifications: 'notifications/my-notifications/',
  eventNotifications: (eventId) => `notifications/event-notifications/?event_id=${eventId}`,
  createNotification: 'notifications/create-notification/',
  markNotificationAsRead: (notificationId) => `notifications/${notificationId}/mark-as-read/`,
  chatMessages: 'chat-messages/',
  chatMessageDetail: (messageId) => `chat-messages/${messageId}/`,
  eventTrendingLogs: 'event-trending-logs/',
  eventTrendingLogDetail: (logId) => `event-trending-logs/${logId}/`,
  reviews: 'reviews/',
  createReview: 'reviews/',
  updateReview: (reviewId) => `reviews/${reviewId}/`,
  deleteReview: (reviewId) => `reviews/${reviewId}/`,
  getEventReviews: (eventId) => `reviews/?event_id=${eventId}`,
  getReviewsOrganizer: (eventId) => `/reviews/event-reviews-organizer/?event_id=${eventId}`,
  replyReview: 'reviews/',
};

export const websocketEndpoints = {
  chat: (eventId) => `${WS_BASE_URL}ws/chat/${eventId}/`,
};

export const authApis = (token) => {
  return axios.create({
    baseURL: BASE_URL,
    adapter: ['fetch', 'xhr', 'http'],
    headers: {
      Authorization: `Bearer ${token}`,
      'User-Agent': 'EventManagementApp/1.0',
      'Accept-Encoding': 'gzip, deflate, br',
      'Content-Type': 'application/json',
    },
    withCredentials: false,
    maxRedirects: 5,
  });
};

export default axios.create({
  baseURL: BASE_URL,
});