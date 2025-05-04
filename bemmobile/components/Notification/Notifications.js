import React from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { Button } from 'react-native-paper';

const Notifications = ({ unreadNotifications, onClose }) => {
  // Giả sử đây là danh sách thông báo (có thể lấy từ API trong thực tế)
  const notifications = Array.from({ length: unreadNotifications }, (_, i) => ({
    id: i + 1,
    message: `Thông báo số ${i + 1} chưa đọc`,
  }));

  return (
    <View>
      <Text style={{ fontSize: 20, fontWeight: 'bold', marginBottom: 10 }}>Thông báo</Text>
      <ScrollView>
        {notifications.map((notification) => (
          <View key={notification.id} style={{ padding: 10, borderBottomWidth: 1, borderBottomColor: '#ccc' }}>
            <Text>{notification.message}</Text>
          </View>
        ))}
      </ScrollView>
      <Button mode="contained" onPress={onClose} style={{ marginTop: 10 }}>
        Đóng
      </Button>
    </View>
  );
};

export default Notifications;