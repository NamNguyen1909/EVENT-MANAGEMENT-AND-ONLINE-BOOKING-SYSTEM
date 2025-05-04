import React, { useState, useContext } from 'react';
import { ScrollView, View, StyleSheet, Alert, Text } from 'react-native';
import { TextInput, Button, Title, useTheme } from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MyUserContext, MyDispatchContext } from '../../configs/MyContexts';
import Apis, { endpoints, authApis } from '../../configs/Apis';

const CreateEvent = () => {
  const theme = useTheme();
  const user = useContext(MyUserContext);
  const dispatch = useContext(MyDispatchContext); // Thêm dispatch để xử lý logout

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [category, setCategory] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [totalTickets, setTotalTickets] = useState('');
  const [ticketPrice, setTicketPrice] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCreateEvent = async () => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        Alert.alert('Error', 'No authentication token found! Please log in again.');
        return;
      }

      console.log('Token:', token); // Debug token
      const endpoint = endpoints['events'];
      const fullUrl = `${Apis.defaults.baseURL}${endpoint}`;
      console.log('Creating event at:', fullUrl); // Debug URL

      const data = {
        title,
        description,
        location,
        category,
        start_time: startTime,
        end_time: endTime || '',
        total_tickets: totalTickets || '',
        ticket_price: ticketPrice,
        is_active: true,
      };

      const api = authApis(token);
      console.log('Request headers:', api.defaults.headers); // Debug headers

      const res = await api.post(endpoint, data);
      console.log('API response for create event:', res.data, 'Status:', res.status);

      Alert.alert('Success', 'Sự kiện đã được tạo thành công!');
      setTitle('');
      setDescription('');
      setLocation('');
      setCategory('');
      setStartTime('');
      setEndTime('');
      setTotalTickets('');
      setTicketPrice('');
    } catch (error) {
      console.error('Create event error:', error.response ? error.response.data : error.message);
      if (error.response && error.response.status === 401) {
        Alert.alert('Error', 'Authentication failed. Please log in again.');
        await AsyncStorage.removeItem('token');
        await AsyncStorage.removeItem('refresh_token');
        dispatch({ type: 'logout' });
      } else if (error.response?.data) {
        const errors = error.response.data;
        Alert.alert('Error', errors.title ? errors.title[0] : 'Failed to create event. Please try again.');
      } else {
        Alert.alert('Error', 'Failed to create event. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  if (!user || user.role !== 'organizer') {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Chỉ có organizer mới có thể tạo sự kiện.</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Title style={styles.title}>Tạo Sự Kiện Mới</Title>

      <TextInput
        label="Tiêu đề"
        value={title}
        onChangeText={setTitle}
        style={styles.input}
        mode="outlined"
      />

      <TextInput
        label="Mô tả"
        value={description}
        onChangeText={setDescription}
        style={styles.input}
        mode="outlined"
        multiline
        numberOfLines={4}
      />

      <TextInput
        label="Địa điểm"
        value={location}
        onChangeText={setLocation}
        style={styles.input}
        mode="outlined"
      />

      <TextInput
        label="Danh mục"
        value={category}
        onChangeText={setCategory}
        style={styles.input}
        mode="outlined"
      />

      <TextInput
        label="Thời gian bắt đầu (YYYY-MM-DD HH:MM:SS)"
        value={startTime}
        onChangeText={setStartTime}
        style={styles.input}
        mode="outlined"
      />

      <TextInput
        label="Thời gian kết thúc (YYYY-MM-DD HH:MM:SS)"
        value={endTime}
        onChangeText={setEndTime}
        style={styles.input}
        mode="outlined"
      />

      <TextInput
        label="Số vé tối đa"
        value={totalTickets}
        onChangeText={setTotalTickets}
        style={styles.input}
        mode="outlined"
        keyboardType="numeric"
      />

      <TextInput
        label="Giá vé"
        value={ticketPrice}
        onChangeText={setTicketPrice}
        style={styles.input}
        mode="outlined"
        keyboardType="numeric"
      />

      <Button
        mode="contained"
        onPress={handleCreateEvent}
        loading={loading}
        disabled={loading}
        style={styles.button}
      >
        Tạo Sự Kiện
      </Button>
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
  input: {
    marginBottom: 15,
  },
  button: {
    marginTop: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  errorText: {
    textAlign: 'center',
    fontSize: 18,
    color: 'red',
    marginTop: 20,
  },
});

export default CreateEvent;