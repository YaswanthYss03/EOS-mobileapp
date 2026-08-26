import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Modal,
  StyleSheet,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { CollegeHeader } from "@/components/layout/CollegeHeader";
import { fonts } from "@/theme";
import { toast } from "@/utils/toast";
import { getApiErrorMessage } from "@/services/api/client";
import {
  getAppointmentDay,
  bookAppointment,
  type AppointmentDay,
  type AppointmentSlot,
  type AppointmentTimePart,
} from "@/services/api/medical-appointments.api";
import { formatFullDate, formatHm12, formatTimeRange } from "./time";

type LoadStatus = "loading" | "success" | "error";

interface PickedSlot {
  part: AppointmentTimePart;
  slot: AppointmentSlot;
}

function SlotsHeader({ onBack, dateLabel }: { onBack: () => void; dateLabel: string }) {
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
      <View style={styles.headerTextBlock}>
        <Text style={styles.headerTitle}>Time slots</Text>
        <Text style={styles.headerSubtitle} numberOfLines={1}>
          {dateLabel}
        </Text>
      </View>
    </LinearGradient>
  );
}

function SlotTile({ slot, onPress }: { slot: AppointmentSlot; onPress: () => void }) {
  // A finished slot is dead for everyone, so it greys out even for the person
  // who booked it. A full slot still reads normally for them, since their own
  // booking is the reason it is full.
  const dimmed = slot.finished || (slot.full && !slot.mine);

  return (
    <TouchableOpacity
      style={[
        styles.slotTile,
        slot.mine && !slot.finished && styles.slotTileMine,
        dimmed && styles.slotTileFull,
      ]}
      onPress={onPress}
      activeOpacity={slot.finished ? 1 : 0.8}
    >
      <Text
        style={[
          styles.slotTime,
          slot.mine && !slot.finished && styles.slotTimeMine,
          dimmed && styles.slotTimeFull,
        ]}
      >
        {formatHm12(slot.slot_start)}
      </Text>
      <Text style={[styles.slotTimeEnd, dimmed && styles.slotTimeFull]}>to {formatHm12(slot.slot_end)}</Text>

      <View style={styles.slotCountRow}>
        <Text style={[styles.slotCount, dimmed && styles.slotTimeFull]}>{slot.booked}</Text>
        <Text style={[styles.slotCountOf, dimmed && styles.slotTimeFull]}>/ {slot.capacity}</Text>
      </View>

      {/* Finished is checked first: once a slot is over, whether it was full or
          booked by this user no longer changes what can be done with it. */}
      {slot.finished ? (
        <View style={[styles.slotChip, { backgroundColor: "#EEF0F4" }]}>
          <Text style={[styles.slotChipText, { color: "#6B7280" }]}>
            {slot.mine ? "Was yours" : "Finished"}
          </Text>
        </View>
      ) : slot.mine ? (
        <View style={[styles.slotChip, { backgroundColor: "#E7F7EF" }]}>
          <Text style={[styles.slotChipText, { color: "#1E8A5A" }]}>Booked by you</Text>
        </View>
      ) : slot.full ? (
        <View style={[styles.slotChip, { backgroundColor: "#FDECEA" }]}>
          <Text style={[styles.slotChipText, { color: "#C0392B" }]}>Full</Text>
        </View>
      ) : (
        <View style={[styles.slotChip, { backgroundColor: "#EAF0FD" }]}>
          <Text style={[styles.slotChipText, { color: "#2F6FE0" }]}>{slot.capacity - slot.booked} left</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

/**
 * Step 2 of booking: the slots on one date, grouped under the time part they
 * came from - a time part is 10:00-13:00, a slot is one 30-minute division of
 * it, and they are shown at different levels on purpose.
 *
 * Tapping a slot opens the confirm sheet, which is where the booked-vs-capacity
 * count is spelled out before anything is sent.
 */
export function MedicalAppointmentSlotsScreen() {
  const navigation = useNavigation();
  const router = useRouter();
  const params = useLocalSearchParams<{ date: string }>();
  const date = params.date ?? "";

  const [day, setDay] = useState<AppointmentDay | null>(null);
  const [status, setStatus] = useState<LoadStatus>("loading");
  const [picked, setPicked] = useState<PickedSlot | null>(null);
  const [reason, setReason] = useState("");
  const [booking, setBooking] = useState(false);

  useFocusEffect(
    useCallback(() => {
      navigation.getParent()?.setOptions({ headerShown: false });
      return () => {
        navigation.getParent()?.setOptions({ headerShown: true, header: () => <CollegeHeader /> });
      };
    }, [navigation]),
  );

  const load = useCallback(async () => {
    if (!date) {
      setStatus("error");
      return;
    }
    setStatus("loading");
    try {
      setDay(await getAppointmentDay(date));
      setStatus("success");
    } catch {
      setStatus("error");
    }
  }, [date]);

  useEffect(() => {
    void load();
  }, [load]);

  const timeParts = day?.time_parts ?? [];
  const totals = useMemo(() => {
    const slots = timeParts.flatMap((part) => part.slots);
    return {
      slots: slots.length,
      // "Available" means bookable right now: not full AND not already over.
      open: slots.filter((slot) => !slot.full && !slot.finished).length,
      finished: slots.filter((slot) => slot.finished).length,
    };
  }, [timeParts]);

  function openSlot(part: AppointmentTimePart, slot: AppointmentSlot) {
    // Checked in the same order the server rejects, so the message the user
    // sees here is the message they would have got from the API anyway.
    // `finished` comes from the server's clock, not the phone's — a device with
    // a wrong date cannot talk itself into a past slot.
    if (slot.finished) {
      toast.info("This slot has already finished.");
      return;
    }
    if (slot.mine) {
      toast.info("You already have a booking in this slot.");
      return;
    }
    if (slot.full) {
      toast.info(`This slot is full — ${slot.booked} of ${slot.capacity} places are taken.`);
      return;
    }
    if (part.status === "closed") {
      toast.info("The medical centre has closed intake for this session.");
      return;
    }
    setPicked({ part, slot });
    setReason("");
  }

  async function confirmBooking() {
    if (!picked) return;
    setBooking(true);
    try {
      await bookAppointment({
        window_id: picked.part.window_id,
        slot_start: picked.slot.slot_start,
        reason: reason.trim() || undefined,
      });
      setPicked(null);
      setReason("");
      toast.success("Appointment requested. The medical centre will approve it.");
      // Refresh so the slot immediately shows the new count and "Booked by you".
      await load();
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Could not book this slot."));
    } finally {
      setBooking(false);
    }
  }

  const dateLabel = date ? formatFullDate(date) : "";

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <SlotsHeader onBack={() => router.back()} dateLabel={dateLabel} />

      {status === "loading" && (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#2F6FE0" />
        </View>
      )}

      {status === "error" && (
        <View style={styles.centered}>
          <Text style={styles.errorText}>Could not load slots for this date.</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => void load()}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      {status === "success" && (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.summaryCard}>
            <View>
              <Text style={styles.summaryValue}>{totals.slots}</Text>
              <Text style={styles.summaryLabel}>SLOTS</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View>
              <Text style={styles.summaryValue}>{totals.open}</Text>
              <Text style={styles.summaryLabel}>AVAILABLE</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryNoteBlock}>
              <Text style={styles.summaryNote}>
                Booking sends a request. The medical centre approves it before you join the OPD queue.
              </Text>
            </View>
          </View>

          {timeParts.length === 0 && <Text style={styles.emptyText}>No slots are open on this date.</Text>}

          {timeParts.map((part) => (
            <View key={part.window_id} style={styles.partBlock}>
              <View style={styles.partHeader}>
                <Text style={styles.partTitle}>{formatTimeRange(part.start_time, part.end_time)}</Text>
                <Text style={styles.partMeta}>
                  {part.slots.length} × {part.slot_minutes} min
                  {part.status === "closed" ? " · closed" : ""}
                </Text>
              </View>

              <View style={styles.slotGrid}>
                {part.slots.map((slot) => (
                  <SlotTile key={slot.slot_start} slot={slot} onPress={() => openSlot(part, slot)} />
                ))}
              </View>
            </View>
          ))}
        </ScrollView>
      )}

      <Modal visible={picked !== null} transparent animationType="fade" onRequestClose={() => setPicked(null)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Confirm appointment</Text>
              <TouchableOpacity onPress={() => setPicked(null)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="close" size={20} color="#6B7280" />
              </TouchableOpacity>
            </View>

            {picked && (
              <>
                <Text style={styles.modalDate}>{dateLabel}</Text>
                <Text style={styles.modalSlot}>{formatTimeRange(picked.slot.slot_start, picked.slot.slot_end)}</Text>

                <View style={styles.modalCountRow}>
                  <Ionicons name="people-outline" size={16} color="#2F6FE0" />
                  <Text style={styles.modalCountText}>
                    <Text style={styles.modalCountStrong}>{picked.slot.booked}</Text> of {picked.slot.capacity} people
                    have booked this slot
                  </Text>
                </View>

                <Text style={styles.fieldLabel}>Reason (optional)</Text>
                <TextInput
                  style={styles.reasonInput}
                  placeholder="e.g. fever since yesterday"
                  placeholderTextColor="#B0B7C3"
                  value={reason}
                  onChangeText={setReason}
                  maxLength={255}
                  multiline
                />

                <TouchableOpacity
                  style={[styles.bookButton, booking && styles.bookButtonDisabled]}
                  onPress={() => void confirmBooking()}
                  disabled={booking}
                  activeOpacity={0.85}
                >
                  <Text style={styles.bookButtonText}>{booking ? "Booking…" : "Book appointment"}</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
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
  headerTextBlock: {
    flex: 1,
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
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  summaryCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
    gap: 14,
    elevation: 2,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
  },
  summaryValue: {
    fontSize: 20,
    fontFamily: fonts.bold,
    color: "#111827",
  },
  summaryLabel: {
    fontSize: 9.5,
    fontFamily: fonts.bold,
    color: "#8A93A3",
    letterSpacing: 0.6,
    marginTop: 1,
  },
  summaryDivider: {
    width: 1,
    height: 30,
    backgroundColor: "#F1F5F9",
  },
  summaryNoteBlock: {
    flex: 1,
  },
  summaryNote: {
    fontSize: 11,
    fontFamily: fonts.medium,
    color: "#6B7280",
    lineHeight: 15,
  },
  partBlock: {
    marginBottom: 18,
  },
  partHeader: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  partTitle: {
    fontSize: 15,
    fontFamily: fonts.bold,
    color: "#111827",
  },
  partMeta: {
    fontSize: 11.5,
    fontFamily: fonts.semibold,
    color: "#8A93A3",
  },
  slotGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  slotTile: {
    width: "31%",
    backgroundColor: "#fff",
    borderRadius: 13,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 10,
    alignItems: "flex-start",
    gap: 2,
  },
  slotTileMine: {
    borderColor: "#1E8A5A",
    backgroundColor: "#F5FCF8",
  },
  slotTileFull: {
    backgroundColor: "#F4F5F7",
    borderColor: "#E1E3E8",
  },
  slotTime: {
    fontSize: 13.5,
    fontFamily: fonts.bold,
    color: "#111827",
  },
  slotTimeMine: {
    color: "#1E8A5A",
  },
  slotTimeFull: {
    color: "#9AA1AD",
  },
  slotTimeEnd: {
    fontSize: 10.5,
    fontFamily: fonts.medium,
    color: "#8A93A3",
  },
  slotCountRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 2,
    marginTop: 4,
  },
  slotCount: {
    fontSize: 16,
    fontFamily: fonts.bold,
    color: "#2F6FE0",
  },
  slotCountOf: {
    fontSize: 11,
    fontFamily: fonts.semibold,
    color: "#8A93A3",
  },
  slotChip: {
    marginTop: 5,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 999,
  },
  slotChipText: {
    fontSize: 9.5,
    fontFamily: fonts.bold,
  },
  emptyText: {
    fontSize: 13,
    fontFamily: fonts.medium,
    color: "#8A93A3",
    textAlign: "center",
    paddingVertical: 20,
  },
  errorText: {
    fontSize: 13,
    fontFamily: fonts.medium,
    color: "#C0392B",
    textAlign: "center",
  },
  retryButton: {
    marginTop: 12,
    backgroundColor: "#2F6FE0",
    borderRadius: 9,
    paddingHorizontal: 18,
    paddingVertical: 9,
  },
  retryButtonText: {
    fontSize: 12.5,
    fontFamily: fonts.bold,
    color: "#fff",
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(15,23,42,0.45)",
    justifyContent: "flex-end",
  },
  modalCard: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    padding: 20,
    paddingBottom: 30,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 16,
    fontFamily: fonts.bold,
    color: "#111827",
  },
  modalDate: {
    fontSize: 12.5,
    fontFamily: fonts.medium,
    color: "#6B7280",
  },
  modalSlot: {
    fontSize: 20,
    fontFamily: fonts.bold,
    color: "#2F6FE0",
    marginTop: 2,
  },
  modalCountRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    backgroundColor: "#EAF0FD",
    borderRadius: 11,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 14,
  },
  modalCountText: {
    flex: 1,
    fontSize: 12.5,
    fontFamily: fonts.medium,
    color: "#1A3D8F",
  },
  modalCountStrong: {
    fontFamily: fonts.bold,
  },
  fieldLabel: {
    fontSize: 12,
    fontFamily: fonts.semibold,
    color: "#2F6FE0",
    marginTop: 16,
    marginBottom: 6,
  },
  reasonInput: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    fontFamily: fonts.regular,
    color: "#111827",
    minHeight: 74,
    textAlignVertical: "top",
  },
  bookButton: {
    marginTop: 16,
    backgroundColor: "#2F6FE0",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  bookButtonDisabled: {
    opacity: 0.6,
  },
  bookButtonText: {
    fontSize: 14.5,
    fontFamily: fonts.bold,
    color: "#fff",
  },
});
