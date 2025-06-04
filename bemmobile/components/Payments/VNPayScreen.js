import React, { useState, useRef } from 'react';
import { View, ActivityIndicator, Alert } from 'react-native';
import { WebView } from 'react-native-webview';
import AsyncStorage from "@react-native-async-storage/async-storage";
import { authApis, endpoints } from "../../configs/Apis";

/**
 * VNPayScreen: Hiển thị WebView thanh toán VNPay.
 * - Chỉ xử lý xác nhận payment ở onMessage (callback từ backend gửi về).
 * - Đảm bảo callback luôn về app, FE chủ động xác nhận payment, điều hướng, hiển thị thông báo.
 */
const VNPayScreen = ({ route, navigation }) => {
  const [loading, setLoading] = useState(true);
  const { paymentUrl, paymentId } = route.params;
  const webviewRef = useRef();
  const confirmedRef = useRef(false); // Đảm bảo chỉ xác nhận 1 lần

  const handleNavigationChange = (navState) => {
    const { url } = navState;
    console.log("WebView navigation changed:", url);
    // Chỉ log để debug, không xác nhận payment ở đây!
  };

  /**
   * Xử lý callback từ backend gửi về qua postMessage.
   * Nếu thanh toán thành công, gọi API xác nhận payment, điều hướng về MyTicketsScreen.
   */
  const handleWebViewMessage = async (event) => {
    console.log("WebView received message:", event.nativeEvent.data);
    if (confirmedRef.current) return;
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.vnp_ResponseCode) {
        confirmedRef.current = true;
        if (data.vnp_ResponseCode === '00') {
          try {
            await new Promise(resolve => setTimeout(resolve, 1500)); // Đợi backend xử lý xong
            const token = await AsyncStorage.getItem("token");
            if (token && paymentId) {
              const api = authApis(token);
              const res = await api.post(endpoints.confirmPayment(paymentId));
              console.log("Confirm payment response:", res?.data);
            } else {
              console.log("No token or paymentId found!");
            }
            Alert.alert('Thanh toán thành công!');
          } catch (err) {
            console.log("Error confirming payment:", err?.response?.data || err.message || err);
            Alert.alert('Thanh toán thành công, nhưng cập nhật trạng thái thất bại!');
          }
        } else {
          Alert.alert('Thanh toán thất bại hoặc bị hủy');
        }
        navigation.navigate("MyTicketsScreen");
      }
    } catch (e) {
      console.log("Error parsing WebView message:", e);
    }
  };

  return (
    <View style={{ flex: 1 }}>
      {loading && <ActivityIndicator size="large" />}
      <WebView
        ref={webviewRef}
        source={{ uri: paymentUrl }}
        onLoadEnd={() => setLoading(false)}
        onNavigationStateChange={handleNavigationChange} // Chỉ log, không xác nhận payment ở đây!
        onMessage={handleWebViewMessage} // Xác nhận payment ở đây!
        startInLoadingState
      />
    </View>
  );
};

export default VNPayScreen;