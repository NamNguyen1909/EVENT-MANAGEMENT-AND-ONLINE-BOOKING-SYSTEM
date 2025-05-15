import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  ActivityIndicator,
  Alert,
  Dimensions,
  StyleSheet,
  Platform,
} from 'react-native';
import {
  Text,
  Title,
  Card,
  useTheme,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Apis, { authApis, endpoints } from '../../configs/Apis';
import MyStyles, { colors } from '../../styles/MyStyles';
import { BarChart } from 'react-native-chart-kit';
import { Picker } from '@react-native-picker/picker';

const screenWidth = Dimensions.get('window').width;

const Dashboard = () => {
  const theme = useTheme();
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState({
    totalEvents: 0,
    totalTicketsSold: 0,
    totalRevenue: 0,
    activeEvents: 0,
    hotEvents: [],
    categoryDistribution: [],
  });
  const [isAdmin, setIsAdmin] = useState(false);
  const [eventFilter, setEventFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      try {
        const token = await AsyncStorage.getItem('token');
        if (!token) {
          Alert.alert('Lỗi', 'Bạn chưa đăng nhập.');
          setLoading(false);
          return;
        }

        const api = authApis(token);

        const userResponse = await api.get(endpoints.currentUser);
        const userRole = userResponse.data.role?.toLowerCase();
        if (userRole !== 'admin') {
          Alert.alert('Lỗi', 'Chỉ admin mới có quyền truy cập báo cáo.');
          setLoading(false);
          return;
        }
        setIsAdmin(true);

        const eventsResponse = await api.get(endpoints.events);
        const events = Array.isArray(eventsResponse.data.results)
          ? eventsResponse.data.results
          : Array.isArray(eventsResponse.data)
            ? eventsResponse.data
            : [];
        const totalEvents = events.length;
        const activeEvents = events.filter(event => event.is_active).length;

        const hotEventsResponse = await api.get(endpoints.hotEvents);
        const hotEvents = Array.isArray(hotEventsResponse.data) ? hotEventsResponse.data : [];

        let totalTicketsSold = 0;
        let totalRevenue = 0;
        const enhancedHotEvents = [];
        for (const event of hotEvents) {
          try {
            const statsResponse = await api.get(endpoints.eventStatistics(event.id));
            enhancedHotEvents.push({
              ...event,
              sold_tickets: Number(statsResponse.data.tickets_sold) || 0,
              revenue: Number(statsResponse.data.revenue) || 0,
            });
            totalTicketsSold += Number(statsResponse.data.tickets_sold) || 0;
            totalRevenue += Number(statsResponse.data.revenue) || 0;
          } catch (err) {
            console.warn(`Lỗi khi lấy thống kê cho sự kiện ${event.id}:`, err.response?.data || err.message);
            enhancedHotEvents.push({
              ...event,
              sold_tickets: 0,
              revenue: 0,
            });
          }
        }

        const categoryCounts = {};
        events.forEach(event => {
          const category = event.category || 'Không xác định';
          categoryCounts[category] = (categoryCounts[category] || 0) + 1;
        });
        const categoryDistribution = Object.keys(categoryCounts).map(category => ({
          name: category,
          count: categoryCounts[category],
        }));

        setDashboardData({
          totalEvents,
          totalTicketsSold,
          totalRevenue,
          activeEvents,
          hotEvents: enhancedHotEvents,
          categoryDistribution,
        });
      } catch (error) {
        console.error('Lỗi khi lấy dữ liệu báo cáo:', error.response?.data || error.message);
        Alert.alert('Lỗi', 'Không thể tải dữ liệu báo cáo. Vui lòng thử lại.');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(amount);
  };

  const filteredHotEvents = () => {
    if (eventFilter === 'all') return dashboardData.hotEvents;
    const limit = eventFilter === 'top5' ? 5 : 10;
    return dashboardData.hotEvents
      .slice()
      .sort((a, b) => b.sold_tickets - a.sold_tickets)
      .slice(0, limit);
  };

  const filteredCategoryDistribution = () => {
    if (categoryFilter === 'all') return dashboardData.categoryDistribution;
    const limit = categoryFilter === 'top5' ? 5 : 10;
    return dashboardData.categoryDistribution
      .slice()
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  };

  if (loading) {
    return (
      <SafeAreaView style={MyStyles.container} edges={['top']}>
        <View style={[MyStyles.loadingContainer, styles.centered]}>
          <ActivityIndicator size="large" color={colors.bluePrimary} />
          <Text style={{ marginTop: 10, color: colors.navy }}>Đang tải...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!isAdmin) {
    return (
      <SafeAreaView style={MyStyles.container} edges={['top']}>
        <View style={[MyStyles.loadingContainer, styles.centered]}>
          <Text style={{ color: colors.redError, textAlign: 'center' }}>
            Bạn không có quyền truy cập trang này.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const filteredEvents = filteredHotEvents();
  const filteredCategories = filteredCategoryDistribution();
  const maxChartWidth = screenWidth - 40; // Giới hạn chiều rộng biểu đồ
  const chartWidth = Math.min(maxChartWidth, filteredEvents.length * 50); // Giảm khoảng cách cột
  const categoryChartWidth = Math.min(maxChartWidth, filteredCategories.length * 50);

  return (
    <SafeAreaView style={[MyStyles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
      <ScrollView
        contentContainerStyle={{
          padding: 20,
          paddingBottom: 120,
          flexGrow: 1,
        }}
        showsVerticalScrollIndicator={false}
      >
        <Title style={[MyStyles.eventTitle, styles.title]}>
          Báo Cáo Sự Kiện
        </Title>

        <View style={styles.statsContainer}>
          {[
            { label: 'Tổng số sự kiện', value: dashboardData.totalEvents, color: colors.blueAccent },
            { label: 'Sự kiện đang hoạt động', value: dashboardData.activeEvents, color: colors.blueAccent },
            { label: 'Tổng vé đã bán', value: dashboardData.totalTicketsSold, color: colors.blueAccent },
            { label: 'Tổng doanh thu', value: formatCurrency(dashboardData.totalRevenue), color: colors.greenSuccess },
          ].map((item, index) => (
            <View key={index} style={styles.statCard}>
              <Text style={[MyStyles.eventDetail, styles.statLabel]}>{item.label}</Text>
              <Text style={[MyStyles.eventPrice, { color: item.color, fontSize: 18 }]}>{item.value}</Text>
            </View>
          ))}
        </View>

        {dashboardData.hotEvents.length > 0 ? (
          <View style={styles.chartContainer}>
            <Text style={[MyStyles.eventTitle, styles.chartTitle]}>
              Vé Bán Ra Của Sự Kiện Nổi Bật
            </Text>
            <View style={styles.filterContainer}>
              <Text style={styles.filterLabel}>Lọc sự kiện: </Text>
              <View style={styles.pickerWrapper}>
                <Picker
                  selectedValue={eventFilter}
                  style={styles.picker}
                  onValueChange={(itemValue) => setEventFilter(itemValue)}
                  dropdownIconColor={colors.navy}
                >
                  <Picker.Item label="Tất cả" value="all" />
                  <Picker.Item label="Top 5" value="top5" />
                  <Picker.Item label="Top 10" value="top10" />
                </Picker>
              </View>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chartScroll}>
              <BarChart
                data={{
                  labels: filteredEvents.map(event =>
                    (event.title?.slice(0, 8) || 'N/A') + (event.title?.length > 8 ? '...' : '')
                  ),
                  datasets: [
                    {
                      data: filteredEvents.map(event => event.sold_tickets),
                    },
                  ],
                }}
                width={chartWidth}
                height={280}
                yAxisLabel=""
                yAxisSuffix=""
                chartConfig={{
                  backgroundColor: colors.white,
                  backgroundGradientFrom: colors.white,
                  backgroundGradientTo: colors.white,
                  decimalPlaces: 0,
                  color: (opacity = 1) => colors.blueAccent,
                  labelColor: (opacity = 1) => colors.navy,
                  barPercentage: 0.7, // Tăng tỷ lệ cột để hiển thị gọn hơn
                  propsForLabels: {
                    fontSize: 12,
                    rotation: -45,
                    dx: -10,
                  },
                  style: {
                    borderRadius: 16,
                    paddingRight: 20, // Tăng padding để tránh cắt xén nhãn
                  },
                  propsForBackgroundLines: {
                    stroke: colors.grayLight,
                    strokeDasharray: '',
                  },
                }}
                style={styles.chart}
                showValuesOnTopOfBars={true}
                fromZero={true}
                withInnerLines={true}
              />
            </ScrollView>
            <Text style={styles.chartNote}>Ghi chú: Cuộn ngang để xem thêm</Text>
          </View>
        ) : (
          <Text style={[MyStyles.eventDetail, styles.noDataText]}>
            Không có sự kiện nổi bật để hiển thị.
          </Text>
        )}

        {dashboardData.categoryDistribution.length > 0 ? (
          <View style={styles.chartContainer}>
            <Text style={[MyStyles.eventTitle, styles.chartTitle]}>
              Phân Bố Theo Danh Mục
            </Text>
            <View style={styles.filterContainer}>
              <Text style={styles.filterLabel}>Lọc danh mục: </Text>
              <View style={styles.pickerWrapper}>
                <Picker
                  selectedValue={categoryFilter}
                  style={styles.picker}
                  onValueChange={(itemValue) => setCategoryFilter(itemValue)}
                  dropdownIconColor={colors.navy}
                >
                  <Picker.Item label="Tất cả" value="all" />
                  <Picker.Item label="Top 5" value="top5" />
                  <Picker.Item label="Top 10" value="top10" />
                </Picker>
              </View>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chartScroll}>
              <BarChart
                data={{
                  labels: filteredCategories.map(category =>
                    (category.name?.slice(0, 8) || 'N/A') + (category.name?.length > 8 ? '...' : '')
                  ),
                  datasets: [
                    {
                      data: filteredCategories.map(category => category.count),
                    },
                  ],
                }}
                width={categoryChartWidth}
                height={250}
                yAxisLabel=""
                yAxisSuffix=""
                chartConfig={{
                  backgroundColor: colors.white,
                  backgroundGradientFrom: colors.white,
                  backgroundGradientTo: colors.white,
                  decimalPlaces: 0,
                  color: (opacity = 1) => colors.greenSuccess,
                  labelColor: (opacity = 1) => colors.navy,
                  barPercentage: 0.7,
                  propsForLabels: {
                    fontSize: 12,
                    rotation: -45,
                    dx: -10,
                  },
                  style: {
                    borderRadius: 16,
                    paddingRight: 20,
                  },
                  propsForBackgroundLines: {
                    stroke: colors.grayLight,
                    strokeDasharray: '',
                  },
                }}
                style={styles.chart}
                showValuesOnTopOfBars={true}
                fromZero={true}
                withInnerLines={true}
              />
            </ScrollView>
            <Text style={styles.chartNote}>Ghi chú: Cuộn ngang để xem thêm</Text>
          </View>
        ) : (
          <Text style={[MyStyles.eventDetail, styles.noDataText]}>
            Không có dữ liệu danh mục để hiển thị.
          </Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    textAlign: 'center',
    marginBottom: 25,
    color: colors.navy,
    fontSize: 24,
    fontWeight: 'bold',
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  statCard: {
    width: '48%',
    marginBottom: 15,
    padding: 15,
    backgroundColor: colors.white,
    borderRadius: 12,
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  statLabel: {
    fontSize: 16,
    color: colors.navy,
    marginBottom: 5,
  },
  chartContainer: {
    marginVertical: 25,
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 15,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  chartTitle: {
    marginBottom: 15,
    textAlign: 'center',
    color: colors.navy,
    fontSize: 20,
    fontWeight: '600',
  },
  noDataText: {
    textAlign: 'center',
    marginVertical: 20,
    color: colors.grayDark,
    fontSize: 16,
    fontStyle: 'italic',
  },
  filterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  filterLabel: {
    fontSize: 16,
    color: colors.navy,
    marginRight: 10,
    fontWeight: '500',
  },
  pickerWrapper: {
    borderWidth: 1,
    borderColor: colors.grayLight,
    borderRadius: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  picker: {
    height: 50, // Tăng chiều cao
    width: 200, // Tăng chiều rộng để hiển thị đầy đủ chữ
    color: colors.navy,
    backgroundColor: colors.white,
    borderRadius: 6,
    fontSize: 16, // Tăng kích thước chữ
  },
  chartScroll: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  chart: {
    marginVertical: 10,
    borderRadius: 16,
  },
  chartNote: {
    fontSize: 12,
    color: colors.grayDark,
    textAlign: 'center',
    marginTop: 5,
  },
});

export default Dashboard;