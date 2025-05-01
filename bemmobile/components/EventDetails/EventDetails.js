import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, ScrollView, StyleSheet } from 'react-native';
import Apis, { endpoints } from '../../configs/Apis';

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
        const res = await Apis.get(endpoints.eventDetail(event.id));
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
      <Text style={styles.title}>{eventDetail.title}</Text>
      <Text style={styles.detail}>Category: {eventDetail.category}</Text>
      <Text style={styles.detail}>Location: {eventDetail.location}</Text>
      <Text style={styles.detail}>Start Time: {new Date(eventDetail.start_time).toLocaleString()}</Text>
      <Text style={styles.detail}>Description: {eventDetail.description}</Text>
      {/* Bạn có thể thêm các trường chi tiết khác ở đây */}
    </ScrollView>
  );
};

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
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  detail: {
    fontSize: 16,
    marginBottom: 8,
  },
});

export default EventDetails;
