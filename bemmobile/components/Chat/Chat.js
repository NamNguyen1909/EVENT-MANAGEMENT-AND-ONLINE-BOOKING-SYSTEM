import React, { useState, useEffect, useContext, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Platform,
  StatusBar,
  Modal,
  Dimensions,
  KeyboardAvoidingView,
  SafeAreaView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Button, useTheme } from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialIcons } from '@expo/vector-icons';
import { MyUserContext } from '../../configs/MyContexts';
import { authApis, endpoints } from '../../configs/Apis';
import { colors } from '../../styles/MyStyles';

const ChatList = ({ navigation }) => {
  const { colors: themeColors } = useTheme();
  const user = useContext(MyUserContext);
  const screenHeight = Dimensions.get('window').height;

  const [isEventModalVisible, setIsEventModalVisible] = useState(true);
  const [events, setEvents] = useState([]);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [participants, setParticipants] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchEvents = async () => {
    setEventsLoading(true);
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) return;

      const api = authApis(token);
      let eventsData = [];

      // Kiểm tra vai trò người dùng và gọi API phù hợp
      if (user?.role === 'organizer') {
        const eventsRes = await api.get(endpoints.events);
        eventsData = (eventsRes.data?.results || eventsRes.data || []).map((item, index) => ({
          id: item.id,
          title: item.title,
          uniqueKey: `event_${item.id}_${index}`,
        }));
      } else {
        const eventsRes = await api.get(endpoints.userTickets);
        eventsData = (eventsRes.data?.results || eventsRes.data || []).map((item, index) => ({
          id: item.event_id,
          title: item.event_title,
          uniqueKey: `event_${item.event_id}_${index}`,
        }));
      }

      const uniqueEvents = [];
      const seenIds = new Set();
      for (const event of eventsData) {
        if (!seenIds.has(event.id)) {
          seenIds.add(event.id);
          uniqueEvents.push(event);
        }
      }

      setEvents(uniqueEvents);
    } catch (error) {
      console.error('Lỗi khi lấy danh sách sự kiện:', error);
      Alert.alert('Lỗi', 'Không thể lấy danh sách sự kiện. Vui lòng thử lại.');
    } finally {
      setEventsLoading(false);
    }
  };

  const fetchConversations = async (eventId) => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        Alert.alert('Lỗi', 'Bạn chưa đăng nhập!');
        navigation.navigate('loginStack');
        return;
      }

      const api = authApis(token);
      const response = await api.get(endpoints.eventChatMessages(eventId));
      const messages = response.data.results || [];

      const conversationMap = {};
      messages.forEach((msg, index) => {
        let otherUserId = null;
        let isPrivate = false;
        let displayParticipant = null;

        if (msg.is_from_organizer) {
          if (msg.sender === user.id || msg.user_info?.id === user.id) {
            if (msg.receiver) {
              otherUserId = typeof msg.receiver === 'string'
                ? msg.participants?.find(p => p.username === msg.receiver)?.id
                : msg.receiver;
              isPrivate = true;
              if (user?.role === 'organizer') {
                displayParticipant = msg.participants?.find(p => p.id === otherUserId) || { username: msg.receiver };
              } else {
                displayParticipant = msg.user_info || { username: 'Organizer' };
              }
            }
          } else {
            otherUserId = msg.sender;
            isPrivate = true;
            if (user?.role !== 'organizer') {
              displayParticipant = msg.user_info || { username: 'Organizer' };
            } else {
              displayParticipant = msg.participants?.find(p => p.id === otherUserId) || msg.user_info;
            }
          }

          if (isPrivate && otherUserId) {
            const privateKey = `private_${eventId}_${otherUserId}_${msg.id}_${index}`;
            if (!conversationMap[privateKey]) {
              conversationMap[privateKey] = {
                id: privateKey,
                otherUserId,
                lastMessage: msg.message,
                lastMessageTime: msg.created_at,
                isPrivate: true,
                participant: displayParticipant,
                messages: [msg],
              };
            } else {
              conversationMap[privateKey].messages.push(msg);
              if (new Date(msg.created_at) > new Date(conversationMap[privateKey].lastMessageTime || 0)) {
                conversationMap[privateKey].lastMessage = msg.message;
                conversationMap[privateKey].lastMessageTime = msg.created_at;
              }
            }
          }
        }
      });

      const finalConversations = [];
      const seenUserIds = new Set();
      Object.values(conversationMap).forEach((conv) => {
        if (conv.isPrivate && !seenUserIds.has(conv.otherUserId)) {
          seenUserIds.add(conv.otherUserId);
          finalConversations.push(conv);
        }
      });

      setConversations(finalConversations);
      setParticipants(messages[0]?.participants || []);
    } catch (error) {
      console.error('Lỗi khi lấy hội thoại:', error);
      Alert.alert('Lỗi', 'Không thể tải danh sách hội thoại. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user) {
      Alert.alert('Lỗi', 'Bạn cần đăng nhập để sử dụng chat.');
      navigation.navigate('loginStack');
      return;
    }
    fetchEvents();
  }, [user]);

  const selectEvent = (event) => {
    setSelectedEvent(event);
    setIsEventModalVisible(false);
    fetchConversations(event.id);
  };

  const renderEvent = ({ item }) => (
    <TouchableOpacity style={styles.eventItem} onPress={() => selectEvent(item)}>
      <Text style={styles.eventTitle}>{item.title}</Text>
    </TouchableOpacity>
  );

  const renderConversation = ({ item }) => (
    <TouchableOpacity
      style={styles.conversationItem}
      onPress={() =>
        navigation.navigate('ChatDetail', {
          eventId: selectedEvent.id,
          receiverId: item.otherUserId,
          receiverUsername: item.participant?.username,
        })
      }
    >
      <Text style={styles.conversationTitle}>
        {item.participant?.username || 'Unknown'}
      </Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[styles.container, { paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <MaterialIcons name="arrow-back" size={28} color={colors.navy} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{selectedEvent ? `Chat - ${selectedEvent.title}` : 'Chat'}</Text>
        {selectedEvent && (
          <TouchableOpacity onPress={() => setIsEventModalVisible(true)}>
            <MaterialIcons name="event" size={28} color={colors.navy} />
          </TouchableOpacity>
        )}
      </View>

      {selectedEvent ? (
        <>
          {loading ? (
            <Text style={styles.loadingText}>Đang tải hội thoại...</Text>
          ) : conversations.length > 0 ? (
            <FlatList
              data={conversations}
              renderItem={renderConversation}
              keyExtractor={(item) => item.id}
              style={styles.conversationList}
            />
          ) : (
            <Text style={styles.noConversationsText}>Chưa có hội thoại nào. Bắt đầu chat ngay!</Text>
          )}
        </>
      ) : null}

      <Modal
        animationType="slide"
        transparent={true}
        visible={isEventModalVisible}
        onRequestClose={() => setIsEventModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={[styles.modalContent, { maxHeight: screenHeight * 0.8 }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Chọn sự kiện để chat</Text>
              <TouchableOpacity onPress={() => setIsEventModalVisible(false)} style={styles.closeButton}>
                <MaterialIcons name="close" size={24} color={colors.blueGray} />
              </TouchableOpacity>
            </View>
            {eventsLoading ? (
              <Text style={styles.noEventsText}>Đang tải...</Text>
            ) : events.length > 0 ? (
              <FlatList
                data={events}
                renderItem={renderEvent}
                keyExtractor={(item) => item.uniqueKey}
                style={styles.eventList}
              />
            ) : (
              <Text style={styles.noEventsText}>Không có sự kiện nào để chat.</Text>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const ChatDetail = ({ route, navigation }) => {
  const { eventId, receiverId, receiverUsername } = route.params;
  const { colors: themeColors } = useTheme();
  const user = useContext(MyUserContext);
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState('');
  const [ws, setWs] = useState(null);
  const [loading, setLoading] = useState(false);
  const wsRef = useRef(null);
  const messageCounter = useRef(0);
  const flatListRef = useRef(null);

  const fetchMessages = async () => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        Alert.alert('Lỗi', 'Bạn chưa đăng nhập!');
        navigation.navigate('loginStack');
        return;
      }

      const api = authApis(token);
      const response = await api.get(endpoints.eventChatMessages(eventId));
      const allMessages = response.data.results || [];
      console.log('API Messages:', JSON.stringify(allMessages, null, 2));

      const messageMap = new Map();
      const filteredMessages = allMessages
        .filter(
          (msg) =>
            (msg.sender === user.id && (msg.receiver === receiverId || msg.receiver === receiverUsername)) ||
            (msg.sender === receiverId && (msg.receiver === user.username || msg.receiver === user.id)) ||
            (msg.sender === user.id && msg.user_info?.id === receiverId) ||
            (msg.sender === receiverId && msg.user_info?.id === user.id)
        )
        .map((msg) => ({
          ...msg,
          uniqueKey: `msg_${eventId}_${receiverId}_${msg.id || Date.now()}_${msg.created_at || Date.now()}`,
        }))
        .forEach((msg) => messageMap.set(msg.id || msg.uniqueKey, msg));

      const sortedMessages = Array.from(messageMap.values()).sort(
        (a, b) => new Date(a.created_at) - new Date(b.created_at)
      );
      setMessages(sortedMessages);
    } catch (error) {
      console.error('Lỗi khi lấy tin nhắn:', error);
      Alert.alert('Lỗi', 'Không thể tải lịch sử tin nhắn. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  const initializeWebSocket = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      console.log('Token for WebSocket:', token);
      if (!token) {
        Alert.alert('Lỗi', 'Bạn chưa đăng nhập!');
        navigation.navigate('loginStack');
        return;
      }

      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }

      const wsUrl = `ws://192.168.1.8:8000/ws/chat/${eventId}/?token=${token}`;
      const websocket = new WebSocket(wsUrl, [], {
        headers: {
          Authorization: `Bearer ${token}`,
          Origin: 'http://192.168.1.8:8000',
        },
      });

      websocket.onopen = () => {
        console.log('WebSocket connected successfully');
      };

      websocket.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data);
          console.log('WebSocket received:', JSON.stringify(data, null, 2));
          if (data.history) {
            const messageMap = new Map(messages.map(m => [m.id || m.uniqueKey, m]));
            const filteredHistory = data.history
              .filter(
                (msg) =>
                  (msg.sender === user.id && (msg.receiver === receiverId || msg.receiver === receiverUsername)) ||
                  (msg.sender === receiverId && (msg.receiver === user.username || msg.receiver === user.id)) ||
                  (msg.sender === user.id && msg.user_info?.id === receiverId) ||
                  (msg.sender === receiverId && msg.user_info?.id === user.id)
              )
              .map((msg) => ({
                ...msg,
                uniqueKey: `msg_${eventId}_${receiverId}_${msg.id || Date.now()}_${msg.created_at || Date.now()}`,
              }))
              .forEach((msg) => messageMap.set(msg.id || msg.uniqueKey, msg));

            const sortedMessages = Array.from(messageMap.values()).sort(
              (a, b) => new Date(a.created_at) - new Date(b.created_at)
            );
            setMessages(sortedMessages);
          } else {
            if (
              (data.sender === user.id && (data.receiver === receiverId || data.receiver === receiverUsername)) ||
              (data.sender === receiverId && (data.receiver === user.username || data.receiver === user.id)) ||
              (data.sender === user.id && msg.user_info?.id === receiverId) ||
              (data.sender === receiverId && msg.user_info?.id === user.id)
            ) {
              const newMessage = {
                ...data,
                sender: data.sender || user.id,
                user_info: data.user_info || { id: user.id, username: user.username },
                created_at: data.created_at || new Date().toISOString(),
                uniqueKey: `msg_${eventId}_${receiverId}_${data.id || Date.now()}_${data.created_at || Date.now()}`,
              };
              setMessages((prev) => {
                const messageMap = new Map(prev.map(m => [m.id || m.uniqueKey, m]));
                if (!messageMap.has(newMessage.id || newMessage.uniqueKey)) {
                  messageMap.set(newMessage.id || newMessage.uniqueKey, newMessage);
                }
                const sortedMessages = Array.from(messageMap.values()).sort(
                  (a, b) => new Date(a.created_at) - new Date(b.created_at)
                );
                return sortedMessages;
              });
              flatListRef.current?.scrollToEnd({ animated: true });
            }
          }
        } catch (error) {
          console.error('Lỗi xử lý WebSocket message:', error);
        }
      };

      websocket.onclose = () => {
        console.log('WebSocket closed');
        setTimeout(() => initializeWebSocket(), 2000);
      };

      websocket.onerror = (error) => {
        console.error('WebSocket error:', JSON.stringify(error));
        Alert.alert('Lỗi', 'Không thể kết nối đến chat. Đang thử lại...');
      };

      wsRef.current = websocket;
      setWs(websocket);
    } catch (error) {
      console.error('Lỗi khởi tạo WebSocket:', error);
      Alert.alert('Lỗi', 'Không thể kết nối đến chat. Vui lòng thử lại.');
    }
  };

  const sendMessage = () => {
    if (!ws || !message.trim()) return;

    const messageData = {
      message: message.trim(),
      receiver_id: receiverId,
    };

    try {
      ws.send(JSON.stringify(messageData));
      console.log('Sent message:', JSON.stringify(messageData, null, 2));

      const tempMessage = {
        message: message.trim(),
        sender: user.id,
        receiver: receiverId,
        user_info: { id: user.id, username: user.username },
        created_at: new Date().toISOString(),
        uniqueKey: `msg_${eventId}_${receiverId}_temp_${messageCounter.current++}_${Date.now()}`,
      };
      setMessages((prev) => {
        const messageMap = new Map(prev.map(m => [m.id || m.uniqueKey, m]));
        messageMap.set(tempMessage.uniqueKey, tempMessage);
        const sortedMessages = Array.from(messageMap.values()).sort(
          (a, b) => new Date(a.created_at) - new Date(b.created_at)
        );
        return sortedMessages;
      });
      setMessage('');
      flatListRef.current?.scrollToEnd({ animated: true });
    } catch (error) {
      console.error('Lỗi gửi tin nhắn:', error);
      Alert.alert('Lỗi', 'Không thể gửi tin nhắn. Vui lòng thử lại.');
    }
  };

  useEffect(() => {
    if (!user) {
      Alert.alert('Lỗi', 'Bạn cần đăng nhập để sử dụng chat.');
      navigation.navigate('loginStack');
      return;
    }
    fetchMessages();
    initializeWebSocket();
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [user, eventId, receiverId]);

  const renderMessage = ({ item }) => {
    const isOwnMessage = item.sender === user.id || item.user_info?.id === user.id;

    return (
      <View
        style={[
          styles.messageContainer,
          isOwnMessage ? styles.ownMessage : styles.otherMessage,
        ]}
      >
        <Text style={styles.sender}>{item.user_info?.username || 'Unknown'}</Text>
        <Text style={styles.messageText}>{item.message}</Text>
        <Text style={styles.timestamp}>
          {item.created_at ? new Date(item.created_at).toLocaleTimeString() : ''}
        </Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 }]}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 120 : 20}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <MaterialIcons name="arrow-back" size={28} color={colors.navy} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{receiverUsername || 'Chat'}</Text>
        </View>

        {loading ? (
          <Text style={styles.loadingText}>Đang tải tin nhắn...</Text>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            renderItem={renderMessage}
            keyExtractor={(item) => item.uniqueKey}
            style={styles.messageList}
            contentContainerStyle={[styles.messageListContent, { paddingBottom: 120 }]}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
            onLayout={() => flatListRef.current?.scrollToEnd({ animated: true })}
          />
        )}

        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            value={message}
            onChangeText={setMessage}
            placeholder={`Nhắn đến ${receiverUsername || 'ban tổ chức'}`}
            placeholderTextColor={colors.blueGray}
          />
          <Button
            mode="contained"
            onPress={sendMessage}
            disabled={!message.trim()}
            style={styles.sendButton}
            buttonColor={colors.blueDark}
            textColor={colors.white}
            icon="send"
          >
            Gửi
          </Button>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

import { createStackNavigator } from '@react-navigation/stack';
const ChatStack = createStackNavigator();

const Chat = () => (
  <ChatStack.Navigator screenOptions={{ headerShown: false }}>
    <ChatStack.Screen name="ChatList" component={ChatList} />
    <ChatStack.Screen name="ChatDetail" component={ChatDetail} />
  </ChatStack.Navigator>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: '600',
    color: colors.navy,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  conversationList: {
    flex: 1,
    paddingVertical: 10,
  },
  conversationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: colors.white,
    borderRadius: 12,
    marginVertical: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  conversationTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.navy,
    flex: 1,
  },
  messageList: {
    flex: 1,
    paddingVertical: 12,
  },
  messageListContent: {
    paddingBottom: 120,
  },
  messageContainer: {
    marginVertical: 6,
    padding: 12,
    borderRadius: 16,
    maxWidth: '75%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  ownMessage: {
    backgroundColor: colors.bluePrimary,
    alignSelf: 'flex-end',
    borderTopRightRadius: 4,
  },
  otherMessage: {
    backgroundColor: '#E6ECF0',
    alignSelf: 'flex-start',
    borderTopLeftRadius: 4,
    borderWidth: 0,
  },
  sender: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.navy,
    marginBottom: 4,
  },
  messageText: {
    fontSize: 16,
    color: colors.black,
    lineHeight: 22,
  },
  timestamp: {
    fontSize: 11,
    color: colors.blueGray,
    alignSelf: 'flex-end',
    marginTop: 4,
    opacity: 0.7,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    flexShrink: 0,
  },
  input: {
    flex: 1,
    borderWidth: 0,
    backgroundColor: '#F1F5F9',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    marginRight: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  sendButton: {
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  loadingText: {
    textAlign: 'center',
    fontSize: 16,
    color: colors.blueGray,
    marginTop: 20,
    fontStyle: 'italic',
  },
  noConversationsText: {
    textAlign: 'center',
    fontSize: 16,
    color: colors.blueGray,
    marginTop: 20,
    fontStyle: 'italic',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: colors.white,
    borderRadius: 16,
    marginHorizontal: 16,
    paddingVertical: 16,
    width: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.navy,
  },
  closeButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
  },
  eventList: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  eventItem: {
    padding: 16,
    backgroundColor: colors.white,
    borderRadius: 12,
    marginVertical: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  eventTitle: {
    fontSize: 17,
    color: colors.navy,
    fontWeight: '500',
  },
  noEventsText: {
    textAlign: 'center',
    fontSize: 16,
    color: colors.blueGray,
    padding: 20,
    fontStyle: 'italic',
  },
});

export default Chat;