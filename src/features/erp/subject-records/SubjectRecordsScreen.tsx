import { useCallback, useMemo } from "react";
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { CollegeHeader } from "@/components/layout/CollegeHeader";
import { fonts } from "@/theme";
import { toast } from "@/utils/toast";
import { classSubjectInfo, mockGradeDistribution, mockToppers } from "./data/mockSubjectRecords";

function initialsFromName(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

// TODO: this is a view-only report over mockSubjectRecords - wire to a real
// results backend endpoint once one exists. Reachable from both the
// Employee/Faculty and HoD dashboards' "Subject Records" item.
export function SubjectRecordsScreen() {
  const navigation = useNavigation();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  // This screen renders its own full header below, so hide the shared
  // CollegeHeader while it's focused - same pattern as the other ERP
  // sub-screens (attendance, leave, on duty, no-due).
  useFocusEffect(
    useCallback(() => {
      navigation.getParent()?.setOptions({ headerShown: false });
      return () => {
        navigation.getParent()?.setOptions({ headerShown: true, header: () => <CollegeHeader /> });
      };
    }, [navigation]),
  );

  const maxCount = useMemo(
    () => Math.max(...mockGradeDistribution.map((item) => item.count)),
    [],
  );

  function handlePublish() {
    toast.success("Result published to class");
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
          <Text style={styles.headerTitle}>Subject Records</Text>
          <Text style={styles.headerSubtitle}>Semester performance</Text>
        </View>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.fieldLabel}>Class & Subject</Text>
        <TouchableOpacity style={styles.classCard} activeOpacity={0.8}>
          <Text style={styles.classCardText}>
            {classSubjectInfo.className} · {classSubjectInfo.subjectCode} {classSubjectInfo.subjectName}
          </Text>
          <Ionicons name="chevron-down" size={18} color="#B0B7C3" />
        </TouchableOpacity>

        <Text style={styles.sectionTitle}>Grade Distribution</Text>
        <View style={styles.card}>
          {mockGradeDistribution.map((item) => (
            <View key={item.grade} style={styles.gradeRow}>
              <Text style={styles.gradeLabel}>{item.grade}</Text>
              <View style={styles.gradeBarTrack}>
                <View
                  style={[
                    styles.gradeBarFill,
                    { width: `${Math.max((item.count / maxCount) * 100, 6)}%` },
                  ]}
                />
              </View>
              <Text style={styles.gradeCount}>{item.count}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.sectionTitle}>Toppers</Text>
        <View style={styles.card}>
          {mockToppers.map((topper, index) => (
            <View
              key={topper.rank}
              style={[styles.topperRow, index < mockToppers.length - 1 && styles.topperRowDivider]}
            >
              <View style={styles.rankBadge}>
                <Text style={styles.rankBadgeText}>{topper.rank}</Text>
              </View>
              <View style={styles.topperAvatar}>
                <Text style={styles.topperAvatarText}>{initialsFromName(topper.name)}</Text>
              </View>
              <View style={styles.topperTextWrap}>
                <Text style={styles.topperName}>{topper.name}</Text>
                <Text style={styles.topperRoll}>{topper.rollNo}</Text>
              </View>
              <Text style={styles.topperScore}>{topper.score}</Text>
            </View>
          ))}
        </View>

        <TouchableOpacity style={styles.publishButton} onPress={handlePublish} activeOpacity={0.85}>
          <Text style={styles.publishButtonText}>Publish Result to Class</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F7F8FA",
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
  fieldLabel: {
    fontSize: 11,
    fontFamily: fonts.medium,
    color: "#9AA6B2",
    marginBottom: 6,
  },
  classCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#fff",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 14,
    marginBottom: 20,
    elevation: 2,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
  },
  classCardText: {
    fontSize: 14,
    fontFamily: fonts.bold,
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
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    elevation: 2,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
  },
  gradeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 7,
  },
  gradeLabel: {
    width: 28,
    fontSize: 12,
    fontFamily: fonts.bold,
    color: "#4B5563",
  },
  gradeBarTrack: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#EEF2F9",
    overflow: "hidden",
  },
  gradeBarFill: {
    height: "100%",
    borderRadius: 4,
    backgroundColor: "#2F6FE0",
  },
  gradeCount: {
    width: 24,
    textAlign: "right",
    fontSize: 12,
    fontFamily: fonts.semibold,
    color: "#111827",
  },
  topperRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
  },
  topperRowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: "#F1F3F6",
  },
  rankBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#E4EBFB",
    alignItems: "center",
    justifyContent: "center",
  },
  rankBadgeText: {
    fontSize: 11,
    fontFamily: fonts.bold,
    color: "#2F6FE0",
  },
  topperAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#E4EBFB",
    alignItems: "center",
    justifyContent: "center",
  },
  topperAvatarText: {
    fontSize: 11,
    fontFamily: fonts.bold,
    color: "#2F6FE0",
  },
  topperTextWrap: {
    flex: 1,
  },
  topperName: {
    fontSize: 13,
    fontFamily: fonts.semibold,
    color: "#111827",
  },
  topperRoll: {
    fontSize: 11,
    fontFamily: fonts.regular,
    color: "#9AA6B2",
    marginTop: 1,
  },
  topperScore: {
    fontSize: 15,
    fontFamily: fonts.bold,
    color: "#2F6FE0",
  },
  publishButton: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#2F6FE0",
    borderRadius: 16,
    paddingVertical: 16,
    elevation: 3,
    shadowColor: "#2F6FE0",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  publishButtonText: {
    fontSize: 15,
    fontFamily: fonts.bold,
    color: "#fff",
  },
});
