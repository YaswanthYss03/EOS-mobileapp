import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, View, Text, ScrollView, TextInput, TouchableOpacity, Modal, StyleSheet } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { CollegeHeader } from "@/components/layout/CollegeHeader";
import { fonts } from "@/theme";
import { toast } from "@/utils/toast";
import { getApiErrorMessage } from "@/services/api/client";
import {
  listVenues,
  createVenueBooking,
  listMyVenueBookings,
  type Venue,
  type MyVenueBooking,
} from "@/services/api/venues.api";
import { getCalendarWeeks, WEEKDAY_LABELS, MONTH_NAMES, formatDate } from "@/utils/calendar";

type Tab = "apply" | "history";
type DateField = "from" | "to" | null;
type ListPickerField = "venue" | "fromTime" | "toTime" | null;
type LoadStatus = "loading" | "success" | "error";

// 08:00 AM through 08:00 PM in 30-minute steps - a client-side input aid for
// picking a time of day, not backend data (from/to are combined with the
// selected dates into real from_datetime/to_datetime ISO values on submit).
function generateTimeSlots(): string[] {
  const slots: string[] = [];
  for (let hour = 8; hour <= 20; hour++) {
    for (const minute of [0, 30]) {
      if (hour === 20 && minute === 30) continue;
      const period = hour < 12 ? "AM" : "PM";
      const displayHour = hour % 12 === 0 ? 12 : hour % 12;
      slots.push(`${String(displayHour).padStart(2, "0")}:${String(minute).padStart(2, "0")} ${period}`);
    }
  }
  return slots;
}
const timeSlots = generateTimeSlots();

function combineDateAndTime(date: Date, time: string): Date {
  const match = /^(\d{2}):(\d{2}) (AM|PM)$/.exec(time);
  if (!match) return date;
  let hour = Number(match[1]) % 12;
  if (match[3] === "PM") hour += 12;
  const minute = Number(match[2]);
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), hour, minute);
}

function formatTime(date: Date): string {
  const hour24 = date.getHours();
  const period = hour24 < 12 ? "AM" : "PM";
  const displayHour = hour24 % 12 === 0 ? 12 : hour24 % 12;
  return `${String(displayHour).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")} ${period}`;
}

// Wired to POST /venue-bookings and GET /venue-bookings (real venues +
// venue_bookings rows). GET /venues requires a from/to availability window,
// so the venue picker fetches a wide window just to enumerate real venues -
// availability isn't checked at request time either way (conflict
// resolution is IQAC's job at review, not this screen's). Reachable from the
// Employee-section "Venue" item on both the Employee/Faculty and HoD
// dashboards.
export function VenueRequestScreen() {
  const navigation = useNavigation();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const today = useMemo(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }, []);

  const [tab, setTab] = useState<Tab>("apply");
  const [venue, setVenue] = useState<Venue | null>(null);
  const [fromDateObj, setFromDateObj] = useState<Date | null>(null);
  const [toDateObj, setToDateObj] = useState<Date | null>(null);
  const [fromTime, setFromTime] = useState<string | null>(null);
  const [toTime, setToTime] = useState<string | null>(null);
  const [purpose, setPurpose] = useState("");
  const [capacity, setCapacity] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [datePickerFor, setDatePickerFor] = useState<DateField>(null);
  const [listPickerFor, setListPickerFor] = useState<ListPickerField>(null);
  const [pickerYear, setPickerYear] = useState(today.getFullYear());
  const [pickerMonth, setPickerMonth] = useState(today.getMonth());

  const [venues, setVenues] = useState<Venue[]>([]);
  const [venuesStatus, setVenuesStatus] = useState<LoadStatus>("loading");

  const [historyStatus, setHistoryStatus] = useState<LoadStatus>("loading");
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [history, setHistory] = useState<MyVenueBooking[]>([]);

  useEffect(() => {
    setVenuesStatus("loading");
    listVenues()
      .then((response) => {
        setVenues(response);
        setVenuesStatus("success");
      })
      .catch(() => setVenuesStatus("error"));
  }, []);

  const loadHistory = useCallback(() => {
    setHistoryStatus("loading");
    setHistoryError(null);
    listMyVenueBookings()
      .then((response) => {
        setHistory(response);
        setHistoryStatus("success");
      })
      .catch((err) => {
        setHistoryError(getApiErrorMessage(err, "Couldn't load your booking history."));
        setHistoryStatus("error");
      });
  }, []);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

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

  const venueNames = venues.map((item) => item.name);
  const listPickerOptions = listPickerFor === "venue" ? venueNames : listPickerFor ? timeSlots : [];
  const listPickerTitle =
    listPickerFor === "venue" ? "Select Venue" : listPickerFor === "fromTime" ? "From Time" : "To Time";
  const listPickerSelected =
    listPickerFor === "venue" ? venue?.name ?? null : listPickerFor === "fromTime" ? fromTime : toTime;

  const bookedVenues = useMemo(() => venues.filter((item) => !item.is_available && item.booking), [venues]);

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
    if (datePickerFor === "from") {
      setFromDateObj(picked);
      if (toDateObj && toDateObj < picked) setToDateObj(picked);
    } else if (datePickerFor === "to") {
      setToDateObj(picked);
    }
    setDatePickerFor(null);
  }

  function handleSelectListOption(value: string) {
    if (listPickerFor === "venue") {
      setVenue(venues.find((item) => item.name === value) ?? null);
    } else if (listPickerFor === "fromTime") {
      setFromTime(value);
    } else if (listPickerFor === "toTime") {
      setToTime(value);
    }
    setListPickerFor(null);
  }

  function resetForm() {
    setVenue(null);
    setFromDateObj(null);
    setToDateObj(null);
    setFromTime(null);
    setToTime(null);
    setPurpose("");
    setCapacity("");
  }

  function handleSubmit() {
    if (!venue) {
      toast.warning("Select a venue");
      return;
    }
    if (!fromDateObj || !toDateObj) {
      toast.warning("Select a from and to date");
      return;
    }
    if (!fromTime || !toTime) {
      toast.warning("Select a from and to time");
      return;
    }
    if (!purpose.trim()) {
      toast.warning("Add the purpose of the booking");
      return;
    }
    if (!capacity.trim()) {
      toast.warning("Add the capacity required");
      return;
    }

    setIsSubmitting(true);
    createVenueBooking({
      venue_id: venue.id,
      purpose: purpose.trim(),
      from_datetime: combineDateAndTime(fromDateObj, fromTime).toISOString(),
      to_datetime: combineDateAndTime(toDateObj, toTime).toISOString(),
      accommodating_strength: Number(capacity),
    })
      .then(() => {
        toast.success("Booking request submitted");
        resetForm();
        setTab("history");
        loadHistory();
      })
      .catch((err) => {
        toast.error(getApiErrorMessage(err, "Couldn't submit your booking request."));
      })
      .finally(() => {
        setIsSubmitting(false);
      });
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
          <Text style={styles.headerTitle}>Venue</Text>
          <Text style={styles.headerSubtitle}>Booking requests</Text>
        </View>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.tabSwitch}>
          <TouchableOpacity
            style={[styles.tabSwitchButton, tab === "apply" && styles.tabSwitchButtonActive]}
            onPress={() => setTab("apply")}
          >
            <Text style={[styles.tabSwitchText, tab === "apply" && styles.tabSwitchTextActive]}>Apply</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabSwitchButton, tab === "history" && styles.tabSwitchButtonActive]}
            onPress={() => setTab("history")}
          >
            <Text style={[styles.tabSwitchText, tab === "history" && styles.tabSwitchTextActive]}>History</Text>
          </TouchableOpacity>
        </View>

        {tab === "apply" ? (
          <>
            <Text style={styles.sectionTitle}>New Venue Request</Text>
            <View style={styles.card}>
              <Text style={styles.fieldLabel}>Venue Name</Text>
              <TouchableOpacity
                style={styles.selectRow}
                onPress={() => setListPickerFor("venue")}
                activeOpacity={0.8}
                disabled={venuesStatus !== "success"}
              >
                <Text style={[styles.selectValue, !venue && styles.selectValuePlaceholder]}>
                  {venue?.name ?? (venuesStatus === "loading" ? "Loading venues…" : "Select venue")}
                </Text>
                {venuesStatus === "loading" ? (
                  <ActivityIndicator size="small" color="#B0B7C3" />
                ) : (
                  <Ionicons name="chevron-down" size={18} color="#B0B7C3" />
                )}
              </TouchableOpacity>

              <View style={styles.dateRow}>
                <View style={styles.dateCol}>
                  <Text style={styles.fieldLabel}>From Date</Text>
                  <TouchableOpacity
                    style={styles.dateButton}
                    onPress={() => setDatePickerFor("from")}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="calendar-outline" size={14} color="#2F6FE0" />
                    <Text style={[styles.dateButtonText, !fromDateObj && styles.dateButtonPlaceholder]}>
                      {fromDateObj ? formatDate(fromDateObj) : "Select date"}
                    </Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.dateCol}>
                  <Text style={styles.fieldLabel}>To Date</Text>
                  <TouchableOpacity
                    style={styles.dateButton}
                    onPress={() => setDatePickerFor("to")}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="calendar-outline" size={14} color="#2F6FE0" />
                    <Text style={[styles.dateButtonText, !toDateObj && styles.dateButtonPlaceholder]}>
                      {toDateObj ? formatDate(toDateObj) : "Select date"}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.dateRow}>
                <View style={styles.dateCol}>
                  <Text style={styles.fieldLabel}>From Time</Text>
                  <TouchableOpacity
                    style={styles.dateButton}
                    onPress={() => setListPickerFor("fromTime")}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="time-outline" size={14} color="#2F6FE0" />
                    <Text style={[styles.dateButtonText, !fromTime && styles.dateButtonPlaceholder]}>
                      {fromTime ?? "Select time"}
                    </Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.dateCol}>
                  <Text style={styles.fieldLabel}>To Time</Text>
                  <TouchableOpacity
                    style={styles.dateButton}
                    onPress={() => setListPickerFor("toTime")}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="time-outline" size={14} color="#2F6FE0" />
                    <Text style={[styles.dateButtonText, !toTime && styles.dateButtonPlaceholder]}>
                      {toTime ?? "Select time"}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              <Text style={styles.fieldLabel}>Purpose</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Guest lecture on Deep Learning"
                placeholderTextColor="#9AA6B2"
                value={purpose}
                onChangeText={setPurpose}
              />

              <Text style={styles.fieldLabel}>Capacity Required</Text>
              <TextInput
                style={[styles.input, styles.inputLast]}
                placeholder="e.g. 120"
                placeholderTextColor="#9AA6B2"
                value={capacity}
                onChangeText={(text) => setCapacity(text.replace(/[^0-9]/g, ""))}
                keyboardType="number-pad"
              />

              <TouchableOpacity
                style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
                onPress={handleSubmit}
                activeOpacity={0.85}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.submitButtonText}>Submit Booking Request</Text>
                )}
              </TouchableOpacity>
            </View>

            <Text style={styles.sectionTitle}>Already Booked Venues</Text>
            <View style={styles.card}>
              {venuesStatus === "loading" ? (
                <ActivityIndicator color="#2F6FE0" />
              ) : venuesStatus === "error" ? (
                <Text style={styles.emptyStateTextInline}>Couldn't load venue booking status.</Text>
              ) : bookedVenues.length === 0 ? (
                <Text style={styles.emptyStateTextInline}>No venues currently booked in the next year.</Text>
              ) : (
                bookedVenues.map((item, index) => (
                  <BookedVenueRow key={item.id} venue={item} isLast={index === bookedVenues.length - 1} />
                ))
              )}
            </View>
          </>
        ) : historyStatus === "loading" ? (
          <View style={styles.inlineLoading}>
            <ActivityIndicator color="#2F6FE0" />
          </View>
        ) : historyStatus === "error" ? (
          <View style={styles.errorNotice}>
            <Ionicons name="alert-circle-outline" size={22} color="#DC2626" />
            <Text style={styles.errorNoticeText}>{historyError ?? "Something went wrong."}</Text>
            <TouchableOpacity onPress={loadHistory} style={styles.retryButton} activeOpacity={0.8}>
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : history.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="document-text-outline" size={32} color="#B0B7C3" />
            <Text style={styles.emptyStateText}>No booking history yet</Text>
          </View>
        ) : (
          history.map((item) => <HistoryCard key={item.id} item={item} />)
        )}
      </ScrollView>

      <Modal
        visible={listPickerFor !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setListPickerFor(null)}
      >
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setListPickerFor(null)}>
          <TouchableOpacity style={styles.modalCard} activeOpacity={1}>
            <Text style={styles.modalTitle}>{listPickerTitle}</Text>
            <ScrollView style={styles.modalList}>
              {listPickerOptions.map((option) => (
                <TouchableOpacity
                  key={option}
                  style={styles.modalOptionRow}
                  onPress={() => handleSelectListOption(option)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.modalOptionName}>{option}</Text>
                  {listPickerSelected === option && <Ionicons name="checkmark" size={18} color="#2F6FE0" />}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

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
                  const disabled = new Date(pickerYear, pickerMonth, day) < today;
                  return (
                    <TouchableOpacity
                      key={dayIndex}
                      style={styles.dayCell}
                      onPress={() => handlePickDate(day)}
                      disabled={disabled}
                    >
                      <Text style={[styles.dayCellText, disabled && styles.dayCellTextDisabled]}>{day}</Text>
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

const STATUS_LABEL: Record<MyVenueBooking["status"], string> = {
  pending: "Pending",
  approved: "Approved",
  rejected: "Rejected",
  alternative_offered: "Alternative offered",
};

function HistoryCard({ item }: { item: MyVenueBooking }) {
  const fromDatetime = new Date(item.from_datetime);
  const toDatetime = new Date(item.to_datetime);

  return (
    <View style={styles.historyCard}>
      <View style={styles.historyHeader}>
        <Text style={styles.historyType}>{item.venue.name}</Text>
        <View
          style={[
            styles.statusBadge,
            item.status === "approved" && styles.statusBadgeApproved,
            item.status === "rejected" && styles.statusBadgeRejected,
            item.status === "alternative_offered" && styles.statusBadgeAlternative,
          ]}
        >
          <Text
            style={[
              styles.statusBadgeText,
              item.status === "approved" && styles.statusBadgeTextApproved,
              item.status === "rejected" && styles.statusBadgeTextRejected,
              item.status === "alternative_offered" && styles.statusBadgeTextAlternative,
            ]}
          >
            {STATUS_LABEL[item.status]}
          </Text>
        </View>
      </View>
      <Text style={styles.historyDates}>
        {formatDate(fromDatetime)} · {formatTime(fromDatetime)} → {formatDate(toDatetime)} · {formatTime(toDatetime)}
      </Text>
      <Text style={styles.historyReason}>{item.purpose}</Text>
      {item.accommodating_strength !== null && (
        <Text style={styles.historyCapacity}>Capacity: {item.accommodating_strength}</Text>
      )}
      {item.status === "alternative_offered" && (
        <Text style={styles.historyCapacity}>IQAC offered a different venue for this request.</Text>
      )}
      <Text style={styles.historyAppliedOn}>Applied on {formatDate(new Date(item.created_at))}</Text>
    </View>
  );
}

function BookedVenueRow({ venue, isLast }: { venue: Venue; isLast: boolean }) {
  if (!venue.booking) return null;
  const fromDatetime = new Date(venue.booking.from_datetime);
  const toDatetime = new Date(venue.booking.to_datetime);

  return (
    <View style={[styles.bookedVenueRow, isLast && styles.bookedVenueRowLast]}>
      <View style={styles.historyHeader}>
        <Text style={styles.historyType}>{venue.name}</Text>
        <Text style={styles.bookedByText}>{venue.booking.booked_by}</Text>
      </View>
      <Text style={styles.historyDates}>
        {formatDate(fromDatetime)} · {formatTime(fromDatetime)} → {formatDate(toDatetime)} · {formatTime(toDatetime)}
      </Text>
      <Text style={styles.historyReason}>{venue.booking.purpose}</Text>
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
  selectRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 14,
  },
  selectValue: {
    fontSize: 14,
    fontFamily: fonts.bold,
    color: "#111827",
  },
  selectValuePlaceholder: {
    color: "#9AA6B2",
    fontFamily: fonts.regular,
  },
  dateRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 14,
  },
  dateCol: {
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
  inputLast: {
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
  historyType: {
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
  statusBadgeApproved: {
    backgroundColor: "#F0FDF4",
  },
  statusBadgeRejected: {
    backgroundColor: "#FEF2F2",
  },
  statusBadgeText: {
    fontSize: 11,
    fontFamily: fonts.bold,
    color: "#2F6FE0",
  },
  statusBadgeTextApproved: {
    color: "#16A34A",
  },
  statusBadgeTextRejected: {
    color: "#DC2626",
  },
  historyDates: {
    fontSize: 12,
    fontFamily: fonts.semibold,
    color: "#4B5563",
    marginTop: 6,
  },
  historyReason: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: "#6B7280",
    marginTop: 4,
  },
  historyCapacity: {
    fontSize: 11,
    fontFamily: fonts.regular,
    color: "#9AA6B2",
    marginTop: 4,
  },
  historyAppliedOn: {
    fontSize: 11,
    fontFamily: fonts.regular,
    color: "#9AA6B2",
    marginTop: 4,
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
  emptyStateTextInline: {
    fontSize: 13,
    fontFamily: fonts.regular,
    color: "#9AA6B2",
    textAlign: "center",
    paddingVertical: 8,
  },
  bookedVenueRow: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F3F6",
  },
  bookedVenueRowLast: {
    borderBottomWidth: 0,
    paddingBottom: 0,
  },
  bookedByText: {
    fontSize: 12,
    fontFamily: fonts.semibold,
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
  dayCellTextDisabled: {
    color: "#D1D5DB",
  },
  inlineLoading: {
    paddingVertical: 48,
    alignItems: "center",
  },
  errorNotice: {
    alignItems: "center",
    gap: 8,
    paddingVertical: 48,
    paddingHorizontal: 16,
  },
  errorNoticeText: {
    fontSize: 13,
    fontFamily: fonts.regular,
    color: "#6B7280",
    textAlign: "center",
    paddingHorizontal: 12,
  },
  retryButton: {
    marginTop: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#2F6FE0",
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  retryButtonText: {
    fontSize: 12,
    fontFamily: fonts.bold,
    color: "#2F6FE0",
  },
  submitButtonDisabled: {
    backgroundColor: "#B7CBE6",
  },
  statusBadgeAlternative: {
    backgroundColor: "#FEF3C7",
  },
  statusBadgeTextAlternative: {
    color: "#B45309",
  },
});
