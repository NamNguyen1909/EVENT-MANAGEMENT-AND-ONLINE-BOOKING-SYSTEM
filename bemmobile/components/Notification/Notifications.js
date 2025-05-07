import React, { useState, useEffect, useContext } from 'react';
import { View, StyleSheet, Text, TouchableOpacity, FlatList, ActivityIndicator } from 'react-native';
import { Button, Card } from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MyUserContext, MyDispatchContext } from '../../configs/MyContexts';
import Apis, { endpoints, authApis } from '../../configs/Apis';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const Notifications = ({ unreadNotifications, onClose, onUpdateUnreadCount }) => {
    const user = useContext(MyUserContext);
    const dispatch = useContext(MyDispatchContext);

    const [notifications, setNotifications] = useState([]);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState(null);

    // Debug: Log user và unreadNotifications
    useEffect(() => {
        console.log('>>> Notifications.js - User:', user);
        console.log('>>> Notifications.js - Unread Notifications:', unreadNotifications);
    }, [user, unreadNotifications]);

    // Reset notifications khi component được mở
    useEffect(() => {
        setNotifications([]);
        setPage(1);
        setHasMore(true);
        // Gọi fetchNotifications ngay khi component mount nếu có user
        if (user) {
            fetchNotifications(1);
        }
    }, [user]); // Chỉ chạy khi user thay đổi hoặc component mount

    // Hàm lấy danh sách thông báo cá nhân
    const fetchNotifications = async (pageNum) => {
        if (loading || !user) return;
        
        setLoading(true);
        try {
            console.log(`>>> Notifications.js - Đang tải thông báo trang ${pageNum}`);
            const token = await AsyncStorage.getItem('token');
            console.log('>>> Notifications.js - Token:', token);
            if (!token) {
                setErrorMsg('Không tìm thấy token xác thực!');
                setLoading(false);
                return;
            }
            
            const api = authApis(token);
            const response = await api.get(`${endpoints.myNotifications}?page=${pageNum}`, {
                headers: { 'Authorization': `Bearer ${token}` },
            });

            // Debug: Log dữ liệu trả về từ API
            console.log('>>> Notifications.js - API Response:', response.data);

            // Xử lý dữ liệu linh hoạt: hỗ trợ cả { results: [...] } và [...]
            const newNotifications = response.data.results || response.data || [];
            
            // Thêm pageNum vào log để theo dõi quá trình phân trang
            console.log(`>>> Notifications.js - Trang ${pageNum} - Nhận được ${newNotifications.length} thông báo`);
            
            if (pageNum === 1) {
                // Nếu là trang đầu tiên, thiết lập lại notifications
                setNotifications(newNotifications);
            } else {
                // Nếu không, thêm vào danh sách hiện tại
                setNotifications(prev => [...prev, ...newNotifications]);
            }
            
            // Kiểm tra xem có trang tiếp theo không
            setHasMore(!!response.data.next);
            setErrorMsg(null);
        } catch (err) {
            setErrorMsg('Không thể tải thông báo. Vui lòng thử lại.');
            console.error('>>> Notifications.js - Lỗi khi lấy thông báo:', {
                status: err.response?.status,
                data: err.response?.data,
                message: err.message
            });
            if (err.response?.status === 401) {
                console.error('Lỗi: Xác thực thất bại. Vui lòng đăng nhập lại.');
                AsyncStorage.removeItem('token');
                dispatch({ type: 'logout' });
            }
        } finally {
            setLoading(false);
        }
    };

    // Debug: Log notifications khi state thay đổi
    useEffect(() => {
        console.log('>>> Notifications.js - Notifications State:', notifications);
    }, [notifications]);

    // Hàm đánh dấu thông báo là đã đọc
    const markAsRead = async (notificationId) => {
        try {
            const token = await AsyncStorage.getItem('token');
            if (!token) {
                setErrorMsg('Không tìm thấy token xác thực!');
                return;
            }

            // Debug: Log notificationId và URL trước khi gọi API
            const url = endpoints.markNotificationAsRead(notificationId);
            console.log('>>> Notifications.js - Marking notification with ID:', notificationId);
            console.log('>>> Notifications.js - Request URL:', url);
            console.log('>>> Notifications.js - Token:', token);

            const api = authApis(token);
            const response = await api.post(url, {}, {
                headers: { 'Authorization': `Bearer ${token}` },
            });

            // Debug: Log response từ API
            console.log('>>> Notifications.js - Mark as read response:', response.data);

            // Cập nhật trạng thái is_read trong state
            setNotifications((prev) =>
                prev.map((n) =>
                    n.id === notificationId ? { ...n, is_read: true } : n
                )
            );
            
            // Gọi hàm cập nhật số lượng thông báo chưa đọc (nếu có)
            if (typeof onUpdateUnreadCount === 'function') {
                console.log('>>> Notifications.js - Calling onUpdateUnreadCount');
                onUpdateUnreadCount();
            }
            
            setErrorMsg(null);
        } catch (err) {
            setErrorMsg('Không thể đánh dấu thông báo là đã đọc.');
            console.error('>>> Notifications.js - Lỗi khi đánh dấu thông báo:', {
                status: err.response?.status,
                data: err.response?.data,
                message: err.message
            });
            if (err.response?.status === 401) {
                console.error('Lỗi: Xác thực thất bại. Vui lòng đăng nhập lại.');
                AsyncStorage.removeItem('token');
                dispatch({ type: 'logout' });
            }
        }
    };

    // Xử lý tải thêm thông báo
    const handleLoadMore = () => {
        if (hasMore && !loading) {
            console.log('>>> Notifications.js - Tải thêm trang', page + 1);
            setPage((prev) => prev + 1);
            fetchNotifications(page + 1);
        }
    };

    // Hiển thị trạng thái debug
    useEffect(() => {
        console.log('>>> Notifications.js - Rendering with:', {
            notificationsLength: notifications.length,
            loading,
            hasMore,
            errorMsg
        });
    }, [notifications, loading, hasMore, errorMsg]);

    // Render notification item
    const renderNotificationItem = ({ item }) => (
        <Card 
            style={[styles.notificationCard, item.is_read && styles.readNotification]}
            key={item.id.toString()}
        >
            <Card.Content>
                <Text style={styles.notificationTitle}>
                    {item.title || 'Không có tiêu đề'}
                </Text>
                <Text style={styles.notificationMessage}>
                    {item.message || 'Không có nội dung'}
                </Text>
                <Text style={styles.notificationTime}>
                    {item.created_at ? new Date(item.created_at).toLocaleString('vi-VN') : 'Không có thời gian'}
                </Text>
                
                {item.event && item.event_title && (
                    <Text style={styles.notificationEvent}>
                        Sự kiện: {item.event_title}
                    </Text>
                )}
                
                {!item.is_read && (
                    <Button
                        mode="contained"
                        onPress={() => markAsRead(item.id)}
                        style={styles.markReadButton}
                        icon="check-circle"
                    >
                        Đánh Dấu Đã Đọc
                    </Button>
                )}
            </Card.Content>
        </Card>
    );

    // Kiểm tra vai trò
    if (!user) {
        return (
            <View style={styles.centeredContainer}>
                <Text style={styles.errorText}>Vui lòng đăng nhập để xem thông báo.</Text>
                <Button
                    mode="contained"
                    onPress={onClose}
                    style={styles.closeButton}
                >
                    Đóng
                </Button>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <View style={styles.headerTitle}>
                    <Icon name="bell" size={24} color="#4f46e5" style={styles.headerIcon} />
                    <Text style={styles.headerText}>Thông Báo</Text>
                </View>
                <TouchableOpacity onPress={onClose}>
                    <Icon name="close" size={24} color="#6b7280" />
                </TouchableOpacity>
            </View>

            {unreadNotifications > 0 && (
                <View style={styles.unreadBanner}>
                    <Icon name="bell-ring" size={18} color="#4f46e5" style={styles.unreadIcon} />
                    <Text style={styles.unreadText}>
                        Bạn có {unreadNotifications} thông báo chưa đọc
                    </Text>
                </View>
            )}

            {errorMsg && (
                <View style={styles.errorBanner}>
                    <Text style={styles.errorText}>{errorMsg}</Text>
                </View>
            )}

            {loading && notifications.length === 0 ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#4f46e5" />
                    <Text style={styles.loadingText}>Đang tải thông báo...</Text>
                </View>
            ) : notifications.length === 0 ? (
                <View style={styles.emptyContainer}>
                    <Text style={styles.emptyText}>Không có thông báo nào.</Text>
                </View>
            ) : (
                <FlatList
                    data={notifications}
                    renderItem={renderNotificationItem}
                    keyExtractor={(item) => item.id.toString()}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={true}
                    onEndReached={handleLoadMore}
                    onEndReachedThreshold={0.5}
                />
            )}

            {hasMore && !loading && notifications.length > 0 && (
                <Button
                    mode="outlined"
                    onPress={handleLoadMore}
                    style={styles.loadMoreButton}
                    loading={loading}
                >
                    Tải thêm
                </Button>
            )}

            {loading && notifications.length > 0 && (
                <ActivityIndicator size="small" color="#4f46e5" style={styles.loadingMore} />
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#ffffff',
        borderRadius: 12,
    },
    centeredContainer: {
        padding: 20,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'white',
        borderRadius: 12,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#e5e7eb',
    },
    headerTitle: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    headerIcon: {
        marginRight: 8,
    },
    headerText: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#111827',
    },
    unreadBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#eef2ff',
        padding: 12,
        marginHorizontal: 16,
        marginTop: 8,
        borderRadius: 8,
    },
    unreadIcon: {
        marginRight: 8,
    },
    unreadText: {
        color: '#4f46e5',
        fontSize: 14,
    },
    errorBanner: {
        backgroundColor: '#fee2e2',
        padding: 12,
        marginHorizontal: 16,
        marginTop: 8,
        borderRadius: 8,
    },
    errorText: {
        color: '#b91c1c',
        fontSize: 14,
        textAlign: 'center',
    },
    loadingContainer: {
        padding: 40,
        alignItems: 'center',
    },
    loadingText: {
        color: '#6b7280',
        marginTop: 12,
    },
    emptyContainer: {
        padding: 40,
        alignItems: 'center',
    },
    emptyText: {
        color: '#6b7280',
        fontSize: 16,
    },
    listContent: {
        padding: 16,
    },
    notificationCard: {
        marginBottom: 12,
        elevation: 2,
        borderRadius: 8,
    },
    readNotification: {
        backgroundColor: '#f9fafb',
        elevation: 1,
    },
    notificationTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#111827',
        marginBottom: 4,
    },
    notificationMessage: {
        fontSize: 14,
        color: '#4b5563',
        marginBottom: 8,
    },
    notificationTime: {
        fontSize: 12,
        color: '#9ca3af',
        marginBottom: 4,
    },
    notificationEvent: {
        fontSize: 12,
        color: '#6b7280',
        marginBottom: 8,
    },
    markReadButton: {
        marginTop: 8,
        backgroundColor: '#4f46e5',
    },
    loadMoreButton: {
        margin: 16,
        borderColor: '#4f46e5',
    },
    loadingMore: {
        marginBottom: 16,
    },
    closeButton: {
        marginTop: 16,
        backgroundColor: '#4f46e5',
    },
});

export default Notifications;