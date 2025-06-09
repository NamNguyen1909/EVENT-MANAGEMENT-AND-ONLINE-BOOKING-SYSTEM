import React, { useEffect, useState, useContext } from "react";
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  Pressable,
  Image
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { endpoints, authApis } from "../../configs/Apis";
import { MyUserContext } from "../../configs/MyContexts";
import FontAwesome from "react-native-vector-icons/FontAwesome";
import MyStyles, { colors } from "../../styles/MyStyles";
import { SafeAreaView} from 'react-native-safe-area-context';

const MyTickets = () => {
  const navigation = useNavigation();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false); // Added refreshing state
  const [error, setError] = useState(null);
  const [nextPageUrl, setNextPageUrl] = useState(null);
  const user = useContext(MyUserContext);

  // New states for modal and ticket detail
  const [isTicketModalVisible, setIsTicketModalVisible] = useState(false);
  const [selectedTicketId, setSelectedTicketId] = useState(null);
  const [ticketDetail, setTicketDetail] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [errorDetail, setErrorDetail] = useState(null);

  useEffect(() => {
    if (!user) {
      navigation.reset({
        index: 0,
        routes: [{ name: "loginStack" }],
      });
      return;
    }
    const unsubscribe = navigation.addListener("focus", () => {
      fetchTickets();
    });
    return unsubscribe;
  }, [navigation]);

  const fetchTickets = async (url = endpoints.userTickets, append = false, isRefresh = false) => {
    try {
      // Xử lý trạng thái loading/refresh trước khi fetch
      if (isRefresh) {
        setRefreshing(true);
      } else if (append) {
        setLoadingMore(true);
      } else {
        setLoading(true);
        setError(null);
      }

      const token = await AsyncStorage.getItem("token");
      if (!token) {
        setError("Vui lòng đăng nhập để xem vé của bạn.");
        setLoading(false);
        setLoadingMore(false);
        setRefreshing(false);
        navigation.reset({
          index: 0,
          routes: [{ name: "loginStack" }],
        });
        return;
      }
      const api = authApis(token);
      const response = await api.get(url);
      const newTickets = response.data.results || response.data || [];

      if (append) {
        setTickets((prevTickets) => {
          const ids = new Set(prevTickets.map(t => t.id));
          const uniqueNewTickets = newTickets.filter(t => !ids.has(t.id));
          return [...prevTickets, ...uniqueNewTickets];
        });
      } else {
        setTickets(newTickets);
      }
      setNextPageUrl(response.data.next);
    } catch (err) {
      console.error("Error fetching tickets:", err);
      setError("Không thể tải danh sách vé. Vui lòng thử lại.");
    } finally {
      setLoading(false);
      setLoadingMore(false);
      setRefreshing(false);
    }
  };

  // Fetch ticket detail for modal
  const fetchTicketDetail = async (ticketId) => {
    try {
      setLoadingDetail(true);
      setErrorDetail(null);
      setTicketDetail(null);
      const token = await AsyncStorage.getItem("token");
      if (!user || !token) {
        setErrorDetail("Vui lòng đăng nhập để xem chi tiết vé.");
        setLoadingDetail(false);
        return;
      }
      const api = authApis(token);
      const res = await api.get(endpoints.ticketDetail(ticketId));
      setTicketDetail(res.data);
    } catch (err) {
      console.error("Error fetching ticket detail:", err);
      setErrorDetail("Không thể tải chi tiết vé.");
    } finally {
      setLoadingDetail(false);
    }
  };

  useEffect(() => {
    const unsubscribe = navigation.addListener("focus", () => {
      fetchTickets();
    });
    return unsubscribe;
  }, [navigation]);

const fetchMoreTickets = () => {
  if (nextPageUrl && !loadingMore && !loading) {
    // Chuyển nextPageUrl về path tương đối nếu là URL tuyệt đối
    let url = nextPageUrl;
    if (url.startsWith("http")) {
      const idx = url.indexOf("/", 8); // Bỏ qua "https://"
      url = idx !== -1 ? url.substring(idx) : url;
    }
    fetchTickets(url, true);
  }
};

  // Handle ticket press to open modal
  const handleTicketPress = (ticketId) => {
    setSelectedTicketId(ticketId);
    setIsTicketModalVisible(true);
    fetchTicketDetail(ticketId);
  };

  // Close modal handler
  const closeTicketModal = () => {
    setIsTicketModalVisible(false);
    setSelectedTicketId(null);
    setTicketDetail(null);
    setErrorDetail(null);
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={styles.ticketItem}
      onPress={() => handleTicketPress(item.id)}
    >
      <Text style={styles.eventTitle}>
        {item.event_title || item.event?.title || "Không có tiêu đề"}
      </Text>
      <Text>Username: {item.username}</Text>
      <Text>Email: {item.email}</Text>
      <Text>
        Ngày mua:
        {item.purchase_date
          ? new Date(item.purchase_date).toLocaleString()
          : "N/A"}
      </Text>
      <Text>Địa điểm: {item.event_location || "N/A"}</Text>
      <Text>
        Thời gian bắt đầu:
        {item.event_start_time
          ? new Date(item.event_start_time).toLocaleString()
          : "N/A"}
      </Text>

      <Text style={styles.statusText}>
        Trạng thái:
        <FontAwesome
          name={item.is_paid ? "check-circle" : "times-circle"}
          size={16}
          color={item.is_paid ? colors.blueDark : "red"}
        />
        <Text style={{ color: item.is_paid ? colors.blueDark : "red" }}>
          {item.is_paid ? "Đã thanh toán" : "Chưa thanh toán"}
        </Text>
      </Text>

      {/* {item.qr_code && (
        <Text>
          QR:
          <FontAwesome
            name={item.qr_code ? "check-circle" : "times-circle"}
            size={16}
            color={item.qr_code ? colors.blueDark : "red"}
          />
        </Text>
      )} */}
    </TouchableOpacity>
  );

   if (loading && tickets.length === 0) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#0000ff" />
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

  if (tickets.length === 0) {
    return (
      <View style={styles.center}>
        <Text>Bạn chưa có vé nào.</Text>
      </View>
    );
  }

  const renderFooter = () => {
    if (!loadingMore) return null;
    return (
      <View style={{ paddingVertical: 20 }}>
        <ActivityIndicator size="small" color="#0000ff" />
      </View>
    );
  };

  return (
    <>
      <SafeAreaView style={{ flex: 1 }}>
        <FlatList
          data={tickets}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderItem}
          contentContainerStyle={styles.listContainer}
          refreshing={refreshing} // Use refreshing state
          onRefresh={() => fetchTickets(endpoints.userTickets, false, true)} // Pass isRefresh true
          onEndReached={fetchMoreTickets}
          onEndReachedThreshold={0.8}
          ListFooterComponent={() =>
            loadingMore ? (
              <View style={{ paddingVertical: 20 }}>
                <ActivityIndicator size="small" color="#0000ff" />
              </View>
            ) : null
          }
        />

        <Modal
          visible={isTicketModalVisible}
          animationType="slide"
          transparent={true}
          onRequestClose={closeTicketModal}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Pressable style={styles.modalCloseButton} onPress={closeTicketModal}>
                <Text style={styles.modalCloseText}>Đóng</Text>
              </Pressable>
              {loadingDetail ? (
                <ActivityIndicator size="large" color={colors.bluePrimary} />
              ) : errorDetail ? (
                <Text style={{ color: "red", textAlign: "center" }}>{errorDetail}</Text>
              ) : ticketDetail ? (
                <ScrollView>
                  {ticketDetail.qr_code ? (
                    <Image
                      source={{ uri: ticketDetail.qr_code }}
                      style={styles.qrCode}
                    />
                  ) : (
                    <Text style={{ textAlign: "center", marginBottom: 20 }}>
                      Không có mã QR.
                    </Text>
                  )}
                  <Text style={styles.title}>{ticketDetail.event_title || "Chi tiết vé"}</Text>
                  <View style={styles.section}>
                    <Text style={styles.labelValue}>
                      Username: <Text style={styles.value}>{ticketDetail.username || "N/A"}</Text>
                    </Text>
                  </View>
                  <View style={styles.section}>
                    <Text style={styles.labelValue}>
                      Email: <Text style={styles.value}>{ticketDetail.email || "N/A"}</Text>
                    </Text>
                  </View>
                  <View style={styles.section}>
                    <Text style={styles.labelValue}>
                      Ngày mua:
                      <Text style={styles.value}>
                        {ticketDetail.purchase_date
                          ? new Date(ticketDetail.purchase_date).toLocaleString()
                          : "N/A"}
                      </Text>
                    </Text>
                  </View>
                  <View style={styles.section}>
                    <Text style={styles.labelValue}>
                      Địa điểm: <Text style={styles.value}>{ticketDetail.event_location || "N/A"}</Text>
                    </Text>
                  </View>
                  <View style={styles.section}>
                    <Text style={styles.labelValue}>
                      Thời gian bắt đầu:
                      <Text style={styles.value}>
                        {ticketDetail.event_start_time
                          ? new Date(ticketDetail.event_start_time).toLocaleString()
                          : "N/A"}
                      </Text>
                    </Text>
                  </View>
                  <View style={styles.section}>
                    <Text style={styles.labelValue}>
                      Trạng thái:
                      <Text
                        style={[
                          styles.value,
                          { color: ticketDetail.is_paid ? colors.blueDark : "red" },
                        ]}
                      >
                        {ticketDetail.is_paid ? "Đã thanh toán" : "Chưa thanh toán"}
                      </Text>
                      {"  "}
                      {ticketDetail.is_paid ? (
                        <FontAwesome name="check-circle" size={16} color={colors.blueDark} />
                      ) : (
                        <FontAwesome name="times-circle" size={16} color="red" />
                      )}
                    </Text>
                  </View>
                  <View style={styles.section}>
                    <Text style={styles.labelValue}>
                      Check-in:
                      <Text
                        style={[
                          styles.value,
                          { color: ticketDetail.is_checked_in ? colors.blueDark : "red" },
                        ]}
                      >
                        {ticketDetail.is_checked_in ? "Đã check-in" : "Chưa check-in"}
                      </Text>
                      {ticketDetail.is_checked_in ? (
                        <FontAwesome
                          name="check-circle"
                          size={16}
                          color={colors.blueDark}
                        />
                      ) : (
                        <FontAwesome name="times-circle" size={16} color="red" />
                      )}
                    </Text>
                  </View>
                </ScrollView>
              ) : null}
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </>
  );
};

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  listContainer: {
    padding: 16,
  },
  ticketItem: {
    backgroundColor: "#fff",
    padding: 16,
    marginBottom: 12,
    borderRadius: 8,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 8,
    color: "#333",
  },
  errorText: {
    color: "red",
    fontSize: 16,
    textAlign: "center",
    padding: 20,
  },
  statusText: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 5,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    padding: 20,
  },
  modalContent: {
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 16,
    maxHeight: "90%",
  },
  modalCloseButton: {
    alignSelf: "flex-end",
    marginBottom: 10,
  },
  modalCloseText: {
    fontSize: 16,
    color: colors.bluePrimary,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#1a1a1a",
    marginBottom: 16,
    textAlign: "center",
  },
  section: {
    marginBottom: 12,
  },
  labelValue: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  value: {
    fontSize: 16,
    color: "#555",
    marginTop: 4,
  },
  qrCode: {
    width: 250,
    height: 250,
    alignSelf: "center",
    marginBottom: 20,
  },
});

export default MyTickets;
