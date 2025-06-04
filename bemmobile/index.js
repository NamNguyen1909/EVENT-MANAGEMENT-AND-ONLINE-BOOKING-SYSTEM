// import { registerRootComponent } from 'expo';

// import App from './App';

// // registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// // It also ensures that whether you load the app in Expo Go or in a native build,
// // the environment is set up appropriately
// registerRootComponent(App); 
// Expo lo setup môi trường, debug, v.v.
// Dùng khi chạy trong Expo Go hoặc chưa eject.
// registerRootComponent là wrapper cho AppRegistry.registerComponent(...)

import messaging from '@react-native-firebase/messaging';

// Cài đặt handler cho thông báo nhận được khi app đang ở background hoặc bị kill
messaging().setBackgroundMessageHandler(async remoteMessage => {
  // Xử lý message ở background (có thể để trống nếu chỉ cần hiện notification)
  console.log('Message handled in the background!', remoteMessage);
});

import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';

AppRegistry.registerComponent(appName, () => App);


// không cần AppRegistry.registerHeadlessTask?
// Vì nếu dùng messaging().setBackgroundMessageHandler(...) ngay trong index.js (vị trí sớm nhất),
//  thì Firebase tự động liên kết nó với ReactNativeFirebaseMessagingHeadlessTask