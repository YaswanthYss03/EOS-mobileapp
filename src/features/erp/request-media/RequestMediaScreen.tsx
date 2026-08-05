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
import {
  publishTypes,
  mediaCategories,
  mediaChannels,
  mockMediaHistory,
  type MediaRequest,
} from "./data/mockRequestMedia";

type Tab = "new" | "history";
type DateField = "event" | "publishBy" | null;

// TODO: this is a raise+history UI over mockRequestMedia - wire to a real
// media-relations backend endpoint once one exists. Reachable from the
// Secretary dashboard's "Request Media" item.
export function RequestMediaScreen() {
  const navigation = useNavigation();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [tab, setTab] = useState<Tab>("new");
  const [publishType, setPublishType] = useState(publishTypes[0]);
  const [category, setCategory] = useState(mediaCategories[0]);
  const [achievementTitle, setAchievementTitle] = useState("");
  const [eventDate, setEventDate] = useState<Date | null>(null);
  const [publishByDate, setPublishByDate] = useState<Date | null>(null);
  const [peopleToFeature, setPeopleToFeature] = useState("");
  const [captionDetails, setCaptionDetails] = useState("");
  const [channel, setChannel] = useState(mediaChannels[mediaChannels.length - 1]);
  const [datePickerFor, setDatePickerFor] = useState<DateField>(null);
  const [pickerYear, setPickerYear] = useState(2026);
  const [pickerMonth, setPickerMonth] = useState(7); // August (0-indexed)
  const [history, setHistory] = useState(mockMediaHistory);

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
    if (datePickerFor === "event") setEventDate(picked);
    else if (datePickerFor === "publishBy") setPublishByDate(picked);
    setDatePickerFor(null);
  }

  function handleAttachment() {
    toast.info("Photo and clip attachments are coming soon");
  }

  function resetForm() {
    setPublishType(publishTypes[0]);
    setCategory(mediaCategories[0]);
    setAchievementTitle("");
    setEventDate(null);
    setPublishByDate(null);
    setPeopleToFeature("");
    setCaptionDetails("");
    setChannel(mediaChannels[mediaChannels.length - 1]);
  }

  function handleSubmit() {
    if (!achievementTitle.trim()) {
      toast.warning("Add the achievement title");
      return;
    }
    if (!eventDate || !publishByDate) {
      toast.warning("Select the event date and publish-by date");
      return;
    }
    if (!peopleToFeature.trim()) {
      toast.warning("Add the people to feature");
      return;
    }
    if (!captionDetails.trim()) {
      toast.warning("Add details for the caption");
      return;
    }

    const newRequest: MediaRequest = {
      id: `local-${history.length}-${Date.now()}`,
      publishType,
      category,
      achievementTitle: achievementTitle.trim(),
      eventDate: formatDate(eventDate),
      publishBy: formatDate(publishByDate),
      peopleToFeature: peopleToFeature.trim(),
      captionDetails: captionDetails.trim(),
      channel,
      ref: `MED/CSE/2026/${String(22 + history.length).padStart(3, "0")}`,
      raisedOn: formatDate(new Date()),
      status: "pending",
    };
    setHistory((prev) => [newRequest, ...prev]);
    toast.success("Media request sent to the media team");
    resetForm();
    setTab("history");
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
          <Text style={styles.headerTitle}>Request Media</Text>
          <Text style={styles.headerSubtitle}>Department achievements · media team</Text>
        </View>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.tabSwitch}>
          <TouchableOpacity
            style={[styles.tabSwitchButton, tab === "new" && styles.tabSwitchButtonActive]}
            onPress={() => setTab("new")}
          >
            <Text style={[styles.tabSwitchText, tab === "new" && styles.tabSwitchTextActive]}>New request</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabSwitchButton, tab === "history" && styles.tabSwitchButtonActive]}
            onPress={() => setTab("history")}
          >
            <Text style={[styles.tabSwitchText, tab === "history" && styles.tabSwitchTextActive]}>
              History ({history.length})
            </Text>
          </TouchableOpacity>
        </View>

        {tab === "new" ? (
          <>
            <Text style={styles.sectionTitle}>New Media Request</Text>
            <View style={styles.card}>
              <Text style={styles.fieldLabel}>What to Publish</Text>
              <View style={styles.chipRow}>
                {publishTypes.map((type) => {
                  const selected = publishType === type;
                  return (
                    <TouchableOpacity
                      key={type}
                      style={[styles.chip, selected && styles.chipSelected]}
                      onPress={() => setPublishType(type)}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{type}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={styles.fieldLabel}>Category</Text>
              <View style={styles.chipRow}>
                {mediaCategories.map((item) => {
                  const selected = category === item;
                  return (
                    <TouchableOpacity
                      key={item}
                      style={[styles.chip, selected && styles.chipSelected]}
                      onPress={() => setCategory(item)}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{item}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={styles.fieldLabel}>Achievement Title</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. CSE team wins Smart India Hackathon 2026"
                placeholderTextColor="#9AA6B2"
                value={achievementTitle}
                onChangeText={setAchievementTitle}
              />

              <View style={styles.rowFields}>
                <View style={styles.rowField}>
                  <Text style={styles.fieldLabel}>Event Date</Text>
                  <TouchableOpacity
                    style={styles.dateButton}
                    onPress={() => setDatePickerFor("event")}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="calendar-outline" size={14} color="#2F6FE0" />
                    <Text style={[styles.dateButtonText, !eventDate && styles.dateButtonPlaceholder]}>
                      {eventDate ? formatDate(eventDate) : "Select date"}
                    </Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.rowField}>
                  <Text style={styles.fieldLabel}>Publish By</Text>
                  <TouchableOpacity
                    style={styles.dateButton}
                    onPress={() => setDatePickerFor("publishBy")}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="calendar-outline" size={14} color="#2F6FE0" />
                    <Text style={[styles.dateButtonText, !publishByDate && styles.dateButtonPlaceholder]}>
                      {publishByDate ? formatDate(publishByDate) : "Select date"}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              <Text style={styles.fieldLabel}>People to Feature</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Team Zenith — 4 students, III CSE-A · mentor Dr. K. Ramesh"
                placeholderTextColor="#9AA6B2"
                value={peopleToFeature}
                onChangeText={setPeopleToFeature}
              />

              <Text style={styles.fieldLabel}>Details for the Caption</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="What happened, prize or recognition, names to tag, hashtags..."
                placeholderTextColor="#9AA6B2"
                value={captionDetails}
                onChangeText={setCaptionDetails}
                multiline
              />

              <Text style={styles.fieldLabel}>Channel</Text>
              <View style={styles.chipRow}>
                {mediaChannels.map((item) => {
                  const selected = channel === item;
                  return (
                    <TouchableOpacity
                      key={item}
                      style={[styles.chip, selected && styles.chipSelected]}
                      onPress={() => setChannel(item)}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{item}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <TouchableOpacity style={styles.attachButton} onPress={handleAttachment} activeOpacity={0.8}>
                <Ionicons name="cloud-upload-outline" size={18} color="#2F6FE0" />
                <Text style={styles.attachButtonText}>Attach photos or clips</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.submitButton} onPress={handleSubmit} activeOpacity={0.85}>
                <Text style={styles.submitButtonText}>Send to Media Team</Text>
              </TouchableOpacity>
            </View>
          </>
        ) : history.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="document-text-outline" size={32} color="#B0B7C3" />
            <Text style={styles.emptyStateText}>No requests raised yet</Text>
          </View>
        ) : (
          history.map((item) => <HistoryCard key={item.id} item={item} />)
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
    </SafeAreaView>
  );
}

function HistoryCard({ item }: { item: MediaRequest }) {
  return (
    <View style={styles.historyCard}>
      <View style={styles.historyHeader}>
        <Text style={styles.historyItem}>{item.achievementTitle}</Text>
        <View
          style={[
            styles.statusBadge,
            item.status === "forwarded" && styles.statusBadgeForwarded,
            item.status === "returned" && styles.statusBadgeReturned,
          ]}
        >
          <Text
            style={[
              styles.statusBadgeText,
              item.status === "forwarded" && styles.statusBadgeTextForwarded,
              item.status === "returned" && styles.statusBadgeTextReturned,
            ]}
          >
            {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
          </Text>
        </View>
      </View>
      <Text style={styles.historyRef}>
        {item.ref} · {item.raisedOn}
      </Text>
      <Text style={styles.historySpec}>
        {item.publishType} · {item.category} · {item.channel}
      </Text>
      <Text style={styles.historyComplaint}>{item.captionDetails}</Text>
      <Text style={styles.historyMeta}>
        Event {item.eventDate} · Publish by {item.publishBy}
      </Text>
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
    paddingVertical: 10,
  },
  tabSwitchButtonActive: {
    backgroundColor: "#2F6FE0",
  },
  tabSwitchText: {
    fontSize: 13,
    fontFamily: fonts.semibold,
    color: "#4B5563",
  },
  tabSwitchTextActive: {
    color: "#fff",
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
    elevation: 2,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
  },
  fieldLabel: {
    fontSize: 12,
    fontFamily: fonts.semibold,
    color: "#2F6FE0",
    marginBottom: 6,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 14,
  },
  chip: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  chipSelected: {
    backgroundColor: "#2F6FE0",
    borderColor: "#2F6FE0",
  },
  chipText: {
    fontSize: 12,
    fontFamily: fonts.semibold,
    color: "#4B5563",
  },
  chipTextSelected: {
    color: "#fff",
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
    marginBottom: 14,
  },
  textArea: {
    height: 90,
    textAlignVertical: "top",
  },
  rowFields: {
    flexDirection: "row",
    gap: 10,
  },
  rowField: {
    flex: 1,
  },
  dateButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 14,
  },
  dateButtonText: {
    fontSize: 12,
    fontFamily: fonts.semibold,
    color: "#111827",
  },
  dateButtonPlaceholder: {
    color: "#9AA6B2",
    fontFamily: fonts.regular,
  },
  attachButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1.5,
    borderColor: "#B7CBE6",
    borderStyle: "dashed",
    borderRadius: 12,
    paddingVertical: 14,
    marginBottom: 16,
  },
  attachButtonText: {
    fontSize: 13,
    fontFamily: fonts.semibold,
    color: "#2F6FE0",
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
  historyItem: {
    flex: 1,
    fontSize: 14,
    fontFamily: fonts.bold,
    color: "#111827",
  },
  statusBadge: {
    backgroundColor: "#E4EBFB",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  statusBadgeForwarded: {
    backgroundColor: "#F0FDF4",
  },
  statusBadgeReturned: {
    backgroundColor: "#FEF2F2",
  },
  statusBadgeText: {
    fontSize: 11,
    fontFamily: fonts.bold,
    color: "#2F6FE0",
  },
  statusBadgeTextForwarded: {
    color: "#16A34A",
  },
  statusBadgeTextReturned: {
    color: "#DC2626",
  },
  historyRef: {
    fontSize: 11,
    fontFamily: fonts.regular,
    color: "#9AA6B2",
    marginTop: 2,
    marginBottom: 8,
  },
  historySpec: {
    fontSize: 12,
    fontFamily: fonts.semibold,
    color: "#111827",
  },
  historyComplaint: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: "#374151",
    marginTop: 4,
  },
  historyMeta: {
    fontSize: 11,
    fontFamily: fonts.medium,
    color: "#6B7280",
    marginTop: 6,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 40,
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
