import React, { useState, useEffect, useContext } from 'react';
import { SafeAreaView, View, StyleSheet, Alert, Text, Platform } from 'react-native';
import { Button, Title, useTheme, ActivityIndicator } from 'react-native-paper';
import { WebView } from 'react-native-webview';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authApis, endpoints } from '../../configs/Apis';
import { MyUserContext } from '../../configs/MyContexts';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const Scan = () => {
  const theme = useTheme();
  const user = useContext(MyUserContext);
  const [scanned, setScanned] = useState(false);
  const [loading, setLoading] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [webViewLoaded, setWebViewLoaded] = useState(false);
  const [webViewError, setWebViewError] = useState(null);

  const qrScannerHtml = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>QR Scanner</title>
      <script src="https://unpkg.com/html5-qrcode@2.3.8/minified/html5-qrcode.min.js"></script>
      <style>
        body, html { margin: 0; padding: 0; height: 100%; width: 100%; background-color: black; overflow: hidden; }
        #reader { width: 100%; height: 100vh; }
        #error { color: red; font-size: 16px; text-align: center; position: absolute; top: 20px; width: 100%; z-index: 10; }
        .qrbox { border: 2px solid #fff !important; border-radius: 10px !important; }
        video { object-fit: cover; }
      </style>
    </head>
    <body>
      <div id="error"></div>
      <div id="reader"></div>
      <script>
        const errorDiv = document.getElementById('error');
        function onScanSuccess(decodedText, decodedResult) {
          console.log('QR code scanned:', decodedText);
          if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
            window.ReactNativeWebView.postMessage(decodedText);
          } else {
            errorDiv.innerText = 'Không thể gửi dữ liệu về ứng dụng.';
          }
          html5QrcodeScanner.clear().catch(err => {
            console.error('Error clearing scanner:', err);
          });
        }
        function onScanFailure(error) {
          console.warn('Scan failed:', error);
          if (error.includes('Permission denied')) {
            errorDiv.innerText = 'Vui lòng cấp quyền camera trong Cài đặt.';
          } else if (error.includes('NotFoundError')) {
            errorDiv.innerText = 'Không tìm thấy camera. Vui lòng kiểm tra thiết bị.';
          }
        }
        navigator.mediaDevices.getUserMedia({ video: true })
          .then(() => {
            const html5QrcodeScanner = new Html5QrcodeScanner(
              "reader",
              { fps: 10, qrbox: { width: 250, height: 250 }, rememberLastUsedCamera: true },
              false
            );
            html5QrcodeScanner.render(onScanSuccess, onScanFailure);
            console.log('Html5QrcodeScanner initialized');
          })
          .catch(err => {
            console.error('Camera access denied:', err);
            errorDiv.innerText = 'Không thể truy cập camera. Vui lòng cấp quyền.';
          });
      </script>
    </body>
    </html>
  `;

  const handleMessage = async (event) => {
    if (scanned || !webViewLoaded) return;
    setScanned(true);
    setLoading(true);
    setScanResult(null);

    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        Alert.alert('Lỗi', 'Không tìm thấy token xác thực. Vui lòng đăng nhập lại.');
        return;
      }

      const uuid = event.nativeEvent.data;
      console.log('Scanned QR code:', uuid);
      const response = await authApis(token).post(endpoints.checkInTicket, { uuid });

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
    setWebViewError(null);
    setWebViewLoaded(false); // Reset để tải lại WebView
  };

  const onWebViewLoad = () => {
    console.log('WebView loaded successfully');
    setWebViewLoaded(true);
    setWebViewError(null);
  };

  const onWebViewError = (syntheticEvent) => {
    const { nativeEvent } = syntheticEvent;
    console.warn('WebView error:', nativeEvent);
    setWebViewError('Không thể tải scanner. Vui lòng thử lại.');
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

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Title style={styles.title}>Quét mã QR</Title>
      </View>
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        {!scanned ? (
          <View style={styles.scannerContainer}>
            {webViewError ? (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{webViewError}</Text>
                <Button
                  mode="contained"
                  onPress={handleScanAgain}
                  style={styles.button}
                >
                  Thử lại
                </Button>
              </View>
            ) : (
              <>
                <WebView
                  source={{ html: qrScannerHtml }}
                  style={styles.webview}
                  onMessage={handleMessage}
                  onLoad={onWebViewLoad}
                  onError={onWebViewError}
                  javaScriptEnabled={true}
                  domStorageEnabled={true}
                  startInLoadingState={true}
                  allowsInlineMediaPlayback={true}
                  mediaPlaybackRequiresUserAction={false}
                  renderLoading={() => (
                    <ActivityIndicator
                      animating={true}
                      size="large"
                      color={theme.colors.primary}
                      style={styles.loading}
                    />
                  )}
                />
                {webViewLoaded && (
                  <View style={styles.overlay}>
                    <View style={styles.scanFrame}>
                      <Icon name="qrcode-scan" size={40} color="#fff" style={styles.scanIcon} />
                      <Text style={styles.scanText}>Quét mã QR của vé</Text>
                    </View>
                  </View>
                )}
              </>
            )}
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
  webview: {
    flex: 1,
    backgroundColor: 'black',
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    textAlign: 'center',
    fontSize: 18,
    color: 'red',
    marginBottom: 20,
  },
  loading: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -25 }, { translateY: -25 }],
  },
});

export default Scan;