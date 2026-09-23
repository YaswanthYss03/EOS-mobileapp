import { useCallback, useMemo, useRef, useState } from "react";
import { View, Text, ScrollView, TextInput, TouchableOpacity, Modal } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { AnchoredDropdown, useDropdown } from "@/components/ui/dropdown";
import { toast } from "@/utils/toast";
import { getApiErrorMessage } from "@/services/api/client";
import { createMyHostelOuting } from "@/services/api/hostel.api";
import { getCalendarWeeks, WEEKDAY_LABELS, MONTH_NAMES, formatDate } from "@/utils/calendar";
import { hostelFormStyles as styles } from "./hostelFormStyles";
import { HostelPageHeader } from "./HostelPageHeader";
import { HostelRoomCard } from "./HostelRoomCard";
import { useHostelRoom } from "./useHostelRoom";
import { WatermarkBackground } from "@/components/layout/WatermarkBackground";

type TimeField = "out" | "return" | null;

const outingTypes = ["Home visit", "Medical visit", "Academic work", "Weekend outing"];

// 08:00 AM through 08:00 PM in 30-minute steps.
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

function to24Hour(slot: string): string {
  const [time, period] = slot.split(" ");
  const [hourStr, minute] = time.split(":");
  let hour = parseInt(hourStr, 10);
  if (period === "PM" && hour !== 12) hour += 12;
  if (period === "AM" && hour === 12) hour = 0;
  return `${String(hour).padStart(2, "0")}:${minute}`;
}

function toDateOnly(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

// One of the Hostel hub's 3 sub-pages (see StudentHostelScreen.tsx's own
// comment) - always reached by pushing from the hub, so a plain back arrow
// is always correct here (no asTabRoot case, unlike the hub itself).
export function StudentHostelOutingScreen() {
  const navigation = useNavigation();
  const router = useRouter();
  const { status: roomStatus, room } = useHostelRoom();

  useFocusEffect(
    useCallback(() => {
      navigation.getParent()?.setOptions({ headerShown: false });
      return undefined;
    }, [navigation]),
  );

  const today = useMemo(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }, []);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [outingType, setOutingType] = useState(outingTypes[0]);
  const outingTypePicker = useDropdown();
  const [outDateObj, setOutDateObj] = useState<Date | null>(null);
  const [outTime, setOutTime] = useState<string | null>(null);
  const [returnTime, setReturnTime] = useState<string | null>(null);
  const [outingReason, setOutingReason] = useState("");
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [timePickerFor, setTimePickerFor] = useState<TimeField>(null);
  const timeAnchors = useRef<Partial<Record<"out" | "return", View | null>>>({});
  const [pickerYear, setPickerYear] = useState(today.getFullYear());
  const [pickerMonth, setPickerMonth] = useState(today.getMonth());

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
    if (picked < today) return;
    setOutDateObj(picked);
    setDatePickerOpen(false);
  }

  function handlePickTime(slot: string) {
    if (timePickerFor === "out") setOutTime(slot);
    else if (timePickerFor === "return") setReturnTime(slot);
    setTimePickerFor(null);
  }

  function handleSubmitOuting() {
    if (!outDateObj) {
      toast.warning("Select the out date");
      return;
    }
    if (!outTime || !returnTime) {
      toast.warning("Select the out time and expected return time");
      return;
    }
    if (!outingReason.trim()) {
      toast.warning("Describe where you're going and why");
      return;
    }

    const dateOnly = toDateOnly(outDateObj);
    setIsSubmitting(true);
    createMyHostelOuting({
      from_date: dateOnly,
      to_date: dateOnly,
      start_time: to24Hour(outTime),
      return_time: to24Hour(returnTime),
      reason: `${outingType} - ${outingReason.trim()}`,
    })
      .then(() => {
        toast.success("Outing request submitted");
        setOutDateObj(null);
        setOutTime(null);
        setReturnTime(null);
        setOutingReason("");
      })
      .catch((err) => toast.error(getApiErrorMessage(err, "Couldn't submit the outing request.")))
      .finally(() => setIsSubmitting(false));
  }

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <WatermarkBackground />
      <HostelPageHeader title="Outing" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <HostelRoomCard status={roomStatus} room={room} />
        <View style={styles.card}>
          <Text style={styles.fieldLabel}>Outing type</Text>
          <View ref={outingTypePicker.anchorRef} collapsable={false}>
            <TouchableOpacity style={styles.selectRow} onPress={outingTypePicker.open} activeOpacity={0.8}>
              <Text style={styles.selectValue}>{outingType}</Text>
              <Ionicons name="chevron-down" size={18} color="#B0B7C3" />
            </TouchableOpacity>
          </View>

          <View style={styles.rowFields}>
            <View style={styles.rowField}>
              <Text style={styles.fieldLabel}>Out date</Text>
              <TouchableOpacity style={styles.pickerButton} onPress={() => setDatePickerOpen(true)} activeOpacity={0.8}>
                <Ionicons name="calendar-outline" size={14} color="#2F6FE0" />
                <Text style={[styles.pickerButtonText, !outDateObj && styles.pickerButtonPlaceholder]}>
                  {outDateObj ? formatDate(outDateObj) : "Select"}
                </Text>
              </TouchableOpacity>
            </View>
            <View style={styles.rowField}>
              <Text style={styles.fieldLabel}>Out time</Text>
              <View
                ref={(node) => {
                  timeAnchors.current.out = node;
                }}
                collapsable={false}
              >
                <TouchableOpacity style={styles.pickerButton} onPress={() => setTimePickerFor("out")} activeOpacity={0.8}>
                  <Ionicons name="time-outline" size={14} color="#2F6FE0" />
                  <Text style={[styles.pickerButtonText, !outTime && styles.pickerButtonPlaceholder]}>
                    {outTime ?? "Select"}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
            <View style={styles.rowField}>
              <Text style={styles.fieldLabel}>Return</Text>
              <View
                ref={(node) => {
                  timeAnchors.current.return = node;
                }}
                collapsable={false}
              >
                <TouchableOpacity style={styles.pickerButton} onPress={() => setTimePickerFor("return")} activeOpacity={0.8}>
                  <Ionicons name="time-outline" size={14} color="#2F6FE0" />
                  <Text style={[styles.pickerButtonText, !returnTime && styles.pickerButtonPlaceholder]}>
                    {returnTime ?? "Select"}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          <Text style={styles.fieldLabel}>Reason</Text>
          <TextInput
            style={[styles.input, styles.textArea, styles.inputLast]}
            placeholder="Where are you going and why"
            placeholderTextColor="#9AA6B2"
            value={outingReason}
            onChangeText={setOutingReason}
            multiline
          />

          <TouchableOpacity style={styles.submitButton} onPress={handleSubmitOuting} activeOpacity={0.85} disabled={isSubmitting}>
            <Text style={styles.submitButtonText}>Submit outing request</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <AnchoredDropdown
        anchorRef={outingTypePicker.anchorRef}
        visible={outingTypePicker.visible}
        onClose={outingTypePicker.close}
        contentStyle={[styles.modalCard, styles.anchoredCard]}
      >
        <Text style={styles.modalTitle}>Outing Type</Text>
        {outingTypes.map((option) => (
          <TouchableOpacity
            key={option}
            style={styles.modalOptionRow}
            onPress={() => {
              setOutingType(option);
              outingTypePicker.close();
            }}
            activeOpacity={0.8}
          >
            <Text style={styles.modalOptionName}>{option}</Text>
            {outingType === option && <Ionicons name="checkmark" size={18} color="#2F6FE0" />}
          </TouchableOpacity>
        ))}
      </AnchoredDropdown>

      <Modal visible={datePickerOpen} transparent animationType="fade" onRequestClose={() => setDatePickerOpen(false)}>
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

      <AnchoredDropdown
        anchorRef={{ current: timePickerFor ? timeAnchors.current[timePickerFor] ?? null : null }}
        visible={timePickerFor !== null}
        onClose={() => setTimePickerFor(null)}
        contentStyle={[styles.modalCard, styles.anchoredCard]}
      >
        <Text style={styles.modalTitle}>{timePickerFor === "out" ? "Out Time" : "Return Time"}</Text>
        <ScrollView style={styles.modalList}>
          {timeSlots.map((slot) => (
            <TouchableOpacity key={slot} style={styles.modalOptionRow} onPress={() => handlePickTime(slot)} activeOpacity={0.8}>
              <Text style={styles.modalOptionName}>{slot}</Text>
              {(timePickerFor === "out" ? outTime : returnTime) === slot && (
                <Ionicons name="checkmark" size={18} color="#2F6FE0" />
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>
      </AnchoredDropdown>
    </SafeAreaView>
  );
}
