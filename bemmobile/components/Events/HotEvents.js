import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  StyleSheet,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Apis, { endpoints } from '../../configs/Apis';
import { colors } from '../../styles/MyStyles';

const HotEvents = () => {
  const [hotEvents, setHotEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false); // Added refreshing state
  const navigation = useNavigation();

  const loadHotEvents = async () => {
    try {
      setLoading(true);
      setError(null);
      // Fetch top 5 hot events from event-trending-logs endpoint
      const res = await Apis.get(endpoints.eventTrendingLogs + '?page=1&page_size=5');
      console.log('res:', res);
      if (res.status === 200) {
        const results = res.data.results || [];
        setHotEvents(results);
      } else {
        setError('Failed to load hot events');
      }
    } catch (err) {
      setError('Error loading hot events: ' + err.message);
    } finally {
      setLoading(false);
      setRefreshing(false); // Stop refreshing when load completes
    }
  };

  useEffect(() => {
    loadHotEvents();
  }, []);

  const renderItem = ({ item, index }) => {
    let posterUrl = item.event_poster;
    if (posterUrl && !posterUrl.startsWith('http')) {
      posterUrl = `${Apis.defaults.baseURL.replace(/\/+$/, '')}/${posterUrl.replace(/^\/+/, '')}`;
    }

    return (
      <>
        {console.log('event id:', item.event)}
      <TouchableOpacity
        style={styles.eventItem}
        onPress={() => navigation.navigate('EventDetails', { event: { id: item.event } })}
      >
          <Text style={styles.rank}>{index + 1}</Text>
          <Image
            source={{ uri: posterUrl || 'https://via.placeholder.com/60' }}
            style={styles.eventImage}
          />
          <View style={styles.eventContent}>
            <Text style={styles.eventTitle}>{item.event_title || 'Untitled'}</Text>
          </View>
        </TouchableOpacity>
      </>
    );
  };

  if (loading) {
    return <ActivityIndicator size="large" color="#007bff" style={styles.loading} />;
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  if (hotEvents.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No hot events found</Text>
      </View>
    );
  }

  const onRefresh = () => {
    setRefreshing(true);
    loadHotEvents();
  };

  return (
    <FlatList
      data={hotEvents}
      renderItem={renderItem}
      keyExtractor={(item) => item.event.toString()}
      contentContainerStyle={styles.listContainer}
      refreshing={refreshing} // Added refreshing prop
      onRefresh={onRefresh} // Added onRefresh prop
    />
  );
};

const styles = StyleSheet.create({
  listContainer: {
    paddingVertical: 10,
  },
  eventItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderColor: '#ddd',
  },
  rank: {
    fontSize: 24,
    fontWeight: 'bold',
    width: 30,
    textAlign: 'center',
    color: colors.blueAccent,
  },
  eventImage: {
    width: 60,
    height: 60,
    borderRadius: 6,
    marginLeft: 10,
  },
  eventContent: {
    marginLeft: 15,
    flex: 1,
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  loading: {
    marginTop: 20,
  },
  errorContainer: {
    padding: 20,
    alignItems: 'center',
  },
  errorText: {
    color: 'red',
  },
  emptyContainer: {
    padding: 20,
    alignItems: 'center',
  },
  emptyText: {
    color: '#666',
  },
});

export default HotEvents;
