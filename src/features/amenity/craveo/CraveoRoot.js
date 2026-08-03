import React, { useEffect } from "react";
import { NavigationContainer, NavigationIndependentTree } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import { Provider, useSelector, useDispatch } from "react-redux";
import { Provider as PaperProvider } from "react-native-paper";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { PersistGate } from "redux-persist/integration/react";

import store, { persistor } from "./app/src/redux/store";
import AuthNavigator from "./app/src/navigation/AuthNavigator";
import AppNavigator from "./app/src/navigation/AppNavigator";
import { theme } from "./app/src/constants/theme";
import ErrorBoundary from "./app/src/components/ErrorBoundary";
import { ToastProvider } from "./app/src/contexts/ToastContext";
import { LoadingProvider } from "./app/src/contexts/LoadingContext";
import AlarmModalProvider from "./app/src/components/AlarmModalProvider";
import NotificationService from "./app/src/services/NotificationService";
import { EnhancedAppLoader } from "./app/src/components/EnhancedLoaders";
import paymentCleanupService from "./app/src/services/paymentCleanupService";

// This is Craveo's own (already-built, standalone) app mounted whole inside
// EOS's amenity/craveo tab - own Redux store, own auth, own NavigationContainer
// nested inside expo-router's. See app/src/ for the untouched source; this file
// mirrors what Craveo's own App.js does, just renamed and pointed at ./app/src.
// Its own OfflineNotification/Toast were removed here since EOS's root layout
// (app/_layout.tsx) already renders a global OfflineBanner + ToastHost that
// cover every tab, including this one.
const Stack = createStackNavigator();

const CraveoAppContent = () => {
  const dispatch = useDispatch();
  const { isAuthenticated, loading, user } = useSelector((state) => state.auth);

  useEffect(() => {
    if (isAuthenticated && user?.user_id) {
      NotificationService.startAlarmPolling(user.user_id);
      return () => NotificationService.stopAlarmPolling();
    }
  }, [isAuthenticated, user?.user_id]);

  useEffect(() => {
    const timer = setTimeout(() => {
      paymentCleanupService.start();
    }, 3000);
    return () => {
      clearTimeout(timer);
      paymentCleanupService.stop();
    };
  }, []);

  if (loading) {
    return (
      <SafeAreaProvider>
        <PaperProvider theme={theme}>
          <EnhancedAppLoader text="Loading Craveo..." subText="Preparing your delicious experience" />
        </PaperProvider>
      </SafeAreaProvider>
    );
  }

  return (
    <NavigationIndependentTree>
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          {isAuthenticated ? (
            <Stack.Screen name="Main" component={AppNavigator} />
          ) : (
            <Stack.Screen name="Auth" component={AuthNavigator} />
          )}
        </Stack.Navigator>
        <StatusBar style="auto" />
      </NavigationContainer>
    </NavigationIndependentTree>
  );
};

export function CraveoRoot() {
  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <Provider store={store}>
          <PersistGate loading={<EnhancedAppLoader />} persistor={persistor}>
            <PaperProvider theme={theme}>
              <ToastProvider>
                <LoadingProvider>
                  <AlarmModalProvider>
                    <CraveoAppContent />
                  </AlarmModalProvider>
                </LoadingProvider>
              </ToastProvider>
            </PaperProvider>
          </PersistGate>
        </Provider>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}
