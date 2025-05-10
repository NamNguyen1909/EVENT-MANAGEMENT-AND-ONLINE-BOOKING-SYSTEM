import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { Camera } from 'expo-camera';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authApis,endpoints } from '../../configs/Apis';


const Scan = ({ navigation }) => {
const [scanned, setScanned] = useState(false);
const [hasPermission, setHasPermission] = useState(null);
const [token, setToken] = useState(null);

  useEffect(() => {
    // Get token from AsyncStorage
    const getToken = async () => {
      try {
        const storedToken = await AsyncStorage.getItem('auth_token');
        setToken(storedToken);
      } catch (error) {
        console.error('Error retrieving token:', error);
      }
    };

    getToken();

    // Request camera permissions
    (async () => {
      const { status } = await Camera.requestPermissionsAsync();
      setHasPermission(status === 'granted');
    })();
  }, []);

  const handleBarCodeScanned = async ({ data }) => {
    if (!scanned && token) {
      setScanned(true);

      try {
        const response = await authApis.post(endpoints.checkInTicket, { 
          uuid: data 
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
          errorMessage = error.response.data?.detail || 
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

  if (hasPermission === null) {
    return <View />;
  }

  if (hasPermission === false) {
    return (
      <View style={styles.container}>
        <Text style={styles.permissionText}>Camera permission not granted</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Camera
        style={styles.camera}
        type={Camera.Constants.Type.back}
        onBarCodeScanned={scanned ? undefined : handleBarCodeScanned}
        barCodeScannerSettings={{
          barCodeTypes: [Camera.Constants.BarCodeType.qr],
        }}
      >
        <View style={styles.scanBox} />
      </Camera>
      <Text style={styles.instruction}>Scan QR code of ticket to check-in</Text>
    </View>
  );
};


const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  camera: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanBox: {
    width: 250,
    height: 250,
    borderWidth: 2,
    borderColor: 'white',
    borderRadius: 10,
    backgroundColor: 'transparent',
  },
  instruction: {
    textAlign: 'center',
    padding: 20,
    fontSize: 16,
    backgroundColor: '#000',
    color: '#fff',
  },
  permissionText: {
    flex: 1,
    textAlign: 'center',
    textAlignVertical: 'center',
    color: '#fff',
    fontSize: 18,
  },
});

export default Scan;