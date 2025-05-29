import React, { useEffect, useState, useContext, useRef } from "react";
import {
  View,
  Text,
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Image,
  Linking,
  Alert,
  TouchableOpacity,
  TextInput,
  Modal,
  Pressable,
} from "react-native";
import { Button } from "react-native-paper";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import Apis, { endpoints, authApis, websocketEndpoints } from "../../configs/Apis";
import AsyncStorage from "@react-native-async-storage/async-storage";
import MapView, { Marker } from "react-native-maps";
import { useNavigation } from "@react-navigation/native";
import { MyUserContext } from "../../configs/MyContexts";
import { colors } from "../../styles/MyStyles";
import FontAwesome from "react-native-vector-icons/FontAwesome";
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Dimensions } from "react-native";
import { MaterialIcons } from '@expo/vector-icons';
import RenderHtml from "react-native-render-html";
import Toast from 'react-native-toast-message';

const EventDetails = ({ route }) => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { event } = route?.params || {}; // Kiểm tra an toàn
  const [eventDetail, setEventDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const user = useContext(MyUserContext);
  const mapRef = useRef(null);
  const [reviews, setReviews] = useState([]);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [reviewError, setReviewError] = useState(null);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);
  const [editingReview, setEditingReview] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedReview, setSelectedReview] = useState(null);
  const [chatParticipants, setChatParticipants] = useState([]);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [ws, setWs] = useState(null);

  useEffect(() => {
    if (!event?.id) {
      setError("Không tìm thấy thông tin sự kiện.");
      setLoading(false);
      return;
    }

    fetchEventDetail();
    connectWebSocket();

    return () => ws?.close();
  }, [event?.id]);

  const fetchEventDetail = async (retries = 2) => {
    try {
      setLoading(true);
      setError(null);
      const token = await AsyncStorage.getItem("token");
      if (!user || !token) {
        setError("Vui lòng đăng nhập để xem chi tiết sự kiện.");
        setLoading(false);
        navigation.navigate("loginStack");
        return;
      }

      const api = authApis(token);
      const [eventRes, reviewsRes, messagesRes] = await Promise.all([
        api.get(endpoints.eventDetail(event.id)),
        api.get(endpoints.getEventReviews(event.id)),
        api.get(endpoints.eventChatMessages(event.id)),
      ]);
      setEventDetail(eventRes.data);
      setReviews(reviewsRes.data.results || []);
      setChatParticipants(messagesRes.data.results[0]?.participants || []);
      setUnreadMessages(messagesRes.data.results.filter(m => !m.is_read && m.user_info?.username !== user?.username).length);
    } catch (err) {
      console.error('Fetch event detail error:', err);
      if (err.response?.status === 401 && retries > 0) {
        // Retry with new token
        const refreshToken = await AsyncStorage.getItem('refresh_token');
        if (refreshToken) {
          try {
            const newToken = await refreshAccessToken(refreshToken);
            await AsyncStorage.setItem('token', newToken);
            return fetchEventDetail(retries - 1);
          } catch (refreshErr) {
            navigation.navigate("loginStack");
          }
        }
      } else {
        setError("Không thể tải chi tiết sự kiện. Vui lòng thử lại.");
      }
    } finally {
      setLoading(false);
    }
  };

  const connectWebSocket = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) return;

      const wsUrl = `${websocketEndpoints.chat(event.id)}?token=${token}`;
      const websocket = new WebSocket(wsUrl);

      websocket.onmessage = (e) => {
        const data = JSON.parse(e.data);
        if (data.message && data.username !== user?.username) {
          setUnreadMessages(prev => prev + 1);
          Toast.show({
            type: 'info',
            text1: `Tin nhắn mới`,
            text2: `${data.username}: ${data.message}`,
          });
        }
      };

      websocket.onerror = () => console.error('WebSocket error for event', event.id);
      websocket.onclose = () => console.log('WebSocket closed for event', event.id);

      setWs(websocket);
    } catch (err) {
      console.error('WebSocket connection error:', err);
    }
  };

  const openInGoogleMaps = (latitude, longitude) => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`;
    Linking.openURL(url).catch((err) => {
      Alert.alert("Lỗi", "Không thể mở Google Maps");
      console.error(err);
    });
  };

  const centerMap = () => {
    if (mapRef.current && eventDetail) {
      mapRef.current.animateToRegion(
        {
          latitude: eventDetail.latitude,
          longitude: eventDetail.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        },
        500
      );
    }
  };

  const handleChatPress = async () => {
    if (!user || !user.username) {
      navigation.navigate('loginStack');
      return;
    }
    if (!eventDetail?.id) {
      Toast.show({
        type: 'error',
        text1: 'Lỗi',
        text2: 'Không tìm thấy ID sự kiện.',
      });
      return;
    }
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        Toast.show({
          type: 'error',
          text1: 'Lỗi',
          text2: 'Không tìm thấy token xác thực!',
        });
        navigation.navigate('loginStack');
        return;
      }
      const api = authApis(token);
      const eventRes = await api.get(endpoints.eventDetail(eventDetail.id));
      const ticketsRes = await api.get(endpoints.userTickets);
      const hasTicket = ticketsRes.data.some(t => t.event.id === eventDetail.id && t.is_paid);
      const isOrganizer = user.role === 'organizer' && eventRes.data.organizer.id === user.id;
      if (!hasTicket && !isOrganizer) {
        Toast.show({
          type: 'error',
          text1: 'Lỗi',
          text2: 'Bạn cần mua vé để tham gia chat.',
        });
        return;
      }
      setUnreadMessages(0);
      navigation.navigate('chat', { eventId: eventDetail.id });
    } catch (error) {
      console.error('Lỗi kiểm tra quyền chat:', error);
      Toast.show({
        type: 'error',
        text1: 'Lỗi',
        text2: 'Không thể truy cập phòng chat.',
      });
    }
  };

  const submitReview = async () => {
    if (rating === 0) {
      Alert.alert("Lỗi", "Vui lòng chọn số sao đánh giá.");
      return;
    }
    setSubmittingReview(true);
    setReviewError(null);
    try {
      const token = await AsyncStorage.getItem("token");
      if (!token) {
        Alert.alert("Lỗi", "Bạn cần đăng nhập để gửi đánh giá.");
        return;
      }
      const api = authApis(token);
      const payload = {
        user: user.id,
        event: parseInt(eventDetail.id),
        rating: rating,
        comment: comment.trim(),
      };
      const res = await api.post(endpoints.createReview, payload);
      setReviews((prev) => [
        res.data,
        ...prev.filter((r) => r.id !== res.data.id),
      ]);
      setRating(0);
      setComment("");
      Alert.alert("Thành công", "Đánh giá của bạn đã được gửi.");
    } catch (err) {
      console.error(err);
      if (err.response?.status === 400 && err.response.data?.detail?.includes("Bạn đã có đánh giá")) {
        setReviewError("Bạn đã đánh giá sự kiện này rồi.");
      } else {
        setReviewError("Gửi đánh giá thất bại. Vui lòng thử lại.");
      }
    } finally {
      setSubmittingReview(false);
    }
  };

  const updateReview = async () => {
    if (rating === 0) {
      Alert.alert("Lỗi", "Vui lòng chọn số sao đánh giá.");
      return;
    }
    setSubmittingReview(true);
    try {
      const token = await AsyncStorage.getItem("token");
      if (!token) {
        Alert.alert("Lỗi", "Bạn cần đăng nhập để chỉnh sửa đánh giá.");
        return;
      }
      const api = authApis(token);
      const payload = {
        rating: rating,
        comment: comment.trim(),
      };
      const res = await api.patch(endpoints.updateReview(editingReview.id), payload);
      setReviews(prev => prev.map(r => r.id === editingReview.id ? res.data : r));
      setEditingReview(null);
      setRating(0);
      setComment("");
      Alert.alert("Thành công", "Đánh giá đã được cập nhật.");
    } catch (err) {
      console.error(err);
      Alert.alert("Lỗi", "Cập nhật đánh giá thất bại. Vui lòng thử lại.");
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleDeleteReview = async (reviewId) => {
    Alert.alert(
      "Xóa đánh giá",
      "Bạn có chắc muốn xóa đánh giá này?",
      [
        { text: "Hủy", style: "cancel" },
        {
          text: "Xóa",
          style: "destructive",
          onPress: async () => {
            try {
              const token = await AsyncStorage.getItem("token");
              if (!token) {
                Alert.alert("Lỗi", "Bạn cần đăng nhập để thực hiện thao tác này.");
                return;
              }
              const api = authApis(token);
              await api.delete(endpoints.deleteReview(reviewId));
              setReviews(prev => prev.filter(r => r.id !== reviewId));
              Alert.alert("Thành công", "Đánh giá đã được xóa.");
            } catch (err) {
              console.error(err);
              Alert.alert("Lỗi", "Xóa đánh giá thất bại. Vui lòng thử lại.");
            } finally {
              setModalVisible(false);
            }
          },
        },
      ]
    );
  };

  const handleEditReview = (review) => {
    setEditingReview(review);
    setRating(review.rating);
    setComment(review.comment);
    setModalVisible(false);
  };

  const ReviewMenu = ({ review }) => {
    if (!user || user.id !== (typeof review.user === 'object' ? review.user.id : review.user)) {
      return null;
    }

    return (
      <View style={styles.menuContainer}>
        <TouchableOpacity 
          onPress={() => {
            setSelectedReview(review);
            setModalVisible(true);
          }}
        >
          <Icon name="dots-vertical" size={24} color="#666" />
        </TouchableOpacity>
        <Modal
          animationType="fade"
          transparent={true}
          visible={modalVisible && selectedReview?.id === review.id}
          onRequestClose={() => setModalVisible(false)}
        >
          <Pressable 
            style={styles.modalOverlay} 
            onPress={() => setModalVisible(false)}
          >
            <View style={styles.menuModal}>
              <TouchableOpacity 
                style={styles.menuItem}
                onPress={() => handleEditReview(review)}
              >
                <Text style={styles.menuText}>Sửa đánh giá</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.menuItem, styles.deleteItem]}
                onPress={() => handleDeleteReview(review.id)}
              >
                <Text style={styles.menuText}>Xóa đánh giá</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Modal>
      </View>
    );
  };

  const StarRating = ({ rating, onRatingChange }) => {
    return (
      <View style={styles.starContainer}>
        {[1, 2, 3, 4, 5].map((star) => (
          <TouchableOpacity
            key={star}
            onPress={() => onRatingChange(star)}
            activeOpacity={0.7}
          >
            <FontAwesome
              name={star <= rating ? "star" : "star-o"}
              size={32}
              color="#f1c40f"
            />
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.bluePrimary} />
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

  if (!eventDetail) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Không có dữ liệu sự kiện.</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1 }} edges={['top']}>
      <ScrollView style={styles.container}>
        {eventDetail.poster && (
          <Image source={{ uri: eventDetail.poster }} style={styles.poster} />
        )}
        <View style={styles.header}>
          <Text style={styles.title}>{eventDetail.title}</Text>
          <TouchableOpacity onPress={handleChatPress} style={styles.chatIcon}>
            <MaterialIcons name="chat-bubble-outline" size={28} color={colors.bluePrimary} />
            {unreadMessages > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{unreadMessages}</Text>
              </View>
            )}
            <Text style={styles.chatInfo}>
              {chatParticipants.length} người tham gia
            </Text>
          </TouchableOpacity>
        </View>
        <View style={styles.section}>
          <InfoRow icon="tag" text={eventDetail.category} />
          <InfoRow icon="map-marker" text={eventDetail.location} />
          <InfoRow
            icon="calendar"
            text={`Bắt đầu: ${new Date(eventDetail.start_time).toLocaleString()}`}
          />
          <InfoRow
            icon="calendar"
            text={`Kết thúc: ${new Date(eventDetail.end_time).toLocaleString()}`}
          />
          <InfoRow icon="ticket" text={`Tổng vé: ${eventDetail.total_tickets}`} />
          <InfoRow
            icon="ticket-confirmation"
            text={`Đã bán: ${eventDetail.sold_tickets}`}
          />
          <InfoRow
            icon="currency-usd"
            text={`Giá vé: ${eventDetail.ticket_price ? eventDetail.ticket_price + " VND" : "Miễn phí"}`}
          />
        </View>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Thẻ</Text>
          <View style={styles.tagsContainer}>
            {eventDetail.tags && eventDetail.tags.length > 0 ? (
              eventDetail.tags.map((tag, index) => (
                <View key={tag.id ?? index} style={styles.tag}>
                  <Text style={styles.tagText}>{tag.name}</Text>
                </View>
              ))
            ) : (
              <Text style={styles.noTags}>Không có thẻ</Text>
            )}
          </View>
        </View>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Mô tả</Text>
          <RenderHtml
            contentWidth={Dimensions.get("window").width - 32}
            source={{ html: eventDetail.description || "" }}
            baseStyle={styles.description}
          />
        </View>
        {eventDetail.latitude && eventDetail.longitude ? (
          <View style={styles.mapContainer}>
            <View style={styles.mapHeader}>
              <Text style={styles.sectionTitle}>Vị trí trên bản đồ</Text>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <TouchableOpacity
                  onPress={() => openInGoogleMaps(eventDetail.latitude, eventDetail.longitude)}
                >
                  <Text style={styles.openMapButton}>
                    Mở trong Google Maps
                    <Icon name="map-marker" size={18} color={colors.bluePrimary} />
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={centerMap} style={{ marginLeft: 12 }}>
                  <Icon name="crosshairs-gps" size={22} color={colors.bluePrimary} />
                </TouchableOpacity>
              </View>
            </View>
            <MapView
              ref={mapRef}
              style={styles.map}
              initialRegion={{
                latitude: eventDetail.latitude,
                longitude: eventDetail.longitude,
                latitudeDelta: 0.01,
                longitudeDelta: 0.01,
              }}
            >
              <Marker
                coordinate={{
                  latitude: eventDetail.latitude,
                  longitude: eventDetail.longitude,
                }}
                title={eventDetail.title}
                description={eventDetail.location}
                onPress={() => openInGoogleMaps(eventDetail.latitude, eventDetail.longitude)}
              />
            </MapView>
            <Button
              mode="contained"
              onPress={() => {
                if (!user || !user.username) {
                  navigation.navigate("loginStack");
                } else {
                  navigation.navigate("BookTicket", {
                    eventId: eventDetail.id,
                    ticketPrice: eventDetail.ticket_price,
                  });
                }
              }}
              style={{
                marginTop: 20,
                marginHorizontal: 20,
                paddingVertical: 10,
                borderRadius: 8,
              }}
              buttonColor={colors.bluePrimary}
              accessibilityLabel="Đặt vé cho sự kiện"
            >
              <Text style={styles.buttonText}>Đặt vé ngay!</Text>
            </Button>
          </View>
        ) : (
          <Text style={styles.errorText}>Không có thông tin vị trí.</Text>
        )}
        <View style={styles.reviewSection}>
          <Text style={styles.sectionTitle}>Đánh giá sự kiện</Text>
          {reviewLoading && <ActivityIndicator size="small" color={colors.bluePrimary} />}
          {reviewError && <Text style={styles.errorText}>{reviewError}</Text>}
          {user && user.username ? (
            <View>
              <Text style={styles.formLabel}>
                {editingReview ? "Chỉnh sửa đánh giá" : "Thêm đánh giá của bạn"}
              </Text>
              <StarRating rating={rating} onRatingChange={setRating} />
              <TextInput
                style={[styles.input, { height: 80 }]}
                placeholder="Bình luận (tùy chọn)"
                multiline
                value={comment}
                onChangeText={setComment}
                accessibilityLabel="Nhập bình luận đánh giá"
              />
              <View style={styles.buttonGroup}>
                {editingReview && (
                  <Button
                    mode="outlined"
                    onPress={() => {
                      setEditingReview(null);
                      setRating(0);
                      setComment("");
                    }}
                    style={styles.cancelButton}
                    accessibilityLabel="Hủy chỉnh sửa đánh giá"
                  >
                    <Text style={styles.buttonText}>Hủy</Text>
                  </Button>
                )}
                <Button
                  mode="contained"
                  onPress={editingReview ? updateReview : submitReview}
                  loading={submittingReview}
                  disabled={submittingReview || rating === 0}
                  buttonColor={colors.blueAccent}
                  style={styles.submitButton}
                  accessibilityLabel={editingReview ? "Cập nhật đánh giá" : "Gửi đánh giá"}
                >
                  <Text style={styles.buttonText}>{editingReview ? "Cập nhật" : "Gửi đánh giá"}</Text>
                </Button>
              </View>
            </View>
          ) : (
            <TouchableOpacity onPress={() => navigation.navigate("loginStack")}>
              <Text style={styles.loginPrompt}>
                Vui lòng đăng nhập để thêm đánh giá.
              </Text>
            </TouchableOpacity>
          )}
          {reviews.length === 0 ? (
            <Text style={styles.noReviewsText}>Chưa có đánh giá nào.</Text>
          ) : (
            reviews.map((review) => (
              <View key={review.id} style={[
                styles.reviewItem,
                user?.id === (typeof review.user === 'object' ? review.user.id : review.user) && styles.myReview
              ]}>
                <View style={styles.reviewHeader}>
                  {review.user_infor && review.user_infor.avatar ? (
                    <Image
                      source={{ uri: review.user_infor.avatar }}
                      style={styles.avatar}
                    />
                  ) : (
                    <Icon name="account-circle" size={40} color="#888" />
                  )}
                  <View style={styles.userInfo}>
                    <Text style={styles.reviewUsername}>
                      {review.user_infor?.username || "Người dùng"}
                    </Text>
                    <View style={styles.reviewStars}>
                      {[1, 2, 3, 4, 5].map((star) => (
                        <FontAwesome
                          key={star}
                          name={star <= review.rating ? "star" : "star-o"}
                          size={16}
                          color="#f1c40f"
                          style={styles.starIcon}
                        />
                      ))}
                    </View>
                  </View>
                  <ReviewMenu review={review} />
                </View>
                {review.comment ? (
                  <Text style={styles.reviewComment}>{review.comment}</Text>
                ) : null}
                <Text style={styles.reviewDate}>
                  {new Date(review.created_at).toLocaleDateString()}
                </Text>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const InfoRow = ({ icon, text }) => (
  <View style={styles.row}>
    <Icon name={icon} size={20} color="#555" />
    <Text style={styles.detail}>{text}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: "#fff",
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  chatIcon: {
    padding: 10,
    alignItems: 'center',
  },
  poster: {
    width: "100%",
    height: 220,
    borderRadius: 12,
    marginBottom: 16,
  },
  title: {
    fontSize: 26,
    fontWeight: "700",
    color: "#1a1a1a",
    flex: 1,
  },
  section: {
    marginBottom: 16,
  },
  mapContainer: {
    height: 400,
    marginBottom: 16,
    borderRadius: 12,
    overflow: "hidden",
  },
  mapHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
    paddingHorizontal: 8,
  },
  openMapButton: {
    color: colors.bluePrimary,
    fontWeight: "600",
    fontSize: 14,
  },
  map: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#333",
    margin: 10,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  detail: {
    fontSize: 16,
    marginLeft: 8,
    color: "#444",
  },
  tagsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  tag: {
    backgroundColor: "#e0f2f1",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
    marginBottom: 8,
  },
  tagText: {
    fontSize: 14,
    color: "#00796b",
  },
  noTags: {
    fontSize: 14,
    color: "#999",
  },
  description: {
    fontSize: 16,
    color: "#444",
    lineHeight: 22,
  },
  reviewSection: {
    marginTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 20,
    backgroundColor: "#f9f9f9",
    borderRadius: 12,
  },
  reviewItem: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  myReview: {
    borderLeftWidth: 3,
    borderLeftColor: colors.blueSky,
  },
  reviewHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
  },
  reviewUsername: {
    fontWeight: "600",
    fontSize: 15,
    color: "#333",
  },
  reviewComment: {
    marginTop: 4,
    fontSize: 13,
    color: "#555",
  },
  reviewDate: {
    marginTop: 3,
    fontSize: 12,
    color: "#999",
    textAlign: "right",
  },
  formLabel: {
    fontWeight: "600",
    marginBottom: 6,
    fontSize: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 14,
    backgroundColor: "#fff",
    marginBottom: 10,
  },
  errorText: {
    color: "red",
    marginBottom: 10,
  },
  noReviewsText: {
    fontStyle: "italic",
    color: "#666",
    marginBottom: 10,
  },
  loginPrompt: {
    marginTop: 10,
    color: colors.bluePrimary,
    textAlign: "center",
    textDecorationLine: "underline",
  },
  starContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginVertical: 10,
  },
  reviewStars: {
    flexDirection: "row",
    marginTop: 4,
  },
  starIcon: {
    marginRight: 2,
  },
  userInfo: {
    marginLeft: 10,
    flex: 1,
  },
  menuContainer: {
    marginLeft: 'auto',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  menuModal: {
    backgroundColor: 'white',
    borderRadius: 8,
    width: 200,
    overflow: 'hidden',
  },
  menuItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  deleteItem: {
    borderBottomWidth: 0,
  },
  menuText: {
    fontSize: 16,
    textAlign: 'center',
  },
  buttonGroup: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  cancelButton: {
    flex: 1,
    marginRight: 8,
  },
  submitButton: {
    flex: 2,
  },
  badge: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: colors.redAccent,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: 'bold',
  },
  chatInfo: {
    fontSize: 12,
    color: colors.blueGray,
    marginTop: 5,
    textAlign: 'center',
  },
  buttonText: {
    color: colors.white,
    fontSize: 16,
  },
});

export default EventDetails;