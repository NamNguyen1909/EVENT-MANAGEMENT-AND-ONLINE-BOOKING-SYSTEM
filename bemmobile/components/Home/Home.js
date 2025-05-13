// components/Home/Home.js
import React from 'react';
import { createDrawerNavigator } from '@react-navigation/drawer';
import MainHome from './MainHome';
import HotEvents from '../Events/HotEvents';
import SuggestEvents from '../Events/SuggestEvents';

const Drawer = createDrawerNavigator();

const Home = () => {
  return (
    <Drawer.Navigator
      screenOptions={{
        headerShown: true,
      }}
    >
      <Drawer.Screen
        name="MainHome"
        component={MainHome}
        options={{ title: 'Home' }}
      />
      <Drawer.Screen
        name="HotEvents"
        component={HotEvents}
        options={{ title: 'Hot Events' }}
      />
      <Drawer.Screen
        name="SuggestEvents"
        component={SuggestEvents}
        options={{ title: 'Suggest Events' }}
      />
    </Drawer.Navigator>
  );
};

export default Home;
