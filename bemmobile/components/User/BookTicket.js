import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Linking,
} from "react-native";
import {
  Button,
  TextInput,
  IconButton,
  useTheme,
  Menu,
} from "react-native-paper";
import { useNavigation, useRoute } from "@react-navigation/native";
import Apis, { endpoints, authApis } from "../../configs/Apis";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { Dimensions } from "react-native";
const screenWidth = Dimensions.get("window").width;

const BookTicket = () => {
  const theme = useTheme();
  const navigation = useNavigation();
  const route = useRoute();
  const eventId = route.params?.eventId;
  const initialTicketPrice = parseFloat(route.params?.ticketPrice) || 0;

  const [quantity, setQuantity] = useState(0);
  const [ticketPrice, setTicketPrice] = useState(initialTicketPrice);
  const [totalPrice, setTotalPrice] = useState(initialTicketPrice);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState(null);

  // Discount codes state
  const [discountCodes, setDiscountCodes] = useState([]);
  const [selectedDiscountCode, setSelectedDiscountCode] = useState(null);
  const [menuVisible, setMenuVisible] = useState(false);

  const [paymentMenuVisible, setPaymentMenuVisible] = useState(false);
  const [unpaidTicketCount, setUnpaidTicketCount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState("momo");

  useEffect(() => {
    if (eventId) {
      setLoading(true);
      fetchUnpaidTicketsQuantity();
      fetchEventDetails();
      fetchDiscountCodes();
    }
  }, [eventId]);

  // Fetch số lượng vé chưa thanh toán của user cho event hiện tại
  const fetchUnpaidTicketsQuantity = async () => {
    try {
      const api = await getApiWithToken();
      if (!api) {
        setMsg("Vui lòng đăng nhập để xem thông tin vé.");
        setLoading(false);
        setTimeout(() => {
          navigation.reset({
            index: 0,
            routes: [{ name: "loginStack" }],
          });
        }, 2000);
        return;
      }
      const res = await api.get(endpoints.userTickets);
      console.log("res.data: ", res.data);

      // Kiểm tra res.data có phải là mảng không, nếu không thì lấy res.data.results
      const ticketsData = Array.isArray(res.data)
        ? res.data
        : res.data.results || [];
      console.log("Tickets data:", ticketsData);
      // Lọc vé chưa thanh toán cho event hiện tại
      const unpaidTickets = ticketsData.filter(
        (ticket) => !ticket.is_paid && ticket.event_id === eventId
      );
      setUnpaidTicketCount(unpaidTickets.length);
      // unpaidTickets.forEach(ticket => {
      //   console.log('Ticket event_id:', ticket.event_id, 'Target eventId:', eventId);
      // });
      console.log("Unpaid tickets:", unpaidTickets.length);
      setQuantity(unpaidTickets.length);
    } catch (error) {
      console.log("Error fetching unpaid tickets quantity:", error);
    }
  };

  useEffect(() => {
    if (ticketPrice > 0 && quantity >= 0) {
      let newTotal = ticketPrice * quantity;
      if (selectedDiscountCode) {
        const discountAmount =
          (newTotal * selectedDiscountCode.discount_percentage) / 100;
        newTotal = newTotal - discountAmount;
      }
      setTotalPrice(newTotal);
    }
  }, [quantity, ticketPrice, selectedDiscountCode]);

  const getApiWithToken = async () => {
    const token = await AsyncStorage.getItem("token");
    if (!token) {
      return null;
    }
    return authApis(token);
  };

  const fetchEventDetails = async () => {
    try {
      const api = await getApiWithToken();
      if (!api) {
        setMsg("Vui lòng đăng nhập để xem thông tin sự kiện.");
        setLoading(false);
        setTimeout(() => {
          navigation.reset({
            index: 0,
            routes: [{ name: "loginStack" }],
          });
        }, 2000);
        return;
      }
      const res = await api.get(endpoints["eventDetail"](eventId));
      const price = Number(res.data.ticket_price || 0);
      setTicketPrice(price);
    } catch (error) {
      setMsg("Không thể tải thông tin sự kiện.");
    } finally {
      setLoading(false);
    }
  };

  const fetchDiscountCodes = async () => {
    try {
      const api = await getApiWithToken();
      if (!api) {
        return;
      }
      const res = await api.get(endpoints.discountCodeDetail);
      setDiscountCodes(res.data);
    } catch (error) {
      console.log("Error fetching discount codes:", error);
    }
  };

  const increaseQuantity = () => {
    setQuantity((prev) => prev + 1);
  };

  const decreaseQuantity = () => {
    setQuantity((prev) => (prev > 0 ? prev - 1 : 0));
  };

  const handlePayment = async () => {
    if (quantity <= 0) {
      setMsg("Số lượng vé phải lớn hơn 0.");
      return;
    }
    setLoading(true);
    setMsg(null);
    try {
      const api = await getApiWithToken();
      if (!api) {
        setMsg("Vui lòng đăng nhập để đặt vé.");
        setLoading(false);
        return;
      }
      // 1. Đặt vé
      console.log("Fquantity: ", quantity);

      let actualQuantity=0;
      if (quantity > unpaidTicketCount) {
        //Trường hợp đặt thêm vé mới
        actualQuantity = quantity - unpaidTicketCount; //Chỉ tạo thêm số lượng vé mới cần đặt
      } 
      //Trường hợp giảm số lượng vé đã đặt|| không tạo thêm vé mới|| số vé thanh toán nhỏ hơn vé đã tạo sẵn
      // Không cần đặt thêm vé, chỉ cần thanh toán cho vé đã đặt
      console.log("actualQuantity: ", actualQuantity);

      // Đặt vé nhiều lần tương ứng actualQuantity
      for (let i = 0; i < actualQuantity; i++) {
        const bookPayload = {
          event_id: eventId,
        };
        const bookRes = await api.post(endpoints.bookTicket, bookPayload);
        console.log("bookPayload: ", bookPayload);
        console.log("bookRes: ", bookRes.data);
        if (!bookRes || bookRes.status >= 400) {
          setMsg("Đặt vé thất bại. Vui lòng thử lại.");
          console.log("Booking error:", bookRes.data);
          setLoading(false);
          return;
        }
      }

      // 2. Tạo payment và lấy payment_url
      const payPayload = {
        event_id: eventId,
        payment_method: paymentMethod,
      };
      console.log("paymentPayload: ", payPayload);
      if (selectedDiscountCode) {
        payPayload.discount_code_id = selectedDiscountCode.id;
      }
      const payRes = await api.post(endpoints.payUnpaidTickets, payPayload);
      console.log("payRes: ", payRes.data);
      if (!payRes || payRes.status >= 400) {
        setMsg("Tạo payment thất bại. Vui lòng thử lại.");
        console.log("Payment error:", payRes.data);
        setLoading(false);
        return;
      }

      const paymentId = payRes?.data?.payment?.id;
      const paymentUrl = payRes?.data?.payment_url;
      if (!paymentUrl || !paymentId) {
        setMsg("Không nhận được đường dẫn thanh toán hoặc paymentId.");
        setLoading(false);
        return;
      }

      // 3. Mở cổng thanh toán (WebView hoặc deeplink)
      navigation.navigate("VNPayScreen", { paymentUrl, paymentId });

      // // 4. Xử lý callback thanh toán (webhook backend sẽ cập nhật trạng thái)
      // setMsg('Vui lòng hoàn tất thanh toán trên cổng thanh toán.');
    } catch (error) {
      setMsg("Đặt vé thất bại. Vui lòng thử lại.");
      console.log("Booking error:", error);
    } finally {
      setLoading(false);
    }
  };

  const openMenu = () => setMenuVisible(true);
  const closeMenu = () => setMenuVisible(false);

  return (
    <View
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <Text style={styles.title}>Đặt vé ngay!</Text>

      {/* Số lượng vé */}
      <View style={styles.quantityContainer}>
        <IconButton
          icon="minus"
          size={30}
          onPress={decreaseQuantity}
          disabled={loading || ticketPrice <= 0}
          style={styles.iconButton}
        />

        <TextInput
          mode="outlined"
          keyboardType="numeric"
          value={quantity.toString()}
          onChangeText={(text) => {
            const num = parseInt(text, 10);
            if (!isNaN(num) && num >= 0) {
              setQuantity(num);
            }
          }}
          style={styles.quantityInput}
          editable={!loading && ticketPrice > 0}
        />

        <IconButton
          icon="plus"
          size={30}
          onPress={increaseQuantity}
          disabled={loading || ticketPrice <= 0}
          style={styles.iconButton}
        />
      </View>

      {/* Discount Code Dropdown */}
      <View style={styles.discountDropdownContainer}>
        <Text style={styles.discountDropdownLabel}>Mã giảm giá</Text>
        <Menu
          visible={menuVisible}
          onDismiss={closeMenu}
          anchor={
            <Button
              mode="outlined"
              onPress={openMenu}
              disabled={loading || discountCodes.length === 0}
            >
              {selectedDiscountCode
                ? selectedDiscountCode.code
                : "Chọn mã giảm giá"}
            </Button>
          }
          contentStyle={{
            width: screenWidth * 0.9,
            maxHeight: 400, // Giới hạn chiều cao tối đa để không chiếm quá nhiều không gian
          }}
        >
          {discountCodes.length === 0 ? (
            <Menu.Item title="Không có mã giảm giá" disabled />
          ) : (
            discountCodes.map((dc) => (
              <TouchableOpacity
                key={dc.id}
                onPress={() => {
                  setSelectedDiscountCode(dc);
                  closeMenu();
                }}
                style={styles.menuItem}
              >
                <View style={styles.menuItemContent}>
                  <Text style={styles.menuItemCode}>{dc.code}</Text>
                  <Text style={styles.menuItemDetails}>
                    Giảm {dc.discount_percentage}% • Từ{" "}
                    {new Date(dc.valid_from).toLocaleDateString()} đến{" "}
                    {new Date(dc.valid_to).toLocaleDateString()}
                  </Text>
                  <Text style={styles.menuItemUsage}>
                    Đã dùng: {dc.used_count}/{dc.max_uses ?? "∞"}
                  </Text>
                </View>
              </TouchableOpacity>
            ))
          )}
        </Menu>
      </View>

      {/* Payment Method Dropdown */}
      <View style={styles.paymentDropdownContainer}>
        <Text style={styles.paymentDropdownLabel}>Phương thức thanh toán</Text>
        <Menu
          visible={paymentMenuVisible}
          onDismiss={() => setPaymentMenuVisible(false)}
          anchor={
            <Button mode="outlined" onPress={() => setPaymentMenuVisible(true)}>
              {paymentMethod === "momo" ? "MoMo" : "VNPay"}
            </Button>
          }
          contentStyle={{
            width: screenWidth * 0.9,
          }}
        >
          <TouchableOpacity
            onPress={() => {
              setPaymentMethod("momo");
              setPaymentMenuVisible(false);
            }}
            style={styles.menuItem}
          >
            <Text style={styles.menuItemCode}>MoMo</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => {
              setPaymentMethod("vnpay");
              setPaymentMenuVisible(false);
            }}
            style={styles.menuItem}
          >
            <Text style={styles.menuItemCode}>VNPay</Text>
          </TouchableOpacity>
        </Menu>
      </View>

      {/* Tổng tiền vé */}
      <Text style={styles.totalText}>
        Tổng tiền vé: {(ticketPrice * quantity).toLocaleString()} VND
      </Text>
      {/* Tiền giảm */}
      <Text style={styles.totalText}>
        Tiền giảm:{" "}
        {selectedDiscountCode
          ? (
              (ticketPrice *
                quantity *
                selectedDiscountCode.discount_percentage) /
              100
            ).toLocaleString()
          : 0}{" "}
        VND
      </Text>
      {/* Tổng cộng */}
      <Text style={styles.totalText}>
        Tổng cộng: {totalPrice.toLocaleString()} VND
      </Text>

      {/* Thông báo */}
      {msg && <Text style={styles.msgText}>{msg}</Text>}

      {/* Nút thanh toán */}
      <Button
        mode="contained"
        onPress={handlePayment}
        loading={loading}
        disabled={loading || quantity <= 0}
        style={styles.payButton}
        labelStyle={styles.buttonLabel}
      >
        Thanh toán
      </Button>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: "center",
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 30,
    textAlign: "center",
    color: "#1A73E8",
  },
  quantityContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  quantityInput: {
    width: 80,
    textAlign: "center",
    marginHorizontal: 10,
    backgroundColor: "white",
    borderRadius: 8,
    paddingVertical: 5,
  },
  totalText: {
    fontSize: 17,
    fontWeight: "500",
    textAlign: "left",
    marginBottom: 10,
    color: "#333",
  },
  msgText: {
    textAlign: "center",
    color: "red",
    marginBottom: 10,
  },
  iconButton: {
    marginHorizontal: 5,
    backgroundColor: "#f0f0f0",
    borderRadius: 50,
  },
  payButton: {
    marginHorizontal: 50,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: "#1A73E8",
  },
  buttonLabel: {
    fontWeight: "bold",
  },
  discountDropdownContainer: {
    marginBottom: 20,
  },
  discountDropdownLabel: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 8,
    color: "#333",
  },
  paymentDropdownContainer: {
    marginBottom: 20,
  },
  paymentDropdownLabel: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 8,
    color: "#333",
  },
  menuItem: {
    width: "100%",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  menuItemContent: {
    width: "100%",
  },
  menuItemCode: {
    fontWeight: "bold",
    fontSize: 16,
    color: "#1A73E8",
    marginBottom: 4,
  },
  menuItemDetails: {
    fontSize: 14,
    color: "#555",
    marginBottom: 4,
    flexWrap: "wrap",
  },
  menuItemUsage: {
    fontSize: 13,
    color: "#777",
    fontStyle: "italic",
  },
});

export default BookTicket;
