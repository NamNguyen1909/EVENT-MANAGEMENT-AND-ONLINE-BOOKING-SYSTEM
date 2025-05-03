import React, { useReducer } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Provider as PaperProvider } from 'react-native-paper';
import { Icon } from 'react-native-paper';
import Home from './components/Home/Home';
import EventDetails from './components/EventDetails/EventDetails';
import BookTicket from './components/User/BookTicket';
import Login from './components/User/Login';
import Register from './components/User/Register';
import Profile from './components/User/Profile';
import MyTickets from './components/User/MyTickets'; // Giả định màn hình MyTickets
import Chat from './components/Chat/Chat'; // Giả định màn hình Chat
import MyEvents from './components/Organizer/MyEvents'; // Giả định màn hình MyEvents
import CreateEvent from './components/Organizer/CreateEvent'; // Giả định màn hình CreateEvent
import Dashboard from './components/Admin/Dashboard'; // Giả định màn hình Dashboard
import ManageUsers from './components/Admin/ManageUsers'; // Giả định màn hình ManageUsers
import ManageEvents from './components/Admin/ManageEvents'; // Giả định màn hình ManageEvents
import { MyUserContext, MyDispatchContext } from './configs/MyContexts';
import MyUserReducer from './reducers/MyUserReducer';

// Stack Navigator cho tab "Events" (danh sách sự kiện toàn hệ thống)
const EventsStack = createNativeStackNavigator();
const EventsStackNavigator = () => {
  return (
    <EventsStack.Navigator screenOptions={{ headerShown: true }}>
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

// Stack Navigator cho tab "My Tickets" (các vé đã đặt)
const MyTicketsStack = createNativeStackNavigator();
const MyTicketsStackNavigator = () => {
  return (
    <MyTicketsStack.Navigator screenOptions={{ headerShown: false }}>
      <MyTicketsStack.Screen
        name="MyTicketsScreen"
        component={MyTickets}
        options={{ title: 'My Tickets' }}
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

// Stack Navigator cho tab "My Events" (quản lý sự kiện của nhà tổ chức)
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

// Stack Navigator cho tab "Dashboard" (quản trị viên)
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

// Stack Navigator cho tab "Manage Users" (quản trị viên)
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

// Stack Navigator cho tab "Manage Events" (quản trị viên)
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

// Bottom Tab Navigator for unauthenticated users (Home and Login tabs)
const UnauthTab = createBottomTabNavigator();
const UnauthTabNavigator = () => {
  return (
    <UnauthTab.Navigator screenOptions={{ headerShown: false }}>
      <UnauthTab.Screen
        name="home"
        component={EventsStackNavigator} // ✅ dùng Stack có cả Home và EventDetails
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

// Stack Navigator for Login and Register screens
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

// Bottom Tab Navigator for authenticated users
const Tab = createBottomTabNavigator();
const TabNavigator = () => {
  const user = React.useContext(MyUserContext);

  return (
    <>
      {user === null ? (
        // Khi chưa đăng nhập: show Home and Login tabs
        <UnauthTabNavigator />
      ) : user.role === 'attendee' ? (
        // Khách tham gia: Home, My Tickets, Chat, Profile
        <Tab.Navigator screenOptions={{ headerShown: false }}>
          <Tab.Screen
            name="events"
            component={EventsStackNavigator}
            options={{
              title: 'Home',
              tabBarIcon: () => <Icon size={30} source="calendar" />,
            }}
          />
          <Tab.Screen
            name="myTickets"
            component={MyTicketsStackNavigator}
            options={{
              title: 'My Tickets',
              tabBarIcon: () => <Icon size={30} source="ticket" />,
            }}
          />
          <Tab.Screen
            name="chat"
            component={ChatStackNavigator}
            options={{
              title: 'Chat',
              tabBarIcon: () => <Icon size={30} source="chat" />,
            }}
          />
          <Tab.Screen
            name="profile"
            component={Profile}
            options={{
              title: 'Profile',
              tabBarIcon: () => <Icon size={30} source="account" />,
            }}
          />
        </Tab.Navigator>
      ) : user.role === 'organizer' ? (
        // Nhà tổ chức: Home, My Events, Create Event, Chat, Profile
        <Tab.Navigator screenOptions={{ headerShown: false }}>
          <Tab.Screen
            name="events"
            component={EventsStackNavigator}
            options={{
              title: 'Home',
              tabBarIcon: () => <Icon size={30} source="calendar" />,
            }}
          />
          <Tab.Screen
            name="myEvents"
            component={MyEventsStackNavigator}
            options={{
              title: 'My Events',
              tabBarIcon: () => <Icon size={30} source="calendar-check" />,
            }}
          />
          <Tab.Screen
            name="createEvent"
            component={CreateEventStackNavigator}
            options={{
              title: 'Create Event',
              tabBarIcon: () => <Icon size={30} source="calendar-plus" />,
            }}
          />
          <Tab.Screen
            name="chat"
            component={ChatStackNavigator}
            options={{
              title: 'Chat',
              tabBarIcon: () => <Icon size={30} source="chat" />,
            }}
          />
          <Tab.Screen
            name="profile"
            component={Profile}
            options={{
              title: 'Profile',
              tabBarIcon: () => <Icon size={30} source="account" />,
            }}
          />
        </Tab.Navigator>
      ) : user.role === 'admin' ? (
        // Quản trị viên: Dashboard, Manage Users, Manage Events, Profile
        <Tab.Navigator screenOptions={{ headerShown: false }}>
          <Tab.Screen
            name="dashboard"
            component={DashboardStackNavigator}
            options={{
              title: 'Dashboard',
              tabBarIcon: () => <Icon size={30} source="view-dashboard" />,
            }}
          />
          <Tab.Screen
            name="manageUsers"
            component={ManageUsersStackNavigator}
            options={{
              title: 'Manage Users',
              tabBarIcon: () => <Icon size={30} source="account-group" />,
            }}
          />
          <Tab.Screen
            name="manageEvents"
            component={ManageEventsStackNavigator}
            options={{
              title: 'Manage Events',
              tabBarIcon: () => <Icon size={30} source="calendar-multiple" />,
            }}
          />
          <Tab.Screen
            name="profile"
            component={Profile}
            options={{
              title: 'Profile',
              tabBarIcon: () => <Icon size={30} source="account" />,
            }}
          />
        </Tab.Navigator>
      ) : (
        // Trường hợp vai trò không xác định: Chỉ hiển thị Home và Profile
        <Tab.Navigator screenOptions={{ headerShown: false }}>
          <Tab.Screen
            name="events"
            component={EventsStackNavigator}
            options={{
              title: 'Home',
              tabBarIcon: () => <Icon size={30} source="calendar" />,
            }}
          />
          <Tab.Screen
            name="profile"
            component={Profile}
            options={{
              title: 'Profile',
              tabBarIcon: () => <Icon size={30} source="account" />,
            }}
          />
        </Tab.Navigator>
      )}
    </>
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
