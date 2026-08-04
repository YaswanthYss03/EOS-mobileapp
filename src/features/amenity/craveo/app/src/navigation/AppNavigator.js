import React from 'react';
import { useSelector } from 'react-redux';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { MaterialIcons } from '@expo/vector-icons';

// Screens - Updated with new modern screens
import ImprovedLoginScreen from '../screens/ImprovedLoginScreen';
import ImprovedSignupScreen from '../screens/ImprovedSignupScreen';
import MenuScreenNew from '../screens/MenuScreenNew';
import CategoryMenuScreen from '../screens/CategoryMenuScreen';
import CartScreen from '../screens/CartScreen';
import OrdersScreen from '../screens/OrdersScreen';
import QRScannerScreen from '../screens/QRScannerScreen';
import ProfileScreen from '../screens/ProfileScreen';
import OrderDetailsScreen from '../screens/OrderDetailsScreen';
import PaymentScreen from '../screens/PaymentScreen';
import TokenDisplayScreen from '../screens/TokenDisplayScreen';
import OrderSuccess from '../screens/OrderSuccess';

// Staff Navigator
import StaffNavigator from './StaffNavigator';

import { fonts } from '../../../../../../theme';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

// Main Tab Navigator
function MainTabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          if (route.name === 'Menu') {
            iconName = 'restaurant-menu';
          } else if (route.name === 'Cart') {
            iconName = 'shopping-cart';
          } else if (route.name === 'Orders') {
            iconName = 'receipt-long';
          } else if (route.name === 'QRScanner') {
            iconName = 'qr-code-scanner';
          } else if (route.name === 'Profile') {
            iconName = 'person';
          }

          return <MaterialIcons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#235EAA',
        tabBarInactiveTintColor: 'gray',
        headerStyle: {
          backgroundColor: '#235EAA',
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontFamily: fonts.bold,
        },
      })}
    >
      <Tab.Screen name="Menu" component={MenuScreenNew} />
      <Tab.Screen name="Cart" component={CartScreen} />
      <Tab.Screen name="Orders" component={OrdersScreen} />
      <Tab.Screen name="QRScanner" component={QRScannerScreen} options={{ title: 'Scan QR' }} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

// Auth Stack Navigator - Now includes both Login and Signup
function AuthStackNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={ImprovedLoginScreen} />
      <Stack.Screen name="Signup" component={ImprovedSignupScreen} />
    </Stack.Navigator>
  );
}

// Main App Navigator
function AppNavigator() {
  const isAuthenticated = useSelector(state => state.auth.isAuthenticated);
  const user = useSelector(state => state.auth.user);

  // Debug authentication state in navigator
  React.useEffect(() => {
    console.log('🧭 AppNavigator auth state:', {
      isAuthenticated,
      hasUser: !!user,
      username: user?.username,
      userId: user?.user_id,
      role: user?.role
    });
  }, [isAuthenticated, user]);

  // Check if user is staff
  const isStaff = user?.role === 'staff';

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {!isAuthenticated ? (
        <Stack.Screen name="Auth" component={AuthStackNavigator} />
      ) : isStaff ? (
        /* Staff users get Staff Navigator */
        <Stack.Screen name="StaffMain" component={StaffNavigator} />
      ) : (
        /* Customer users get normal app screens */
        <>
          <Stack.Screen name="Menu" component={MenuScreenNew} />
          <Stack.Screen name="Cart" component={CartScreen} />
          <Stack.Screen name="Orders" component={OrdersScreen} />
          <Stack.Screen name="Profile" component={ProfileScreen} />
          <Stack.Screen
            name="QRScanner"
            component={QRScannerScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen 
            name="CategoryMenu" 
            component={CategoryMenuScreen}
            options={{ 
              headerShown: true, 
              title: 'Category Menu',
              headerStyle: {
                backgroundColor: '#235EAA',
              },
              headerTintColor: '#fff',
              headerTitleStyle: {
                fontFamily: fonts.bold,
              },
            }}
          />
          <Stack.Screen 
            name="OrderDetails" 
            component={OrderDetailsScreen}
            options={{ headerShown: true, title: 'Order Details' }}
          />
          <Stack.Screen 
            name="Payment" 
            component={PaymentScreen}
            options={{ headerShown: true, title: 'Payment' }}
          />
          <Stack.Screen 
            name="TokenDisplay" 
            component={TokenDisplayScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen 
            name="OrderSuccess" 
            component={OrderSuccess}
            options={{ headerShown: true, title: 'Order Placed' }}
          />
        </>
      )}
    </Stack.Navigator>
  );
}

export default AppNavigator;
