import React, { useState, useEffect, useContext } from 'react';
import { View, StyleSheet, Alert, Text, TouchableOpacity, SafeAreaView, Modal, FlatList, Image, KeyboardAvoidingView, ScrollView, Platform, StatusBar, Dimensions } from 'react-native';
import { TextInput, Button, Title, useTheme, IconButton } from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MyUserContext, MyDispatchContext } from '../../configs/MyContexts';
import Apis, { endpoints, authApis } from '../../configs/Apis';
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { MaterialIcons } from '@expo/vector-icons';
import MyStyles, { colors } from '../../styles/MyStyles';

const CreateEvents = () => {
  const theme = useTheme();
  const user = useContext(MyUserContext);
  const dispatch = useContext(MyDispatchContext);
  const screenHeight = Dimensions.get('window').height;

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
  const [pendingStartDate, setPendingStartDate] = useState(null);
  const [pendingEndDate, setPendingEndDate] = useState(null);
  const [creating, setCreating] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [showImageOptions, setShowImageOptions] = useState(false);

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    if (showStartDatePicker) {
      if (event.start_time) {
        const date = new Date(event.start_time);
        setTempStartDate(date);
        setTempStartTime(date);
      } else {
        const now = new Date();
        setTempStartDate(now);
        setTempStartTime(now);
      }
    }
  }, [showStartDatePicker, event.start_time]);

  useEffect(() => {
    if (showEndDatePicker) {
      if (event.end_time) {
        const date = new Date(event.end_time);
        setTempEndDate(date);
        setTempEndTime(date);
      } else {
        const now = new Date();
        setTempEndDate(now);
        setTempEndTime(now);
      }
    }
  }, [showEndDatePicker, event.end_time]);

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
    if (event.type === "dismissed") {
      setShowStartDatePicker(false);
      setPendingStartDate(null);
      return;
    }
    if (selectedDate) {
      setTempStartDate(selectedDate);
      setShowStartDatePicker(false);
      setShowStartTimePicker(true);
    }
  };

  const onStartTimeChange = (event, selectedTime) => {
    if (event.type === "dismissed") {
      setShowStartTimePicker(false);
      return;
    }
    if (selectedTime) {
      setTempStartTime(selectedTime);
      setShowStartTimePicker(false);
      const newDate = new Date(tempStartDate);
      newDate.setHours(selectedTime.getHours(), selectedTime.getMinutes());
      changeEvent("start_time", newDate.toISOString());
    }
  };

  const onEndDateChange = (event, selectedDate) => {
    if (event.type === "dismissed") {
      setShowEndDatePicker(false);
      setPendingEndDate(null);
      return;
    }
    if (selectedDate) {
      setTempEndDate(selectedDate);
      setShowEndDatePicker(false);
      setShowEndTimePicker(true);
    }
  };

  const onEndTimeChange = (event, selectedTime) => {
    if (event.type === "dismissed") {
      setShowEndTimePicker(false);
      return;
    }
    if (selectedTime) {
      setTempEndTime(selectedTime);
      setShowEndTimePicker(false);
      const newDate = new Date(tempEndDate);
      newDate.setHours(selectedTime.getHours(), selectedTime.getMinutes());
      changeEvent("end_time", newDate.toISOString());
    }
  };

  const formatDateTime = (isoString) => {
    if (!isoString) return <Text>Chưa chọn</Text>;
    const date = new Date(isoString);
    return date.toLocaleString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const validate = () => {
    if (!event.title.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập tiêu đề sự kiện.');
      return false;
    }
    if (!event.description.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập mô tả sự kiện.');
      return false;
    }
    if (!event.location.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập địa điểm.');
      return false;
    }
    if (!event.category) {
      Alert.alert('Lỗi', 'Vui lòng chọn danh mục.');
      return false;
    }
    if (!event.start_time) {
      Alert.alert('Lỗi', 'Vui lòng chọn thời gian bắt đầu.');
      return false;
    }
    if (!event.end_time) {
      Alert.alert('Lỗi', 'Vui lòng chọn thời gian kết thúc.');
      return false;
    }
    if (new Date(event.start_time) >= new Date(event.end_time)) {
      Alert.alert('Lỗi', 'Thời gian kết thúc phải sau thời gian bắt đầu.');
      return false;
    }
    const totalTickets = parseInt(event.total_tickets);
    if (!event.total_tickets || isNaN(totalTickets) || totalTickets <= 0) {
      Alert.alert('Lỗi', 'Số vé tối đa phải là số nguyên dương.');
      return false;
    }
    const ticketPrice = parseFloat(event.ticket_price);
    if (!event.ticket_price || isNaN(ticketPrice) || ticketPrice < 0) {
      Alert.alert('Lỗi', 'Giá vé phải là số không âm.');
      return false;
    }
    const latitude = parseFloat(event.latitude);
    if (event.latitude && (isNaN(latitude) || latitude < -90 || latitude > 90)) {
      Alert.alert('Lỗi', 'Vĩ độ phải nằm trong khoảng từ -90 đến 90.');
      return false;
    }
    const longitude = parseFloat(event.longitude);
    if (event.longitude && (isNaN(longitude) || longitude < -180 || longitude > 180)) {
      Alert.alert('Lỗi', 'Kinh độ phải nằm trong khoảng từ -180 đến 180.');
      return false;
    }
    if (!poster) {
      Alert.alert('Lỗi', 'Vui lòng chọn ảnh poster.');
      return false;
    }
    return true;
  };

  const createEvent = async () => {
    if (!user || user.role !== 'organizer') {
      Alert.alert('Error', 'Only organizers can create events!');
      return;
    }

    if (!validate()) return;

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
        const fileType = uriParts[uriParts.length - 1].toLowerCase();
        const response = await fetch(poster);
        const blob = await response.blob();
        formData.append('poster', {
          uri: poster,
          name: `poster.${fileType}`,
          type: `image/${fileType === 'jpg' ? 'jpeg' : fileType}`,
        });
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
        Alert.alert('Error', errors.detail || 'Failed to create event. Please try again.');
      } else {
        console.error("Create event error:", error.message);
        Alert.alert('Error', 'Server error. Please try again later.');
      }
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
          outlineColor={colors.bluePrimary}
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
          outlineColor={colors.bluePrimary}
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
          outlineColor={colors.bluePrimary}
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
          outlineColor={colors.bluePrimary}
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
          outlineColor={colors.bluePrimary}
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
              <Button mode="outlined" onPress={pickImage} style={styles.imageOptionButton} textColor={colors.bluePrimary}>
                Thư viện
              </Button>
              <Button mode="outlined" onPress={pickImageFromCamera} style={styles.imageOptionButton} textColor={colors.bluePrimary}>
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
              <View style={[styles.modalContent, { maxHeight: screenHeight * 0.6 }]}>
                <View style={styles.header}>
                  <TouchableOpacity
                    style={styles.closeButtonIcon}
                    onPress={() => setShowCategoryModal(false)}
                  >
                    <MaterialIcons name="close" size={24} color={colors.blueGray} />
                  </TouchableOpacity>
                </View>
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
              <View style={[styles.modalContent, { maxHeight: screenHeight * 0.5 }]}>
                <View style={styles.header}>
                  <TouchableOpacity
                    style={styles.closeButtonIcon}
                    onPress={() => setShowStartDatePicker(false)}
                  >
                    <MaterialIcons name="close" size={24} color={colors.blueGray} />
                  </TouchableOpacity>
                </View>
                <Text style={styles.pickerLabel}>Chọn ngày</Text>
                <DateTimePicker
                  value={tempStartDate}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'inline' : 'spinner'}
                  onChange={onStartDateChange}
                />
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
                <View style={styles.header}>
                  <TouchableOpacity
                    style={styles.closeButtonIcon}
                    onPress={() => setShowStartTimePicker(false)}
                  >
                    <MaterialIcons name="close" size={24} color={colors.blueGray} />
                  </TouchableOpacity>
                </View>
                <Text style={styles.pickerLabel}>Chọn giờ</Text>
                <DateTimePicker
                  value={tempStartTime}
                  mode="time"
                  display={Platform.OS === 'ios' ? 'inline' : 'spinner'}
                  onChange={onStartTimeChange}
                />
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
              <View style={[styles.modalContent, { maxHeight: screenHeight * 0.5 }]}>
                <View style={styles.header}>
                  <TouchableOpacity
                    style={styles.closeButtonIcon}
                    onPress={() => setShowEndDatePicker(false)}
                  >
                    <MaterialIcons name="close" size={24} color={colors.blueGray} />
                  </TouchableOpacity>
                </View>
                <Text style={styles.pickerLabel}>Chọn ngày</Text>
                <DateTimePicker
                  value={tempEndDate}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'inline' : 'spinner'}
                  onChange={onEndDateChange}
                />
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
                <View style={styles.header}>
                  <TouchableOpacity
                    style={styles.closeButtonIcon}
                    onPress={() => setShowEndTimePicker(false)}
                  >
                    <MaterialIcons name="close" size={24} color={colors.blueGray} />
                  </TouchableOpacity>
                </View>
                <Text style={styles.pickerLabel}>Chọn giờ</Text>
                <DateTimePicker
                  value={tempEndTime}
                  mode="time"
                  display={Platform.OS === 'ios' ? 'inline' : 'spinner'}
                  onChange={onEndTimeChange}
                />
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
          outlineColor={colors.bluePrimary}
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
          outlineColor={colors.bluePrimary}
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
            buttonColor={colors.bluePrimary}
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
            textColor={colors.bluePrimary}
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
      <SafeAreaView style={[styles.safeArea, { paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 }]}>
        <View style={styles.container}>
          <Text style={styles.errorText}>Chỉ có organizer mới có thể tạo sự kiện.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 }]}>
      <KeyboardAvoidingView
        style={styles.keyboardAvoidingContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'android' ? 24 : 0}
      >
        <ScrollView
          contentContainerStyle={[styles.scrollContainer, { paddingBottom: Platform.OS === 'android' ? 30 : 20 }]}
          showsVerticalScrollIndicator={false}
        >
          <FlatList
            data={modalData}
            keyExtractor={(item, index) => `${item.type}-${index}`}
            renderItem={({ item }) => item.content}
            contentContainerStyle={[styles.modalScrollContent, { paddingBottom: Platform.OS === 'android' ? 16 : 0 }]}
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
    backgroundColor: colors.grayLight,
  },
  keyboardAvoidingContainer: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingVertical: 24,
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  subtitle: {
    textAlign: 'center',
    marginBottom: 16,
    fontSize: 22,
    fontWeight: '600',
    color: colors.navy,
    paddingTop: 8,
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
    backgroundColor: colors.grayMedium,
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
    backgroundColor: colors.grayLightest,
    borderRadius: 8,
    marginBottom: 8,
    width: '100%',
  },
  categoryItemText: {
    fontSize: 14,
    color: colors.navy,
    textAlign: 'center',
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
  modalButtonContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
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
  modalScrollContent: {
    flexGrow: 1,
  },
  errorText: {
    textAlign: 'center',
    fontSize: 14,
    color: colors.redError,
    marginBottom: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 10,
  },
  closeButtonIcon: {
    padding: 5,
  },
});

export default CreateEvents;