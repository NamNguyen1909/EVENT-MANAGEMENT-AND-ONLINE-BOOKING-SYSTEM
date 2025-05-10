import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, Alert, Dimensions, ActivityIndicator, TouchableOpacity } from 'react-native';
import { Camera } from 'expo-camera';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authApis, endpoints } from '../../configs/Apis';
import * as IntentLauncher from 'expo-intent-launcher';
import { useFocusEffect } from '@react-navigation/native';

const { width } = Dimensions.get('window');
const qrSize = width * 0.7;

const Scan = ({ navigation }) => {
  const [scanned, setScanned] = useState(false);
  const [hasPermission, setHasPermission] = useState(null);
  const [token, setToken] = useState(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraType, setCameraType] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [lastScanTime, setLastScanTime] = useState(0);
  const [flashMode, setFlashMode] = useState(Camera?.Constants?.FlashMode?.off);

  // Kiểm tra và yêu cầu quyền camera
  const requestCameraPermission = useCallback(async () => {
    try {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
      
      if (status === 'granted' && Camera?.Constants) {
        setCameraType(Camera.Constants.Type.back);
        setFlashMode(Camera.Constants.FlashMode.off);
      }
      
      if (status !== 'granted') {
        Alert.alert(
          'Yêu cầu quyền truy cập',
          'Ứng dụng cần quyền truy cập camera để quét mã QR',
          [
            {
              text: 'Hủy',
              style: 'cancel'
            },
            {
              text: 'Mở cài đặt',
              onPress: () => IntentLauncher.startActivityAsync(
                IntentLauncher.ActivityAction.APPLICATION_DETAILS_SETTINGS
              )
            }
          ]
        );
      }
    } catch (error) {
      console.error('Lỗi khi yêu cầu quyền camera:', error);
      setHasPermission(false);
    }
  }, []);

  // Lấy token từ AsyncStorage
  const getToken = useCallback(async () => {
    try {
      const storedToken = await AsyncStorage.getItem('token');
      if (!storedToken) {
        navigation.navigate('Login');
        return;
      }
      setToken(storedToken);
    } catch (error) {
      console.error('Lỗi khi lấy token:', error);
      navigation.navigate('Login');
    }
  }, [navigation]);

  // Reset trạng thái scan khi quay lại màn hình
  useFocusEffect(
    useCallback(() => {
      setScanned(false);
      setIsLoading(false);
    }, [])
  );

  useEffect(() => {
    getToken();
    requestCameraPermission();
  }, [getToken, requestCameraPermission]);

  const handleBarCodeScanned = async ({ data }) => {
    const now = Date.now();
    if (scanned || !token || !cameraReady || isLoading || (now - lastScanTime < 2000)) {
      return;
    }

    setLastScanTime(now);
    setScanned(true);
    setIsLoading(true);

    try {
      const response = await authApis.post(endpoints.checkInTicket, {
        uuid: data,
      }, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      // Hiệu ứng flash khi scan thành công
      if (Camera?.Constants) {
        setFlashMode(Camera.Constants.FlashMode.torch);
        setTimeout(() => setFlashMode(Camera.Constants.FlashMode.off), 300);
      }

      Alert.alert('Thành công', 'Check-in thành công!', [
        {
          text: 'OK',
          onPress: () => {
            setScanned(false);
            setIsLoading(false);
          },
        },
      ]);
    } catch (error) {
      let errorMessage = 'Không thể xử lý check-in';
      
      if (error.response) {
        if (error.response.status === 401) {
          // Token hết hạn
          await AsyncStorage.removeItem('token');
          navigation.navigate('Login');
          return;
        }
        errorMessage = error.response.data?.detail || 
                      error.response.data?.error || 
                      'Check-in thất bại';
      } else if (error.request) {
        errorMessage = 'Lỗi kết nối - Vui lòng kiểm tra mạng';
      }

      Alert.alert('Lỗi', errorMessage, [
        {
          text: 'OK',
          onPress: () => {
            setScanned(false);
            setIsLoading(false);
          },
        },
      ]);
    }
  };

  const handleCameraReady = () => {
    setCameraReady(true);
  };

  const toggleCameraType = () => {
    if (!Camera?.Constants) return;
    
    setCameraType(
      cameraType === Camera.Constants.Type.back
        ? Camera.Constants.Type.front
        : Camera.Constants.Type.back
    );
  };

  const toggleFlash = () => {
    if (!Camera?.Constants) return;
    
    setFlashMode(
      flashMode === Camera.Constants.FlashMode.off
        ? Camera.Constants.FlashMode.torch
        : Camera.Constants.FlashMode.off
    );
  };

  if (!Camera || !Camera.Constants) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Đang khởi tạo camera...</Text>
      </View>
    );
  }

  if (hasPermission === null || cameraType === null) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#ffffff" />
        <Text style={styles.loadingText}>Đang yêu cầu quyền truy cập camera...</Text>
      </View>
    );
  }

  if (hasPermission === false) {
    return (
      <View style={styles.permissionContainer}>
        <Text style={styles.permissionText}>
          Ứng dụng cần quyền truy cập camera để quét mã QR
        </Text>
        <TouchableOpacity 
          style={styles.permissionButton}
          onPress={requestCameraPermission}
        >
          <Text style={styles.permissionButtonText}>Thử lại</Text>
        </TouchableOpacity>
        <Text style={styles.permissionHelp}>
          Hoặc bật quyền camera trong cài đặt thiết bị
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Camera
        style={styles.camera}
        type={cameraType}
        flashMode={flashMode}
        onBarCodeScanned={scanned ? undefined : handleBarCodeScanned}
        onCameraReady={handleCameraReady}
        barCodeScannerSettings={{
          barCodeTypes: [Camera.Constants.BarCodeType.qr],
        }}
        ratio="16:9"
      >
        <View style={styles.overlay}>
          <View style={styles.unfocusedArea} />
          <View style={styles.middleRow}>
            <View style={styles.unfocusedArea} />
            <View style={styles.focusedArea}>
              <View style={styles.cornerTopLeft} />
              <View style={styles.cornerTopRight} />
              <View style={styles.cornerBottomLeft} />
              <View style={styles.cornerBottomRight} />
            </View>
            <View style={styles.unfocusedArea} />
          </View>
          <View style={styles.unfocusedArea} />
        </View>
      </Camera>

      {isLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#ffffff" />
          <Text style={styles.loadingText}>Đang xử lý...</Text>
        </View>
      )}

      <View style={styles.bottomContainer}>
        <Text style={styles.instruction}>Đặt mã QR vào khung để quét</Text>
        {scanned && (
          <Text style={styles.scanAgainText}>Chờ xử lý...</Text>
        )}
      </View>

      <View style={styles.controlsContainer}>
        <TouchableOpacity
          style={styles.controlButton}
          onPress={toggleFlash}
        >
          <Text style={styles.controlButtonText}>
            {flashMode === Camera.Constants.FlashMode.torch ? 'Tắt đèn' : 'Bật đèn'}
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.controlButton}
          onPress={toggleCameraType}
        >
          <Text style={styles.controlButtonText}>Đổi camera</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};


const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  loadingText: {
    color: '#fff',
    fontSize: 18,
    marginTop: 20,
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#000',
  },
  permissionText: {
    color: '#fff',
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 20,
  },
  permissionHelp: {
    color: '#fff',
    fontSize: 14,
    textAlign: 'center',
    opacity: 0.8,
    marginTop: 20,
  },
  permissionButton: {
    backgroundColor: '#3498db',
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 25,
  },
  permissionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  camera: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  unfocusedArea: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  middleRow: {
    flexDirection: 'row',
    flex: 0.5,
  },
  focusedArea: {
    flex: 1,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  cornerTopLeft: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 40,
    height: 40,
    borderLeftWidth: 4,
    borderTopWidth: 4,
    borderColor: '#fff',
  },
  cornerTopRight: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 40,
    height: 40,
    borderRightWidth: 4,
    borderTopWidth: 4,
    borderColor: '#fff',
  },
  cornerBottomLeft: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    width: 40,
    height: 40,
    borderLeftWidth: 4,
    borderBottomWidth: 4,
    borderColor: '#fff',
  },
  cornerBottomRight: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 40,
    height: 40,
    borderRightWidth: 4,
    borderBottomWidth: 4,
    borderColor: '#fff',
  },
  bottomContainer: {
    position: 'absolute',
    bottom: 100,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  instruction: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 10,
  },
  scanAgainText: {
    color: '#fff',
    fontSize: 14,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
    zIndex: 100,
  },
  controlsContainer: {
    position: 'absolute',
    bottom: 30,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 20,
  },
  controlButton: {
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: '#fff',
  },
  controlButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
});

export default Scan;