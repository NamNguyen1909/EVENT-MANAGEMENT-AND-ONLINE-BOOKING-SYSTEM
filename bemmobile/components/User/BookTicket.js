import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Button, TextInput, IconButton, useTheme, Menu } from 'react-native-paper';
import { useNavigation, useRoute } from '@react-navigation/native';
import Apis, { endpoints, authApis } from '../../configs/Apis';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { Dimensions } from 'react-native';
const screenWidth = Dimensions.get('window').width;

const BookTicket = () => {
  const theme = useTheme();
  const navigation = useNavigation();
  const route = useRoute();
  const eventId = route.params?.eventId;
  const initialTicketPrice = parseFloat(route.params?.ticketPrice) || 0;

  const [quantity, setQuantity] = useState(1);
  const [ticketPrice, setTicketPrice] = useState(initialTicketPrice);
  const [totalPrice, setTotalPrice] = useState(initialTicketPrice);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState(null);

  // Discount codes state
  const [discountCodes, setDiscountCodes] = useState([]);
  const [selectedDiscountCode, setSelectedDiscountCode] = useState(null);
  const [menuVisible, setMenuVisible] = useState(false);

  const [paymentMenuVisible, setPaymentMenuVisible] = useState(false);

  useEffect(() => {
    if (eventId) {
      setLoading(true);
      fetchEventDetails();
      fetchDiscountCodes();
    }
  }, [eventId]);

  useEffect(() => {
    if (ticketPrice > 0 && quantity >= 0) {
      let newTotal = ticketPrice * quantity;
      if (selectedDiscountCode) {
        const discountAmount = (newTotal * selectedDiscountCode.discount_percentage) / 100;
        newTotal = newTotal - discountAmount;
      }
      setTotalPrice(newTotal);
    }
  }, [quantity, ticketPrice, selectedDiscountCode]);

const getApiWithToken = async () => {
    const token = await AsyncStorage.getItem('token');
    if (!token) {
      return null;
    }
    return authApis(token);
  };

  const fetchEventDetails = async () => {
    try {
      const api = await getApiWithToken();
      if (!api) {
        setMsg('Vui lòng đăng nhập để xem thông tin sự kiện.');
        setLoading(false);
        setTimeout(() => {
          navigation.reset({
            index: 0,
            routes: [{ name: 'loginStack' }],
          });
        }, 2000);
        return;
      }
      const res = await api.get(endpoints['eventDetail'](eventId));
      const price = Number(res.data.ticket_price || 0);
      setTicketPrice(price);
    } catch (error) {
      setMsg('Không thể tải thông tin sự kiện.');
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
      console.log('Error fetching discount codes:', error);
    }
  };

  const increaseQuantity = () => {
    setQuantity(prev => prev + 1);
  };

  const decreaseQuantity = () => {
    setQuantity(prev => (prev > 0 ? prev - 1 : 0));
  };

  const [paymentMethod, setPaymentMethod] = useState('momo');

  const handlePayment = async () => {
    if (quantity <= 0) {
      setMsg('Số lượng vé phải lớn hơn 0.');
      return;
    }
    setLoading(true);
    setMsg(null);
    try {
      const payload = {
        event_id: eventId,
        quantity: quantity,
        payment_method: paymentMethod,
      };
      if (selectedDiscountCode) {
        payload.discount_code_id = selectedDiscountCode.id;
      }
      const api = await getApiWithToken();
      if (!api) {
        setMsg('Vui lòng đăng nhập để đặt vé.');
        setLoading(false);
        return;
      }
      const res = await api.post(endpoints['book_ticket'], payload);

      setMsg('Đặt vé thành công!');
    } catch (error) {
      setMsg('Đặt vé thất bại. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  const openMenu = () => setMenuVisible(true);
  const closeMenu = () => setMenuVisible(false);

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Text style={styles.title}>Đặt vé ngay!</Text>

      {/* Số lượng vé */}
      <View style={styles.quantityContainer}>
        <IconButton icon="minus" size={30} onPress={decreaseQuantity} disabled={loading || ticketPrice <= 0} style={styles.iconButton} />

        <TextInput
          mode="outlined"
          keyboardType="numeric"
          value={quantity.toString()}
          onChangeText={text => {
            const num = parseInt(text, 10);
            if (!isNaN(num) && num >= 0) {
              setQuantity(num);
            }
          }}
          style={styles.quantityInput}
          editable={!loading && ticketPrice > 0}
        />

        <IconButton icon="plus" size={30} onPress={increaseQuantity} disabled={loading || ticketPrice <= 0} style={styles.iconButton} />
      </View>

      {/* Discount Code Dropdown */}
      <View style={styles.discountDropdownContainer}>
        <Text style={styles.discountDropdownLabel}>Mã giảm giá</Text>
        <Menu
          visible={menuVisible}
          onDismiss={closeMenu}
          anchor={
            <Button mode="outlined" onPress={openMenu} disabled={loading || discountCodes.length === 0}>
              {selectedDiscountCode ? selectedDiscountCode.code : 'Chọn mã giảm giá'}
            </Button>
          }
          contentStyle={{ 
            width: screenWidth * 0.9,
            maxHeight: 400 // Giới hạn chiều cao tối đa để không chiếm quá nhiều không gian
          }}
        >
          {discountCodes.length === 0 ? (
            <Menu.Item title="Không có mã giảm giá" disabled />
          ) : (
            discountCodes.map(dc => (
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
                    Giảm {dc.discount_percentage}% • 
                    Từ {new Date(dc.valid_from).toLocaleDateString()} đến {new Date(dc.valid_to).toLocaleDateString()}
                  </Text>
                  <Text style={styles.menuItemUsage}>
                    Đã dùng: {dc.used_count}/{dc.max_uses ?? '∞'}
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
              {paymentMethod === 'momo' ? 'MoMo' : 'VNPay'}
            </Button>
          }
          contentStyle={{ 
            width: screenWidth * 0.9,
          }}
        >
          <TouchableOpacity 
            onPress={() => {
              setPaymentMethod('momo');
              setPaymentMenuVisible(false);
            }}
            style={styles.menuItem}
          >
            <Text style={styles.menuItemCode}>MoMo</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            onPress={() => {
              setPaymentMethod('vnpay');
              setPaymentMenuVisible(false);
            }}
            style={styles.menuItem}
          >
            <Text style={styles.menuItemCode}>VNPay</Text>
          </TouchableOpacity>
        </Menu>
      </View>

      {/* Tổng tiền vé */}
      <Text style={styles.totalText}>Tổng tiền vé: {(ticketPrice * quantity).toLocaleString()} VND</Text>
      {/* Tiền giảm */}
      <Text style={styles.totalText}>
        Tiền giảm: {selectedDiscountCode ? ((ticketPrice * quantity * selectedDiscountCode.discount_percentage) / 100).toLocaleString() : 0} VND
      </Text>
      {/* Tổng cộng */}
      <Text style={styles.totalText}>Tổng cộng: {totalPrice.toLocaleString()} VND</Text>

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
    justifyContent: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 30,
    textAlign: 'center',
    color: '#1A73E8',
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  quantityInput: {
    width: 80,
    textAlign: 'center',
    marginHorizontal: 10,
    backgroundColor: 'white',
    borderRadius: 8,
    paddingVertical: 5,
  },
  totalText: {
    fontSize: 17,
    fontWeight: '500',
    textAlign: 'left',
    marginBottom: 10,
    color: '#333',
  },
  msgText: {
    textAlign: 'center',
    color: 'red',
    marginBottom: 10,
  },
  iconButton: {
    marginHorizontal: 5,
    backgroundColor: '#f0f0f0',
    borderRadius: 50,
  },
  payButton: {
    marginHorizontal: 50,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#1A73E8',
  },
  buttonLabel: {
    fontWeight: 'bold',
  },
  discountDropdownContainer: {
    marginBottom: 20,
  },
  discountDropdownLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
  },
  paymentDropdownContainer: {
    marginBottom: 20,
  },
  paymentDropdownLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
  },
  menuItem: {
    width: '100%',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  menuItemContent: {
    width: '100%',
  },
  menuItemCode: {
    fontWeight: 'bold',
    fontSize: 16,
    color: '#1A73E8',
    marginBottom: 4,
  },
  menuItemDetails: {
    fontSize: 14,
    color: '#555',
    marginBottom: 4,
    flexWrap: 'wrap',
  },
  menuItemUsage: {
    fontSize: 13,
    color: '#777',
    fontStyle: 'italic',
  },
});

export default BookTicket;
