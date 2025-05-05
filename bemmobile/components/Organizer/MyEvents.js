import React, { useState, useEffect, useContext } from 'react';
import { ScrollView, View, StyleSheet, Alert, Text, TouchableOpacity, SafeAreaView, Modal, FlatList, Image } from 'react-native';
import { TextInput, Button, Title, Card, useTheme } from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MyUserContext, MyDispatchContext } from '../../configs/MyContexts';
import Apis, { endpoints, authApis } from '../../configs/Apis';
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker';

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
  const [showEditModal, setShowEditModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);
  const [tempStartDate, setTempStartDate] = useState(null);
  const [tempStartTime, setTempStartTime] = useState(null);
  const [tempEndDate, setTempEndDate] = useState(null);
  const [tempEndTime, setTempEndTime] = useState(null);
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    if (user && user.role === 'organizer') {
      fetchMyEvents();
    }
    fetchCategories();
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
      const res = await api.get(endpoints.myEvents); // Sửa từ api().get thành api.get

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
        console.error("Error fetching my events:", error.response ? error.response.data : error.message);
        Alert.alert('Error', 'Failed to fetch your events. Please try again.');
      }
      setEvents([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await Apis.get(endpoints['categories']); // Sửa từ Apis().get thành Apis.get
      console.log("Categories response:", res.data); // Log dữ liệu trả về
      const categoryData = Object.entries(res.data).map(([value, label]) => ({ value, label }));
      setCategories(categoryData);
    } catch (error) {
      console.error("Error fetching categories:", error.response ? error.response.data : error.message); // Log lỗi chi tiết
      Alert.alert('Error', 'Failed to fetch categories. Using default categories.');
      setCategories([
        { value: 'music', label: 'FakeMusic' },
        { value: 'sports', label: 'Sports' },
        { value: 'seminar', label: 'Seminar' },
        { value: 'conference', label: 'Conference' },
        { value: 'festival', label: 'Festival' },
        { value: 'workshop', label: 'Workshop' },
        { value: 'party', label: 'Party' },
        { value: 'competition', label: 'Competition' },
        { value: 'other', label: 'Other' },
      ]);
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
      const res = await api.get(endpoints['eventDetail'](eventId)); // Sửa từ api().get thành api.get
      return res.data;
    } catch (error) {
      if (error.response && error.response.status === 401) {
        Alert.alert('Error', 'Authentication failed. Please log in again.');
        await AsyncStorage.removeItem('token');
        await AsyncStorage.removeItem('refresh_token');
        dispatch({ type: 'logout' });
      } else {
        console.error("Error fetching event details:", error.response ? error.response.data : error.message);
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
      const res = await api.get(endpoints['eventStatistics'](eventId)); // Sửa từ api().get thành api.get
      setStatistics(res.data);
    } catch (error) {
      if (error.response && error.response.status === 401) {
        Alert.alert('Error', 'Authentication failed. Please log in again.');
        await AsyncStorage.removeItem('token');
        await AsyncStorage.removeItem('refresh_token');
        dispatch({ type: 'logout' });
      } else {
        console.error("Error fetching statistics:", error.response ? error.response.data : error.message);
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
      setShowEditModal(true);
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

    if (!result.canceled) {
      setPoster(result.assets[0].uri);
    }
  };

  const selectCategory = (category) => {
    changeEvent('category', category);
    setShowCategoryModal(false);
  };

  const onStartDateChange = (event, selectedDate) => {
    if (selectedDate) {
      setTempStartDate(selectedDate);
    }
  };

  const confirmStartDate = () => {
    setShowStartDatePicker(false);
    if (tempStartDate) {
      setShowStartTimePicker(true);
    }
  };

  const onStartTimeChange = (event, selectedTime) => {
    if (selectedTime) {
      setTempStartTime(selectedTime);
    }
  };

  const confirmStartTime = () => {
    setShowStartTimePicker(false);
    if (tempStartDate && tempStartTime) {
      const newDate = new Date(tempStartDate);
      newDate.setHours(tempStartTime.getHours(), tempStartTime.getMinutes());
      changeEvent('start_time', newDate.toISOString());
    }
  };

  const onEndDateChange = (event, selectedDate) => {
    if (selectedDate) {
      setTempEndDate(selectedDate);
    }
  };

  const confirmEndDate = () => {
    setShowEndDatePicker(false);
    if (tempEndDate) {
      setShowEndTimePicker(true);
    }
  };

  const onEndTimeChange = (event, selectedTime) => {
    if (selectedTime) {
      setTempEndTime(selectedTime);
    }
  };

  const confirmEndTime = () => {
    setShowEndTimePicker(false);
    if (tempEndDate && tempEndTime) {
      const newDate = new Date(tempEndDate);
      newDate.setHours(tempEndTime.getHours(), tempEndTime.getMinutes());
      changeEvent('end_time', newDate.toISOString());
    }
  };

  const formatDateTime = (isoString) => {
    if (!isoString) return 'Chưa chọn';
    const date = new Date(isoString);
    return date.toLocaleString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
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
      formData.append('total_tickets', selectedEvent.total_tickets ? parseInt(selectedEvent.total_tickets) : 0);
      formData.append('ticket_price', selectedEvent.ticket_price ? parseFloat(selectedEvent.ticket_price).toFixed(2) : '0.00');
      formData.append('is_active', selectedEvent.is_active ? 'true' : 'false');
      formData.append('latitude', selectedEvent.latitude ? parseFloat(selectedEvent.latitude).toString() : '');
      formData.append('longitude', selectedEvent.longitude ? parseFloat(selectedEvent.longitude).toString() : '');
      if (poster) {
        formData.append('poster', {
          uri: poster,
          type: 'image/jpeg',
          name: 'poster.jpg',
        });
      }
  
      // Log dữ liệu gửi đi để debug
      for (let [key, value] of formData.entries()) {
        console.log(`${key}: ${value}`);
      }
  
      const api = authApis(token);
      const res = await api.patch(
        `${endpoints['events']}${selectedEvent.id}/`,
        formData,
        {
          partial: true,
          headers: { 'Content-Type': 'multipart/form-data' },
        }
      );
  
      Alert.alert('Success', 'Sự kiện đã được cập nhật thành công!');
      fetchMyEvents();
      setSelectedEvent(null);
      setStatistics(null);
      setPoster(null);
      setShowEditModal(false);
    } catch (error) {
      if (error.response && error.response.status === 401) {
        Alert.alert('Error', 'Authentication failed. Please log in again.');
        await AsyncStorage.removeItem('token');
        await AsyncStorage.removeItem('refresh_token');
        dispatch({ type: 'logout' });
      } else if (error.response?.data) {
        const errors = error.response.data;
        console.error("Update event error1:", errors);
        Alert.alert('Error', errors.title ? errors.title[0] : 'Failed to update event. Please try again1.');
      } else {
        console.error("Update event error2:", error.message);
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
      </ScrollView>

      {selectedEvent && (
        <Modal
          visible={showEditModal}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setShowEditModal(false)}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <ScrollView contentContainerStyle={styles.modalScrollContent}>
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

                <View style={styles.uploadContainer}>
                  <TouchableOpacity style={styles.uploadButton} onPress={pickImage}>
                    <Text style={styles.uploadButtonText}>
                      {poster ? 'Thay đổi ảnh poster' : 'Tải lên ảnh poster'}
                    </Text>
                  </TouchableOpacity>
                  {poster && (
                    <Image
                      source={{ uri: poster }}
                      style={styles.previewImage}
                      resizeMode="contain"
                    />
                  )}
                </View>

                <View style={styles.categoryContainer}>
                  <Text style={styles.sectionLabel}>Danh mục</Text>
                  <TouchableOpacity
                    style={styles.categoryButton}
                    onPress={() => setShowCategoryModal(true)}
                  >
                    <Text style={styles.categoryButtonText}>
                      {selectedEvent.category
                        ? categories.find(cat => cat.value === selectedEvent.category)?.label
                        : 'Chọn danh mục'}
                    </Text>
                  </TouchableOpacity>
                  <Modal
                    visible={showCategoryModal}
                    transparent={true}
                    animationType="slide"
                    onRequestClose={() => setShowCategoryModal(false)}
                  >
                    <View style={styles.modalContainer}>
                      <View style={styles.modalContent}>
                        <FlatList
                          data={categories}
                          keyExtractor={(item) => item.value}
                          renderItem={({ item }) => (
                            <TouchableOpacity
                              style={styles.categoryItem}
                              onPress={() => selectCategory(item.value)}
                            >
                              <Text style={styles.categoryItemText}>{item.label}</Text>
                            </TouchableOpacity>
                          )}
                        />
                        <Button
                          mode="contained"
                          onPress={() => setShowCategoryModal(false)}
                          style={styles.closeButton}
                        >
                          Đóng
                        </Button>
                      </View>
                    </View>
                  </Modal>
                </View>

                <View style={styles.datePickerContainer}>
                  <Text style={styles.sectionLabel}>Thời gian bắt đầu</Text>
                  <TouchableOpacity
                    style={styles.dateButton}
                    onPress={() => setShowStartDatePicker(true)}
                  >
                    <Text style={styles.dateButtonText}>
                      {formatDateTime(selectedEvent.start_time)}
                    </Text>
                  </TouchableOpacity>
                  <Modal
                    visible={showStartDatePicker}
                    transparent={true}
                    animationType="slide"
                    onRequestClose={() => setShowStartDatePicker(false)}
                  >
                    <View style={styles.modalContainer}>
                      <View style={styles.modalContent}>
                        <Text style={styles.pickerLabel}>Chọn ngày</Text>
                        <DateTimePicker
                          value={tempStartDate || new Date(selectedEvent.start_time || Date.now())}
                          mode="date"
                          display="spinner"
                          onChange={onStartDateChange}
                        />
                        <View style={styles.modalButtonContainer}>
                          <Button
                            mode="contained"
                            onPress={confirmStartDate}
                            style={[styles.confirmButton, { marginRight: 10 }]}
                          >
                            Xác nhận
                          </Button>
                          <Button
                            mode="outlined"
                            onPress={() => setShowStartDatePicker(false)}
                            style={styles.closeButton}
                          >
                            Đóng
                          </Button>
                        </View>
                      </View>
                    </View>
                  </Modal>
                  <Modal
                    visible={showStartTimePicker}
                    transparent={true}
                    animationType="slide"
                    onRequestClose={() => setShowStartTimePicker(false)}
                  >
                    <View style={styles.modalContainer}>
                      <View style={styles.modalContent}>
                        <Text style={styles.pickerLabel}>Chọn giờ</Text>
                        <DateTimePicker
                          value={tempStartTime || new Date(selectedEvent.start_time || Date.now())}
                          mode="time"
                          display="spinner"
                          onChange={onStartTimeChange}
                        />
                        <View style={styles.modalButtonContainer}>
                          <Button
                            mode="contained"
                            onPress={confirmStartTime}
                            style={[styles.confirmButton, { marginRight: 10 }]}
                          >
                            Xác nhận
                          </Button>
                          <Button
                            mode="outlined"
                            onPress={() => setShowStartTimePicker(false)}
                            style={styles.closeButton}
                          >
                            Đóng
                          </Button>
                        </View>
                      </View>
                    </View>
                  </Modal>
                </View>

                <View style={styles.datePickerContainer}>
                  <Text style={styles.sectionLabel}>Thời gian kết thúc</Text>
                  <TouchableOpacity
                    style={styles.dateButton}
                    onPress={() => setShowEndDatePicker(true)}
                  >
                    <Text style={styles.dateButtonText}>
                      {formatDateTime(selectedEvent.end_time)}
                    </Text>
                  </TouchableOpacity>
                  <Modal
                    visible={showEndDatePicker}
                    transparent={true}
                    animationType="slide"
                    onRequestClose={() => setShowEndDatePicker(false)}
                  >
                    <View style={styles.modalContainer}>
                      <View style={styles.modalContent}>
                        <Text style={styles.pickerLabel}>Chọn ngày</Text>
                        <DateTimePicker
                          value={tempEndDate || new Date(selectedEvent.end_time || Date.now())}
                          mode="date"
                          display="spinner"
                          onChange={onEndDateChange}
                        />
                        <View style={styles.modalButtonContainer}>
                          <Button
                            mode="contained"
                            onPress={confirmEndDate}
                            style={[styles.confirmButton, { marginRight: 10 }]}
                          >
                            Xác nhận
                          </Button>
                          <Button
                            mode="outlined"
                            onPress={() => setShowEndDatePicker(false)}
                            style={styles.closeButton}
                          >
                            Đóng
                          </Button>
                        </View>
                      </View>
                    </View>
                  </Modal>
                  <Modal
                    visible={showEndTimePicker}
                    transparent={true}
                    animationType="slide"
                    onRequestClose={() => setShowEndTimePicker(false)}
                  >
                    <View style={styles.modalContainer}>
                      <View style={styles.modalContent}>
                        <Text style={styles.pickerLabel}>Chọn giờ</Text>
                        <DateTimePicker
                          value={tempEndTime || new Date(selectedEvent.end_time || Date.now())}
                          mode="time"
                          display="spinner"
                          onChange={onEndTimeChange}
                        />
                        <View style={styles.modalButtonContainer}>
                          <Button
                            mode="contained"
                            onPress={confirmEndTime}
                            style={[styles.confirmButton, { marginRight: 10 }]}
                          >
                            Xác nhận
                          </Button>
                          <Button
                            mode="outlined"
                            onPress={() => setShowEndTimePicker(false)}
                            style={styles.closeButton}
                          >
                            Đóng
                          </Button>
                        </View>
                      </View>
                    </View>
                  </Modal>
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

                <View style={styles.modalButtonContainer}>
                  <Button
                    mode="contained"
                    onPress={updateEvent}
                    loading={updating}
                    disabled={updating}
                    style={[styles.updateButton, { marginRight: 10 }]}
                    labelStyle={styles.buttonLabel}
                    contentStyle={styles.buttonContent}
                  >
                    Cập nhật
                  </Button>
                  <Button
                    mode="outlined"
                    onPress={() => setShowEditModal(false)}
                    style={styles.closeButton}
                    labelStyle={styles.buttonLabel}
                    contentStyle={styles.buttonContent}
                  >
                    Đóng
                  </Button>
                </View>
              </ScrollView>
            </View>
          </View>
        </Modal>
      )}
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
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 10,
    width: '90%',
    maxHeight: '80%',
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  modalScrollContent: {
    paddingBottom: 20,
  },
  input: {
    marginBottom: 15,
    backgroundColor: '#fff',
  },
  uploadContainer: {
    marginBottom: 15,
    alignItems: 'center',
  },
  uploadButton: {
    padding: 12,
    backgroundColor: '#6200ea',
    borderRadius: 8,
    alignItems: 'center',
  },
  uploadButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  previewImage: {
    width: 200,
    height: 150,
    marginTop: 10,
    borderRadius: 8,
  },
  categoryContainer: {
    marginBottom: 20,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  categoryButton: {
    padding: 12,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#6200ea',
    borderRadius: 10,
    alignItems: 'center',
  },
  categoryButtonText: {
    fontSize: 14,
    color: '#6200ea',
    fontWeight: '600',
  },
  datePickerContainer: {
    marginBottom: 20,
  },
  dateButton: {
    padding: 12,
    backgroundColor: '#6200ea',
    borderRadius: 8,
    alignItems: 'center',
  },
  dateButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  pickerLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
    textAlign: 'center',
  },
  categoryItem: {
    padding: 10,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    marginBottom: 8,
    width: '100%',
  },
  categoryItemText: {
    fontSize: 14,
    color: '#333',
    textAlign: 'center',
  },
  closeButton: {
    borderRadius: 8,
    borderColor: '#6200ea',
  },
  confirmButton: {
    borderRadius: 8,
    backgroundColor: '#6200ea',
  },
  updateButton: {
    borderRadius: 8,
    backgroundColor: '#6200ea',
  },
  buttonLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  buttonContent: {
    paddingVertical: 8,
  },
  modalButtonContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
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
});

export default MyEvents;