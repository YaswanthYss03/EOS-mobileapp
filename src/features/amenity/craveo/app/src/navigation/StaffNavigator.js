import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Icon from 'react-native-vector-icons/Ionicons';
import StaffOrderScreen from '../screens/staff/StaffOrderScreen';
import StaffDashboardScreen from '../screens/staff/StaffDashboardScreen';
import DishSelectionScreen from '../screens/staff/DishSelectionScreen';
import StaffHistoryScreen from '../screens/staff/StaffHistoryScreen';
import { fonts } from '../../../../../../theme';

const Tab = createBottomTabNavigator();

const StaffNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#235EAA',
        tabBarInactiveTintColor: '#999',
        tabBarStyle: {
          backgroundColor: '#FFF',
          borderTopWidth: 1,
          borderTopColor: '#E0E0E0',
          elevation: 8,
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontFamily: fonts.semibold,
        },
      }}
    >
      <Tab.Screen
        name="StaffOrder"
        component={StaffOrderScreen}
        options={{
          tabBarLabel: 'Create Order',
          tabBarIcon: ({ color, size }) => (
            <Icon name="add-circle" size={size} color={color} />
          ),
        }}
      />
      
      <Tab.Screen
        name="StaffDashboard"
        component={StaffDashboardScreen}
        options={{
          tabBarLabel: 'Dashboard',
          tabBarIcon: ({ color, size }) => (
            <Icon name="stats-chart" size={size} color={color} />
          ),
        }}
      />
      
      <Tab.Screen
        name="DishSelection"
        component={DishSelectionScreen}
        options={{
          tabBarLabel: 'Dish Selection',
          tabBarIcon: ({ color, size }) => (
            <Icon name="list" size={size} color={color} />
          ),
        }}
      />
      
      <Tab.Screen
        name="StaffHistory"
        component={StaffHistoryScreen}
        options={{
          tabBarLabel: 'History',
          tabBarIcon: ({ color, size }) => (
            <Icon name="time" size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
};

export default StaffNavigator;
