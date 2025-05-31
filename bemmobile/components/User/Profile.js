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
} from 'react-native';
import { TextInput, Button, Title, Text, useTheme, Avatar, Card } from 'react-native-paper';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MyUserContext, MyDispatchContext } from '../../configs/MyContexts';
import Apis, { endpoints, authApis } from '../../configs/Apis';
import * as ImagePicker from 'expo-image-picker';
import { MaterialIcons } from '@expo/vector-icons';
import Notifications from '../../components/Notification/Notifications';
import { colors } from '../../styles/MyStyles';

const Profile = () => {
  const { colors: themeColors } = useTheme();
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
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [isNotificationModalVisible, setIsNotificationModalVisible] = useState(false);

  useEffect(() => {
    if (user) {
      setEmail(user.email);
      setPhone(user.phone);
      setAvatar(user.avatar);
      fetchUserStats();
    } else {
      navigation.navigate('loginStack');
    }
  }, [user, navigation]);

  useFocusEffect(
    React.useCallback(() => {
      fetchUserStats();
      fetchEventsForChat();
    }, [user])
  );

  const fetchUserStats = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        Alert.alert('Lỗi', 'Không tìm thấy token xác thực!');
        return;
      }

      const api = authApis(token);

      const ticketsRes = await api.get(endpoints.userTickets);
      setTicketsCount(ticketsRes.data?.results?.length || ticketsRes.data.length || 0);

      const notificationsRes = await api.get(endpoints.userNotifications);
      const notifications = notificationsRes.data?.results || notificationsRes.data || [];
      const unreadNotifs = notifications.filter(n => !n.is_read).length;
      setUnreadNotifications(unreadNotifs);

      const messagesRes = await api.get(endpoints.userSentMessages);
      const messages = messagesRes.data?.results || messagesRes.data || [];
      const unreadMsgs = messages.filter(m => !m.is_read).length;
      setUnreadMessages(unreadMsgs);
    } catch (error) {
      console.error('Lỗi khi lấy thống kê người dùng:', error);
      if (error.response && error.response.status === 401) {
        Alert.alert('Lỗi', 'Xác thực thất bại. Vui lòng đăng nhập lại.');
        await AsyncStorage.removeItem('token');
        await AsyncStorage.removeItem('refresh_token');
        dispatch({ type: 'logout' });
      } else {
        Alert.alert('Lỗi', 'Không thể lấy thống kê người dùng. Vui lòng thử lại.');
      }
    }
  };

  const handleSelectAvatar = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert('Lỗi', 'Cần cấp quyền truy cập thư viện ảnh!');
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
          Alert.alert('Lỗi', 'Chỉ chấp nhận file PNG, JPG, JPEG!');
          return;
        }

        const response = await fetch(uri);
        const blob = await response.blob();
        if (blob.size > 5 * 1024 * 1024) {
          Alert.alert('Lỗi', 'Ảnh không được lớn hơn 5MB!');
          return;
        }

        setAvatar(uri);
        await handleUpdateAvatar(uri);
      }
    } catch (error) {
      console.error('Lỗi khi chọn ảnh:', error);
      Alert.alert('Lỗi', 'Có lỗi khi chọn ảnh. Vui lòng thử lại!');
    }
  };

  const handleUpdateAvatar = async (uri) => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        Alert.alert('Lỗi', 'Bạn chưa đăng nhập!');
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

      const res = await authApis(token).patch(endpoints.currentUser, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      dispatch({
        type: 'login',
        payload: res.data,
      });

      Alert.alert('Thành công', 'Cập nhật avatar thành công!');
    } catch (error) {
      console.error('Lỗi cập nhật avatar:', error);
      const errorMessage = error.response?.data?.avatar?.[0] || 'Không thể cập nhật avatar. Vui lòng thử lại.';
      Alert.alert('Lỗi', errorMessage);
    }
  };

  const handleUpdate = async () => {
    if (password || confirmPassword) {
      if (password !== confirmPassword) {
        Alert.alert('Lỗi', 'Mật khẩu và xác nhận mật khẩu không khớp.');
        return;
      }
      if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/.test(password)) {
        Alert.alert('Lỗi', 'Mật khẩu phải chứa ít nhất 8 ký tự, bao gồm chữ hoa, chữ thường, số và ký tự đặc biệt.');
        return;
      }
    }

    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        Alert.alert('Lỗi', 'Bạn chưa đăng nhập!');
        return;
      }

      const updatedData = {
        email: email,
        phone: phone,
      };

      if (password) {
        updatedData.password = password;
      }

      const res = await authApis(token).patch(endpoints.currentUser, updatedData);

      dispatch({
        type: 'login',
        payload: res.data,
      });

      setPassword('');
      setConfirmPassword('');

      Alert.alert('Thành công', 'Cập nhật hồ sơ thành công!');
    } catch (error) {
      console.error('Lỗi cập nhật:', error);
      const errorMessage = error.response?.data
        ? Object.values(error.response.data).flat().join(' ')
        : 'Không thể cập nhật hồ sơ. Vui lòng thử lại.';
      Alert.alert('Lỗi', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await AsyncStorage.removeItem('token');
      await AsyncStorage.removeItem('refresh_token');
      dispatch({ type: 'logout' });
    } catch (error) {
      console.error('Lỗi đăng xuất:', error);
      Alert.alert('Lỗi', 'Không thể đăng xuất. Vui lòng thử lại.');
    }
  };

  const handleDeactivate = async () => {
    Alert.alert(
      'Xác nhận vô hiệu hóa',
      'Bạn có chắc chắn muốn vô hiệu hóa tài khoản? Hành động này không thể hoàn tác.',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Vô hiệu hóa',
          style: 'destructive',
          onPress: async () => {
            try {
              const token = await AsyncStorage.getItem('token');
              await authApis(token).post(endpoints.deactivateUser, {});
              await AsyncStorage.removeItem('token');
              await AsyncStorage.removeItem('refresh_token');
              dispatch({ type: 'logout' });
            } catch (error) {
              console.error('Lỗi vô hiệu hóa:', error);
              Alert.alert('Lỗi', 'Không thể vô hiệu hóa tài khoản. Vui lòng thử lại.');
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
    if (!user || !user.username) {
      navigation.navigate('loginStack');
    } else {
      navigation.navigate('chat');
    }
  };

  const closeNotificationModal = () => {
    setIsNotificationModalVisible(false);
  };

  return (
    <SafeAreaView style={[styles.safeArea, { paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 }]}>
      <KeyboardAvoidingView
        style={styles.keyboardAvoidingContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'android' ? 24 : 0}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={handleNotificationsPress} style={styles.iconContainer}>
            <MaterialIcons name="notifications-none" size={28} color={colors.bluePrimary} />
            {unreadNotifications > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{unreadNotifications}</Text>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity onPress={handleChatPress} style={styles.iconContainer}>
            <MaterialIcons name="chat-bubble-outline" size={28} color={colors.bluePrimary} />
            {unreadMessages > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{unreadMessages}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
        <ScrollView
          style={[styles.container, { backgroundColor: colors.grayLight }]}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: Platform.OS === 'android' ? 30 : 20 }]}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.avatarContainer}>
            <TouchableOpacity onPress={handleSelectAvatar}>
              {avatar ? (
                <Image source={{ uri: avatar }} style={styles.avatar} />
              ) : (
                <Avatar.Text size={100} label={user?.username?.[0]?.toUpperCase() || ''} />
              )}
              <View style={styles.editAvatarOverlay}>
                <MaterialIcons name="camera-alt" size={24} color={colors.white} />
              </View>
            </TouchableOpacity>
          </View>

          <Title style={styles.title}>Hồ sơ</Title>

          <Card style={styles.statsCard}>
            <Card.Content>
              <View style={styles.statsRow}>
                <Text style={styles.statsLabel}>Vé đã mua:</Text>
                <Text style={styles.statsValue}>{ticketsCount}</Text>
              </View>
            </Card.Content>
          </Card>

          <View style={styles.infoContainer}>
            <Text style={styles.label}>Tên người dùng:</Text>
            <Text style={styles.value}>{user?.username}</Text>
          </View>

          <View style={styles.infoContainer}>
            <Text style={styles.label}>Vai trò:</Text>
            <Text style={styles.value}>{user?.role}</Text>
          </View>

          <View style={styles.infoContainer}>
            <Text style={styles.label}>Nhóm khách hàng:</Text>
            <Text style={styles.value}>{user?.customer_group}</Text>
          </View>

          <View style={styles.infoContainer}>
            <Text style={styles.label}>Tổng chi tiêu:</Text>
            <Text style={styles.value}>{user?.total_spent} VNĐ</Text>
          </View>

          <View style={styles.infoContainer}>
            <Text style={styles.label}>Ngày tham gia:</Text>
            <Text style={styles.value}>{user?.created_at ? new Date(user.created_at).toLocaleDateString() : ''}</Text>
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
                activeOutlineColor={colors.blueDark}
                autoCapitalize="none"
                keyboardType="email-address"
              />

              <TextInput
                label="Số điện thoại"
                value={phone}
                onChangeText={setPhone}
                style={styles.input}
                mode="outlined"
                outlineColor={colors.bluePrimary}
                activeOutlineColor={colors.blueDark}
                keyboardType="phone-pad"
              />

              <TextInput
                label="Mật khẩu mới"
                value={password}
                onChangeText={setPassword}
                style={styles.input}
                mode="outlined"
                outlineColor={colors.bluePrimary}
                activeOutlineColor={colors.blueDark}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                right={
                  <TextInput.Icon
                    icon={showPassword ? 'eye-off' : 'eye'}
                    onPress={() => setShowPassword(!showPassword)}
                  />
                }
              />

              <TextInput
                label="Xác nhận mật khẩu"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                style={styles.input}
                mode="outlined"
                outlineColor={colors.bluePrimary}
                activeOutlineColor={colors.blueDark}
                secureTextEntry={!showConfirmPassword}
                autoCapitalize="none"
                right={
                  <TextInput.Icon
                    icon={showConfirmPassword ? 'eye-off' : 'eye'}
                    onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                  />
                }
              />
            </Card.Content>
          </Card>

          <Button
            mode="contained"
            onPress={handleUpdate}
            loading={loading}
            disabled={loading}
            style={[styles.button, { backgroundColor: colors.blueDark }]}
            buttonColor={colors.blueDark}
            textColor={colors.white}
          >
            Cập nhật
          </Button>

          <Button
            mode="outlined"
            onPress={handleLogout}
            style={[styles.button, styles.logoutButton]}
            textColor={colors.redAccent}
          >
            Đăng xuất
          </Button>

          <Button
            mode="outlined"
            onPress={handleDeactivate}
            style={[styles.button, styles.deactivateButton]}
            textColor={colors.orangeAccent}
          >
            Vô hiệu hóa tài khoản
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
                <TouchableOpacity onPress={closeNotificationModal} style={styles.closeButton}>
                  <MaterialIcons name="close" size={24} color={colors.blueGray} />
                </TouchableOpacity>
              </View>
              <Notifications
                unreadNotifications={unreadNotifications}
                onClose={closeNotificationModal}
                onUpdateUnreadCount={() => fetchUserStats()}
              />
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
    backgroundColor: colors.redAccent,
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
    elevation: Platform.OS === 'android' ? 4 : 2,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: Platform.OS === 'ios' ? 0.1 : 0.2,
    shadowRadius: 4,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  statsLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.navy,
  },
  statsValue: {
    fontSize: 16,
    color: colors.navy,
  },
  infoContainer: {
    flexDirection: 'row',
    marginBottom: 15,
    paddingHorizontal: 10,
  },
  label: {
    fontWeight: 'bold',
    marginRight: 10,
    fontSize: 16,
    color: colors.navy,
  },
  value: {
    fontSize: 16,
    color: colors.navy,
    flex: 1,
  },
  formCard: {
    marginBottom: 20,
    backgroundColor: colors.white,
    borderRadius: 10,
    elevation: Platform.OS === 'android' ? 4 : 2,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: Platform.OS === 'ios' ? 0.1 : 0.2,
    shadowRadius: 4,
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
  modalContainer: {
    flex: 1,
    backgroundColor: colors.blackTransparent,
    justifyContent: 'center',
  },
  notificationModalContent: {
    backgroundColor: colors.white,
    borderRadius: 10,
    marginHorizontal: 10,
    paddingVertical: 10,
    elevation: Platform.OS === 'android' ? 4 : 2,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: Platform.OS === 'ios' ? 0.1 : 0.2,
    shadowRadius: 4,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 10,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.navy,
  },
  closeButton: {
    padding: 5,
  },
});

export default Profile;