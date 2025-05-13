import React, { useState, useEffect,useContext } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Apis, { endpoints, authApis } from '../../configs/Apis';
import AsyncStorage from '@react-native-async-storage/async-storage';
import MyStyles, { colors } from '../../styles/MyStyles';
import { MyUserContext } from "../../configs/MyContexts";


const SuggestEvents = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigation = useNavigation();
  const user = useContext(MyUserContext);

  // Function to check login/authentication
  const checkLogin = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      console.log('Token in suggestEvents:', token);
      if (!user || !token) {
        Alert.alert('Thông báo', 'Vui lòng đăng nhập để xem các sự kiện được đề xuất.');
        setTimeout(() => {
          navigation.reset({
            index: 0,
            routes: [{ name: 'loginStack' }],
          });
        }, 2000);
        return false;
      }
      return true;
    } catch (err) {
      setError('Lỗi khi kiểm tra đăng nhập: ' + err.message);
      return false;
    }
  };

  // Function to fetch suggested events
  const fetchSuggestEvents = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        setError('Token không tồn tại, vui lòng đăng nhập lại.');
        setLoading(false);
        return;
      }
      const res = await authApis(token).get(endpoints.suggestEvents);
      if (res.status === 200) {
        const results = Array.isArray(res.data) ? res.data : [];
        setEvents(results);
        setError(null);
      } else {
        setError('Không thể tải các sự kiện được đề xuất.');
      }
    } catch (err) {
      setError('Lỗi khi tải các sự kiện được đề xuất: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      const loggedIn = await checkLogin();
      if (loggedIn) {
        await fetchSuggestEvents();
      }
    };

    loadData();
  }, [navigation]);

  const onEventPress = (event) => {
    navigation.navigate('EventDetails', { event });
  };

  const renderEventItem = ({ item }) => {
    let posterUrl = item.poster;
    if (posterUrl && !posterUrl.startsWith('http')) {
      posterUrl = `${Apis.defaults.baseURL.replace(/\/+$/, '')}/${posterUrl.replace(/^\/+/, '')}`;
    }

    return (
      <TouchableOpacity
        style={MyStyles.eventItem}
        onPress={() => onEventPress(item)}
      >
        <Image
          source={{ uri: posterUrl || 'https://via.placeholder.com/60' }}
          style={MyStyles.eventImage}
        />
        <View style={MyStyles.eventContent}>
          <Text style={MyStyles.eventTitle}>{item.title || 'Untitled'}</Text>
          <Text style={MyStyles.eventDetail}>
            Date: {item.start_time ? new Date(item.start_time).toLocaleDateString() : 'N/A'}
          </Text>
          <Text style={MyStyles.eventDetail}>Location: {item.location || 'N/A'}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  const safeEvents = Array.isArray(events) ? events : [];

  return (
    <SafeAreaView style={MyStyles.container}>
      <View style={MyStyles.scrollContainer}>
        {error && (
          <View style={{ padding: 10, backgroundColor: colors.blueLight, marginBottom: 10 }}>
            <Text style={{ color: colors.blue }}>{error}</Text>
          </View>
        )}

        {loading ? (
          <ActivityIndicator size="large" color={colors.bluePrimary} />
        ) : safeEvents.length === 0 ? (
          <Text style={{ textAlign: 'center', marginTop: 20 }}>Không có sự kiện được đề xuất</Text>
        ) : (
          <FlatList
            data={safeEvents}
            renderItem={renderEventItem}
            keyExtractor={(item) => item.id.toString()}
          />
        )}
      </View>
    </SafeAreaView>
  );
};

export default SuggestEvents;
