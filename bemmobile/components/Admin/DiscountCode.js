import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Alert, ScrollView, SafeAreaView } from 'react-native';
import { TextInput, Button, Title, Menu, Text, useTheme } from 'react-native-paper';
import Apis, { endpoints } from '../../configs/Apis';
import { colors } from '../../styles/MyStyles';

const userGroups = [
  { label: 'Khách hàng mới', value: 'new' },
  { label: 'Khách phổ thông', value: 'regular' },
  { label: 'Khách VIP', value: 'vip' },
  { label: 'Khách siêu VIP', value: 'super_vip' },
  { label: 'Không xác định', value: 'unknown' },
];

const DiscountCode = () => {
  const theme = useTheme();

  const [discountCode, setDiscountCode] = useState({
    code: '',
    discount_percentage: '',
    valid_from: '',
    valid_to: '',
    user_group: '',
    max_uses: '',
  });

  const [userGroupMenuVisible, setUserGroupMenuVisible] = useState(false);
  const [loading, setLoading] = useState(false);

  const onChange = (field, value) => {
    setDiscountCode((prev) => ({ ...prev, [field]: value }));
  };

  const validate = () => {
    if (!discountCode.code.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập mã giảm giá.');
      return false;
    }
    const discount = parseFloat(discountCode.discount_percentage);
    if (isNaN(discount) || discount < 0 || discount > 100) {
      Alert.alert('Lỗi', 'Phần trăm giảm giá phải từ 0 đến 100.');
      return false;
    }
    if (!discountCode.valid_from.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập ngày bắt đầu.');
      return false;
    }
    if (!discountCode.valid_to.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập ngày kết thúc.');
      return false;
    }
    if (!discountCode.user_group) {
      Alert.alert('Lỗi', 'Vui lòng chọn nhóm người dùng.');
      return false;
    }
    if (discountCode.max_uses && isNaN(parseInt(discountCode.max_uses))) {
      Alert.alert('Lỗi', 'Số lượt sử dụng tối đa phải là số nguyên.');
      return false;
    }
    return true;
  };

  const submit = async () => {
    if (!validate()) return;

    setLoading(true);
    try {
      const payload = {
        code: discountCode.code.trim(),
        discount_percentage: parseFloat(discountCode.discount_percentage),
        valid_from: discountCode.valid_from,
        valid_to: discountCode.valid_to,
        user_group: discountCode.user_group,
        max_uses: discountCode.max_uses ? parseInt(discountCode.max_uses) : null,
      };

      const res = await Apis.post(endpoints['discount_codes'], payload);
      Alert.alert('Thành công', 'Mã giảm giá đã được tạo thành công.');
      setDiscountCode({
        code: '',
        discount_percentage: '',
        valid_from: '',
        valid_to: '',
        user_group: '',
        max_uses: '',
      });
    } catch (error) {
      console.error('Error creating discount code:', error.response ? error.response.data : error.message);
      Alert.alert('Lỗi', 'Không thể tạo mã giảm giá. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <Title style={styles.title}>Tạo Mã Giảm Giá</Title>

        <TextInput
          label="Mã giảm giá"
          value={discountCode.code}
          onChangeText={(text) => onChange('code', text)}
          style={styles.input}
          mode="outlined"
          outlineColor={colors.bluePrimary}
          activeOutlineColor={colors.blueDark}
        />

        <TextInput
          label="Phần trăm giảm giá"
          value={discountCode.discount_percentage}
          onChangeText={(text) => {
            // Allow only numbers and decimal point, max two decimal places
            const regex = /^\d*\.?\d{0,2}$/;
            if (text === '' || regex.test(text)) {
              onChange('discount_percentage', text);
            }
          }}
          style={styles.input}
          mode="outlined"
          keyboardType="numeric"
          outlineColor={colors.bluePrimary}
          activeOutlineColor={colors.blueDark}
        />

        <TextInput
          label="Ngày bắt đầu (YYYY-MM-DD)"
          value={discountCode.valid_from}
          onChangeText={(text) => onChange('valid_from', text)}
          style={styles.input}
          mode="outlined"
          placeholder="2024-01-01"
          outlineColor={colors.bluePrimary}
          activeOutlineColor={colors.blueDark}
        />

        <TextInput
          label="Ngày kết thúc (YYYY-MM-DD)"
          value={discountCode.valid_to}
          onChangeText={(text) => onChange('valid_to', text)}
          style={styles.input}
          mode="outlined"
          placeholder="2024-12-31"
          outlineColor={colors.bluePrimary}
          activeOutlineColor={colors.blueDark}
        />

        <Menu
          visible={userGroupMenuVisible}
          onDismiss={() => setUserGroupMenuVisible(false)}
          anchor={
            <Button
              mode="outlined"
              onPress={() => setUserGroupMenuVisible(true)}
              style={styles.input}
              contentStyle={{ justifyContent: 'flex-start' }}
              labelStyle={{ color: discountCode.user_group ? colors.blueDark : '#999' }}
              outlineColor={colors.bluePrimary}
              activeOutlineColor={colors.blueDark}
            >
              {discountCode.user_group
                ? userGroups.find((ug) => ug.value === discountCode.user_group)?.label
                : 'Chọn nhóm người dùng'}
            </Button>
          }
        >
          {userGroups.map((ug) => (
            <Menu.Item
              key={ug.value}
              onPress={() => {
                onChange('user_group', ug.value);
                setUserGroupMenuVisible(false);
              }}
              title={ug.label}
              titleStyle={{ color: discountCode.user_group === ug.value ? colors.blueAccent : 'black' }}
            />
          ))}
        </Menu>

        <TextInput
          label="Số lượt sử dụng tối đa (tùy chọn)"
          value={discountCode.max_uses}
          onChangeText={(text) => onChange('max_uses', text)}
          style={styles.input}
          mode="outlined"
          keyboardType="numeric"
          outlineColor={colors.bluePrimary}
          activeOutlineColor={colors.blueDark}
        />

        <Button
          mode="contained"
          onPress={submit}
          loading={loading}
          disabled={loading}
          style={[styles.submitButton, { backgroundColor: colors.blueDark }]}
          buttonColor={colors.blueDark}
        >
          Tạo mã giảm giá
        </Button>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  container: {
    padding: 20,
  },
  title: {
    marginBottom: 20,
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  input: {
    marginBottom: 15,
    backgroundColor: 'white',
  },
  submitButton: {
    marginTop: 10,
    borderRadius: 8,
  },
});

export default DiscountCode;
