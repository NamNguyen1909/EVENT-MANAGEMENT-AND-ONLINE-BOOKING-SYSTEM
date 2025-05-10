import React, { useState, useContext } from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { TextInput, Button, HelperText, useTheme, Title } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import Apis, { endpoints, authApis } from '../../configs/Apis';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MyDispatchContext } from '../../configs/MyContexts';
import MyStyles ,{colors} from '../../styles/MyStyles';

const Login = () => {
  const theme = useTheme();
  const navigation = useNavigation();
  const dispatch = useContext(MyDispatchContext);

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [msg, setMsg] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const validate = () => {
    if (!username) {
      setMsg('Vui lòng nhập tên đăng nhập!');
      return false;
    }
    if (!password) {
      setMsg('Vui lòng nhập mật khẩu!');
      return false;
    }
    setMsg(null);
    return true;
  };

  const login = async () => {
    if (!validate()) return;

    setLoading(true);
    try {
      const data = {
        username: username,
        password: password,
        client_id: 'QS9VYMVl6K9h5OdaKO7mmd4oZLWzxXgrxFznF6M0',
        client_secret: 'Nk01iYn0fxva0QlGjY6qDq97rVllm6s5QKGX9xUsDx2P2d8osrD7I5tr6GFvn472ZSN6Ob9EBE3Djk1UHJURKO89BhknxL61Ek3gNEu63fnJ7BgaNrE48uIskea397t1',
        grant_type: 'password',
      };

      console.log('Sending login request with JSON:', data);

      const res = await Apis.post(endpoints.login, data, {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      console.log('Login successful, received token:', res.data);

      await AsyncStorage.setItem('token', res.data.access_token);
      const storedToken = await AsyncStorage.getItem('token');
      console.log('Token stored in AsyncStorage:', storedToken);
      await AsyncStorage.setItem('refresh_token', res.data.refresh_token);

      const u = await authApis(res.data.access_token).get(endpoints.currentUser);
      console.log('Current user fetched:', u.data);

      dispatch({
        type: 'login',
        payload: u.data,
      });

      setMsg('Đăng nhập thành công!');

      // Điều hướng dựa trên vai trò người dùng
      setTimeout(() => {
        if (u.data.role === 'admin') {
          // Điều hướng đến tab dashboard
          navigation.reset({
            index: 0,
            routes: [{ name: 'dashboard' }],
          });
        } else {
          // Điều hướng đến tab events cho người dùng thường
          navigation.reset({
            index: 0,
            routes: [{ name: 'events', params: { screen: 'HomeScreen' } }],
          });
        }
      }, 1000);
    } catch (error) {
      if (error.response && error.response.data) {
        const errorData = error.response.data;
        console.log('Login error details:', errorData);
        if (errorData.error === 'invalid_grant') {
          setMsg('Tên đăng nhập hoặc mật khẩu không đúng!');
        } else if (errorData.error === 'unsupported_grant_type') {
          setMsg('Loại grant không được hỗ trợ. Vui lòng liên hệ quản trị viên!');
        } else if (errorData.error_description) {
          setMsg(errorData.error_description);
        } else {
          setMsg('Đăng nhập thất bại. Vui lòng thử lại!');
        }
      } else {
        setMsg('Lỗi kết nối đến server. Vui lòng thử lại!');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Title style={styles.title}>Đăng nhập</Title>
      <TextInput
        label="Tên đăng nhập"
        placeholder="Nhập tên đăng nhập"
        value={username}
        onChangeText={setUsername}
        style={styles.input}
        mode="outlined"
        autoCapitalize="none"
        outlineColor={colors.blueLight}
        activeOutlineColor={colors.bluePrimary}
      />
      <TextInput
        label="Mật khẩu"
        placeholder="Nhập mật khẩu"
        value={password}
        onChangeText={setPassword}
        style={{ marginBottom: 15, backgroundColor: 'white' }}
        mode="outlined"
        outlineColor={colors.blueLight}
        activeOutlineColor={colors.bluePrimary}
        secureTextEntry={!showPassword}
        right={
          <TextInput.Icon
            icon={showPassword ? 'eye' : 'eye-off'}
            color="black"
            onPress={() => setShowPassword(!showPassword)}
          />
        }
      />
      {msg && (
        <HelperText
          type={msg.includes('thành công') ? 'info' : 'error'}
          visible={true}
          style={[styles.msg, { color: msg.includes('thành công') ? theme.colors.success : theme.colors.error }]}
        >
          {msg}
        </HelperText>
      )}
      <Button mode="contained" onPress={login} loading={loading} disabled={loading} style={styles.button} buttonColor={colors.bluePrimary}>
        Đăng nhập
      </Button>
      <View style={MyStyles.askContainer}>
        <Text style={MyStyles.askText}>New here?{' '}</Text>
        <Text style={MyStyles.navigateLink} onPress={() => navigation.navigate('register')}>
          Create an account
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    textAlign: 'center',
    marginBottom: 20,
    fontWeight: 'bold',
    fontSize: 24,
  },
  input: {
    marginBottom: 15,
  },
  msg: {
    textAlign: 'center',
    marginBottom: 15,
    fontSize: 16,
  },
  button: {
    paddingVertical: 6,
    borderRadius: 8,
  },
});

export default Login;
