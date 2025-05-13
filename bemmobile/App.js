import React, { useReducer, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Provider as PaperProvider } from 'react-native-paper';
import { Icon } from 'react-native-paper';
import Home from './components/Home/Home';
import EventDetails from './components/Events/EventDetails';
import BookTicket from './components/User/BookTicket';
import Login from './components/User/Login';
import Register from './components/User/Register';
import Profile from './components/User/Profile';
import MyTickets from './components/User/MyTickets';
import Chat from './components/Chat/Chat';
import MyEvents from './components/Organizer/MyEvents';
import CreateEvent from './components/Organizer/CreateEvent';
import Dashboard from './components/Admin/Dashboard';
import ManageUsers from './components/Admin/ManageUsers';
import ManageEvents from './components/Admin/ManageEvents';
import Scan from './components/User/Scan';
import { MyUserContext, MyDispatchContext } from './configs/MyContexts';
import MyUserReducer from './reducers/MyUserReducer';
import AsyncStorage from '@react-native-async-storage/async-storage';
import TicketDetails from './components/User/TicketDetails';
import { SafeAreaProvider } from 'react-native-safe-area-context';

// Stack Navigator cho tab "Events"
const EventsStack = createNativeStackNavigator();
const EventsStackNavigator = () => {
  return (
    <EventsStack.Navigator screenOptions={{ headerShown: false }}>
      <EventsStack.Screen
        name="HomeScreen"
        component={Home}
        options={{ title: 'Events' }}
      />
      <EventsStack.Screen
        name="EventDetails"
        component={EventDetails}
        options={{ title: 'Event Details' }}
      />
      <EventsStack.Screen
        name="BookTicket"
        component={BookTicket}
        options={{ title: 'Đặt vé' }}
      />
    </EventsStack.Navigator>
  );
};

// Stack Navigator cho tab "My Tickets"
const MyTicketsStack = createNativeStackNavigator();
const MyTicketsStackNavigator = () => {
  return (
    <MyTicketsStack.Navigator screenOptions={{ headerShown: false }}>
      <MyTicketsStack.Screen
        name="MyTicketsScreen"
        component={MyTickets}
        options={{ title: 'My Tickets' }}
      />
      <MyTicketsStack.Screen
        name="MyTicketDetails"
        component={TicketDetails}
        options={{ title: 'Ticket detail' }}
      />
    </MyTicketsStack.Navigator>
  );
};

// Stack Navigator cho tab "Chat"
const ChatStack = createNativeStackNavigator();
const ChatStackNavigator = () => {
  return (
    <ChatStack.Navigator screenOptions={{ headerShown: false }}>
      <ChatStack.Screen
        name="ChatScreen"
        component={Chat}
        options={{ title: 'Chat' }}
      />
    </ChatStack.Navigator>
  );
};

// Stack Navigator cho tab "My Events"
const MyEventsStack = createNativeStackNavigator();
const MyEventsStackNavigator = () => {
  return (
    <MyEventsStack.Navigator screenOptions={{ headerShown: false }}>
      <MyEventsStack.Screen
        name="MyEventsScreen"
        component={MyEvents}
        options={{ title: 'My Events' }}
      />
    </MyEventsStack.Navigator>
  );
};

// Stack Navigator cho tab "Create Event"
const CreateEventStack = createNativeStackNavigator();
const CreateEventStackNavigator = () => {
  return (
    <CreateEventStack.Navigator screenOptions={{ headerShown: false }}>
      <CreateEventStack.Screen
        name="CreateEventScreen"
        component={CreateEvent}
        options={{ title: 'Create Event' }}
      />
    </CreateEventStack.Navigator>
  );
};

// Stack Navigator cho tab "Dashboard"
const DashboardStack = createNativeStackNavigator();
const DashboardStackNavigator = () => {
  return (
    <DashboardStack.Navigator screenOptions={{ headerShown: false }}>
      <DashboardStack.Screen
        name="DashboardScreen"
        component={Dashboard}
        options={{ title: 'Dashboard' }}
      />
    </DashboardStack.Navigator>
  );
};

// Stack Navigator cho tab "Manage Users"
const ManageUsersStack = createNativeStackNavigator();
const ManageUsersStackNavigator = () => {
  return (
    <ManageUsersStack.Navigator screenOptions={{ headerShown: false }}>
      <ManageUsersStack.Screen
        name="ManageUsersScreen"
        component={ManageUsers}
        options={{ title: 'Manage Users' }}
      />
    </ManageUsersStack.Navigator>
  );
};

// Stack Navigator cho tab "Manage Events"
const ManageEventsStack = createNativeStackNavigator();
const ManageEventsStackNavigator = () => {
  return (
    <ManageEventsStack.Navigator screenOptions={{ headerShown: false }}>
      <ManageEventsStack.Screen
        name="ManageEventsScreen"
        component={ManageEvents}
        options={{ title: 'Manage Events' }}
      />
    </ManageEventsStack.Navigator>
  );
};

// Stack Navigator cho tab "Staff"
const StaffStack = createNativeStackNavigator();
const StaffStackNavigator = () => {
  return (
    <StaffStack.Navigator screenOptions={{ headerShown: false }}>
      <StaffStack.Screen
        name="ScanScreen"
        component={Scan}
        options={{ title: 'Scan' }}
      />
    </StaffStack.Navigator>
  );
};

// Bottom Tab Navigator cho người dùng chưa xác thực
const UnauthTab = createBottomTabNavigator();
const UnauthTabNavigator = () => {
  return (
    <UnauthTab.Navigator screenOptions={{ headerShown: false }}>
      <UnauthTab.Screen
        name="home"
        component={EventsStackNavigator}
        options={{
          title: 'Home',
          tabBarIcon: () => <Icon size={30} source="calendar" />,
        }}
      />
      <UnauthTab.Screen
        name="loginStack"
        component={LoginStackNavigator}
        options={{
          title: 'Login',
          tabBarIcon: () => <Icon size={30} source="account" />,
        }}
      />
    </UnauthTab.Navigator>
  );
};

// Stack Navigator cho Login và Register
const LoginStack = createNativeStackNavigator();
const LoginStackNavigator = () => {
  return (
    <LoginStack.Navigator screenOptions={{ headerShown: false }}>
      <LoginStack.Screen
        name="login"
        component={Login}
        options={{ title: 'Login' }}
      />
      <LoginStack.Screen
        name="register"
        component={Register}
        options={{ title: 'Register' }}
      />
    </LoginStack.Navigator>
  );
};

// Khởi tạo Bottom Tab Navigator
const Tab = createBottomTabNavigator();

// Hàm tạo cấu hình tab chung
const createTabScreen = (name, component, title, icon) => (
  <Tab.Screen
    name={name}
    component={component}
    options={{
      title,
      tabBarIcon: () => <Icon size={30} source={icon} />,
    }}
  />
);

// Tabs cho người dùng chưa xác thực
const UnauthenticatedTabs = () => <UnauthTabNavigator />;

// Tabs cho nhân viên (Staff)
const StaffTabs = () => (
  <Tab.Navigator screenOptions={{ headerShown: false }}>
    {createTabScreen('scan', StaffStackNavigator, 'Scan', 'qrcode-scan')}
    {createTabScreen('profile', Profile, 'Profile', 'account')}
  </Tab.Navigator>
);

// Tabs cho khách tham gia (Attendee)
const AttendeeTabs = () => (
  <Tab.Navigator screenOptions={{ headerShown: false }}>
    {createTabScreen('events', EventsStackNavigator, 'Home', 'calendar')}
    {createTabScreen('myTickets', MyTicketsStackNavigator, 'My Tickets', 'ticket')}
    {createTabScreen('chat', ChatStackNavigator, 'Chat', 'chat')}
    {createTabScreen('profile', Profile, 'Profile', 'account')}
  </Tab.Navigator>
);

// Tabs cho nhà tổ chức (Organizer)
const OrganizerTabs = () => (
  <Tab.Navigator screenOptions={{ headerShown: false }}>
    {createTabScreen('events', EventsStackNavigator, 'Home', 'calendar')}
    {createTabScreen('myEvents', MyEventsStackNavigator, 'My Events', 'calendar-check')}
    {createTabScreen('createEvent', CreateEventStackNavigator, 'Create Event', 'calendar-plus')}
    {createTabScreen('chat', ChatStackNavigator, 'Chat', 'chat')}
    {createTabScreen('profile', Profile, 'Profile', 'account')}
  </Tab.Navigator>
);

// Tabs cho quản trị viên (Admin)
const AdminTabs = () => (
  <Tab.Navigator screenOptions={{ headerShown: false }}>
    {createTabScreen('dashboard', DashboardStackNavigator, 'Dashboard', 'view-dashboard')}
    {createTabScreen('manageUsers', ManageUsersStackNavigator, 'Manage Users', 'account-group')}
    {createTabScreen('manageEvents', ManageEventsStackNavigator, 'Manage Events', 'calendar-multiple')}
    {createTabScreen('profile', Profile, 'Profile', 'account')}
  </Tab.Navigator>
);

// Tabs mặc định cho vai trò không xác định
const DefaultTabs = () => (
  <Tab.Navigator screenOptions={{ headerShown: false }}>
    {createTabScreen('events', EventsStackNavigator, 'Home', 'calendar')}
    {createTabScreen('profile', Profile, 'Profile', 'account')}
  </Tab.Navigator>
);

// Bottom Tab Navigator chính
const TabNavigator = () => {
  const user = React.useContext(MyUserContext);
  console.log('User:', user); // Debug giá trị user

  if (user === null) {
    return <UnauthenticatedTabs />;
  }

  if (user.is_staff && user.role === 'attendee') {
    return <StaffTabs />;
  }

  const role = user.role || 'default';
  switch (role) {
    case 'attendee':
      return <AttendeeTabs />;
    case 'organizer':
      return <OrganizerTabs />;
    case 'admin':
      return <AdminTabs />;
    default:
      return <DefaultTabs />;
  }
};

// App chính
const App = () => {
  const [user, dispatch] = useReducer(MyUserReducer, null);

  // Xóa token cũ khi ứng dụng khởi động (bỏ comment nếu cần)
  /*
  useEffect(() => {
    const clearTokenOnAppStart = async () => {
      try {
        await AsyncStorage.removeItem('token');
        console.log('Token removed on app start');
        dispatch({ type: 'LOGOUT' });
        const stillThere = await AsyncStorage.getItem('token');
        console.log('Check token after removal:', stillThere);
      } catch (error) {
        console.log('Error removing token on start:', error);
      }
    };
    clearTokenOnAppStart();
  }, []);
  */

  return (
    <SafeAreaProvider>
      <MyUserContext.Provider value={user}>
        <MyDispatchContext.Provider value={dispatch}>
          <PaperProvider>
            <NavigationContainer>
              <TabNavigator />
            </NavigationContainer>
          </PaperProvider>
        </MyDispatchContext.Provider>
      </MyUserContext.Provider>
    </SafeAreaProvider>
  );
};

export default App;