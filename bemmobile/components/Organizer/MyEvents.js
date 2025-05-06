import React, { useState, useEffect, useContext } from 'react';
import { View, StyleSheet, Alert, Text, TouchableOpacity, SafeAreaView, Modal, FlatList, Image } from 'react-native';
import { TextInput, Button, Title, Card, useTheme, IconButton } from 'react-native-paper';
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
  const [reviews, setReviews] = useState([]);
  const [visibleReviews, setVisibleReviews] = useState(3);
  const [fetchingReviews, setFetchingReviews] = useState(false);
  const [showImageOptions, setShowImageOptions] = useState(false);

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
      const res = await Apis.get(endpoints['categories']);
      console.log("Categories response:", res.data);
      const categoryData = Object.entries(res.data).map(([value, label]) => ({ value, label }));
      setCategories(categoryData);
    } catch (error) {
      console.error("Error fetching categories:", error.response ? error.response.data : error.message);
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
      const res = await api.get(endpoints['eventDetail'](eventId));
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
      const res = await api.get(endpoints['eventStatistics'](eventId));
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

  const fetchEventReviews = async (eventId) => {
    setFetchingReviews(true);
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        Alert.alert('Error', 'No authentication token found!');
        return;
      }

      const api = authApis(token);
      const res = await api.get(endpoints.getReviewsOrganizer(eventId));
      setReviews(res.data.results || []);
    } catch (error) {
      console.error("Error fetching reviews:", error.response ? error.response.data : error.message);
      Alert.alert('Error', 'Failed to fetch reviews. Please try again.');
    } finally {
      setFetchingReviews(false);
    }
  };

  const handleSelectEvent = async (event) => {
    const detailedEvent = await fetchEventDetails(event.id);
    if (detailedEvent) {
      setSelectedEvent(detailedEvent);
      setPoster(detailedEvent.poster || null);
      fetchStatistics(event.id);
      fetchEventReviews(event.id);
      setShowEditModal(true);
      setVisibleReviews(3);
    }
  };

  const changeEvent = (field, value) => {
    setSelectedEvent(current => ({ ...current, [field]: value }));
  };

  const pickImage = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert('Error', 'Cần cấp quyền truy cập thư viện ảnh!');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 1,
      });
      if (!result.canceled) {
        const uri = result.assets[0].uri;
        const fileType = uri.split('.').pop().toLowerCase();
        if (!['png', 'jpg', 'jpeg'].includes(fileType)) {
          Alert.alert('Error', 'Chỉ chấp nhận file PNG, JPG, JPEG!');
          return;
        }
        const response = await fetch(uri);
        const blob = await response.blob();
        if (blob.size > 5 * 1024 * 1024) {
          Alert.alert('Error', 'Ảnh không được lớn hơn 5MB!');
          return;
        }
        setPoster(uri);
        setShowImageOptions(false);
      }
    } catch (error) {
      console.error('Error picking image from library:', error);
      Alert.alert('Error', 'Có lỗi khi chọn ảnh. Vui lòng thử lại!');
    }
  };

  const pickImageFromCamera = async () => {
    try {
      const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert('Error', 'Cần cấp quyền truy cập camera!');
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 1,
      });
      if (!result.canceled) {
        const uri = result.assets[0].uri;
        const fileType = uri.split('.').pop().toLowerCase();
        if (!['png', 'jpg', 'jpeg'].includes(fileType)) {
          Alert.alert('Error', 'Chỉ chấp nhận file PNG, JPG, JPEG!');
          return;
        }
        const response = await fetch(uri);
        const blob = await response.blob();
        if (blob.size > 5 * 1024 * 1024) {
          Alert.alert('Error', 'Ảnh không được lớn hơn 5MB!');
          return;
        }
        setPoster(uri);
        setShowImageOptions(false);
      }
    } catch (error) {
      console.error('Error picking image from camera:', error);
      Alert.alert('Error', 'Có lỗi khi chụp ảnh. Vui lòng thử lại!');
    }
  };

  const removeImage = () => {
    setPoster(null);
    setShowImageOptions(false);
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

      if (poster && !poster.startsWith('http')) {
        const uriParts = poster.split('.');
        const fileType = uriParts[uriParts.length - 1].toLowerCase();
        const response = await fetch(poster);
        const blob = await response.blob();
        formData.append('poster', {
          uri: poster,
          name: `poster.${fileType}`,
          type: `image/${fileType === 'jpg' ? 'jpeg' : fileType}`,
        });
      }

      for (let [key, value] of formData.entries()) {
        console.log(`${key}: ${value instanceof Blob ? `File/Blob (size: ${value.size})` : value.toString()}`);
      }

      const api = authApis(token);
      const res = await api.patch(
        `${endpoints['events']}${selectedEvent.id}/`,
        formData,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      Alert.alert('Success', 'Sự kiện đã được cập nhật thành công!');
      fetchMyEvents();
      setSelectedEvent(null);
      setStatistics(null);
      setPoster(null);
      setShowImageOptions(false);
      setShowEditModal(false);
    } catch (error) {
      if (error.response && error.response.status === 401) {
        Alert.alert('Error', 'Authentication failed. Please log in again.');
        await AsyncStorage.removeItem('token');
        await AsyncStorage.removeItem('refresh_token');
        dispatch({ type: 'logout' });
      } else if (error.response?.data) {
        const errors = error.response.data;
        console.error("Update event error:", errors);
        Alert.alert('Error', errors.detail || 'Failed to update event. Please try again.');
      } else {
        console.error("Update event error:", error.message);
        Alert.alert('Error', 'Server error (500). Please contact support or try again later.');
      }
    } finally {
      setUpdating(false);
    }
  };

  const modalData = [
    {
      type: 'title',
      content: <Title style={styles.subtitle}>Chỉnh Sửa Sự Kiện</Title>,
    },
    {
      type: 'input',
      content: (
        <TextInput
          label="Tiêu đề"
          value={selectedEvent?.title || ''}
          onChangeText={(text) => changeEvent('title', text)}
          style={styles.input}
          mode="outlined"
          outlineColor={theme.colors.primary}
          theme={{ roundness: 10 }}
        />
      ),
    },
    {
      type: 'input',
      content: (
        <TextInput
          label="Mô tả"
          value={selectedEvent?.description || ''}
          onChangeText={(text) => changeEvent('description', text)}
          style={styles.input}
          mode="outlined"
          outlineColor={theme.colors.primary}
          multiline
          numberOfLines={3}
          theme={{ roundness: 10 }}
        />
      ),
    },
    {
      type: 'input',
      content: (
        <TextInput
          label="Địa điểm"
          value={selectedEvent?.location || ''}
          onChangeText={(text) => changeEvent('location', text)}
          style={styles.input}
          mode="outlined"
          outlineColor={theme.colors.primary}
          theme={{ roundness: 10 }}
        />
      ),
    },
    {
      type: 'input',
      content: (
        <TextInput
          label="Latitude"
          value={selectedEvent?.latitude?.toString() || ''}
          onChangeText={(text) => changeEvent('latitude', text)}
          style={styles.input}
          mode="outlined"
          outlineColor={theme.colors.primary}
          keyboardType="numeric"
          theme={{ roundness: 10 }}
        />
      ),
    },
    {
      type: 'input',
      content: (
        <TextInput
          label="Longitude"
          value={selectedEvent?.longitude?.toString() || ''}
          onChangeText={(text) => changeEvent('longitude', text)}
          style={styles.input}
          mode="outlined"
          outlineColor={theme.colors.primary}
          keyboardType="numeric"
          theme={{ roundness: 10 }}
        />
      ),
    },
    {
      type: 'upload',
      content: (
        <View style={styles.uploadContainer}>
          <TouchableOpacity onPress={() => setShowImageOptions(!showImageOptions)}>
            {poster ? (
              <Image
                source={{ uri: poster }}
                style={styles.previewImage}
                resizeMode="contain"
              />
            ) : (
              <View style={styles.placeholderImage}>
                <Text style={styles.placeholderText}>Chọn ảnh poster</Text>
              </View>
            )}
          </TouchableOpacity>
          {poster && (
            <IconButton
              icon="close"
              size= {20}
              onPress={removeImage}
              style={styles.removeImageButton}
            />
          )}
          {showImageOptions && (
            <View style={styles.imageOptionsContainer}>
              <Button mode="outlined" onPress={pickImage} style={styles.imageOptionButton}>
                Thư viện
              </Button>
              <Button mode="outlined" onPress={pickImageFromCamera} style={styles.imageOptionButton}>
                Chụp ảnh
              </Button>
            </View>
          )}
        </View>
      ),
    },
    {
      type: 'category',
      content: (
        <View style={styles.categoryContainer}>
          <Text style={styles.sectionLabel}>Danh mục</Text>
          <TouchableOpacity
            style={styles.categoryButton}
            onPress={() => setShowCategoryModal(true)}
          >
            <Text style={styles.categoryButtonText}>
              {selectedEvent?.category
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
      ),
    },
    {
      type: 'datePicker',
      content: (
        <View style={styles.datePickerContainer}>
          <Text style={styles.sectionLabel}>Thời gian bắt đầu</Text>
          <TouchableOpacity
            style={styles.dateButton}
            onPress={() => setShowStartDatePicker(true)}
          >
            <Text style={styles.dateButtonText}>
              {formatDateTime(selectedEvent?.start_time)}
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
                  value={tempStartDate || new Date(selectedEvent?.start_time || Date.now())}
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
                  value={tempStartTime || new Date(selectedEvent?.start_time || Date.now())}
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
      ),
    },
    {
      type: 'datePicker',
      content: (
        <View style={styles.datePickerContainer}>
          <Text style={styles.sectionLabel}>Thời gian kết thúc</Text>
          <TouchableOpacity
            style={styles.dateButton}
            onPress={() => setShowEndDatePicker(true)}
          >
            <Text style={styles.dateButtonText}>
              {formatDateTime(selectedEvent?.end_time)}
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
                  value={tempEndDate || new Date(selectedEvent?.end_time || Date.now())}
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
                  value={tempEndTime || new Date(selectedEvent?.end_time || Date.now())}
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
      ),
    },
    {
      type: 'input',
      content: (
        <TextInput
          label="Số vé tối đa"
          value={selectedEvent?.total_tickets?.toString() || ''}
          onChangeText={(text) => changeEvent('total_tickets', text)}
          style={styles.input}
          mode="outlined"
          outlineColor={theme.colors.primary}
          keyboardType="number-pad"
          theme={{ roundness: 10 }}
        />
      ),
    },
    {
      type: 'input',
      content: (
        <TextInput
          label="Giá vé (VNĐ)"
          value={selectedEvent?.ticket_price?.toString() || ''}
          onChangeText={(text) => changeEvent('ticket_price', text)}
          style={styles.input}
          mode="outlined"
          outlineColor={theme.colors.primary}
          keyboardType="numeric"
          theme={{ roundness: 10 }}
        />
      ),
    },
    ...(statistics
      ? [
          {
            type: 'statistics',
            content: (
              <Card style={styles.statsCard}>
                <Card.Content>
                  <Text style={styles.statsTitle}>Thống Kê</Text>
                  <Text style={styles.statsText}>Vé đã bán: {statistics.tickets_sold}</Text>
                  <Text style={styles.statsText}>Doanh thu: {statistics.revenue} VNĐ</Text>
                  <Text style={styles.statsText}>Đánh giá trung bình: {statistics.average_rating.toFixed(1)}</Text>
                </Card.Content>
              </Card>
            ),
          },
        ]
      : []),
    ...(reviews.length > 0
      ? [
          {
            type: 'reviews',
            content: (
              <View style={styles.reviewsContainer}>
                <Title style={styles.sectionTitle}>Đánh giá từ người dùng</Title>
                <FlatList
                  data={reviews.slice(0, visibleReviews)}
                  keyExtractor={(item) => item.id.toString()}
                  renderItem={({ item }) => (
                    <Card style={styles.reviewCard}>
                      <Card.Content>
                        <Text style={styles.reviewUsername}>
                          {item.user_infor.username}
                        </Text>
                        <Text style={styles.reviewRating}>
                          Đánh giá: {item.rating} sao
                        </Text>
                        <Text style={styles.reviewComment}>
                          {item.comment}
                        </Text>
                        <Text style={styles.reviewDate}>
                          {new Date(item.created_at).toLocaleString('vi-VN')}
                        </Text>
                      </Card.Content>
                    </Card>
                  )}
                  scrollEnabled={false}
                  ListFooterComponent={() =>
                    reviews.length > visibleReviews && (
                      <TouchableOpacity
                        style={styles.loadMoreButton}
                        onPress={() => setVisibleReviews(visibleReviews + 3)}
                        disabled={fetchingReviews}
                      >
                        <Text style={styles.loadMoreText}>
                          {fetchingReviews ? 'Đang tải...' : 'Xem thêm'}
                        </Text>
                      </TouchableOpacity>
                    )
                  }
                />
              </View>
            ),
          },
        ]
      : []),
    {
      type: 'buttons',
      content: (
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
            onPress={() => {
              setShowEditModal(false);
              setPoster(null);
              setShowImageOptions(false);
            }}
            style={styles.closeButton}
            labelStyle={styles.buttonLabel}
            contentStyle={styles.buttonContent}
          >
            Đóng
          </Button>
        </View>
      ),
    },
  ];

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
      <FlatList
        data={events}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={[styles.container, { backgroundColor: theme.colors.background, paddingBottom: 30 }]}
        ListHeaderComponent={<Title style={styles.title}>Quản Lý Sự Kiện</Title>}
        renderItem={({ item }) => (
          <TouchableOpacity onPress={() => handleSelectEvent(item)}>
            <Card style={styles.eventCard}>
              <Card.Content>
                <Text style={styles.eventTitle}>{item.title}</Text>
                <Text style={styles.eventText}>Địa điểm: {item.location}</Text>
                <Text style={styles.eventText}>Thời gian: {new Date(item.start_time).toLocaleString()}</Text>
                <Text style={styles.eventText}>Giá vé: {item.ticket_price || 'Chưa cập nhật'} VNĐ</Text>
              </Card.Content>
            </Card>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          loading ? (
            <Text style={styles.loadingText}>Đang tải...</Text>
          ) : (
            <Text style={styles.noEventsText}>Không có sự kiện nào để hiển thị.</Text>
          )
        }
      />

      {selectedEvent && (
        <Modal
          visible={showEditModal}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setShowEditModal(false)}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <FlatList
                data={modalData}
                keyExtractor={(item, index) => `${item.type}-${index}`}
                renderItem={({ item }) => item.content}
                contentContainerStyle={styles.modalScrollContent}
                nestedScrollEnabled
              />
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
  placeholderImage: {
    width: 200,
    height: 150,
    borderRadius: 8,
    backgroundColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    color: '#666',
    fontSize: 14,
    fontWeight: '600',
  },
  previewImage: {
    width: 200,
    height: 150,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#6200ea',
  },
  removeImageButton: {
    position: 'absolute',
    top: -10,
    right: -10,
    backgroundColor: '#fff',
  },
  imageOptionsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 10,
  },
  imageOptionButton: {
    marginHorizontal: 5,
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
  reviewsContainer: {
    marginTop: 20,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  reviewCard: {
    marginBottom: 10,
    borderRadius: 10,
    elevation: 2,
    backgroundColor: '#fff',
    padding: 10,
  },
  reviewUsername: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  reviewRating: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
  },
  reviewComment: {
    fontSize: 14,
    color: '#444',
    marginTop: 5,
  },
  reviewDate: {
    fontSize: 12,
    color: '#888',
    marginTop: 5,
  },
  loadMoreButton: {
    padding: 10,
    backgroundColor: '#6200ea',
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  loadMoreText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default MyEvents;