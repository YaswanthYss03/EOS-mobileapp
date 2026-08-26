import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, View, Text, ScrollView, TouchableOpacity, StyleSheet } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { CollegeHeader } from "@/components/layout/CollegeHeader";
import { fonts } from "@/theme";
import { getCalendarWeeks, WEEKDAY_LABELS, MONTH_NAMES, toIsoDate } from "@/utils/calendar";
import { getApiErrorMessage } from "@/services/api/client";
import {
  getAppointmentAvailability,
  getMyAppointments,
  cancelMyAppointment,
  type AppointmentAvailabilityDay,
  type AppointmentStatus,
  type MyAppointment,
} from "@/services/api/medical-appointments.api";
import { formatFullDate, formatTimeRange } from "./time";
import { toast } from "@/utils/toast";

type LoadStatus = "loading" | "success" | "error";

const STATUS_STYLE: Record<AppointmentStatus, { bg: string; text: string; label: string }> = {
  pending: { bg: "#FFF4E5", text: "#B26A00", label: "Awaiting approval" },
  approved: { bg: "#E7F7EF", text: "#1E8A5A", label: "Approved" },
  rejected: { bg: "#FDECEA", text: "#C0392B", label: "Rejected" },
  cancelled: { bg: "#EEF0F4", text: "#6B7280", label: "Cancelled" },
};

function MedicalAppointmentHeader({ onBack }: { onBack: () => void }) {
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
      <View>
        <Text style={styles.headerTitle}>Medical</Text>
        <Text style={styles.headerSubtitle}>Book an appointment</Text>
      </View>
    </LinearGradient>
  );
}

function MyAppointmentCard({ item, onCancelled }: { item: MyAppointment; onCancelled: () => void }) {
  const [cancelling, setCancelling] = useState(false);
  const status = STATUS_STYLE[item.status];

  async function cancel() {
    setCancelling(true);
    try {
      await cancelMyAppointment(item.id);
      toast.success("Appointment cancelled.");
      onCancelled();
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Could not cancel this appointment."));
    } finally {
      setCancelling(false);
    }
  }

  return (
    <View style={styles.bookingCard}>
      <View style={styles.bookingCardTop}>
        <View style={styles.bookingCardTextBlock}>
          <Text style={styles.bookingDate}>{formatFullDate(item.slot_date)}</Text>
          <Text style={styles.bookingTime}>{formatTimeRange(item.slot_start, item.slot_end)}</Text>
        </View>
        <View style={[styles.statusChip, { backgroundColor: status.bg }]}>
          <Text style={[styles.statusChipText, { color: status.text }]}>{status.label}</Text>
        </View>
      </View>

      {item.reason ? <Text style={styles.bookingReason}>{item.reason}</Text> : null}

      {item.status === "approved" && item.visit_id !== null && (
        <Text style={styles.bookingQueueNote}>You are in the OPD queue · Token T-{item.visit_id}</Text>
      )}
      {item.status === "pending" && (
        <Text style={styles.bookingPendingNote}>
          The medical centre has to approve this before you join the OPD queue.
        </Text>
      )}
      {item.decision_note ? <Text style={styles.bookingReason}>Note: {item.decision_note}</Text> : null}

      {item.status === "pending" && (
        <TouchableOpacity style={styles.cancelButton} onPress={cancel} disabled={cancelling} activeOpacity={0.8}>
          <Text style={styles.cancelButtonText}>{cancelling ? "Cancelling…" : "Cancel appointment"}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

/**
 * Step 1 of booking: pick a date. Only dates the medical centre has actually
 * opened time parts on are tappable - the rest are inert, so nobody navigates
 * into an empty slot list.
 *
 * Reached from the "Medical" tile on every ERP role dashboard except Parent
 * (see src/features/erp/data/employeeSectionItems.ts and the student dashboard).
 */
export function MedicalAppointmentCalendarScreen() {
  const navigation = useNavigation();
  const router = useRouter();

  const today = useMemo(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }, []);
  const todayIso = useMemo(() => toIsoDate(today), [today]);

  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [availability, setAvailability] = useState<AppointmentAvailabilityDay[]>([]);
  const [status, setStatus] = useState<LoadStatus>("loading");
  const [mine, setMine] = useState<MyAppointment[]>([]);

  // This screen renders its own header below, so hide the shared CollegeHeader
  // while it's focused - same pattern as the other ERP sub-screens.
  useFocusEffect(
    useCallback(() => {
      navigation.getParent()?.setOptions({ headerShown: false });
      return () => {
        navigation.getParent()?.setOptions({ headerShown: true, header: () => <CollegeHeader /> });
      };
    }, [navigation]),
  );

  const loadAvailability = useCallback(async () => {
    setStatus("loading");
    try {
      const from = toIsoDate(new Date(viewYear, viewMonth, 1));
      const to = toIsoDate(new Date(viewYear, viewMonth + 1, 0));
      setAvailability(await getAppointmentAvailability(from, to));
      setStatus("success");
    } catch {
      setStatus("error");
    }
  }, [viewYear, viewMonth]);

  const loadMine = useCallback(async () => {
    try {
      setMine(await getMyAppointments());
    } catch {
      // The calendar is still usable without the history list, so a failure
      // here is not surfaced as a blocking error state.
      setMine([]);
    }
  }, []);

  // Changing month refetches; useFocusEffect below covers mount and every
  // return to this screen, so there is deliberately no separate mount effect
  // (that would fire the same request twice on first render).
  useEffect(() => {
    void loadAvailability();
  }, [loadAvailability]);

  // Re-read the user's own bookings on focus, so one made on the slots screen
  // shows up here the moment they come back. Availability is not refetched
  // here — loadAvailability already reruns whenever the viewed month changes,
  // and the slots screen updates its own counts in place.
  useFocusEffect(
    useCallback(() => {
      void loadMine();
    }, [loadMine]),
  );

  const weeks = useMemo(() => getCalendarWeeks(viewYear, viewMonth), [viewYear, viewMonth]);

  const availabilityByDay = useMemo(() => {
    const map = new Map<number, AppointmentAvailabilityDay>();
    for (const entry of availability) {
      const [, , day] = entry.slot_date.split("-").map(Number);
      if (day) map.set(day, entry);
    }
    return map;
  }, [availability]);

  function goToMonth(delta: number) {
    const next = new Date(viewYear, viewMonth + delta, 1);
    setViewYear(next.getFullYear());
    setViewMonth(next.getMonth());
  }

  function openDate(day: number) {
    const iso = toIsoDate(new Date(viewYear, viewMonth, day));
    const entry = availabilityByDay.get(day);
    if (iso < todayIso) {
      toast.info("That date has already passed.");
      return;
    }
    if (!entry || entry.total_slots === 0) {
      toast.info("The medical centre has not opened any slots on this date.");
      return;
    }
    router.push({ pathname: "/(tabs)/erp/medical-appointment/[date]", params: { date: iso } });
  }

  const upcoming = mine.filter((item) => item.status === "pending" || item.status === "approved");
  const past = mine.filter((item) => item.status === "rejected" || item.status === "cancelled");

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <MedicalAppointmentHeader onBack={() => router.back()} />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.calendarCard}>
          <View style={styles.monthNavRow}>
            <TouchableOpacity style={styles.navButton} onPress={() => goToMonth(-1)}>
              <Ionicons name="chevron-back" size={18} color="#2F6FE0" />
            </TouchableOpacity>
            <View style={styles.monthNavCenter}>
              <Text style={styles.monthTitle}>
                {MONTH_NAMES[viewMonth]} {viewYear}
              </Text>
              <Text style={styles.monthSubtitle}>
                {status === "loading"
                  ? "LOADING…"
                  : `${availabilityByDay.size} ${availabilityByDay.size === 1 ? "DATE" : "DATES"} AVAILABLE`}
              </Text>
            </View>
            <TouchableOpacity style={styles.navButton} onPress={() => goToMonth(1)}>
              <Ionicons name="chevron-forward" size={18} color="#2F6FE0" />
            </TouchableOpacity>
          </View>

          <View style={styles.weekdayRow}>
            {WEEKDAY_LABELS.map((label, i) => (
              <Text key={`${label}-${i}`} style={styles.weekdayLabel}>
                {label}
              </Text>
            ))}
          </View>

          {weeks.map((week, i) => (
            <View key={i} style={styles.weekRow}>
              {week.map((day, j) => {
                if (day === null) return <View key={j} style={styles.dayCell} />;
                const iso = toIsoDate(new Date(viewYear, viewMonth, day));
                const entry = availabilityByDay.get(day);
                const isPast = iso < todayIso;
                const isToday = iso === todayIso;
                const bookable = Boolean(entry && entry.open_slots > 0) && !isPast;
                const hasSlotsButFull = Boolean(entry && entry.total_slots > 0 && entry.open_slots === 0) && !isPast;

                return (
                  <TouchableOpacity
                    key={j}
                    style={styles.dayCell}
                    activeOpacity={entry && !isPast ? 0.7 : 1}
                    onPress={() => openDate(day)}
                  >
                    <View
                      style={[
                        styles.dayCellInner,
                        bookable && styles.dayCellBookable,
                        hasSlotsButFull && styles.dayCellFull,
                        isToday && styles.dayCellToday,
                      ]}
                    >
                      <Text
                        style={[
                          styles.dayNumber,
                          isPast && styles.dayNumberPast,
                          bookable && styles.dayNumberBookable,
                        ]}
                      >
                        {day}
                      </Text>
                      {bookable && <View style={styles.dayDot} />}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          ))}

          <View style={styles.legendRow}>
            <View style={styles.legendItem}>
              <View style={[styles.legendSwatch, { backgroundColor: "#EAF0FD", borderColor: "#2F6FE0" }]} />
              <Text style={styles.legendText}>Slots open</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendSwatch, { backgroundColor: "#F1F2F5", borderColor: "#D7DAE0" }]} />
              {/* open_slots hits 0 when every slot is either full or already
                  finished, so this label covers both rather than claiming
                  "fully booked" for a day whose sessions are simply over. */}
              <Text style={styles.legendText}>Nothing left</Text>
            </View>
          </View>
        </View>

        {status === "error" && (
          <View style={styles.errorCard}>
            <Text style={styles.errorText}>Could not load available dates.</Text>
            <TouchableOpacity style={styles.retryButton} onPress={() => void loadAvailability()}>
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}

        {status === "loading" && (
          <View style={styles.loadingRow}>
            <ActivityIndicator size="small" color="#2F6FE0" />
          </View>
        )}

        {upcoming.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Your appointments</Text>
            {upcoming.map((item) => (
              <MyAppointmentCard key={item.id} item={item} onCancelled={() => void loadMine()} />
            ))}
          </>
        )}

        {past.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Earlier</Text>
            {past.map((item) => (
              <MyAppointmentCard key={item.id} item={item} onCancelled={() => void loadMine()} />
            ))}
          </>
        )}

        {status === "success" && availabilityByDay.size === 0 && (
          <Text style={styles.emptyText}>No appointment slots are open this month.</Text>
        )}
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
  calendarCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
    elevation: 2,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
  },
  monthNavRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  navButton: {
    width: 34,
    height: 34,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    alignItems: "center",
    justifyContent: "center",
  },
  monthNavCenter: {
    alignItems: "center",
  },
  monthTitle: {
    fontSize: 15,
    fontFamily: fonts.bold,
    color: "#111827",
  },
  monthSubtitle: {
    fontSize: 10,
    fontFamily: fonts.semibold,
    color: "#8A93A3",
    letterSpacing: 0.6,
    marginTop: 2,
  },
  weekdayRow: {
    flexDirection: "row",
    marginBottom: 4,
  },
  weekdayLabel: {
    flex: 1,
    textAlign: "center",
    fontSize: 11,
    fontFamily: fonts.bold,
    color: "#8A93A3",
  },
  weekRow: {
    flexDirection: "row",
  },
  dayCell: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 3,
  },
  dayCellInner: {
    width: 38,
    height: 38,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "transparent",
  },
  dayCellBookable: {
    backgroundColor: "#EAF0FD",
    borderColor: "#2F6FE0",
  },
  dayCellFull: {
    backgroundColor: "#F1F2F5",
    borderColor: "#D7DAE0",
  },
  dayCellToday: {
    borderColor: "#1A3D8F",
    borderWidth: 2,
  },
  dayNumber: {
    fontSize: 13,
    fontFamily: fonts.semibold,
    color: "#111827",
  },
  dayNumberPast: {
    color: "#C2C7D0",
  },
  dayNumberBookable: {
    color: "#2F6FE0",
    fontFamily: fonts.bold,
  },
  dayDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#2F6FE0",
    marginTop: 2,
  },
  legendRow: {
    flexDirection: "row",
    gap: 16,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  legendSwatch: {
    width: 12,
    height: 12,
    borderRadius: 4,
    borderWidth: 1,
  },
  legendText: {
    fontSize: 11,
    fontFamily: fonts.medium,
    color: "#6B7280",
  },
  sectionTitle: {
    fontSize: 12,
    fontFamily: fonts.bold,
    color: "#8A93A3",
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 8,
  },
  bookingCard: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    elevation: 1,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  bookingCardTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  bookingCardTextBlock: {
    flex: 1,
  },
  bookingDate: {
    fontSize: 14,
    fontFamily: fonts.bold,
    color: "#111827",
  },
  bookingTime: {
    fontSize: 13,
    fontFamily: fonts.semibold,
    color: "#2F6FE0",
    marginTop: 2,
  },
  statusChip: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 999,
  },
  statusChipText: {
    fontSize: 10.5,
    fontFamily: fonts.bold,
  },
  bookingReason: {
    fontSize: 12.5,
    fontFamily: fonts.regular,
    color: "#4B5563",
    marginTop: 8,
  },
  bookingPendingNote: {
    fontSize: 12,
    fontFamily: fonts.medium,
    color: "#B26A00",
    marginTop: 8,
  },
  bookingQueueNote: {
    fontSize: 12,
    fontFamily: fonts.bold,
    color: "#1E8A5A",
    marginTop: 8,
  },
  cancelButton: {
    alignSelf: "flex-start",
    marginTop: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 9,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  cancelButtonText: {
    fontSize: 12,
    fontFamily: fonts.bold,
    color: "#C0392B",
  },
  loadingRow: {
    paddingVertical: 12,
    alignItems: "center",
  },
  errorCard: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 16,
    alignItems: "center",
    marginBottom: 16,
  },
  errorText: {
    fontSize: 13,
    fontFamily: fonts.medium,
    color: "#C0392B",
  },
  retryButton: {
    marginTop: 10,
    backgroundColor: "#2F6FE0",
    borderRadius: 9,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  retryButtonText: {
    fontSize: 12.5,
    fontFamily: fonts.bold,
    color: "#fff",
  },
  emptyText: {
    fontSize: 13,
    fontFamily: fonts.medium,
    color: "#8A93A3",
    textAlign: "center",
    paddingVertical: 12,
  },
});
