import React, { useState, useEffect } from 'react';
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
  Chip,
  Menu,
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
    { label: 'Xác nhận mật khẩu', field: 'confirmPassword', secureTextEntry: true, icon: 'lock-check' },
    { label: 'Email', field: 'email', secureTextEntry: false, icon: 'email' },
    { label: 'Số điện thoại', field: 'phone', secureTextEntry: false, icon: 'phone' },
  ];

  const [user, setUser] = useState({});
  const [avatar, setAvatar] = useState(null);
  const [tags, setTags] = useState([]);
  const [availableTags, setAvailableTags] = useState([]);
  const [msg, setMsg] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showImageOptions, setShowImageOptions] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [role, setRole] = useState('attendee');
  const [roleMenuVisible, setRoleMenuVisible] = useState(false);
  const navigation = useNavigation();

  useEffect(() => {
    const fetchTags = async () => {
      try {
        const res = await Apis.get(endpoints['tags'], { params: { page_size: 100 } });
        setAvailableTags(res.data.results || res.data);
      } catch (ex) {
        console.error('Error fetching tags:', ex);
        setMsg('Không thể tải danh sách tags. Vui lòng thử lại!');
      }
    };
    fetchTags();
  }, []);

  useEffect(() => {
    if (msg) {
      console.log('Message updated:', msg);
    }
  }, [msg]);

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

  const toggleTag = (tagId) => {
    if (tags.includes(tagId)) {
      setTags(tags.filter(id => id !== tagId));
    } else {
      setTags([...tags, tagId]);
    }
  };

  const validate = () => {
    for (let i of info) {
      if (!(i.field in user) || user[i.field] === '') {
        console.log(`Field ${i.field} is empty`);
        setMsg(`Vui lòng nhập ${i.label}!`);
        setTimeout(() => {}, 0);
        return false;
      }
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(user.email)) {
      console.log('Invalid email:', user.email);
      setMsg('Email không hợp lệ!');
      return false;
    }

    if (user.password.length < 8) {
      console.log('Password too short:', user.password.length);
      setMsg('Mật khẩu phải có ít nhất 8 ký tự!');
      return false;
    }

    if (user.password !== user.confirmPassword) {
      console.log('Password mismatch:', user.password, user.confirmPassword);
      setMsg('Mật khẩu xác nhận không khớp!');
      return false;
    }

    const phoneRegex = /^\d{10}$/;
    if (!phoneRegex.test(user.phone)) {
      console.log('Invalid phone:', user.phone);
      setMsg('Số điện thoại không hợp lệ! Vui lòng nhập 10 chữ số.');
      return false;
    }

    if (tags.length === 0) {
      console.log('Tags are missing');
      setMsg('Vui lòng chọn ít nhất một tag!');
      return false;
    }

    if (!avatar) {
      console.log('Avatar is missing');
      setMsg('Vui lòng chọn ảnh avatar!');
      return false;
    }

    if (!role) {
      console.log('Role is missing');
      setMsg('Vui lòng chọn vai trò!');
      return false;
    }

    console.log('Validation passed');
    return true;
  };

  const register = async () => {
    console.log('Register button pressed');
    if (validate()) {
      console.log('Validation passed, proceeding to register...');
      setLoading(true);
      try {
        const formData = new FormData();
        formData.append('username', user.username);
        formData.append('password', user.password);
        formData.append('email', user.email);
        formData.append('phone', user.phone);
        formData.append('role', role);

        const uriParts = avatar.split('.');
        const fileType = uriParts[uriParts.length - 1];
        formData.append('avatar', {
          uri: avatar,
          name: `avatar.${fileType}`,
          type: `image/${fileType}`,
        });

        tags.forEach(tagId => {
          formData.append('tags', tagId);
        });

        console.log('Calling API with formData:', formData);
        console.log('API endpoint:', endpoints['register']);
        const res = await Apis.post(endpoints['register'], formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });

        console.log('API response:', res.data);
        setMsg('Đăng ký thành công! Vui lòng đăng nhập để tiếp tục.');
        // Clear form inputs after successful registration
        setUser({});
        setTags([]);
        setAvatar(null);
        setMsg(null);
        setTimeout(() => navigation.navigate('login'), 2000);
      } catch (ex) {
        console.error('Register error:', ex);
        console.error('Error details:', ex.response ? ex.response.data : ex.message);
        if (ex.response?.data) {
          const errors = ex.response.data;
          if (errors.username) {
            setMsg(`Tên đăng nhập: ${errors.username[0]}`);
          } else if (errors.email) {
            setMsg(`Email: ${errors.email[0]}`);
          } else if (errors.non_field_errors) {
            setMsg(errors.non_field_errors[0]);
          } else {
            setMsg('Đăng ký thất bại. Vui lòng kiểm tra lại thông tin!');
          }
        } else {
          setMsg('Lỗi kết nối đến server. Vui lòng thử lại!');
        }
      } finally {
        setLoading(false);
      }
    } else {
      console.log('Validation failed');
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 20, backgroundColor: theme.colors.background }}>
        <Card style={{ padding: 20, borderRadius: 16, elevation: 4 }}>
          <Card.Content>
            <Title style={{ textAlign: 'center', fontSize: 24, fontWeight: 'bold', marginBottom: 20 }}>Đăng ký tài khoản</Title>

            <HelperText
              type={msg?.includes('thành công') ? 'info' : 'error'}
              visible={!!msg}
              style={{ textAlign: 'center', color: msg?.includes('thành công') ? theme.colors.success : theme.colors.error }}
            >
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
                value={user[i.field] || ''}
                onChangeText={(t) => setState(t, i.field)}
                secureTextEntry={
                  i.field === 'password' ? !showPassword :
                  i.field === 'confirmPassword' ? !showConfirmPassword :
                  false
                }
                style={{ marginBottom: 15, backgroundColor: 'white' }}
                mode="outlined"
                right={i.secureTextEntry ? (
                  <TextInput.Icon
                    icon={
                      i.field === 'password'
                        ? (showPassword ? 'eye' : 'eye-off')
                        : (showConfirmPassword ? 'eye' : 'eye-off')
                    }
                    onPress={() => {
                      if (i.field === 'password') setShowPassword(!showPassword);
                      if (i.field === 'confirmPassword') setShowConfirmPassword(!showConfirmPassword);
                    }}
                  />
                ) : (
                  <TextInput.Icon icon={i.icon} />
                )}
              />
            ))}


<Text style={{ marginBottom: 10, fontWeight: 'bold' }}>Chọn vai trò:</Text>
            <Menu
              visible={roleMenuVisible}
              onDismiss={() => setRoleMenuVisible(false)}
              anchor={
                <Button mode="outlined" onPress={() => setRoleMenuVisible(true)} style={{ marginBottom: 15 }}>
                  {role.charAt(0).toUpperCase() + role.slice(1)}
                </Button>
              }
            >
              <Menu.Item onPress={() => { setRole('attendee'); setRoleMenuVisible(false); }} title="Attendee" />
              <Menu.Item onPress={() => { setRole('organizer'); setRoleMenuVisible(false); }} title="Organizer" />
              <Menu.Item onPress={() => { setRole('admin'); setRoleMenuVisible(false); }} title="Admin" />
            </Menu>

            <Text style={{ marginBottom: 10, fontWeight: 'bold' }}>Chọn tags (bắt buộc):</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 15 }}>
              {availableTags.map(tag => (
                <Chip
                  key={tag.id}
                  onPress={() => toggleTag(tag.id)}
                  selected={tags.includes(tag.id)}
                  style={{ margin: 4 }}
                >
                  {tag.name}
                </Chip>
              ))}
            </View>

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
