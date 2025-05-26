import React, { useState, useContext, useRef } from 'react';
import { SafeAreaView, View, StyleSheet, Alert, Text, Platform } from 'react-native';
import { Button, Title, useTheme, ActivityIndicator } from 'react-native-paper';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authApis, endpoints } from '../../configs/Apis';
import { MyUserContext } from '../../configs/MyContexts';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import MyStyles ,{colors} from '../../styles/MyStyles';

const Scan = () => {
  const theme = useTheme();
  const user = useContext(MyUserContext);
  const [scanned, setScanned] = useState(false);
  const [loading, setLoading] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [facing, setFacing] = useState('back');
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef(null);


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

      const response = await authApis(token).post(endpoints.checkInTicket, { uuid: data });

      setScanResult({
        success: true,
        message: response.data.message || 'Check-in thành công!',
        ticket: response.data.ticket,
      });

      Alert.alert('Thành công', response.data.message || 'Check-in vé thành công!');
    } catch (error) {
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

  const toggleCameraFacing = () => {
    setFacing(current => (current === 'back' ? 'front' : 'back'));
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

  if (!permission) {
    return <Text>Đang kiểm tra quyền truy cập camera...</Text>;
  }
  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Bạn cần cấp quyền truy cập camera để sử dụng chức năng này.</Text>
        <Button mode="contained" onPress={requestPermission}>Cấp quyền</Button>
      </View>
    );
  }

  
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Title style={styles.title}>Quét mã QR</Title>
      </View>
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        {!scanned ? (
          <View style={styles.scannerContainer}>
            <CameraView
              ref={cameraRef}
              style={{ flex: 1 }}
              facing={facing}
              barcodeScannerSettings={{
                barcodeTypes: ['qr'],
              }}
              onBarcodeScanned={handleBarCodeScanned}
            >
              <View style={styles.overlay}>
                <View style={styles.scanFrame}>
                  <Icon name="qrcode-scan" size={40} color="#fff" style={styles.scanIcon} />
                  <Text style={styles.scanText}>Quét mã QR của vé</Text>
                  <Button mode="outlined" onPress={toggleCameraFacing} style={{ marginTop: 16 }} labelStyle={{color: colors.chartBlue}}>
                    Đổi camera
                  </Button>
                </View>
              </View>
            </CameraView>
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
                  buttonColor={colors.bluePrimary}
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
    color: colors.blueDark,
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