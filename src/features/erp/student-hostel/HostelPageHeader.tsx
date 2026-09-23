import { Text, TouchableOpacity } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { hostelFormStyles as styles } from "./hostelFormStyles";

// Shared gradient header for the Hostel hub's own 3 sub-pages (Outing/
// Complaints/Mess feedback) and for the hub itself when reached by pushing
// from a dashboard tile (not as the bus-tracking tab's own root, which
// shows the plain shared CollegeHeader instead - see
// StudentHostelScreen.tsx). Always a plain back arrow popping one level.
export function HostelPageHeader({ title, onBack }: { title: string; onBack: () => void }) {
  const insets = useSafeAreaInsets();
  return (
    <LinearGradient
      colors={["#2F6FE0", "#1A3D8F"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.header, { paddingTop: insets.top + 10 }]}
    >
      <TouchableOpacity onPress={onBack} style={styles.backButton} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
        <Ionicons name="arrow-back" size={20} color="#fff" />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>{title}</Text>
    </LinearGradient>
  );
}
