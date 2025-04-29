// import React from 'react';
// import { View, Text } from 'react-native';

// const Register = () => {
//   return (
//     <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
//       <Text>Register Screen (Placeholder)</Text>
//     </View>
//   );
// };

// export default Register;

import React, { useState } from 'react';
import {
  ScrollView,
  View,
  KeyboardAvoidingView,
  Platform,
  Image,
  TouchableOpacity,
  Text,
} from 'react-native';
import {
  Button,
  HelperText,
  TextInput,
  Card,
  Title,
  IconButton,
  useTheme,
} from 'react-native-paper';
import MyStyles from '../../styles/MyStyles';
import { useNavigation } from '@react-navigation/native';
import Apis, { endpoints } from '../../configs/Apis';
import * as ImagePicker from 'expo-image-picker';

const Register = () => {
  const theme = useTheme();
  const info = [
    { label: 'Tên đăng nhập', field: 'username', secureTextEntry: false, icon: 'account' },
    { label: 'Mật khẩu', field: 'password', secureTextEntry: true, icon: 'lock' },
    { label: 'Email', field: 'email', secureTextEntry: false, icon: 'email' },
    { label: 'Số điện thoại', field: 'phone', secureTextEntry: false, icon: 'phone' },
  ];

  const [user, setUser] = useState({});
  const [avatar, setAvatar] = useState(null);
  const [msg, setMsg] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showImageOptions, setShowImageOptions] = useState(false);
  const navigation = useNavigation();

  const pickImage = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        setMsg('Cần cấp quyền truy cập thư viện ảnh!');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 1,
      });
      if (!result.canceled) {
        const uri = result.assets[0].uri;
        const fileType = uri.split('.').pop().toLowerCase();
        if (!['png', 'jpg', 'jpeg'].includes(fileType)) {
          setMsg('Chỉ chấp nhận file PNG, JPG, JPEG!');
          return;
        }
        const response = await fetch(uri);
        const blob = await response.blob();
        if (blob.size > 5 * 1024 * 1024) {
          setMsg('Ảnh không được lớn hơn 5MB!');
          return;
        }
        setAvatar(uri);
        setShowImageOptions(false);
      }
    } catch (error) {
      console.error('Error picking image from library:', error);
      setMsg('Có lỗi khi chọn ảnh. Vui lòng thử lại!');
    }
  };

  const pickImageFromCamera = async () => {
    try {
      const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
      if (!permissionResult.granted) {
        setMsg('Cần cấp quyền truy cập camera!');
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 1,
      });
      if (!result.canceled) {
        const uri = result.assets[0].uri;
        const fileType = uri.split('.').pop().toLowerCase();
        if (!['png', 'jpg', 'jpeg'].includes(fileType)) {
          setMsg('Chỉ chấp nhận file PNG, JPG, JPEG!');
          return;
        }
        const response = await fetch(uri);
        const blob = await response.blob();
        if (blob.size > 5 * 1024 * 1024) {
          setMsg('Ảnh không được lớn hơn 5MB!');
          return;
        }
        setAvatar(uri);
        setShowImageOptions(false);
      }
    } catch (error) {
      console.error('Error picking image from camera:', error);
      setMsg('Có lỗi khi chụp ảnh. Vui lòng thử lại!');
    }
  };

  const removeImage = () => setAvatar(null);
  const setState = (value, field) => setUser({ ...user, [field]: value });

  const validate = () => {
    for (let i of info) {
      if (!(i.field in user) || user[i.field] === '') {
        setMsg(`Vui lòng nhập ${i.label}!`);
        return false;
      }
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(user.email)) {
      setMsg('Email không hợp lệ!');
      return false;
    }
    if (user.password.length < 8) {
      setMsg('Mật khẩu phải có ít nhất 8 ký tự!');
      return false;
    }
    const phoneRegex = /^\d{10}$/;
    if (!phoneRegex.test(user.phone)) {
      setMsg('Số điện thoại không hợp lệ! Vui lòng nhập 10 chữ số.');
      return false;
    }
    return true;
  };

  const register = async () => {
    if (validate()) {
      setLoading(true);
      try {
        const formData = new FormData();
        formData.append('username', user.username);
        formData.append('password', user.password);
        formData.append('email', user.email);
        formData.append('phone', user.phone);
        formData.append('role', 'attendee');
        formData.append('is_active', 'true');
        if (avatar) {
          const uriParts = avatar.split('.');
          const fileType = uriParts[uriParts.length - 1];
          formData.append('avatar', {
            uri: avatar,
            name: `avatar.${fileType}`,
            type: `image/${fileType}`,
          });
        }
        const res = await Apis.post(endpoints['register'], formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        setMsg('Đăng ký thành công! Vui lòng đăng nhập để tiếp tục.');
        setTimeout(() => navigation.navigate('login'), 2000);
      } catch (ex) {
        console.error('Register error:', ex);
        setMsg('Đăng ký thất bại. Vui lòng kiểm tra lại thông tin!');
        if (ex.response?.data?.error) setMsg(ex.response.data.error);
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 20, backgroundColor: theme.colors.background }}>
        <Card style={{ padding: 20, borderRadius: 16, elevation: 4 }}>
          <Card.Content>
            <Title style={{ textAlign: 'center', fontSize: 24, fontWeight: 'bold', marginBottom: 20 }}>Đăng ký tài khoản</Title>

            <HelperText type={msg?.includes('thành công') ? 'info' : 'error'} visible={msg !== null} style={{ textAlign: 'center' }}>
              {msg}
            </HelperText>

            <View style={{ alignItems: 'center', marginBottom: 20 }}>
              <TouchableOpacity onPress={() => setShowImageOptions(!showImageOptions)}>
                {avatar ? (
                  <Image source={{ uri: avatar }} style={{ width: 100, height: 100, borderRadius: 50, borderWidth: 2, borderColor: theme.colors.primary }} />
                ) : (
                  <View style={{ width: 100, height: 100, borderRadius: 50, backgroundColor: '#e0e0e0', justifyContent: 'center', alignItems: 'center' }}>
                    <Text>Chọn ảnh</Text>
                  </View>
                )}
              </TouchableOpacity>
              {avatar && (
                <IconButton icon="close" size={20} onPress={removeImage} style={{ position: 'absolute', top: -10, right: -10 }} />
              )}
            </View>

            {showImageOptions && (
              <View style={{ flexDirection: 'row', justifyContent: 'center', marginBottom: 20 }}>
                <Button mode="outlined" onPress={pickImage} style={{ marginRight: 10 }}>Thư viện</Button>
                <Button mode="outlined" onPress={pickImageFromCamera}>Chụp ảnh</Button>
              </View>
            )}

            {info.map((i) => (
              <TextInput
                key={i.field}
                label={i.label}
                value={user[i.field]}
                onChangeText={(t) => setState(t, i.field)}
                secureTextEntry={i.secureTextEntry}
                style={{ marginBottom: 15, backgroundColor: 'white' }}
                mode="outlined"
                right={<TextInput.Icon icon={i.icon} />}
              />
            ))}

            <Button onPress={register} disabled={loading} loading={loading} mode="contained" style={{ marginTop: 10, paddingVertical: 6, borderRadius: 8 }}>
              Đăng ký
            </Button>
          </Card.Content>
        </Card>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

export default Register;
