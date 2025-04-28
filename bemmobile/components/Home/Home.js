import React, { useState, useEffect } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Image,
} from 'react-native';
import { Searchbar, Chip } from 'react-native-paper';
import MyStyles from '../../styles/MyStyles';
import { useNavigation } from '@react-navigation/native';
import Apis, { endpoints } from '../../configs/Apis';

const Home = () => {
  const [categories, setCategories] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [q, setQ] = useState('');
  const [cateId, setCateId] = useState(null);
  const navigation = useNavigation();

  // Lấy danh sách danh mục (tags)
  const loadCategories = async () => {
    try {
      const res = await Apis.get(endpoints['tags']);
      // Chuyển đổi dữ liệu tags thành định dạng phù hợp
      const formattedCategories = res.data.map((tag) => ({
        id: tag.name, // Dùng name làm id
        name: tag.name,
      }));
      setCategories(formattedCategories);
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

  // Lấy danh sách sự kiện
  const loadEvents = async () => {
    if (page > 0) {
      try {
        setLoading(true);
        let url = `${endpoints['events']}?page=${page}`;
        if (q) url += `&q=${q}`;
        if (cateId) url += `&tag=${cateId}`; // Lọc theo tag

        const res = await Apis.get(url);
        setEvents((prevEvents) =>
          page === 1 ? res.data.results : [...prevEvents, ...res.data.results]
        );

        // Nếu không còn dữ liệu để tải, đặt page = 0
        if (!res.data.next) {
          setPage(0);
        }
      } catch (error) {
        console.error('Error loading events:', error);
      } finally {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    loadCategories();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadEvents();
    }, 500);

    return () => clearTimeout(timer);
  }, [q, page, cateId]);

  const loadMore = () => {
    if (!loading && page > 0) {
      setPage(page + 1);
    }
  };

  const search = (value, callback) => {
    setPage(1);
    setEvents([]);
    callback(value);
  };

  const renderEventItem = ({ item }) => (
    <TouchableOpacity
      style={MyStyles.eventItem}
      onPress={() => navigation.navigate('EventDetails', { event: item })}
    >
      <Image
        source={{ uri: item.image || 'https://via.placeholder.com/60' }}
        style={MyStyles.eventImage}
      />
      <View style={MyStyles.eventContent}>
        <Text style={MyStyles.eventTitle}>{item.title}</Text>
        <Text style={MyStyles.eventDetail}>
          Date: {new Date(item.start_time).toLocaleDateString()}
        </Text>
        <Text style={MyStyles.eventDetail}>Location: {item.location}</Text>
        <Text style={MyStyles.eventPrice}>
          Price: ${parseFloat(item.ticket_price).toFixed(2)}
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={MyStyles.container}>
      <View style={MyStyles.scrollContainer}>
        {/* Thanh tìm kiếm */}
        <Searchbar
          placeholder="Search events..."
          onChangeText={(text) => search(text, setQ)}
          value={q}
          style={MyStyles.searchbar}
        />

        {/* Danh sách danh mục */}
        <View style={[MyStyles.row, MyStyles.wrap]}>
          <TouchableOpacity onPress={() => search(null, setCateId)}>
            <Chip
              style={[MyStyles.chip, cateId === null && MyStyles.chipSelected]}
              textStyle={[
                MyStyles.chipText,
                cateId === null && MyStyles.chipTextSelected,
              ]}
              icon="label"
            >
              All
            </Chip>
          </TouchableOpacity>
          {categories.map((c) => (
            <TouchableOpacity
              key={`Cate${c.id}`}
              onPress={() => search(c.id, setCateId)}
            >
              <Chip
                style={[MyStyles.chip, cateId === c.id && MyStyles.chipSelected]}
                textStyle={[
                  MyStyles.chipText,
                  cateId === c.id && MyStyles.chipTextSelected,
                ]}
                icon="label"
              >
                {c.name}
              </Chip>
            </TouchableOpacity>
          ))}
        </View>

        {/* Danh sách sự kiện */}
        <FlatList
          data={events}
          renderItem={renderEventItem}
          keyExtractor={(item) => item.id.toString()}
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={
            loading && <ActivityIndicator size="large" color="#1a73e8" />
          }
        />
      </View>
    </SafeAreaView>
  );
};

export default Home;