import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { CollegeHeader } from "@/components/layout/CollegeHeader";

// TODO: hide the ERP tab entirely for roles with no ERP access (see src/navigation/rbac)
export default function TabsLayout() {
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
