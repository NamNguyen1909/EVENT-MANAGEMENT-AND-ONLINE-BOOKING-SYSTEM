import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Button, TextInput, IconButton, useTheme } from 'react-native-paper';
import { useNavigation, useRoute } from '@react-navigation/native';
import Apis, { endpoints } from '../../configs/Apis';

const BookTicket = () => {
  const theme = useTheme();
  const navigation = useNavigation();
  const route = useRoute();
  const eventId = route.params?.eventId;

  const [quantity, setQuantity] = useState(1);
  const [ticketPrice, setTicketPrice] = useState(0);
  const [totalPrice, setTotalPrice] = useState(0);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState(null);

  useEffect(() => {
    if (eventId) {
      fetchEventDetails();
    }
  }, [eventId]);

  useEffect(() => {
    const price = parseFloat(ticketPrice);
    const qty = parseInt(quantity, 10);
    if (!isNaN(price) && !isNaN(qty)) {
      setTotalPrice(price * qty);
    } else {
      setTotalPrice(0);
    }
  }, [quantity, ticketPrice]);

  const fetchEventDetails = async () => {
    try {
      const res = await Apis.get(endpoints['event_detail'](eventId));
      const price = Number(res.data.ticket_price || 0);
      setTicketPrice(price);
      console.log('Ticket price:', price);
      setTotalPrice(price * quantity);
    } catch (error) {
      setMsg('Không thể tải thông tin sự kiện.');
    }
  };

  const increaseQuantity = () => {
    setQuantity(prev => prev + 1);
  };

  const decreaseQuantity = () => {
    setQuantity(prev => (prev > 0 ? prev - 1 : 0));
  };

  const handlePayment = async () => {
    if (quantity <= 0) {
      setMsg('Số lượng vé phải lớn hơn 0.');
      return;
    }
    setLoading(true);
    setMsg(null);
    try {
      // Call API to book tickets
      const res = await Apis.post(endpoints['book_ticket'], {
        event_id: eventId,
        quantity: quantity,
      });
      setMsg('Đặt vé thành công!');
      // Optionally navigate to ticket list or payment screen
    } catch (error) {
      setMsg('Đặt vé thất bại. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Text style={styles.title}>Đặt vé ngay!</Text>
      <View style={styles.quantityContainer}>
        <IconButton icon="minus" size={30} onPress={decreaseQuantity} />
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
        />
        <IconButton icon="plus" size={30} onPress={increaseQuantity} />
      </View>
      <Text style={styles.totalText}>Tổng cộng: {totalPrice.toLocaleString()} VND</Text>
      {msg && <Text style={styles.msgText}>{msg}</Text>}
      <Button
        mode="contained"
        onPress={handlePayment}
        loading={loading}
        disabled={loading || quantity <= 0}
        style={styles.payButton}
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
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  quantityInput: {
    width: 60,
    textAlign: 'center',
    marginHorizontal: 10,
  },
  totalText: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 20,
  },
  msgText: {
    textAlign: 'center',
    color: 'red',
    marginBottom: 10,
  },
  payButton: {
    marginHorizontal: 50,
  },
});

export default BookTicket;
