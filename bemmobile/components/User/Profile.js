import React, { useState, useContext, useEffect } from 'react';
import {
  SafeAreaView,
  View,
  StyleSheet,
  Image,
  ScrollView,
  Alert,
  TouchableOpacity,
  Modal,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  Dimensions,
  FlatList,
} from 'react-native';
import { TextInput, Button, Title, Text, Avatar, Card } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MyUserContext, MyDispatchContext } from '../../configs/MyContexts';
import Apis, { endpoints, authApis, websocketEndpoints } from '../../configs/Apis';
import * as ImagePicker from 'expo-image-picker';
import { MaterialIcons } from '@expo/vector-icons';
import Notifications from '../../components/Notification/Notifications';
import { colors } from '../../styles/MyStyles';
import Toast from 'react-native-toast-message';

const Profile = () => {
  const navigation = useNavigation();
  const user = useContext(MyUserContext);
  const dispatch = useContext(MyDispatchContext);
  const screenHeight = Dimensions.get('window').height;

  const [email, setEmail] = useState(user?.email || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [avatar, setAvatar] = useState(user?.avatar || null);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [ticketsCount, setTicketsCount] = useState(0);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [unreadMessages, setUnreadMessages] = useState({});
  const [isNotificationModalVisible, setIsNotificationModalVisible] = useState(false);
  const [isChatModalVisible, setIsChatModalVisible] = useState(false);
  const [events, setEvents] = useState([]);
  const [wsConnections, setWsConnections] = useState({});

  useEffect(() => {
    if (user) {
      setEmail(user.email);
      setPhone(user.phone);
      setAvatar(user.avatar);
      fetchUserStats();
      fetchEventsForChat();
    }
  }, [user]);

  useEffect(() => {
    // Kết nối WebSocket chỉ cho các sự kiện hợp lệ
    events.forEach(event => {
      if (event?.id && !wsConnections[event.id]) {
        connectWebSocket(event.id);
      }
    });

    return () => {
      Object.values(wsConnections).forEach(ws => ws?.close());
    };
  }, [events]);

  const connectWebSocket = async (eventId) => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        console.warn(`Không tìm thấy token cho sự kiện ${eventId}`);
        return;
      }

      // Kiểm tra quyền truy cập sự kiện trước khi kết nối
      const api = authApis(token);
      const eventRes = await api.get(endpoints.eventDetail(eventId));
      const ticketsRes = await api.get(endpoints.userTickets);
      const hasTicket = ticketsRes.data.some(t => t.event.id === eventId && t.is_paid);
      const isOrganizer = user.role === 'organizer' && eventRes.data.organizer.id === user.id;
      if (!hasTicket && !isOrganizer) {
        console.warn(`Không có quyền truy cập chat sự kiện ${eventId}`);
        return;
      }

      const wsUrl = `${websocketEndpoints.chat(eventId)}?token=${token}`;
      const websocket = new WebSocket(wsUrl);

      websocket.onopen = () => {
        console.log(`Kết nối WebSocket thành công cho sự kiện ${eventId}`);
      };

      websocket.onmessage = (e) => {
        const data = JSON.parse(e.data);
        if (data.error) {
          console.error(`Lỗi từ server cho sự kiện ${eventId}: ${data.error}`);
          return;
        }
        if (data.message && data.username !== user?.username) {
          setUnreadMessages(prev => ({
            ...prev,
            [eventId]: (prev[eventId] || 0) + 1,
          }));
          Toast.show({
            type: 'info',
            text1: `Tin nhắn mới - Sự kiện ${eventId}`,
            text2: `${data.username}: ${data.message}`,
          });
        }
      };

      websocket.onerror = (error) => {
        console.error(`Lỗi WebSocket cho sự kiện ${eventId}:`, error);
      };

      websocket.onclose = () => {
        console.log(`Đóng WebSocket cho sự kiện ${eventId}`);
        setWsConnections(prev => {
          const newConnections = { ...prev };
          delete newConnections[eventId];
          return newConnections;
        });
      };

      setWsConnections(prev => ({ ...prev, [eventId]: websocket }));
    } catch (err) {
      console.error(`Lỗi kết nối WebSocket cho sự kiện ${eventId}:`, err);
    }
  };

  const fetchUserStats = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        Toast.show({
          type: 'error',
          text1: 'Lỗi',
          text2: 'Không tìm thấy token xác thực!',
        });
        return;
      }

      const api = authApis(token);
      const [ticketsRes, notificationsRes] = await Promise.all([
        api.get(endpoints.userTickets),
        api.get(endpoints.userNotifications),
      ]);

      setTicketsCount(ticketsRes.data?.results?.length || ticketsRes.data.length || 0);
      setUnreadNotifications(notificationsRes.data?.results?.filter(n => !n.is_read).length || 0);

      const messagesRes = await api.get(endpoints.userSentMessages);
      const messages = messagesRes.data?.results || messagesRes.data || [];
      const unreadByEvent = {};
      messages.forEach(msg => {
        if (!msg.is_read) {
          const eventId = msg.event;
          unreadByEvent[eventId] = (unreadByEvent[eventId] || 0) + 1;
        }
      });
      setUnreadMessages(unreadByEvent);
    } catch (error) {
      console.error('Lỗi khi lấy thống kê người dùng:', error);
      if (error.response?.status === 401) {
        Toast.show({
          type: 'error',
          text1: 'Lỗi',
          text2: 'Xác thực thất bại. Vui lòng đăng nhập lại.',
        });
        await AsyncStorage.removeItem('token');
        await AsyncStorage.removeItem('refresh_token');
        dispatch({ type: 'logout' });
      } else {
        Toast.show({
          type: 'error',
          text1: 'Lỗi',
          text2: 'Không thể lấy thông tin thống kê người dùng.',
        });
      }
    }
  };

  const fetchEventsForChat = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) return;

      const api = authApis(token);
      let eventsRes;
      if (user?.role === 'organizer') {
        eventsRes = await api.get(endpoints.myEvents);
      } else {
        eventsRes = await api.get(endpoints.userTickets);
      }
      const eventsData = eventsRes.data?.results || eventsRes.data || [];
      setEvents(eventsData.map(item => item.event || item).filter(event => event?.id));
    } catch (error) {
      console.error('Lỗi khi lấy danh sách sự kiện:', error);
      Toast.show({
        type: 'error',
        text1: 'Lỗi',
        text2: 'Không thể lấy danh sách sự kiện.',
      });
    }
  };

  const handleSelectAvatar = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        Toast.show({
          type: 'error',
          text1: 'Lỗi',
          text2: 'Cần cấp quyền truy cập thư viện ảnh!',
        });
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 1,
      });

      if (!result.canceled) {
        const uri = result.assets[0].uri;
        const fileType = uri.split('.').pop().toLowerCase();
        if (!['png', 'jpg', 'jpeg'].includes(fileType)) {
          Toast.show({
            type: 'error',
            text1: 'Lỗi',
            text2: 'Chỉ chấp nhận file PNG, JPG hoặc JPEG!',
          });
          return;
        }

        const response = await fetch(uri);
        const blob = await response.blob();
        if (blob.size > 5 * 1024 * 1024) {
          Toast.show({
            type: 'error',
            text1: 'Lỗi',
            text2: 'Ảnh không được lớn hơn 5MB!',
          });
          return;
        }

        setAvatar(uri);
        await handleAvatarUpdate(uri);
      }
    } catch (err) {
      console.error('Lỗi khi chọn ảnh:', err);
      Toast.show({
        type: 'error',
        text1: 'Lỗi',
        text2: 'Có lỗi khi chọn ảnh. Vui lòng thử lại!',
      });
    }
  };

  const handleAvatarUpdate = async (uri) => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        Toast.show({
          type: 'error',
          text1: 'Lỗi',
          text2: 'Bạn chưa đăng nhập!',
        });
        return;
      }

      const uriParts = uri.split('.');
      const fileType = uriParts[uriParts.length - 1].toLowerCase();
      const formData = new FormData();
      formData.append('avatar', {
        uri: uri,
        name: `avatar.${fileType}`,
        type: `image/${fileType === 'jpg' ? 'jpeg' : fileType}`,
      });

      const res = await Apis.patch(endpoints.currentUser, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
      });

      dispatch({
        type: 'login',
        payload: res.data,
      });

      Toast.show({
        type: 'success',
        text1: 'Thành công',
        text2: 'Cập nhật ảnh đại diện thành công!',
      });
    } catch (error) {
      console.error('Lỗi cập nhật ảnh đại diện:', error);
      if (error.response?.data) {
        const errors = error.response.data;
        Toast.show({
          type: 'error',
          text1: 'Lỗi',
          text2: errors.avatar ? errors.avatar[0] : 'Không thể cập nhật ảnh đại diện.',
        });
      } else {
        Toast.show({
          type: 'error',
          text1: 'Lỗi',
          text2: 'Không thể cập nhật ảnh đại diện.',
        });
      }
    }
  };

  const handleUpdate = async () => {
    if (password || confirmPassword) {
      if (password !== confirmPassword) {
        Toast.show({
          type: 'error',
          text1: 'Lỗi',
          text2: 'Mật khẩu và xác nhận mật khẩu không khớp.',
        });
        return;
      }
      if (password.length < 8) {
        Toast.show({
          type: 'error',
          text1: 'Lỗi',
          text2: 'Mật khẩu phải có ít nhất 8 ký tự.',
        });
        return;
      }
    }

    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        Toast.show({
          type: 'error',
          text1: 'Lỗi',
          text2: 'Bạn chưa đăng nhập!',
        });
        return;
      }

      const updatedData = {
        email: email,
        phone: phone,
      };

      if (password) {
        updatedData.password = password;
      }

      const res = await Apis.patch(endpoints.currentUser, updatedData, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      dispatch({
        type: 'login',
        payload: res.data,
      });

      setPassword('');
      setConfirmPassword('');

      Toast.show({
        type: 'success',
        text1: 'Thành công',
        text2: 'Cập nhật thông tin hồ sơ thành công!',
      });
    } catch (error) {
      console.error('Lỗi cập nhật thông tin:', error);
      if (error.response?.data) {
        const errors = error.response.data;
        let errorMessage = 'Không thể cập nhật thông tin hồ sơ.';
        if (errors.email) errorMessage = errors.email[0];
        else if (errors.phone) errorMessage = errors.phone[0];
        else if (errors.password) errorMessage = errors.password[0];
        Toast.show({
          type: 'error',
          text1: 'Lỗi',
          text2: errorMessage,
        });
      } else {
        Toast.show({
          type: 'error',
          text1: 'Lỗi',
          text2: 'Không thể cập nhật thông tin hồ sơ.',
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await AsyncStorage.removeItem('token');
      await AsyncStorage.removeItem('refresh_token');
      dispatch({ type: 'logout' });
      setEmail('');
      setPhone('');
      setAvatar(null);
      setTicketsCount(0);
      setUnreadNotifications(0);
      setUnreadMessages({});
      setEvents([]);
      Object.values(wsConnections).forEach(ws => ws?.close());
      setWsConnections({});
      Toast.show({
        type: 'success',
        text1: 'Thành công',
        text2: 'Đăng xuất thành công!',
      });
    } catch (error) {
      console.error('Lỗi đăng xuất:', error);
      Toast.show({
        type: 'error',
        text1: 'Lỗi',
        text2: 'Không thể đăng xuất. Vui lòng thử lại.',
      });
    }
  };

  const handleDeactivate = async () => {
    Alert.alert(
      'Xác nhận vô hiệu hóa tài khoản',
      'Bạn có chắc chắn muốn vô hiệu hóa tài khoản? Hành động này không thể hoàn tác.',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Vô hiệu hóa',
          style: 'destructive',
          onPress: async () => {
            try {
              const token = await AsyncStorage.getItem('token');
              await Apis.post(endpoints.deactivate, {}, {
                headers: {
                  Authorization: `Bearer ${token}`,
                },
              });
              await AsyncStorage.removeItem('token');
              await AsyncStorage.removeItem('refresh_token');
              dispatch({ type: 'logout' });
              setEmail('');
              setPhone('');
              setAvatar(null);
              setTicketsCount(0);
              setUnreadNotifications(0);
              setUnreadMessages({});
              setEvents([]);
              Object.values(wsConnections).forEach(ws => ws?.close());
              setWsConnections({});
              Toast.show({
                type: 'success',
                text1: 'Thành công',
                text2: 'Tài khoản đã được vô hiệu hóa.',
              });
            } catch (error) {
              console.error('Lỗi vô hiệu hóa tài khoản:', error);
              Toast.show({
                type: 'error',
                text1: 'Lỗi',
                text2: 'Không thể vô hiệu hóa tài khoản.',
              });
            }
          },
        },
      ]
    );
  };

  const handleNotificationsPress = async () => {
    await fetchUserStats();
    setIsNotificationModalVisible(true);
  };

  const handleChatPress = () => {
    if (!user) {
      navigation.navigate('loginStack');
      return;
    }
    setIsChatModalVisible(true);
  };

  const closeNotificationModal = () => {
    setIsNotificationModalVisible(false);
  };

  const closeChatModal = () => {
    setIsChatModalVisible(false);
  };

  const renderEvent = ({ item }) => (
    <TouchableOpacity
      style={styles.eventItem}
      onPress={async () => {
        if (!item?.id) {
          Toast.show({
            type: 'error',
            text1: 'Lỗi',
            text2: 'Không tìm thấy ID sự kiện.',
          });
          return;
        }
        try {
          const token = await AsyncStorage.getItem('token');
          if (!token) {
            Toast.show({
              type: 'error',
              text1: 'Lỗi',
              text2: 'Vui lòng đăng nhập lại.',
            });
            navigation.navigate('loginStack');
            return;
          }
          const api = authApis(token);
          const eventRes = await api.get(endpoints.eventDetail(item.id));
          const ticketsRes = await api.get(endpoints.userTickets);
          const hasTicket = ticketsRes.data.some(t => t.event.id === item.id && t.is_paid);
          const isOrganizer = user.role === 'organizer' && eventRes.data.organizer.id === user.id;
          if (!hasTicket && !isOrganizer) {
            Toast.show({
              type: 'error',
              text1: 'Lỗi',
              text2: 'Bạn cần mua vé để tham gia chat.',
            });
            return;
          }
          setIsChatModalVisible(false);
          setUnreadMessages(prev => ({ ...prev, [item.id]: 0 }));
          navigation.navigate('chat', { eventId: item.id });
        } catch (error) {
          console.error('Lỗi kiểm tra quyền chat:', error);
          Toast.show({
            type: 'error',
            text1: 'Lỗi',
            text2: 'Không thể truy cập phòng chat.',
          });
        }
      }}
      accessibilityLabel={`Mở chat cho sự kiện ${item.title || 'sự kiện'}`}
    >
      <Text style={styles.eventTitle}>{item.title || 'Sự kiện không có tên'}</Text>
      {unreadMessages[item.id] > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{unreadMessages[item.id]}</Text>
        </View>
      )}
    </TouchableOpacity>
  );

  if (!user) {
    return (
      <SafeAreaView style={[styles.safeArea, { paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 }]}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Vui lòng đăng nhập để xem thông tin hồ sơ.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 }]}>
      <KeyboardAvoidingView
        style={styles.keyboardAvoidingContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'android' ? 24 : 10}
      >
        <View style={styles.header}>
          <TouchableOpacity 
            onPress={handleNotificationsPress} 
            style={styles.iconContainer}
            accessibilityLabel="Mở thông báo"
          >
            <MaterialIcons name="notifications-none" size={28} color={colors.bluePrimary} />
            {unreadNotifications > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{unreadNotifications}</Text>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity 
            onPress={handleChatPress} 
            style={styles.iconContainer}
            accessibilityLabel="Mở danh sách chat sự kiện"
          >
            <MaterialIcons name="chat-bubble-outline" size={28} color={colors.bluePrimary} />
            {Object.values(unreadMessages).reduce((sum, count) => sum + (count || 0), 0) > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>
                  {Object.values(unreadMessages).reduce((sum, count) => sum + (count || 0), 0)}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
        <ScrollView
          style={[styles.container, { backgroundColor: colors.grayLight }]}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.avatarContainer}>
            <TouchableOpacity 
              onPress={handleSelectAvatar}
              accessibilityLabel="Chọn ảnh đại diện"
            >
              {avatar ? (
                <Image source={{ uri: avatar }} style={styles.avatar} />
              ) : (
                <Avatar.Text size={100} label={user.username[0]?.toUpperCase() || '?'} />
              )}
              <View style={styles.editAvatarOverlay}>
                <MaterialIcons name="camera-alt" size={24} color={colors.white} />
              </View>
            </TouchableOpacity>
          </View>

          <Title style={styles.title}>
            <Text>Thông tin hồ sơ</Text>
          </Title>

          <Card style={styles.statsCard}>
            <Card.Content>
              <View style={styles.statsRow}>
                <Text style={styles.label}>Số vé đã mua:</Text>
                <Text style={styles.text}>{ticketsCount}</Text>
              </View>
            </Card.Content>
          </Card>

          <View style={styles.infoContainer}>
            <Text style={styles.label}>Tên người dùng:</Text>
            <Text style={styles.text}>{user.username}</Text>
          </View>

          <View style={styles.infoContainer}>
            <Text style={styles.label}>Vai trò:</Text>
            <Text style={styles.text}>{user.role === 'organizer' ? 'Người tổ chức' : 'Người dùng'}</Text>
          </View>

          <View style={styles.infoContainer}>
            <Text style={styles.label}>Nhóm khách hàng:</Text>
            <Text style={styles.text}>{user.customer_group || 'Không có'}</Text>
          </View>

          <View style={styles.infoContainer}>
            <Text style={styles.label}>Tổng chi tiêu:</Text>
            <Text style={styles.text}>{user.total_spent ? `${user.total_spent} VNĐ` : '0 VNĐ'}</Text>
          </View>

          <View style={styles.infoContainer}>
            <Text style={styles.label}>Ngày tham gia:</Text>
            <Text style={styles.text}>{new Date(user.created_at).toLocaleDateString('vi-VN')}</Text>
          </View>

          <Card style={styles.formCard}>
            <Card.Content>
              <TextInput
                label="Email"
                value={email}
                onChangeText={setEmail}
                style={styles.input}
                mode="outlined"
                outlineColor={colors.bluePrimary}
                autoCapitalize="none"
                keyboardType="email-address"
                accessibilityLabel="Nhập email"
              />

              <TextInput
                label="Số điện thoại"
                value={phone}
                onChangeText={setPhone}
                style={styles.input}
                mode="outlined"
                outlineColor={colors.bluePrimary}
                keyboardType="phone-pad"
                accessibilityLabel="Nhập số điện thoại"
              />

              <TextInput
                label="Mật khẩu mới"
                value={password}
                onChangeText={setPassword}
                style={styles.input}
                mode="outlined"
                outlineColor={colors.bluePrimary}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                right={
                  <TextInput.Icon
                    icon={showPassword ? 'eye-off' : 'eye'}
                    onPress={() => setShowPassword(!showPassword)}
                    accessibilityLabel={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                  />
                }
                accessibilityLabel="Nhập mật khẩu mới"
              />

              <TextInput
                label="Xác nhận mật khẩu"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                style={styles.input}
                mode="outlined"
                outlineColor={colors.bluePrimary}
                secureTextEntry={!showConfirmPassword}
                autoCapitalize="none"
                right={
                  <TextInput.Icon
                    icon={showConfirmPassword ? 'eye-off' : 'eye'}
                    onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                    accessibilityLabel={showConfirmPassword ? 'Ẩn xác nhận mật khẩu' : 'Hiện xác nhận mật khẩu'}
                  />
                }
                accessibilityLabel="Nhập xác nhận mật khẩu"
              />
            </Card.Content>
          </Card>

          <Button
            mode="contained"
            onPress={handleUpdate}
            loading={loading}
            disabled={loading}
            style={[styles.button, { backgroundColor: colors.blueDark }]}
            accessibilityLabel="Cập nhật thông tin hồ sơ"
          >
            <Text style={styles.buttonText}>Cập nhật</Text>
          </Button>

          <Button
            mode="outlined"
            onPress={handleLogout}
            style={[styles.button, styles.logoutButton]}
            textColor={colors.redAccent}
            accessibilityLabel="Đăng xuất"
          >
            <Text style={styles.buttonText}>Đăng xuất</Text>
          </Button>

          <Button
            mode="outlined"
            onPress={handleDeactivate}
            style={[styles.button, styles.deactivateButton]}
            textColor={colors.orangeAccent}
            accessibilityLabel="Vô hiệu hóa tài khoản"
          >
            <Text style={styles.buttonText}>Vô hiệu hóa tài khoản</Text>
          </Button>
        </ScrollView>

        <Modal
          animationType="slide"
          transparent={true}
          visible={isNotificationModalVisible}
          onRequestClose={closeNotificationModal}
        >
          <SafeAreaView style={[styles.modalContainer, { paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 }]}>
            <View style={[styles.notificationModalContent, { maxHeight: screenHeight * 0.8, flex: 1 }]}>
              <View style={styles.modalHeader}>
                <View style={{ flex: 1 }} />
                <TouchableOpacity 
                  onPress={closeNotificationModal} 
                  style={styles.closeButton}
                  accessibilityLabel="Đóng danh sách thông báo"
                >
                  <MaterialIcons name="close" size={24} color={colors.grey} />
                </TouchableOpacity>
              </View>
              <Notifications
                unreadNotifications={unreadNotifications}
                onClose={closeNotificationModal}
                onUpdateUnreadCount={fetchUserStats}
              />
            </View>
          </SafeAreaView>
        </Modal>

        <Modal
          animationType="slide"
          transparent={true}
          visible={isChatModalVisible}
          onRequestClose={closeChatModal}
        >
          <SafeAreaView style={[styles.modalContainer, { paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 }]}>
            <View style={[styles.modalContent, { maxHeight: screenHeight * 0.8 }]}>
              <View style={styles.modalHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.modalTitle}>Chọn sự kiện để chat</Text>
                </View>
                <TouchableOpacity 
                  onPress={closeChatModal} 
                  style={styles.closeButton}
                  accessibilityLabel="Đóng danh sách sự kiện chat"
                >
                  <MaterialIcons name="close" size={24} color={colors.grey} />
                </TouchableOpacity>
              </View>
              {events.length > 0 ? (
                <FlatList
                  data={events}
                  renderItem={renderEvent}
                  keyExtractor={(item) => item.id?.toString() || Math.random().toString()}
                  style={styles.eventList}
                />
              ) : (
                <Text style={styles.noEventsText}>Không có sự kiện nào để chat.</Text>
              )}
            </View>
          </SafeAreaView>
        </Modal>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  iconContainer: {
    position: 'relative',
    marginLeft: 15,
  },
  badge: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: colors.red,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: 'bold',
  },
  container: {
    flex: 1,
    paddingHorizontal: 20,
  },
  scrollContent: {
    paddingTop: 10,
    paddingBottom: 20,
  },
  avatarContainer: {
    alignItems: 'center',
    marginBottom: 20,
    position: 'relative',
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 2,
    borderColor: colors.bluePrimary,
  },
  editAvatarOverlay: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: colors.blackTransparent,
    borderRadius: 50,
    padding: 5,
  },
  title: {
    textAlign: 'center',
    marginBottom: 20,
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.navy,
  },
  statsCard: {
    marginBottom: 20,
    backgroundColor: colors.white,
    borderRadius: 10,
    elevation: 4,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  label: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.navy,
  },
  text: {
    fontSize: 16,
    color: colors.navy,
  },
  infoContainer: {
    flexDirection: 'row',
    marginBottom: 15,
    paddingHorizontal: 10,
  },
  formCard: {
    marginBottom: 20,
    backgroundColor: colors.white,
    borderRadius: 10,
    elevation: 4,
  },
  input: {
    marginBottom: 15,
    backgroundColor: colors.white,
  },
  button: {
    marginTop: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  logoutButton: {
    borderColor: colors.redAccent,
    borderWidth: 1,
  },
  deactivateButton: {
    borderColor: colors.orangeAccent,
    borderWidth: 1,
  },
  buttonText: {
    fontSize: 16,
    color: colors.white,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  notificationModalContent: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    width: '100%',
    position: 'absolute',
    bottom: 0,
  },
  modalContent: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    width: '100%',
    position: 'absolute',
    bottom: 0,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.navy,
  },
  closeButton: {
    padding: 5,
  },
  eventList: {
    flexGrow: 0,
  },
  eventItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    backgroundColor: colors.white,
    borderRadius: 8,
    marginBottom: 10,
    elevation: 2,
  },
  eventTitle: {
    fontSize: 16,
    color: colors.navy,
    flex: 1,
  },
  noEventsText: {
    textAlign: 'center',
    fontSize: 16,
    color: colors.grey,
    marginTop: 20,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
    color: colors.red,
  },
});

export default Profile;