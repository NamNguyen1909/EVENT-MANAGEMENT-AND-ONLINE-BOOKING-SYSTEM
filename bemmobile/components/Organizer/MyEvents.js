import React, { useState, useEffect, useContext } from 'react';
import { ScrollView, View, StyleSheet, Alert, Text, TouchableOpacity, SafeAreaView } from 'react-native';
import { TextInput, Button, Title, Card, useTheme } from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MyUserContext, MyDispatchContext } from '../../configs/MyContexts';
import Apis, { endpoints, authApis } from '../../configs/Apis';
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Picker } from '@react-native-picker/picker';

const MyEvents = () => {
  const theme = useTheme();
  const user = useContext(MyUserContext);
  const dispatch = useContext(MyDispatchContext);

  const [events, setEvents] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [statistics, setStatistics] = useState(null);
  const [loading, setLoading] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [poster, setPoster] = useState(null);
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);

  const categories = [
    { value: 'music', label: 'Music' },
    { value: 'sports', label: 'Sports' },
    { value: 'seminar', label: 'Seminar' },
    { value: 'conference', label: 'Conference' },
    { value: 'festival', label: 'Festival' },
    { value: 'workshop', label: 'Workshop' },
    { value: 'party', label: 'Party' },
    { value: 'competition', label: 'Competition' },
    { value: 'other', label: 'Other' },
  ];

  useEffect(() => {
    if (user && user.role === 'organizer') {
      fetchMyEvents();
    }
  }, [user]);

  const fetchMyEvents = async () => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        Alert.alert('Error', 'No authentication token found!');
        setEvents([]);
        return;
      }

      const api = authApis(token);
      const res = await api.get(endpoints.myEvents);

      if (Array.isArray(res.data)) {
        setEvents(res.data);
      } else if (res.data && res.data.error) {
        Alert.alert('Error', res.data.error);
        setEvents([]);
      } else {
        Alert.alert('Error', 'Dữ liệu trả về không đúng định dạng. Vui lòng kiểm tra cấu hình backend.');
        setEvents([]);
      }
    } catch (error) {
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
      if (!token) {
        Alert.alert('Error', 'No authentication token found!');
        return null;
      }

      const api = authApis(token);
      const res = await api.get(endpoints['eventDetail'](eventId));
      return res.data;
    } catch (error) {
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
      if (!token) {
        Alert.alert('Error', 'No authentication token found!');
        return;
      }

      const api = authApis(token);
      const res = await api.get(endpoints['eventStatistics'](eventId));
      setStatistics(res.data);
    } catch (error) {
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
      setPoster(detailedEvent.poster || null);
      fetchStatistics(event.id);
    }
  };

  const changeEvent = (field, value) => {
    setSelectedEvent(current => ({ ...current, [field]: value }));
  };

  const pickImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert('Error', 'Permission to access camera roll is required!');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });

    if (!result.cancelled) {
      setPoster(result.uri);
    }
  };

  const onStartDateChange = (event, selectedDate) => {
    setShowStartDatePicker(false);
    if (selectedDate) {
      changeEvent('start_time', selectedDate.toISOString());
    }
  };

  const onEndDateChange = (event, selectedDate) => {
    setShowEndDatePicker(false);
    if (selectedDate) {
      changeEvent('end_time', selectedDate.toISOString());
    }
  };

  const updateEvent = async () => {
    if (!selectedEvent) return;

    setUpdating(true);
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        Alert.alert('Error', 'You are not logged in!');
        return;
      }

      const formData = new FormData();
      formData.append('title', selectedEvent.title || '');
      formData.append('description', selectedEvent.description || '');
      formData.append('location', selectedEvent.location || '');
      formData.append('category', selectedEvent.category || '');
      formData.append('start_time', selectedEvent.start_time || '');
      formData.append('end_time', selectedEvent.end_time || '');
      formData.append('total_tickets', selectedEvent.total_tickets || '');
      formData.append('ticket_price', selectedEvent.ticket_price || '');
      formData.append('is_active', selectedEvent.is_active || false);
      formData.append('latitude', selectedEvent.latitude || '');
      formData.append('longitude', selectedEvent.longitude || '');
      if (poster) {
        formData.append('poster', {
          uri: poster,
          type: 'image/jpeg',
          name: 'poster.jpg',
        });
      }

      const api = authApis(token);
      const res = await api.patch(
        `${endpoints['events']}${selectedEvent.id}/`,
        formData,
        { 
          partial: true, // Luôn sử dụng partial update
          headers: { 'Content-Type': 'multipart/form-data' }
        }
      );

      Alert.alert('Success', 'Sự kiện đã được cập nhật thành công!');
      fetchMyEvents();
      setSelectedEvent(null);
      setStatistics(null);
      setPoster(null);
    } catch (error) {
      if (error.response && error.response.status === 401) {
        Alert.alert('Error', 'Authentication failed. Please log in again.');
        await AsyncStorage.removeItem('token');
        await AsyncStorage.removeItem('refresh_token');
        dispatch({ type: 'logout' });
      } else if (error.response?.data) {
        const errors = error.response.data;
        Alert.alert('Error', errors.title ? errors.title[0] : 'Failed to update event. Please try again1.');
      } else {
        Alert.alert('Error', 'Failed to update event. Please try again2.');
      }
    } finally {
      setUpdating(false);
    }
  };

  if (!user || user.role !== 'organizer') {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
          <Text style={styles.errorText}>Chỉ có organizer mới có thể quản lý sự kiện.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={[styles.container, { backgroundColor: theme.colors.background, paddingBottom: 30 }]}>
        <Title style={styles.title}>Quản Lý Sự Kiện</Title>

        {loading ? (
          <Text style={styles.loadingText}>Đang tải...</Text>
        ) : Array.isArray(events) && events.length > 0 ? (
          events.map(event => (
            <TouchableOpacity key={event.id} onPress={() => handleSelectEvent(event)}>
              <Card style={styles.eventCard}>
                <Card.Content>
                  <Text style={styles.eventTitle}>{event.title}</Text>
                  <Text style={styles.eventText}>Địa điểm: {event.location}</Text>
                  <Text style={styles.eventText}>Thời gian: {new Date(event.start_time).toLocaleString()}</Text>
                  <Text style={styles.eventText}>Giá vé: {event.ticket_price || 'Chưa cập nhật'} VNĐ</Text>
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
              outlineColor={theme.colors.primary}
              theme={{ roundness: 10 }}
            />

            <TextInput
              label="Mô tả"
              value={selectedEvent.description || ''}
              onChangeText={(text) => changeEvent('description', text)}
              style={styles.input}
              mode="outlined"
              outlineColor={theme.colors.primary}
              multiline
              numberOfLines={3}
              theme={{ roundness: 10 }}
            />

            <TextInput
              label="Địa điểm"
              value={selectedEvent.location || ''}
              onChangeText={(text) => changeEvent('location', text)}
              style={styles.input}
              mode="outlined"
              outlineColor={theme.colors.primary}
              theme={{ roundness: 10 }}
            />

            <TextInput
              label="Latitude"
              value={selectedEvent.latitude?.toString() || ''}
              onChangeText={(text) => changeEvent('latitude', text)}
              style={styles.input}
              mode="outlined"
              outlineColor={theme.colors.primary}
              keyboardType="numeric"
              theme={{ roundness: 10 }}
            />

            <TextInput
              label="Longitude"
              value={selectedEvent.longitude?.toString() || ''}
              onChangeText={(text) => changeEvent('longitude', text)}
              style={styles.input}
              mode="outlined"
              outlineColor={theme.colors.primary}
              keyboardType="numeric"
              theme={{ roundness: 10 }}
            />

            <TouchableOpacity style={styles.uploadButton} onPress={pickImage}>
              <Text style={styles.uploadButtonText}>
                {poster ? 'Thay đổi ảnh poster' : 'Tải lên ảnh poster'}
              </Text>
            </TouchableOpacity>
            {poster && <Text style={styles.imageText}>Ảnh đã chọn: {poster.split('/').pop()}</Text>}

            <View style={styles.pickerContainer}>
              <Text style={styles.pickerLabel}>Danh mục</Text>
              <Picker
                selectedValue={selectedEvent.category || ''}
                onValueChange={(itemValue) => changeEvent('category', itemValue)}
                style={styles.picker}
                dropdownIconColor={theme.colors.primary}
              >
                <Picker.Item label="Chọn danh mục" value="" />
                {categories.map((cat) => (
                  <Picker.Item key={cat.value} label={cat.label} value={cat.value} />
                ))}
              </Picker>
            </View>

            <View style={styles.datePickerContainer}>
              <Button mode="contained" onPress={() => setShowStartDatePicker(true)} style={styles.dateButton}>
                Chọn thời gian bắt đầu
              </Button>
              {showStartDatePicker && (
                <DateTimePicker
                  value={new Date(selectedEvent.start_time || Date.now())}
                  mode="datetime"
                  display="spinner"
                  onChange={onStartDateChange}
                  style={styles.datePicker}
                />
              )}
            </View>

            <View style={styles.datePickerContainer}>
              <Button mode="contained" onPress={() => setShowEndDatePicker(true)} style={styles.dateButton}>
                Chọn thời gian kết thúc
              </Button>
              {showEndDatePicker && (
                <DateTimePicker
                  value={new Date(selectedEvent.end_time || Date.now())}
                  mode="datetime"
                  display="spinner"
                  onChange={onEndDateChange}
                  style={styles.datePicker}
                />
              )}
            </View>

            <TextInput
              label="Số vé tối đa"
              value={selectedEvent.total_tickets?.toString() || ''}
              onChangeText={(text) => changeEvent('total_tickets', text)}
              style={styles.input}
              mode="outlined"
              outlineColor={theme.colors.primary}
              keyboardType="number-pad"
              theme={{ roundness: 10 }}
            />

            <TextInput
              label="Giá vé (VNĐ)"
              value={selectedEvent.ticket_price?.toString() || ''}
              onChangeText={(text) => changeEvent('ticket_price', text)}
              style={styles.input}
              mode="outlined"
              outlineColor={theme.colors.primary}
              keyboardType="numeric"
              theme={{ roundness: 10 }}
            />

            <Button
              mode="contained"
              onPress={updateEvent}
              loading={updating}
              disabled={updating}
              style={styles.updateButton}
              labelStyle={styles.buttonLabel}
              contentStyle={styles.buttonContent}
            >
              Cập nhật
            </Button>

            {statistics && (
              <Card style={styles.statsCard}>
                <Card.Content>
                  <Text style={styles.statsTitle}>Thống Kê</Text>
                  <Text style={styles.statsText}>Vé đã bán: {statistics.tickets_sold}</Text>
                  <Text style={styles.statsText}>Doanh thu: {statistics.revenue} VNĐ</Text>
                  <Text style={styles.statsText}>Đánh giá trung bình: {statistics.average_rating.toFixed(1)}</Text>
                </Card.Content>
              </Card>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  container: {
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingVertical: 24,
  },
  title: {
    textAlign: 'center',
    marginBottom: 20,
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
  },
  subtitle: {
    textAlign: 'center',
    marginBottom: 16,
    fontSize: 22,
    fontWeight: '600',
    color: '#444',
  },
  eventCard: {
    marginBottom: 12,
    borderRadius: 10,
    elevation: 3,
    backgroundColor: '#fff',
    padding: 10,
  },
  eventTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  eventText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  input: {
    marginBottom: 15,
    backgroundColor: '#fff',
  },
  uploadButton: {
    padding: 12,
    backgroundColor: '#6200ea',
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 15,
  },
  uploadButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  imageText: {
    fontSize: 12,
    color: '#666',
    marginBottom: 15,
    marginLeft: 10,
  },
  pickerContainer: {
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#6200ea',
    borderRadius: 10,
    backgroundColor: '#fff',
    paddingVertical: 5,
  },
  pickerLabel: {
    fontSize: 12,
    color: '#6200ea',
    marginLeft: 10,
    marginTop: 4,
  },
  picker: {
    height: 50,
    width: '100%',
  },
  datePickerContainer: {
    marginBottom: 15,
    width: '100%',
  },
  dateButton: {
    borderRadius: 8,
    backgroundColor: '#6200ea',
    paddingVertical: 8,
  },
  datePicker: {
    width: '100%',
    backgroundColor: '#fff',
    marginTop: 10,
  },
  updateButton: {
    borderRadius: 8,
    backgroundColor: '#6200ea',
    marginVertical: 20,
  },
  buttonLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  buttonContent: {
    paddingVertical: 8,
  },
  statsCard: {
    marginTop: 20,
    borderRadius: 10,
    elevation: 3,
    backgroundColor: '#fff',
    padding: 15,
  },
  statsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  statsText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  loadingText: {
    textAlign: 'center',
    fontSize: 16,
    color: '#666',
  },
  noEventsText: {
    textAlign: 'center',
    fontSize: 16,
    color: '#888',
  },
  errorText: {
    textAlign: 'center',
    fontSize: 18,
    color: '#d32f2f',
    marginTop: 20,
  },
  editContainer: {
    marginTop: 24,
    paddingBottom: 24,
  },
});

export default MyEvents;