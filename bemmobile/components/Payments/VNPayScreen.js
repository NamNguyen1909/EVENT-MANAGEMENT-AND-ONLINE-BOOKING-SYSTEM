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
    // Nếu backend vẫn redirect về /vnpay/redirect?...
    if (
      url.includes('/vnpay/redirect') &&
      !confirmedRef.current
    ) {
      confirmedRef.current = true;
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
    } catch (e) {
      // Không phải message hợp lệ, bỏ qua
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