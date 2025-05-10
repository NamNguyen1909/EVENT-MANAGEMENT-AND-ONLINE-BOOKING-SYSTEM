import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Alert, Dimensions } from 'react-native';
import { Camera } from 'expo-camera';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authApis, endpoints } from '../../configs/Apis';

const { width } = Dimensions.get('window');
const qrSize = width * 0.7;

const Scan = ({ navigation }) => {
  const [scanned, setScanned] = useState(false);
  const [hasPermission, setHasPermission] = useState(null);
  const [token, setToken] = useState(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraType, setCameraType] = useState(null);

  useEffect(() => {
    const getToken = async () => {
      try {
        const storedToken = await AsyncStorage.getItem('auth_token');
        setToken(storedToken);
      } catch (error) {
        console.error('Error retrieving token:', error);
      }
    };

    getToken();

    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');

      if (Camera?.Constants?.Type?.back) {
        setCameraType(Camera.Constants.Type.back);
      }
    })();
  }, []);

  const handleBarCodeScanned = async ({ data }) => {
    if (!scanned && token && cameraReady) {
      setScanned(true);

      try {
        const response = await authApis.post(endpoints.checkInTicket, {
          uuid: data,
        });

        console.log('Check-in response:', response.data);

        Alert.alert('Success', 'Check-in successful!', [
          {
            text: 'OK',
            onPress: () => setScanned(false),
          },
        ]);
      } catch (error) {
        let errorMessage = 'Failed to process check-in';

        if (error.response) {
          errorMessage =
            error.response.data?.detail ||
            error.response.data?.error ||
            'Check-in failed';
        }

        Alert.alert('Error', errorMessage, [
          {
            text: 'OK',
            onPress: () => setScanned(false),
          },
        ]);
      }
    } else if (!token) {
      Alert.alert('Error', 'Authentication required. Please login again.');
    }
  };

  const handleCameraReady = () => {
    setCameraReady(true);
  };

  const toggleCameraType = () => {
    if (!Camera?.Constants?.Type) return;

    setCameraType((prevType) =>
      prevType === Camera.Constants.Type.back
        ? Camera.Constants.Type.front
        : Camera.Constants.Type.back
    );
  };

  if (!Camera?.Constants?.Type) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading camera constants...</Text>
      </View>
    );
  }

  if (hasPermission === null || cameraType === null) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Đang yêu cầu quyền truy cập camera...</Text>
      </View>
    );
  }

  if (hasPermission === false) {
    return (
      <View style={styles.permissionContainer}>
        <Text style={styles.permissionText}>
          Camera permission is required to scan QR codes
        </Text>
        <Text style={styles.permissionHelp}>
          Please enable camera access in your device settings
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Camera
        style={styles.camera}
        type={cameraType}
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

      <View style={styles.bottomContainer}>
        <Text style={styles.instruction}>Align QR code within the frame to scan</Text>
        {scanned && (
          <Text style={styles.scanAgainText}>Scanning another code? Tap anywhere</Text>
        )}
        <Text
          style={styles.switchCameraText}
          onPress={toggleCameraType}
          accessibilityRole="button"
        >
          Switch Camera
        </Text>
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
    marginBottom: 10,
  },
  permissionHelp: {
    color: '#fff',
    fontSize: 14,
    textAlign: 'center',
    opacity: 0.8,
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
    bottom: 40,
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
  switchCameraText: {
    color: '#00f',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 15,
  },
});

export default Scan;
