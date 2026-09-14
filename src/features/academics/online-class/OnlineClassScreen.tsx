import { useCallback, useEffect, useMemo, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Modal, TextInput, StyleSheet } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { CollegeHeader } from "@/components/layout/CollegeHeader";
import { SkeletonListRows } from "@/components/ui/Skeleton";
import { fonts } from "@/theme";
import { toast } from "@/utils/toast";
import { getApiErrorMessage } from "@/services/api/client";
import { useRole } from "@/hooks/useRole";
import {
  getMyTimetable,
  getMyClassesToday,
  type MyTimetableSlot,
  type MyTimetableDay,
  type MyTodayClassSlot,
} from "@/services/api/current-semester.api";
import { getMyTeachingSubjects, type LmsTeachingSubject } from "@/services/api/lms.api";
import {
  getTodayOnlineClasses,
  getMyScheduledClasses,
  scheduleOnlineClass,
  type OnlineClass,
} from "@/services/api/online-class.api";

// "Today's sessions" merges two real sources: the real timetable (subject/
// teacher/time - GET /me/timetable for a student, GET /me/classes/today for
// a faculty/HoD, which additionally carries subject_id/class_id needed to
// start a session) and GET /online-classes/today (whether a faculty member
// has actually started a real LiveKit session for one of those periods
// today - see online-class.api.ts). A period only becomes "Live" once a
// real online_classes row exists - a student can never join off the clock
// alone, and a faculty/HoD sees "Start class" until they've done exactly
// that.
//
// Faculty/HoD additionally get a Schedule/Recordings tab pair: Schedule is
// real (today's sessions + the caller's own upcoming GET
// /online-classes/scheduled rows + a real POST /online-classes/schedule
// form). Recordings has no backend concept anywhere in this app (no
// LiveKit Egress/cloud-recording configured, no storage, no table) - it's
// a clearly-labeled mock list, not wired to anything real. Students keep
// the original single-list view (no tabs) since this split was requested
// for faculty specifically.

type TodaySession = {
  id: string;
  subject: string;
  metaLine: string;
  initials: string;
  timeRange: string;
  subjectId: number;
  classId: number | null;
  onlineClassId: number | null;
  isLive: boolean;
};

type ScheduledItem = {
  id: number;
  title: string;
  classLabel: string;
  subjectId: number;
  classId: number;
  dateLabel: string;
  timeLabel: string;
  isToday: boolean;
};

type Recording = {
  id: string;
  title: string;
  dateLabel: string;
  durationLabel: string;
};

type FacultyTab = "schedule" | "recordings";

const RECORDINGS: Recording[] = [
  { id: "1", title: "Mathematics · Squares and patterns", dateLabel: "2 Sept", durationLabel: "48 min" },
  { id: "2", title: "Science · States of matter", dateLabel: "1 Sept", durationLabel: "40 min" },
];

const TIME_SLOTS: string[] = Array.from({ length: 21 }, (_, i) => {
  const totalMinutes = 8 * 60 + i * 30; // 08:00 .. 18:00
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
});

function initialsFromName(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

function formatTime12h(hhmm: string): string {
  const [hourStr, minute] = hhmm.split(":");
  const hour = parseInt(hourStr, 10);
  const period = hour >= 12 ? "PM" : "AM";
  const hour12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${hour12}:${minute} ${period}`;
}

function timeToday(hhmm: string): Date {
  const [hour, minute] = hhmm.split(":").map(Number);
  const d = new Date();
  d.setHours(hour, minute, 0, 0);
  return d;
}

function liveBySubjectId(liveClasses: OnlineClass[]): Map<number, OnlineClass> {
  return new Map(liveClasses.filter((c) => c.status === "live").map((c) => [c.subject_id, c]));
}

// Only today's not-yet-ended periods, nearest first.
function buildStudentSessions(slots: MyTimetableSlot[], liveClasses: OnlineClass[]): TodaySession[] {
  const now = new Date();
  const live = liveBySubjectId(liveClasses);
  return slots
    .filter((slot) => timeToday(slot.end_time) >= now)
    .sort((a, b) => timeToday(a.start_time).getTime() - timeToday(b.start_time).getTime())
    .map((slot) => {
      const liveRow = live.get(slot.subject.id);
      return {
        id: String(slot.period_number),
        subject: slot.subject.name,
        metaLine: slot.faculty.name,
        initials: initialsFromName(slot.faculty.name),
        timeRange: `${formatTime12h(slot.start_time)} – ${formatTime12h(slot.end_time)}`,
        subjectId: slot.subject.id,
        classId: null,
        onlineClassId: liveRow?.id ?? null,
        isLive: liveRow !== undefined,
      };
    });
}

function buildFacultySessions(slots: MyTodayClassSlot[], liveClasses: OnlineClass[]): TodaySession[] {
  const now = new Date();
  const live = liveBySubjectId(liveClasses);
  return slots
    .filter((slot) => timeToday(slot.end_time) >= now)
    .sort((a, b) => a.period_number - b.period_number)
    .map((slot) => {
      const liveRow = live.get(slot.subject_id);
      return {
        id: String(slot.id),
        subject: slot.subject_name,
        metaLine: `Section ${slot.class_section}`,
        initials: initialsFromName(slot.subject_name),
        timeRange: `${formatTime12h(slot.start_time)} – ${formatTime12h(slot.end_time)}`,
        subjectId: slot.subject_id,
        classId: slot.class_id,
        onlineClassId: liveRow?.id ?? null,
        isLive: liveRow !== undefined,
      };
    });
}

function buildScheduledItems(rows: OnlineClass[], subjects: LmsTeachingSubject[]): ScheduledItem[] {
  const subjectById = new Map(subjects.map((s) => [s.subject_id, s]));
  return rows
    .filter((r) => r.scheduled_at)
    .map((r) => {
      const scheduledAt = new Date(r.scheduled_at!);
      const subject = subjectById.get(r.subject_id);
      const classLabel = subject?.classes.find((c) => c.class_id === r.class_id)?.label ?? "";
      return {
        id: r.id,
        title: r.title || subject?.subject_name || "Scheduled class",
        classLabel,
        subjectId: r.subject_id,
        classId: r.class_id,
        dateLabel: scheduledAt.toLocaleDateString(undefined, { day: "2-digit", month: "short" }),
        timeLabel: scheduledAt.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" }),
        isToday: r.class_date.slice(0, 10) === new Date().toISOString().slice(0, 10),
      };
    });
}

function nextDays(count: number): { label: string; dateLabel: string; iso: string }[] {
  const today = new Date();
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    return {
      label: i === 0 ? "Today" : i === 1 ? "Tomorrow" : d.toLocaleDateString(undefined, { weekday: "short" }),
      dateLabel: d.toLocaleDateString(undefined, { day: "2-digit", month: "short" }),
      iso: d.toISOString().slice(0, 10),
    };
  });
}

function OnlineClassHeader({ onBack, subtitle }: { onBack: () => void; subtitle: string }) {
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
        <Text style={styles.headerTitle}>Online class</Text>
        <Text style={styles.headerSubtitle}>{subtitle}</Text>
      </View>
    </LinearGradient>
  );
}

export function OnlineClassScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const role = useRole();
  const isFaculty = role === "employee" || role === "hod";

  const [tab, setTab] = useState<FacultyTab>("schedule");
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [sessions, setSessions] = useState<TodaySession[]>([]);
  const [scheduled, setScheduled] = useState<OnlineClass[]>([]);
  const [teachingSubjects, setTeachingSubjects] = useState<LmsTeachingSubject[]>([]);
  const [formOpen, setFormOpen] = useState(false);

  const load = useCallback(() => {
    setStatus("loading");
    const scheduleRequest = isFaculty ? getMyClassesToday() : getMyTimetable();
    const extras: Promise<unknown>[] = isFaculty ? [getMyScheduledClasses(), getMyTeachingSubjects()] : [];
    Promise.all([scheduleRequest, getTodayOnlineClasses(), ...extras])
      .then(([schedule, liveClasses, scheduledRows, subjects]) => {
        if (isFaculty) {
          setSessions(buildFacultySessions(schedule as MyTodayClassSlot[], liveClasses as OnlineClass[]));
          setScheduled((scheduledRows as OnlineClass[]) ?? []);
          setTeachingSubjects((subjects as LmsTeachingSubject[]) ?? []);
        } else {
          const todayDow = new Date().getDay();
          const todaySlots = (schedule as MyTimetableDay[]).find((d) => d.day_of_week === todayDow)?.slots ?? [];
          setSessions(buildStudentSessions(todaySlots, liveClasses as OnlineClass[]));
        }
        setStatus("success");
      })
      .catch(() => setStatus("error"));
  }, [isFaculty]);

  // Hides the shared CollegeHeader while any screen in this flow (this one,
  // the join lobby, or the in-call screen) is focused - deliberately NOT
  // restored on blur here. Join/Call push/replace forward into this same
  // hidden-header flow, and a screen's blur can fire either before or
  // after the next screen's own focus (React Navigation gives no ordering
  // guarantee across two different screens' focus/blur), so an unconditional
  // "restore on blur" here would race whichever screen comes next and
  // intermittently leave both headers stacked. Restoring only happens via
  // the explicit action below - actually navigating back out of the flow.
  useFocusEffect(
    useCallback(() => {
      load();
      navigation.getParent()?.setOptions({ headerShown: false });
    }, [load, navigation]),
  );

  // beforeRemove fires on THIS screen's own stack when it is actually being
  // popped (back button, hardware back, swipe-back) - unlike blur, it does
  // NOT fire when Join/Call get pushed on top of it, which is exactly the
  // distinction needed here: this is the one place CollegeHeader gets
  // restored, and it only fires for a real exit from this flow.
  useEffect(() => {
    return navigation.addListener("beforeRemove", () => {
      navigation.getParent()?.setOptions({ headerShown: true, header: () => <CollegeHeader /> });
    });
  }, [navigation]);


  const scheduledItems = useMemo(() => buildScheduledItems(scheduled, teachingSubjects), [scheduled, teachingSubjects]);

  function handleJoin(session: TodaySession) {
    if (!session.onlineClassId) return;
    router.push({
      pathname: "/(tabs)/academics/online-class/join",
      params: {
        mode: "join",
        onlineClassId: String(session.onlineClassId),
        initials: session.initials,
        teacher: session.metaLine,
        subject: session.subject,
        timeRange: session.timeRange,
      },
    } as never);
  }

  function handleStart(session: TodaySession) {
    if (!session.classId) return;
    router.push({
      pathname: "/(tabs)/academics/online-class/join",
      params: {
        mode: "start",
        subjectId: String(session.subjectId),
        classId: String(session.classId),
        initials: session.initials,
        teacher: session.metaLine,
        subject: session.subject,
        timeRange: session.timeRange,
      },
    } as never);
  }

  function handleStartScheduled(item: ScheduledItem) {
    router.push({
      pathname: "/(tabs)/academics/online-class/join",
      params: {
        mode: "start",
        subjectId: String(item.subjectId),
        classId: String(item.classId),
        initials: initialsFromName(item.title),
        teacher: item.classLabel || item.title,
        subject: item.title,
        timeRange: item.timeLabel,
      },
    } as never);
  }

  function handleWatch(recording: Recording) {
    toast.info(`This is a mock recording - "${recording.title}" isn't a real video.`);
  }

  function handleScheduled() {
    setFormOpen(false);
    load();
  }

  const subtitle = isFaculty ? (tab === "schedule" ? "Schedule and run your classes" : "Class recordings") : "Live and recorded sessions";

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <OnlineClassHeader
        // A faculty member or HoD reaches this via the Class tab's own
        // Campus grid (a separate tab's Stack) - see TimetableScreen's
        // identical comment for why router.back() alone isn't reliable
        // there. A student has their own dedicated Campus tab instead (this
        // screen's own Stack), where router.back() correctly pops back to
        // Academics.
        onBack={() =>
          role === "employee" || role === "hod" ? router.replace("/(tabs)/erp") : router.back()
        }
        subtitle={subtitle}
      />

      {isFaculty && (
        <View style={styles.tabRow}>
          <TouchableOpacity
            style={[styles.tabButton, tab === "schedule" && styles.tabButtonActive]}
            onPress={() => setTab("schedule")}
            activeOpacity={0.8}
          >
            <Text style={[styles.tabButtonText, tab === "schedule" && styles.tabButtonTextActive]}>Schedule</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabButton, tab === "recordings" && styles.tabButtonActive]}
            onPress={() => setTab("recordings")}
            activeOpacity={0.8}
          >
            <Text style={[styles.tabButtonText, tab === "recordings" && styles.tabButtonTextActive]}>Recordings</Text>
          </TouchableOpacity>
        </View>
      )}

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {(!isFaculty || tab === "schedule") && (
          <>
            <Text style={styles.sectionLabel}>Today's sessions</Text>
            {status === "loading" ? (
              <SkeletonListRows count={3} />
            ) : status === "error" ? (
              <View style={styles.centerState}>
                <Ionicons name="cloud-offline-outline" size={26} color="#B0B7C3" />
                <Text style={styles.centerStateText}>Couldn't load today's timetable.</Text>
                <TouchableOpacity onPress={load} activeOpacity={0.8}>
                  <Text style={styles.retryText}>Tap to retry</Text>
                </TouchableOpacity>
              </View>
            ) : sessions.length === 0 ? (
              <View style={styles.centerState}>
                <Ionicons name="calendar-outline" size={26} color="#B0B7C3" />
                <Text style={styles.centerStateText}>No more classes scheduled for today.</Text>
              </View>
            ) : (
              sessions.map((session) => (
                <SessionCard
                  key={session.id}
                  session={session}
                  isFaculty={isFaculty}
                  onJoin={() => handleJoin(session)}
                  onStart={() => handleStart(session)}
                />
              ))
            )}

            {isFaculty && (
              <>
                <View style={styles.scheduleSectionHeader}>
                  <Text style={styles.sectionLabel}>Upcoming scheduled</Text>
                  <TouchableOpacity style={styles.scheduleAddButton} onPress={() => setFormOpen(true)} activeOpacity={0.85}>
                    <Ionicons name="add" size={16} color="#fff" />
                    <Text style={styles.scheduleAddButtonText}>Schedule a class</Text>
                  </TouchableOpacity>
                </View>
                {status === "success" && scheduledItems.length === 0 ? (
                  <View style={styles.centerState}>
                    <Ionicons name="time-outline" size={26} color="#B0B7C3" />
                    <Text style={styles.centerStateText}>Nothing scheduled yet.</Text>
                  </View>
                ) : (
                  scheduledItems.map((item) => (
                    <ScheduledCard key={item.id} item={item} onStart={() => handleStartScheduled(item)} />
                  ))
                )}
              </>
            )}
          </>
        )}

        {isFaculty && tab === "recordings" && (
          <>
            <Text style={styles.sectionLabel}>Recordings</Text>
            <Text style={styles.mockNotice}>Sample data - not wired to real recordings yet.</Text>
            {RECORDINGS.map((recording) => (
              <RecordingRow key={recording.id} recording={recording} onWatch={() => handleWatch(recording)} />
            ))}
          </>
        )}

        {!isFaculty && (
          <>
            <Text style={styles.sectionLabel}>Recordings</Text>
            {RECORDINGS.map((recording) => (
              <RecordingRow key={recording.id} recording={recording} onWatch={() => handleWatch(recording)} />
            ))}
          </>
        )}
      </ScrollView>

      {isFaculty && (
        <ScheduleFormModal
          visible={formOpen}
          subjects={teachingSubjects}
          onClose={() => setFormOpen(false)}
          onScheduled={handleScheduled}
        />
      )}
    </SafeAreaView>
  );
}

function SessionCard({
  session,
  isFaculty,
  onJoin,
  onStart,
}: {
  session: TodaySession;
  isFaculty: boolean;
  onJoin: () => void;
  onStart: () => void;
}) {
  const stateBg = session.isLive ? "#FEF2F2" : "#EEF0F4";
  const stateText = session.isLive ? "#DC2626" : "#6B7280";
  const stateLabel = session.isLive ? "Live now" : isFaculty ? "Not started" : "Not started yet";

  const buttonLabel = session.isLive ? (isFaculty ? "Rejoin" : "Join") : isFaculty ? "Start class" : "Not started yet";
  const disabled = !session.isLive && !isFaculty;

  return (
    <View style={styles.sessionCard}>
      <View style={styles.sessionTopRow}>
        <View style={styles.sessionTitleWrap}>
          <Text style={styles.sessionSubject}>{session.subject}</Text>
          <Text style={styles.sessionMeta}>
            {session.metaLine} · {session.timeRange}
          </Text>
        </View>
        <View style={[styles.stateBadge, { backgroundColor: stateBg }]}>
          <Text style={[styles.stateBadgeText, { color: stateText }]}>{stateLabel}</Text>
        </View>
      </View>

      <View style={styles.sessionBottomRow}>
        <TouchableOpacity
          style={[styles.joinButton, disabled && styles.joinButtonDisabled]}
          onPress={session.isLive ? onJoin : isFaculty ? onStart : undefined}
          activeOpacity={0.85}
          disabled={disabled}
        >
          <Text style={[styles.joinButtonText, disabled && styles.joinButtonTextDisabled]}>{buttonLabel}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function ScheduledCard({ item, onStart }: { item: ScheduledItem; onStart: () => void }) {
  return (
    <View style={styles.scheduledCard}>
      <View style={styles.scheduledIconWrap}>
        <Ionicons name="calendar-outline" size={18} color="#2F6FE0" />
      </View>
      <View style={styles.scheduledTextWrap}>
        <Text style={styles.scheduledTitle} numberOfLines={1}>
          {item.title}
        </Text>
        <Text style={styles.scheduledMeta}>
          {item.dateLabel} · {item.timeLabel}
        </Text>
      </View>
      {item.isToday && (
        <TouchableOpacity style={styles.scheduledStartButton} onPress={onStart} activeOpacity={0.85}>
          <Text style={styles.scheduledStartButtonText}>Start</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

function RecordingRow({ recording, onWatch }: { recording: Recording; onWatch: () => void }) {
  return (
    <View style={styles.recordingRow}>
      <View style={styles.recordingIconWrap}>
        <Ionicons name="play" size={14} color="#2F6FE0" />
      </View>
      <View style={styles.recordingTextWrap}>
        <Text style={styles.recordingTitle} numberOfLines={1}>
          {recording.title}
        </Text>
        <Text style={styles.recordingMeta}>
          {recording.dateLabel} · {recording.durationLabel}
        </Text>
      </View>
      <TouchableOpacity onPress={onWatch} hitSlop={8}>
        <Text style={styles.watchLink}>Watch</Text>
      </TouchableOpacity>
    </View>
  );
}

function ScheduleFormModal({
  visible,
  subjects,
  onClose,
  onScheduled,
}: {
  visible: boolean;
  subjects: LmsTeachingSubject[];
  onClose: () => void;
  onScheduled: () => void;
}) {
  const [subjectId, setSubjectId] = useState<number | null>(null);
  const [classId, setClassId] = useState<number | null>(null);
  const [dayIso, setDayIso] = useState<string | null>(null);
  const [time, setTime] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const days = useMemo(() => nextDays(7), []);
  const selectedSubject = subjects.find((s) => s.subject_id === subjectId) ?? null;

  function reset() {
    setSubjectId(null);
    setClassId(null);
    setDayIso(null);
    setTime(null);
    setTitle("");
  }

  function handleClose() {
    reset();
    onClose();
  }

  function handleSubmit() {
    if (!subjectId || !classId || !dayIso || !time) {
      toast.error("Pick a subject, class, day and time first.");
      return;
    }
    const scheduledAt = new Date(`${dayIso}T${time}:00`).toISOString();
    setSubmitting(true);
    scheduleOnlineClass({ subjectId, classId, scheduledAt, title: title.trim() || undefined })
      .then(() => {
        toast.success("Class scheduled");
        reset();
        onScheduled();
      })
      .catch((err) => toast.error(getApiErrorMessage(err, "Couldn't schedule that class.")))
      .finally(() => setSubmitting(false));
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          <View style={styles.modalHeaderRow}>
            <Text style={styles.modalTitle}>Schedule a class</Text>
            <TouchableOpacity onPress={handleClose} hitSlop={8}>
              <Ionicons name="close" size={22} color="#111827" />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={styles.formLabel}>Subject</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.formChipRow}>
              {subjects.map((s) => (
                <TouchableOpacity
                  key={s.subject_id}
                  style={[styles.formChip, subjectId === s.subject_id && styles.formChipActive]}
                  onPress={() => {
                    setSubjectId(s.subject_id);
                    setClassId(null);
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.formChipText, subjectId === s.subject_id && styles.formChipTextActive]}>
                    {s.subject_name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={styles.formLabel}>Class</Text>
            {selectedSubject ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.formChipRow}>
                {selectedSubject.classes.map((c) => (
                  <TouchableOpacity
                    key={c.class_id}
                    style={[styles.formChip, classId === c.class_id && styles.formChipActive]}
                    onPress={() => setClassId(c.class_id)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.formChipText, classId === c.class_id && styles.formChipTextActive]}>{c.label}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            ) : (
              <Text style={styles.formHint}>Pick a subject first</Text>
            )}

            <Text style={styles.formLabel}>Day</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.formChipRow}>
              {days.map((d) => (
                <TouchableOpacity
                  key={d.iso}
                  style={[styles.formChip, dayIso === d.iso && styles.formChipActive]}
                  onPress={() => setDayIso(d.iso)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.formChipText, dayIso === d.iso && styles.formChipTextActive]}>
                    {d.label} · {d.dateLabel}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={styles.formLabel}>Time</Text>
            <View style={styles.timeGrid}>
              {TIME_SLOTS.map((t) => (
                <TouchableOpacity
                  key={t}
                  style={[styles.timeChip, time === t && styles.formChipActive]}
                  onPress={() => setTime(t)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.formChipText, time === t && styles.formChipTextActive]}>{formatTime12h(t)}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.formLabel}>Title (optional)</Text>
            <TextInput
              style={styles.formInput}
              placeholder="e.g. Weekly review session"
              placeholderTextColor="#9AA6B2"
              value={title}
              onChangeText={setTitle}
              maxLength={200}
            />
          </ScrollView>

          <TouchableOpacity
            style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            activeOpacity={0.85}
            disabled={submitting}
          >
            {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitButtonText}>Submit</Text>}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
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
  tabRow: {
    flexDirection: "row",
    backgroundColor: "#fff",
    marginHorizontal: 16,
    marginTop: 14,
    borderRadius: 12,
    padding: 4,
    gap: 4,
    elevation: 1,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  tabButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 9,
    paddingVertical: 10,
  },
  tabButtonActive: {
    backgroundColor: "#2F6FE0",
  },
  tabButtonText: {
    fontSize: 13,
    fontFamily: fonts.semibold,
    color: "#4B5563",
  },
  tabButtonTextActive: {
    color: "#fff",
    fontFamily: fonts.bold,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  sectionLabel: {
    fontSize: 12,
    fontFamily: fonts.bold,
    color: "#8A93A3",
    letterSpacing: 0.5,
    textTransform: "uppercase",
    marginBottom: 10,
    marginTop: 4,
  },
  mockNotice: {
    fontSize: 11.5,
    fontFamily: fonts.medium,
    color: "#B0B7C3",
    marginTop: -6,
    marginBottom: 12,
  },
  scheduleSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 8,
  },
  scheduleAddButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#2F6FE0",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
    marginBottom: 10,
  },
  scheduleAddButtonText: {
    fontSize: 12,
    fontFamily: fonts.bold,
    color: "#fff",
  },
  sessionCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#EEF0F4",
    padding: 14,
    marginBottom: 12,
  },
  sessionTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 8,
  },
  sessionTitleWrap: {
    flex: 1,
  },
  sessionSubject: {
    fontSize: 15,
    fontFamily: fonts.bold,
    color: "#111827",
  },
  sessionMeta: {
    fontSize: 11.5,
    fontFamily: fonts.regular,
    color: "#9AA6B2",
    marginTop: 2,
  },
  stateBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  stateBadgeText: {
    fontSize: 11,
    fontFamily: fonts.bold,
  },
  sessionBottomRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#F1F3F6",
  },
  centerState: {
    alignItems: "center",
    paddingVertical: 32,
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
  },
  joinButton: {
    borderRadius: 10,
    backgroundColor: "#2F6FE0",
    paddingHorizontal: 20,
    paddingVertical: 9,
  },
  joinButtonDisabled: {
    backgroundColor: "#EEF0F4",
  },
  joinButtonText: {
    fontSize: 12.5,
    fontFamily: fonts.bold,
    color: "#fff",
  },
  joinButtonTextDisabled: {
    color: "#9AA6B2",
  },
  scheduledCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#fff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#EEF0F4",
    padding: 12,
    marginBottom: 10,
  },
  scheduledIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#EAF0FD",
    alignItems: "center",
    justifyContent: "center",
  },
  scheduledTextWrap: {
    flex: 1,
  },
  scheduledTitle: {
    fontSize: 13,
    fontFamily: fonts.bold,
    color: "#111827",
  },
  scheduledMeta: {
    fontSize: 11.5,
    fontFamily: fonts.regular,
    color: "#9AA6B2",
    marginTop: 2,
  },
  scheduledStartButton: {
    backgroundColor: "#2F6FE0",
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  scheduledStartButtonText: {
    fontSize: 12,
    fontFamily: fonts.bold,
    color: "#fff",
  },
  recordingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#fff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#EEF0F4",
    padding: 12,
    marginBottom: 10,
  },
  recordingIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#EAF0FD",
    alignItems: "center",
    justifyContent: "center",
  },
  recordingTextWrap: {
    flex: 1,
  },
  recordingTitle: {
    fontSize: 13,
    fontFamily: fonts.bold,
    color: "#111827",
  },
  recordingMeta: {
    fontSize: 11.5,
    fontFamily: fonts.regular,
    color: "#9AA6B2",
    marginTop: 2,
  },
  watchLink: {
    fontSize: 12.5,
    fontFamily: fonts.bold,
    color: "#2F6FE0",
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(15,23,42,0.5)",
    padding: 20,
  },
  modalCard: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: "#fff",
    borderRadius: 22,
    maxHeight: "85%",
    paddingTop: 16,
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  modalHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  modalTitle: {
    fontSize: 16,
    fontFamily: fonts.bold,
    color: "#111827",
  },
  formLabel: {
    fontSize: 11.5,
    fontFamily: fonts.bold,
    color: "#8A93A3",
    letterSpacing: 0.4,
    textTransform: "uppercase",
    marginBottom: 8,
    marginTop: 14,
  },
  formHint: {
    fontSize: 12.5,
    fontFamily: fonts.medium,
    color: "#B0B7C3",
  },
  formChipRow: {
    flexGrow: 0,
  },
  formChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#fff",
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginRight: 8,
  },
  formChipActive: {
    backgroundColor: "#2F6FE0",
    borderColor: "#2F6FE0",
  },
  formChipText: {
    fontSize: 12.5,
    fontFamily: fonts.semibold,
    color: "#4B5563",
  },
  formChipTextActive: {
    color: "#fff",
  },
  timeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  timeChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#fff",
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  formInput: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 13.5,
    fontFamily: fonts.regular,
    color: "#111827",
  },
  submitButton: {
    marginTop: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#2F6FE0",
    borderRadius: 14,
    paddingVertical: 15,
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    fontSize: 14.5,
    fontFamily: fonts.bold,
    color: "#fff",
  },
});
