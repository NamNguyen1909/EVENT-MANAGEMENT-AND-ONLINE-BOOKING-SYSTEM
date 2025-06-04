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
    console.log("WebView navigation changed:", url);
    // Nếu backend vẫn redirect về /vnpay/redirect?...
    if (
      url.includes('/vnpay/redirect') &&
      !confirmedRef.current
    ) {
      // confirmedRef.current = true;
      const urlParams = new URLSearchParams(url.split('?')[1]);
      const responseCode = urlParams.get('vnp_ResponseCode');
      if (responseCode === '00') {
        try {
          await new Promise(resolve => setTimeout(resolve, 1500));
          const token = await AsyncStorage.getItem("token");
          if (token && paymentId) {
            const api = authApis(token);
            await api.post(endpoints.confirmPayment(paymentId));
          }
          Alert.alert('Thanh toán thành công!');
        } catch (err) {
          Alert.alert('Thanh toán thành công, nhưng cập nhật trạng thái thất bại!');
        }
      } else {
        Alert.alert('Thanh toán thất bại hoặc bị hủy');
      }
      navigation.navigate("MyTicketsScreen");
    }
  };

  const handleWebViewMessage = async (event) => {
    console.log("WebView received message:", event.nativeEvent.data);
    console.log("Current confirmed state:", confirmedRef.current);
    if (confirmedRef.current) return;
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.vnp_ResponseCode) {
        confirmedRef.current = true;
        if (data.vnp_ResponseCode === '00') {
          try {
            await new Promise(resolve => setTimeout(resolve, 1500));
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
        onNavigationStateChange={handleNavigationChange}
        onMessage={handleWebViewMessage}
        startInLoadingState
      />
    </View>
  );
};

export default VNPayScreen;