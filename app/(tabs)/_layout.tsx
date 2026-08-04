import { Tabs, Redirect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { CollegeHeader } from "@/components/layout/CollegeHeader";
import { useAuth } from "@/context/AuthContext";

// TODO: hide the ERP tab entirely for roles with no ERP access (see src/navigation/rbac)
export default function TabsLayout() {
  const { token, isLoading } = useAuth();

  // Normally app/index.tsx already routes signed-out users to login before
  // they ever reach here, but this guards direct/back navigation into (tabs)
  // too (e.g. after a 401 forces a logout while already on a tab screen).
  if (isLoading) return null;
  if (!token) return <Redirect href="/(auth)/login" />;

  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        header: () => <CollegeHeader />,
        tabBarActiveTintColor: "#1E3A8A",
        tabBarInactiveTintColor: "#8E8E93",
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: "Home",
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? "home" : "home-outline"} size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="erp"
        options={{
          title: "ERP",
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? "briefcase" : "briefcase-outline"} size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="amenity"
        options={{
          title: "Amenity",
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? "storefront" : "storefront-outline"} size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="academics"
        options={{
          title: "Academics",
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? "school" : "school-outline"} size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="bus-tracking"
        options={{
          title: "My Bus",
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? "bus" : "bus-outline"} size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
