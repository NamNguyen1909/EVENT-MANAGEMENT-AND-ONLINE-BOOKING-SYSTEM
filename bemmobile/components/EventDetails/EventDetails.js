import React from 'react';
import { View, Text } from 'react-native';

const EventDetails = ({ route }) => {
  const { event } = route.params;
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text>Event Details: {event.title}</Text>
    </View>
  );
};

export default EventDetails;