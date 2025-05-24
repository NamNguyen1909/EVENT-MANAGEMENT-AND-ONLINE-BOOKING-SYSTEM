import React, { useState, useEffect, useContext } from 'react';
import { SafeAreaView, View, StyleSheet, Alert, Text, Platform, PermissionsAndroid } from 'react-native';
import { Button, Title, useTheme, ActivityIndicator } from 'react-native-paper';
import { RNCamera } from 'react-native-camera';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authApis, endpoints } from '../../configs/Apis';
import { MyUserContext } from '../../configs/MyContexts';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const Scan = () => {
  const theme = useTheme();
  const user = useContext(MyUserContext);
  const [hasPermission, setHasPermission] = useState(null);
  const [scanned, setScanned] = useState(false);
  const [loading, setLoading] = useState(false);
  const [scanResult, setScanResult] = useState(null);

  useEffect(() => {
    (async () => {
      if (Platform.OS === 'android') {
        try {
          const granted = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.CAMERA,
            {
              title: 'Yêu cầu quyền truy cập camera',
              message: 'Ứng dụng cần quyền truy cập camera để quét mã QR',
              buttonPositive: 'Đồng ý',
              buttonNegative: 'Hủy',
            }
          );
          setHasPermission(granted === PermissionsAndroid.RESULTS.GRANTED);
        } catch (err) {
          console.warn(err);
          setHasPermission(false);
        }
      } else {
        // iOS permission handling can be added here if needed
        setHasPermission(true);
      }
    })();
  }, []);

  const handleBarCodeScanned = async ({ data }) => {
    if (scanned || loading) return;

    setScanned(true);
    setLoading(true);
    setScanResult(null);

    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        Alert.alert('Lỗi', 'Không tìm thấy token xác thực. Vui lòng đăng nhập lại.');
        setLoading(false);
        return;
      }

      console.log('Scanned QR code:', data);
      const response = await authApis(token).post(endpoints.checkInTicket, { uuid: data });

      setScanResult({
        success: true,
        message: response.data.message || 'Check-in thành công!',
        ticket: response.data.ticket,
      });

      Alert.alert('Thành công', response.data.message || 'Check-in vé thành công!');
    } catch (error) {
      console.error('Error checking in ticket:', error);
      let errorMessage = 'Không thể check-in vé. Vui lòng thử lại.';
      if (error.response) {
        if (error.response.status === 401) {
          errorMessage = 'Xác thực thất bại. Vui lòng đăng nhập lại.';
          await AsyncStorage.removeItem('token');
          await AsyncStorage.removeItem('refresh_token');
        } else if (error.response.data && error.response.data.error) {
          errorMessage = error.response.data.error;
        }
      }
      setScanResult({ success: false, message: errorMessage });
      Alert.alert('Lỗi', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleScanAgain = () => {
    setScanned(false);
    setScanResult(null);
  };

  if (!user || (user.role !== 'attendee' && !user.is_staff)) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <Text style={styles.errorText}>
          Chỉ nhân viên được phép sử dụng tính năng quét mã QR.
        </Text>
      </SafeAreaView>
    );
  }

  if (hasPermission === null) {
    return <Text>Đang xin quyền truy cập camera...</Text>;
  }
  if (hasPermission === false) {
    return <Text>Bạn cần cấp quyền truy cập camera để sử dụng chức năng này.</Text>;
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Title style={styles.title}>Quét mã QR</Title>
      </View>
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        {!scanned ? (
          <View style={styles.scannerContainer}>
            <RNCamera
              style={StyleSheet.absoluteFillObject}
              onBarCodeRead={handleBarCodeScanned}
              barCodeTypes={[RNCamera.Constants.BarCodeType.qr]}
              captureAudio={false}
              androidCameraPermissionOptions={{
                title: 'Yêu cầu quyền truy cập camera',
                message: 'Ứng dụng cần quyền truy cập camera để quét mã QR',
                buttonPositive: 'Đồng ý',
                buttonNegative: 'Hủy',
              }}
            />
            <View style={styles.overlay}>
              <View style={styles.scanFrame}>
                <Icon name="qrcode-scan" size={40} color="#fff" style={styles.scanIcon} />
                <Text style={styles.scanText}>Quét mã QR của vé</Text>
              </View>
            </View>
          </View>
        ) : (
          <View style={styles.resultContainer}>
            {loading ? (
              <ActivityIndicator animating={true} size="large" color={theme.colors.primary} />
            ) : scanResult ? (
              <>
                <Icon
                  name={scanResult.success ? 'check-circle' : 'alert-circle'}
                  size={60}
                  color={scanResult.success ? theme.colors.success : theme.colors.error}
                  style={styles.resultIcon}
                />
                <Text style={styles.resultMessage}>{scanResult.message}</Text>
                {scanResult.success && scanResult.ticket && (
                  <View style={styles.ticketInfo}>
                    <Text style={styles.ticketText}>Sự kiện: {scanResult.ticket.event_title}</Text>
                    <Text style={styles.ticketText}>Người dùng: {scanResult.ticket.username}</Text>
                    <Text style={styles.ticketText}>
                      Thời gian: {new Date(scanResult.ticket.event_start_time).toLocaleString()}
                    </Text>
                  </View>
                )}
                <Button
                  mode="contained"
                  onPress={handleScanAgain}
                  style={styles.button}
                  disabled={loading}
                >
                  Quét lại
                </Button>
              </>
            ) : null}
          </View>
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    paddingTop: Platform.OS === 'ios' ? 40 : 20,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  container: {
    flex: 1,
    padding: 20,
  },
  scannerContainer: {
    flex: 1,
    position: 'relative',
    borderRadius: 10,
    overflow: 'hidden',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  scanFrame: {
    width: 250,
    height: 250,
    borderWidth: 2,
    borderColor: '#fff',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  scanIcon: {
    marginBottom: 10,
  },
  scanText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  resultContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  resultIcon: {
    marginBottom: 20,
  },
  resultMessage: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
  },
  ticketInfo: {
    marginBottom: 20,
    padding: 10,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    width: '80%',
  },
  ticketText: {
    fontSize: 16,
    marginBottom: 5,
  },
  button: {
    marginTop: 20,
    paddingVertical: 6,
    borderRadius: 8,
    width: '80%',
  },
  errorText: {
    textAlign: 'center',
    fontSize: 18,
    color: 'red',
    marginBottom: 20,
  },
});

export default Scan;
