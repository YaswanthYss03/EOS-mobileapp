import { useCallback, useMemo, useState } from "react";
import { View, Text, ScrollView, TextInput, TouchableOpacity, Modal, StyleSheet } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { CollegeHeader } from "@/components/layout/CollegeHeader";
import { fonts } from "@/theme";
import { toast } from "@/utils/toast";
import { getCalendarWeeks, WEEKDAY_LABELS, MONTH_NAMES } from "@/utils/calendar";
import {
  sectionInfo,
  mockBulkAttendanceStudents,
  mockRecentCorrections,
  type BulkAttendanceStatus,
  type BulkAttendanceStudent,
} from "./data/mockBulkAttendance";

const STATUS_META: Record<BulkAttendanceStatus, { label: string; color: string }> = {
  present: { label: "P", color: "#16A34A" },
  absent: { label: "A", color: "#DC2626" },
  onduty: { label: "OD", color: "#2F6FE0" },
};

function initialsFromName(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

function formatDateSlash(date: Date) {
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}/${date.getFullYear()}`;
}

// TODO: this is a correction UI over mockBulkAttendance - wire to a real
// attendance backend endpoint once one exists. Reachable from the
// Secretary dashboard's "Bulk Attendance" item.
export function BulkAttendanceScreen() {
  const navigation = useNavigation();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [date, setDate] = useState(new Date(2026, 7, 2)); // 02 Aug 2026
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [pickerYear, setPickerYear] = useState(date.getFullYear());
  const [pickerMonth, setPickerMonth] = useState(date.getMonth());
  const [search, setSearch] = useState("");
  const [corrections, setCorrections] = useState<Record<string, BulkAttendanceStatus>>({});
  const [reason, setReason] = useState("");
  const [recentCorrections, setRecentCorrections] = useState(mockRecentCorrections);

  // This screen renders its own full header below, so hide the shared
  // CollegeHeader while it's focused - same pattern as the other ERP
  // sub-screens.
  useFocusEffect(
    useCallback(() => {
      navigation.getParent()?.setOptions({ headerShown: false });
      return () => {
        navigation.getParent()?.setOptions({ headerShown: true, header: () => <CollegeHeader /> });
      };
    }, [navigation]),
  );

  const pickerWeeks = useMemo(() => getCalendarWeeks(pickerYear, pickerMonth), [pickerYear, pickerMonth]);

  const filteredStudents = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return mockBulkAttendanceStudents;
    return mockBulkAttendanceStudents.filter(
      (student) => student.name.toLowerCase().includes(query) || student.rollNo.toLowerCase().includes(query),
    );
  }, [search]);

  const absentCount = mockBulkAttendanceStudents.filter((s) => s.markedStatus === "absent").length;
  const changedCount = Object.keys(corrections).length;

  function openDatePicker() {
    setPickerYear(date.getFullYear());
    setPickerMonth(date.getMonth());
    setDatePickerOpen(true);
  }

  function goToPreviousPickerMonth() {
    if (pickerMonth === 0) {
      setPickerMonth(11);
      setPickerYear((year) => year - 1);
    } else {
      setPickerMonth((month) => month - 1);
    }
  }

  function goToNextPickerMonth() {
    if (pickerMonth === 11) {
      setPickerMonth(0);
      setPickerYear((year) => year + 1);
    } else {
      setPickerMonth((month) => month + 1);
    }
  }

  function handlePickDate(day: number) {
    setDate(new Date(pickerYear, pickerMonth, day));
    setDatePickerOpen(false);
  }

  function setCorrection(student: BulkAttendanceStudent, status: BulkAttendanceStatus) {
    setCorrections((prev) => {
      const next = { ...prev };
      if (status === student.markedStatus) {
        delete next[student.id];
      } else {
        next[student.id] = status;
      }
      return next;
    });
  }

  function handleClearChanges() {
    setCorrections({});
  }

  function handleSetCorrectStatus() {
    if (changedCount === 0) {
      toast.warning("Change at least one student's status first");
      return;
    }
    if (!reason.trim()) {
      toast.warning("Add a reason for the correction");
      return;
    }
    setRecentCorrections((prev) => [
      {
        id: `local-${prev.length}-${Date.now()}`,
        label: sectionInfo.label,
        date: formatDateSlash(date),
        count: `${changedCount} student${changedCount > 1 ? "s" : ""}`,
      },
      ...prev,
    ]);
    toast.success("Attendance correction applied");
    setCorrections({});
    setReason("");
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
          <Text style={styles.headerTitle}>Bulk Attendance</Text>
          <Text style={styles.headerSubtitle}>Correct wrongly marked attendance</Text>
        </View>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          <Text style={styles.fieldLabel}>Section</Text>
          <TouchableOpacity style={styles.sectionRow} activeOpacity={0.8}>
            <View style={styles.sectionIconWrap}>
              <Ionicons name="book-outline" size={16} color="#2F6FE0" />
            </View>
            <View style={styles.sectionTextWrap}>
              <Text style={styles.sectionTitleText}>{sectionInfo.label}</Text>
              <Text style={styles.sectionSubtitle}>{sectionInfo.subtitle}</Text>
            </View>
            <Ionicons name="chevron-down" size={18} color="#B0B7C3" />
          </TouchableOpacity>

          <Text style={styles.fieldLabel}>Date</Text>
          <TouchableOpacity style={styles.dateRow} onPress={openDatePicker} activeOpacity={0.8}>
            <Ionicons name="calendar-outline" size={16} color="#2F6FE0" />
            <Text style={styles.dateText}>{formatDateSlash(date)}</Text>
          </TouchableOpacity>

          <View style={styles.searchBar}>
            <Ionicons name="search-outline" size={16} color="#9AA6B2" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search name or register number"
              placeholderTextColor="#9AA6B2"
              value={search}
              onChangeText={setSearch}
            />
          </View>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryText}>
              {absentCount} students marked Absent · {changedCount} changed
            </Text>
            <TouchableOpacity onPress={handleClearChanges} hitSlop={8}>
              <Text style={styles.clearChangesText}>Clear changes</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.studentList}>
            {filteredStudents.map((student) => {
              const effectiveStatus = corrections[student.id] ?? student.markedStatus;
              return (
                <View key={student.id} style={styles.studentRow}>
                  <View style={styles.studentAvatar}>
                    <Text style={styles.studentAvatarText}>{initialsFromName(student.name)}</Text>
                  </View>
                  <View style={styles.studentTextWrap}>
                    <Text style={styles.studentName} numberOfLines={1}>
                      {student.name}
                    </Text>
                    <Text style={styles.studentMeta}>
                      {student.rollNo} · {student.className} · marked{" "}
                      {student.markedStatus.charAt(0).toUpperCase() + student.markedStatus.slice(1)}
                    </Text>
                  </View>
                  <View style={styles.statusToggleRow}>
                    {(["present", "absent", "onduty"] as const).map((option) => {
                      const meta = STATUS_META[option];
                      const active = effectiveStatus === option;
                      return (
                        <TouchableOpacity
                          key={option}
                          style={[
                            styles.statusToggle,
                            { borderColor: meta.color },
                            active && { backgroundColor: meta.color },
                          ]}
                          onPress={() => setCorrection(student, option)}
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
            })}
          </View>

          <Text style={styles.fieldLabel}>Reason for correction</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Biometric sync failed — class was in the lab"
            placeholderTextColor="#9AA6B2"
            value={reason}
            onChangeText={setReason}
          />

          <TouchableOpacity style={styles.submitButton} onPress={handleSetCorrectStatus} activeOpacity={0.85}>
            <Text style={styles.submitButtonText}>Set the correct status above</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionTitleLabel}>Recent Corrections</Text>
        {recentCorrections.map((correction) => (
          <View key={correction.id} style={styles.correctionCard}>
            <View style={styles.correctionTextWrap}>
              <Text style={styles.correctionLabel}>{correction.label}</Text>
              <Text style={styles.correctionMeta}>
                {correction.date} · {correction.count}
              </Text>
            </View>
            <View style={styles.appliedBadge}>
              <Text style={styles.appliedBadgeText}>Applied</Text>
            </View>
            <Ionicons name="chevron-down" size={18} color="#B0B7C3" />
          </View>
        ))}
      </ScrollView>

      <Modal
        visible={datePickerOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setDatePickerOpen(false)}
      >
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setDatePickerOpen(false)}>
          <TouchableOpacity style={styles.modalCard} activeOpacity={1}>
            <View style={styles.calendarNav}>
              <TouchableOpacity onPress={goToPreviousPickerMonth} style={styles.navButton} hitSlop={8}>
                <Ionicons name="chevron-back" size={18} color="#2F6FE0" />
              </TouchableOpacity>
              <Text style={styles.calendarMonthLabel}>
                {MONTH_NAMES[pickerMonth]} {pickerYear}
              </Text>
              <TouchableOpacity onPress={goToNextPickerMonth} style={styles.navButton} hitSlop={8}>
                <Ionicons name="chevron-forward" size={18} color="#2F6FE0" />
              </TouchableOpacity>
            </View>

            <View style={styles.weekdayRow}>
              {WEEKDAY_LABELS.map((label, index) => (
                <Text key={index} style={styles.weekdayLabel}>
                  {label}
                </Text>
              ))}
            </View>

            {pickerWeeks.map((week, weekIndex) => (
              <View key={weekIndex} style={styles.weekRow}>
                {week.map((day, dayIndex) => {
                  if (day === null) {
                    return <View key={dayIndex} style={styles.dayCell} />;
                  }
                  return (
                    <TouchableOpacity key={dayIndex} style={styles.dayCell} onPress={() => handlePickDate(day)}>
                      <Text style={styles.dayCellText}>{day}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ))}
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
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
  fieldLabel: {
    fontSize: 11,
    fontFamily: fonts.medium,
    color: "#9AA6B2",
    marginBottom: 6,
  },
  sectionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
  },
  sectionIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 9,
    backgroundColor: "#E4EBFB",
    alignItems: "center",
    justifyContent: "center",
  },
  sectionTextWrap: {
    flex: 1,
  },
  sectionTitleText: {
    fontSize: 13,
    fontFamily: fonts.bold,
    color: "#111827",
  },
  sectionSubtitle: {
    fontSize: 11,
    fontFamily: fonts.regular,
    color: "#9AA6B2",
    marginTop: 1,
  },
  dateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 14,
  },
  dateText: {
    fontSize: 13,
    fontFamily: fonts.semibold,
    color: "#111827",
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 14,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    fontFamily: fonts.regular,
    color: "#111827",
  },
  summaryRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  summaryText: {
    flex: 1,
    fontSize: 12,
    fontFamily: fonts.semibold,
    color: "#2F6FE0",
  },
  clearChangesText: {
    fontSize: 12,
    fontFamily: fonts.semibold,
    color: "#2F6FE0",
  },
  studentList: {
    borderTopWidth: 1,
    borderTopColor: "#F1F3F6",
    marginBottom: 14,
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
  studentMeta: {
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
  input: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 13,
    fontFamily: fonts.regular,
    color: "#111827",
    marginBottom: 16,
  },
  submitButton: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#2F6FE0",
    borderRadius: 14,
    paddingVertical: 15,
    elevation: 3,
    shadowColor: "#2F6FE0",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  submitButtonText: {
    fontSize: 14,
    fontFamily: fonts.bold,
    color: "#fff",
  },
  sectionTitleLabel: {
    fontSize: 12,
    fontFamily: fonts.bold,
    color: "#8A93A3",
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 8,
  },
  correctionCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    elevation: 2,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
  },
  correctionTextWrap: {
    flex: 1,
  },
  correctionLabel: {
    fontSize: 14,
    fontFamily: fonts.bold,
    color: "#111827",
  },
  correctionMeta: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: "#9AA6B2",
    marginTop: 2,
  },
  appliedBadge: {
    backgroundColor: "#E4EBFB",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  appliedBadgeText: {
    fontSize: 11,
    fontFamily: fonts.bold,
    color: "#2F6FE0",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15,23,42,0.5)",
    justifyContent: "center",
    padding: 20,
  },
  modalCard: {
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 18,
  },
  calendarNav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  navButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F1F3F6",
    alignItems: "center",
    justifyContent: "center",
  },
  calendarMonthLabel: {
    fontSize: 15,
    fontFamily: fonts.bold,
    color: "#111827",
  },
  weekdayRow: {
    flexDirection: "row",
    marginBottom: 6,
  },
  weekdayLabel: {
    flex: 1,
    textAlign: "center",
    fontSize: 11,
    fontFamily: fonts.semibold,
    color: "#9AA6B2",
  },
  weekRow: {
    flexDirection: "row",
    gap: 4,
    marginBottom: 6,
  },
  dayCell: {
    flex: 1,
    aspectRatio: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  dayCellText: {
    fontSize: 13,
    fontFamily: fonts.semibold,
    color: "#111827",
  },
});
