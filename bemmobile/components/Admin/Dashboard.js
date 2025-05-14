import React, { useState, useEffect, useContext } from 'react';
import {
  SafeAreaView,
  ScrollView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Alert,
  Platform,
  StatusBar,
} from 'react-native';
import { Card, Title, useTheme } from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MyUserContext, MyDispatchContext } from '../../configs/MyContexts';
import Apis, { authApis, endpoints } from '../../configs/Apis';
import { BarChart, LineChart, PieChart } from 'react-native-chart-kit';
import moment from 'moment';
import { Dimensions } from 'react-native';
import { colors } from '../../styles/MyStyles';

// Kích thước màn hình cho biểu đồ
const screenWidth = Dimensions.get('window').width;

const Dashboard = ({ navigation }) => {
  const theme = useTheme();
  const user = useContext(MyUserContext);
  const dispatch = useContext(MyDispatchContext);
  const [users, setUsers] = useState([]);
  const [events, setEvents] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [payments, setPayments] = useState([]);
  const [hotEvents, setHotEvents] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [categories, setCategories] = useState({});
  const [loading, setLoading] = useState(false);

  // Hàm gọi API với token
  const fetchData = async (endpoint, setState, transform = (data) => data) => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }
      const api = authApis(token);
      const response = await api.get(endpoint);
      const data = response.data.results || response.data;
      console.log(`Data from ${endpoint}:`, JSON.stringify(data, null, 2));
      setState(transform(data));
    } catch (error) {
      console.error(`Error fetching ${endpoint}:`, error.response ? error.response.data : error.message);
      if (error.response && error.response.status === 401) {
        Alert.alert('Error', 'Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.');
        await AsyncStorage.removeItem('token');
        await AsyncStorage.removeItem('refresh_token');
        dispatch({ type: 'logout' });
        navigation.navigate('Login');
      }
    }
  };

  // Hàm tính tổng từ danh sách
  const sumField = (items, field) => items.reduce((sum, item) => sum + (item[field] || 0), 0);

  // Hàm tính tickets_sold cho mỗi event
  const calculateTicketsSold = (events, tickets) => {
    return events.map(event => {
      const ticketsSold = tickets.filter(
        t => t.event === event.title && t.is_paid
      ).length;
      return { ...event, tickets_sold: ticketsSold };
    });
  };

  // Tải dữ liệu
  const loadData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchData(endpoints.users, setUsers),
        fetchData(endpoints.events, setEvents),
        fetchData(endpoints.tickets, setTickets),
        fetchData(endpoints.payments, setPayments, (data) => data.filter(p => p.status)),
        fetchData(endpoints.hotEvents, hotEvents => {
          const updatedHotEvents = calculateTicketsSold(hotEvents, tickets);
          console.log('Processed hotEvents:', JSON.stringify(updatedHotEvents, null, 2));
          setHotEvents(updatedHotEvents);
        }),
        fetchData(endpoints.myNotifications, setNotifications),
        fetchData(endpoints.categories, setCategories),
      ]);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user && user.role === 'admin') {
      loadData();
      const interval = setInterval(loadData, 30000);
      return () => clearInterval(interval);
    }
  }, [user]);

  // Kiểm tra quyền admin
  if (!user || user.role !== 'admin') {
    return (
      <SafeAreaView style={[styles.safeArea, { paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 }]}>
        <View style={styles.container}>
          <Text style={styles.errorText}>Chỉ có admin mới có thể truy cập dashboard.</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Tính toán số liệu
  const totalUsers = users.length;
  const totalEvents = events.length;
  const totalTicketsSold = tickets.filter(t => t.is_paid).length;
  const totalRevenue = sumField(payments, 'amount');

  // Dữ liệu cho biểu đồ cột (vé bán ra theo sự kiện)
  const ticketsByEventData = hotEvents.length > 0 ? {
    labels: hotEvents.map(e => (e.title || 'Unknown').slice(0, 10) + ((e.title || '').length > 10 ? '...' : '')),
    datasets: [
      {
        data: hotEvents.map(e => Number.isFinite(e.tickets_sold) ? e.tickets_sold : 0),
      },
    ],
  } : null;

  // Dữ liệu cho biểu đồ đường (doanh thu theo thời gian)
  const revenueByDate = payments.length > 0 ? payments.reduce((acc, p) => {
    if (p.paid_at && Number.isFinite(p.amount) && p.amount > 0) {
      const date = moment(p.paid_at).format('MM-DD');
      acc[date] = (acc[date] || 0) + p.amount;
    }
    return acc;
  }, {}) : {};
  const revenueData = Object.keys(revenueByDate).length > 0 ? {
    labels: Object.keys(revenueByDate).sort(),
    datasets: [
      {
        data: Object.values(revenueByDate).map(v => Number.isFinite(v) ? v : 0),
        color: () => colors.chartRed,
        strokeWidth: 2,
      },
    ],
  } : null;

  // Dữ liệu cho biểu đồ tròn (phân bố sự kiện theo danh mục)
  const eventsByCategory = events.length > 0 ? events.reduce((acc, e) => {
    const category = e.category || 'Unknown';
    acc[category] = (acc[category] || 0) + 1;
    return acc;
  }, {}) : {};
  const categoryData = Object.keys(eventsByCategory).length > 0 ? Object.keys(eventsByCategory).map((key, index) => ({
    name: key,
    count: Number.isFinite(eventsByCategory[key]) ? eventsByCategory[key] : 0,
    color: [colors.chartRed, colors.chartBlue, colors.chartYellow, colors.chartGreen, colors.chartPurple][index % 5],
    legendFontColor: colors.navy,
    legendFontSize: 12,
  })) : null;

  // Render item cho bảng sự kiện nổi bật
  const renderHotEvent = ({ item }) => (
    <View style={styles.tableRow}>
      <Text style={[styles.tableCell, { flex: 2 }]} numberOfLines={1}>{item.title || 'Unknown'}</Text>
      <Text style={styles.tableCell}>{Number.isFinite(item.tickets_sold) ? item.tickets_sold : 0}</Text>
      <Text style={styles.tableCell}>
        {(Number.isFinite(item.tickets_sold) && Number.isFinite(item.ticket_price)
          ? item.tickets_sold * item.ticket_price
          : 0).toLocaleString()} VND
      </Text>
    </View>
  );

  // Render item cho bảng thông báo
  const renderNotification = ({ item }) => (
    <View style={styles.tableRow}>
      <Text style={[styles.tableCell, { flex: 2 }]} numberOfLines={1}>{item.title || 'Unknown'}</Text>
      <Text style={[styles.tableCell, { flex: 3 }]} numberOfLines={1}>{item.message || 'No message'}</Text>
      <Text style={styles.tableCell}>
        {item.is_read ? (
          <Text style={styles.readStatus}>Đã đọc</Text>
        ) : (
          <Text style={styles.unreadStatus}>Chưa đọc</Text>
        )}
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={[styles.safeArea, { paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 }]}>
      <ScrollView
        contentContainerStyle={[styles.scrollContainer, {
          paddingTop: Platform.OS === 'android' ? 16 : 0,
          paddingBottom: Platform.OS === 'android' ? 24 : 0,
        }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.container}>
          <View style={styles.header}>
            <Title style={styles.title}>Admin Dashboard</Title>
            <TouchableOpacity
              onPress={loadData}
              disabled={loading}
              style={styles.refreshButton}
            >
              <Text style={styles.refreshButtonText}>
                {loading ? 'Đang tải...' : 'Làm mới'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Stat Cards */}
          <View style={styles.statContainer}>
            <Card style={styles.statCard}>
              <Card.Content>
                <Text style={styles.statLabel}>Tổng người dùng</Text>
                <Text style={styles.statValue}>{totalUsers}</Text>
              </Card.Content>
            </Card>
            <Card style={styles.statCard}>
              <Card.Content>
                <Text style={styles.statLabel}>Tổng sự kiện</Text>
                <Text style={styles.statValue}>{totalEvents}</Text>
              </Card.Content>
            </Card>
            <Card style={styles.statCard}>
              <Card.Content>
                <Text style={styles.statLabel}>Vé bán ra</Text>
                <Text style={styles.statValue}>{totalTicketsSold}</Text>
              </Card.Content>
            </Card>
            <Card style={styles.statCard}>
              <Card.Content>
                <Text style={styles.statLabel}>Doanh thu</Text>
                <Text style={styles.statValue}>{totalRevenue.toLocaleString()} VND</Text>
              </Card.Content>
            </Card>
          </View>

          {/* Charts */}
          <View style={styles.chartContainer}>
            <Text style={styles.chartTitle}>Vé bán ra theo sự kiện</Text>
            {ticketsByEventData ? (
              <BarChart
                data={ticketsByEventData}
                width={screenWidth - 32}
                height={220}
                yAxisLabel=""
                chartConfig={{
                  backgroundColor: colors.white,
                  backgroundGradientFrom: colors.white,
                  backgroundGradientTo: colors.white,
                  decimalPlaces: 0,
                  color: () => colors.chartBlue,
                  labelColor: () => colors.navy,
                  style: { borderRadius: 16 },
                }}
                style={styles.chart}
              />
            ) : (
              <Text style={styles.noDataText}>Không có dữ liệu để hiển thị</Text>
            )}

            <Text style={styles.chartTitle}>Doanh thu theo thời gian</Text>
            {revenueData ? (
              <LineChart
                data={revenueData}
                width={screenWidth - 32}
                height={220}
                yAxisLabel="VND "
                chartConfig={{
                  backgroundColor: colors.white,
                  backgroundGradientFrom: colors.white,
                  backgroundGradientTo: colors.white,
                  decimalPlaces: 0,
                  color: () => colors.chartRed,
                  labelColor: () => colors.navy,
                  style: { borderRadius: 16 },
                }}
                style={styles.chart}
              />
            ) : (
              <Text style={styles.noDataText}>Không có dữ liệu để hiển thị</Text>
            )}

            <Text style={styles.chartTitle}>Phân bố sự kiện theo danh mục</Text>
            {categoryData ? (
              <PieChart
                data={categoryData}
                width={screenWidth - 32}
                height={220}
                chartConfig={{
                  backgroundColor: colors.white,
                  backgroundGradientFrom: colors.white,
                  backgroundGradientTo: colors.white,
                  color: () => colors.navy,
                  labelColor: () => colors.navy,
                }}
                accessor="count"
                backgroundColor="transparent"
                paddingLeft="15"
                style={styles.chart}
              />
            ) : (
              <Text style={styles.noDataText}>Không có dữ liệu để hiển thị</Text>
            )}
          </View>

          {/* Data Tables */}
          <View style={styles.tableContainer}>
            <Text style={styles.tableTitle}>Sự kiện nổi bật</Text>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderCell, { flex: 2 }]}>Tên sự kiện</Text>
              <Text style={styles.tableHeaderCell}>Vé bán ra</Text>
              <Text style={styles.tableHeaderCell}>Doanh thu</Text>
            </View>
            <FlatList
              data={hotEvents}
              renderItem={renderHotEvent}
              keyExtractor={item => item.id.toString()}
              style={styles.table}
              scrollEnabled={false}
            />

            <Text style={styles.tableTitle}>Thông báo gần đây</Text>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderCell, { flex: 2 }]}>Tiêu đề</Text>
              <Text style={[styles.tableHeaderCell, { flex: 3 }]}>Nội dung</Text>
              <Text style={styles.tableHeaderCell}>Trạng thái</Text>
            </View>
            <FlatList
              data={notifications.slice(0, 5)}
              renderItem={renderNotification}
              keyExtractor={item => item.id.toString()}
              style={styles.table}
              scrollEnabled={false}
            />
          </View>

          <Text style={styles.footer}>Event Management Dashboard v1.0</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.grayLight,
  },
  scrollContainer: {
    flexGrow: 1,
    paddingHorizontal: 16,
  },
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingTop: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: '600',
    color: colors.navy,
  },
  refreshButton: {
    backgroundColor: colors.bluePrimary,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  refreshButtonText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '600',
  },
  statContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  statCard: {
    width: '48%',
    marginBottom: 16,
    backgroundColor: colors.white,
    borderRadius: 8,
    elevation: Platform.OS === 'android' ? 4 : 2,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: Platform.OS === 'ios' ? 0.1 : 0.2,
    shadowRadius: 4,
  },
  statLabel: {
    fontSize: 14,
    color: colors.blueGray,
    marginBottom: 8,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.navy,
  },
  chartContainer: {
    marginBottom: 20,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.navy,
    marginBottom: 10,
  },
  chart: {
    borderRadius: 16,
    marginBottom: 20,
    paddingVertical: 8,
  },
  noDataText: {
    fontSize: 14,
    color: colors.blueGray,
    textAlign: 'center',
    marginBottom: 20,
  },
  tableContainer: {
    marginBottom: 20,
  },
  tableTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.navy,
    marginBottom: 10,
  },
  table: {
    backgroundColor: colors.white,
    borderRadius: 8,
    elevation: Platform.OS === 'android' ? 4 : 2,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: Platform.OS === 'ios' ? 0.1 : 0.2,
    shadowRadius: 4,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: colors.grayLightest,
    padding: 10,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
  },
  tableHeaderCell: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.navy,
    flex: 1,
    textAlign: 'center',
  },
  tableRow: {
    flexDirection: 'row',
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.grayMedium,
  },
  tableCell: {
    fontSize: 14,
    color: colors.navy,
    flex: 1,
    textAlign: 'center',
  },
  readStatus: {
    color: colors.greenSuccess,
    fontSize: 12,
  },
  unreadStatus: {
    color: colors.redError,
    fontSize: 12,
  },
  footer: {
    textAlign: 'center',
    fontSize: 12,
    color: colors.blueGray,
    marginTop: 20,
    marginBottom: Platform.OS === 'android' ? 16 : 8,
  },
  errorText: {
    textAlign: 'center',
    fontSize: 14,
    color: colors.redError,
    marginBottom: 10,
  },
});

export default Dashboard;