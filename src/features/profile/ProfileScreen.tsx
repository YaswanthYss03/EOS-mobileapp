import { View, Text, ScrollView, TouchableOpacity, Alert, StyleSheet } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { fonts } from "@/theme";
import { useAuth } from "@/context/AuthContext";
import { mockProfile, academicProfileLinks } from "./data/mockProfile";

function initialsFromName(name: string) {
  const parts = name.trim().split(/\s+/);
  return parts
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

export function ProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { logout } = useAuth();

  function handleLogout() {
    Alert.alert("Log out", "Are you sure you want to log out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Log out",
        style: "destructive",
        onPress: async () => {
          await logout();
          router.replace("/(auth)/login");
        },
      },
    ]);
  }

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <LinearGradient
        colors={["#2F6FE0", "#1A3D8F"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.header, { paddingTop: insets.top + 10 }]}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="arrow-back" size={20} color="#fff" />
        </TouchableOpacity>
        <View>
          <Text style={styles.headerTitle}>Profile & Resume</Text>
          <Text style={styles.headerSubtitle}>{mockProfile.employeeId}</Text>
        </View>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Profile card */}
        <View style={styles.card}>
          <View style={styles.profileRow}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initialsFromName(mockProfile.name)}</Text>
            </View>
            <View style={styles.profileTextWrap}>
              <Text style={styles.name}>{mockProfile.name}</Text>
              <Text style={styles.designation}>{mockProfile.designation}</Text>
              <Text style={styles.department}>{mockProfile.department}</Text>
            </View>
          </View>
        </View>

        {/* Resume row */}
        <TouchableOpacity style={styles.card} activeOpacity={0.8}>
          <View style={styles.resumeRow}>
            <Ionicons name="document-text-outline" size={20} color="#2F6FE0" />
            <Text style={styles.resumeText}>
              View Resume · Updated {mockProfile.resumeUpdatedOn}
            </Text>
            <Ionicons name="chevron-forward" size={18} color="#B0B7C3" />
          </View>
        </TouchableOpacity>

        {/* Academic profiles */}
        <Text style={styles.sectionTitle}>Academic Profiles</Text>
        <View style={styles.card}>
          {academicProfileLinks.map((link, index) => (
            <TouchableOpacity
              key={link.id}
              style={[styles.linkRow, index < academicProfileLinks.length - 1 && styles.linkRowDivider]}
              activeOpacity={0.8}
            >
              <View style={styles.linkIconWrap}>
                <Ionicons name={link.icon as never} size={18} color="#2F6FE0" />
              </View>
              <View style={styles.linkTextWrap}>
                <Text style={styles.linkLabel}>{link.label}</Text>
                <Text style={styles.linkValue}>{link.value}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#B0B7C3" />
            </TouchableOpacity>
          ))}
        </View>

        {/* Service record */}
        <Text style={styles.sectionTitle}>Service Record</Text>
        <View style={styles.card}>
          <View style={styles.serviceRow}>
            <Text style={styles.serviceLabel}>Date of Joining</Text>
            <Text style={styles.serviceValue}>{mockProfile.dateOfJoining}</Text>
          </View>
          <View style={[styles.serviceRow, styles.serviceRowDivider]}>
            <Text style={styles.serviceLabel}>Reporting to</Text>
            <Text style={styles.serviceValue}>{mockProfile.reportingTo}</Text>
          </View>
          <View style={[styles.serviceRow, styles.serviceRowDivider]}>
            <Text style={styles.serviceLabel}>Work Email</Text>
            <Text style={styles.serviceValue}>{mockProfile.workEmail}</Text>
          </View>
        </View>

        {/* Download ID card */}
        <TouchableOpacity style={styles.idCardButton} activeOpacity={0.85}>
          <Ionicons name="download-outline" size={20} color="#fff" />
          <View style={styles.idCardTextWrap}>
            <Text style={styles.idCardTitle}>Download ID Card</Text>
            <Text style={styles.idCardSubtitle}>
              PDF · {mockProfile.employeeId} · valid to {mockProfile.idCard.validTill}
            </Text>
          </View>
        </TouchableOpacity>

        {/* Back to dashboard */}
        <TouchableOpacity style={styles.secondaryButton} onPress={() => router.back()} activeOpacity={0.8}>
          <Text style={styles.secondaryButtonText}>Back to Dashboard</Text>
        </TouchableOpacity>

        {/* Logout */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout} activeOpacity={0.8}>
          <Ionicons name="log-out-outline" size={18} color="#DC2626" />
          <Text style={styles.logoutButtonText}>Log Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    color: "#fff",
    fontSize: 18,
    fontFamily: fonts.bold,
  },
  headerSubtitle: {
    color: "#D7E2FA",
    fontSize: 12,
    fontFamily: fonts.medium,
    marginTop: 2,
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    elevation: 3,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  profileRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#E4EBFB",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: 20,
    fontFamily: fonts.bold,
    color: "#2F6FE0",
  },
  profileTextWrap: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontFamily: fonts.bold,
    color: "#111827",
  },
  designation: {
    fontSize: 13,
    fontFamily: fonts.regular,
    color: "#6B7280",
    marginTop: 2,
  },
  department: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: "#9AA6B2",
    marginTop: 2,
  },
  resumeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  resumeText: {
    flex: 1,
    fontSize: 14,
    fontFamily: fonts.semibold,
    color: "#111827",
  },
  sectionTitle: {
    fontSize: 12,
    fontFamily: fonts.bold,
    color: "#8A93A3",
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 8,
  },
  linkRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
  },
  linkRowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: "#F1F3F6",
  },
  linkIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#E4EBFB",
    alignItems: "center",
    justifyContent: "center",
  },
  linkTextWrap: {
    flex: 1,
  },
  linkLabel: {
    fontSize: 14,
    fontFamily: fonts.semibold,
    color: "#111827",
  },
  linkValue: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: "#2F6FE0",
    marginTop: 2,
  },
  serviceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
  },
  serviceRowDivider: {
    borderTopWidth: 1,
    borderTopColor: "#F1F3F6",
  },
  serviceLabel: {
    fontSize: 13,
    fontFamily: fonts.regular,
    color: "#6B7280",
  },
  serviceValue: {
    fontSize: 13,
    fontFamily: fonts.semibold,
    color: "#111827",
  },
  idCardButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#2F6FE0",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    elevation: 3,
    shadowColor: "#2F6FE0",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  idCardTextWrap: {
    flex: 1,
  },
  idCardTitle: {
    fontSize: 15,
    fontFamily: fonts.bold,
    color: "#fff",
  },
  idCardSubtitle: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: "#D7E2FA",
    marginTop: 2,
  },
  secondaryButton: {
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    paddingVertical: 14,
    marginBottom: 12,
  },
  secondaryButtonText: {
    fontSize: 14,
    fontFamily: fonts.semibold,
    color: "#2F6FE0",
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#FCA5A5",
    paddingVertical: 14,
  },
  logoutButtonText: {
    fontSize: 14,
    fontFamily: fonts.semibold,
    color: "#DC2626",
  },
});
