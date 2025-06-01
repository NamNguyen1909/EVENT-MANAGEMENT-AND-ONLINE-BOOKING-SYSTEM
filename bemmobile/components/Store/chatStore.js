// Store/chatStore.js
import { create } from 'zustand';

const useChatStore = create((set) => ({
  user: null,
  setUser: (user) => set({ user }),
  events: [],
  setEvents: (events) => set({ events }),
  conversations: [],
  setConversations: (conversations) => set({ conversations }),
  participants: [],
  setParticipants: (participants) => set({ participants }),
  messages: [],
  setMessages: (messages) => set({ messages }),
  addMessage: (message) => set((state) => ({ messages: [...state.messages, message] })),
  isOrganizer: false,
  setIsOrganizer: (isOrganizer) => set({ isOrganizer }),
  typingIndicators: {},
  setTypingIndicator: (key, value) =>
    set((state) => ({
      typingIndicators: { ...state.typingIndicators, [key]: value },
    })),
  ws: null,
  setWs: (ws) => set({ ws }),
}));

export default useChatStore;