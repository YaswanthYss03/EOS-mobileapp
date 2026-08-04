import { useCallback, useMemo, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { CollegeHeader } from "@/components/layout/CollegeHeader";
import { fonts } from "@/theme";
import { toast } from "@/utils/toast";
import { classInfo, mockStudents, type AttendanceStatus, type StudentRow } from "./data/mockAttendance";

function initialsFromName(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

const STATUS_META: Record<AttendanceStatus, { label: string; color: string }> = {
  present: { label: "P", color: "#16A34A" },
  absent: { label: "A", color: "#DC2626" },
  onduty: { label: "OD", color: "#2F6FE0" },
};

// TODO: this is a view+mark UI over mockAttendance - wire to a real
// attendance backend endpoint once one exists. The AI face-recognition
// camera and the calendar row are decorative placeholders for now.
export function StudentAttendanceScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const [statusMap, setStatusMap] = useState<Record<string, AttendanceStatus | undefined>>({});

  // This screen renders its own full header below, so hide the shared
  // CollegeHeader (mounted at the Tabs level, see app/(tabs)/_layout.tsx)
  // while it's focused, restoring it on blur/unmount - same pattern as the
  // ERP employee/hod dashboards' header override.
  useFocusEffect(
    useCallback(() => {
      navigation.getParent()?.setOptions({ headerShown: false });
      return () => {
        navigation.getParent()?.setOptions({ headerShown: true, header: () => <CollegeHeader /> });
      };
    }, [navigation]),
  );

  const counts = useMemo(() => {
    let present = 0;
    let absent = 0;
    let onduty = 0;
    for (const student of mockStudents) {
      const status = statusMap[student.id];
      if (status === "present") present++;
      else if (status === "absent") absent++;
      else if (status === "onduty") onduty++;
    }
    return { present, absent, onduty, left: mockStudents.length - present - absent - onduty };
  }, [statusMap]);

  function setStatus(studentId: string, status: AttendanceStatus) {
    setStatusMap((prev) => ({
      ...prev,
      [studentId]: prev[studentId] === status ? undefined : status,
    }));
  }

  function handleMarkAllPresent() {
    const next: Record<string, AttendanceStatus> = {};
    for (const student of mockStudents) next[student.id] = "present";
    setStatusMap(next);
  }

  function handleClear() {
    setStatusMap({});
  }

  function handleSave() {
    toast.success(`Attendance saved for ${classInfo.date}`);
  }

  function handleOpenCamera() {
    toast.info("AI face attendance is coming soon");
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
          <Text style={styles.headerTitle}>Attendance</Text>
          <Text style={styles.headerSubtitle}>{classInfo.headerMonth} · Biometric log</Text>
        </View>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* AI Face Attendance */}
        <View style={styles.aiCard}>
          <View style={styles.aiCardHeader}>
            <Text style={styles.aiCardTitle}>AI Face Attendance</Text>
            <View style={styles.notMarkedBadge}>
              <Text style={styles.notMarkedBadgeText}>NOT MARKED</Text>
            </View>
          </View>
          <Text style={styles.aiCardSubtitle}>Snap the class - students are marked present</Text>

          <View style={styles.cameraBox}>
            <View style={styles.cameraIconWrap}>
              <Ionicons name="camera-outline" size={22} color="#fff" />
            </View>
            <Text style={styles.cameraOffText}>Camera is off</Text>
            <Text style={styles.cameraHintText}>Open the camera and photograph the class</Text>
          </View>

          <TouchableOpacity style={styles.openCameraButton} onPress={handleOpenCamera} activeOpacity={0.85}>
            <Ionicons name="camera" size={18} color="#2F6FE0" />
            <Text style={styles.openCameraText}>Open Camera</Text>
          </TouchableOpacity>

          <View style={styles.aiStatsRow}>
            <View style={styles.aiStatBox}>
              <Text style={styles.aiStatLabel}>RECOGNISED</Text>
              <Text style={styles.aiStatValue}>–</Text>
            </View>
            <View style={styles.aiStatBox}>
              <Text style={styles.aiStatLabel}>MARKED PRESENT</Text>
              <Text style={styles.aiStatValue}>–</Text>
            </View>
          </View>
        </View>

        {/* Attendance calendar */}
        <TouchableOpacity style={styles.card} activeOpacity={0.8}>
          <View style={styles.calendarRow}>
            <View style={styles.calendarIconWrap}>
              <Ionicons name="calendar-outline" size={18} color="#2F6FE0" />
            </View>
            <View style={styles.calendarTextWrap}>
              <Text style={styles.calendarTitle}>Attendance Calendar</Text>
              <Text style={styles.calendarSubtitle}>Tap to view a particular date</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#B0B7C3" />
          </View>
        </TouchableOpacity>

        {/* Mark student attendance */}
        <Text style={styles.sectionTitle}>Mark Student Attendance</Text>
        <View style={styles.card}>
          <Text style={styles.classDate}>
            {classInfo.date} · {mockStudents.length} students
          </Text>

          <Text style={styles.fieldLabel}>Class & Subject</Text>
          <View style={styles.fieldRow}>
            <View style={styles.fieldIconWrap}>
              <Ionicons name="book-outline" size={14} color="#2F6FE0" />
            </View>
            <Text style={styles.fieldValue}>
              {classInfo.className} · {classInfo.subjectCode} {classInfo.subjectName}
            </Text>
          </View>

          <Text style={styles.fieldLabel}>Period</Text>
          <Text style={styles.fieldValue}>{classInfo.period}</Text>

          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text style={[styles.statValue, styles.statValuePresent]}>{counts.present}</Text>
              <Text style={styles.statLabel}>PRESENT</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={[styles.statValue, styles.statValueAbsent]}>{counts.absent}</Text>
              <Text style={styles.statLabel}>ABSENT</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={[styles.statValue, styles.statValueOnDuty]}>{counts.onduty}</Text>
              <Text style={styles.statLabel}>ON DUTY</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={[styles.statValue, styles.statValueLeft]}>{counts.left}</Text>
              <Text style={styles.statLabel}>LEFT</Text>
            </View>
          </View>

          <View style={styles.bulkActionsRow}>
            <TouchableOpacity style={styles.markAllButton} onPress={handleMarkAllPresent} activeOpacity={0.85}>
              <Text style={styles.markAllButtonText}>Mark all present</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.clearButton} onPress={handleClear} activeOpacity={0.85}>
              <Text style={styles.clearButtonText}>Clear</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.studentList}>
            {mockStudents.map((student) => (
              <StudentAttendanceRow
                key={student.id}
                student={student}
                status={statusMap[student.id]}
                onSetStatus={(status) => setStatus(student.id, status)}
              />
            ))}
          </View>
        </View>

        <TouchableOpacity style={styles.saveButton} onPress={handleSave} activeOpacity={0.85}>
          <Text style={styles.saveButtonText}>Save Attendance</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

function StudentAttendanceRow({
  student,
  status,
  onSetStatus,
}: {
  student: StudentRow;
  status: AttendanceStatus | undefined;
  onSetStatus: (status: AttendanceStatus) => void;
}) {
  return (
    <View style={styles.studentRow}>
      <View style={styles.studentAvatar}>
        <Text style={styles.studentAvatarText}>{initialsFromName(student.name)}</Text>
      </View>
      <View style={styles.studentTextWrap}>
        <Text style={styles.studentName} numberOfLines={1}>
          {student.name}
        </Text>
        <Text style={styles.studentRoll}>{student.rollNo}</Text>
      </View>

      <View style={styles.statusToggleRow}>
        {(["present", "absent", "onduty"] as const).map((option) => {
          const meta = STATUS_META[option];
          const active = status === option;
          return (
            <TouchableOpacity
              key={option}
              style={[
                styles.statusToggle,
                { borderColor: meta.color },
                active && { backgroundColor: meta.color },
              ]}
              onPress={() => onSetStatus(option)}
            >
              <Text style={[styles.statusToggleText, { color: active ? "#fff" : meta.color }]}>
                {meta.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
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
    shadowOpacity: 0.06,
    shadowRadius: 8,
  },
  aiCard: {
    backgroundColor: "#2952B0",
    borderRadius: 18,
    padding: 16,
    marginBottom: 16,
  },
  aiCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  aiCardTitle: {
    fontSize: 15,
    fontFamily: fonts.bold,
    color: "#fff",
  },
  notMarkedBadge: {
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  notMarkedBadgeText: {
    fontSize: 10,
    fontFamily: fonts.bold,
    color: "#FDE68A",
    letterSpacing: 0.5,
  },
  aiCardSubtitle: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: "#D7E2FA",
    marginTop: 4,
  },
  cameraBox: {
    marginTop: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
    backgroundColor: "rgba(0,0,0,0.15)",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 28,
  },
  cameraIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  cameraOffText: {
    fontSize: 13,
    fontFamily: fonts.semibold,
    color: "#fff",
  },
  cameraHintText: {
    fontSize: 11,
    fontFamily: fonts.regular,
    color: "#C7D6F5",
    marginTop: 2,
  },
  openCameraButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#fff",
    borderRadius: 999,
    paddingVertical: 12,
    marginTop: 14,
  },
  openCameraText: {
    fontSize: 14,
    fontFamily: fonts.bold,
    color: "#2F6FE0",
  },
  aiStatsRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 14,
  },
  aiStatBox: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: "center",
  },
  aiStatLabel: {
    fontSize: 10,
    fontFamily: fonts.bold,
    color: "#C7D6F5",
    letterSpacing: 0.5,
  },
  aiStatValue: {
    fontSize: 18,
    fontFamily: fonts.bold,
    color: "#fff",
    marginTop: 4,
  },
  calendarRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  calendarIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#E4EBFB",
    alignItems: "center",
    justifyContent: "center",
  },
  calendarTextWrap: {
    flex: 1,
  },
  calendarTitle: {
    fontSize: 14,
    fontFamily: fonts.semibold,
    color: "#111827",
  },
  calendarSubtitle: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: "#9AA6B2",
    marginTop: 1,
  },
  sectionTitle: {
    fontSize: 12,
    fontFamily: fonts.bold,
    color: "#8A93A3",
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 8,
  },
  classDate: {
    fontSize: 13,
    fontFamily: fonts.semibold,
    color: "#2F6FE0",
    marginBottom: 12,
  },
  fieldLabel: {
    fontSize: 11,
    fontFamily: fonts.medium,
    color: "#9AA6B2",
    marginBottom: 4,
  },
  fieldRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  fieldIconWrap: {
    width: 24,
    height: 24,
    borderRadius: 6,
    backgroundColor: "#E4EBFB",
    alignItems: "center",
    justifyContent: "center",
  },
  fieldValue: {
    fontSize: 14,
    fontFamily: fonts.semibold,
    color: "#111827",
    marginBottom: 12,
  },
  statsRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 14,
  },
  statBox: {
    flex: 1,
    backgroundColor: "#F7F8FA",
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: "center",
  },
  statValue: {
    fontSize: 18,
    fontFamily: fonts.bold,
  },
  statValuePresent: {
    color: "#16A34A",
  },
  statValueAbsent: {
    color: "#DC2626",
  },
  statValueOnDuty: {
    color: "#2F6FE0",
  },
  statValueLeft: {
    color: "#6B7280",
  },
  statLabel: {
    fontSize: 9,
    fontFamily: fonts.bold,
    color: "#9AA6B2",
    letterSpacing: 0.5,
    marginTop: 2,
  },
  bulkActionsRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 14,
  },
  markAllButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#BBF7D0",
    backgroundColor: "#F0FDF4",
    paddingVertical: 10,
  },
  markAllButtonText: {
    fontSize: 13,
    fontFamily: fonts.semibold,
    color: "#16A34A",
  },
  clearButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    paddingVertical: 10,
  },
  clearButtonText: {
    fontSize: 13,
    fontFamily: fonts.semibold,
    color: "#4B5563",
  },
  studentList: {
    borderTopWidth: 1,
    borderTopColor: "#F1F3F6",
    paddingTop: 4,
  },
  studentRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F3F6",
  },
  studentAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#E4EBFB",
    alignItems: "center",
    justifyContent: "center",
  },
  studentAvatarText: {
    fontSize: 12,
    fontFamily: fonts.bold,
    color: "#2F6FE0",
  },
  studentTextWrap: {
    flex: 1,
  },
  studentName: {
    fontSize: 13,
    fontFamily: fonts.semibold,
    color: "#111827",
  },
  studentRoll: {
    fontSize: 11,
    fontFamily: fonts.regular,
    color: "#9AA6B2",
    marginTop: 1,
  },
  statusToggleRow: {
    flexDirection: "row",
    gap: 6,
  },
  statusToggle: {
    minWidth: 30,
    height: 28,
    borderRadius: 8,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
  },
  statusToggleText: {
    fontSize: 11,
    fontFamily: fonts.bold,
  },
  saveButton: {
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
  saveButtonText: {
    fontSize: 15,
    fontFamily: fonts.bold,
    color: "#fff",
  },
});
