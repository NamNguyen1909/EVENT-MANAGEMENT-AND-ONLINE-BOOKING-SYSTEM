import { StyleSheet } from 'react-native';

export const colors = {
  bluePrimary: '#1a73e8',     // Màu xanh chính
  blueDark: '#0d47a1',        // Xanh đậm
  blueLight: '#90caf9',       // Xanh nhạt
  blueSky: '#87ceeb',         // Xanh trời
  blueGray: '#78909c',        // Xanh xám
  blueAccent: '#448aff',      // Xanh nổi bật
  navy: '#001f3f',            // Navy
  redError: '#d32f2f',        // Đỏ cho lỗi
  redAccent: '#FF0000',       // Đỏ cho badge, logout
  orangeAccent: '#FFA500',    // Cam cho deactivate
  greenSuccess: '#4CAF50',    // Xanh lá cho trạng thái đã đọc
  white: '#fff',              // Trắng cho nền
  black: '#000',              // Đen cho bóng
  blackTransparent: 'rgba(0, 0, 0, 0.5)', // Đen trong suốt cho modal
  grayLight: '#f5f5f5',       // Xám nhạt cho nền chính
  grayMedium: '#e0e0e0',      // Xám trung cho placeholder
  grayLightest: '#f0f0f0',    // Xám rất nhạt cho danh mục
  chartBlue: '#36A2EB',       // Xanh cho biểu đồ cột
  chartRed: '#FF6384',        // Đỏ cho biểu đồ đường
  chartYellow: '#FFCE56',     // Vàng cho biểu đồ tròn
  chartGreen: '#4BC0C0',      // Xanh lá cho biểu đồ tròn
  chartPurple: '#9966FF',     // Tím cho biểu đồ tròn
};

const MyStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.grayLight,
  },
  scrollContainer: {
    flex: 1,
    padding: 10,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  wrap: {
    flexWrap: 'wrap',
    marginBottom: 10,
  },
  chip: {
    marginRight: 8,
    marginBottom: 8,
    backgroundColor: colors.grayMedium,
  },
  chipSelected: {
    backgroundColor: colors.bluePrimary,
  },
  chipText: {
    color: colors.navy,
  },
  chipTextSelected: {
    color: colors.white,
  },
  searchbar: {
    marginBottom: 10,
    backgroundColor: colors.white,
    borderRadius: 8,
  },
  eventItem: {
    backgroundColor: colors.white,
    borderRadius: 8,
    padding: 15,
    marginBottom: 10,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
    flexDirection: 'row',
    alignItems: 'center',
  },
  eventImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 10,
  },
  eventContent: {
    flex: 1,
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.bluePrimary,
    marginBottom: 5,
  },
  eventDetail: {
    fontSize: 14,
    color: colors.blueGray,
    marginBottom: 3,
  },
  eventPrice: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.redError,
    marginTop: 3,
  },  
  askContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 15,
  },
  askText: {
    fontSize: 16,
  },
  navigateLink: {
    fontSize: 16,
    color: colors.blueAccent,
    textDecorationLine: 'underline',
  },
});

export default MyStyles;