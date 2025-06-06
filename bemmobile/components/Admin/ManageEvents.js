import React, { useEffect, useState, useContext, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  StyleSheet,
  RefreshControl,
  Alert,
  Modal,
  TouchableOpacity,
  ScrollView,
  Image,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Searchbar, Button, Card, IconButton, SegmentedButtons } from 'react-native-paper';
import { endpoints, authApis } from '../../configs/Apis';
import { MyUserContext } from '../../configs/MyContexts';
import { colors } from '../../styles/MyStyles';

const ManageEvents = () => {
  const user = useContext(MyUserContext);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [nextPage, setNextPage] = useState(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [filters, setFilters] = useState({
    is_active: null,
  });
  const [tempFilters, setTempFilters] = useState(filters);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [statistics, setStatistics] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  // Fetch events from backend
  const fetchEvents = useCallback(async (pageUrl = endpoints.events, append = false) => {
    if (append && !nextPage) return;
    setLoading(!append);
    setLoadingMore(append);
    setError(null);
    try {
      const token = await AsyncStorage.getItem('token');
      if (!user || !token) {
        throw new Error('Vui lòng đăng nhập để xem danh sách sự kiện.');
      }
      const api = authApis(token);
      const params = {
        searching: search || undefined,
        is_active: filters.is_active !== null ? filters.is_active : undefined,
      };
      console.log('Query params:', params);
      const response = await api.get(pageUrl, { params });
      const eventList = (response.data.results || []).map(event => ({
        ...event,
        is_active: !!event.is_active,
      }));
      setEvents(prev => (append ? [...prev, ...eventList] : eventList));
      setNextPage(response.data.next);
    } catch (err) {
      console.error('Lỗi khi lấy danh sách sự kiện:', err.response?.data || err.message);
      setError('Không thể tải danh sách sự kiện. Vui lòng thử lại.');
    } finally {
      setLoading(false);
      setLoadingMore(false);
      setRefreshing(false);
    }
  }, [user, filters, search, nextPage]);

  // Fetch event statistics
  const fetchStatistics = useCallback(async (eventId) => {
    try {
      const token = await AsyncStorage.getItem('token');
      const api = authApis(token);
      const res = await api.get(endpoints.eventStatistics(eventId));
      setStatistics(res.data);
    } catch (error) {
      console.error('Lỗi khi lấy thống kê:', error.response?.data?.error?.message || error.message);
      Alert.alert('Lỗi', 'Không thể lấy thống kê. Vui lòng thử lại.');
    }
  }, []);

  useEffect(() => {
    if (user && user.role === 'admin') {
      fetchEvents();
    }
  }, [user, fetchEvents]);

  // Handle pull-to-refresh
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setNextPage(null);
    fetchEvents(endpoints.events, false);
  }, [fetchEvents]);

  // Handle load more
  const handleLoadMore = useCallback(() => {
    if (nextPage && !loadingMore) {
      fetchEvents(nextPage, true);
    }
  }, [nextPage, loadingMore, fetchEvents]);

  // Handle view event details
  const handleViewDetails = useCallback(async (event) => {
    setSelectedEvent(event);
    await fetchStatistics(event.id);
    setShowDetailModal(true);
  }, [fetchStatistics]);

  // Apply filters
  const applyFilters = useCallback(() => {
    setFilters(tempFilters);
    setShowFilterModal(false);
    setNextPage(null);
    fetchEvents(endpoints.events, false);
  }, [tempFilters, fetchEvents]);

  // Reset filters
  const resetFilters = useCallback(() => {
    setTempFilters({
      is_active: null,
    });
  }, []);

  // Sync tempFilters with filters when modal opens
  useEffect(() => {
    if (showFilterModal) {
      setTempFilters(filters);
    }
  }, [showFilterModal, filters]);

  // Handle filter change
  const handleFilterChange = useCallback((value) => {
    setTempFilters(prev => ({
      ...prev,
      is_active: value === 'all' ? null : value === 'active',
    }));
  }, []);

  // Render event item
  const renderItem = ({ item }) => (
    <TouchableOpacity onPress={() => handleViewDetails(item)}>
      <View style={styles.eventCard}>
        <View style={styles.eventInfo}>
          <View style={styles.titleContainer}>
            <View
              style={[
                styles.statusDot,
                { backgroundColor: item.is_active ? colors.greenActive : colors.grayMedium },
              ]}
            />
            <Text style={styles.eventTitle}>{item.title || 'N/A'}</Text>
          </View>
          <Text style={styles.eventDetail}>Địa điểm: {item.location || 'N/A'}</Text>
          <Text style={styles.eventDetail}>
            Thời gian: {new Date(item.start_time).toLocaleString('vi-VN')}
          </Text>
          <Text style={styles.eventPrice}>Giá vé: {item.ticket_price || 'Miễn phí'} VNĐ</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  // Event detail modal
  const EventDetailModal = () => (
    <Modal
      visible={showDetailModal}
      transparent={true}
      animationType="slide"
      onRequestClose={() => setShowDetailModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Chi tiết sự kiện</Text>
            <IconButton
              icon="close"
              size={24}
              onPress={() => setShowDetailModal(false)}
              iconColor={colors.blueGray}
            />
          </View>
          {selectedEvent && (
            <ScrollView style={styles.modalBody}>
              {selectedEvent.poster && (
                <Image source={{ uri: selectedEvent.posterImage }} style={styles.posterImage} />
              )}
              <Text style={styles.detailText}>Tiêu đề: {selectedEvent.title}</Text>
              <Text style={styles.detailText}>Mô tả: {selectedEvent.description || 'N/A'}</Text>
              <Text style={styles.detailText}>Địa điểm: {selectedEvent.location}</Text>
              <Text style={styles.detailText}>
                Thời gian bắt đầu: {new Date(selectedEvent.start_time).toLocaleString('vi-VN')}
              </Text>
              <Text style={styles.detailText}>
                Thời gian kết thúc: {new Date(selectedEvent.end_time).toLocaleString('vi-VN')}
              </Text>
              <Text style={styles.detailText}>Giá vé: {selectedEvent.ticket_price || 'Miễn phí'} VNĐ</Text>
              {statistics && (
                <Card style={styles.statsCard}>
                  <Card.Content>
                    <Text style={styles.sectionTitle}>Thống kê</Text>
                    <Text style={styles.statsText}>Vé đã bán: {statistics.tickets_sold}</Text>
                    <Text style={styles.statsText}>Doanh thu: {statistics.revenue} VNĐ</Text>
                    <Text style={styles.statsText}>Đánh giá trung bình: {statistics.average_rating.toFixed(1)}</Text>
                  </Card.Content>
                </Card>
              )}
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );

  // Filter modal
  const FilterModal = () => (
    <Modal
      visible={showFilterModal}
      transparent={true}
      animationType="fade"
      onRequestClose={() => setShowFilterModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Lọc Sự kiện</Text>
            <IconButton
              icon="close"
              size={24}
              onPress={() => setShowFilterModal(false)}
              iconColor={colors.blueGray}
            />
          </View>
          <View style={styles.modalBody}>
            <Text style={styles.sectionTitle}>Trạng thái</Text>
            <SegmentedButtons
              value={tempFilters.is_active === null ? 'all' : tempFilters.is_active ? 'active' : 'inactive'}
              onValueChange={handleFilterChange}
              buttons={[
                { value: 'all', label: 'Tất cả' },
                { value: 'active', label: 'Hoạt động' },
                { value: 'inactive', label: 'Vô hiệu' },
              ]}
              style={styles.segmentedButtons}
            />
            <View style={styles.modalButtons}>
              <Button
                mode="contained"
                onPress={applyFilters}
                style={styles.modalButton}
                buttonColor={colors.bluePrimary}
                labelStyle={styles.buttonLabel}
              >
                Áp dụng
              </Button>
              <Button
                mode="outlined"
                onPress={resetFilters}
                style={styles.modalButton}
                textColor={colors.bluePrimary}
                labelStyle={styles.buttonLabel}
              >
                Đặt lại
              </Button>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );

  if (!user || user.role !== 'admin') {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Chỉ có admin mới có thể quản lý sự kiện.</Text>
      </View>
    );
  }

  if (loading && events.length === 0) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.bluePrimary} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  if (events.length === 0) {
    return (
      <View style={styles.center}>
        <Text style={styles.infoText}>Không có sự kiện nào.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Searchbar
          placeholder="Tìm kiếm theo tiêu đề hoặc địa điểm..."
          onChangeText={setSearch}
          value={search}
          style={styles.searchBar}
          inputStyle={{ color: colors.navy }}
        />
        <IconButton
          icon="filter"
          size={24}
          onPress={() => setShowFilterModal(true)}
          iconColor={colors.bluePrimary}
          style={styles.filterButton}
        />
      </View>
      <FlatList
        data={events}
        keyExtractor={item => item.id.toString()}
        renderItem={renderItem}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl colors={[colors.bluePrimary]} refreshing={refreshing} onRefresh={onRefresh} />
        }
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        ListFooterComponent={loadingMore ? <ActivityIndicator size="small" color={colors.bluePrimary} /> : null}
      />
      <EventDetailModal />
      <FilterModal />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.grayLight,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.grayLight,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  listContainer: {
    padding: 16,
  },
  eventCard: {
    backgroundColor: colors.white,
    padding: 16,
    marginBottom: 12,
    borderRadius: 8,
    elevation: 2,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  eventInfo: {
    flex: 1,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.navy,
  },
  eventDetail: {
    fontSize: 14,
    color: colors.blueGray,
    marginBottom: 2,
  },
  eventPrice: {
    fontSize: 14,
    color: colors.bluePrimary,
    fontWeight: '500',
  },
  searchBar: {
    flex: 1,
    marginRight: 8,
    backgroundColor: colors.white,
    borderRadius: 8,
    elevation: 2,
  },
  filterButton: {
    backgroundColor: colors.white,
    elevation: 2,
  },
  errorText: {
    color: colors.redError,
    fontSize: 16,
    textAlign: 'center',
    padding: 20,
  },
  infoText: {
    color: colors.blueGray,
    fontSize: 16,
    textAlign: 'center',
    padding: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: colors.white,
    borderRadius: 12,
    width: '90%',
    padding: 16,
    maxHeight: '80%',
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
  modalBody: {
    flexGrow: 1,
    paddingBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.navy,
    marginBottom: 12,
  },
  detailText: {
    fontSize: 14,
    color: colors.blueGray,
    marginBottom: 8,
  },
  posterImage: {
    width: '100%',
    height: 150,
    borderRadius: 8,
    marginBottom: 12,
  },
  statsCard: {
    borderRadius: 8,
    backgroundColor: colors.white,
    elevation: 3,
    marginTop: 12,
  },
  statsText: {
    fontSize: 14,
    color: colors.blueGray,
    marginBottom: 6,
  },
  segmentedButtons: {
    marginBottom: 16,
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
});

export default ManageEvents;