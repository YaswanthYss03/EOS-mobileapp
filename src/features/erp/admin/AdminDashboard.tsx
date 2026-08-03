import { View, Text } from "react-native";

// TODO: admin RBAC - view-only pages for this role go here as siblings/subfolders.
// Anything with complex operations (bulk edits, approvals, config) stays on the web app.
export function AdminDashboard() {
  return (
    <View>
      <Text>Admin Dashboard</Text>
    </View>
  );
}
