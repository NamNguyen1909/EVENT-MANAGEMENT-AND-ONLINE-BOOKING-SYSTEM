import React, { useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  Alert,
  ScrollView,
  TouchableOpacity,
  Modal,
} from "react-native";
import {
  TextInput,
  Button,
  Title,
  Menu,
  Text,
  useTheme,
  IconButton,
} from "react-native-paper";
import DateTimePicker from "@react-native-community/datetimepicker";
import Apis, { endpoints } from "../../configs/Apis";
import { colors } from "../../styles/MyStyles";
import { SafeAreaView } from "react-native-safe-area-context";

const userGroups = [
  { label: "Khách hàng mới", value: "new" },
  { label: "Khách phổ thông", value: "regular" },
  { label: "Khách VIP", value: "vip" },
  { label: "Khách siêu VIP", value: "super_vip" },
  { label: "Không xác định", value: "unknown" },
];

const DiscountCode = () => {
  const theme = useTheme();

  const [discountCode, setDiscountCode] = useState({
    code: "",
    discount_percentage: "",
    valid_from: "",
    valid_to: "",
    user_group: "",
    max_uses: "",
  });

  const [userGroupMenuVisible, setUserGroupMenuVisible] = useState(false);
  const [loading, setLoading] = useState(false);

  // New state for date/time pickers for valid_from
  const [showValidFromDatePicker, setShowValidFromDatePicker] = useState(false);
  const [showValidFromTimePicker, setShowValidFromTimePicker] = useState(false);
  const [tempValidFromDate, setTempValidFromDate] = useState(new Date());
  const [tempValidFromTime, setTempValidFromTime] = useState(new Date());
  const [pendingValidFromDate, setPendingValidFromDate] = useState(null);

  // New state for date/time pickers for valid_to
  const [showValidToDatePicker, setShowValidToDatePicker] = useState(false);
  const [showValidToTimePicker, setShowValidToTimePicker] = useState(false);
  const [tempValidToDate, setTempValidToDate] = useState(new Date());
  const [tempValidToTime, setTempValidToTime] = useState(new Date());
  const [pendingValidToDate, setPendingValidToDate] = useState(null);

  // Sync tempValidFromDate and tempValidFromTime with discountCode.valid_from when opening date picker
  useEffect(() => {
    if (showValidFromDatePicker) {
      if (discountCode.valid_from) {
        const date = new Date(discountCode.valid_from);
        setTempValidFromDate(date);
        setTempValidFromTime(date);
      } else {
        const now = new Date();
        setTempValidFromDate(now);
        setTempValidFromTime(now);
      }
    }
  }, [showValidFromDatePicker, discountCode.valid_from]);

  // Sync tempValidToDate and tempValidToTime with discountCode.valid_to when opening date picker
  useEffect(() => {
    if (showValidToDatePicker) {
      if (discountCode.valid_to) {
        const date = new Date(discountCode.valid_to);
        setTempValidToDate(date);
        setTempValidToTime(date);
      } else {
        const now = new Date();
        setTempValidToDate(now);
        setTempValidToTime(now);
      }
    }
  }, [showValidToDatePicker, discountCode.valid_to]);

  const onChange = (field, value) => {
    setDiscountCode((prev) => ({ ...prev, [field]: value }));
  };

  // Format ISO string to localized date time string (Vietnamese)
  const formatDateTime = (isoString) => {
    if (!isoString) return "Chưa chọn";
    const date = new Date(isoString);
    return date.toLocaleString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Handlers for valid_from date/time pickers
  const onValidFromDateChange = (event, selectedDate) => {
    if (event.type === "dismissed") {
      setShowValidFromDatePicker(false);
      setPendingValidFromDate(null);
      return;
    }
    if (selectedDate) {
      setPendingValidFromDate(selectedDate);
      setTempValidFromDate(selectedDate);
    }
  };
  const confirmValidFromDate = () => {
    setShowValidFromDatePicker(false);
    if (pendingValidFromDate) {
      setTempValidFromDate(pendingValidFromDate);
      setShowValidFromTimePicker(true);
      setPendingValidFromDate(null);
    }
  };
  const onValidFromTimeChange = (event, selectedTime) => {
    if (event.type === "dismissed") {
      setShowValidFromTimePicker(false);
      return;
    }
    if (selectedTime) setTempValidFromTime(selectedTime);
  };
  const confirmValidFromTime = () => {
    setShowValidFromTimePicker(false);
    if (tempValidFromDate && tempValidFromTime) {
      const newDate = new Date(tempValidFromDate);
      newDate.setHours(
        tempValidFromTime.getHours(),
        tempValidFromTime.getMinutes()
      );
      onChange("valid_from", newDate.toISOString());
    }
  };

  // Handlers for valid_to date/time pickers
  const onValidToDateChange = (event, selectedDate) => {
    if (event.type === "dismissed") {
      setShowValidToDatePicker(false);
      setPendingValidToDate(null);
      return;
    }
    if (selectedDate) {
      setPendingValidToDate(selectedDate);
      setTempValidToDate(selectedDate);
    }
  };
  const confirmValidToDate = () => {
    setShowValidToDatePicker(false);
    if (pendingValidToDate) {
      setTempValidToDate(pendingValidToDate);
      setShowValidToTimePicker(true);
      setPendingValidToDate(null);
    }
  };
  const onValidToTimeChange = (event, selectedTime) => {
    if (event.type === "dismissed") {
      setShowValidToTimePicker(false);
      return;
    }
    if (selectedTime) setTempValidToTime(selectedTime);
  };
  const confirmValidToTime = () => {
    setShowValidToTimePicker(false);
    if (tempValidToDate && tempValidToTime) {
      const newDate = new Date(tempValidToDate);
      newDate.setHours(
        tempValidToTime.getHours(),
        tempValidToTime.getMinutes()
      );
      onChange("valid_to", newDate.toISOString());
    }
  };

  const validate = () => {
    if (!discountCode.code.trim()) {
      Alert.alert("Lỗi", "Vui lòng nhập mã giảm giá.");
      return false;
    }
    const discount = parseFloat(discountCode.discount_percentage);
    if (isNaN(discount) || discount < 0 || discount > 100) {
      Alert.alert("Lỗi", "Phần trăm giảm giá phải từ 0 đến 100.");
      return false;
    }
    if (!discountCode.valid_from.trim()) {
      Alert.alert("Lỗi", "Vui lòng nhập ngày bắt đầu.");
      return false;
    }
    if (!discountCode.valid_to.trim()) {
      Alert.alert("Lỗi", "Vui lòng nhập ngày kết thúc.");
      return false;
    }
    if (!discountCode.user_group) {
      Alert.alert("Lỗi", "Vui lòng chọn nhóm người dùng.");
      return false;
    }
    if (discountCode.max_uses && isNaN(parseInt(discountCode.max_uses))) {
      Alert.alert("Lỗi", "Số lượt sử dụng tối đa phải là số nguyên.");
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
        max_uses: discountCode.max_uses
          ? parseInt(discountCode.max_uses)
          : null,
      };

      const res = await Apis.post(endpoints["discount_codes"], payload);
      Alert.alert("Thành công", "Mã giảm giá đã được tạo thành công.");
      setDiscountCode({
        code: "",
        discount_percentage: "",
        valid_from: "",
        valid_to: "",
        user_group: "",
        max_uses: "",
      });
    } catch (error) {
      console.error(
        "Error creating discount code:",
        error.response ? error.response.data : error.message
      );
      Alert.alert("Lỗi", "Không thể tạo mã giảm giá. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.container}>
        <Title style={styles.title}>Tạo Mã Giảm Giá</Title>

        <TextInput
          label="Mã giảm giá"
          value={discountCode.code}
          onChangeText={(text) => onChange("code", text)}
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
            if (text === "" || regex.test(text)) {
              onChange("discount_percentage", text);
            }
          }}
          style={styles.input}
          mode="outlined"
          keyboardType="numeric"
          outlineColor={colors.bluePrimary}
          activeOutlineColor={colors.blueDark}
        />

        {/* Updated valid_from input */}
        <View style={styles.datePickerContainer}>
          <Text style={styles.sectionLabel}>Ngày bắt đầu</Text>
          <TouchableOpacity
            style={styles.dateButton}
            onPress={() => setShowValidFromDatePicker(true)}
          >
            <Text style={styles.dateButtonText}>
              {formatDateTime(discountCode.valid_from)}
            </Text>
          </TouchableOpacity>
        <Modal
          visible={showValidFromDatePicker}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setShowValidFromDatePicker(false)}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <Text style={styles.pickerLabel}>Chọn ngày</Text>
              <DateTimePicker
                value={tempValidFromDate}
                mode="date"
                display="spinner"
                onChange={(event, selectedDate) => {
                  if (event.type === "dismissed") {
                    setShowValidFromDatePicker(false);
                    setPendingValidFromDate(null);
                    return;
                  }
                  if (selectedDate) {
                    setTempValidFromDate(selectedDate);
                    setShowValidFromDatePicker(false);
                    setShowValidFromTimePicker(true);
                  }
                }}
              />
            </View>
          </View>
        </Modal>
        <Modal
          visible={showValidFromTimePicker}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setShowValidFromTimePicker(false)}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <Text style={styles.pickerLabel}>Chọn giờ</Text>
              <DateTimePicker
                value={tempValidFromTime}
                mode="time"
                display="spinner"
                onChange={(event, selectedTime) => {
                  if (event.type === "dismissed") {
                    setShowValidFromTimePicker(false);
                    return;
                  }
                  if (selectedTime) {
                    setTempValidFromTime(selectedTime);
                    setShowValidFromTimePicker(false);
                    const newDate = new Date(tempValidFromDate);
                    newDate.setHours(
                      selectedTime.getHours(),
                      selectedTime.getMinutes()
                    );
                    onChange("valid_from", newDate.toISOString());
                  }
                }}
              />
            </View>
          </View>
        </Modal>
        </View>

        {/* Updated valid_to input */}
        <View style={styles.datePickerContainer}>
          <Text style={styles.sectionLabel}>Ngày kết thúc</Text>
          <TouchableOpacity
            style={styles.dateButton}
            onPress={() => setShowValidToDatePicker(true)}
          >
            <Text style={styles.dateButtonText}>
              {formatDateTime(discountCode.valid_to)}
            </Text>
          </TouchableOpacity>
        <Modal
          visible={showValidToDatePicker}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setShowValidToDatePicker(false)}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <Text style={styles.pickerLabel}>Chọn ngày</Text>
              <DateTimePicker
                value={tempValidToDate}
                mode="date"
                display="spinner"
                onChange={(event, selectedDate) => {
                  if (event.type === "dismissed") {
                    setShowValidToDatePicker(false);
                    setPendingValidToDate(null);
                    return;
                  }
                  if (selectedDate) {
                    setTempValidToDate(selectedDate);
                    setShowValidToDatePicker(false);
                    setShowValidToTimePicker(true);
                  }
                }}
              />
            </View>
          </View>
        </Modal>
        <Modal
          visible={showValidToTimePicker}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setShowValidToTimePicker(false)}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <Text style={styles.pickerLabel}>Chọn giờ</Text>
              <DateTimePicker
                value={tempValidToTime}
                mode="time"
                display="spinner"
                onChange={(event, selectedTime) => {
                  if (event.type === "dismissed") {
                    setShowValidToTimePicker(false);
                    return;
                  }
                  if (selectedTime) {
                    setTempValidToTime(selectedTime);
                    setShowValidToTimePicker(false);
                    const newDate = new Date(tempValidToDate);
                    newDate.setHours(
                      selectedTime.getHours(),
                      selectedTime.getMinutes()
                    );
                    onChange("valid_to", newDate.toISOString());
                  }
                }}
              />
            </View>
          </View>
        </Modal>
        </View>

        <Menu
          visible={userGroupMenuVisible}
          onDismiss={() => setUserGroupMenuVisible(false)}
          anchor={
            <Button
              mode="outlined"
              onPress={() => setUserGroupMenuVisible(true)}
              style={styles.input}
              contentStyle={{ justifyContent: "flex-start" }}
              labelStyle={{
                color: discountCode.user_group ? colors.blueDark : "#999",
              }}
              outlineColor={colors.bluePrimary}
              activeOutlineColor={colors.blueDark}
            >
              {discountCode.user_group
                ? userGroups.find((ug) => ug.value === discountCode.user_group)
                    ?.label
                : "Chọn nhóm người dùng"}
            </Button>
          }
        >
          {userGroups.map((ug) => (
            <Menu.Item
              key={ug.value}
              onPress={() => {
                onChange("user_group", ug.value);
                setUserGroupMenuVisible(false);
              }}
              title={ug.label}
              titleStyle={{
                color:
                  discountCode.user_group === ug.value
                    ? colors.blueAccent
                    : "black",
              }}
            />
          ))}
        </Menu>

        <TextInput
          label="Số lượt sử dụng tối đa (tùy chọn)"
          value={discountCode.max_uses}
          onChangeText={(text) => {
            // Allow only integer numbers
            const regex = /^\d*$/;
            if (text === "" || regex.test(text)) {
              onChange("max_uses", text);
            }
          }}
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
    backgroundColor: "#f5f5f5",
  },
  container: {
    padding: 20,
  },
  title: {
    marginBottom: 20,
    fontSize: 22,
    fontWeight: "bold",
    textAlign: "center",
  },
  input: {
    marginBottom: 15,
    backgroundColor: "white",
  },
  submitButton: {
    marginTop: 10,
    borderRadius: 8,
  },
  datePickerContainer: {
    marginBottom: 15,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
  },
  dateButton: {
    padding: 12,
    backgroundColor: colors.bluePrimary,
    borderRadius: 8,
    alignItems: "center",
  },
  dateButtonText: {
    color: "white",
    fontSize: 14,
    fontWeight: "600",
  },
  modalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modalContent: {
    backgroundColor: "white",
    borderRadius: 10,
    width: "90%",
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  pickerLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 10,
    textAlign: "center",
  },
  modalButtonContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 20,
  },
  closeButton: {
    borderRadius: 8,
    borderColor: colors.bluePrimary,
  },
  confirmButton: {
    borderRadius: 8,
    backgroundColor: colors.bluePrimary,
  },
});

export default DiscountCode;
