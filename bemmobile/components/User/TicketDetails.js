import React, { useEffect, useState, useContext } from "react";
import {
  View,
  Text,
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Image,
  Alert,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation, useRoute } from "@react-navigation/native";
import { endpoints, authApis } from "../../configs/Apis";
import { MyUserContext } from "../../configs/MyContexts";
import MyStyles, { colors } from "../../styles/MyStyles";
import FontAwesome from "react-native-vector-icons/FontAwesome";

const TicketDetail = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { ticketId } = route.params;
  const [ticketDetail, setTicketDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const user = useContext(MyUserContext);

  const fetchTicketDetail = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = await AsyncStorage.getItem("token");
      if (!user || !token) {
        setError("Vui lòng đăng nhập để xem chi tiết vé.");
        setLoading(false);
        setTimeout(() => {
          navigation.reset({
            index: 0,
            routes: [{ name: "loginStack" }],
          });
        }, 2000);
        return;
      }
      const api = authApis(token);
      const res = await api.get(endpoints.ticketDetail(ticketId));
      setTicketDetail(res.data);
      console.log("Ticket Detail:", res.data);
    } catch (err) {
      console.error(err);
      setError("Không thể tải chi tiết vé.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTicketDetail();
  }, [ticketId]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.bluePrimary} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={{ color: "red" }}>{error}</Text>
      </View>
    );
  }

  if (!ticketDetail) {
    return (
      <View style={styles.center}>
        <Text>Không có dữ liệu vé.</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {ticketDetail.qr_code ? (
        <Image source={{ uri: ticketDetail.qr_code }} style={styles.qrCode} />
      ) : (
        <Text>Không có mã QR.</Text>
      )}
      <Text style={styles.title}>
        {ticketDetail.event_title || "Chi tiết vé"}
      </Text>
      <View style={styles.section}>
        <Text style={styles.labelValue}>
          Username:
          <Text style={styles.value}>{ticketDetail.username || "N/A"}</Text>
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
          Địa điểm:
          <Text style={styles.value}>
            {ticketDetail.event_location || "N/A"}
          </Text>
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
          {ticketDetail.is_paid ? (
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
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: "#fff",
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  qrCode: {
    width: 250,
    height: 250,
    alignSelf: "center",
    marginBottom: 20,
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
  label: {
    fontWeight: "600",
    fontSize: 16,
    color: "#333",
  },
  value: {
    fontSize: 16,
    color: "#555",
    marginTop: 4,
  },
});

export default TicketDetail;
