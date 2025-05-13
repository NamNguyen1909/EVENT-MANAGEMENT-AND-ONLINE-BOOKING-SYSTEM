import React, { useEffect, useState, useContext } from "react";
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  Modal,
  Pressable,
  Alert,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { endpoints, authApis } from "../../configs/Apis";
import { MyUserContext } from "../../configs/MyContexts";
import { SafeAreaView } from "react-native-safe-area-context";
import FontAwesome from "react-native-vector-icons/FontAwesome";
import DiscountCode from "./DiscountCode";
import { useNavigation } from '@react-navigation/native';

const ListDiscountCodes = () => {
  const user = useContext(MyUserContext);
  const navigation = useNavigation();
  const [discountCodes, setDiscountCodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [nextPageUrl, setNextPageUrl] = useState(null);

  // State for delete confirmation modal
  const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false);
  const [selectedDiscountCode, setSelectedDiscountCode] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const fetchDiscountCodes = async (url = endpoints.discountCodes, append = false, isRefresh = false) => {
    try {
      if (append) {
        setLoadingMore(true);
      } else if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
        setError(null);
      }
      const token = await AsyncStorage.getItem("token");
      if (!user || !token) {
        setError("Vui lòng đăng nhập để xem danh sách mã giảm giá.");
        setLoading(false);
        setLoadingMore(false);
        setRefreshing(false);
        return;
      }
      const api = authApis(token);
      const response = await api.get(url);
      const newDiscountCodes = response.data.results || response.data || [];
      if (append) {
        setDiscountCodes((prev) => [...prev, ...newDiscountCodes]);
      } else {
        setDiscountCodes(newDiscountCodes);
      }
      setNextPageUrl(response.data.next);
    } catch (err) {
      console.error("Error fetching discount codes:", err);
      setError("Không thể tải danh sách mã giảm giá. Vui lòng thử lại.");
    } finally {
      setLoading(false);
      setLoadingMore(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDiscountCodes();
  }, []);

  const fetchMoreDiscountCodes = () => {
    if (nextPageUrl && !loadingMore && !loading) {
      fetchDiscountCodes(nextPageUrl, true);
    }
  };

  const onRefresh = () => {
    fetchDiscountCodes(endpoints.discountCodes, false, true);
  };

  const confirmDelete = (item) => {
    setSelectedDiscountCode(item);
    setIsDeleteModalVisible(true);
  };

  const deleteDiscountCode = async () => {
    if (!selectedDiscountCode) return;
    setDeleting(true);
    try {
      const token = await AsyncStorage.getItem("token");
      if (!user || !token) {
        setError("Vui lòng đăng nhập để xóa mã giảm giá.");
        setDeleting(false);
        setIsDeleteModalVisible(false);
        return;
      }
      const api = authApis(token);
      // Assuming the delete endpoint is discountCodeDetail + id + '/'
      const deleteUrl = `${endpoints.discountCodes}${selectedDiscountCode.id}/`;
      await api.delete(deleteUrl);
      // Update list after deletion
      setDiscountCodes((prev) =>
        prev.filter((code) => code.id !== selectedDiscountCode.id)
      );
      setIsDeleteModalVisible(false);
      setSelectedDiscountCode(null);
    } catch (err) {
      console.error("Error deleting discount code:", err);
      Alert.alert("Lỗi", "Không thể xóa mã giảm giá. Vui lòng thử lại.");
    } finally {
      setDeleting(false);
    }
  };

  const onCreatePress = () => {
    navigation.navigate('discountCode');
  };

  const renderItem = ({ item }) => (
    <View style={styles.discountItem}>

      <View style={styles.discountInfo}>
        <Text style={styles.code}>{item.code || "N/A"}</Text>
        <Text>Phần trăm giảm: {item.discount_percentage != null ? `${item.discount_percentage}%` : "N/A"}</Text>
        <Text>Áp dụng từ: {item.valid_from ? new Date(item.valid_from).toLocaleDateString() : "N/A"}</Text>
        <Text>Áp dụng đến: {item.valid_to ? new Date(item.valid_to).toLocaleDateString() : "N/A"}</Text>
        <Text>Nhóm người dùng: {item.user_group || "N/A"}</Text>
        <Text>Số lần sử dụng tối đa: {item.max_uses != null ? item.max_uses : "N/A"}</Text>
        <Text>Số lần đã sử dụng: {item.used_count != null ? item.used_count : "N/A"}</Text>
        <Text>Trạng thái: {item.is_active ? "Hoạt động" : "Không hoạt động"}</Text>
      </View>
      <TouchableOpacity
        style={styles.deleteIconContainer}
        onPress={() => confirmDelete(item)}
      >
        <FontAwesome name="trash" size={24} color="red" />
      </TouchableOpacity>
    </View>
  );

  if (loading && discountCodes.length === 0) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  if (discountCodes.length === 0) {
    return (
      <View style={styles.center}>
        <Text>Không có mã giảm giá nào.</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1 }} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Danh sách mã giảm giá</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={onCreatePress}
        >
          <Text style={styles.addButtonText}>➕</Text>
        </TouchableOpacity>
      </View>
      <FlatList
        data={discountCodes}
        keyExtractor={(item) => item.id?.toString() || item.code}
        renderItem={renderItem}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        onEndReached={fetchMoreDiscountCodes}
        onEndReachedThreshold={0.5}
        ListFooterComponent={() =>
          loadingMore ? (
            <View style={{ paddingVertical: 20 }}>
              <ActivityIndicator size="small" color="#0000ff" />
            </View>
          ) : null
        }
      />

      <Modal
        visible={isDeleteModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsDeleteModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Xác nhận xóa mã giảm giá</Text>
            <Text style={styles.modalMessage}>
              Bạn có chắc chắn muốn xóa mã giảm giá "{selectedDiscountCode?.code}" không?
            </Text>
            <View style={styles.modalButtons}>
              <Pressable
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setIsDeleteModalVisible(false)}
                disabled={deleting}
              >
                <Text style={styles.cancelButtonText}>Hủy</Text>
              </Pressable>
              <Pressable
                style={[styles.modalButton, styles.deleteButton]}
                onPress={deleteDiscountCode}
                disabled={deleting}
              >
                {deleting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.deleteButtonText}>Xóa</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  listContainer: {
    padding: 16,
  },
  discountItem: {
    flexDirection: "row",
    backgroundColor: "#fff",
    padding: 16,
    marginBottom: 12,
    borderRadius: 8,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  deleteIconContainer: {
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  discountInfo: {
    flex: 1,
  },
  code: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 8,
    color: "#333",
  },
  errorText: {
    color: "red",
    fontSize: 16,
    textAlign: "center",
    padding: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    padding: 20,
  },
  modalContent: {
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 12,
  },
  modalMessage: {
    fontSize: 16,
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  modalButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 6,
    marginLeft: 10,
  },
  cancelButton: {
    backgroundColor: "#ccc",
  },
  cancelButtonText: {
    color: "#333",
    fontWeight: "bold",
  },
  deleteButton: {
    backgroundColor: "red",
  },
  deleteButtonText: {
    color: "#fff",
    fontWeight: "bold",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#ddd",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
  },
  addButton: {
    padding: 8,
  },
  addButtonText: {
    fontSize: 24,
    color: "#007bff",
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  listContainer: {
    padding: 16,
  },
  discountItem: {
    flexDirection: "row",
    backgroundColor: "#fff",
    padding: 16,
    marginBottom: 12,
    borderRadius: 8,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  deleteIconContainer: {
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  discountInfo: {
    flex: 1,
  },
  code: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 8,
    color: "#333",
  },
  errorText: {
    color: "red",
    fontSize: 16,
    textAlign: "center",
    padding: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    padding: 20,
  },
  modalContent: {
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 12,
  },
  modalMessage: {
    fontSize: 16,
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  modalButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 6,
    marginLeft: 10,
  },
  cancelButton: {
    backgroundColor: "#ccc",
  },
  cancelButtonText: {
    color: "#333",
    fontWeight: "bold",
  },
  deleteButton: {
    backgroundColor: "red",
  },
  deleteButtonText: {
    color: "#fff",
    fontWeight: "bold",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#ddd",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
  },
  addButton: {
    padding: 8,
  },
  addButtonText: {
    fontSize: 24,
    color: "#007bff",
  },
});

export default ListDiscountCodes;
