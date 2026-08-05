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
import { getCalendarWeeks, WEEKDAY_LABELS, MONTH_NAMES, formatDate } from "@/utils/calendar";
import { mockOdHistory, timeSlots, type OdHistoryItem, type OdHistoryStatus } from "./data/mockStudentOdApply";

type Tab = "apply" | "history";
type TeamMode = "create" | "join";
type DateField = "start" | "end" | null;
type TimeField = "start" | "end" | null;

const STATUS_META: Record<OdHistoryStatus, { label: string; bg: string; text: string }> = {
  pending: { label: "Pending", bg: "#FEF3C7", text: "#D97706" },
  approved: { label: "Approved", bg: "#EAF0FD", text: "#2F6FE0" },
  rejected: { label: "Rejected", bg: "#FEF2F2", text: "#DC2626" },
};

// 3-letter prefix from the team name + a 3-digit number - 6 characters total,
// matching the "6-character code" the Join tab expects.
function generateTeamCode(teamName: string) {
  const prefix = teamName.trim().slice(0, 3).toUpperCase().padEnd(3, "X");
  const suffix = Math.floor(100 + Math.random() * 900);
  return `${prefix}${suffix}`;
}

// TODO: this is a create/join team + history UI over local state and
// mockStudentOdApply - wire to a real on-duty backend endpoint once one
// exists. This is the student's own self-service application, distinct from
// the Class Advisor's review screen (see erp/student-od).
export function StudentOdApplyScreen() {
  const navigation = useNavigation();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [tab, setTab] = useState<Tab>("apply");
  const [mode, setMode] = useState<TeamMode>("create");

  const [teamName, setTeamName] = useState("");
  const [eventName, setEventName] = useState("");
  const [startDateObj, setStartDateObj] = useState<Date | null>(null);
  const [endDateObj, setEndDateObj] = useState<Date | null>(null);
  const [startTime, setStartTime] = useState<string | null>(null);
  const [endTime, setEndTime] = useState<string | null>(null);
  const [venue, setVenue] = useState("");
  const [facultyMentor, setFacultyMentor] = useState("");
  const [declared, setDeclared] = useState(false);

  const [datePickerFor, setDatePickerFor] = useState<DateField>(null);
  const [timePickerFor, setTimePickerFor] = useState<TimeField>(null);
  const [pickerYear, setPickerYear] = useState(2026);
  const [pickerMonth, setPickerMonth] = useState(7); // August (0-indexed)

  const [teamCode, setTeamCode] = useState("");
  const [history, setHistory] = useState(mockOdHistory);

  useFocusEffect(
    useCallback(() => {
      navigation.getParent()?.setOptions({ headerShown: false });
      return () => {
        navigation.getParent()?.setOptions({ headerShown: true, header: () => <CollegeHeader /> });
      };
    }, [navigation]),
  );

  const pickerWeeks = useMemo(() => getCalendarWeeks(pickerYear, pickerMonth), [pickerYear, pickerMonth]);

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
    const picked = new Date(pickerYear, pickerMonth, day);
    if (datePickerFor === "start") {
      setStartDateObj(picked);
      if (endDateObj && endDateObj < picked) setEndDateObj(picked);
    } else if (datePickerFor === "end") {
      setEndDateObj(picked);
    }
    setDatePickerFor(null);
  }

  function handlePickTime(slot: string) {
    if (timePickerFor === "start") setStartTime(slot);
    else if (timePickerFor === "end") setEndTime(slot);
    setTimePickerFor(null);
  }

  function resetCreateForm() {
    setTeamName("");
    setEventName("");
    setStartDateObj(null);
    setEndDateObj(null);
    setStartTime(null);
    setEndTime(null);
    setVenue("");
    setFacultyMentor("");
    setDeclared(false);
  }

  function handleCreateTeam() {
    if (!teamName.trim()) {
      toast.warning("Add a team name");
      return;
    }
    if (!eventName.trim()) {
      toast.warning("Add the event or activity");
      return;
    }
    if (!startDateObj || !endDateObj) {
      toast.warning("Select a start and end date");
      return;
    }
    if (!startTime || !endTime) {
      toast.warning("Select a start and end time");
      return;
    }
    if (!venue.trim()) {
      toast.warning("Add the venue");
      return;
    }
    if (!facultyMentor.trim()) {
      toast.warning("Add your faculty mentor");
      return;
    }
    if (!declared) {
      toast.warning("Accept the declaration to continue");
      return;
    }
    const code = generateTeamCode(teamName);
    toast.success(`Team created - share code ${code} with your teammates`);
    resetCreateForm();
    setTab("history");
  }

  function handleJoinTeam() {
    if (!teamCode.trim()) {
      toast.warning("Enter the 6-character team code");
      return;
    }
    toast.success(`Joined team ${teamCode.trim().toUpperCase()} - event details filled in automatically`);
    setTeamCode("");
  }

  function markDocumentsSubmitted(id: string) {
    setHistory((prev) => prev.map((item) => (item.id === id ? { ...item, documentsSubmitted: true } : item)));
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
        <Text style={styles.headerTitle}>On-duty</Text>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.tabSwitch}>
          <TouchableOpacity
            style={[styles.tabButton, tab === "apply" && styles.tabButtonActive]}
            onPress={() => setTab("apply")}
          >
            <Text style={[styles.tabButtonText, tab === "apply" && styles.tabButtonTextActive]}>Apply</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabButton, tab === "history" && styles.tabButtonActive]}
            onPress={() => setTab("history")}
          >
            <Text style={[styles.tabButtonText, tab === "history" && styles.tabButtonTextActive]}>History</Text>
          </TouchableOpacity>
        </View>

        {tab === "apply" ? (
          <>
            <View style={styles.modeRow}>
              <ModeCard
                icon="people"
                label="Create team"
                selected={mode === "create"}
                onPress={() => setMode("create")}
              />
              <ModeCard
                icon="mail-open-outline"
                label="Join team"
                selected={mode === "join"}
                onPress={() => setMode("join")}
              />
            </View>

            {mode === "create" ? (
              <View style={styles.card}>
                <Text style={styles.fieldLabel}>Team name</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Team Nexus"
                  placeholderTextColor="#9AA6B2"
                  value={teamName}
                  onChangeText={setTeamName}
                />

                <Text style={styles.fieldLabel}>Event or activity</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. IEEE paper presentation"
                  placeholderTextColor="#9AA6B2"
                  value={eventName}
                  onChangeText={setEventName}
                />

                <View style={styles.rowFields}>
                  <View style={styles.rowField}>
                    <Text style={styles.fieldLabel}>Start date</Text>
                    <TouchableOpacity
                      style={styles.pickerButton}
                      onPress={() => setDatePickerFor("start")}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="calendar-outline" size={14} color="#2F6FE0" />
                      <Text style={[styles.pickerButtonText, !startDateObj && styles.pickerButtonPlaceholder]}>
                        {startDateObj ? formatDate(startDateObj) : "Select date"}
                      </Text>
                    </TouchableOpacity>
                  </View>
                  <View style={styles.rowField}>
                    <Text style={styles.fieldLabel}>End date</Text>
                    <TouchableOpacity
                      style={styles.pickerButton}
                      onPress={() => setDatePickerFor("end")}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="calendar-outline" size={14} color="#2F6FE0" />
                      <Text style={[styles.pickerButtonText, !endDateObj && styles.pickerButtonPlaceholder]}>
                        {endDateObj ? formatDate(endDateObj) : "Select date"}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.rowFields}>
                  <View style={styles.rowField}>
                    <Text style={styles.fieldLabel}>Start time</Text>
                    <TouchableOpacity
                      style={styles.pickerButton}
                      onPress={() => setTimePickerFor("start")}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="time-outline" size={14} color="#2F6FE0" />
                      <Text style={[styles.pickerButtonText, !startTime && styles.pickerButtonPlaceholder]}>
                        {startTime ?? "Select"}
                      </Text>
                    </TouchableOpacity>
                  </View>
                  <View style={styles.rowField}>
                    <Text style={styles.fieldLabel}>End time</Text>
                    <TouchableOpacity
                      style={styles.pickerButton}
                      onPress={() => setTimePickerFor("end")}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="time-outline" size={14} color="#2F6FE0" />
                      <Text style={[styles.pickerButtonText, !endTime && styles.pickerButtonPlaceholder]}>
                        {endTime ?? "Select"}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <Text style={styles.fieldLabel}>Venue</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Institution or location"
                  placeholderTextColor="#9AA6B2"
                  value={venue}
                  onChangeText={setVenue}
                />

                <Text style={styles.fieldLabel}>Faculty mentor</Text>
                <TextInput
                  style={[styles.input, styles.inputLast]}
                  placeholder="e.g. Dr. Kavitha R"
                  placeholderTextColor="#9AA6B2"
                  value={facultyMentor}
                  onChangeText={setFacultyMentor}
                />

                <TouchableOpacity
                  style={styles.declarationCard}
                  onPress={() => setDeclared((prev) => !prev)}
                  activeOpacity={0.8}
                >
                  <View style={[styles.checkbox, declared && styles.checkboxChecked]}>
                    {declared && <Ionicons name="checkmark" size={13} color="#fff" />}
                  </View>
                  <Text style={styles.declarationText}>
                    I declare that the details above are true, that I will attend the event as stated, and
                    that I will upload the event photographs in the Academics · On-duty page within 7 days
                    of completion. I understand attendance is not credited otherwise.
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.submitButton} onPress={handleCreateTeam} activeOpacity={0.85}>
                  <Text style={styles.submitButtonText}>Create team & generate code</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.card}>
                <Text style={styles.fieldLabel}>Team code</Text>
                <TextInput
                  style={[styles.codeInput, styles.inputLast]}
                  placeholder="6-CHARACTER CODE"
                  placeholderTextColor="#9AA6B2"
                  autoCapitalize="characters"
                  maxLength={6}
                  value={teamCode}
                  onChangeText={(text) => setTeamCode(text.replace(/[^a-zA-Z0-9]/g, "").toUpperCase())}
                />
                <Text style={styles.codeHint}>
                  Ask your team lead for the code generated when the team was created. Event details are
                  filled in automatically.
                </Text>
                <TouchableOpacity style={styles.submitButton} onPress={handleJoinTeam} activeOpacity={0.85}>
                  <Text style={styles.submitButtonText}>Join team</Text>
                </TouchableOpacity>
              </View>
            )}
          </>
        ) : history.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="document-text-outline" size={32} color="#B0B7C3" />
            <Text style={styles.emptyStateText}>No on-duty applications yet</Text>
          </View>
        ) : (
          history.map((item) => (
            <HistoryCard key={item.id} item={item} onSubmitDocuments={() => markDocumentsSubmitted(item.id)} />
          ))
        )}
      </ScrollView>

      <Modal
        visible={datePickerFor !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setDatePickerFor(null)}
      >
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setDatePickerFor(null)}>
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

      <Modal
        visible={timePickerFor !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setTimePickerFor(null)}
      >
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setTimePickerFor(null)}>
          <TouchableOpacity style={styles.modalCard} activeOpacity={1}>
            <Text style={styles.modalTitle}>{timePickerFor === "start" ? "Start Time" : "End Time"}</Text>
            <ScrollView style={styles.modalList}>
              {timeSlots.map((slot) => (
                <TouchableOpacity
                  key={slot}
                  style={styles.modalOptionRow}
                  onPress={() => handlePickTime(slot)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.modalOptionName}>{slot}</Text>
                  {(timePickerFor === "start" ? startTime : endTime) === slot && (
                    <Ionicons name="checkmark" size={18} color="#2F6FE0" />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

function ModeCard({
  icon,
  label,
  selected,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.modeCard, selected && styles.modeCardSelected]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <View style={[styles.modeIconWrap, selected && styles.modeIconWrapSelected]}>
        <Ionicons name={icon} size={20} color={selected ? "#fff" : "#6B7280"} />
      </View>
      <Text style={[styles.modeLabel, selected && styles.modeLabelSelected]}>{label}</Text>
    </TouchableOpacity>
  );
}

function HistoryCard({ item, onSubmitDocuments }: { item: OdHistoryItem; onSubmitDocuments: () => void }) {
  const meta = STATUS_META[item.status];
  const [expanded, setExpanded] = useState(false);
  const [certAttached, setCertAttached] = useState(false);
  const [photoAttached, setPhotoAttached] = useState(false);
  const needsDocuments = item.status === "approved" && !item.documentsSubmitted;

  function handleSubmitDocuments() {
    if (!certAttached || !photoAttached) {
      toast.warning("Attach both the certificate and the event photograph");
      return;
    }
    toast.success("Documents submitted for attendance credit");
    onSubmitDocuments();
    setExpanded(false);
  }

  return (
    <View style={styles.historyCard}>
      <View style={styles.historyHeader}>
        <Text style={styles.historyEvent}>{item.event}</Text>
        <View style={[styles.statusBadge, { backgroundColor: meta.bg }]}>
          <Text style={[styles.statusBadgeText, { color: meta.text }]}>{meta.label}</Text>
        </View>
      </View>
      <Text style={styles.historyMeta}>
        {item.date} · {item.durationHours} hrs · {item.venue}
      </Text>
      <Text style={styles.historyTeamLine}>
        {item.teamName} · code {item.code}
      </Text>

      {needsDocuments && (
        <TouchableOpacity onPress={() => setExpanded((prev) => !prev)} hitSlop={4}>
          <Text style={styles.uploadPromptLink}>
            {expanded ? "Hide upload form" : "Tap to upload certificate and photograph"}
          </Text>
        </TouchableOpacity>
      )}
      {item.status === "rejected" && <Text style={styles.notApprovedNote}>Not approved — no documents required</Text>}

      {needsDocuments && expanded && (
        <View style={styles.uploadSection}>
          <Text style={styles.uploadInstructions}>
            Attach the participation certificate and an event photograph so the attendance is credited.
          </Text>

          <UploadBox
            icon="document-text-outline"
            title="Participation certificate"
            subtitle="PDF or image, up to 5 MB"
            attached={certAttached}
            onPress={() => setCertAttached((prev) => !prev)}
          />
          <UploadBox
            icon="image-outline"
            title="Event photograph"
            subtitle="Geo-tagged photo at the venue"
            attached={photoAttached}
            onPress={() => setPhotoAttached((prev) => !prev)}
          />

          <TouchableOpacity style={styles.submitButton} onPress={handleSubmitDocuments} activeOpacity={0.85}>
            <Text style={styles.submitButtonText}>Submit documents</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

function UploadBox({
  icon,
  title,
  subtitle,
  attached,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  attached: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.uploadBox, attached && styles.uploadBoxAttached]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Ionicons name={attached ? "checkmark-circle" : icon} size={22} color="#2F6FE0" />
      <View style={styles.uploadBoxTextWrap}>
        <Text style={styles.uploadBoxTitle}>{title}</Text>
        <Text style={styles.uploadBoxSubtitle}>{attached ? "Selected" : subtitle}</Text>
      </View>
    </TouchableOpacity>
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
    fontSize: 20,
    fontFamily: fonts.bold,
  },
  content: {
    padding: 16,
    paddingBottom: 32,
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
  tabButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 9,
    paddingVertical: 12,
  },
  tabButtonActive: {
    backgroundColor: "#2F6FE0",
  },
  tabButtonText: {
    fontSize: 14,
    fontFamily: fonts.semibold,
    color: "#6B7280",
  },
  tabButtonTextActive: {
    color: "#fff",
    fontFamily: fonts.bold,
  },
  modeRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
  },
  modeCard: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
    padding: 16,
  },
  modeCardSelected: {
    borderColor: "#2F6FE0",
    backgroundColor: "#EAF0FD",
  },
  modeIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F1F3F6",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  modeIconWrapSelected: {
    backgroundColor: "#2F6FE0",
  },
  modeLabel: {
    fontSize: 14,
    fontFamily: fonts.bold,
    color: "#111827",
  },
  modeLabelSelected: {
    color: "#2F6FE0",
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    elevation: 2,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
  },
  fieldLabel: {
    fontSize: 12,
    fontFamily: fonts.semibold,
    color: "#374151",
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    fontFamily: fonts.regular,
    color: "#111827",
    marginBottom: 14,
  },
  inputLast: {
    marginBottom: 16,
  },
  codeInput: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 18,
    fontFamily: fonts.bold,
    color: "#111827",
    letterSpacing: 3,
  },
  codeHint: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: "#9AA6B2",
    lineHeight: 18,
    marginBottom: 16,
  },
  rowFields: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 14,
  },
  rowField: {
    flex: 1,
  },
  pickerButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  pickerButtonText: {
    fontSize: 12,
    fontFamily: fonts.semibold,
    color: "#111827",
  },
  pickerButtonPlaceholder: {
    color: "#9AA6B2",
    fontFamily: fonts.regular,
  },
  declarationCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    backgroundColor: "#F7F8FA",
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: "#D1D5DB",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
  },
  checkboxChecked: {
    backgroundColor: "#2F6FE0",
    borderColor: "#2F6FE0",
  },
  declarationText: {
    flex: 1,
    fontSize: 12,
    fontFamily: fonts.regular,
    color: "#4B5563",
    lineHeight: 18,
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
  historyCard: {
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
  historyHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 8,
  },
  historyEvent: {
    flex: 1,
    fontSize: 16,
    fontFamily: fonts.bold,
    color: "#111827",
  },
  statusBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  statusBadgeText: {
    fontSize: 11,
    fontFamily: fonts.bold,
  },
  historyMeta: {
    fontSize: 13,
    fontFamily: fonts.regular,
    color: "#9AA6B2",
    marginTop: 6,
  },
  historyTeamLine: {
    fontSize: 13,
    fontFamily: fonts.regular,
    color: "#9AA6B2",
    marginTop: 4,
  },
  uploadPromptLink: {
    fontSize: 13,
    fontFamily: fonts.bold,
    color: "#2F6FE0",
    marginTop: 10,
  },
  notApprovedNote: {
    fontSize: 13,
    fontFamily: fonts.semibold,
    color: "#9AA6B2",
    marginTop: 10,
  },
  uploadSection: {
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: "#F1F3F6",
  },
  uploadInstructions: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: "#9AA6B2",
    lineHeight: 18,
    marginBottom: 14,
  },
  uploadBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1.5,
    borderColor: "#D1D5DB",
    borderStyle: "dashed",
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
  },
  uploadBoxAttached: {
    borderStyle: "solid",
    borderColor: "#2F6FE0",
    backgroundColor: "#EAF0FD",
  },
  uploadBoxTextWrap: {
    flex: 1,
  },
  uploadBoxTitle: {
    fontSize: 14,
    fontFamily: fonts.bold,
    color: "#111827",
  },
  uploadBoxSubtitle: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: "#9AA6B2",
    marginTop: 2,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 48,
    gap: 8,
  },
  emptyStateText: {
    fontSize: 13,
    fontFamily: fonts.medium,
    color: "#9AA6B2",
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
    maxHeight: "70%",
  },
  modalTitle: {
    fontSize: 15,
    fontFamily: fonts.bold,
    color: "#111827",
    marginBottom: 10,
  },
  modalList: {
    marginBottom: 4,
  },
  modalOptionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F3F6",
  },
  modalOptionName: {
    fontSize: 14,
    fontFamily: fonts.semibold,
    color: "#111827",
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
