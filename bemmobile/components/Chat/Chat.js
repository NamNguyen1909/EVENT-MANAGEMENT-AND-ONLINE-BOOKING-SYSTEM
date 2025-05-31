// import React, { useState, useEffect, useContext, useRef } from 'react';
// import {
//   View,
//   Text,
//   FlatList,
//   TextInput,
//   TouchableOpacity,
//   StyleSheet,
//   Alert,
//   Platform,
//   StatusBar,
//   Modal,
//   Dimensions,
//   KeyboardAvoidingView,
//   SafeAreaView,
// } from 'react-native';
// import { useNavigation } from '@react-navigation/native';
// import { Button, useTheme } from 'react-native-paper';
// import AsyncStorage from '@react-native-async-storage/async-storage';
// import { MaterialIcons } from '@expo/vector-icons';
// import { MyUserContext } from '../../configs/MyContexts';
// import { authApis, endpoints } from '../../configs/Apis';
// import { colors } from '../../styles/MyStyles';
// import useChatStore from '../Store/chatStore';

// const ChatList = ({ navigation }) => {
//   const { colors: themeColors } = useTheme();
//   const userFromContext = useContext(MyUserContext);
//   const screenHeight = Dimensions.get('window').height;

//   // Zustand state and actions
//   const user = useChatStore((state) => state.user);
//   const setUser = useChatStore((state) => state.setUser);
//   const events = useChatStore((state) => state.events);
//   const setEvents = useChatStore((state) => state.setEvents);
//   const conversations = useChatStore((state) => state.conversations);
//   const setConversations = useChatStore((state) => state.setConversations);
//   const participants = useChatStore((state) => state.participants);
//   const setParticipants = useChatStore((state) => state.setParticipants);
//   const isOrganizer = useChatStore((state) => state.isOrganizer);
//   const setIsOrganizer = useChatStore((state) => state.setIsOrganizer);
//   const typingIndicators = useChatStore((state) => state.typingIndicators);
//   const setTypingIndicator = useChatStore((state) => state.setTypingIndicator);
//   const ws = useChatStore((state) => state.ws);
//   const setWs = useChatStore((state) => state.setWs);

//   const [isEventModalVisible, setIsEventModalVisible] = useState(true);
//   const [eventsLoading, setEventsLoading] = useState(false);
//   const [selectedEvent, setSelectedEvent] = useState(null);
//   const [showChatOptions, setShowChatOptions] = useState(false);
//   const [loading, setLoading] = useState(false);
//   const wsRef = useRef(null);

//   const fetchEvents = async () => {
//     setEventsLoading(true);
//     try {
//       const token = await AsyncStorage.getItem('token');
//       if (!token) return;

//       const api = authApis(token);
//       const eventsRes = await api.get(endpoints.userTickets);
//       const eventsData = (eventsRes.data?.results || eventsRes.data || []).map((item, index) => ({
//         id: item.event_id,
//         title: item.event_title,
//         uniqueKey: `event_${item.event_id}_${index}`,
//       }));

//       const uniqueEvents = [];
//       const seenIds = new Set();
//       for (const event of eventsData) {
//         if (!seenIds.has(event.id)) {
//           seenIds.add(event.id);
//           uniqueEvents.push(event);
//         }
//       }

//       setEvents(uniqueEvents);
//     } catch (error) {
//       console.error('Lỗi khi lấy danh sách sự kiện:', error);
//       Alert.alert('Lỗi', 'Không thể lấy danh sách sự kiện. Vui lòng thử lại.');
//     } finally {
//       setEventsLoading(false);
//     }
//   };

//   const fetchConversations = async (eventId) => {
//     setLoading(true);
//     try {
//       const token = await AsyncStorage.getItem('token');
//       if (!token) {
//         Alert.alert('Lỗi', 'Bạn chưa đăng nhập!');
//         navigation.navigate('loginStack');
//         return;
//       }

//       const api = authApis(token);
//       const response = await api.get(endpoints.eventChatMessages(eventId));
//       const messages = response.data.results || [];
//       console.log('API Conversations:', JSON.stringify(messages, null, 2));

//       const organizerCheck = messages.some((msg) => msg.sender === user.id && msg.is_from_organizer);
//       setIsOrganizer(organizerCheck);

//       const conversationMap = {};
//       messages.forEach((msg, index) => {
//         let otherUserId = null;
//         let isPrivate = false;
//         let displayParticipant = null;

//         // Nếu người dùng là sender hoặc receiver, thêm vào danh sách hội thoại
//         if (msg.sender === user.id || msg.receiver === user.id || msg.user_info?.id === user.id) {
//           if (msg.sender === user.id) {
//             otherUserId = typeof msg.receiver === 'string'
//               ? msg.participants?.find((p) => p.username === msg.receiver)?.id
//               : msg.receiver;
//             isPrivate = true;
//             displayParticipant = msg.participants?.find((p) => p.id === otherUserId) || { username: msg.receiver } || msg.user_info;
//           } else {
//             otherUserId = msg.sender;
//             isPrivate = true;
//             displayParticipant = msg.participants?.find((p) => p.id === otherUserId) || msg.user_info || { username: 'Organizer' };
//           }

//           if (isPrivate && otherUserId) {
//             const privateKey = `private_${eventId}_${otherUserId}_${msg.id || index}_${index}`;
//             if (!conversationMap[privateKey]) {
//               conversationMap[privateKey] = {
//                 id: privateKey,
//                 otherUserId,
//                 lastMessage: msg.message,
//                 lastMessageTime: msg.created_at,
//                 isPrivate: true,
//                 participant: displayParticipant,
//                 messages: [msg],
//               };
//             } else {
//               conversationMap[privateKey].messages.push(msg);
//               if (new Date(msg.created_at) > new Date(conversationMap[privateKey].lastMessageTime || 0)) {
//                 conversationMap[privateKey].lastMessage = msg.message;
//                 conversationMap[privateKey].lastMessageTime = msg.created_at;
//               }
//             }
//           }
//         }
//       });

//       const finalConversations = [];
//       const seenUserIds = new Set();
//       Object.values(conversationMap).forEach((conv) => {
//         if (conv.isPrivate && !seenUserIds.has(conv.otherUserId)) {
//           seenUserIds.add(conv.otherUserId);
//           finalConversations.push(conv);
//         }
//       });

//       console.log('Final Conversations:', JSON.stringify(finalConversations, null, 2));
//       setConversations(finalConversations);
//       setParticipants(messages[0]?.participants || []);
//     } catch (error) {
//       console.error('Lỗi khi lấy hội thoại:', error);
//       Alert.alert('Lỗi', 'Không thể tải danh sách hội thoại. Vui lòng thử lại.');
//     } finally {
//       setLoading(false);
//     }
//   };

//   const initializeWebSocket = async () => {
//     try {
//       const token = await AsyncStorage.getItem('token');
//       if (!token) {
//         Alert.alert('Lỗi', 'Bạn chưa đăng nhập!');
//         navigation.navigate('loginStack');
//         return;
//       }

//       if (wsRef.current) {
//         wsRef.current.close();
//         wsRef.current = null;
//       }

//       const wsUrl = `ws://192.168.1.8:8000/ws/chat/${selectedEvent?.id}/?token=${token}`;
//       const websocket = new WebSocket(wsUrl, [], {
//         headers: {
//           Authorization: `Bearer ${token}`,
//           Origin: 'http://192.168.1.8:8000',
//         },
//       });

//       websocket.onopen = () => {
//         console.log('WebSocket (ChatList) connected successfully');
//         setWs(websocket);
//       };

//       websocket.onmessage = (e) => {
//         try {
//           const data = JSON.parse(e.data);
//           console.log('WebSocket (ChatList) received:', JSON.stringify(data, null, 2));
//           if (data.type === 'typing') {
//             const { event_id, sender_id } = data;
//             setTypingIndicator(`${event_id}_${sender_id}`, true);
//             setTimeout(() => {
//               setTypingIndicator(`${event_id}_${sender_id}`, false);
//             }, 3000);
//           } else if (data.type === 'stop_typing') {
//             const { event_id, sender_id } = data;
//             setTypingIndicator(`${event_id}_${sender_id}`, false);
//           }
//         } catch (error) {
//           console.error('Lỗi xử lý WebSocket message (ChatList):', error);
//         }
//       };

//       websocket.onclose = () => {
//         console.log('WebSocket (ChatList) closed');
//         setTimeout(() => initializeWebSocket(), 2000);
//       };

//       websocket.onerror = (error) => {
//         console.error('WebSocket (ChatList) error:', JSON.stringify(error));
//         Alert.alert('Lỗi', 'Không thể kết nối đến chat (ChatList). Đang thử lại...');
//       };

//       wsRef.current = websocket;
//     } catch (error) {
//       console.error('Lỗi khởi tạo WebSocket (ChatList):', error);
//       Alert.alert('Lỗi', 'Không thể kết nối đến chat (ChatList). Vui lòng thử lại.');
//     }
//   };

//   useEffect(() => {
//     if (!userFromContext) {
//       Alert.alert('Lỗi', 'Bạn cần đăng nhập để sử dụng chat.');
//       navigation.navigate('loginStack');
//       return;
//     }
//     setUser(userFromContext);
//     fetchEvents();
//   }, [userFromContext]);

//   useEffect(() => {
//     if (selectedEvent) {
//       initializeWebSocket();
//     }
//     return () => {
//       if (wsRef.current) {
//         wsRef.current.close();
//         wsRef.current = null;
//       }
//     };
//   }, [selectedEvent]);

//   const selectEvent = (event) => {
//     setSelectedEvent(event);
//     setIsEventModalVisible(false);
//     fetchConversations(event.id);
//   };

//   const chatWithOrganizer = () => {
//     const organizer = participants.find((p) => {
//       const organizerMessage = conversations.some(
//         (c) => c.participant?.id === p.id && c.isPrivate && c.messages.some((m) => m.sender === p.id && m.is_from_organizer)
//       );
//       return !!organizerMessage;
//     });
//     if (organizer) {
//       navigation.navigate('ChatDetail', {
//         eventId: selectedEvent.id,
//         receiverId: organizer.id,
//         receiverUsername: organizer.username,
//       });
//       setShowChatOptions(false);
//     } else {
//       Alert.alert('Lỗi', 'Không tìm thấy ban tổ chức cho sự kiện này.');
//     }
//   };

//   const renderEvent = ({ item }) => (
//     <TouchableOpacity style={styles.eventItem} onPress={() => selectEvent(item)}>
//       <Text style={styles.eventTitle}>{item.title}</Text>
//     </TouchableOpacity>
//   );

//   const renderConversation = ({ item }) => {
//     const isTyping = typingIndicators[`${selectedEvent?.id}_${item.otherUserId}`];

//     return (
//       <TouchableOpacity
//         style={styles.conversationItem}
//         onPress={() =>
//           navigation.navigate('ChatDetail', {
//             eventId: selectedEvent.id,
//             receiverId: item.otherUserId,
//             receiverUsername: item.participant?.username,
//           })
//         }
//       >
//         <Text style={styles.conversationTitle}>{item.participant?.username || 'Unknown'}</Text>
//         {isTyping && <Text style={styles.typingIndicator}>Đang nhập...</Text>}
//       </TouchableOpacity>
//     );
//   };

//   return (
//     <SafeAreaView style={[styles.container, { paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 }]}>
//       <View style={styles.header}>
//         <TouchableOpacity onPress={() => navigation.goBack()}>
//           <MaterialIcons name="arrow-back" size={28} color={colors.navy} />
//         </TouchableOpacity>
//         <Text style={styles.headerTitle}>{selectedEvent ? `Chat - ${selectedEvent.title}` : 'Chat'}</Text>
//         {selectedEvent && (
//           <TouchableOpacity onPress={() => setShowChatOptions(true)}>
//             <MaterialIcons name="person-add" size={28} color={colors.navy} />
//           </TouchableOpacity>
//         )}
//       </View>

//       {selectedEvent ? (
//         <>
//           {loading ? (
//             <Text style={styles.loadingText}>Đang tải hội thoại...</Text>
//           ) : conversations.length > 0 ? (
//             <FlatList
//               data={conversations}
//               renderItem={renderConversation}
//               keyExtractor={(item) => item.id}
//               style={styles.conversationList}
//             />
//           ) : (
//             <Text style={styles.noConversationsText}>Chưa có hội thoại nào với ban tổ chức. Bắt đầu chat ngay!</Text>
//           )}
//         </>
//       ) : null}

//       <Modal
//         animationType="slide"
//         transparent={true}
//         visible={isEventModalVisible}
//         onRequestClose={() => setIsEventModalVisible(false)}
//       >
//         <View style={styles.modalContainer}>
//           <View style={[styles.modalContent, { maxHeight: screenHeight * 0.8 }]}>
//             <View style={styles.modalHeader}>
//               <Text style={styles.modalTitle}>Chọn sự kiện để chat</Text>
//               <TouchableOpacity onPress={() => setIsEventModalVisible(false)} style={styles.closeButton}>
//                 <MaterialIcons name="close" size={24} color={colors.blueGray} />
//               </TouchableOpacity>
//             </View>
//             {eventsLoading ? (
//               <Text style={styles.noEventsText}>Đang tải...</Text>
//             ) : events.length > 0 ? (
//               <FlatList
//                 data={events}
//                 renderItem={renderEvent}
//                 keyExtractor={(item) => item.uniqueKey}
//                 style={styles.eventList}
//               />
//             ) : (
//               <Text style={styles.noEventsText}>Không có sự kiện nào để chat.</Text>
//             )}
//           </View>
//         </View>
//       </Modal>

//       <Modal
//         animationType="slide"
//         transparent={true}
//         visible={showChatOptions}
//         onRequestClose={() => setShowChatOptions(false)}
//       >
//         <View style={styles.modalContainer}>
//           <View style={[styles.modalContent, { maxHeight: screenHeight * 0.8 }]}>
//             <View style={styles.modalHeader}>
//               <Text style={styles.modalTitle}>Chọn đối tượng chat</Text>
//               <TouchableOpacity onPress={() => setShowChatOptions(false)} style={styles.closeButton}>
//                 <MaterialIcons name="close" size={24} color={colors.blueGray} />
//               </TouchableOpacity>
//             </View>
//             <TouchableOpacity style={styles.chatOption} onPress={chatWithOrganizer}>
//               <Text style={styles.chatOptionText}>Chat với ban tổ chức</Text>
//             </TouchableOpacity>
//           </View>
//         </View>
//       </Modal>
//     </SafeAreaView>
//   );
// };

// const ChatDetail = ({ route, navigation }) => {
//   const { eventId, receiverId, receiverUsername } = route.params;
//   const { colors: themeColors } = useTheme();
//   const user = useChatStore((state) => state.user);
//   const messages = useChatStore((state) => state.messages);
//   const setMessages = useChatStore((state) => state.setMessages);
//   const addMessage = useChatStore((state) => state.addMessage);
//   const ws = useChatStore((state) => state.ws);
//   const setWs = useChatStore((state) => state.setWs);
//   const setTypingIndicator = useChatStore((state) => state.setTypingIndicator);

//   const [message, setMessage] = useState('');
//   const [loading, setLoading] = useState(false);
//   const wsRef = useRef(null);
//   const messageCounter = useRef(0);
//   const flatListRef = useRef(null);
//   const typingTimeout = useRef(null);

//   const fetchMessages = async () => {
//     setLoading(true);
//     try {
//       const token = await AsyncStorage.getItem('token');
//       if (!token) {
//         Alert.alert('Lỗi', 'Bạn chưa đăng nhập!');
//         navigation.navigate('loginStack');
//         return;
//       }

//       const api = authApis(token);
//       const response = await api.get(endpoints.eventChatMessages(eventId));
//       const allMessages = response.data.results || [];
//       console.log('API Messages:', JSON.stringify(allMessages, null, 2));

//       const messageMap = new Map();
//       const filteredMessages = allMessages
//         .filter(
//           (msg) =>
//             (msg.sender === user.id || msg.receiver === user.id || msg.user_info?.id === user.id) &&
//             (msg.sender === receiverId || msg.receiver === receiverId || msg.user_info?.id === receiverId)
//         )
//         .map((msg) => ({
//           ...msg,
//           uniqueKey: `msg_${eventId}_${receiverId}_${msg.id || Date.now()}_${msg.created_at || Date.now()}`,
//         }))
//         .forEach((msg) => messageMap.set(msg.id || msg.uniqueKey, msg));

//       const sortedMessages = Array.from(messageMap.values()).sort(
//         (a, b) => new Date(a.created_at) - new Date(b.created_at)
//       );
//       setMessages(sortedMessages);
//     } catch (error) {
//       console.error('Lỗi khi lấy tin nhắn:', error);
//       Alert.alert('Lỗi', 'Không thể tải lịch sử tin nhắn. Vui lòng thử lại.');
//     } finally {
//       setLoading(false);
//     }
//   };

//   const initializeWebSocket = async () => {
//     try {
//       const token = await AsyncStorage.getItem('token');
//       if (!token) {
//         Alert.alert('Lỗi', 'Bạn chưa đăng nhập!');
//         navigation.navigate('loginStack');
//         return;
//       }

//       if (wsRef.current) {
//         wsRef.current.close();
//         wsRef.current = null;
//       }

//       const wsUrl = `ws://192.168.1.8:8000/ws/chat/${eventId}/?token=${token}`;
//       const websocket = new WebSocket(wsUrl, [], {
//         headers: {
//           Authorization: `Bearer ${token}`,
//           Origin: 'http://192.168.1.8:8000',
//         },
//       });

//       websocket.onopen = () => {
//         console.log('WebSocket (ChatDetail) connected successfully');
//         setWs(websocket);
//       };

//       websocket.onmessage = (e) => {
//         try {
//           const data = JSON.parse(e.data);
//           console.log('WebSocket (ChatDetail) received:', JSON.stringify(data, null, 2));
//           if (data.history) {
//             const messageMap = new Map(messages.map((m) => [m.id || m.uniqueKey, m]));
//             const filteredHistory = data.history
//               .filter(
//                 (msg) =>
//                   (msg.sender === user.id || msg.receiver === user.id || msg.user_info?.id === user.id) &&
//                   (msg.sender === receiverId || msg.receiver === receiverId || msg.user_info?.id === receiverId)
//               )
//               .map((msg) => ({
//                 ...msg,
//                 uniqueKey: `msg_${eventId}_${receiverId}_${msg.id || Date.now()}_${msg.created_at || Date.now()}`,
//               }))
//               .forEach((msg) => messageMap.set(msg.id || msg.uniqueKey, msg));

//             const sortedMessages = Array.from(messageMap.values()).sort(
//               (a, b) => new Date(a.created_at) - new Date(b.created_at)
//             );
//             setMessages(sortedMessages);
//           } else if (data.type === 'message') {
//             if (
//               (data.sender === user.id && (data.receiver === receiverId || data.receiver === receiverUsername)) ||
//               (data.sender === receiverId && (data.receiver === user.username || data.receiver === user.id)) ||
//               (data.sender === user.id && data.user_info?.id === receiverId) ||
//               (data.sender === receiverId && data.user_info?.id === user.id)
//             ) {
//               const newMessage = {
//                 ...data,
//                 sender: data.sender || user.id,
//                 user_info: data.user_info || { id: user.id, username: user.username },
//                 created_at: data.created_at || new Date().toISOString(),
//                 uniqueKey: `msg_${eventId}_${receiverId}_${data.id || Date.now()}_${data.created_at || Date.now()}`,
//               };
//               addMessage(newMessage);
//               flatListRef.current?.scrollToEnd({ animated: true });
//             }
//           } else if (data.type === 'typing') {
//             const { event_id, sender_id } = data;
//             setTypingIndicator(`${event_id}_${sender_id}`, true);
//             setTimeout(() => {
//               setTypingIndicator(`${event_id}_${sender_id}`, false);
//             }, 3000);
//           } else if (data.type === 'stop_typing') {
//             const { event_id, sender_id } = data;
//             setTypingIndicator(`${event_id}_${sender_id}`, false);
//           }
//         } catch (error) {
//           console.error('Lỗi xử lý WebSocket message (ChatDetail):', error);
//         }
//       };

//       websocket.onclose = () => {
//         console.log('WebSocket (ChatDetail) closed');
//         setTimeout(() => initializeWebSocket(), 2000);
//       };

//       websocket.onerror = (error) => {
//         console.error('WebSocket (ChatDetail) error:', JSON.stringify(error));
//         Alert.alert('Lỗi', 'Không thể kết nối đến chat (ChatDetail). Đang thử lại...');
//       };

//       wsRef.current = websocket;
//     } catch (error) {
//       console.error('Lỗi khởi tạo WebSocket (ChatDetail):', error);
//       Alert.alert('Lỗi', 'Không thể kết nối đến chat (ChatDetail). Vui lòng thử lại.');
//     }
//   };

//   const sendTypingEvent = (isTyping) => {
//     if (ws && ws.readyState === WebSocket.OPEN) {
//       ws.send(
//         JSON.stringify({
//           type: isTyping ? 'typing' : 'stop_typing',
//           event_id: eventId,
//           sender_id: user.id,
//           receiver_id: receiverId,
//         })
//       );
//     }
//   };

//   const sendMessage = () => {
//     if (!ws || !message.trim()) return;

//     const messageData = {
//       type: 'message',
//       message: message.trim(),
//       receiver_id: receiverId,
//     };

//     try {
//       ws.send(JSON.stringify(messageData));
//       console.log('Sent message:', JSON.stringify(messageData, null, 2));

//       const tempMessage = {
//         message: message.trim(),
//         sender: user.id,
//         receiver: receiverId,
//         user_info: { id: user.id, username: user.username },
//         created_at: new Date().toISOString(),
//         uniqueKey: `msg_${eventId}_${receiverId}_temp_${messageCounter.current++}_${Date.now()}`,
//       };
//       addMessage(tempMessage);
//       setMessage('');
//       sendTypingEvent(false);
//       if (typingTimeout.current) clearTimeout(typingTimeout.current);
//       flatListRef.current?.scrollToEnd({ animated: true });
//     } catch (error) {
//       console.error('Lỗi gửi tin nhắn:', error);
//       Alert.alert('Lỗi', 'Không thể gửi tin nhắn. Vui lòng thử lại.');
//     }
//   };

//   useEffect(() => {
//     if (!user) {
//       Alert.alert('Lỗi', 'Bạn cần đăng nhập để sử dụng chat.');
//       navigation.navigate('loginStack');
//       return;
//     }
//     fetchMessages();
//     initializeWebSocket();
//     return () => {
//       if (wsRef.current) {
//         wsRef.current.close();
//         wsRef.current = null;
//       }
//       if (typingTimeout.current) clearTimeout(typingTimeout.current);
//     };
//   }, [user, eventId, receiverId]);

//   useEffect(() => {
//     if (message.length > 0) {
//       sendTypingEvent(true);
//       if (typingTimeout.current) clearTimeout(typingTimeout.current);
//       typingTimeout.current = setTimeout(() => sendTypingEvent(false), 3000);
//     } else if (message.length === 0 && typingTimeout.current) {
//       clearTimeout(typingTimeout.current);
//       sendTypingEvent(false);
//     }
//   }, [message]);

//   const renderMessage = ({ item }) => {
//     const isOwnMessage = item.sender === user.id || item.user_info?.id === user.id;

//     return (
//       <View style={[styles.messageContainer, isOwnMessage ? styles.ownMessage : styles.otherMessage]}>
//         <Text style={styles.sender}>{item.user_info?.username || 'Unknown'}</Text>
//         <Text style={styles.messageText}>{item.message}</Text>
//         <Text style={styles.timestamp}>
//           {item.created_at ? new Date(item.created_at).toLocaleTimeString() : ''}
//         </Text>
//       </View>
//     );
//   };

//   return (
//     <SafeAreaView style={[styles.container, { paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 }]}>
//       <KeyboardAvoidingView
//         style={styles.container}
//         behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
//         keyboardVerticalOffset={Platform.OS === 'ios' ? 120 : 20}
//       >
//         <View style={styles.header}>
//           <TouchableOpacity onPress={() => navigation.goBack()}>
//             <MaterialIcons name="arrow-back" size={28} color={colors.navy} />
//           </TouchableOpacity>
//           <Text style={styles.headerTitle}>{receiverUsername || 'Chat'}</Text>
//         </View>

//         {loading ? (
//           <Text style={styles.loadingText}>Đang tải tin nhắn...</Text>
//         ) : (
//           <FlatList
//             ref={flatListRef}
//             data={messages}
//             renderItem={renderMessage}
//             keyExtractor={(item) => item.uniqueKey}
//             style={styles.messageList}
//             contentContainerStyle={[styles.messageListContent, { paddingBottom: 120 }]}
//             onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
//             onLayout={() => flatListRef.current?.scrollToEnd({ animated: true })}
//           />
//         )}

//         <View style={styles.inputContainer}>
//           <TextInput
//             style={styles.input}
//             value={message}
//             onChangeText={setMessage}
//             placeholder={`Nhắn đến ${receiverUsername || 'ban tổ chức'}`}
//             placeholderTextColor={colors.blueGray}
//           />
//           <Button
//             mode="contained"
//             onPress={sendMessage}
//             disabled={!message.trim()}
//             style={styles.sendButton}
//             buttonColor={colors.blueDark}
//             textColor={colors.white}
//             icon="send"
//           >
//             Gửi
//           </Button>
//         </View>
//       </KeyboardAvoidingView>
//     </SafeAreaView>
//   );
// };

// import { createStackNavigator } from '@react-navigation/stack';
// const ChatStack = createStackNavigator();

// const Chat = () => (
//   <ChatStack.Navigator screenOptions={{ headerShown: false }}>
//     <ChatStack.Screen name="ChatList" component={ChatList} />
//     <ChatStack.Screen name="ChatDetail" component={ChatDetail} />
//   </ChatStack.Navigator>
// );

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     backgroundColor: '#F8FAFC',
//     paddingHorizontal: 12,
//   },
//   header: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     paddingVertical: 12,
//     paddingHorizontal: 16,
//     backgroundColor: colors.white,
//     borderBottomWidth: 1,
//     borderBottomColor: 'rgba(0, 0, 0, 0.1)',
//     shadowColor: '#000',
//     shadowOffset: { width: 0, height: 2 },
//     shadowOpacity: 0.1,
//     shadowRadius: 4,
//     elevation: 3,
//   },
//   headerTitle: {
//     flex: 1,
//     fontSize: 20,
//     fontWeight: '600',
//     color: colors.navy,
//     textAlign: 'center',
//     letterSpacing: 0.5,
//   },
//   conversationList: {
//     flex: 1,
//     paddingVertical: 10,
//   },
//   conversationItem: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     padding: 16,
//     backgroundColor: colors.white,
//     borderRadius: 12,
//     marginVertical: 6,
//     shadowColor: '#000',
//     shadowOffset: { width: 0, height: 2 },
//     shadowOpacity: 0.15,
//     shadowRadius: 6,
//     elevation: 4,
//   },
//   conversationTitle: {
//     fontSize: 17,
//     fontWeight: '600',
//     color: colors.navy,
//     flex: 1,
//   },
//   typingIndicator: {
//     fontSize: 14,
//     color: colors.blueGray,
//     fontStyle: 'italic',
//   },
//   messageList: {
//     flex: 1,
//     paddingVertical: 12,
//   },
//   messageListContent: {
//     paddingBottom: 120,
//   },
//   messageContainer: {
//     marginVertical: 6,
//     padding: 12,
//     borderRadius: 16,
//     maxWidth: '75%',
//     shadowColor: '#000',
//     shadowOffset: { width: 0, height: 1 },
//     shadowOpacity: 0.1,
//     shadowRadius: 4,
//     elevation: 2,
//   },
//   ownMessage: {
//     backgroundColor: colors.bluePrimary,
//     alignSelf: 'flex-end',
//     borderTopRightRadius: 4,
//   },
//   otherMessage: {
//     backgroundColor: '#E6ECF0',
//     alignSelf: 'flex-start',
//     borderTopLeftRadius: 4,
//     borderWidth: 0,
//   },
//   sender: {
//     fontSize: 13,
//     fontWeight: '600',
//     color: colors.navy,
//     marginBottom: 4,
//   },
//   messageText: {
//     fontSize: 16,
//     color: colors.black,
//     lineHeight: 22,
//   },
//   timestamp: {
//     fontSize: 11,
//     color: colors.blueGray,
//     alignSelf: 'flex-end',
//     marginTop: 4,
//     opacity: 0.7,
//   },
//   inputContainer: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     padding: 12,
//     backgroundColor: colors.white,
//     borderTopWidth: 1,
//     borderTopColor: 'rgba(0, 0, 0, 0.1)',
//     shadowColor: '#000',
//     shadowOffset: { width: 0, height: -2 },
//     shadowOpacity: 0.1,
//     shadowRadius: 4,
//     elevation: 3,
//     flexShrink: 0,
//   },
//   input: {
//     flex: 1,
//     borderWidth: 0,
//     backgroundColor: '#F1F5F9',
//     borderRadius: 24,
//     paddingHorizontal: 16,
//     paddingVertical: 12,
//     fontSize: 16,
//     marginRight: 12,
//     shadowColor: '#000',
//     shadowOffset: { width: 0, height: 1 },
//     shadowOpacity: 0.1,
//     shadowRadius: 4,
//     elevation: 2,
//   },
//   sendButton: {
//     borderRadius: 24,
//     paddingHorizontal: 16,
//     paddingVertical: 8,
//   },
//   loadingText: {
//     textAlign: 'center',
//     fontSize: 16,
//     color: colors.blueGray,
//     marginTop: 20,
//     fontStyle: 'italic',
//   },
//   noConversationsText: {
//     textAlign: 'center',
//     fontSize: 16,
//     color: colors.blueGray,
//     marginTop: 20,
//     fontStyle: 'italic',
//   },
//   modalContainer: {
//     flex: 1,
//     backgroundColor: 'rgba(0, 0, 0, 0.5)',
//     justifyContent: 'center',
//     alignItems: 'center',
//   },
//   modalContent: {
//     backgroundColor: colors.white,
//     borderRadius: 16,
//     marginHorizontal: 16,
//     paddingVertical: 16,
//     width: '90%',
//     shadowColor: '#000',
//     shadowOffset: { width: 0, height: 4 },
//     shadowOpacity: 0.3,
//     shadowRadius: 8,
//     elevation: 6,
//   },
//   modalHeader: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     alignItems: 'center',
//     paddingHorizontal: 20,
//     paddingVertical: 12,
//     borderBottomWidth: 1,
//     borderBottomColor: 'rgba(0, 0, 0, 0.1)',
//   },
//   modalTitle: {
//     fontSize: 20,
//     fontWeight: '600',
//     color: colors.navy,
//   },
//   closeButton: {
//     padding: 8,
//     borderRadius: 20,
//     backgroundColor: '#F1F5F9',
//   },
//   eventList: {
//     paddingHorizontal: 12,
//     paddingVertical: 8,
//   },
//   eventItem: {
//     padding: 16,
//     backgroundColor: colors.white,
//     borderRadius: 12,
//     marginVertical: 6,
//     shadowColor: '#000',
//     shadowOffset: { width: 0, height: 2 },
//     shadowOpacity: 0.15,
//     shadowRadius: 6,
//     elevation: 4,
//   },
//   eventTitle: {
//     fontSize: 17,
//     color: colors.navy,
//     fontWeight: '500',
//   },
//   noEventsText: {
//     textAlign: 'center',
//     fontSize: 16,
//     color: colors.blueGray,
//     padding: 20,
//     fontStyle: 'italic',
//   },
//   chatOption: {
//     padding: 16,
//     backgroundColor: colors.white,
//     borderRadius: 12,
//     marginVertical: 6,
//     marginHorizontal: 12,
//     flexDirection: 'row',
//     alignItems: 'center',
//     shadowColor: '#000',
//     shadowOffset: { width: 0, height: 1 },
//     shadowOpacity: 0.1,
//     shadowRadius: 4,
//     elevation: 2,
//   },
//   chatOptionText: {
//     fontSize: 17,
//     color: colors.navy,
//     fontWeight: '500',
//   },
// });

// export default Chat;

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
  SafeAreaView, // Thêm SafeAreaView cho iOS
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
  const [showChatOptions, setShowChatOptions] = useState(false);
  const [participants, setParticipants] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isOrganizer, setIsOrganizer] = useState(false); // Thêm biến để xác định user là organizer

  const fetchEvents = async () => {
    setEventsLoading(true);
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) return;

      const api = authApis(token);
      const eventsRes = await api.get(endpoints.userTickets);
      const eventsData = (eventsRes.data?.results || eventsRes.data || []).map((item, index) => ({
        id: item.event_id,
        title: item.event_title,
        uniqueKey: `event_${item.event_id}_${index}`,
      }));

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

      // Kiểm tra xem user hiện tại có phải là organizer không
      const organizerCheck = messages.some(msg => msg.sender === user.id && msg.is_from_organizer);
      setIsOrganizer(organizerCheck);

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
              // Nếu user là organizer, hiển thị tên của attendee (receiver)
              if (organizerCheck) {
                displayParticipant = msg.participants?.find(p => p.id === otherUserId) || { username: msg.receiver };
              } else {
                displayParticipant = msg.user_info || { username: 'Organizer' };
              }
            }
          } else {
            otherUserId = msg.sender;
            isPrivate = true;
            // Nếu user là attendee, hiển thị tên của organizer
            if (!organizerCheck) {
              displayParticipant = msg.user_info || { username: 'Organizer' };
            } else {
              // Nếu user là organizer, hiển thị tên của attendee (sender)
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

  const chatWithOrganizer = () => {
    const organizer = participants.find(p => {
      const organizerMessage = conversations.some(c => c.participant?.id === p.id && c.isPrivate && c.messages.some(m => m.sender === p.id && m.is_from_organizer));
      return !!organizerMessage;
    });
    if (organizer) {
      navigation.navigate('ChatDetail', {
        eventId: selectedEvent.id,
        receiverId: organizer.id,
        receiverUsername: organizer.username,
      });
      setShowChatOptions(false);
    } else {
      Alert.alert('Lỗi', 'Không tìm thấy ban tổ chức cho sự kiện này.');
    }
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
          <TouchableOpacity onPress={() => setShowChatOptions(true)}>
            <MaterialIcons name="person-add" size={28} color={colors.navy} />
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
            <Text style={styles.noConversationsText}>Chưa có hội thoại nào với ban tổ chức. Bắt đầu chat ngay!</Text>
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

      <Modal
        animationType="slide"
        transparent={true}
        visible={showChatOptions}
        onRequestClose={() => setShowChatOptions(false)}
      >
        <View style={styles.modalContainer}>
          <View style={[styles.modalContent, { maxHeight: screenHeight * 0.8 }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Chọn đối tượng chat</Text>
              <TouchableOpacity onPress={() => setShowChatOptions(false)} style={styles.closeButton}>
                <MaterialIcons name="close" size={24} color={colors.blueGray} />
              </TouchableOpacity>
            </View>
            <TouchableOpacity style={styles.chatOption} onPress={chatWithOrganizer}>
              <Text style={styles.chatOptionText}>Chat với ban tổ chức</Text>
            </TouchableOpacity>
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
            // Lọc cả tin nhắn gửi và nhận
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
              (data.sender === user.id && data.user_info?.id === receiverId) ||
              (data.sender === receiverId && data.user_info?.id === user.id)
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
        keyboardVerticalOffset={Platform.OS === 'ios' ? 120 : 20} // Tăng offset cho iOS
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
            contentContainerStyle={[styles.messageListContent, { paddingBottom: 120 }]} // Tăng paddingBottom
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
    paddingBottom: 120, // Tăng padding để tránh tràn
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
  chatOption: {
    padding: 16,
    backgroundColor: colors.white,
    borderRadius: 12,
    marginVertical: 6,
    marginHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  chatOptionText: {
    fontSize: 17,
    color: colors.navy,
    fontWeight: '500',
  },
});

export default Chat;