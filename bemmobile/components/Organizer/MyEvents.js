import React, { useState, useEffect, useContext } from 'react';
import { ScrollView, View, StyleSheet, Alert, Text, TouchableOpacity } from 'react-native';
import { TextInput, Button, Title, Card, useTheme } from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MyUserContext, MyDispatchContext } from '../../configs/MyContexts';
import Apis, { endpoints, authApis } from '../../configs/Apis';

const MyEvents = () => {
  const theme = useTheme();
  const user = useContext(MyUserContext);
  const dispatch = useContext(MyDispatchContext);

  const [events, setEvents] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [statistics, setStatistics] = useState(null);
  const [loading, setLoading] = useState(false);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (user && user.role === 'organizer') {
      fetchMyEvents();
    }
  }, [user]);

  const fetchMyEvents = async () => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('token');
      console.log('>>> Fetched token:', token);
      if (!token) {
        Alert.alert('Error', 'No authentication token found!');
        setEvents([]);
        return;
      }

      const api = authApis(token);
      console.log('>>> API config:', api.defaults); // Debug full config
      console.log('>>> Request headers:', api.defaults.headers); // Debug headers

      console.log('Flag');
      const res = await api.get(endpoints.myEvents);
      console.log('>>> RES:', res);

      if (Array.isArray(res.data)) {
        setEvents(res.data);
      } else if (res.data && res.data.error) {
        Alert.alert('Error', res.data.error);
        setEvents([]);
      } else {
        Alert.alert('Error', 'Dữ liệu trả về không đúng định dạng. Vui lòng kiểm tra cấu hình backend (URL hoặc quyền truy cập).');
        setEvents([]);
      }
    } catch (error) {
      console.log('>>> Error fetching my events:', error.response || error);
      if (error.response && error.response.status === 401) {
        Alert.alert('Error', 'Authentication failed. Please log in again.');
        await AsyncStorage.removeItem('token');
        await AsyncStorage.removeItem('refresh_token');
        dispatch({ type: 'logout' });
      } else {
        Alert.alert('Error', 'Failed to fetch your events. Please try again.');
      }
      setEvents([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchEventDetails = async (eventId) => {
    try {
      const token = await AsyncStorage.getItem('token');
      console.log('>>> Fetched token for details:', token);
      if (!token) {
        Alert.alert('Error', 'No authentication token found!');
        return null;
      }

      const api = authApis(token);
      console.log('>>> API config for details:', api.defaults);

      const res = await api.get(endpoints['eventDetail'](eventId));
      return res.data;
    } catch (error) {
      console.log('>>> Error fetching event details:', error.response || error);
      if (error.response && error.response.status === 401) {
        Alert.alert('Error', 'Authentication failed. Please log in again.');
        await AsyncStorage.removeItem('token');
        await AsyncStorage.removeItem('refresh_token');
        dispatch({ type: 'logout' });
      } else {
        Alert.alert('Error', 'Failed to fetch event details. Please try again.');
      }
      return null;
    }
  };

  const fetchStatistics = async (eventId) => {
    try {
      const token = await AsyncStorage.getItem('token');
      console.log('>>> Fetched token for statistics:', token);
      if (!token) {
        Alert.alert('Error', 'No authentication token found!');
        return;
      }

      const api = authApis(token);
      console.log('>>> API config for statistics:', api.defaults);

      const res = await api.get(endpoints['event-statistics'](eventId));
      setStatistics(res.data);
    } catch (error) {
      console.log('>>> Error fetching statistics:', error.response || error);
      if (error.response && error.response.status === 401) {
        Alert.alert('Error', 'Authentication failed. Please log in again.');
        await AsyncStorage.removeItem('token');
        await AsyncStorage.removeItem('refresh_token');
        dispatch({ type: 'logout' });
      } else {
        Alert.alert('Error', 'Failed to fetch statistics. Please try again.');
      }
    }
  };

  const handleSelectEvent = async (event) => {
    const detailedEvent = await fetchEventDetails(event.id);
    if (detailedEvent) {
      setSelectedEvent(detailedEvent);
      fetchStatistics(event.id);
    }
  };

  const changeEvent = (field, value) => {
    setSelectedEvent(current => ({ ...current, [field]: value }));
  };

  const updateEvent = async (partial = false) => {
    if (!selectedEvent) return;

    setUpdating(true);
    try {
      const token = await AsyncStorage.getItem('token');
      console.log('>>> Fetched token for update:', token);
      if (!token) {
        Alert.alert('Error', 'You are not logged in!');
        return;
      }

      const data = {
        title: selectedEvent.title,
        description: selectedEvent.description,
        location: selectedEvent.location,
        category: selectedEvent.category,
        start_time: selectedEvent.start_time,
        end_time: selectedEvent.end_time || '',
        total_tickets: selectedEvent.total_tickets || '',
        ticket_price: selectedEvent.ticket_price,
        is_active: selectedEvent.is_active,
      };

      const api = authApis(token);
      console.log('>>> API config for update:', api.defaults);
      console.log('>>> Request headers for update:', api.defaults.headers);

      const res = await api.patch(
        `${endpoints['events']}${selectedEvent.id}/`,
        data,
        { partial }
      );

      Alert.alert('Success', 'Sự kiện đã được cập nhật thành công!');
      fetchMyEvents();
      setSelectedEvent(null);
      setStatistics(null);
    } catch (error) {
      console.log('>>> Error updating event:', error.response || error);
      if (error.response && error.response.status === 401) {
        Alert.alert('Error', 'Authentication failed. Please log in again.');
        await AsyncStorage.removeItem('token');
        await AsyncStorage.removeItem('refresh_token');
        dispatch({ type: 'logout' });
      } else if (error.response?.data) {
        const errors = error.response.data;
        Alert.alert('Error', errors.title ? errors.title[0] : 'Failed to update event. Please try again.');
      } else {
        Alert.alert('Error', 'Failed to update event. Please try again.');
      }
    } finally {
      setUpdating(false);
    }
  };

  if (!user || user.role !== 'organizer') {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Chỉ có organizer mới có thể quản lý sự kiện.</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Title style={styles.title}>Quản Lý Sự Kiện</Title>

      {loading ? (
        <Text style={styles.loadingText}>Đang tải...</Text>
      ) : Array.isArray(events) && events.length > 0 ? (
        events.map(event => (
          <TouchableOpacity key={event.id} onPress={() => handleSelectEvent(event)}>
            <Card style={styles.eventCard}>
              <Card.Content>
                <Text style={styles.eventTitle}>{event.title}</Text>
                <Text>Địa điểm: {event.location}</Text>
                <Text>Thời gian: {new Date(event.start_time).toLocaleString()}</Text>
                <Text>Giá vé: {event.ticket_price || 'Chưa cập nhật'} VNĐ</Text>
              </Card.Content>
            </Card>
          </TouchableOpacity>
        ))
      ) : (
        <Text style={styles.noEventsText}>Không có sự kiện nào để hiển thị.</Text>
      )}

      {selectedEvent && (
        <View style={styles.editContainer}>
          <Title style={styles.subtitle}>Chỉnh Sửa Sự Kiện</Title>

          <TextInput
            label="Tiêu đề"
            value={selectedEvent.title || ''}
            onChangeText={(text) => changeEvent('title', text)}
            style={styles.input}
            mode="outlined"
          />

          <TextInput
            label="Mô tả"
            value={selectedEvent.description || ''}
            onChangeText={(text) => changeEvent('description', text)}
            style={styles.input}
            mode="outlined"
            multiline
            numberOfLines={4}
          />

          <TextInput
            label="Địa điểm"
            value={selectedEvent.location || ''}
            onChangeText={(text) => changeEvent('location', text)}
            style={styles.input}
            mode="outlined"
          />

          <TextInput
            label="Danh mục"
            value={selectedEvent.category || ''}
            onChangeText={(text) => changeEvent('category', text)}
            style={styles.input}
            mode="outlined"
          />

          <TextInput
            label="Thời gian bắt đầu (YYYY-MM-DD HH:MM:SS)"
            value={selectedEvent.start_time || ''}
            onChangeText={(text) => changeEvent('start_time', text)}
            style={styles.input}
            mode="outlined"
          />

          <TextInput
            label="Thời gian kết thúc (YYYY-MM-DD HH:MM:SS)"
            value={selectedEvent.end_time || ''}
            onChangeText={(text) => changeEvent('end_time', text)}
            style={styles.input}
            mode="outlined"
          />

          <TextInput
            label="Số vé tối đa"
            value={selectedEvent.total_tickets?.toString() || ''}
            onChangeText={(text) => changeEvent('total_tickets', text)}
            style={styles.input}
            mode="outlined"
            keyboardType="numeric"
          />

          <TextInput
            label="Giá vé"
            value={selectedEvent.ticket_price?.toString() || ''}
            onChangeText={(text) => changeEvent('ticket_price', text)}
            style={styles.input}
            mode="outlined"
            keyboardType="numeric"
          />

          <View style={styles.buttonRow}>
            <Button
              mode="contained"
              onPress={() => updateEvent(false)}
              loading={updating}
              disabled={updating}
              style={styles.button}
            >
              Cập nhật toàn bộ
            </Button>
            <Button
              mode="outlined"
              onPress={() => updateEvent(true)}
              loading={updating}
              disabled={updating}
              style={styles.button}
            >
              Cập nhật một phần
            </Button>
          </View>

          {statistics && (
            <Card style={styles.statsCard}>
              <Card.Content>
                <Text style={styles.statsTitle}>Thống kê</Text>
                <Text>Vé đã bán: {statistics.tickets_sold}</Text>
                <Text>Doanh thu: {statistics.revenue} VNĐ</Text>
                <Text>Đánh giá trung bình: {statistics.average_rating.toFixed(1)}</Text>
              </Card.Content>
            </Card>
          )}
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 20,
  },
  title: {
    textAlign: 'center',
    marginBottom: 20,
    fontSize: 24,
    fontWeight: 'bold',
  },
  subtitle: {
    textAlign: 'center',
    marginBottom: 15,
    fontSize: 20,
    fontWeight: 'bold',
  },
  eventCard: {
    marginBottom: 15,
    elevation: 4,
  },
  eventTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  input: {
    marginBottom: 15,
  },
  button: {
    paddingVertical: 6,
    borderRadius: 8,
    marginHorizontal: 5,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  statsCard: {
    marginTop: 20,
    elevation: 4,
  },
  statsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  loadingText: {
    textAlign: 'center',
    fontSize: 16,
  },
  noEventsText: {
    textAlign: 'center',
    fontSize: 16,
    color: '#666',
  },
  errorText: {
    textAlign: 'center',
    fontSize: 18,
    color: 'red',
    marginTop: 20,
  },
  editContainer: {
    marginTop: 20,
  },
});

export default MyEvents;