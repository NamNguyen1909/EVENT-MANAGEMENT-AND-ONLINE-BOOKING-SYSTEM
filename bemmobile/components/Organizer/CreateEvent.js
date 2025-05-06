import React, { useState, useEffect, useContext } from 'react';
import { View, StyleSheet, Alert, Text, TouchableOpacity, SafeAreaView, Modal, FlatList, Image, KeyboardAvoidingView, ScrollView, Platform } from 'react-native';
import { TextInput, Button, Title, Card, useTheme, IconButton } from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MyUserContext, MyDispatchContext } from '../../configs/MyContexts';
import Apis, { endpoints, authApis } from '../../configs/Apis';
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker';

const CreateEvents = () => {
  const theme = useTheme();
  const user = useContext(MyUserContext);
  const dispatch = useContext(MyDispatchContext);

  const [event, setEvent] = useState({
    title: '',
    description: '',
    location: '',
    category: '',
    start_time: '',
    end_time: '',
    total_tickets: '',
    ticket_price: '',
    is_active: true,
    latitude: '',
    longitude: '',
  });
  const [poster, setPoster] = useState(null);
  const [categories, setCategories] = useState([]);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);
  const [tempStartDate, setTempStartDate] = useState(new Date());
  const [tempStartTime, setTempStartTime] = useState(new Date());
  const [tempEndDate, setTempEndDate] = useState(new Date());
  const [tempEndTime, setTempEndTime] = useState(new Date());
  const [creating, setCreating] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [showImageOptions, setShowImageOptions] = useState(false);

  useEffect(() => {
    fetchCategories();
  }, []);

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

  const changeEvent = (field, value) => {
    setEvent(current => ({ ...current, [field]: value }));
  };

  const pickImage = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        setErrorMsg('Cần cấp quyền truy cập thư viện ảnh!');
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
          setErrorMsg('Chỉ chấp nhận file PNG, JPG, JPEG!');
          return;
        }
        const response = await fetch(uri);
        const blob = await response.blob();
        if (blob.size > 5 * 1024 * 1024) {
          setErrorMsg('Ảnh không được lớn hơn 5MB!');
          return;
        }
        setPoster(uri);
        setShowImageOptions(false);
        setErrorMsg(null);
      }
    } catch (error) {
      console.error('Error picking image from library:', error);
      setErrorMsg('Có lỗi khi chọn ảnh. Vui lòng thử lại!');
    }
  };

  const pickImageFromCamera = async () => {
    try {
      const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
      if (!permissionResult.granted) {
        setErrorMsg('Cần cấp quyền truy cập camera!');
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
          setErrorMsg('Chỉ chấp nhận file PNG, JPG, JPEG!');
          return;
        }
        const response = await fetch(uri);
        const blob = await response.blob();
        if (blob.size > 5 * 1024 * 1024) {
          setErrorMsg('Ảnh không được lớn hơn 5MB!');
          return;
        }
        setPoster(uri);
        setShowImageOptions(false);
        setErrorMsg(null);
      }
    } catch (error) {
      console.error('Error picking image from camera:', error);
      setErrorMsg('Có lỗi khi chụp ảnh. Vui lòng thử lại!');
    }
  };

  const removeImage = () => {
    setPoster(null);
    setErrorMsg(null);
  };

  const selectCategory = (category) => {
    changeEvent('category', category);
    setShowCategoryModal(false);
  };

  const onStartDateChange = (event, selectedDate) => {
    if (selectedDate) setTempStartDate(selectedDate);
  };

  const confirmStartDate = () => {
    setShowStartDatePicker(false);
    if (tempStartDate) setShowStartTimePicker(true);
  };

  const onStartTimeChange = (event, selectedTime) => {
    if (selectedTime) setTempStartTime(selectedTime);
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
    if (selectedDate) setTempEndDate(selectedDate);
  };

  const confirmEndDate = () => {
    setShowEndDatePicker(false);
    if (tempEndDate) setShowEndTimePicker(true);
  };

  const onEndTimeChange = (event, selectedTime) => {
    if (selectedTime) setTempEndTime(selectedTime);
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

  const createEvent = async () => {
    if (!user || user.role !== 'organizer') {
      Alert.alert('Error', 'Only organizers can create events!');
      return;
    }

    setCreating(true);
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        Alert.alert('Error', 'No authentication token found!');
        return;
      }

      const formData = new FormData();
      formData.append('title', event.title || '');
      formData.append('description', event.description || '');
      formData.append('location', event.location || '');
      formData.append('category', event.category || '');
      formData.append('start_time', event.start_time || '');
      formData.append('end_time', event.end_time || '');
      formData.append('total_tickets', event.total_tickets ? parseInt(event.total_tickets) : 0);
      formData.append('ticket_price', event.ticket_price ? parseFloat(event.ticket_price).toFixed(2) : '0.00');
      formData.append('is_active', event.is_active ? 'true' : 'false');
      formData.append('latitude', event.latitude ? parseFloat(event.latitude).toString() : '');
      formData.append('longitude', event.longitude ? parseFloat(event.longitude).toString() : '');

      if (poster) {
        const uriParts = poster.split('.');
        const fileType = uriParts[uriParts.length - 1];
        const response = await fetch(poster);
        const blob = await response.blob();
        formData.append('poster', {
          uri: poster,
          name: `poster.${fileType}`,
          type: `image/${fileType}`,
        });
        console.log('Poster added to FormData:', { uri: poster, type: fileType });
      }

      console.log('FormData entries:');
      for (let [key, value] of formData.entries()) {
        console.log(`${key}: ${value instanceof Blob ? `File/Blob (size: ${value.size})` : value.toString()}`);
      }

      const api = authApis(token);
      const res = await api.post(endpoints['events'], formData, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
      });

      Alert.alert('Success', 'Sự kiện đã được tạo thành công!');
      setEvent({
        title: '',
        description: '',
        location: '',
        category: '',
        start_time: '',
        end_time: '',
        total_tickets: '',
        ticket_price: '',
        is_active: true,
        latitude: '',
        longitude: '',
      });
      setPoster(null);
      setShowImageOptions(false);
    } catch (error) {
      if (error.response && error.response.status === 401) {
        Alert.alert('Error', 'Authentication failed. Please log in again.');
        await AsyncStorage.removeItem('token');
        await AsyncStorage.removeItem('refresh_token');
        dispatch({ type: 'logout' });
      } else if (error.response?.data) {
        const errors = error.response.data;
        console.error("Create event error:", errors);
        Alert.alert('Error', errors.detail || 'Failed to create event. Please try again.');
      } else {
        console.error("Create event error:", error.message, error.response ? error.response.data : 'No response data');
      }
      Alert.alert('Error', 'Server error. Please try again later.');
    } finally {
      setCreating(false);
    }
  };

  const modalData = [
    {
      type: 'title',
      content: <Title style={styles.subtitle}>Tạo Sự Kiện Mới</Title>,
    },
    {
      type: 'error',
      content: errorMsg && (
        <Text style={styles.errorText}>{errorMsg}</Text>
      ),
    },
    {
      type: 'input',
      content: (
        <TextInput
          label="Tiêu đề"
          value={event.title}
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
          value={event.description}
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
          value={event.location}
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
          value={event.latitude}
          onChangeText={(text) => changeEvent('latitude', text)}
          style={styles.input}
          mode="outlined"
          outlineColor={theme.colors.primary}
          keyboardType="decimal-pad"
          theme={{ roundness: 10 }}
        />
      ),
    },
    {
      type: 'input',
      content: (
        <TextInput
          label="Longitude"
          value={event.longitude}
          onChangeText={(text) => changeEvent('longitude', text)}
          style={styles.input}
          mode="outlined"
          outlineColor={theme.colors.primary}
          keyboardType="decimal-pad"
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
              size={20}
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
              {event.category ? categories.find(cat => cat.value === event.category)?.label : 'Chọn danh mục'}
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
              {formatDateTime(event.start_time)}
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
                  value={tempStartDate}
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
                  value={tempStartTime}
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
              {formatDateTime(event.end_time)}
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
                  value={tempEndDate}
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
                  value={tempEndTime}
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
          value={event.total_tickets}
          onChangeText={(text) => changeEvent('total_tickets', text)}
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
          label="Giá vé (VNĐ)"
          value={event.ticket_price}
          onChangeText={(text) => changeEvent('ticket_price', text)}
          style={styles.input}
          mode="outlined"
          outlineColor={theme.colors.primary}
          keyboardType="decimal-pad"
          theme={{ roundness: 10 }}
        />
      ),
    },
    {
      type: 'buttons',
      content: (
        <View style={styles.modalButtonContainer}>
          <Button
            mode="contained"
            onPress={createEvent}
            loading={creating}
            disabled={creating}
            style={[styles.updateButton, { marginRight: 10 }]}
            labelStyle={styles.buttonLabel}
            contentStyle={styles.buttonContent}
          >
            Tạo sự kiện
          </Button>
          <Button
            mode="outlined"
            onPress={() => {
              setEvent({
                title: '',
                description: '',
                location: '',
                category: '',
                start_time: '',
                end_time: '',
                total_tickets: '',
                ticket_price: '',
                is_active: true,
                latitude: '',
                longitude: '',
              });
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
          <Text style={styles.errorText}>Chỉ có organizer mới có thể tạo sự kiện.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.keyboardAvoidingContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          <FlatList
            data={modalData}
            keyExtractor={(item, index) => `${item.type}-${index}`}
            renderItem={({ item }) => item.content}
            contentContainerStyle={styles.modalScrollContent}
            scrollEnabled={false}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  keyboardAvoidingContainer: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingVertical: 24,
  },
  subtitle: {
    textAlign: 'center',
    marginBottom: 16,
    fontSize: 22,
    fontWeight: '600',
    color: '#444',
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
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  modalButtonContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
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
  modalScrollContent: {
    paddingBottom: 20,
  },
  errorText: {
    textAlign: 'center',
    fontSize: 14,
    color: '#d32f2f',
    marginBottom: 10,
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
});

export default CreateEvents;