// // Chat.js
// import React, { useState, useEffect, useContext } from 'react';
// import {
//   SafeAreaView,
//   View,
//   StyleSheet,
//   FlatList,
//   Alert,
//   KeyboardAvoidingView,
//   Platform,
//   StatusBar,
// } from 'react-native';
// import { TextInput, Button, Text, useTheme } from 'react-native-paper';
// import AsyncStorage from '@react-native-async-storage/async-storage';
// import { MyUserContext, MyDispatchContext } from '../../configs/MyContexts';
// import { authApis, endpoints, websocketEndpoints } from '../configs/Apis';
// import { colors } from '../styles/MyStyles';

// const Chat = ({ route, navigation }) => {
//   const theme = useTheme();
//   const user = useContext(MyUserContext);
//   const dispatch = useContext(MyDispatchContext);
//   const eventId = route.params?.eventId;

//   const [messages, setMessages] = useState([]);
//   const [message, setMessage] = useState('');
//   const [ws, setWs] = useState(null);
//   const [loading, setLoading] = useState(false);

//   useEffect(() => {
//     if (!user) {
//       Alert.alert('Lỗi', 'Vui lòng đăng nhập để vào phòng chat.', [
//         { text: 'OK', onPress: () => navigation.navigate('loginStack') }
//       ]);
//       return;
//     }

//     if (!eventId) {
//       Alert.alert('Lỗi', 'Vui lòng chọn một sự kiện để vào phòng chat.', [
//         { text: 'OK', onPress: () => navigation.goBack() }
//       ]);
//       return;
//     }

//     // Lấy lịch sử tin nhắn
//     const fetchMessages = async () => {
//       setLoading(true);
//       try {
//         const token = await AsyncStorage.getItem('token');
//         if (!token) {
//           Alert.alert('Lỗi', 'Không tìm thấy token xác thực!', [
//             { text: 'OK', onPress: () => navigation.navigate('loginStack') }
//           ]);
//           return;
//         }

//         const api = authApis(token);
//         const response = await api.get(endpoints.eventChatMessages(eventId));
//         setMessages(response.data?.results || response.data || []);
//       } catch (error) {
//         console.error('Lỗi khi lấy tin nhắn:', error);
//         if (error.response && error.response.status === 401) {
//           Alert.alert('Lỗi', 'Xác thực thất bại. Vui lòng đăng nhập lại.', [
//             { text: 'OK', onPress: () => {
//               AsyncStorage.removeItem('token');
//               AsyncStorage.removeItem('refresh_token');
//               dispatch({ type: 'logout' });
//               navigation.navigate('loginStack');
//             }}
//           ]);
//         } else {
//           Alert.alert('Lỗi', 'Không thể lấy tin nhắn. Vui lòng thử lại.');
//         }
//       } finally {
//         setLoading(false);
//       }
//     };

//     // Kết nối WebSocket
//     const connectWebSocket = async () => {
//       try {
//         const wsUrl = await websocketEndpoints.chat(eventId);
//         const websocket = new WebSocket(wsUrl);

//         websocket.onopen = () => {
//           console.log('WebSocket đã kết nối');
//         };

//         websocket.onmessage = (e) => {
//           const data = JSON.parse(e.data);
//           setMessages((prev) => [...prev, data.message]);
//         };

//         websocket.onclose = () => {
//           console.log('WebSocket đã đóng');
//         };

//         websocket.onerror = (error) => {
//           console.error('Lỗi WebSocket:', error);
//           Alert.alert('Lỗi', 'Không thể kết nối đến phòng chat. Vui lòng thử lại.');
//         };

//         setWs(websocket);
//       } catch (error) {
//         console.error('Lỗi khi kết nối WebSocket:', error);
//         Alert.alert('Lỗi', 'Không thể kết nối đến phòng chat. Vui lòng kiểm tra kết nối mạng hoặc đăng nhập lại.');
//       }
//     };

//     fetchMessages();
//     connectWebSocket();

//     return () => {
//       if (ws) ws.close();
//     };
//   }, [user, eventId, dispatch, navigation]);

//   const sendMessage = async () => {
//     if (!message.trim()) {
//       Alert.alert('Lỗi', 'Tin nhắn không được để trống.');
//       return;
//     }

//     if (ws && ws.readyState === WebSocket.OPEN) {
//       try {
//         ws.send(JSON.stringify({ message }));
//         setMessage('');
//       } catch (error) {
//         console.error('Lỗi khi gửi tin nhắn:', error);
//         Alert.alert('Lỗi', 'Không thể gửi tin nhắn. Vui lòng thử lại.');
//       }
//     } else {
//       Alert.alert('Lỗi', 'Không kết nối được với phòng chat. Vui lòng thử lại.');
//     }
//   };

//   const renderMessage = ({ item }) => (
//     <View style={styles.messageContainer}>
//       <Text style={styles.username}>{item.user_info?.username || 'Unknown'}</Text>
//       <Text style={styles.message}>{item.message}</Text>
//       <Text style={styles.timestamp}>{new Date(item.created_at).toLocaleTimeString()}</Text>
//     </View>
//   );

//   return (
//     <SafeAreaView style={[styles.safeArea, { paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 }]}>
//       <KeyboardAvoidingView
//         style={styles.keyboardAvoidingContainer}
//         behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
//         keyboardVerticalOffset={Platform.OS === 'android' ? 24 : 0}
//       >
//         <View style={[styles.container, { backgroundColor: colors.grayLight }]}>
//           <FlatList
//             data={messages}
//             renderItem={renderMessage}
//             keyExtractor={(item) => item.id.toString()}
//             style={styles.messageList}
//             contentContainerStyle={styles.messageListContent}
//             inverted // Hiển thị tin nhắn mới nhất ở dưới cùng
//           />
//           <View style={styles.inputContainer}>
//             <TextInput
//               label="Nhập tin nhắn"
//               value={message}
//               onChangeText={setMessage}
//               style={styles.input}
//               mode="outlined"
//               outlineColor={colors.bluePrimary}
//               autoCapitalize="none"
//               disabled={loading}
//             />
//             <Button
//               mode="contained"
//               onPress={sendMessage}
//               loading={loading}
//               disabled={loading || !message.trim()}
//               style={[styles.sendButton, { backgroundColor: colors.blueDark }]}
//               buttonColor={colors.blueDark}
//               textColor={colors.white}
//             >
//               Gửi
//             </Button>
//           </View>
//         </View>
//       </KeyboardAvoidingView>
//     </SafeAreaView>
//   );
// };

// const styles = StyleSheet.create({
//   safeArea: {
//     flex: 1,
//     backgroundColor: colors.grayLight,
//   },
//   keyboardAvoidingContainer: {
//     flex: 1,
//   },
//   container: {
//     flex: 1,
//     paddingHorizontal: 10,
//   },
//   messageList: {
//     flex: 1,
//   },
//   messageListContent: {
//     paddingVertical: 10,
//   },
//   messageContainer: {
//     marginVertical: 5,
//     padding: 10,
//     backgroundColor: colors.white,
//     borderRadius: 8,
//     elevation: Platform.OS === 'android' ? 2 : 1,
//     shadowColor: colors.black,
//     shadowOffset: { width: 0, height: 1 },
//     shadowOpacity: Platform.OS === 'ios' ? 0.1 : 0.2,
//     shadowRadius: 2,
//   },
//   username: {
//     fontWeight: 'bold',
//     fontSize: 14,
//     color: colors.navy,
//   },
//   message: {
//     fontSize: 16,
//     color: colors.navy,
//     marginVertical: 2,
//   },
//   timestamp: {
//     fontSize: 12,
//     color: colors.blueGray,
//     alignSelf: 'flex-end',
//   },
//   inputContainer: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     padding: 10,
//     backgroundColor: colors.white,
//     borderTopWidth: 1,
//     borderTopColor: colors.grayLight,
//   },
//   input: {
//     flex: 1,
//     marginRight: 10,
//     backgroundColor: colors.white,
//   },
//   sendButton: {
//     paddingVertical: 6,
//     borderRadius: 8,
//   },
//   errorContainer: {
//     flex: 1,
//     justifyContent: 'center',
//     alignItems: 'center',
//     padding: 20,
//   },
//   errorText: {
//     textAlign: 'center',
//     fontSize: 18,
//     color: colors.redError,
//   },
// });

// export default Chat;

import React from 'react';
import { View, Text } from 'react-native';

const Profile = () => {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text>Chat screen (Placeholder)</Text>
    </View>
  );
};

export default Profile;