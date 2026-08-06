import { useCallback, useEffect, useMemo, useState } from "react";
import { View, Text, ScrollView, TextInput, TouchableOpacity, Modal, StyleSheet } from "react-native";
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
  getMyHostelRoom,
  createMyHostelOuting,
  createMyHostelComplaint,
  createMyMessFeedback,
  type HostelRoomInfo,
  type HostelComplaintCategory,
} from "@/services/api/hostel.api";
import { getCalendarWeeks, WEEKDAY_LABELS, MONTH_NAMES, formatDate } from "@/utils/calendar";

type Tab = "outing" | "complaints" | "feedback";
type TimeField = "out" | "return" | null;
type Grade = "A" | "B" | "C" | "D" | "E";

const TABS: { id: Tab; label: string }[] = [
  { id: "outing", label: "Outing" },
  { id: "complaints", label: "Complaints" },
  { id: "feedback", label: "Mess feedback" },
];

const outingTypes = ["Home visit", "Medical visit", "Academic work", "Weekend outing"];
const complaintCategories = ["Electrical", "Plumbing", "Furniture", "Internet/WiFi", "Housekeeping"];
const meals = ["Breakfast", "Lunch", "Snacks", "Dinner"];

const grades: { grade: Grade; label: string }[] = [
  { grade: "A", label: "Excellent" },
  { grade: "B", label: "Very good" },
  { grade: "C", label: "Good" },
  { grade: "D", label: "Average" },
  { grade: "E", label: "Poor" },
];

// hostel_complaint_category_enum (see prisma/schema.prisma) has no exact
// 1:1 match for these UI labels - mapped onto the closest real category.
const CATEGORY_TO_ENUM: Record<string, HostelComplaintCategory> = {
  Electrical: "electrical",
  Plumbing: "plumbing",
  Furniture: "carpentry",
  "Internet/WiFi": "network",
  Housekeeping: "facilities",
};

// hostel_mess_feedback only has one 1-5 `rating` column, not separate
// food/hygiene/service dimensions - averaged into one number here.
const GRADE_TO_RATING: Record<Grade, number> = { A: 5, B: 4, C: 3, D: 2, E: 1 };

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

// Wired to the real hostel self-service endpoints (GET /me/hostel-room,
// POST /me/hostel-outings, POST /me/hostel-complaints, POST
// /me/mess-feedback). Reachable from the Student dashboard's Campus
// "Hostel" item.
export function StudentHostelScreen() {
  const navigation = useNavigation();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const today = useMemo(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }, []);

  const [tab, setTab] = useState<Tab>("outing");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [roomStatus, setRoomStatus] = useState<"loading" | "success" | "error">("loading");
  const [room, setRoom] = useState<HostelRoomInfo | null>(null);

  // Outing form
  const [outingType, setOutingType] = useState(outingTypes[0]);
  const [outingTypePickerOpen, setOutingTypePickerOpen] = useState(false);
  const [outDateObj, setOutDateObj] = useState<Date | null>(null);
  const [outTime, setOutTime] = useState<string | null>(null);
  const [returnTime, setReturnTime] = useState<string | null>(null);
  const [outingReason, setOutingReason] = useState("");
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [timePickerFor, setTimePickerFor] = useState<TimeField>(null);
  const [pickerYear, setPickerYear] = useState(today.getFullYear());
  const [pickerMonth, setPickerMonth] = useState(today.getMonth());

  // Complaints form
  const [complaintCategory, setComplaintCategory] = useState(complaintCategories[0]);
  const [categoryPickerOpen, setCategoryPickerOpen] = useState(false);
  const [hostelBlock, setHostelBlock] = useState("");
  const [roomNo, setRoomNo] = useState("");
  const [contactNumber, setContactNumber] = useState("");
  const [complaintDescription, setComplaintDescription] = useState("");

  // Mess feedback form
  const [meal, setMeal] = useState(meals[1]); // Lunch
  const [mealPickerOpen, setMealPickerOpen] = useState(false);
  const [foodQuality, setFoodQuality] = useState<Grade | null>(null);
  const [hygiene, setHygiene] = useState<Grade | null>(null);
  const [serviceTiming, setServiceTiming] = useState<Grade | null>(null);
  const [feedbackComments, setFeedbackComments] = useState("");

  useEffect(() => {
    getMyHostelRoom()
      .then((response) => {
        setRoom(response);
        setRoomStatus("success");
        if (response.is_hostel_resident) {
          setHostelBlock(response.hostel_name ?? "");
          setRoomNo(response.room_number ?? "");
        }
      })
      .catch(() => setRoomStatus("error"));
  }, []);

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

  function handleSubmitComplaint() {
    if (!hostelBlock.trim() || !roomNo.trim()) {
      toast.warning("Add the hostel block and room number");
      return;
    }
    if (!/^\d{10}$/.test(contactNumber.trim())) {
      toast.warning("Enter a valid 10-digit mobile number");
      return;
    }
    if (!complaintDescription.trim()) {
      toast.warning("Describe the issue");
      return;
    }

    setIsSubmitting(true);
    createMyHostelComplaint({
      category: CATEGORY_TO_ENUM[complaintCategory] ?? "other",
      title: `${complaintCategory} issue`.slice(0, 150),
      description: complaintDescription.trim(),
    })
      .then(() => {
        toast.success("Complaint raised with the warden's office");
        setContactNumber("");
        setComplaintDescription("");
      })
      .catch((err) => toast.error(getApiErrorMessage(err, "Couldn't raise the complaint.")))
      .finally(() => setIsSubmitting(false));
  }

  function handleSubmitFeedback() {
    if (!foodQuality || !hygiene || !serviceTiming) {
      toast.warning("Rate food quality, hygiene, and service and timing");
      return;
    }

    const rating = Math.round(
      (GRADE_TO_RATING[foodQuality] + GRADE_TO_RATING[hygiene] + GRADE_TO_RATING[serviceTiming]) / 3,
    );
    const comment = feedbackComments.trim() ? `${meal} - ${feedbackComments.trim()}` : meal;

    setIsSubmitting(true);
    createMyMessFeedback({ rating, comment })
      .then(() => {
        toast.success("Thanks for your feedback");
        setFoodQuality(null);
        setHygiene(null);
        setServiceTiming(null);
        setFeedbackComments("");
      })
      .catch((err) => toast.error(getApiErrorMessage(err, "Couldn't submit your feedback.")))
      .finally(() => setIsSubmitting(false));
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
        <Text style={styles.headerTitle}>Hostel services</Text>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.roomCard}>
          <View style={styles.roomIconWrap}>
            <Ionicons name="bed-outline" size={20} color="#2F6FE0" />
          </View>
          <View style={styles.roomTextWrap}>
            {roomStatus === "loading" ? (
              <Text style={styles.roomTitle}>Loading room details…</Text>
            ) : roomStatus === "error" ? (
              <Text style={styles.roomTitle}>Couldn't load room details</Text>
            ) : room?.is_hostel_resident ? (
              <>
                <Text style={styles.roomTitle}>
                  {room.hostel_name} · Room {room.room_number}
                </Text>
                <Text style={styles.roomSubtitle}>
                  {room.room_type_name}
                  {room.mess_type ? ` · ${room.mess_type}` : ""}
                </Text>
              </>
            ) : (
              <>
                <Text style={styles.roomTitle}>No hostel room assigned</Text>
                <Text style={styles.roomSubtitle}>You're registered as a day scholar</Text>
              </>
            )}
          </View>
        </View>

        <View style={styles.tabSwitch}>
          {TABS.map((t) => (
            <TouchableOpacity
              key={t.id}
              style={[styles.tabButton, tab === t.id && styles.tabButtonActive]}
              onPress={() => setTab(t.id)}
            >
              <Text style={[styles.tabButtonText, tab === t.id && styles.tabButtonTextActive]}>
                {t.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {tab === "outing" && (
          <View style={styles.card}>
            <Text style={styles.fieldLabel}>Outing type</Text>
            <TouchableOpacity
              style={styles.selectRow}
              onPress={() => setOutingTypePickerOpen(true)}
              activeOpacity={0.8}
            >
              <Text style={styles.selectValue}>{outingType}</Text>
              <Ionicons name="chevron-down" size={18} color="#B0B7C3" />
            </TouchableOpacity>

            <View style={styles.rowFields}>
              <View style={styles.rowField}>
                <Text style={styles.fieldLabel}>Out date</Text>
                <TouchableOpacity
                  style={styles.pickerButton}
                  onPress={() => setDatePickerOpen(true)}
                  activeOpacity={0.8}
                >
                  <Ionicons name="calendar-outline" size={14} color="#2F6FE0" />
                  <Text style={[styles.pickerButtonText, !outDateObj && styles.pickerButtonPlaceholder]}>
                    {outDateObj ? formatDate(outDateObj) : "Select"}
                  </Text>
                </TouchableOpacity>
              </View>
              <View style={styles.rowField}>
                <Text style={styles.fieldLabel}>Out time</Text>
                <TouchableOpacity
                  style={styles.pickerButton}
                  onPress={() => setTimePickerFor("out")}
                  activeOpacity={0.8}
                >
                  <Ionicons name="time-outline" size={14} color="#2F6FE0" />
                  <Text style={[styles.pickerButtonText, !outTime && styles.pickerButtonPlaceholder]}>
                    {outTime ?? "Select"}
                  </Text>
                </TouchableOpacity>
              </View>
              <View style={styles.rowField}>
                <Text style={styles.fieldLabel}>Return</Text>
                <TouchableOpacity
                  style={styles.pickerButton}
                  onPress={() => setTimePickerFor("return")}
                  activeOpacity={0.8}
                >
                  <Ionicons name="time-outline" size={14} color="#2F6FE0" />
                  <Text style={[styles.pickerButtonText, !returnTime && styles.pickerButtonPlaceholder]}>
                    {returnTime ?? "Select"}
                  </Text>
                </TouchableOpacity>
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

            <TouchableOpacity
              style={styles.submitButton}
              onPress={handleSubmitOuting}
              activeOpacity={0.85}
              disabled={isSubmitting}
            >
              <Text style={styles.submitButtonText}>Submit outing request</Text>
            </TouchableOpacity>
          </View>
        )}

        {tab === "complaints" && (
          <View style={styles.card}>
            <Text style={styles.fieldLabel}>Category</Text>
            <TouchableOpacity
              style={styles.selectRow}
              onPress={() => setCategoryPickerOpen(true)}
              activeOpacity={0.8}
            >
              <Text style={styles.selectValue}>{complaintCategory}</Text>
              <Ionicons name="chevron-down" size={18} color="#B0B7C3" />
            </TouchableOpacity>

            <View style={styles.rowFields}>
              <View style={styles.rowField}>
                <Text style={styles.fieldLabel}>Student name</Text>
                <View style={styles.readOnlyInput}>
                  <Text style={styles.readOnlyInputText}>{room?.student_name ?? "—"}</Text>
                </View>
              </View>
              <View style={styles.rowField}>
                <Text style={styles.fieldLabel}>Register no.</Text>
                <View style={styles.readOnlyInput}>
                  <Text style={styles.readOnlyInputText}>{room?.register_no ?? "—"}</Text>
                </View>
              </View>
            </View>

            <View style={styles.rowFields}>
              <View style={styles.rowField}>
                <Text style={styles.fieldLabel}>Hostel block</Text>
                <TextInput
                  style={styles.input}
                  placeholderTextColor="#9AA6B2"
                  value={hostelBlock}
                  onChangeText={setHostelBlock}
                />
              </View>
              <View style={styles.rowField}>
                <Text style={styles.fieldLabel}>Room no.</Text>
                <TextInput
                  style={styles.input}
                  placeholderTextColor="#9AA6B2"
                  value={roomNo}
                  onChangeText={setRoomNo}
                />
              </View>
            </View>

            <Text style={styles.fieldLabel}>Contact number</Text>
            <TextInput
              style={[styles.input, styles.inputLast]}
              placeholder="10-digit mobile number"
              placeholderTextColor="#9AA6B2"
              value={contactNumber}
              onChangeText={(text) => setContactNumber(text.replace(/[^0-9]/g, "").slice(0, 10))}
              keyboardType="number-pad"
              maxLength={10}
            />

            <Text style={[styles.fieldLabel, styles.fieldLabelSpaced]}>Describe the issue</Text>
            <TextInput
              style={[styles.input, styles.textArea, styles.inputLast]}
              placeholder="e.g. Ceiling fan in room 214 is not working"
              placeholderTextColor="#9AA6B2"
              value={complaintDescription}
              onChangeText={setComplaintDescription}
              multiline
            />

            <TouchableOpacity
              style={styles.submitButton}
              onPress={handleSubmitComplaint}
              activeOpacity={0.85}
              disabled={isSubmitting}
            >
              <Text style={styles.submitButtonText}>Raise complaint</Text>
            </TouchableOpacity>
          </View>
        )}

        {tab === "feedback" && (
          <View style={styles.card}>
            <Text style={styles.fieldLabel}>Meal</Text>
            <TouchableOpacity
              style={styles.selectRow}
              onPress={() => setMealPickerOpen(true)}
              activeOpacity={0.8}
            >
              <Text style={styles.selectValue}>{meal}</Text>
              <Ionicons name="chevron-down" size={18} color="#B0B7C3" />
            </TouchableOpacity>

            <GradeRow label="Food quality" value={foodQuality} onChange={setFoodQuality} />
            <GradeRow label="Hygiene and cleanliness" value={hygiene} onChange={setHygiene} />
            <GradeRow label="Service and timing" value={serviceTiming} onChange={setServiceTiming} />

            <Text style={styles.fieldLabel}>Comments (optional)</Text>
            <TextInput
              style={[styles.input, styles.textArea, styles.inputLast]}
              placeholder="Anything the mess committee should know"
              placeholderTextColor="#9AA6B2"
              value={feedbackComments}
              onChangeText={setFeedbackComments}
              multiline
            />

            <TouchableOpacity
              style={styles.submitButton}
              onPress={handleSubmitFeedback}
              activeOpacity={0.85}
              disabled={isSubmitting}
            >
              <Text style={styles.submitButtonText}>Submit feedback</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      <Modal
        visible={outingTypePickerOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setOutingTypePickerOpen(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setOutingTypePickerOpen(false)}
        >
          <TouchableOpacity style={styles.modalCard} activeOpacity={1}>
            <Text style={styles.modalTitle}>Outing Type</Text>
            {outingTypes.map((option) => (
              <TouchableOpacity
                key={option}
                style={styles.modalOptionRow}
                onPress={() => {
                  setOutingType(option);
                  setOutingTypePickerOpen(false);
                }}
                activeOpacity={0.8}
              >
                <Text style={styles.modalOptionName}>{option}</Text>
                {outingType === option && <Ionicons name="checkmark" size={18} color="#2F6FE0" />}
              </TouchableOpacity>
            ))}
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      <Modal
        visible={categoryPickerOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setCategoryPickerOpen(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setCategoryPickerOpen(false)}
        >
          <TouchableOpacity style={styles.modalCard} activeOpacity={1}>
            <Text style={styles.modalTitle}>Category</Text>
            {complaintCategories.map((option) => (
              <TouchableOpacity
                key={option}
                style={styles.modalOptionRow}
                onPress={() => {
                  setComplaintCategory(option);
                  setCategoryPickerOpen(false);
                }}
                activeOpacity={0.8}
              >
                <Text style={styles.modalOptionName}>{option}</Text>
                {complaintCategory === option && <Ionicons name="checkmark" size={18} color="#2F6FE0" />}
              </TouchableOpacity>
            ))}
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      <Modal
        visible={mealPickerOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setMealPickerOpen(false)}
      >
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setMealPickerOpen(false)}>
          <TouchableOpacity style={styles.modalCard} activeOpacity={1}>
            <Text style={styles.modalTitle}>Meal</Text>
            {meals.map((option) => (
              <TouchableOpacity
                key={option}
                style={styles.modalOptionRow}
                onPress={() => {
                  setMeal(option);
                  setMealPickerOpen(false);
                }}
                activeOpacity={0.8}
              >
                <Text style={styles.modalOptionName}>{option}</Text>
                {meal === option && <Ionicons name="checkmark" size={18} color="#2F6FE0" />}
              </TouchableOpacity>
            ))}
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

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

      <Modal
        visible={timePickerFor !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setTimePickerFor(null)}
      >
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setTimePickerFor(null)}>
          <TouchableOpacity style={styles.modalCard} activeOpacity={1}>
            <Text style={styles.modalTitle}>{timePickerFor === "out" ? "Out Time" : "Return Time"}</Text>
            <ScrollView style={styles.modalList}>
              {timeSlots.map((slot) => (
                <TouchableOpacity
                  key={slot}
                  style={styles.modalOptionRow}
                  onPress={() => handlePickTime(slot)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.modalOptionName}>{slot}</Text>
                  {(timePickerFor === "out" ? outTime : returnTime) === slot && (
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

function GradeRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: Grade | null;
  onChange: (grade: Grade) => void;
}) {
  return (
    <View style={styles.gradeSection}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.gradeRow}>
        {grades.map((item) => {
          const selected = value === item.grade;
          return (
            <TouchableOpacity
              key={item.grade}
              style={[styles.gradeBox, selected && styles.gradeBoxSelected]}
              onPress={() => onChange(item.grade)}
              activeOpacity={0.8}
            >
              <Text style={[styles.gradeLetter, selected && styles.gradeLetterSelected]}>{item.grade}</Text>
              <Text style={[styles.gradeSubLabel, selected && styles.gradeSubLabelSelected]}>{item.label}</Text>
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
    fontSize: 20,
    fontFamily: fonts.bold,
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  roomCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
  },
  roomIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#EAF0FD",
    alignItems: "center",
    justifyContent: "center",
  },
  roomTextWrap: {
    flex: 1,
  },
  roomTitle: {
    fontSize: 16,
    fontFamily: fonts.bold,
    color: "#111827",
  },
  roomSubtitle: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: "#9AA6B2",
    marginTop: 2,
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
    fontSize: 13,
    fontFamily: fonts.semibold,
    color: "#6B7280",
  },
  tabButtonTextActive: {
    color: "#fff",
    fontFamily: fonts.bold,
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
  fieldLabelSpaced: {
    marginTop: 4,
  },
  readOnlyInput: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#F1F3F6",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  readOnlyInputText: {
    fontSize: 14,
    fontFamily: fonts.regular,
    color: "#6B7280",
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
    paddingVertical: 14,
    marginBottom: 16,
  },
  selectValue: {
    fontSize: 16,
    fontFamily: fonts.regular,
    color: "#111827",
  },
  rowFields: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 16,
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
    paddingHorizontal: 10,
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
  },
  textArea: {
    height: 100,
    textAlignVertical: "top",
  },
  inputLast: {
    marginBottom: 16,
  },
  gradeSection: {
    marginBottom: 16,
  },
  gradeRow: {
    flexDirection: "row",
    gap: 8,
  },
  gradeBox: {
    flex: 1,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 2,
  },
  gradeBoxSelected: {
    borderColor: "#2F6FE0",
    backgroundColor: "#EAF0FD",
  },
  gradeLetter: {
    fontSize: 17,
    fontFamily: fonts.bold,
    color: "#111827",
  },
  gradeLetterSelected: {
    color: "#2F6FE0",
  },
  gradeSubLabel: {
    fontSize: 9,
    fontFamily: fonts.regular,
    color: "#9AA6B2",
    marginTop: 3,
    textAlign: "center",
  },
  gradeSubLabelSelected: {
    color: "#2F6FE0",
  },
  submitButton: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#2F6FE0",
    borderRadius: 14,
    paddingVertical: 16,
    elevation: 3,
    shadowColor: "#2F6FE0",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  submitButtonText: {
    fontSize: 15,
    fontFamily: fonts.bold,
    color: "#fff",
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
