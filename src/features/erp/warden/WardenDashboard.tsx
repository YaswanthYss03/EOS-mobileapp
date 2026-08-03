import { View, Text } from "react-native";

// TODO: warden RBAC - view-only pages for this role go here as siblings/subfolders.
// Anything with complex operations (bulk edits, approvals, config) stays on the web app.
export function WardenDashboard() {
  return (
    <View>
      <Text>Warden Dashboard</Text>
    </View>
  );
}
