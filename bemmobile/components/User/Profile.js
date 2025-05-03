import React, { useState, useContext, useEffect } from 'react';
import { SafeAreaView, View, StyleSheet, Image, ScrollView, Alert, TouchableOpacity } from 'react-native';
import { TextInput, Button, Title, Text, useTheme, Avatar, Card } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MyUserContext, MyDispatchContext } from '../../configs/MyContexts';
import Apis, { endpoints, authApis } from '../../configs/Apis';
import { launchImageLibrary } from 'react-native-image-picker';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const Profile = () => {
  const theme = useTheme();
  const navigation = useNavigation();
  const user = useContext(MyUserContext);
  const dispatch = useContext(MyDispatchContext);

  const [email, setEmail] = useState(user?.email || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [avatar, setAvatar] = useState(user?.avatar || null);
  const [loading, setLoading] = useState(false);
  const [ticketsCount, setTicketsCount] = useState(0);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [unreadMessages, setUnreadMessages] = useState(0);

  useEffect(() => {
    if (user) {
      setEmail(user.email);
      setPhone(user.phone);
      setAvatar(user.avatar);
      fetchUserStats();
    }
  }, [user]);

  const fetchUserStats = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      console.log('>>> token:', token);
      if (!token) {
        Alert.alert('Error', 'No authentication token found!');
        return;
      }

      const api = authApis(token);

      // Lấy số lượng vé
      const ticketsRes = await api.get(endpoints.userTickets);
      setTicketsCount(ticketsRes.data?.results?.length || ticketsRes.data.length || 0);

      // Lấy số thông báo chưa đọc
      const notificationsRes = await api.get(endpoints.userNotifications);
      const notifications = notificationsRes.data?.results || notificationsRes.data || [];
      const unreadNotifs = notifications.filter(n => !n.is_read).length;
      setUnreadNotifications(unreadNotifs);

      // Lấy số tin nhắn chưa đọc
      const messagesRes = await api.get(endpoints.userSentMessages);
      const messages = messagesRes.data?.results || messagesRes.data || [];
      const unreadMsgs = messages.filter(m => !m.is_read).length;
      setUnreadMessages(unreadMsgs);
    } catch (error) {
      console.error('Error fetching user stats:', error);
      if (error.response && error.response.status === 401) {
        Alert.alert('Error', 'Authentication failed. Please log in again.');
        await AsyncStorage.removeItem('token');
        await AsyncStorage.removeItem('refresh_token');
        dispatch({ type: 'logout' });
        navigation.reset({
          index: 0,
          routes: [{ name: 'events', params: { screen: 'HomeScreen' } }],
        });
      } else {
        Alert.alert('Error', 'Failed to fetch user stats. Please try again.');
      }
    }
  };

  const handleSelectAvatar = () => {
    const options = {
      mediaType: 'photo',
      quality: 1,
    };

    launchImageLibrary(options, async (response) => {
      if (response.didCancel) {
        console.log('User cancelled image picker');
      } else if (response.errorCode) {
        console.log('ImagePicker Error: ', response.errorMessage);
        Alert.alert('Error', 'Failed to select image. Please try again.');
      } else {
        const uri = response.assets[0].uri;
        setAvatar(uri);
        await handleUpdateAvatar(uri);
      }
    });
  };

  const handleUpdateAvatar = async (uri) => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        Alert.alert('Error', 'You are not logged in!');
        return;
      }

      const formData = new FormData();
      formData.append('avatar', {
        uri: uri,
        type: 'image/jpeg',
        name: 'avatar.jpg',
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

      Alert.alert('Success', 'Avatar updated successfully!');
    } catch (error) {
      console.error('Update avatar error:', error);
      Alert.alert('Error', 'Failed to update avatar. Please try again.');
    }
  };

  const handleUpdate = async () => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        Alert.alert('Error', 'You are not logged in!');
        return;
      }

      const updatedData = {
        email: email,
        phone: phone,
      };

      const res = await Apis.patch(endpoints.currentUser, updatedData, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      dispatch({
        type: 'login',
        payload: res.data,
      });

      Alert.alert('Success', 'Profile updated successfully!');
    } catch (error) {
      console.error('Update error:', error);
      Alert.alert('Error', 'Failed to update profile. Please try again.');
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
      console.error('Logout error:', error);
      Alert.alert('Error', 'Failed to logout. Please try again.');
    }
  };

  const handleDeactivate = async () => {
    Alert.alert(
      'Confirm Deactivation',
      'Are you sure you want to deactivate your account? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Deactivate',
          style: 'destructive',
          onPress: async () => {
            try {
              const token = await AsyncStorage.getItem('token');
              await Apis.post(endpoints.deactivateUser, {}, {
                headers: {
                  Authorization: `Bearer ${token}`,
                },
              });
              await AsyncStorage.removeItem('token');
              await AsyncStorage.removeItem('refresh_token');
              dispatch({ type: 'logout' });
              navigation.reset({
                index: 0,
                routes: [{ name: 'events', params: { screen: 'HomeScreen' } }],
              });
            } catch (error) {
              console.error('Deactivate error:', error);
              Alert.alert('Error', 'Failed to deactivate account. Please try again.');
            }
          },
        },
      ]
    );
  };

  const handleNotificationsPress = () => {
    Alert.alert('Notifications', `You have ${unreadNotifications} unread notifications.`);
  };

  const handleChatPress = () => {
    navigation.navigate('chat');
  };

  if (!user) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <Text style={styles.errorText}>Please log in to view your profile.</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleNotificationsPress} style={styles.iconContainer}>
          <Icon name="bell-outline" size={28} color={theme.colors.primary} />
          {unreadNotifications > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{unreadNotifications}</Text>
            </View>
          )}
        </TouchableOpacity>
        <TouchableOpacity onPress={handleChatPress} style={styles.iconContainer}>
          <Icon name="chat-outline" size={28} color={theme.colors.primary} />
          {unreadMessages > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{unreadMessages}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>
      <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={styles.avatarContainer}>
          <TouchableOpacity onPress={handleSelectAvatar}>
            {avatar ? (
              <Image source={{ uri: avatar }} style={styles.avatar} />
            ) : (
              <Avatar.Text size={100} label={user.username[0].toUpperCase()} />
            )}
            <View style={styles.editAvatarOverlay}>
              <Icon name="camera" size={24} color="#fff" />
            </View>
          </TouchableOpacity>
        </View>

        <Title style={styles.title}>Profile</Title>

        <Card style={styles.statsCard}>
          <Card.Content>
            <View style={styles.statsRow}>
              <Text style={styles.statsLabel}>Tickets Purchased:</Text>
              <Text style={styles.statsValue}>{ticketsCount}</Text>
            </View>
          </Card.Content>
        </Card>

        <View style={styles.infoContainer}>
          <Text style={styles.label}>Username:</Text>
          <Text style={styles.value}>{user.username}</Text>
        </View>

        <View style={styles.infoContainer}>
          <Text style={styles.label}>Role:</Text>
          <Text style={styles.value}>{user.role}</Text>
        </View>

        <View style={styles.infoContainer}>
          <Text style={styles.label}>Customer Group:</Text>
          <Text style={styles.value}>{user.customer_group}</Text>
        </View>

        <View style={styles.infoContainer}>
          <Text style={styles.label}>Total Spent:</Text>
          <Text style={styles.value}>{user.total_spent} VNĐ</Text>
        </View>

        <View style={styles.infoContainer}>
          <Text style={styles.label}>Joined At:</Text>
          <Text style={styles.value}>{new Date(user.created_at).toLocaleDateString()}</Text>
        </View>

        <TextInput
          label="Email"
          value={email}
          onChangeText={setEmail}
          style={styles.input}
          mode="outlined"
          autoCapitalize="none"
          keyboardType="email-address"
        />

        <TextInput
          label="Phone"
          value={phone}
          onChangeText={setPhone}
          style={styles.input}
          mode="outlined"
          keyboardType="phone-pad"
        />

        <Button
          mode="contained"
          onPress={handleUpdate}
          loading={loading}
          disabled={loading}
          style={styles.button}
        >
          Update Profile
        </Button>

        <Button
          mode="outlined"
          onPress={handleLogout}
          style={[styles.button, styles.logoutButton]}
        >
          Logout
        </Button>

        <Button
          mode="outlined"
          onPress={handleDeactivate}
          style={[styles.button, styles.deactivateButton]}
        >
          Deactivate Account
        </Button>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    paddingTop: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  iconContainer: {
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: 'red',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  container: {
    flex: 1,
    padding: 20,
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
  },
  editAvatarOverlay: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 50,
    padding: 5,
  },
  title: {
    textAlign: 'center',
    marginBottom: 20,
    fontSize: 24,
    fontWeight: 'bold',
  },
  statsCard: {
    marginBottom: 20,
    elevation: 4,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  statsLabel: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  statsValue: {
    fontSize: 16,
  },
  infoContainer: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  label: {
    fontWeight: 'bold',
    marginRight: 10,
    fontSize: 16,
  },
  value: {
    fontSize: 16,
  },
  input: {
    marginBottom: 15,
  },
  button: {
    marginTop: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  logoutButton: {
    borderColor: 'red',
    borderWidth: 1,
  },
  deactivateButton: {
    borderColor: 'orange',
    borderWidth: 1,
  },
  errorText: {
    textAlign: 'center',
    fontSize: 18,
    color: 'red',
    marginTop: 20,
  },
});

export default Profile;