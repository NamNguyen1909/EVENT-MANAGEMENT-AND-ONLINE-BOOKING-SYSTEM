import React, { useEffect, useState, useContext } from "react";
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  StyleSheet,
  TouchableOpacity,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { endpoints, authApis } from "../../configs/Apis";
import { MyUserContext } from "../../configs/MyContexts";
import FontAwesome from "react-native-vector-icons/FontAwesome";
import MyStyles, { colors } from "../../styles/MyStyles";

const MyTickets = () => {
  const navigation = useNavigation();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const [nextPageUrl, setNextPageUrl] = useState(null);
  const user = useContext(MyUserContext);

  const fetchTickets = async (url = endpoints.userTickets, append = false) => {
    try {
      if (append) {
        setLoadingMore(true);
      } else {
        setLoading(true);
        setError(null);
      }
      const token = await AsyncStorage.getItem("token");
      console.log("Token in myticket: ", token);
      if (!user || !token) {
        setError("Vui lòng đăng nhập để xem vé của bạn.");
        setLoading(false);
        setLoadingMore(false);
        navigation.reset({
          index: 0,
          routes: [{ name: "loginStack" }],
        });
        return;
      }
      const api = authApis(token);
      const response = await api.get(url);
      console.log("Myticket res: ", response.data);
      const newTickets = response.data.results || response.data || [];
      if (append) {
        setTickets((prevTickets) => [...prevTickets, ...newTickets]);
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
      fetchTickets(nextPageUrl, true);
    }
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={styles.ticketItem}
      onPress={() =>
        navigation.navigate("MyTicketDetails", { ticketId: item.id })
      }
    >
      <Text style={styles.eventTitle}>
        {item.event_title || item.event?.title || "Không có tiêu đề"}
      </Text>
      <Text>Username: {item.username}</Text>
      <Text>Email: {item.email}</Text>
      <Text>
        Ngày mua:{" "}
        {item.purchase_date
          ? new Date(item.purchase_date).toLocaleString()
          : "N/A"}
      </Text>
      <Text>Địa điểm: {item.event_location || "N/A"}</Text>
      <Text>
        Thời gian bắt đầu:{" "}
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

      {item.qr_code && (
        <Text>
          QR:
          <FontAwesome
            name={item.qr_code ? "check-circle" : "times-circle"}
            size={16}
            color={item.qr_code ? colors.blueDark : "red"}
          />
        </Text>
      )}
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
    <FlatList
      data={tickets}
      keyExtractor={(item) => item.id.toString()}
      renderItem={renderItem}
      contentContainerStyle={styles.listContainer}
      refreshing={loading}
      onRefresh={() => fetchTickets()}
      onEndReached={fetchMoreTickets}
      onEndReachedThreshold={0.5}
      ListFooterComponent={renderFooter}
    />
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
    // paddingBottom:500 //Làm cho item to ra để test lazy loading
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
});

export default MyTickets;
