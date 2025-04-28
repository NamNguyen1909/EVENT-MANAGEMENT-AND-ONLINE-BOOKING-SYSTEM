// import { StatusBar } from 'expo-status-bar';
// import { StyleSheet, Text, View } from 'react-native';

// export default function App() {
//   return (
//     <View style={styles.container}>
//       <Text>Open up App.js to start working on your app!</Text>
//       <StatusBar style="auto" />
//     </View>
//   );
// }

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     backgroundColor: '#fff',
//     alignItems: 'center',
//     justifyContent: 'center',
//   },
// });


import React, { useReducer } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Provider as PaperProvider } from 'react-native-paper';
import { Icon } from 'react-native-paper';
import Home from './components/Home/Home';
import EventDetails from './components/EventDetails/EventDetails';
import Login from './components/User/Login';
import Register from './components/User/Register';
import Profile from './components/User/Profile';
import { MyUserContext, MyDispatchContext } from './configs/MyContexts';
import MyUserReducer from './reducers/MyUserReducer';

// Stack Navigator cho tab "Events"
const Stack = createNativeStackNavigator();
const StackNavigator = () => {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="HomeScreen"
        component={Home}
        options={{ title: 'Events' }}
      />
      <Stack.Screen
        name="EventDetails"
        component={EventDetails}
        options={{ title: 'Event Details' }}
      />
    </Stack.Navigator>
  );
};

// Bottom Tab Navigator
const Tab = createBottomTabNavigator();
const TabNavigator = () => {
  const user = React.useContext(MyUserContext);

  return (
    <Tab.Navigator screenOptions={{ headerShown: true }}>
      <Tab.Screen
        name="events"
        component={StackNavigator}
        options={{
          title: 'Events',
          tabBarIcon: () => <Icon size={30} source="calendar" />,
        }}
      />

      {user === null ? (
        <>
          <Tab.Screen
            name="login"
            component={Login}
            options={{
              title: 'Login',
              tabBarIcon: () => <Icon size={30} source="account" />,
            }}
          />
          <Tab.Screen
            name="register"
            component={Register}
            options={{
              title: 'Register',
              tabBarIcon: () => <Icon size={30} source="account-plus" />,
            }}
          />
        </>
      ) : (
        <Tab.Screen
          name="profile"
          component={Profile}
          options={{
            title: 'Profile',
            tabBarIcon: () => <Icon size={30} source="account" />,
          }}
        />
      )}
    </Tab.Navigator>
  );
};

// App chính
const App = () => {
  const [user, dispatch] = useReducer(MyUserReducer, null);

  return (
    <MyUserContext.Provider value={user}>
      <MyDispatchContext.Provider value={dispatch}>
        <PaperProvider>
          <NavigationContainer>
            <TabNavigator />
          </NavigationContainer>
        </PaperProvider>
      </MyDispatchContext.Provider>
    </MyUserContext.Provider>
  );
};

export default App;