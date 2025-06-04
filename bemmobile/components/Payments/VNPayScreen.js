import React, { useState, useRef } from 'react';
import { View, ActivityIndicator, Alert } from 'react-native';
import { WebView } from 'react-native-webview';
import AsyncStorage from "@react-native-async-storage/async-storage";
import { authApis, endpoints } from "../../configs/Apis";

const VNPayScreen = ({ route, navigation }) => {
  const [loading, setLoading] = useState(true);
  const { paymentUrl, paymentId } = route.params;
  const webviewRef = useRef();
  const confirmedRef = useRef(false);

  const handleNavigationChange = async (navState) => {
    const { url } = navState;

    if (
      url.includes('/vnpay/redirect') &&
      !confirmedRef.current // Chỉ xử lý lần đầu
    ) {
      confirmedRef.current = true; // Đánh dấu đã xác nhận
      const urlParams = new URLSearchParams(url.split('?')[1]);
      const responseCode = urlParams.get('vnp_ResponseCode');
      console.log('VNPayScreen responseCode:', responseCode);
      if (responseCode === '00') {
        try {
          await new Promise(resolve => setTimeout(resolve, 1500));
          const token = await AsyncStorage.getItem("token");
          if (token && paymentId) {
            const api = authApis(token);
            await api.post(endpoints.confirmPayment(paymentId));
            console.log('VNPayScreen Payment confirmed successfully');
          }
          Alert.alert('Thanh toán thành công!');
        } catch (err) {
          Alert.alert('Thanh toán thành công, nhưng cập nhật trạng thái thất bại!');
          console.error('VNPayScreen Error confirming payment:', err);
        }
      } else {
        Alert.alert('Thanh toán thất bại hoặc bị hủy');
      }
      navigation.navigate("MyTicketsScreen");
      console.log('VNPayScreen Navigation to MyTicketsScreen');
    }
  };

  return (
    <View style={{ flex: 1 }}>
      {loading && <ActivityIndicator size="large" />}
      <WebView
        ref={webviewRef}
        source={{ uri: paymentUrl }}
        onLoadEnd={() => setLoading(false)}
        onNavigationStateChange={handleNavigationChange}
        startInLoadingState
      />
    </View>
  );
};

export default VNPayScreen;