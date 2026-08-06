import { useCallback, useEffect, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, StyleSheet } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { CollegeHeader } from "@/components/layout/CollegeHeader";
import { fonts } from "@/theme";
import { formatDate } from "@/utils/calendar";
import {
  getUpcomingDrivesForFaculty,
  getMentoredStudents,
  type UpcomingDrive,
  type MentoredStudent,
} from "@/services/api/faculty-placements.api";

type PlacementTab = "upcoming" | "history";

function initialsFromName(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

function PlacementsHeader({ onBack }: { onBack: () => void }) {
  const insets = useSafeAreaInsets();

  return (
    <LinearGradient
      colors={["#2F6FE0", "#1A3D8F"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.header, { paddingTop: insets.top + 10 }]}
    >
      <TouchableOpacity
        onPress={onBack}
        style={styles.backButton}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Ionicons name="arrow-back" size={20} color="#fff" />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>Placements</Text>
    </LinearGradient>
  );
}

// Wired to EOS-backend's placement/drives module, faculty (mentor) view -
// see @/services/api/faculty-placements.api.ts. A faculty isn't an
// applicant on any drive, so Upcoming Drives shows no status at all - just
// the drive itself. History lists this faculty's own mentees (via
// class_mentors); tapping one drills into that student's own placement
// history (see erp/faculty-placements/student/[studentId].tsx). Reachable
// from the Employee dashboard's Student "Placements" item.
export function FacultyPlacementsScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const [tab, setTab] = useState<PlacementTab>("upcoming");

  const [upcoming, setUpcoming] = useState<UpcomingDrive[] | null>(null);
  const [upcomingLoading, setUpcomingLoading] = useState(true);
  const [upcomingErrored, setUpcomingErrored] = useState(false);
  const [upcomingReloadToken, setUpcomingReloadToken] = useState(0);

  const [students, setStudents] = useState<MentoredStudent[] | null>(null);
  const [studentsLoading, setStudentsLoading] = useState(true);
  const [studentsErrored, setStudentsErrored] = useState(false);
  const [studentsReloadToken, setStudentsReloadToken] = useState(0);

  useFocusEffect(
    useCallback(() => {
      navigation.getParent()?.setOptions({
        header: () => <PlacementsHeader onBack={() => router.back()} />,
      });
    }, [navigation, router]),
  );

  useEffect(() => {
    setUpcomingLoading(true);
    setUpcomingErrored(false);
    getUpcomingDrivesForFaculty()
      .then(setUpcoming)
      .catch(() => setUpcomingErrored(true))
      .finally(() => setUpcomingLoading(false));
  }, [upcomingReloadToken]);

  useEffect(() => {
    setStudentsLoading(true);
    setStudentsErrored(false);
    getMentoredStudents()
      .then(setStudents)
      .catch(() => setStudentsErrored(true))
      .finally(() => setStudentsLoading(false));
  }, [studentsReloadToken]);

  function openStudentHistory(student: MentoredStudent) {
    router.push({
      pathname: "/(tabs)/erp/faculty-placements/student/[studentId]",
      params: {
        studentId: String(student.student_id),
        name: student.name,
        studentIdNo: student.student_id_no,
      },
    } as never);
  }

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <View style={styles.content}>
        <View style={styles.tabSwitch}>
          <TouchableOpacity
            style={[styles.tabSwitchButton, tab === "upcoming" && styles.tabSwitchButtonActive]}
            onPress={() => setTab("upcoming")}
          >
            <Text style={[styles.tabSwitchText, tab === "upcoming" && styles.tabSwitchTextActive]}>
              Upcoming drives
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabSwitchButton, tab === "history" && styles.tabSwitchButtonActive]}
            onPress={() => setTab("history")}
          >
            <Text style={[styles.tabSwitchText, tab === "history" && styles.tabSwitchTextActive]}>History</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
          {tab === "upcoming" ? (
            upcomingLoading ? (
              <LoadingState />
            ) : upcomingErrored ? (
              <ErrorState onRetry={() => setUpcomingReloadToken((n) => n + 1)} />
            ) : upcoming && upcoming.length > 0 ? (
              upcoming.map((drive) => <UpcomingCard key={drive.drive_id} drive={drive} />)
            ) : (
              <EmptyState icon="briefcase-outline" text="No drives coming up right now." />
            )
          ) : studentsLoading ? (
            <LoadingState />
          ) : studentsErrored ? (
            <ErrorState onRetry={() => setStudentsReloadToken((n) => n + 1)} />
          ) : students && students.length > 0 ? (
            <>
              <Text style={styles.sectionHint}>Tap a student to see their placement history.</Text>
              {students.map((student) => (
                <StudentRow key={student.student_id} student={student} onPress={() => openStudentHistory(student)} />
              ))}
            </>
          ) : (
            <EmptyState icon="people-outline" text="You aren't mentoring any class yet." />
          )}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

function UpcomingCard({ drive }: { drive: UpcomingDrive }) {
  return (
    <View style={[styles.card, !drive.is_disclosed && styles.cardUndisclosed]}>
      <View style={styles.cardHeader}>
        {!drive.is_disclosed && <Ionicons name="lock-closed" size={14} color="#8A93A3" />}
        <Text style={[styles.company, !drive.is_disclosed && styles.companyUndisclosed]}>{drive.company_name}</Text>
      </View>

      <View style={styles.metaRow}>
        <Ionicons name="calendar-outline" size={13} color="#8A93A3" />
        <Text style={styles.metaText}>Drive on {formatDate(new Date(drive.scheduled_date))}</Text>
      </View>

      {drive.is_disclosed && drive.company_profile_info && (
        <Text style={styles.profileInfo}>{drive.company_profile_info}</Text>
      )}

      {!drive.is_disclosed && (
        <Text style={styles.revealHint}>
          {drive.disclosed_reveal_date
            ? `Company name reveals on ${formatDate(new Date(drive.disclosed_reveal_date))}`
            : "Company name will be revealed closer to the drive date."}
        </Text>
      )}
    </View>
  );
}

function StudentRow({ student, onPress }: { student: MentoredStudent; onPress: () => void }) {
  const classLabel = student.section
    ? `${student.department_name ?? "—"} - ${student.section}`
    : "No class assigned";

  return (
    <TouchableOpacity style={styles.studentRow} onPress={onPress} activeOpacity={0.8}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{initialsFromName(student.name)}</Text>
      </View>
      <View style={styles.studentTextWrap}>
        <Text style={styles.studentName}>{student.name}</Text>
        <Text style={styles.studentSubtext}>
          {student.student_id_no} · {classLabel}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color="#B0B7C3" />
    </TouchableOpacity>
  );
}

function LoadingState() {
  return (
    <View style={styles.centerState}>
      <ActivityIndicator size="small" color="#2F6FE0" />
      <Text style={styles.centerStateText}>Loading...</Text>
    </View>
  );
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <View style={styles.centerState}>
      <Ionicons name="cloud-offline-outline" size={32} color="#B0B7C3" />
      <Text style={styles.centerStateText}>Couldn't load this. Please try again.</Text>
      <TouchableOpacity onPress={onRetry} activeOpacity={0.8}>
        <Text style={styles.retryText}>Tap to retry</Text>
      </TouchableOpacity>
    </View>
  );
}

function EmptyState({ icon, text }: { icon: keyof typeof Ionicons.glyphMap; text: string }) {
  return (
    <View style={styles.centerState}>
      <Ionicons name={icon} size={32} color="#B0B7C3" />
      <Text style={styles.centerStateText}>{text}</Text>
    </View>
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
  content: {
    flex: 1,
    padding: 16,
  },
  tabSwitch: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 4,
    gap: 4,
    marginBottom: 16,
    elevation: 2,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
  },
  tabSwitchButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 9,
    paddingVertical: 12,
  },
  tabSwitchButtonActive: {
    backgroundColor: "#2F6FE0",
  },
  tabSwitchText: {
    fontSize: 14,
    fontFamily: fonts.semibold,
    color: "#4B5563",
  },
  tabSwitchTextActive: {
    color: "#fff",
    fontFamily: fonts.bold,
  },
  list: {
    paddingBottom: 32,
  },
  sectionHint: {
    fontSize: 12,
    fontFamily: fonts.medium,
    color: "#9AA6B2",
    marginBottom: 10,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#EEF0F4",
    padding: 16,
    marginBottom: 14,
  },
  cardUndisclosed: {
    borderStyle: "dashed",
    borderColor: "#D1D5DB",
    backgroundColor: "#FAFAFB",
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 8,
  },
  company: {
    fontSize: 16,
    fontFamily: fonts.bold,
    color: "#111827",
  },
  companyUndisclosed: {
    color: "#6B7280",
    fontFamily: fonts.semibold,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  metaText: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: "#8A93A3",
  },
  profileInfo: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: "#6B7280",
    marginTop: 8,
    lineHeight: 18,
  },
  revealHint: {
    fontSize: 12,
    fontFamily: fonts.medium,
    color: "#9AA6B2",
    marginTop: 8,
  },
  studentRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 12,
    marginBottom: 8,
    elevation: 1,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#E4EBFB",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: 13,
    fontFamily: fonts.bold,
    color: "#2F6FE0",
  },
  studentTextWrap: {
    flex: 1,
  },
  studentName: {
    fontSize: 14,
    fontFamily: fonts.bold,
    color: "#111827",
  },
  studentSubtext: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: "#9AA6B2",
    marginTop: 2,
  },
  centerState: {
    alignItems: "center",
    paddingVertical: 60,
    gap: 8,
  },
  centerStateText: {
    fontSize: 13,
    fontFamily: fonts.medium,
    color: "#9AA6B2",
    textAlign: "center",
  },
  retryText: {
    fontSize: 13,
    fontFamily: fonts.bold,
    color: "#2F6FE0",
    marginTop: 4,
  },
});
