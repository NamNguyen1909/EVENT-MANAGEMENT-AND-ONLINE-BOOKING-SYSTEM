import React, { useState, useEffect, useContext } from 'react';
import {
  View,
  StyleSheet,
  Alert,
  Text,
  TouchableOpacity,
  SafeAreaView,
  Modal,
  FlatList,
  Image,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  Dimensions,
} from 'react-native';
import { TextInput, Button, Title, Card, useTheme, IconButton } from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MyUserContext, MyDispatchContext } from '../../configs/MyContexts';
import Apis, { endpoints, authApis } from '../../configs/Apis';
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { MaterialIcons } from '@expo/vector-icons';
import MyStyles, { colors } from '../../styles/MyStyles';

const MyEvents = () => {
  const theme = useTheme();
  const user = useContext(MyUserContext);
  const dispatch = useContext(MyDispatchContext);
  const screenHeight = Dimensions.get('window').height;

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
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [selectedReview, setSelectedReview] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [activeTab, setActiveTab] = useState('update');
  const [pendingReplies, setPendingReplies] = useState({});

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
      const categoryData = Object.entries(res.data).map(([value, label]) => ({ value, label }));
      setCategories(categoryData);
    } catch (error) {
      console.error("Error fetching categories:", error.response ? error.response.data : error.message);
      Alert.alert('Error', 'Failed to fetch categories. Using default categories.');
      setCategories([
        { value: 'music', label: 'Music' },
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
        setReviews([]);
        return;
      }

      const api = authApis(token);
      const res = await api.get(endpoints.getReviewsOrganizer(eventId));
      console.log('Reviews response:', res.data.results);

      if (Array.isArray(res.data.results)) {
        const processedReviews = res.data.results.map(review => {
          const pendingReply = pendingReplies[review.id] || [];
          const existingReplies = Array.isArray(review.replies) ? review.replies : [];
          return {
            ...review,
            replies: [...pendingReply, ...existingReplies],
          };
        });
        setReviews(processedReviews);
        setPendingReplies(prev => {
          const newPending = { ...prev };
          processedReviews.forEach(r => delete newPending[r.id]);
          return newPending;
        });
      } else {
        console.error('Dữ liệu reviews không đúng định dạng:', res.data);
        setReviews([]);
      }
    } catch (error) {
      console.error("Error fetching reviews:", error.response ? error.response.data : error.message);
      Alert.alert('Error', 'Failed to fetch reviews. Please try again.');
      setReviews([]);
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
      setActiveTab('update');
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

  const ReviewSection = () => {
    const ReplyModal = ({ review, visible, onClose, onSubmit }) => {
      const [reply, setReply] = useState('');

      const handleSubmit = () => {
        console.log('Reply value before submit:', reply);
        if (!reply.trim()) {
          Alert.alert('Error', 'Vui lòng nhập nội dung phản hồi!');
          return;
        }
        onSubmit(reply);
      };

      return (
        <Modal
          visible={visible}
          transparent={true}
          animationType="slide"
          onRequestClose={onClose}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.modalContainer}
            keyboardVerticalOffset={Platform.OS === 'android' ? 24 : 0}
          >
            <View style={[styles.replyModalContent, { maxHeight: screenHeight * 0.5 }]}>
              <ScrollView
                contentContainerStyle={[styles.replyModalScroll, { paddingBottom: Platform.OS === 'android' ? 16 : 0 }]}
                showsVerticalScrollIndicator={true}
              >
                <Text style={styles.pickerLabel}>Phản hồi đánh giá</Text>
                <TextInput
                  label="Nội dung phản hồi"
                  value={reply}
                  onChangeText={setReply}
                  style={styles.input}
                  mode="outlined"
                  outlineColor={colors.bluePrimary}
                  multiline
                  numberOfLines={4}
                  theme={{ roundness: 10 }}
                />
                <View style={styles.modalButtonContainer}>
                  <Button
                    mode="contained"
                    onPress={handleSubmit}
                    loading={updating}
                    disabled={updating}
                    style={[styles.confirmButton, { marginRight: 10 }]}
                    buttonColor={colors.bluePrimary}
                  >
                    Gửi
                  </Button>
                  <Button
                    mode="outlined"
                    onPress={onClose}
                    style={styles.closeButton}
                    textColor={colors.bluePrimary}
                  >
                    Đóng
                  </Button>
                </View>
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </Modal>
      );
    };

    const submitReply = async (replyContent) => {
      if (!selectedReview || !replyContent.trim()) {
        Alert.alert('Error', 'Vui lòng nhập nội dung phản hồi!');
        return;
      }

      try {
        const token = await AsyncStorage.getItem('token');
        if (!token) {
          Alert.alert('Error', 'No authentication token found!');
          return;
        }

        const api = authApis(token);
        const payload = {
          event: selectedReview.event,
          parent_review: selectedReview.id,
          comment: replyContent.trim(),
        };
        const res = await api.post(endpoints.replyReview, payload);
        console.log('Reply response:', res.data);

        setPendingReplies(prev => ({
          ...prev,
          [selectedReview.id]: [...(prev[selectedReview.id] || []), res.data],
        }));

        await fetchEventReviews(selectedReview.event);
        setReplyText('');
        setShowReviewModal(false);
        Alert.alert('Success', 'Phản hồi đã được gửi thành công!');
      } catch (error) {
        console.error('Error submitting reply:', error.response ? error.response.data : error.message);
        Alert.alert('Error', 'Failed to submit reply. Please try again.');
      }
    };

    return (
      <View>
        <Title style={styles.sectionTitle}>Đánh giá từ người dùng</Title>
        {fetchingReviews ? (
          <Text style={styles.loadingText}>Đang tải đánh giá...</Text>
        ) : reviews.length === 0 ? (
          <Text style={styles.noReviewsText}>Chưa có đánh giá nào cho sự kiện này.</Text>
        ) : (
          <FlatList
            data={reviews.slice(0, visibleReviews)}
            keyExtractor={(item) => item.id.toString()}
            renderItem={({ item }) => (
              <Card style={styles.reviewCard}>
                <Card.Content>
                  <View style={styles.reviewHeader}>
                    <View style={styles.reviewInfo}>
                      <Text style={styles.reviewUsername}>{item.user_infor?.username || 'Ẩn danh'}</Text>
                      <Text style={styles.reviewRating}>Đánh giá: {item.rating} sao</Text>
                    </View>
                    <View style={styles.reviewActions}>
                      <TouchableOpacity
                        style={axiosstyles.menuButton}
                        onPress={() => {
                          setSelectedReview(item);
                          setShowReviewModal(true);
                        }}
                      >
                        <Text style={styles.menuText}>Phản hồi</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                  {item.comment && (
                    <Text style={styles.reviewComment} numberOfLines={3} ellipsizeMode="tail">
                      {item.comment}
                    </Text>
                  )}
                  <Text style={styles.reviewDate}>
                    {new Date(item.created_at).toLocaleString('vi-VN')}
                  </Text>
                  {item.replies && item.replies.length > 0 && (
                    <View style={styles.repliesContainer}>
                      {item.replies.map(reply => (
                        <View key={reply.id} style={styles.replyItem}>
                          <Text style={styles.replyUsername}>{reply.user_infor?.username || 'Ẩn danh'}</Text>
                          <Text style={styles.reviewReply}>{reply.comment}</Text>
                          <Text style={styles.replyDate}>
                            {new Date(reply.created_at).toLocaleString('vi-VN')}
                          </Text>
                        </View>
                      ))}
                    </View>
                  )}
                </Card.Content>
              </Card>
            )}
            contentContainerStyle={[styles.reviewListContent, { paddingBottom: Platform.OS === 'android' ? 16 : 0 }]}
            nestedScrollEnabled={true}
            scrollEnabled={false}
          />
        )}
        {reviews.length > visibleReviews && (
          <TouchableOpacity
            style={styles.loadMoreButton}
            onPress={() => setVisibleReviews(prev => prev + 3)}
            disabled={fetchingReviews}
          >
            <Text style={styles.loadMoreText}>
              {fetchingReviews ? 'Đang tải...' : 'Xem thêm'}
            </Text>
          </TouchableOpacity>
        )}
        <ReplyModal
          review={selectedReview}
          visible={showReviewModal}
          onClose={() => {
            setShowReviewModal(false);
            setSelectedReview(null);
            setReplyText('');
          }}
          onSubmit={submitReply}
        />
      </View>
    );
  };

  const UpdateSection = () => (
    <View>
      <Title style={styles.subtitle}>Chỉnh Sửa Sự Kiện</Title>
      <TextInput
        label="Tiêu đề"
        value={selectedEvent?.title || ''}
        onChangeText={(text) => changeEvent('title', text)}
        style={styles.input}
        mode="outlined"
        outlineColor={colors.bluePrimary}
        theme={{ roundness: 10 }}
      />
      <TextInput
        label="Mô tả"
        value={selectedEvent?.description || ''}
        onChangeText={(text) => changeEvent('description', text)}
        style={styles.input}
        mode="outlined"
        outlineColor={colors.bluePrimary}
        multiline
        numberOfLines={3}
        theme={{ roundness: 10 }}
      />
      <TextInput
        label="Địa điểm"
        value={selectedEvent?.location || ''}
        onChangeText={(text) => changeEvent('location', text)}
        style={styles.input}
        mode="outlined"
        outlineColor={colors.bluePrimary}
        theme={{ roundness: 10 }}
      />
      <TextInput
        label="Latitude"
        value={selectedEvent?.latitude?.toString() || ''}
        onChangeText={(text) => changeEvent('latitude', text)}
        style={styles.input}
        mode="outlined"
        outlineColor={colors.bluePrimary}
        keyboardType="numeric"
        theme={{ roundness: 10 }}
      />
      <TextInput
        label="Longitude"
        value={selectedEvent?.longitude?.toString() || ''}
        onChangeText={(text) => changeEvent('longitude', text)}
        style={styles.input}
        mode="outlined"
        outlineColor={colors.bluePrimary}
        keyboardType="numeric"
        theme={{ roundness: 10 }}
      />
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
            size={20}
            onPress={removeImage}
            style={styles.removeImageButton}
          />
        )}
        {showImageOptions && (
          <View style={styles.imageOptionsContainer}>
            <Button mode="outlined" onPress={pickImage} style={styles.imageOptionButton} textColor={colors.bluePrimary}>
              Thư viện
            </Button>
            <Button mode="outlined" onPress={pickImageFromCamera} style={styles.imageOptionButton} textColor={colors.bluePrimary}>
              Chụp ảnh
            </Button>
          </View>
        )}
      </View>
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
            <View style={[styles.modalContent, { maxHeight: screenHeight * 0.6 }]}>
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
                contentContainerStyle={{ paddingBottom: Platform.OS === 'android' ? 16 : 0 }}
              />
              <Button
                mode="contained"
                onPress={() => setShowCategoryModal(false)}
                style={styles.closeButton}
                buttonColor={colors.bluePrimary}
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
            <View style={[styles.modalContent, { maxHeight: screenHeight * 0.5 }]}>
              <Text style={styles.pickerLabel}>Chọn ngày</Text>
              <DateTimePicker
                value={tempStartDate || new Date(selectedEvent?.start_time || Date.now())}
                mode="date"
                display={Platform.OS === 'ios' ? 'inline' : 'spinner'}
                onChange={onStartDateChange}
              />
              <View style={styles.modalButtonContainer}>
                <Button
                  mode="contained"
                  onPress={confirmStartDate}
                  style={[styles.confirmButton, { marginRight: 10 }]}
                  buttonColor={colors.bluePrimary}
                >
                  Xác nhận
                </Button>
                <Button
                  mode="outlined"
                  onPress={() => setShowStartDatePicker(false)}
                  style={styles.closeButton}
                  textColor={colors.bluePrimary}
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
            <View style={[styles.modalContent, { maxHeight: screenHeight * 0.5 }]}>
              <Text style={styles.pickerLabel}>Chọn giờ</Text>
              <DateTimePicker
                value={tempStartTime || new Date(selectedEvent?.start_time || Date.now())}
                mode="time"
                display={Platform.OS === 'ios' ? 'inline' : 'spinner'}
                onChange={onStartTimeChange}
              />
              <View style={styles.modalButtonContainer}>
                <Button
                  mode="contained"
                  onPress={confirmStartTime}
                  style={[styles.confirmButton, { marginRight: 10 }]}
                  buttonColor={colors.bluePrimary}
                >
                  Xác nhận
                </Button>
                <Button
                  mode="outlined"
                  onPress={() => setShowStartTimePicker(false)}
                  style={styles.closeButton}
                  textColor={colors.bluePrimary}
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
            <View style={[styles.modalContent, { maxHeight: screenHeight * 0.5 }]}>
              <Text style={styles.pickerLabel}>Chọn ngày</Text>
              <DateTimePicker
                value={tempEndDate || new Date(selectedEvent?.end_time || Date.now())}
                mode="date"
                display={Platform.OS === 'ios' ? 'inline' : 'spinner'}
                onChange={onEndDateChange}
              />
              <View style={styles.modalButtonContainer}>
                <Button
                  mode="contained"
                  onPress={confirmEndDate}
                  style={[styles.confirmButton, { marginRight: 10 }]}
                  buttonColor={colors.bluePrimary}
                >
                  Xác nhận
                </Button>
                <Button
                  mode="outlined"
                  onPress={() => setShowEndDatePicker(false)}
                  style={styles.closeButton}
                  textColor={colors.bluePrimary}
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
            <View style={[styles.modalContent, { maxHeight: screenHeight * 0.5 }]}>
              <Text style={styles.pickerLabel}>Chọn giờ</Text>
              <DateTimePicker
                value={tempEndTime || new Date(selectedEvent?.end_time || Date.now())}
                mode="time"
                display={Platform.OS === 'ios' ? 'inline' : 'spinner'}
                onChange={onEndTimeChange}
              />
              <View style={styles.modalButtonContainer}>
                <Button
                  mode="contained"
                  onPress={confirmEndTime}
                  style={[styles.confirmButton, { marginRight: 10 }]}
                  buttonColor={colors.bluePrimary}
                >
                  Xác nhận
                </Button>
                <Button
                  mode="outlined"
                  onPress={() => setShowEndTimePicker(false)}
                  style={styles.closeButton}
                  textColor={colors.bluePrimary}
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
        value={selectedEvent?.total_tickets?.toString() || ''}
        onChangeText={(text) => changeEvent('total_tickets', text)}
        style={styles.input}
        mode="outlined"
        outlineColor={colors.bluePrimary}
        keyboardType="number-pad"
        theme={{ roundness: 10 }}
      />
      <TextInput
        label="Giá vé (VNĐ)"
        value={selectedEvent?.ticket_price?.toString() || ''}
        onChangeText={(text) => changeEvent('ticket_price', text)}
        style={styles.input}
        mode="outlined"
        outlineColor={colors.bluePrimary}
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
          buttonColor={colors.bluePrimary}
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
          textColor={colors.bluePrimary}
          labelStyle={styles.buttonLabel}
          contentStyle={styles.buttonContent}
        >
          Đóng
        </Button>
      </View>
    </View>
  );

  const modalData = [
    {
      key: 'update',
      title: 'Cập nhật sự kiện',
      content: <UpdateSection />,
    },
    {
      key: 'reviews',
      title: 'Đánh giá & Phản hồi',
      content: <ReviewSection />,
    },
  ];

  if (!user || user.role !== 'organizer') {
    return (
      <SafeAreaView style={[styles.safeArea, { paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 }]}>
        <View style={MyStyles.container}>
          <Text style={styles.errorText}>Chỉ có organizer mới có thể quản lý sự kiện.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 }]}>
      <FlatList
        data={events}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={[MyStyles.container, {
          paddingBottom: Platform.OS === 'android' ? 30 : 20,
          paddingTop: Platform.OS === 'android' ? 16 : 0,
        }]}
        ListHeaderComponent={<Title style={styles.title}>Quản Lý Sự Kiện</Title>}
        renderItem={({ item }) => (
          <TouchableOpacity onPress={() => handleSelectEvent(item)}>
            <Card style={MyStyles.eventItem}>
              <Card.Content>
                <Text style={MyStyles.eventTitle}>{item.title}</Text>
                <Text style={MyStyles.eventDetail}>Địa điểm: {item.location}</Text>
                <Text style={MyStyles.eventDetail}>Thời gian: {new Date(item.start_time).toLocaleString()}</Text>
                <Text style={MyStyles.eventPrice}>Giá vé: {item.ticket_price || 'Chưa cập nhật'} VNĐ</Text>
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
        showsVerticalScrollIndicator={true}
      />

      {selectedEvent && (
        <Modal
          visible={showEditModal}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setShowEditModal(false)}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.modalContainer}
            keyboardVerticalOffset={Platform.OS === 'android' ? 24 : 0}
          >
            <View style={[styles.modalContent, { maxHeight: screenHeight * 0.9 }]}>
              <View style={styles.header}>
                <TouchableOpacity
                  style={styles.closeButtonIcon}
                  onPress={() => {
                    setShowEditModal(false);
                    setPoster(null);
                    setShowImageOptions(false);
                    setReviews([]);
                  }}
                >
                  <MaterialIcons name="close" size={24} color={colors.blueGray} />
                </TouchableOpacity>
              </View>
              <View style={styles.tabContainer}>
                {modalData.map((tab) => (
                  <TouchableOpacity
                    key={tab.key}
                    style={[styles.tabButton, activeTab === tab.key && styles.activeTab]}
                    onPress={() => setActiveTab(tab.key)}
                  >
                    <Text style={[styles.tabText, activeTab === tab.key && styles.activeTabText]}>
                      {tab.title}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <ScrollView
                contentContainerStyle={[styles.modalScrollContent, { paddingBottom: Platform.OS === 'android' ? 30 : 20 }]}
                showsVerticalScrollIndicator={true}
                nestedScrollEnabled={true}
                bounces={Platform.OS === 'ios' ? false : undefined}
              >
                {modalData.find(tab => tab.key === activeTab)?.content}
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </Modal>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.grayLight,
  },
  title: {
    textAlign: 'center',
    marginBottom: 20,
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.navy,
    paddingTop: 8,
  },
  subtitle: {
    textAlign: 'center',
    marginBottom: 16,
    fontSize: 22,
    fontWeight: '600',
    color: colors.navy,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.blackTransparent,
  },
  modalContent: {
    backgroundColor: colors.white,
    borderRadius: 10,
    width: '90%',
    paddingHorizontal: 16,
    paddingVertical: 20,
    elevation: Platform.OS === 'android' ? 4 : 2,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: Platform.OS === 'ios' ? 0.1 : 0.2,
    shadowRadius: 4,
  },
  replyModalContent: {
    backgroundColor: colors.white,
    borderRadius: 10,
    width: '90%',
    paddingHorizontal: 16,
    paddingVertical: 20,
    elevation: Platform.OS === 'android' ? 4 : 2,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: Platform.OS === 'ios' ? 0.1 : 0.2,
    shadowRadius: 4,
  },
  replyModalScroll: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 10,
  },
  closeButtonIcon: {
    padding: 5,
  },
  modalScrollContent: {
    flexGrow: 1,
  },
  tabContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.blueLight,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
  },
  tabText: {
    fontSize: 16,
    color: colors.blueGray,
    fontWeight: '600',
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: colors.bluePrimary,
  },
  activeTabText: {
    color: colors.bluePrimary,
  },
  input: {
    marginBottom: 15,
    backgroundColor: colors.white,
  },
  uploadContainer: {
    marginBottom: 15,
    alignItems: 'center',
  },
  placeholderImage: {
    width: 200,
    height: 150,
    borderRadius: 8,
    backgroundColor: colors.blueLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    color: colors.blueGray,
    fontSize: 14,
    fontWeight: '600',
  },
  previewImage: {
    width: 200,
    height: 150,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: colors.bluePrimary,
  },
  removeImageButton: {
    position: 'absolute',
    top: -10,
    right: -10,
    backgroundColor: colors.white,
  },
  imageOptionsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 10,
  },
  imageOptionButton: {
    marginHorizontal: 5,
    borderRadius: 8,
    borderColor: colors.bluePrimary,
  },
  categoryContainer: {
    marginBottom: 20,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.navy,
    marginBottom: 8,
  },
  categoryButton: {
    padding: 12,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.bluePrimary,
    borderRadius: 10,
    alignItems: 'center',
  },
  categoryButtonText: {
    fontSize: 14,
    color: colors.bluePrimary,
    fontWeight: '600',
  },
  datePickerContainer: {
    marginBottom: 20,
  },
  dateButton: {
    padding: 12,
    backgroundColor: colors.bluePrimary,
    borderRadius: 8,
    alignItems: 'center',
  },
  dateButtonText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '600',
  },
  pickerLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.navy,
    marginBottom: 10,
    textAlign: 'center',
  },
  categoryItem: {
    padding: 10,
    backgroundColor: colors.blueLight,
    borderRadius: 8,
    marginBottom: 8,
    width: '100%',
  },
  categoryItemText: {
    fontSize: 14,
    color: colors.navy,
    textAlign: 'center',
  },
  closeButton: {
    borderRadius: 8,
    borderColor: colors.bluePrimary,
  },
  confirmButton: {
    borderRadius: 8,
    backgroundColor: colors.bluePrimary,
  },
  updateButton: {
    borderRadius: 8,
    backgroundColor: colors.bluePrimary,
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
    elevation: Platform.OS === 'android' ? 4 : 2,
    backgroundColor: colors.white,
    padding: 15,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: Platform.OS === 'ios' ? 0.1 : 0.2,
    shadowRadius: 4,
  },
  statsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.navy,
    marginBottom: 8,
  },
  statsText: {
    fontSize: 14,
    color: colors.blueGray,
    marginBottom: 4,
  },
  loadingText: {
    textAlign: 'center',
    fontSize: 16,
    color: colors.blueGray,
    paddingVertical: 10,
  },
  noEventsText: {
    textAlign: 'center',
    fontSize: 16,
    color: colors.blueGray,
  },
  noReviewsText: {
    textAlign: 'center',
    fontSize: 14,
    color: colors.blueGray,
    paddingVertical: 10,
  },
  errorText: {
    textAlign: 'center',
    fontSize: 18,
    color: colors.redError,
    marginTop: 20,
  },
  reviewsContainer: {
    marginTop: 10,
    marginBottom: 20,
    paddingHorizontal: 5,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.navy,
    marginBottom: 10,
    paddingLeft: 5,
  },
  reviewCard: {
    marginBottom: 15,
    borderRadius: 10,
    elevation: Platform.OS === 'android' ? 4 : 2,
    backgroundColor: colors.white,
    padding: 10,
    marginHorizontal: 5,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: Platform.OS === 'ios' ? 0.1 : 0.2,
    shadowRadius: 4,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  reviewInfo: {
    flex: 1,
    marginRight: 10,
  },
  reviewActions: {
    flexShrink: 0,
  },
  reviewUsername: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.navy,
    marginBottom: 4,
  },
  reviewRating: {
    fontSize: 14,
    color: colors.blueGray,
    marginBottom: 4,
  },
  reviewReply: {
    fontSize: 14,
    color: colors.blueLight,
    fontStyle: 'italic',
    marginTop: 5,
    paddingLeft: 5,
  },
  reviewComment: {
    fontSize: 14,
    color: colors.navy,
    marginTop: 5,
    paddingLeft: 5,
  },
  reviewDate: {
    fontSize: 12,
    color: colors.blueGray,
    marginTop: 5,
    textAlign: 'right',
    paddingRight: 5,
  },
  reviewListContent: {
    flexGrow: 1,
  },
  repliesContainer: {
    marginTop: 10,
    paddingLeft: 15,
    borderLeftWidth: 2,
    borderLeftColor: colors.blueLight,
  },
  replyItem: {
    marginBottom: 10,
  },
  replyUsername: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.navy,
    marginBottom: 2,
  },
  replyDate: {
    fontSize: 12,
    color: colors.blueGray,
    textAlign: 'right',
    paddingRight: 5,
  },
  menuButton: {
    padding: 5,
    backgroundColor: colors.blueLight,
    borderRadius: 5,
  },
  menuText: {
    fontSize: 14,
    color: colors.bluePrimary,
  },
  loadMoreButton: {
    padding: 10,
    backgroundColor: colors.bluePrimary,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
    marginHorizontal: 5,
  },
  loadMoreText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '600',
  },
});

export default MyEvents;