import React, { useEffect, useState } from 'react';
import {
  View, Text, ActivityIndicator, ScrollView,
  StyleSheet, Image
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Apis, { endpoints, authApis } from '../../configs/Apis';
import AsyncStorage from '@react-native-async-storage/async-storage';

const EventDetails = ({ route }) => {
  const { event } = route.params;
  const [eventDetail, setEventDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchEventDetail = async () => {
      try {
        setLoading(true);
        setError(null);
        const token = await AsyncStorage.getItem('token');
        if (!token) {
          setError('Vui lòng đăng nhập để xem chi tiết sự kiện.');
          setLoading(false);
          return;
        }
        
        const api = token ? authApis(token) : Apis;
        const res = await api.get(endpoints.eventDetail(event.id));
        setEventDetail(res.data);

        
      } catch (err) {
        setError('Không thể tải chi tiết sự kiện.');
      } finally {
        setLoading(false);
      }
    };
    fetchEventDetail();
  }, [event.id]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#1a73e8" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={{ color: 'red' }}>{error}</Text>
      </View>
    );
  }

  if (!eventDetail) {
    return (
      <View style={styles.center}>
        <Text>Không có dữ liệu sự kiện.</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {eventDetail.poster && (
        <Image source={{ uri: eventDetail.poster }} style={styles.poster} />
      )}

      <Text style={styles.title}>{eventDetail.title}</Text>

      <View style={styles.section}>
        <InfoRow icon="tag" text={eventDetail.category} />
        <InfoRow icon="map-marker" text={eventDetail.location} />
        <InfoRow icon="calendar" text={`Bắt đầu: ${new Date(eventDetail.start_time).toLocaleString()}`} />
        <InfoRow icon="calendar" text={`Kết thúc: ${new Date(eventDetail.end_time).toLocaleString()}`} />
        <InfoRow icon="ticket" text={`Tổng vé: ${eventDetail.total_tickets}`} />
        <InfoRow icon="ticket-confirmation" text={`Đã bán: ${eventDetail.sold_tickets}`} />
        <InfoRow icon="currency-usd" text={`Giá vé: ${eventDetail.ticket_price ? eventDetail.ticket_price + ' VND' : 'N/A'}`} />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Tags</Text>
      <View style={styles.tagsContainer}>
        {eventDetail.tags && eventDetail.tags.length > 0 ? (
          eventDetail.tags.map((tag, index) => (
            <View key={tag.id ?? index} style={styles.tag}>
              <Text style={styles.tagText}>{tag.name}</Text>
            </View>
          ))
        ) : (
          <Text style={styles.noTags}>Không có thẻ</Text>
        )}
      </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Mô tả</Text>
        <Text style={styles.description}>{eventDetail.description}</Text>
      </View>
    </ScrollView>
  );
};

// Component phụ: Hiển thị dòng icon + nội dung
const InfoRow = ({ icon, text }) => (
  <View style={styles.row}>
    <Icon name={icon} size={20} color="#555" />
    <Text style={styles.detail}>{text}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#fff',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  poster: {
    width: '100%',
    height: 220,
    borderRadius: 12,
    marginBottom: 16,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 12,
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  detail: {
    fontSize: 16,
    marginLeft: 8,
    color: '#444',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  tag: {
    backgroundColor: '#e0f2f1',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
    marginBottom: 8,
  },
  tagText: {
    fontSize: 14,
    color: '#00796b',
  },
  noTags: {
    fontSize: 14,
    color: '#999',
  },
  description: {
    fontSize: 16,
    color: '#444',
    lineHeight: 22,
  },
});

export default EventDetails;
