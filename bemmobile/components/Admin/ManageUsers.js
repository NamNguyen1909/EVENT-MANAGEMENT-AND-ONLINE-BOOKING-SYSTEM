import React, { useEffect, useState, useContext } from "react";
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  StyleSheet,
  RefreshControl,
  Alert,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Switch, Searchbar } from "react-native-paper";
import { endpoints, authApis } from "../../configs/Apis";
import { MyUserContext } from "../../configs/MyContexts";

const ManageUsers = () => {
  const user = useContext(MyUserContext);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [updatingUserIds, setUpdatingUserIds] = useState(new Set());
  const [search, setSearch] = useState("");

  // Fetch all users from backend, filter by role organizer or attendee
  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = await AsyncStorage.getItem("token");
      if (!user || !token) {
        setError("Vui lòng đăng nhập để xem danh sách người dùng.");
        setLoading(false);
        return;
      }
      const api = authApis(token);
      const response = await api.get(endpoints.listUsers);
      // Filter users with role organizer or attendee
      const filteredUsers = (response.data.results || response.data || []).filter(
        (u) => u.role === "organizer" || u.role === "attendee"
      ).map(u => ({
        ...u,
        is_active: !!u.is_active,
        is_staff: !!u.is_staff,
      }));
      setUsers(filteredUsers);
    } catch (err) {
      console.error("Error fetching users:", err);
      setError("Không thể tải danh sách người dùng. Vui lòng thử lại.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Render each user item with info and switches
  const renderItem = ({ item }) => (
    <View style={styles.userCard}>
      <View style={styles.userInfo}>
        <Text style={styles.username}>{item.username || "N/A"}</Text>
        <Text>{item.email || "N/A"}</Text>
      </View>
      <View style={styles.switchContainer}>
        <View style={styles.switchRowVertical}>
          <Text>Active</Text>
          <Switch
            value={!!item.is_active}
            onValueChange={(val) => updateUserState(item.id, "is_active", val)}
            disabled={updatingUserIds.has(item.id)}
          />
        </View>
        {item.role === "attendee" && (
          <View style={styles.switchRowVertical}>
            <Text>Staff</Text>
            <Switch
              value={!!item.is_staff}
              onValueChange={(val) => updateUserState(item.id, "is_staff", val)}
              disabled={updatingUserIds.has(item.id)}
            />
          </View>
        )}
      </View>
    </View>
  );

  useEffect(() => {
    fetchUsers();
  }, []);

  // Pull-to-refresh handler
  const onRefresh = () => {
    setRefreshing(true);
    fetchUsers();
  };

  /**
   * Update user state (is_active or is_staff) by calling backend API.
   * @param {number} userId - ID of the user to update
   * @param {string} field - 'is_active' or 'is_staff'
   * @param {boolean} value - new value for the field
   */
  const updateUserState = async (userId, field, value) => {
    if (updatingUserIds.has(userId)) {
      return;
    }
    setUpdatingUserIds((prev) => new Set(prev).add(userId));
    try {
      const token = await AsyncStorage.getItem("token");
      if (!user || !token) {
        Alert.alert("Lỗi", "Vui lòng đăng nhập để thực hiện thao tác này.");
        return;
      }
      const api = authApis(token);
      let url = "";
      let data = {};
      if (field === "is_active") {
        url = `${endpoints.changeUserActiveState}`;
        data = { user_id: userId, is_active: value };
      } else if (field === "is_staff") {
        url = `${endpoints.changeUserStaffState}`;
        data = { user_id: userId, is_staff: value };
      } else {
        throw new Error("Invalid field");
      }
      // Thêm log để kiểm tra
      console.log("Gửi request cập nhật:", { url, data, field, value });
      const response = await api.post(url, data);
      console.log("Phản hồi từ backend:", response?.data);
      setUsers((prevUsers) =>
        prevUsers.map((u) =>
          u.id === userId ? { ...u, [field]: !!value } : u
        )
      );
    } catch (err) {
      console.error("Error updating user state:", err, err?.response?.data);
      Alert.alert("Lỗi", "Không thể cập nhật trạng thái. Vui lòng thử lại.");
    } finally {
      setUpdatingUserIds((prev) => {
        const newSet = new Set(prev);
        newSet.delete(userId);
        return newSet;
      });
    }
  };

  // Lọc users theo search
  const filteredUsers = users.filter(
    (u) =>
      u.username?.toLowerCase().includes(search.toLowerCase()) ||
      u.email?.toLowerCase().includes(search.toLowerCase())
  );

  if (loading && users.length === 0) {
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

  if (users.length === 0) {
    return (
      <View style={styles.center}>
        <Text>Không có người dùng nào.</Text>
      </View>
    );
  }

  return (
    <>
      <Searchbar
        placeholder="Tìm kiếm theo username hoặc email..."
        onChangeText={setSearch}
        value={search}
        style={{ margin: 16 }}
      />
      <FlatList
        data={filteredUsers}
        keyExtractor={(item) => item.id?.toString() || item.username}
        renderItem={renderItem}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      />
    </>
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
  userCard: {
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
    justifyContent: "space-between",
    alignItems: "center",
  },
  userInfo: {
    flex: 1,
  },
  username: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 4,
    color: "#333",
  },
  switchContainer: {
    flexDirection: "column",
    justifyContent: "space-between",
    width: 90,
    paddingRight: 10,
  },
  switchRowVertical: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
    width: "100%",
  },
  errorText: {
    color: "red",
    fontSize: 16,
    textAlign: "center",
    padding: 20,
  },
});

export default ManageUsers;