import React, { useState, useEffect, useContext, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Platform,
  StatusBar,
  Modal,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Toast from 'react-native-toast-message';
import { endpoints, websocketEndpoints, authApis } from '../../configs/Apis';
import { MyUserContext } from '../../configs/MyContexts';
import { colors } from '../../styles/MyStyles';

const Chat = ({ route, navigation }) => {
  const eventId = route?.params?.eventId; // Kiểm tra an toàn
  const user = useContext(MyUserContext);
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState('');
  const [ws, setWs] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [receiver, setReceiver] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const flatListRef = useRef(null);

  // Lấy lịch sử tin nhắn từ API
  const fetchMessages = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) throw new Error('Không tìm thấy token');
      const api = authApis(token);
      const res = await api.get(endpoints.eventChatMessages(eventId));
      setMessages(res.data.results.reverse()); // Đảo ngược để hiển thị mới nhất ở dưới
      setParticipants(res.data.results[0]?.participants || []);
    } catch (err) {
      setError('Không thể tải lịch sử tin nhắn.');
      console.error('Fetch messages error:', err);
    }
  };

  useEffect(() => {
    if (!eventId) {
      setError('Không tìm thấy ID sự kiện.');
      Toast.show({
        type: 'error',
        text1: 'Lỗi',
        text2: 'Không tìm thấy ID sự kiện.',
      });
      setTimeout(() => navigation.goBack(), 2000);
      setLoading(false);
      return;
    }

    if (!user) {
      Toast.show({
        type: 'error',
        text1: 'Lỗi',
        text2: 'Vui lòng đăng nhập để tham gia chat.',
      });
      navigation.navigate('loginStack');
      setLoading(false);
      return;
    }

    // Lấy lịch sử tin nhắn
    fetchMessages();

    // Kết nối WebSocket
    const connectWebSocket = async () => {
      try {
        const token = await AsyncStorage.getItem('token');
        if (!token) throw new Error('Không tìm thấy token');

        const wsUrl = `${websocketEndpoints.chat(eventId)}?token=${token}`;
        const websocket = new WebSocket(wsUrl);

        websocket.onopen = () => {
          setLoading(false);
          setError(null);
        };

        websocket.onmessage = (e) => {
          const data = JSON.parse(e.data);
          if (data.error) {
            setError(data.error);
            return;
          }
          if (data.history) {
            setMessages(data.history.reverse());
            setParticipants(data.history[0]?.participants || []);
          } else {
            setMessages((prev) => [...prev, {
              id: Date.now(),
              message: data.message,
              user_info: { username: data.username },
              created_at: new Date().toISOString(),
              is_from_organizer: data.is_from_organizer || false,
            }]);
            flatListRef.current?.scrollToEnd({ animated: true });
          }
        };

        websocket.onerror = () => {
          setError('Không thể kết nối đến chat.');
          setLoading(false);
        };

        websocket.onclose = () => {
          setError('Kết nối chat đã đóng.');
          setLoading(false);
        };

        setWs(websocket);

        return () => websocket.close();
      } catch (err) {
        setError('Lỗi xác thực. Vui lòng đăng nhập lại.');
        setLoading(false);
        navigation.navigate('loginStack');
      }
    };

    connectWebSocket();

    return () => ws?.close();
  }, [eventId, user, navigation]);

  const sendMessage = () => {
    if (!message.trim()) {
      Toast.show({
        type: 'error',
        text1: 'Lỗi',
        text2: 'Vui lòng nhập nội dung tin nhắn.',
      });
      return;
    }

    if (ws && ws.readyState === WebSocket.OPEN) {
      const payload = { message: message.trim() };
      if (receiver) payload.receiver_id = receiver.id;
      ws.send(JSON.stringify(payload));
      setMessage('');
      setReceiver(null);
    } else {
      Toast.show({
        type: 'error',
        text1: 'Lỗi',
        text2: 'Kết nối chat không khả dụng.',
      });
    }
  };

  const renderMessage = ({ item }) => (
    <View style={[
      styles.messageContainer,
      item.user_info.username === user?.username && styles.myMessage,
      item.is_from_organizer && styles.organizerMessage,
    ]}>
      <Text style={styles.messageUsername}>
        {item.user_info.username} {item.is_from_organizer && '(Ban tổ chức)'}
      </Text>
      <Text style={styles.messageContent}>{item.message}</Text>
      <Text style={styles.messageTimestamp}>
        {new Date(item.created_at).toLocaleTimeString()}
      </Text>
    </View>
  );

  const renderParticipant = ({ item }) => (
    <TouchableOpacity
      style={styles.participantItem}
      onPress={() => {
        setReceiver(item);
        setModalVisible(false);
      }}
    >
      <Text style={styles.participantText}>{item.username}</Text>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ActivityIndicator size="large" color={colors.bluePrimary} />
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <Text style={styles.errorText}>{error}</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <MaterialIcons name="arrow-back" size={24} color={colors.blueGray} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Chat sự kiện</Text>
        <TouchableOpacity onPress={() => setModalVisible(true)}>
          <MaterialIcons name="group" size={24} color={colors.blueGray} />
        </TouchableOpacity>
      </View>
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.messageList}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
      />
      {receiver && (
        <View style={styles.receiverInfo}>
          <Text style={styles.receiverText}>Gửi đến: {receiver.username}</Text>
          <TouchableOpacity onPress={() => setReceiver(null)}>
            <MaterialIcons name="close" size={20} color={colors.redAccent} />
          </TouchableOpacity>
        </View>
      )}
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          value={message}
          onChangeText={setMessage}
          placeholder="Nhập tin nhắn..."
          multiline
        />
        <TouchableOpacity onPress={sendMessage} style={styles.sendButton}>
          <MaterialIcons name="send" size={24} color={colors.white} />
        </TouchableOpacity>
      </View>
      <Modal
        animationType="fade"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setModalVisible(false)}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Chọn người nhận</Text>
            <FlatList
              data={participants}
              renderItem={renderParticipant}
              keyExtractor={(item) => item.id.toString()}
            />
            <TouchableOpacity
              style={styles.modalButton}
              onPress={() => {
                setReceiver(null);
                setModalVisible(false);
              }}
            >
              <Text style={styles.modalButtonText}>Gửi nhóm</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.grayLight,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.grayLight,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.navy,
    flex: 1,
    marginLeft: 10,
  },
  messageList: {
    padding: 10,
    flexGrow: 1,
  },
  messageContainer: {
    backgroundColor: colors.white,
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
    maxWidth: '80%',
  },
  myMessage: {
    backgroundColor: colors.blueSky,
    alignSelf: 'flex-end',
  },
  organizerMessage: {
    backgroundColor: colors.blueAccent,
  },
  messageUsername: {
    fontWeight: 'bold',
    color: colors.navy,
    fontSize: 14,
  },
  messageContent: {
    fontSize: 16,
    color: colors.black,
  },
  messageTimestamp: {
    fontSize: 12,
    color: colors.blueGray,
    textAlign: 'right',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.grayLight,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.grayLight,
    borderRadius: 20,
    padding: 10,
    marginRight: 10,
    backgroundColor: colors.grayLight,
    maxHeight: 100,
  },
  sendButton: {
    backgroundColor: colors.bluePrimary,
    borderRadius: 20,
    padding: 10,
  },
  errorText: {
    textAlign: 'center',
    fontSize: 16,
    color: colors.redError,
    marginTop: 20,
  },
  receiverInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.grayLight,
    padding: 10,
    borderTopWidth: 1,
    borderTopColor: colors.gray,
  },
  receiverText: {
    fontSize: 14,
    color: colors.navy,
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: colors.white,
    borderRadius: 10,
    padding: 20,
    width: '80%',
    maxHeight: '60%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.navy,
    marginBottom: 10,
  },
  participantItem: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.grayLight,
  },
  participantText: {
    fontSize: 16,
    color: colors.navy,
  },
  modalButton: {
    backgroundColor: colors.bluePrimary,
    borderRadius: 8,
    padding: 10,
    marginTop: 10,
    alignItems: 'center',
  },
  modalButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default Chat;