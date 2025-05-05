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
} from "react-native";
import { Button } from "react-native-paper";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import Apis, { endpoints, authApis } from "../../configs/Apis";
import AsyncStorage from "@react-native-async-storage/async-storage";
// thêm bản đồ
import MapView, { Marker } from "react-native-maps";
import { useNavigation } from "@react-navigation/native";
import { MyUserContext } from "../../configs/MyContexts";
import MyStyles, { colors } from "../../styles/MyStyles";
import FontAwesome from "react-native-vector-icons/FontAwesome";

const EventDetails = ({ route }) => {
  const navigation = useNavigation();
  const { event } = route.params;
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
        rating: rating, // Đã là number
        comment: comment.trim(),
      };
      console.log("Payload gửi đi:", payload);
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
      setReviewError("Gửi đánh giá thất bại. Vui lòng thử lại.");
    } finally {
      setSubmittingReview(false);
    }
  };

  // Component StarRating
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

  const fetchEventDetail = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = await AsyncStorage.getItem("token");
      console.log("Token:", token);
      //Kết hợp kiểm tra token từ asyncStorage và user context
      if (!user || !token) {
        setError("Vui lòng đăng nhập để xem chi tiết sự kiện.");
        console.log("User token không tồn tại. Chuyển hướng");
        setLoading(false);

        setTimeout(() => {
          navigation.reset({
            index: 0,
            routes: [{ name: "loginStack" }],
          });
        }, 2000);

        return;
      }

      const api = token ? authApis(token) : Apis;
      const res = await api.get(endpoints.eventDetail(event.id));

      setEventDetail(res.data);
      //Cách 1: Lấy reviews từ eventDetailserializer do có trả reviews về
      // setReviews(res.data.reviews || []);

      //Cách 2: Lấy reviews từ API riêng=> có thể áp dụng phân trang đã thiết lập trong ReviewViewSet
      const reviewsRes = await api.get(endpoints.getEventReviews(event.id));
      setReviews(reviewsRes.data.results || []);
    } catch (err) {
      setError("Không thể tải chi tiết sự kiện.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEventDetail();
  }, [event.id, navigation]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#1a73e8" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={{ color: "red" }}>{error}</Text>
      </View>
    );
  }

  if (!eventDetail) {
    return (
      <View style={styles.center}>
        <Text>Không có dữ liệu sự kiện.</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {eventDetail.poster && (
        <Image source={{ uri: eventDetail.poster }} style={styles.poster} />
      )}
      <Text style={styles.title}>{eventDetail.title}</Text>
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
          text={`Giá vé: ${
            eventDetail.ticket_price ? eventDetail.ticket_price + " VND" : "N/A"
          }`}
        />
      </View>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Tags</Text>
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
        <Text style={styles.description}>{eventDetail.description}</Text>
      </View>
      {eventDetail.latitude && eventDetail.longitude && (
        <View style={styles.mapContainer}>
          <View style={styles.mapHeader}>
            <Text style={styles.sectionTitle}>Vị trí trên bản đồ</Text>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Text
                style={styles.openMapButton}
                onPress={() =>
                  openInGoogleMaps(eventDetail.latitude, eventDetail.longitude)
                }
              >
                Open in map <Icon name="map-marker" size={18} color="#1a73e8" />
              </Text>
              <TouchableOpacity onPress={centerMap} style={{ marginLeft: 12 }}>
                <Icon name="crosshairs-gps" size={22} color="#1a73e8" />
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
              onPress={() =>
                openInGoogleMaps(eventDetail.latitude, eventDetail.longitude)
              }
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
          >
            Đặt vé ngay!
          </Button>
        </View>
      )}
      {/* Review Section */}
      <View style={styles.reviewSection}>
        <Text style={styles.sectionTitle}>Đánh giá sự kiện</Text>
        {reviewLoading && <ActivityIndicator size="small" color="#1a73e8" />}
        {reviewError && <Text style={styles.errorText}>{reviewError}</Text>}
        {/* Add Review Form */}
        {user && user.username ? (
          <View>
            <Text style={styles.formLabel}>Thêm đánh giá của bạn</Text>
            {/* Thay thế TextInput bằng StarRating */}
            <StarRating rating={rating} onRatingChange={setRating} />
            <TextInput
              style={[styles.input, { height: 80 }]}
              placeholder="Bình luận (tùy chọn)"
              multiline
              value={comment}
              onChangeText={setComment}
            />
            <Button
              mode="contained"
              onPress={submitReview}
              loading={submittingReview}
              disabled={submittingReview || rating === 0}
              buttonColor={colors.blueAccent}
              style={{ marginBottom: 20 }}
            >
                Gửi đánh giá
            </Button>
          </View>
        ) : (
          <Text
            style={styles.loginPrompt}
            onPress={() => navigation.navigate("loginStack")}
          >
            Vui lòng đăng nhập để thêm đánh giá.
          </Text>
        )}
        {/* Review List - Cập nhật hiển thị sao */}
        {reviews.length === 0 ? (
          <Text style={styles.noReviewsText}>Chưa có đánh giá nào.</Text>
        ) : (
          reviews.map((review) => (
            <View key={review.id} style={styles.reviewItem}>
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
  );
};

// Component phụ: Hiển thị dòng icon + nội dung
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
    marginBottom: 12,
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
    color: "#1a73e8",
    fontWeight: "600",
    fontSize: 14,
    flexDirection: "row",
    alignItems: "center",
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
  //   reviewContent: {
  //     marginLeft: 50,
  //     marginTop: 8,
  //   },
  //   reviewRating: {
  //     fontWeight: 'bold',
  //     color: '#1a73e8',
  //   },
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
    color: "#1a73e8",
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
  },
});

export default EventDetails;
