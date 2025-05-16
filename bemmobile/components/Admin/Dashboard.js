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
    totalTicketsSold: 0,
    totalRevenue: 0,
    hotEvents: [],
    trendingLogs: [],
  });
  const [isAdminOrOrganizer, setIsAdminOrOrganizer] = useState(false);
  const [eventFilterTickets, setEventFilterTickets] = useState('all');
  const [eventFilterRevenue, setEventFilterRevenue] = useState('all');
  const [eventFilterTrending, setEventFilterTrending] = useState('all');

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
        if (userRole !== 'admin' && userRole !== 'organizer') {
          Alert.alert('Lỗi', 'Chỉ quản trị viên và nhà tổ chức mới có quyền truy cập báo cáo.');
          setLoading(false);
          return;
        }
        setIsAdminOrOrganizer(true);

        // Lấy dữ liệu hot events (vé bán ra và doanh thu)
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
              sold_tickets: Math.floor(Number(statsResponse.data.tickets_sold) || 0),
              revenue: Math.floor(Number(statsResponse.data.revenue) || 0),
            });
            totalTicketsSold += Math.floor(Number(statsResponse.data.tickets_sold) || 0);
            totalRevenue += Math.floor(Number(statsResponse.data.revenue) || 0);
          } catch (err) {
            console.warn(`Lỗi khi lấy thống kê cho sự kiện ${event.id}:`, err.response?.data || err.message);
            enhancedHotEvents.push({
              ...event,
              sold_tickets: 0,
              revenue: 0,
            });
          }
        }

        // Lấy dữ liệu mức độ quan tâm từ EventTrendingLog
        const trendingResponse = await api.get(endpoints.eventTrendingLogs);
        const trendingLogs = Array.isArray(trendingResponse.data.results) ? trendingResponse.data.results : [];
        const enhancedTrendingLogs = trendingLogs.map(log => ({
          ...log,
          interest_score: Number(log.interest_score) || 0,
        }));

        setDashboardData({
          totalTicketsSold,
          totalRevenue,
          hotEvents: enhancedHotEvents,
          trendingLogs: enhancedTrendingLogs,
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

  const filteredHotEventsTickets = () => {
    if (eventFilterTickets === 'all') return dashboardData.hotEvents;
    const limit = eventFilterTickets === 'top5' ? 5 : 10;
    return dashboardData.hotEvents
      .slice()
      .sort((a, b) => b.sold_tickets - a.sold_tickets)
      .slice(0, limit);
  };

  const filteredHotEventsRevenue = () => {
    if (eventFilterRevenue === 'all') return dashboardData.hotEvents;
    const limit = eventFilterRevenue === 'top5' ? 5 : 10;
    return dashboardData.hotEvents
      .slice()
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, limit);
  };

  const filteredTrendingLogs = () => {
    if (eventFilterTrending === 'all') return dashboardData.trendingLogs;
    const limit = eventFilterTrending === 'top5' ? 5 : 10;
    return dashboardData.trendingLogs
      .slice()
      .sort((a, b) => b.interest_score - a.interest_score)
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

  if (!isAdminOrOrganizer) {
    return (
      <SafeAreaView style={MyStyles.container} edges={['top']}>
        <View style={[MyStyles.loadingContainer, styles.centered]}>
          <Text style={{ color: colors.redError, textAlign: 'center' }}>
            Chỉ quản trị viên và nhà tổ chức mới có quyền truy cập trang này.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const filteredEventsTickets = filteredHotEventsTickets();
  const filteredEventsRevenue = filteredHotEventsRevenue();
  const filteredTrending = filteredTrendingLogs();
  const maxChartWidth = screenWidth - 40;
  const chartWidthTickets = Math.min(maxChartWidth, filteredEventsTickets.length * 50);
  const chartWidthRevenue = Math.min(maxChartWidth, filteredEventsRevenue.length * 50);
  const chartWidthTrending = Math.min(maxChartWidth, filteredTrending.length * 50);

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
            { label: 'Tổng vé đã bán', value: dashboardData.totalTicketsSold, color: colors.blueAccent },
            { label: 'Tổng doanh thu', value: formatCurrency(dashboardData.totalRevenue), color: colors.greenSuccess },
          ].map((item, index) => (
            <View key={index} style={styles.statCard}>
              <Text style={[MyStyles.eventDetail, styles.statLabel]}>{item.label}</Text>
              <Text style={[MyStyles.eventPrice, { color: item.color, fontSize: 20 }]}>{item.value}</Text>
            </View>
          ))}
        </View>

        {/* Biểu đồ Số lượng vé bán ra */}
        {dashboardData.hotEvents.length > 0 ? (
          <View style={styles.chartContainer}>
            <Text style={[MyStyles.eventTitle, styles.chartTitle]}>
              Số Lượng Vé Bán Ra
            </Text>
            <View style={styles.filterContainer}>
              <Text style={styles.filterLabel}>Lọc sự kiện: </Text>
              <View style={styles.pickerWrapper}>
                <Picker
                  selectedValue={eventFilterTickets}
                  style={styles.picker}
                  onValueChange={(itemValue) => setEventFilterTickets(itemValue)}
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
                  labels: filteredEventsTickets.map(event =>
                    (event.title?.slice(0, 8) || 'N/A') + (event.title?.length > 8 ? '...' : '')
                  ),
                  datasets: [
                    {
                      data: filteredEventsTickets.map(event => event.sold_tickets),
                    },
                  ],
                }}
                width={chartWidthTickets}
                height={300}
                yAxisLabel=""
                yAxisSuffix=""
                yAxisInterval={1}
                chartConfig={{
                  backgroundColor: colors.white,
                  backgroundGradientFrom: colors.white,
                  backgroundGradientTo: colors.white,
                  decimalPlaces: 0,
                  color: (opacity = 1) => colors.blueAccent,
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
            Không có dữ liệu vé bán ra để hiển thị.
          </Text>
        )}

        {/* Biểu đồ Doanh thu */}
        {dashboardData.hotEvents.length > 0 ? (
          <View style={styles.chartContainer}>
            <Text style={[MyStyles.eventTitle, styles.chartTitle]}>
              Doanh Thu Theo Sự Kiện
            </Text>
            <View style={styles.filterContainer}>
              <Text style={styles.filterLabel}>Lọc sự kiện: </Text>
              <View style={styles.pickerWrapper}>
                <Picker
                  selectedValue={eventFilterRevenue}
                  style={styles.picker}
                  onValueChange={(itemValue) => setEventFilterRevenue(itemValue)}
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
                  labels: filteredEventsRevenue.map(event =>
                    (event.title?.slice(0, 8) || 'N/A') + (event.title?.length > 8 ? '...' : '')
                  ),
                  datasets: [
                    {
                      data: filteredEventsRevenue.map(event => event.revenue),
                    },
                  ],
                }}
                width={chartWidthRevenue}
                height={300}
                yAxisLabel=""
                yAxisSuffix=""
                yAxisInterval={1}
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
            Không có dữ liệu doanh thu để hiển thị.
          </Text>
        )}

        {/* Biểu đồ Mức độ quan tâm */}
        {dashboardData.trendingLogs.length > 0 ? (
          <View style={styles.chartContainer}>
            <Text style={[MyStyles.eventTitle, styles.chartTitle]}>
              Mức Độ Quan Tâm (Dựa trên Interest Score)
            </Text>
            <View style={styles.filterContainer}>
              <Text style={styles.filterLabel}>Lọc sự kiện: </Text>
              <View style={styles.pickerWrapper}>
                <Picker
                  selectedValue={eventFilterTrending}
                  style={styles.picker}
                  onValueChange={(itemValue) => setEventFilterTrending(itemValue)}
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
                  labels: filteredTrending.map(log =>
                    (log.event_title?.slice(0, 8) || 'N/A') + (log.event_title?.length > 8 ? '...' : '')
                  ),
                  datasets: [
                    {
                      data: filteredTrending.map(log => log.interest_score),
                    },
                  ],
                }}
                width={chartWidthTrending}
                height={300}
                yAxisLabel=""
                yAxisSuffix=""
                yAxisInterval={0.1}
                chartConfig={{
                  backgroundColor: colors.white,
                  backgroundGradientFrom: colors.white,
                  backgroundGradientTo: colors.white,
                  decimalPlaces: 2,
                  color: (opacity = 1) => colors.orangeAccent || '#FF9800',
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
            Không có dữ liệu mức độ quan tâm để hiển thị.
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
    flexWrap: 'wrap',
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
    maxWidth: 220,
  },
  picker: {
    height: 50,
    width: 220,
    color: colors.navy,
    backgroundColor: colors.white,
    borderRadius: 6,
    fontSize: 16,
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