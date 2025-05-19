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
        Alert.alert('Lỗi', 'Không tìm thấy token xác thực!');
        setEvents([]);
        return;
      }

      const api = authApis(token);
      const res = await api.get(endpoints.myEvents);

      if (Array.isArray(res.data)) {
        setEvents(res.data);
      } else if (res.data && res.data.error) {
        Alert.alert('Lỗi', res.data.error);
        setEvents([]);
      } else {
        Alert.alert('Lỗi', 'Dữ liệu trả về không đúng định dạng. Vui lòng kiểm tra cấu hình backend.');
        setEvents([]);
      }
    } catch (error) {
      if (error.response && error.response.status === 401) {
        Alert.alert('Lỗi', 'Xác thực thất bại. Vui lòng đăng nhập lại.');
        await AsyncStorage.removeItem('token');
        await AsyncStorage.removeItem('refresh_token');
        dispatch({ type: 'logout' });
      } else {
        console.error("Lỗi khi lấy danh sách sự kiện:", error.response ? error.response.data : error.message);
        Alert.alert('Lỗi', 'Không thể lấy danh sách sự kiện. Vui lòng thử lại.');
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
      console.error("Lỗi khi lấy danh mục:", error.response ? error.response.data : error.message);
      Alert.alert('Lỗi', 'Không thể lấy danh mục. Sử dụng danh mục mặc định.');
      setCategories([
        { value: 'music', label: 'Âm nhạc' },
        { value: 'sports', label: 'Thể thao' },
        { value: 'seminar', label: 'Hội thảo' },
        { value: 'conference', label: 'Hội nghị' },
        { value: 'festival', label: 'Lễ hội' },
        { value: 'workshop', label: 'Workshop' },
        { value: 'party', label: 'Tiệc tùng' },
        { value: 'competition', label: 'Thi đấu' },
        { value: 'other', label: 'Khác' },
      ]);
    }
  };

  const fetchEventDetails = async (eventId) => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        Alert.alert('Lỗi', 'Không tìm thấy token xác thực!');
        return null;
      }

      const api = authApis(token);
      const res = await api.get(endpoints['eventDetail'](eventId));
      return res.data;
    } catch (error) {
      if (error.response && error.response.status === 401) {
        Alert.alert('Lỗi', 'Xác thực thất bại. Vui lòng đăng nhập lại.');
        await AsyncStorage.removeItem('token');
        await AsyncStorage.removeItem('refresh_token');
        dispatch({ type: 'logout' });
      } else {
        console.error("Lỗi khi lấy chi tiết sự kiện:", error.response ? error.response.data : error.message);
        Alert.alert('Lỗi', 'Không thể lấy chi tiết sự kiện. Vui lòng thử lại.');
      }
      return null;
    }
  };

  const fetchStatistics = async (eventId) => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        Alert.alert('Lỗi', 'Không tìm thấy token xác thực!');
        return;
      }

      const api = authApis(token);
      const res = await api.get(endpoints['eventStatistics'](eventId));
      setStatistics(res.data);
    } catch (error) {
      if (error.response && error.response.status === 401) {
        Alert.alert('Lỗi', 'Xác thực thất bại. Vui lòng đăng nhập lại.');
        await AsyncStorage.removeItem('token');
        await AsyncStorage.removeItem('refresh_token');
        dispatch({ type: 'logout' });
      } else {
        console.error("Lỗi khi lấy thống kê:", error.response ? error.response.data : error.message);
        Alert.alert('Lỗi', 'Không thể lấy thống kê. Vui lòng thử lại.');
      }
    }
  };

  const fetchEventReviews = async (eventId) => {
    setFetchingReviews(true);
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        Alert.alert('Lỗi', 'Không tìm thấy token xác thực!');
        setReviews([]);
        return;
      }

      const api = authApis(token);
      const res = await api.get(endpoints.getReviewsOrganizer(eventId));
      console.log('Phản hồi đánh giá:', res.data.results);

      if (Array.isArray(res.data.results)) {
        const mainReviews = res.data.results.filter(review => review.parent_review === null);
        const replies = res.data.results.filter(review => review.parent_review !== null);

        const processedReviews = mainReviews.map(review => {
          const reviewReplies = replies.filter(reply => reply.parent_review === review.id);
          const pendingReply = pendingReplies[review.id] || [];
          return {
            ...review,
            replies: [...pendingReply, ...reviewReplies],
          };
        });

        setReviews(processedReviews);
        setPendingReplies(prev => {
          const newPending = { ...prev };
          processedReviews.forEach(r => delete newPending[r.id]);
          return newPending;
        });
      } else {
        console.error('Dữ liệu đánh giá không đúng định dạng:', res.data);
        setReviews([]);
      }
    } catch (error) {
      console.error('Lỗi khi lấy đánh giá:', error.response ? error.response.data : error.message);
      Alert.alert('Lỗi', 'Không thể lấy đánh giá. Vui lòng thử lại.');
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
        Alert.alert('Lỗi', 'Cần cấp quyền truy cập thư viện ảnh!');
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
          Alert.alert('Lỗi', 'Chỉ chấp nhận file PNG, JPG, JPEG!');
          return;
        }
        const response = await fetch(uri);
        const blob = await response.blob();
        if (blob.size > 5 * 1024 * 1024) {
          Alert.alert('Lỗi', 'Ảnh không được lớn hơn 5MB!');
          return;
        }
        setPoster(uri);
        setShowImageOptions(false);
      }
    } catch (error) {
      console.error('Lỗi khi chọn ảnh từ thư viện:', error);
      Alert.alert('Lỗi', 'Có lỗi khi chọn ảnh. Vui lòng thử lại!');
    }
  };

  const pickImageFromCamera = async () => {
    try {
      const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert('Lỗi', 'Cần cấp quyền truy cập camera!');
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
          Alert.alert('Lỗi', 'Chỉ chấp nhận file PNG, JPG, JPEG!');
          return;
        }
        const response = await fetch(uri);
        const blob = await response.blob();
        if (blob.size > 5 * 1024 * 1024) {
          Alert.alert('Lỗi', 'Ảnh không được lớn hơn 5MB!');
          return;
        }
        setPoster(uri);
        setShowImageOptions(false);
      }
    } catch (error) {
      console.error('Lỗi khi chụp ảnh:', error);
      Alert.alert('Lỗi', 'Có lỗi khi chụp ảnh. Vui lòng thử lại!');
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
        Alert.alert('Lỗi', 'Bạn chưa đăng nhập!');
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

      Alert.alert('Thành công', 'Sự kiện đã được cập nhật thành công!');
      fetchMyEvents();
      setSelectedEvent(null);
      setStatistics(null);
      setPoster(null);
      setShowImageOptions(false);
      setShowEditModal(false);
    } catch (error) {
      if (error.response && error.response.status === 401) {
        Alert.alert('Lỗi', 'Xác thực thất bại. Vui lòng đăng nhập lại.');
        await AsyncStorage.removeItem('token');
        await AsyncStorage.removeItem('refresh_token');
        dispatch({ type: 'logout' });
      } else if (error.response?.data) {
        const errors = error.response.data;
        console.error("Lỗi khi cập nhật sự kiện:", errors);
        Alert.alert('Lỗi', errors.detail || 'Không thể cập nhật sự kiện. Vui lòng thử lại.');
      } else {
        console.error("Lỗi khi cập nhật sự kiện:", error.message);
        Alert.alert('Lỗi', 'Lỗi máy chủ (500). Vui lòng liên hệ hỗ trợ hoặc thử lại sau.');
      }
    } finally {
      setUpdating(false);
    }
  };

  const ReviewSection = () => {
    const ReplyModal = ({ review, visible, onClose, onSubmit }) => {
      const [reply, setReply] = useState('');

      const handleSubmit = () => {
        if (!reply.trim()) {
          Alert.alert('Lỗi', 'Vui lòng nhập nội dung phản hồi!');
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
          <View style={styles.modalOverlay}>
            <View style={styles.replyModal}>
              <Text style={styles.modalTitle}>Phản hồi đánh giá</Text>
              <TextInput
                label="Nội dung phản hồi"
                value={reply}
                onChangeText={setReply}
                style={styles.input}
                mode="outlined"
                outlineColor={colors.bluePrimary}
                multiline
                numberOfLines={4}
                theme={{ roundness: 8 }}
              />
              <View style={styles.modalButtons}>
                <Button
                  mode="contained"
                  onPress={handleSubmit}
                  loading={updating}
                  disabled={updating}
                  style={styles.modalButton}
                  buttonColor={colors.bluePrimary}
                  labelStyle={styles.buttonLabel}
                >
                  Gửi
                </Button>
                <Button
                  mode="outlined"
                  onPress={onClose}
                  style={styles.modalButton}
                  textColor={colors.bluePrimary}
                  labelStyle={styles.buttonLabel}
                >
                  Hủy
                </Button>
              </View>
            </View>
          </View>
        </Modal>
      );
    };

    const submitReply = async (replyContent) => {
      if (!selectedReview || !replyContent.trim()) {
        Alert.alert('Lỗi', 'Vui lòng nhập nội dung phản hồi!');
        return;
      }

      try {
        const token = await AsyncStorage.getItem('token');
        if (!token) {
          Alert.alert('Lỗi', 'Không tìm thấy token xác thực!');
          return;
        }

        const api = authApis(token);
        const payload = {
          event: selectedReview.event,
          parent_review: selectedReview.id,
          comment: replyContent.trim(),
        };
        const res = await api.post(endpoints.replyReview, payload);
        console.log('Phản hồi:', res.data);

        setPendingReplies(prev => ({
          ...prev,
          [selectedReview.id]: [...(prev[selectedReview.id] || []), res.data],
        }));

        await fetchEventReviews(selectedReview.event);
        setReplyText('');
        setShowReviewModal(false);
        Alert.alert('Thành công', 'Phản hồi đã được gửi thành công!');
      } catch (error) {
        console.error('Lỗi khi gửi phản hồi:', error.response ? error.response.data : error.message);
        Alert.alert('Lỗi', 'Không thể gửi phản hồi. Vui lòng thử lại.');
      }
    };

    return (
      <View style={[styles.sectionContainer, { maxHeight: screenHeight * 0.5 }]}>
        <Text style={styles.sectionTitle}>Đánh giá từ người dùng</Text>
        {fetchingReviews ? (
          <Text style={styles.infoText}>Đang tải đánh giá...</Text>
        ) : reviews.length === 0 ? (
          <Text style={styles.infoText}>Chưa có đánh giá nào cho sự kiện này.</Text>
        ) : (
          <FlatList
            data={reviews.slice(0, visibleReviews)}
            keyExtractor={(item) => item.id.toString()}
            renderItem={({ item }) => (
              <Card style={styles.reviewCard}>
                <Card.Content>
                  <View style={styles.reviewHeader}>
                    <View>
                      <Text style={styles.reviewUsername}>{item.user_infor?.username || 'Ẩn danh'}</Text>
                      <Text style={styles.reviewRating}>Đánh giá: {item.rating} sao</Text>
                    </View>
                    <TouchableOpacity
                      style={styles.replyButton}
                      onPress={() => {
                        setSelectedReview(item);
                        setShowReviewModal(true);
                      }}
                    >
                      <Text style={styles.replyButtonText}>Phản hồi</Text>
                    </TouchableOpacity>
                  </View>
                  {item.comment && (
                    <Text style={styles.reviewComment}>{item.comment}</Text>
                  )}
                  <Text style={styles.reviewDate}>
                    {new Date(item.created_at).toLocaleString('vi-VN')}
                  </Text>
                  {item.replies && item.replies.length > 0 && (
                    <View style={styles.repliesContainer}>
                      {item.replies.map(reply => (
                        <View key={reply.id} style={styles.replyItem}>
                          <Text style={styles.replyUsername}>{reply.user_infor?.username || 'Ẩn danh'}</Text>
                          <Text style={styles.replyComment}>{reply.comment}</Text>
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
            contentContainerStyle={styles.reviewList}
            nestedScrollEnabled={true}
            showsVerticalScrollIndicator={false}
          />
        )}
        {reviews.length > visibleReviews && (
          <Button
            mode="contained"
            onPress={() => setVisibleReviews(prev => prev + 3)}
            disabled={fetchingReviews}
            style={styles.loadMoreButton}
            buttonColor={colors.bluePrimary}
            labelStyle={styles.buttonLabel}
          >
            {fetchingReviews ? 'Đang tải...' : 'Xem thêm'}
          </Button>
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

  const UpdateSection = () => {
    // State để lưu tạm ngày giờ trong UpdateSection
    const [localStartDate, setLocalStartDate] = useState(
      selectedEvent?.start_time ? new Date(selectedEvent.start_time) : null
    );
    const [localStartTime, setLocalStartTime] = useState(
      selectedEvent?.start_time ? new Date(selectedEvent.start_time) : null
    );
    const [localEndDate, setLocalEndDate] = useState(
      selectedEvent?.end_time ? new Date(selectedEvent.end_time) : null
    );
    const [localEndTime, setLocalEndTime] = useState(
      selectedEvent?.end_time ? new Date(selectedEvent.end_time) : null
    );

    const onStartDateChange = (event, selectedDate) => {
      if (Platform.OS === 'android' && event.type === 'dismissed') {
        setShowStartDatePicker(false);
        return;
      }
      if (selectedDate) {
        setLocalStartDate(selectedDate);
        if (Platform.OS === 'android') {
          setShowStartDatePicker(false);
          setShowStartTimePicker(true);
        }
      }
    };

    const confirmStartDate = () => {
      setShowStartDatePicker(false);
      if (localStartDate) {
        setShowStartTimePicker(true);
      }
    };

    const onStartTimeChange = (event, selectedTime) => {
      if (Platform.OS === 'android' && event.type === 'dismissed') {
        setShowStartTimePicker(false);
        return;
      }
      if (selectedTime) {
        setLocalStartTime(selectedTime);
        if (Platform.OS === 'android') {
          confirmStartTime();
        }
      }
    };

    const confirmStartTime = () => {
      setShowStartTimePicker(false);
      if (localStartDate && localStartTime) {
        const newDate = new Date(localStartDate);
        newDate.setHours(localStartTime.getHours(), localStartTime.getMinutes());
        changeEvent('start_time', newDate.toISOString());
      }
    };

    const onEndDateChange = (event, selectedDate) => {
      if (Platform.OS === 'android' && event.type === 'dismissed') {
        setShowEndDatePicker(false);
        return;
      }
      if (selectedDate) {
        setLocalEndDate(selectedDate);
        if (Platform.OS === 'android') {
          setShowEndDatePicker(false);
          setShowEndTimePicker(true);
        }
      }
    };

    const confirmEndDate = () => {
      setShowEndDatePicker(false);
      if (localEndDate) {
        setShowEndTimePicker(true);
      }
    };

    const onEndTimeChange = (event, selectedTime) => {
      if (Platform.OS === 'android' && event.type === 'dismissed') {
        setShowEndTimePicker(false);
        return;
      }
      if (selectedTime) {
        setLocalEndTime(selectedTime);
        if (Platform.OS === 'android') {
          confirmEndTime();
        }
      }
    };

    const confirmEndTime = () => {
      setShowEndTimePicker(false);
      if (localEndDate && localEndTime) {
        const newDate = new Date(localEndDate);
        newDate.setHours(localEndTime.getHours(), localEndTime.getMinutes());
        changeEvent('end_time', newDate.toISOString());
      }
    };

    return (
      <View style={styles.sectionContainer}>
        <Text style={styles.sectionTitle}>Chỉnh sửa sự kiện</Text>
        <ScrollView
          contentContainerStyle={[styles.updateScroll, { paddingBottom: 40 }]}
          showsVerticalScrollIndicator={false}
          style={{ maxHeight: screenHeight * 0.5 }}
        >
          <TextInput
            label="Tiêu đề"
            value={selectedEvent?.title || ''}
            onChangeText={(text) => changeEvent('title', text)}
            style={[styles.input, { marginVertical: 8 }]}
            mode="outlined"
            outlineColor={colors.bluePrimary}
            theme={{ roundness: 8 }}
          />
          <TextInput
            label="Mô tả"
            value={selectedEvent?.description || ''}
            onChangeText={(text) => changeEvent('description', text)}
            style={[styles.input, { marginVertical: 8 }]}
            mode="outlined"
            outlineColor={colors.bluePrimary}
            multiline
            numberOfLines={4}
            theme={{ roundness: 8 }}
          />
          <TextInput
            label="Địa điểm"
            value={selectedEvent?.location || ''}
            onChangeText={(text) => changeEvent('location', text)}
            style={[styles.input, { marginVertical: 8 }]}
            mode="outlined"
            outlineColor={colors.bluePrimary}
            theme={{ roundness: 8 }}
          />
          <View style={[styles.row, { marginVertical: 8 }]}>
            <TextInput
              label="Latitude"
              value={selectedEvent?.latitude?.toString() || ''}
              onChangeText={(text) => changeEvent('latitude', text)}
              style={[styles.input, styles.halfInput]}
              mode="outlined"
              outlineColor={colors.bluePrimary}
              keyboardType="numeric"
              theme={{ roundness: 8 }}
            />
            <TextInput
              label="Longitude"
              value={selectedEvent?.longitude?.toString() || ''}
              onChangeText={(text) => changeEvent('longitude', text)}
              style={[styles.input, styles.halfInput]}
              mode="outlined"
              outlineColor={colors.bluePrimary}
              keyboardType="numeric"
              theme={{ roundness: 8 }}
            />
          </View>
          <View style={[styles.imageContainer, { marginVertical: 8 }]}>
            <TouchableOpacity onPress={() => setShowImageOptions(!showImageOptions)}>
              {poster ? (
                <Image
                  source={{ uri: poster }}
                  style={styles.posterImage}
                  resizeMode="cover"
                />
              ) : (
                <View style={styles.imagePlaceholder}>
                  <Text style={styles.imagePlaceholderText}>Chọn poster</Text>
                </View>
              )}
            </TouchableOpacity>
            {poster && (
              <IconButton
                icon="close"
                size={20}
                onPress={removeImage}
                style={styles.removeImageIcon}
                iconColor={colors.white}
                containerColor={colors.bluePrimary}
              />
            )}
            {showImageOptions && (
              <View style={styles.imageOptions}>
                <Button
                  mode="outlined"
                  onPress={pickImage}
                  style={styles.imageOptionButton}
                  textColor={colors.bluePrimary}
                  labelStyle={styles.buttonLabel}
                >
                  Thư viện
                </Button>
                <Button
                  mode="outlined"
                  onPress={pickImageFromCamera}
                  style={styles.imageOptionButton}
                  textColor={colors.bluePrimary}
                  labelStyle={styles.buttonLabel}
                >
                  Camera
                </Button>
              </View>
            )}
          </View>
          <View style={[styles.inputContainer, { marginVertical: 8 }]}>
            <Text style={styles.label}>Danh mục</Text>
            <TouchableOpacity
              style={styles.pickerButton}
              onPress={() => setShowCategoryModal(true)}
            >
              <Text style={styles.pickerText}>
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
              <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                  <Text style={styles.modalTitle}>Chọn danh mục</Text>
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
                    contentContainerStyle={styles.categoryList}
                  />
                  < Button
                    mode="contained"
                    onPress={() => setShowCategoryModal(false)}
                    style={styles.modalButton}
                    buttonColor={colors.bluePrimary}
                    labelStyle={styles.buttonLabel}
                  >
                    Hủy
                  </Button>
                </View>
              </View>
            </Modal>
          </View>
          <View style={[styles.inputContainer, { marginVertical: 8 }]}>
            <Text style={styles.label}>Thời gian bắt đầu</Text>
            <TouchableOpacity
              style={styles.pickerButton}
              onPress={() => setShowStartDatePicker(true)}
            >
              <Text style={styles.pickerText}>{formatDateTime(selectedEvent?.start_time)}</Text>
            </TouchableOpacity>
            <Modal
              visible={showStartDatePicker}
              transparent={true}
              animationType="slide"
              onRequestClose={() => setShowStartDatePicker(false)}
            >
              <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                  <Text style={styles.modalTitle}>Chọn ngày bắt đầu</Text>
                  <DateTimePicker
                    value={localStartDate || new Date(selectedEvent?.start_time || Date.now())}
                    mode="date"
                    display={Platform.OS === 'ios' ? 'inline' : 'default'}
                    onChange={onStartDateChange}
                  />
                  <View style={styles.modalButtons}>
                    <Button
                      mode="contained"
                      onPress={confirmStartDate}
                      style={styles.modalButton}
                      buttonColor={colors.bluePrimary}
                      labelStyle={styles.buttonLabel}
                    >
                      Xác nhận
                    </Button>
                    <Button
                      mode="outlined"
                      onPress={() => setShowStartDatePicker(false)}
                      style={styles.modalButton}
                      textColor={colors.bluePrimary}
                      labelStyle={styles.buttonLabel}
                    >
                      Hủy
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
              <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                  <Text style={styles.modalTitle}>Chọn giờ bắt đầu</Text>
                  <DateTimePicker
                    value={localStartTime || new Date(selectedEvent?.start_time || Date.now())}
                    mode="time"
                    display={Platform.OS === 'ios' ? 'inline' : 'default'}
                    onChange={onStartTimeChange}
                  />
                  <View style={styles.modalButtons}>
                    <Button
                      mode="contained"
                      onPress={confirmStartTime}
                      style={styles.modalButton}
                      buttonColor={colors.bluePrimary}
                      labelStyle={styles.buttonLabel}
                    >
                      Xác nhận
                    </Button>
                    <Button
                      mode="outlined"
                      onPress={() => setShowStartTimePicker(false)}
                      style={styles.modalButton}
                      textColor={colors.bluePrimary}
                      labelStyle={styles.buttonLabel}
                    >
                      Hủy
                    </Button>
                  </View>
                </View>
              </View>
            </Modal>
          </View>
          <View style={[styles.inputContainer, { marginVertical: 8 }]}>
            <Text style={styles.label}>Thời gian kết thúc</Text>
            <TouchableOpacity
              style={styles.pickerButton}
              onPress={() => setShowEndDatePicker(true)}
            >
              <Text style={styles.pickerText}>{formatDateTime(selectedEvent?.end_time)}</Text>
            </TouchableOpacity>
            <Modal
              visible={showEndDatePicker}
              transparent={true}
              animationType="slide"
              onRequestClose={() => setShowEndDatePicker(false)}
            >
              <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                  <Text style={styles.modalTitle}>Chọn ngày kết thúc</Text>
                  <DateTimePicker
                    value={localEndDate || new Date(selectedEvent?.end_time || Date.now())}
                    mode="date"
                    display={Platform.OS === 'ios' ? 'inline' : 'default'}
                    onChange={onEndDateChange}
                  />
                  <View style={styles.modalButtons}>
                    <Button
                      mode="contained"
                      onPress={confirmEndDate}
                      style={styles.modalButton}
                      buttonColor={colors.bluePrimary}
                      labelStyle={styles.buttonLabel}
                    >
                      Xác nhận
                    </Button>
                    <Button
                      mode="outlined"
                      onPress={() => setShowEndDatePicker(false)}
                      style={styles.modalButton}
                      textColor={colors.bluePrimary}
                      labelStyle={styles.buttonLabel}
                    >
                      Hủy
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
              <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                  <Text style={styles.modalTitle}>Chọn giờ kết thúc</Text>
                  <DateTimePicker
                    value={localEndTime || new Date(selectedEvent?.end_time || Date.now())}
                    mode="time"
                    display={Platform.OS === 'ios' ? 'inline' : 'default'}
                    onChange={onEndTimeChange}
                  />
                  <View style={styles.modalButtons}>
                    <Button
                      mode="contained"
                      onPress={confirmEndTime}
                      style={styles.modalButton}
                      buttonColor={colors.bluePrimary}
                      labelStyle={styles.buttonLabel}
                    >
                      Xác nhận
                    </Button>
                    <Button
                      mode="outlined"
                      onPress={() => setShowEndTimePicker(false)}
                      style={styles.modalButton}
                      textColor={colors.bluePrimary}
                      labelStyle={styles.buttonLabel}
                    >
                      Hủy
                    </Button>
                  </View>
                </View>
              </View>
            </Modal>
          </View>
          <View style={[styles.row, { marginVertical: 8 }]}>
            <TextInput
              label="Số vé tối đa"
              value={selectedEvent?.total_tickets?.toString() || ''}
              onChangeText={(text) => changeEvent('total_tickets', text)}
              style={[styles.input, styles.halfInput]}
              mode="outlined"
              outlineColor={colors.bluePrimary}
              keyboardType="number-pad"
              theme={{ roundness: 8 }}
            />
            <TextInput
              label="Giá vé (VNĐ)"
              value={selectedEvent?.ticket_price?.toString() || ''}
              onChangeText={(text) => changeEvent('ticket_price', text)}
              style={[styles.input, styles.halfInput]}
              mode="outlined"
              outlineColor={colors.bluePrimary}
              keyboardType="numeric"
              theme={{ roundness: 8 }}
            />
          </View>
          {statistics && (
            <Card style={[styles.statsCard, { marginVertical: 8 }]}>
              <Card.Content>
                <Text style={styles.sectionTitle}>Thống kê</Text>
                <Text style={styles.statsText}>Vé đã bán: {statistics.tickets_sold}</Text>
                <Text style={styles.statsText}>Doanh thu: {statistics.revenue} VNĐ</Text>
                <Text style={styles.statsText}>Đánh giá trung bình: {statistics.average_rating.toFixed(1)}</Text>
              </Card.Content>
            </Card>
          )}
          <View style={[styles.modalButtons, { marginVertical: 8 }]}>
            <Button
              mode="contained"
              onPress={updateEvent}
              loading={updating}
              disabled={updating}
              style={styles.modalButton}
              buttonColor={colors.bluePrimary}
              labelStyle={styles.buttonLabel}
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
              style={styles.modalButton}
              textColor={colors.bluePrimary}
              labelStyle={styles.buttonLabel}
            >
              Hủy
            </Button>
          </View>
        </ScrollView>
      </View>
    );
  };

  const modalData = [
    {
      key: 'update',
      title: 'Cập nhật',
      content: <UpdateSection />,
    },
    {
      key: 'reviews',
      title: 'Đánh giá',
      content: <ReviewSection />,
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
      <View style={styles.container}>
        <Text style={styles.pageTitle}>Quản lý sự kiện</Text>
        <FlatList
          data={events}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => (
            <TouchableOpacity onPress={() => handleSelectEvent(item)}>
              <Card style={styles.eventCard}>
                <Card.Content style={styles.eventContent}>
                  <Text style={styles.eventTitle}>{item.title}</Text>
                  <Text style={styles.eventDetail}>Địa điểm: {item.location}</Text>
                  <Text style={styles.eventDetail}>
                    Thời gian: {new Date(item.start_time).toLocaleString('vi-VN')}
                  </Text>
                  <Text style={styles.eventPrice}>Giá vé: {item.ticket_price || 'Miễn phí'} VNĐ</Text>
                </Card.Content>
              </Card>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            loading ? (
              <Text style={styles.infoText}>Đang tải...</Text>
            ) : (
              <Text style={styles.infoText}>Không có sự kiện nào để hiển thị.</Text>
            )
          }
          contentContainerStyle={styles.eventList}
          showsVerticalScrollIndicator={false}
        />
      </View>
      {selectedEvent && (
        <Modal
          visible={showEditModal}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setShowEditModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { maxHeight: screenHeight * 0.85 }]}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                  {activeTab === 'update' ? 'Chỉnh sửa sự kiện' : 'Đánh giá & Phản hồi'}
                </Text>
                <IconButton
                  icon="close"
                  size={24}
                  onPress={() => {
                    setShowEditModal(false);
                    setPoster(null);
                    setShowImageOptions(false);
                    setReviews([]);
                  }}
                  iconColor={colors.blueGray}
                />
              </View>
              <View style={styles.tabContainer}>
                {modalData.map((tab) => (
                  <TouchableOpacity
                    key={tab.key}
                    style={[styles.tab, activeTab === tab.key && styles.activeTab]}
                    onPress={() => setActiveTab(tab.key)}
                  >
                    <Text style={[styles.tabText, activeTab === tab.key && styles.activeTabText]}>
                      {tab.title}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <View style={styles.modalBody}>
                {modalData.find(tab => tab.key === activeTab)?.content}
              </View>
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
    backgroundColor: colors.grayLight,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  pageTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.navy,
    textAlign: 'center',
    marginBottom: 16,
  },
  eventCard: {
    marginBottom: 12,
    borderRadius: 8,
    backgroundColor: colors.white,
    elevation: 3,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  eventContent: {
    padding: 12,
  },
  eventTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.navy,
    marginBottom: 4,
  },
  eventDetail: {
    fontSize: 14,
    color: colors.blueGray,
    marginBottom: 4,
  },
  eventPrice: {
    fontSize: 14,
    color: colors.bluePrimary,
    fontWeight: '500',
  },
  eventList: {
    paddingBottom: 16,
  },
  infoText: {
    fontSize: 16,
    color: colors.blueGray,
    textAlign: 'center',
    paddingVertical: 20,
  },
  errorText: {
    fontSize: 18,
    color: colors.redError,
    textAlign: 'center',
    paddingVertical: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.blackTransparent,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: colors.white,
    borderRadius: 12,
    width: '90%',
    padding: 16,
    maxHeight: '85%',
    elevation: 5,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.navy,
  },
  tabContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.blueLight,
    marginBottom: 12,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
  },
  tabText: {
    fontSize: 16,
    color: colors.blueGray,
    fontWeight: '500',
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: colors.bluePrimary,
  },
  activeTabText: {
    color: colors.bluePrimary,
    fontWeight: '600',
  },
  modalBody: {
    flexGrow: 1,
  },
  sectionContainer: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.navy,
    marginBottom: 12,
  },
  updateScroll: {
    paddingBottom: 20,
  },
  inputContainer: {
    marginBottom: 12,
  },
  input: {
    marginBottom: 12,
    backgroundColor: colors.white,
    borderRadius: 8,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  halfInput: {
    flex: 0.48,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.navy,
    marginBottom: 8,
  },
  pickerButton: {
    padding: 12,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.bluePrimary,
    borderRadius: 8,
    alignItems: 'center',
  },
  pickerText: {
    fontSize: 14,
    color: colors.bluePrimary,
    fontWeight: '500',
  },
  imageContainer: {
    alignItems: 'center',
    marginBottom: 12,
    position: 'relative',
  },
  posterImage: {
    width: 200,
    height: 120,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.bluePrimary,
  },
  imagePlaceholder: {
    width: 200,
    height: 120,
    borderRadius: 8,
    backgroundColor: colors.blueLight,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.bluePrimary,
  },
  imagePlaceholderText: {
    fontSize: 14,
    color: colors.blueGray,
    fontWeight: '500',
  },
  removeImageIcon: {
    position: 'absolute',
    top: -10,
    right: -10,
    borderRadius: 20,
  },
  imageOptions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    width: 200,
  },
  imageOptionButton: {
    flex: 0.48,
    borderRadius: 8,
    borderColor: colors.bluePrimary,
  },
  categoryList: {
    paddingBottom: 16,
  },
  categoryItem: {
    padding: 12,
    backgroundColor: colors.blueLight,
    borderRadius: 8,
    marginBottom: 8,
    alignItems: 'center',
  },
  categoryItemText: {
    fontSize: 14,
    color: colors.navy,
    fontWeight: '500',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  modalButton: {
    flex: 0.48,
    borderRadius: 8,
  },
  buttonLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  statsCard: {
    borderRadius: 8,
    backgroundColor: colors.white,
    elevation: 3,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    marginBottom: 12,
  },
  statsText: {
    fontSize: 14,
    color: colors.blueGray,
    marginBottom: 6,
  },
  reviewCard: {
    borderRadius: 8,
    backgroundColor: colors.white,
    elevation: 3,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    marginBottom: 12,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  reviewUsername: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.navy,
  },
  reviewRating: {
    fontSize: 14,
    color: colors.blueGray,
    marginTop: 4,
  },
  reviewComment: {
    fontSize: 14,
    color: colors.navy,
    marginBottom: 8,
  },
  reviewDate: {
    fontSize: 12,
    color: colors.blueGray,
    textAlign: 'right',
  },
  replyButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: colors.blueLight,
    borderRadius: 6,
  },
  replyButtonText: {
    fontSize: 14,
    color: colors.bluePrimary,
    fontWeight: '500',
  },
  repliesContainer: {
    marginTop: 8,
    paddingLeft: 12,
    borderLeftWidth: 2,
    borderLeftColor: colors.blueLight,
  },
  replyItem: {
    marginBottom: 8,
  },
  replyUsername: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.navy,
  },
  replyComment: {
    fontSize: 13,
    color: colors.blueGray,
    marginVertical: 4,
  },
  replyDate: {
    fontSize: 12,
    color: colors.blueGray,
    textAlign: 'right',
  },
  reviewList: {
    paddingBottom: 16,
  },
  loadMoreButton: {
    borderRadius: 8,
    marginTop: 12,
  },
  replyModal: {
    backgroundColor: colors.white,
    borderRadius: 12,
    width: '90%',
    padding: 16,
    elevation: 5,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
  },
});

export default MyEvents;