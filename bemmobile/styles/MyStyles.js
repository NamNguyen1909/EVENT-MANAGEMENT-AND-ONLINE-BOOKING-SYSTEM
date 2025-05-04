import { StyleSheet } from 'react-native';

export const colors = {
  bluePrimary: '#1a73e8',     // Màu xanh chính
  blueDark: '#0d47a1',        // Xanh đậm
  blueLight: '#90caf9',       // Xanh nhạt
  blueSky: '#87ceeb',         // Xanh trời
  blueGray: '#78909c',        // Xanh xám
  blueAccent: '#448aff',      // Xanh nổi bật
  navy: '#001f3f',            // Navy
};

const MyStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
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
    backgroundColor: '#e0e0e0',
  },
  chipSelected: {
    backgroundColor: colors.bluePrimary,
  },
  chipText: {
    color: '#333',
  },
  chipTextSelected: {
    color: '#fff',
  },
  searchbar: {
    marginBottom: 10,
    backgroundColor: '#fff',
    borderRadius: 8,
  },
  eventItem: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 15,
    marginBottom: 10,
    shadowColor: '#000',
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
    color: '#666',
    marginBottom: 3,
  },
  eventPrice: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#d32f2f',
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
