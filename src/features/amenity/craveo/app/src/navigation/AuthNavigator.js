import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';

import ImprovedLoginScreen from '../screens/ImprovedLoginScreen';
import ImprovedSignupScreen from '../screens/ImprovedSignupScreen';

const Stack = createStackNavigator();

const AuthNavigator = () => {
  return (
    <Stack.Navigator
      initialRouteName="Login"
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="Login" component={ImprovedLoginScreen} />
      <Stack.Screen name="Signup" component={ImprovedSignupScreen} />
    </Stack.Navigator>
  );
};

export default AuthNavigator;
