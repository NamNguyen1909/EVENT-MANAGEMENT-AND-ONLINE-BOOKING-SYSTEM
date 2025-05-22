// Chat.js
import React, { useState, useEffect, useContext, useRef } from 'react';
import {
  SafeAreaView,
  View,
  StyleSheet,
  FlatList,
  Alert,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  Picker,
} from 'react-native';
import { TextInput, Button, Text, useTheme, ActivityIndicator } from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MyUserContext, MyDispatchContext } from '../../configs/MyContexts';
import { authApis, endpoints, websocketEndpoints } from '../../configs/Apis';
import { colors } from '../../styles/MyStyles';

const Chat = ({ route, navigation }) => {
  const theme = useTheme();
  const user = useContext(MyUserContext);
  const dispatch = useContext(MyDispatchContext);
  const eventId = route.params?.eventId;
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState('');
  const [ws, setWs] = useState(null);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [receiverId, setReceiverId] = useState(null);
  const [organizer, setOrganizer] = useState(null);
  const flatListRef = useRef(null);

  useEffect(() => {
    if (!user) {
      Alert.alert('Lỗi', 'Vui lòng đăng nhập để vào phòng chat.', [
        { text: 'OK', onPress: () => navigation.navigate('loginStack') },
      ]);
      return;
    }

    if (!eventId) {
      Alert.alert('Lỗi', 'Vui lòng chọn một sự kiện để vào phòng chat.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
      return;
    }

    const checkChatAccess = async () => {
      setLoading(true);
      try {
        const token = await AsyncStorage.getItem('token');
        if (!token) {
          Alert.alert('Lỗi', 'Không tìm thấy token xác thực!', [
            { text: 'OK', onPress: () => navigation.navigate('loginStack') },
          ]);
          return;
        }

        const api = authApis(token);
        const eventRes = await api.get(endpoints.eventDetail(eventId));
        const currentTime = new Date('2025-05-22T15:50:00+07:00');
        if (new Date(eventRes.data.end_time) < currentTime) {
          Alert.alert('Lỗi', 'Sự kiện đã kết thúc, không thể chat.', [
            { text: 'OK', onPress: () => navigation.goBack() },
          ]);
          return;
        }

        setOrganizer(eventRes.data.organizer);

        const ticketsRes = await api.get(endpoints.userTickets);
        const hasTicket = ticketsRes.data.some((t) => t.event.id === parseInt(eventId) && t.is_paid);
        const isOrganizer = user.role === 'organizer' && eventRes.data.organizer.id === user.id;

        if (!hasTicket && !isOrganizer) {
          Alert.alert('Lỗi', 'Bạn không có quyền truy cập phòng chat này.', [
            { text: 'OK', onPress: () => navigation.goBack() },
          ]);
          return;
        }

        fetchMessages(page);
        connectWebSocket();
      } catch (error) {
        console.error('Lỗi kiểm tra quyền truy cập:', error);
        Alert.alert('Lỗi', 'Không thể xác minh quyền truy cập. Vui lòng thử lại.', [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
      } finally {
        setLoading(false);
      }
    };

    checkChatAccess();

    return () => {
      if (ws) ws.close();
    };
  }, [user, eventId, dispatch, navigation, page]);

  const fetchMessages = async (pageNum) => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        Alert.alert('Lỗi', 'Không tìm thấy token xác thực!', [
          { text: 'OK', onPress: () => navigation.navigate('loginStack') },
        ]);
        return;
      }

      const api = authApis(token);
      const response = await api.get(`${endpoints.eventChatMessages(eventId)}?page=${pageNum}`);
      const newMessages = response.data.results || response.data || [];
      setMessages((prev) => (pageNum === 1 ? newMessages.reverse() : [...newMessages.reverse(), ...prev]));
      setHasMore(!!response.data.next);
    } catch (error) {
      console.error('Lỗi khi lấy tin nhắn:', error);
      if (error.response && error.response.status === 401) {
        Alert.alert('Lỗi', 'Xác thực thất bại. Vui lòng đăng nhập lại.', [
          {
            text: 'OK',
            onPress: () => {
              AsyncStorage.removeItem('token');
              AsyncStorage.removeItem('refresh_token');
              dispatch({ type: 'logout' });
              navigation.navigate('loginStack');
            },
          },
        ]);
      } else {
        Alert.alert('Lỗi', 'Không thể lấy tin nhắn. Vui lòng thử lại.');
      }
    } finally {
      setLoading(false);
    }
  };

  const connectWebSocket = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        Alert.alert('Lỗi', 'Không tìm thấy token xác thực!');
        return;
      }

      const wsUrl = await websocketEndpoints.chat(eventId);
      const websocket = new WebSocket(wsUrl, null, {
        headers: { Authorization: `Bearer ${token}` },
      });

      websocket.onopen = () => {
        console.log('WebSocket đã kết nối');
      };

      websocket.onmessage = (e) => {
        const data = JSON.parse(e.data);
        if (data.message) {
          setMessages((prev) => [data.message, ...prev]);
        } else if (data.history) {
          setMessages((prev) => [...data.history.reverse(), ...prev]);
        }
      };

      websocket.onclose = () => {
        console.log('WebSocket đã đóng, thử kết nối lại sau 5s...');
        setTimeout(connectWebSocket, 5000);
      };

      websocket.onerror = (error) => {
        console.error('Lỗi WebSocket:', error);
        Alert.alert('Lỗi', 'Không thể kết nối đến phòng chat. Đang thử lại...');
      };

      setWs(websocket);
    } catch (error) {
      console.error('Lỗi khi kết nối WebSocket:', error);
      Alert.alert('Lỗi', 'Không thể kết nối đến phòng chat. Vui lòng kiểm tra kết nối mạng.');
    }
  };

  const sendMessage = async () => {
    if (!message.trim()) {
      Alert.alert('Lỗi', 'Tin nhắn không được để trống.');
      return;
    }

    if (ws && ws.readyState === WebSocket.OPEN) {
      try {
        setLoading(true);
        const payload = { message };
        if (receiverId) {
          payload.receiver_id = parseInt(receiverId);
        }
        ws.send(JSON.stringify(payload));
        setMessage('');
        setReceiverId(null);
      } catch (error) {
        console.error('Lỗi khi gửi tin nhắn:', error);
        Alert.alert('Lỗi', 'Không thể gửi tin nhắn. Vui lòng thử lại.');
      } finally {
        setLoading(false);
      }
    } else {
      Alert.alert('Lỗi', 'Không kết nối được với phòng chat. Vui lòng thử lại.');
    }
  };

  const renderMessage = ({ item }) => (
    <View
      style={[
        styles.messageContainer,
        item.sender.id === user.id ? styles.myMessage : styles.otherMessage,
      ]}
    >
      <Text style={styles.username}>
        {item.is_from_organizer ? `[Ban tổ chức] ${item.user_info?.username}` : item.user_info?.username || 'Unknown'}
        {item.receiver_id ? ` (Riêng tới ${item.receiver?.username || 'Unknown'})` : ''}
      </Text>
      <Text style={styles.message}>{item.message}</Text>
      <Text style={styles.timestamp}>
        {new Date(item.created_at).toLocaleString('vi-VN')}
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={[styles.safeArea, { paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 }]}>
      <KeyboardAvoidingView
        style={styles.keyboardAvoidingContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'android' ? 24 : 0}
      >
        <View style={[styles.container, { backgroundColor: colors.grayLight }]}>
          {loading && <ActivityIndicator size="large" color={colors.bluePrimary} />}
          <FlatList
            ref={flatListRef}
            data={messages}
            renderItem={renderMessage}
            keyExtractor={(item) => item.id.toString()}
            style={styles.messageList}
            contentContainerStyle={styles.messageListContent}
            inverted
            onEndReached={() => hasMore && !loading && setPage((prev) => prev + 1)}
            onEndReachedThreshold={0.5}
          />
          <View style={styles.inputContainer}>
            <Picker
              selectedValue={receiverId}
              onValueChange={(value) => setReceiverId(value)}
              style={styles.picker}
            >
              <Picker.Item label="Gửi tới tất cả" value={null} />
              <Picker.Item
                label={`Gửi tới ban tổ chức (${organizer?.username || 'Unknown'})`}
                value={organizer?.id}
              />
            </Picker>
            <TextInput
              label="Nhập tin nhắn"
              value={message}
              onChangeText={setMessage}
              style={styles.input}
              mode="outlined"
              outlineColor={colors.bluePrimary}
              autoCapitalize="none"
              disabled={loading}
            />
            <Button
              mode="contained"
              onPress={sendMessage}
              loading={loading}
              disabled={loading || !message.trim()}
              style={[styles.sendButton, { backgroundColor: colors.blueDark }]}
              buttonColor={colors.blueDark}
              textColor={colors.white}
            >
              Gửi
            </Button>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.grayLight,
  },
  keyboardAvoidingContainer: {
    flex: 1,
  },
  container: {
    flex: 1,
    paddingHorizontal: 10,
  },
  messageList: {
    flex: 1,
  },
  messageListContent: {
    paddingVertical: 10,
  },
  messageContainer: {
    marginVertical: 5,
    padding: 10,
    borderRadius: 8,
    elevation: Platform.OS === 'android' ? 2 : 1,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: Platform.OS === 'ios' ? 0.1 : 0.2,
    shadowRadius: 2,
  },
  myMessage: {
    backgroundColor: colors.blueSky,
    alignSelf: 'flex-end',
    maxWidth: '80%',
  },
  otherMessage: {
    backgroundColor: colors.white,
    alignSelf: 'flex-start',
    maxWidth: '80%',
  },
  username: {
    fontWeight: 'bold',
    fontSize: 14,
    color: colors.navy,
  },
  message: {
    fontSize: 16,
    color: colors.navy,
    marginVertical: 2,
  },
  timestamp: {
    fontSize: 12,
    color: colors.blueGray,
    alignSelf: 'flex-end',
  },
  inputContainer: {
    flexDirection: 'column',
    padding: 10,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.grayLight,
  },
  picker: {
    height: 50,
    width: '100%',
    marginBottom: 10,
    backgroundColor: colors.white,
    borderRadius: 8,
  },
  input: {
    flex: 1,
    marginBottom: 10,
    backgroundColor: colors.white,
  },
  sendButton: {
    paddingVertical: 6,
    borderRadius: 8,
  },
});

export default Chat;

// import React from 'react';
// import { View, Text } from 'react-native';

// const Profile = () => {
//   return (
//     <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
//       <Text>Chat screen (Placeholder)</Text>
//     </View>
//   );
// };

// export default Profile;