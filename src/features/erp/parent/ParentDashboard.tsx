import { View, Text } from "react-native";

// TODO: parent RBAC - view-only pages for this role go here as siblings/subfolders.
// Anything with complex operations (bulk edits, approvals, config) stays on the web app.
export function ParentDashboard() {
  return (
    <View>
      <Text>Parent Dashboard</Text>
    </View>
  );
}
