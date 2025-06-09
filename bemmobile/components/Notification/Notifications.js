import React, { useState, useEffect, useContext } from 'react';
import { View, StyleSheet, Text, TouchableOpacity, FlatList, ActivityIndicator, Platform } from 'react-native';
import { Button, Card } from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MyUserContext, MyDispatchContext } from '../../configs/MyContexts';
import Apis, { endpoints, authApis } from '../../configs/Apis';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import MyStyles, { colors } from '../../styles/MyStyles';

const Notifications = ({ navigation,unreadNotifications, onClose, onUpdateUnreadCount }) => {
    const user = useContext(MyUserContext);
    const dispatch = useContext(MyDispatchContext);

    const [notifications, setNotifications] = useState([]);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState(null);

    // Hàm xử lý khi bấm vào notification
    const handleNotificationPress = (item) => {
        if (item.notification_type === 'reply' && item.event) {
            navigation.navigate('events', {
                screen: 'EventDetails',
                params: { event: { id: item.event } }
            });
        }
    };

    // Debug: Log user và unreadNotifications
    useEffect(() => {
        console.log('>>> Notifications.js - User:', user);
        console.log('>>> Notifications.js - Unread Notifications (prop):', unreadNotifications);
    }, [user, unreadNotifications]);

    // Reset notifications khi component được mở
    useEffect(() => {
        setNotifications([]);
        setPage(1);
        setHasMore(true);
        if (user) {
            fetchNotifications(1);
        }
    }, [user]);

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

            console.log('>>> Notifications.js - API Response:', response.data);

            const newNotifications = response.data.results || response.data || [];
            console.log(`>>> Notifications.js - Trang ${pageNum} - Nhận được ${newNotifications.length} thông báo`);
            
            if (pageNum === 1) {
                setNotifications(newNotifications);
            } else {
                setNotifications(prev => [...prev, ...newNotifications]);
            }
            
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

            const url = endpoints.markNotificationAsRead(notificationId);
            console.log('>>> Notifications.js - Marking notification with ID:', notificationId);
            console.log('>>> Notifications.js - Request URL:', url);
            console.log('>>> Notifications.js - Token:', token);

            const api = authApis(token);
            const response = await api.post(url, {}, {
                headers: { 'Authorization': `Bearer ${token}` },
            });

            console.log('>>> Notifications.js - Mark as read response:', response.data);

            setNotifications((prev) =>
                prev.map((n) =>
                    n.id === notificationId ? { ...n, is_read: true } : n
                )
            );
            
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

    // Hàm đánh dấu tất cả thông báo hiển thị là đã đọc
    const markAllAsRead = async () => {
        try {
            const token = await AsyncStorage.getItem('token');
            if (!token) {
                setErrorMsg('Không tìm thấy token xác thực!');
                return;
            }

            console.log('>>> Notifications.js - Marking all displayed notifications as read');
            const api = authApis(token);
            const unreadNotifications = notifications.filter(n => !n.is_read);
            
            if (unreadNotifications.length === 0) {
                console.log('>>> Notifications.js - No unread notifications to mark');
                return;
            }

            const markPromises = unreadNotifications.map(n =>
                api.post(endpoints.markNotificationAsRead(n.id), {}, {
                    headers: { 'Authorization': `Bearer ${token}` },
                })
            );

            const responses = await Promise.all(markPromises);
            console.log('>>> Notifications.js - Mark all as read responses:', responses);

            setNotifications((prev) =>
                prev.map((n) => !n.is_read ? { ...n, is_read: true } : n)
            );
            
            if (typeof onUpdateUnreadCount === 'function') {
                console.log('>>> Notifications.js - Calling onUpdateUnreadCount');
                onUpdateUnreadCount();
            }
            
            setErrorMsg(null);
        } catch (err) {
            setErrorMsg('Không thể đánh dấu tất cả thông báo là đã đọc.');
            console.error('>>> Notifications.js - Lỗi khi đánh dấu tất cả thông báo:', {
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
        <TouchableOpacity
            activeOpacity={item.notification_type === 'reply' && item.event ? 0.7 : 1}
            onPress={() => handleNotificationPress(item)}
        >
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
        </TouchableOpacity>
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
        <View style={[styles.container, { flex: 1, maxHeight: '100%' }]}>
            <View style={styles.header}>
                <View style={styles.headerTitle}>
                    <Icon name="bell" size={24} color={colors.bluePrimary} style={styles.headerIcon} />
                    <Text style={styles.headerText}>Thông Báo</Text>
                </View>
                <View style={styles.headerActions}>
                    {unreadNotifications > 0 && (
                        <Button
                            mode="text"
                            onPress={markAllAsRead}
                            style={styles.markAllButton}
                            icon="check-circle-outline"
                            contentStyle={styles.markAllButtonContent}
                        >
                            Đánh Dấu Tất Cả
                        </Button>
                    )}
                    {/* <TouchableOpacity onPress={onClose}>
                        <Icon name="close" size={24} color={colors.blueGray} />
                    </TouchableOpacity> */}
                </View>
            </View>

            {unreadNotifications > 0 && (
                <View style={styles.unreadBanner}>
                    <Icon name="bell-ring" size={18} color={colors.bluePrimary} style={styles.unreadIcon} />
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
                    <ActivityIndicator size="large" color={colors.bluePrimary} />
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
                    style={{ flex: 1 }}
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
                <ActivityIndicator size="small" color={colors.bluePrimary} style={styles.loadingMore} />
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.white,
        borderRadius: 12,
    },
    centeredContainer: {
        flex: 1,
        padding: 20,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.white,
        borderRadius: 12,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: colors.grayMedium,
    },
    headerTitle: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    headerActions: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    headerIcon: {
        marginRight: 8,
    },
    headerText: {
        fontSize: 18,
        fontWeight: 'bold',
        color: colors.navy,
    },
    markAllButton: {
        marginRight: 12,
    },
    markAllButtonContent: {
        flexDirection: 'row-reverse',
    },
    unreadBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.blueLight,
        paddingVertical: 10,
        paddingHorizontal: 16,
        marginHorizontal: 16,
        marginTop: 12,
        borderRadius: 8,
    },
    unreadIcon: {
        marginRight: 8,
    },
    unreadText: {
        color: colors.bluePrimary,
        fontSize: 14,
    },
    errorBanner: {
        backgroundColor: colors.redError,
        paddingVertical: 10,
        paddingHorizontal: 16,
        marginHorizontal: 16,
        marginTop: 12,
        borderRadius: 8,
    },
    errorText: {
        color: colors.white,
        fontSize: 14,
        textAlign: 'center',
    },
    loadingContainer: {
        flex: 1,
        padding: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    loadingText: {
        color: colors.blueGray,
        marginTop: 12,
        textAlign: 'center',
    },
    emptyContainer: {
        flex: 1,
        padding: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    emptyText: {
        color: colors.blueGray,
        fontSize: 16,
        textAlign: 'center',
    },
    listContent: {
        paddingVertical: 16,
        paddingHorizontal: 16,
    },
    notificationCard: {
        marginBottom: 12,
        borderRadius: 8,
        elevation: Platform.OS === 'android' ? 4 : 0,
        backgroundColor: colors.white,
        ...Platform.select({
            ios: {
                shadowColor: colors.black,
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 4,
            },
        }),
    },
    readNotification: {
        backgroundColor: colors.grayLightest,
        elevation: Platform.OS === 'android' ? 2 : 0,
        ...Platform.select({
            ios: {
                shadowOpacity: 0.05,
            },
        }),
    },
    notificationTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: colors.navy,
        marginBottom: 6,
    },
    notificationMessage: {
        fontSize: 14,
        color: colors.blueGray,
        marginBottom: 8,
    },
    notificationTime: {
        fontSize: 12,
        color: colors.blueGray,
        marginBottom: 6,
    },
    notificationEvent: {
        fontSize: 12,
        color: colors.blueGray,
        marginBottom: 8,
    },
    markReadButton: {
        marginTop: 10,
        backgroundColor: colors.bluePrimary,
        borderRadius: 8,
    },
    loadMoreButton: {
        margin: 16,
        borderColor: colors.bluePrimary,
        borderRadius: 8,
    },
    loadingMore: {
        marginVertical: 16,
    },
    closeButton: {
        marginTop: 16,
        backgroundColor: colors.bluePrimary,
        borderRadius: 8,
    },
});

export default Notifications;