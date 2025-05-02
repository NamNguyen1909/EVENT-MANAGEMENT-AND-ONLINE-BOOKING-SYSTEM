import React, { useState, useContext } from 'react';
import { View, StyleSheet } from 'react-native';
import { TextInput, Button, HelperText, useTheme, Title } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import Apis, { endpoints, authApis } from '../../configs/Apis';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MyDispatchContext } from '../../configs/MyContexts';

const Login = () => {
  const theme = useTheme();
  const navigation = useNavigation();
  const dispatch = useContext(MyDispatchContext);

  const [identifier, setIdentifier] = useState(''); // username or email
  const [password, setPassword] = useState('');
  const [msg, setMsg] = useState(null);
  const [loading, setLoading] = useState(false);

  const validate = () => {
    if (!identifier) {
      setMsg('Vui lòng nhập tên đăng nhập hoặc email!');
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
      const params = new URLSearchParams();
      params.append('username', identifier);
      params.append('password', password);
      params.append('client_id', 'RJFfAM4tZxPYdoSjzdNZST8CTc1DK97SSgPD6kBN');
      params.append('client_secret', 'aEtR93os7a1tfDQU1ReVb8CbNV9Jjk9UM9BCJTWevRsqVy591LjBBK9A8gfjvipsXRmLjcStwQGZIewChg6IBotk2i98ZY2p8HvvAIyMkBdXx6zzly4O0ioYdwnVMd8V');
      params.append('grant_type', 'password');

      const res = await Apis.post(endpoints.login, params.toString(), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });

      await AsyncStorage.setItem('token', res.data.access_token);

      const u = await authApis(res.data.access_token).get(endpoints.currentUser);

      dispatch({
        type: 'login',
        payload: u.data,
      });

      navigation.navigate('home');
    } catch (error) {
      console.error('Login error:', error);
      if (error.response && error.response.data) {
        setMsg('Tên đăng nhập hoặc mật khẩu không đúng!');
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
        label="Tên đăng nhập hoặc Email"
        placeholder="Nhập tên đăng nhập hoặc email"
        value={identifier}
        onChangeText={setIdentifier}
        style={styles.input}
        mode="outlined"
        autoCapitalize="none"
      />
      <TextInput
        label="Mật khẩu"
        placeholder="Nhập mật khẩu"
        value={password}
        onChangeText={setPassword}
        style={styles.input}
        mode="outlined"
        secureTextEntry
      />
      {msg && (
        <HelperText type={msg.includes('thành công') ? 'info' : 'error'} visible={true} style={styles.msg}>
          {msg}
        </HelperText>
      )}
      <Button mode="contained" onPress={login} loading={loading} disabled={loading} style={styles.button}>
        Đăng nhập
      </Button>
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
  },
  input: {
    marginBottom: 15,
  },
  msg: {
    textAlign: 'center',
    marginBottom: 15,
  },
  button: {
    paddingVertical: 6,
    borderRadius: 8,
  },
});

export default Login;
