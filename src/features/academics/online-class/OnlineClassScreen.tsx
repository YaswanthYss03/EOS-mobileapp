import { useCallback, useEffect, useMemo, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Modal, TextInput, StyleSheet } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { CollegeHeader } from "@/components/layout/CollegeHeader";
import { SkeletonListRows } from "@/components/ui/Skeleton";
import { AnimatedTabBar, TabTransitionView, useTabScrollMemory } from "@/components/ui/tabs";
import { fonts } from "@/theme";
import { toast } from "@/utils/toast";
import { getApiErrorMessage } from "@/services/api/client";
import { useRole } from "@/hooks/useRole";
import {
  getMyTimetable,
  getMyClassesToday,
  type MyTimetableSlot,
  type MyTimetable,
  type MyTodayClassSlot,
} from "@/services/api/current-semester.api";
import { getMyTeachingSubjects, type LmsTeachingSubject } from "@/services/api/lms.api";
import { WatermarkBackground } from "@/components/layout/WatermarkBackground";
import { CalendarDatePicker } from "@/components/ui/CalendarDatePicker";
import { TimeWheelPicker } from "@/components/ui/TimeWheelPicker";
import {
  getTodayOnlineClasses,
  getMyMeetings,
  getRecordingSubjects,
  scheduleOnlineClass,
  MAX_CLASSES_PER_MEETING,
  type OnlineClass,
  type MyMeeting,
  type RecordingSubject,
} from "@/services/api/online-class.api";
import { toIsoDate } from "@/utils/calendar";

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
// today's sessions + the caller's own upcoming/live meetings (GET
// /online-classes/meetings - a meeting shared with several classes is one
// entry) + the POST /online-classes/schedule form (multi-class). Recordings
// is one folder per subject the faculty teaches (GET
// /online-classes/recordings/subjects), opening that subject's recordings
// (LiveKit Egress -> Supabase Storage). Students keep the original
// single-list view (no tabs) since this split was requested for faculty
// specifically.

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
  // Student view: the online session's state for today, when one exists.
  sessionState?: "scheduled" | "live" | "completed";
  startsAtLabel?: string;
};

// While the list is open it refreshes on its own so "Live now" shows up
// without a manual refresh (e.g. a full day of back-to-back classes).
const AUTO_REFRESH_MS = 30_000;

type MeetingItem = {
  id: number;
  title: string;
  subjectName: string;
  sectionsLabel: string;
  whenLabel: string;
  isToday: boolean;
  isLive: boolean;
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

// Only today's not-yet-ended periods, nearest first.
function timeLabel(iso: string | null): string | undefined {
  return iso ? new Date(iso).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" }) : undefined;
}

/**
 * A student's day: every timetable period still ahead (or still live),
 * plus any online session for their class today that isn't on the
 * timetable - e.g. a full day of scheduled online classes while the
 * college is closed. Live sessions come first.
 */
function buildStudentSessions(slots: MyTimetableSlot[], todayRows: OnlineClass[]): TodaySession[] {
  const now = new Date();
  const bySubject = new Map(todayRows.map((r) => [r.subject_id, r]));
  const fromTimetable: TodaySession[] = slots
    .filter((slot) => timeToday(slot.end_time) >= now || bySubject.get(slot.subject.id)?.status === "live")
    .sort((a, b) => timeToday(a.start_time).getTime() - timeToday(b.start_time).getTime())
    .map((slot) => {
      const row = bySubject.get(slot.subject.id);
      return {
        id: `tt-${slot.period_number}`,
        subject: slot.subject.name,
        metaLine: slot.faculty.name,
        initials: initialsFromName(slot.faculty.name),
        timeRange: `${formatTime12h(slot.start_time)} – ${formatTime12h(slot.end_time)}`,
        subjectId: slot.subject.id,
        classId: null,
        onlineClassId: row?.status === "live" ? row.id : null,
        isLive: row?.status === "live",
        sessionState: row?.status,
        startsAtLabel: timeLabel(row?.scheduled_at ?? null),
      };
    });

  const onTimetable = new Set(slots.map((s) => s.subject.id));
  const extra: TodaySession[] = todayRows
    .filter((r) => !onTimetable.has(r.subject_id))
    .map((r) => {
      const teacher = r.faculty_name ?? "";
      const when = timeLabel(r.scheduled_at ?? r.started_at);
      return {
        id: `oc-${r.id}`,
        subject: r.title || r.subject_name || "Online class",
        metaLine: r.title && r.subject_name ? `${r.subject_name} · ${teacher}` : teacher,
        initials: initialsFromName(teacher || r.subject_name || "OC"),
        timeRange: when ?? "",
        subjectId: r.subject_id,
        classId: null,
        onlineClassId: r.status === "live" ? r.id : null,
        isLive: r.status === "live",
        sessionState: r.status,
        startsAtLabel: timeLabel(r.scheduled_at),
      };
    });

  const all = [...fromTimetable, ...extra];
  return [...all.filter((x) => x.isLive), ...all.filter((x) => !x.isLive)];
}

function buildFacultySessions(slots: MyTodayClassSlot[], liveClasses: OnlineClass[]): TodaySession[] {
  const now = new Date();
  // A faculty member can teach the same subject to several classes, so a
  // live session is matched on subject AND class.
  const live = new Map(
    liveClasses.filter((c) => c.status === "live").map((c) => [`${c.subject_id}:${c.class_id}`, c]),
  );
  return slots
    .filter((slot) => timeToday(slot.end_time) >= now || live.has(`${slot.subject_id}:${slot.class_id}`))
    .sort((a, b) => a.period_number - b.period_number)
    .map((slot) => {
      const liveRow = live.get(`${slot.subject_id}:${slot.class_id}`);
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

function buildMeetingItems(meetings: MyMeeting[], subjects: LmsTeachingSubject[]): MeetingItem[] {
  const subjectById = new Map(subjects.map((s) => [s.subject_id, s]));
  return meetings.map((m) => {
    const subject = subjectById.get(m.subject_id);
    const sections = m.classes.map(
      (c) => subject?.classes.find((sc) => sc.class_id === c.class_id)?.label ?? `Section ${c.section}`,
    );
    const at = m.scheduled_at ? new Date(m.scheduled_at) : m.started_at ? new Date(m.started_at) : null;
    const dayLabel = m.is_today
      ? "Today"
      : new Date(`${m.class_date}T00:00:00`).toLocaleDateString(undefined, { weekday: "short", day: "2-digit", month: "short" });
    const timeLabel = at ? at.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" }) : "";
    return {
      id: m.id,
      title: m.title || m.subject_name,
      subjectName: m.subject_name,
      sectionsLabel: sections.join(", "),
      whenLabel: timeLabel ? `${dayLabel} · ${timeLabel}` : dayLabel,
      isToday: m.is_today,
      isLive: m.status === "live",
    };
  });
}

// Slots at least 5 minutes in the future are schedulable (the backend
// rejects past times).
function isSlotInFuture(dayIso: string, hhmm: string): boolean {
  return new Date(`${dayIso}T${hhmm}:00`).getTime() > Date.now() + 5 * 60 * 1000;
}

// TimeWheelPicker speaks "HH:MM AM/PM"; the rest of this screen (and the
// backend payload) speaks 24-hour "HH:MM" - convert at the boundary.
function to12h(hhmm24: string | null): string | null {
  if (!hhmm24) return null;
  const [h, m] = hhmm24.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${String(hour12).padStart(2, "0")}:${String(m).padStart(2, "0")} ${period}`;
}

function to24h(hhmm12: string): string {
  const match = /^(\d{2}):(\d{2}) (AM|PM)$/.exec(hhmm12);
  if (!match) return hhmm12;
  let hour = Number(match[1]) % 12;
  if (match[3] === "PM") hour += 12;
  return `${String(hour).padStart(2, "0")}:${match[2]}`;
}

const FOLDER_COLORS = ["#2F6FE0", "#7C3AED", "#0EA5A4", "#DB2777", "#D97706", "#4F46E5"];

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
  const [meetings, setMeetings] = useState<MyMeeting[]>([]);
  const [recordingSubjects, setRecordingSubjects] = useState<RecordingSubject[]>([]);
  const [recordingsEnabled, setRecordingsEnabled] = useState(true);
  const [recordingsStatus, setRecordingsStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [teachingSubjects, setTeachingSubjects] = useState<LmsTeachingSubject[]>([]);
  const [formOpen, setFormOpen] = useState(false);
  const scrollMemory = useTabScrollMemory();

  const load = useCallback((silent = false) => {
    if (!silent) setStatus("loading");
    const scheduleRequest = isFaculty ? getMyClassesToday() : getMyTimetable();
    const extras: Promise<unknown>[] = isFaculty ? [getMyMeetings(), getMyTeachingSubjects()] : [];
    Promise.all([scheduleRequest, getTodayOnlineClasses(), ...extras])
      .then(([schedule, liveClasses, meetingRows, subjects]) => {
        if (isFaculty) {
          setSessions(buildFacultySessions(schedule as MyTodayClassSlot[], liveClasses as OnlineClass[]));
          setMeetings((meetingRows as MyMeeting[]) ?? []);
          setTeachingSubjects((subjects as LmsTeachingSubject[]) ?? []);
        } else {
          const todayDow = new Date().getDay();
          const todaySlots =
            (schedule as MyTimetable).days.find((d) => d.day_of_week === todayDow)?.slots ?? [];
          setSessions(buildStudentSessions(todaySlots, liveClasses as OnlineClass[]));
        }
        setStatus("success");
      })
      // A failed background refresh keeps what's on screen.
      .catch(() => {
        if (!silent) setStatus("error");
      });
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
      const timer = setInterval(() => load(true), AUTO_REFRESH_MS);
      return () => clearInterval(timer);
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


  const meetingItems = useMemo(() => buildMeetingItems(meetings, teachingSubjects), [meetings, teachingSubjects]);

  const loadRecordingFolders = useCallback(() => {
    setRecordingsStatus("loading");
    getRecordingSubjects()
      .then((res) => {
        setRecordingSubjects(res.subjects);
        setRecordingsEnabled(res.recordings_enabled);
        setRecordingsStatus("success");
      })
      .catch(() => setRecordingsStatus("error"));
  }, []);

  // Folders load the first time the Recordings tab is opened, and refresh
  // each time this screen regains focus while on that tab.
  useEffect(() => {
    if (isFaculty && tab === "recordings") loadRecordingFolders();
  }, [isFaculty, tab, loadRecordingFolders]);

  // A faculty/HoD reaches this screen via the erp tab's own local copy (see
  // app/(tabs)/erp/online-class/index.tsx) so it never crosses into the
  // Campus tab, which is hidden from their bottom nav entirely - crossing
  // into a hidden tab left the Tabs navigator's own back-stack corrupted
  // (the exact "switching tabs exits the app" bug). A student uses their
  // own dedicated Campus tab instead, unchanged.
  const basePath = role === "employee" || role === "hod" ? "/(tabs)/erp/online-class" : "/(tabs)/academics/online-class";

  function handleJoin(session: TodaySession) {
    if (!session.onlineClassId) return;
    router.push({
      pathname: `${basePath}/join`,
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
      pathname: `${basePath}/join`,
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

  // Start (or rejoin, when already live) exactly this meeting, for every
  // class it's shared with.
  function handleStartMeeting(item: MeetingItem) {
    router.push({
      pathname: `${basePath}/join`,
      params: {
        mode: "startMeeting",
        onlineClassId: String(item.id),
        initials: initialsFromName(item.subjectName),
        teacher: item.sectionsLabel || item.subjectName,
        subject: item.title,
        timeRange: item.whenLabel,
      },
    } as never);
  }

  function openRecordingFolder(subject: RecordingSubject) {
    router.push({
      pathname: `${basePath}/recordings/[subjectId]`,
      params: { subjectId: String(subject.subject_id), subjectName: subject.subject_name },
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
      <WatermarkBackground />
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
        <AnimatedTabBar
          tabs={[
            { key: "schedule" as FacultyTab, label: "Schedule" },
            { key: "recordings" as FacultyTab, label: "Recordings" },
          ]}
          active={tab}
          onChange={setTab}
          containerStyle={styles.tabRow}
          tabStyle={styles.tabButton}
          tabTextStyle={styles.tabButtonText}
          activeTabTextStyle={styles.tabButtonTextActive}
          indicatorStyle={styles.tabIndicator}
        />
      )}

      {isFaculty ? (
        <TabTransitionView activeKey={tab} order={["schedule", "recordings"]} style={styles.tabContent}>
          {tab === "schedule" ? (
            <ScrollView
              contentContainerStyle={styles.content}
              showsVerticalScrollIndicator={false}
              {...scrollMemory.bind("schedule")}
            >
              <Text style={styles.sectionLabel}>Today's sessions</Text>
              {status === "loading" ? (
                <SkeletonListRows count={3} />
              ) : status === "error" ? (
                <View style={styles.centerState}>
                  <Ionicons name="cloud-offline-outline" size={26} color="#B0B7C3" />
                  <Text style={styles.centerStateText}>Couldn't load today's timetable.</Text>
                  <TouchableOpacity onPress={() => load()} activeOpacity={0.8}>
                    <Text style={styles.retryText}>Tap to retry</Text>
                  </TouchableOpacity>
                </View>
              ) : sessions.length === 0 ? (
                <View style={styles.centerState}>
                  <Ionicons name="calendar-outline" size={26} color="#B0B7C3" />
                  <Text style={styles.centerStateText}>No more classes scheduled for today.</Text>
                </View>
              ) : (
                <View style={styles.listCard}>
                  {sessions.map((session, index) => (
                    <SessionCard
                      key={session.id}
                      session={session}
                      isFaculty={isFaculty}
                      isFirst={index === 0}
                      onJoin={() => handleJoin(session)}
                      onStart={() => handleStart(session)}
                    />
                  ))}
                </View>
              )}

              <View style={styles.scheduleSectionHeader}>
                <Text style={styles.sectionLabel}>Upcoming scheduled</Text>
                <TouchableOpacity style={styles.scheduleAddButton} onPress={() => setFormOpen(true)} activeOpacity={0.85}>
                  <Ionicons name="add" size={16} color="#fff" />
                  <Text style={styles.scheduleAddButtonText}>Schedule a class</Text>
                </TouchableOpacity>
              </View>
              {status === "success" && meetingItems.length === 0 ? (
                <View style={styles.centerState}>
                  <Ionicons name="time-outline" size={26} color="#B0B7C3" />
                  <Text style={styles.centerStateText}>Nothing scheduled yet.</Text>
                </View>
              ) : (
                status === "success" && <MeetingsCard items={meetingItems} onStart={handleStartMeeting} />
              )}
            </ScrollView>
          ) : (
            <ScrollView
              contentContainerStyle={styles.content}
              showsVerticalScrollIndicator={false}
              {...scrollMemory.bind("recordings")}
            >
              <Text style={styles.sectionLabel}>Your subjects</Text>
              {recordingsStatus === "loading" || recordingsStatus === "idle" ? (
                <SkeletonListRows count={3} />
              ) : recordingsStatus === "error" ? (
                <View style={styles.centerState}>
                  <Ionicons name="cloud-offline-outline" size={26} color="#B0B7C3" />
                  <Text style={styles.centerStateText}>Couldn't load recordings.</Text>
                  <TouchableOpacity onPress={loadRecordingFolders} activeOpacity={0.8}>
                    <Text style={styles.retryText}>Tap to retry</Text>
                  </TouchableOpacity>
                </View>
              ) : recordingSubjects.length === 0 ? (
                <View style={styles.centerState}>
                  <Ionicons name="folder-open-outline" size={26} color="#B0B7C3" />
                  <Text style={styles.centerStateText}>You are not mapped to teach any subjects yet.</Text>
                </View>
              ) : (
                <>
                  {!recordingsEnabled && (
                    <View style={styles.infoBanner}>
                      <Ionicons name="information-circle-outline" size={16} color="#2F6FE0" />
                      <Text style={styles.infoBannerText}>Class recording isn't switched on yet. Recordings will appear here once it is.</Text>
                    </View>
                  )}
                  <View style={styles.folderGrid}>
                    {recordingSubjects.map((subject) => (
                      <TouchableOpacity
                        key={subject.subject_id}
                        style={styles.folderCard}
                        activeOpacity={0.85}
                        onPress={() => openRecordingFolder(subject)}
                      >
                        <View
                          style={[
                            styles.folderIcon,
                            { backgroundColor: FOLDER_COLORS[subject.subject_id % FOLDER_COLORS.length] },
                          ]}
                        >
                          <Ionicons name="folder" size={22} color="#fff" />
                        </View>
                        <Text style={styles.folderName} numberOfLines={2}>
                          {subject.subject_name}
                        </Text>
                        <Text style={styles.folderMeta}>
                          {subject.subject_code}
                          {subject.recording_count !== null
                            ? ` · ${subject.recording_count} ${subject.recording_count === 1 ? "video" : "videos"}`
                            : ""}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </>
              )}
            </ScrollView>
          )}
        </TabTransitionView>
      ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <Text style={styles.sectionLabel}>Today's sessions</Text>
          {status === "loading" ? (
            <SkeletonListRows count={3} />
          ) : status === "error" ? (
            <View style={styles.centerState}>
              <Ionicons name="cloud-offline-outline" size={26} color="#B0B7C3" />
              <Text style={styles.centerStateText}>Couldn't load today's timetable.</Text>
              <TouchableOpacity onPress={() => load()} activeOpacity={0.8}>
                <Text style={styles.retryText}>Tap to retry</Text>
              </TouchableOpacity>
            </View>
          ) : sessions.length === 0 ? (
            <View style={styles.centerState}>
              <Ionicons name="calendar-outline" size={26} color="#B0B7C3" />
              <Text style={styles.centerStateText}>No more classes scheduled for today.</Text>
            </View>
          ) : (
            <View style={styles.listCard}>
              {sessions.map((session, index) => (
                <SessionCard
                  key={session.id}
                  session={session}
                  isFaculty={isFaculty}
                  isFirst={index === 0}
                  onJoin={() => handleJoin(session)}
                  onStart={() => handleStart(session)}
                />
              ))}
            </View>
          )}

          <Text style={styles.sectionLabel}>Recordings</Text>
          <View style={styles.listCard}>
            {RECORDINGS.map((recording, index) => (
              <RecordingRow key={recording.id} recording={recording} isFirst={index === 0} onWatch={() => handleWatch(recording)} />
            ))}
          </View>
        </ScrollView>
      )}

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
  isFirst,
  onJoin,
  onStart,
}: {
  session: TodaySession;
  isFaculty: boolean;
  isFirst: boolean;
  onJoin: () => void;
  onStart: () => void;
}) {
  const stateBg = session.isLive ? "#FEF2F2" : session.sessionState === "scheduled" ? "#EAF0FD" : "#EEF0F4";
  const stateText = session.isLive ? "#DC2626" : session.sessionState === "scheduled" ? "#2F6FE0" : "#6B7280";
  const stateLabel = session.isLive
    ? "Live now"
    : session.sessionState === "completed"
      ? "Ended"
      : session.sessionState === "scheduled"
        ? session.startsAtLabel
          ? `Starts ${session.startsAtLabel}`
          : "Scheduled"
        : "Not started yet";

  const buttonLabel = session.isLive
    ? "Join"
    : session.sessionState === "completed"
      ? "Class ended"
      : "Not started yet";
  const disabled = !session.isLive && !isFaculty;

  return (
    <View style={[styles.sessionRow, !isFirst && styles.rowDivider]}>
      <View style={styles.sessionTopRow}>
        <View style={styles.sessionTitleWrap}>
          <Text style={styles.sessionSubject}>{session.subject}</Text>
          <Text style={styles.sessionMeta}>
            {session.metaLine} · {session.timeRange}
          </Text>
        </View>
        {!isFaculty && (
          <View style={[styles.stateBadge, { backgroundColor: stateBg }]}>
            <Text style={[styles.stateBadgeText, { color: stateText }]}>{stateLabel}</Text>
          </View>
        )}
      </View>

      <View style={styles.sessionBottomRow}>
        {isFaculty ? (
          session.isLive ? (
            <LiveNowButton onPress={onJoin} />
          ) : (
            <TouchableOpacity style={styles.joinButton} onPress={onStart} activeOpacity={0.85}>
              <Text style={styles.joinButtonText}>Start class</Text>
            </TouchableOpacity>
          )
        ) : (
        <TouchableOpacity
          style={[styles.joinButton, disabled && styles.joinButtonDisabled]}
          onPress={session.isLive ? onJoin : isFaculty ? onStart : undefined}
          activeOpacity={0.85}
          disabled={disabled}
        >
          <Text style={[styles.joinButtonText, disabled && styles.joinButtonTextDisabled]}>{buttonLabel}</Text>
        </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

// Shown where "Start" was once a meeting is live - tapping rejoins it
// (the meeting's timer keeps running from its real start).
function LiveNowButton({ onPress }: { onPress: () => void }) {
  return (
    <TouchableOpacity
      style={styles.liveNowButton}
      onPress={onPress}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel="Live now, tap to rejoin"
    >
      <View style={styles.liveNowDot} />
      <Text style={styles.liveNowText}>Live now</Text>
      <Ionicons name="chevron-forward" size={14} color="#DC2626" />
    </TouchableOpacity>
  );
}

// Every upcoming/live meeting in one card, one aligned row each.
function MeetingsCard({ items, onStart }: { items: MeetingItem[]; onStart: (item: MeetingItem) => void }) {
  return (
    <View style={styles.meetingsCard}>
      {items.map((item, index) => (
        <View key={item.id} style={[styles.meetingRow, index > 0 && styles.meetingRowDivider]}>
          <View style={[styles.meetingIcon, item.isLive && styles.meetingIconLive]}>
            <Ionicons name={item.isLive ? "radio" : "calendar-outline"} size={17} color={item.isLive ? "#DC2626" : "#2F6FE0"} />
          </View>
          <View style={styles.meetingTextWrap}>
            <Text style={styles.meetingTitle} numberOfLines={1}>
              {item.title}
            </Text>
            <Text style={styles.meetingMeta} numberOfLines={1}>
              {item.title !== item.subjectName ? `${item.subjectName} · ` : ""}
              {item.sectionsLabel}
            </Text>
            <Text style={styles.meetingWhen}>{item.whenLabel}</Text>
          </View>
          {item.isLive ? (
            <LiveNowButton onPress={() => onStart(item)} />
          ) : item.isToday ? (
            <TouchableOpacity style={styles.meetingStartButton} onPress={() => onStart(item)} activeOpacity={0.85}>
              <Ionicons name="videocam" size={14} color="#fff" />
              <Text style={styles.meetingStartText}>Start</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.upcomingChip}>
              <Text style={styles.upcomingChipText}>Upcoming</Text>
            </View>
          )}
        </View>
      ))}
    </View>
  );
}

function RecordingRow({ recording, isFirst, onWatch }: { recording: Recording; isFirst: boolean; onWatch: () => void }) {
  return (
    <View style={[styles.recordingRow, !isFirst && styles.rowDivider]}>
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
  const [classIds, setClassIds] = useState<number[]>([]);
  const [dayIso, setDayIso] = useState<string | null>(null);
  const [time, setTime] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [timePickerOpen, setTimePickerOpen] = useState(false);

  const todayIso = useMemo(() => toIsoDate(new Date()), []);
  const maxDayIso = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 60);
    return toIsoDate(d);
  }, []);
  const selectedSubject = subjects.find((s) => s.subject_id === subjectId) ?? null;

  function reset() {
    setSubjectId(null);
    setClassIds([]);
    setDayIso(null);
    setTime(null);
    setTitle("");
  }

  function handleClose() {
    reset();
    onClose();
  }

  function toggleClass(id: number) {
    setClassIds((prev) => {
      if (prev.includes(id)) return prev.filter((c) => c !== id);
      if (prev.length >= MAX_CLASSES_PER_MEETING) {
        toast.info(`You can share a meeting with up to ${MAX_CLASSES_PER_MEETING} classes.`);
        return prev;
      }
      return [...prev, id];
    });
  }

  function handleSubmit() {
    if (!subjectId || classIds.length === 0 || !dayIso || !time) {
      toast.error("Pick a subject, at least one class, a day and a time first.");
      return;
    }
    if (!isSlotInFuture(dayIso, time)) {
      toast.error("That time has already passed - pick a later time.");
      return;
    }
    const scheduledAt = new Date(`${dayIso}T${time}:00`).toISOString();
    setSubmitting(true);
    scheduleOnlineClass({ subjectId, classIds, scheduledAt, title: title.trim() || undefined })
      .then(() => {
        toast.success(classIds.length > 1 ? `Class scheduled for ${classIds.length} classes` : "Class scheduled");
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
                    setClassIds([]);
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.formChipText, subjectId === s.subject_id && styles.formChipTextActive]}>
                    {s.subject_name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <View style={styles.formLabelRow}>
              <Text style={styles.formLabel}>Classes</Text>
              {selectedSubject && selectedSubject.classes.length > 1 && (
                <TouchableOpacity
                  onPress={() =>
                    setClassIds(
                      classIds.length === selectedSubject.classes.length
                        ? []
                        : selectedSubject.classes.slice(0, MAX_CLASSES_PER_MEETING).map((c) => c.class_id),
                    )
                  }
                  hitSlop={8}
                >
                  <Text style={styles.selectAllText}>
                    {classIds.length === selectedSubject.classes.length ? "Clear" : "Select all"}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
            {selectedSubject ? (
              <>
                <View style={styles.listCard}>
                  {selectedSubject.classes.map((c, index) => {
                    const selected = classIds.includes(c.class_id);
                    return (
                      <TouchableOpacity
                        key={c.class_id}
                        style={[styles.classRow, index > 0 && styles.rowDivider]}
                        onPress={() => toggleClass(c.class_id)}
                        activeOpacity={0.7}
                        accessibilityRole="checkbox"
                        accessibilityState={{ checked: selected }}
                      >
                        <Text style={styles.classRowLabel}>{c.label}</Text>
                        <Ionicons
                          name={selected ? "checkmark-circle" : "ellipse-outline"}
                          size={20}
                          color={selected ? "#2F6FE0" : "#C6CCD6"}
                        />
                      </TouchableOpacity>
                    );
                  })}
                </View>
                <Text style={styles.formHint}>
                  {classIds.length > 1
                    ? `One meeting shared with ${classIds.length} classes`
                    : "Select one or more classes to share this meeting with"}
                </Text>
              </>
            ) : (
              <Text style={styles.formHint}>Pick a subject first</Text>
            )}

            <Text style={styles.formLabel}>Day</Text>
            <TouchableOpacity
              style={styles.pickerField}
              onPress={() => setDatePickerOpen(true)}
              activeOpacity={0.8}
            >
              <Ionicons name="calendar-outline" size={18} color="#2F6FE0" />
              <Text style={[styles.pickerFieldText, !dayIso && styles.pickerFieldPlaceholder]}>
                {dayIso
                  ? new Date(`${dayIso}T00:00:00`).toLocaleDateString(undefined, {
                      weekday: "short",
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })
                  : "Select a date"}
              </Text>
              <Ionicons name="chevron-down" size={16} color="#9AA6B2" />
            </TouchableOpacity>

            <Text style={styles.formLabel}>Time</Text>
            <TouchableOpacity
              style={styles.pickerField}
              onPress={() => setTimePickerOpen(true)}
              activeOpacity={0.8}
            >
              <Ionicons name="time-outline" size={18} color="#2F6FE0" />
              <Text style={[styles.pickerFieldText, !time && styles.pickerFieldPlaceholder]}>
                {time ? formatTime12h(time) : "Select a time"}
              </Text>
              <Ionicons name="chevron-down" size={16} color="#9AA6B2" />
            </TouchableOpacity>

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

      <CalendarDatePicker
        visible={datePickerOpen}
        title="Select a date"
        valueIso={dayIso}
        minDateIso={todayIso}
        maxDateIso={maxDayIso}
        onClose={() => setDatePickerOpen(false)}
        onChange={(iso) => {
          setDayIso(iso);
          if (time && !isSlotInFuture(iso, time)) setTime(null);
        }}
      />
      <TimeWheelPicker
        visible={timePickerOpen}
        title="Select a time"
        value={to12h(time)}
        onClose={() => setTimePickerOpen(false)}
        onChange={(value12h) => setTime(to24h(value12h))}
      />
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
  tabIndicator: {
    top: 0,
    bottom: 0,
    borderRadius: 9,
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
  tabContent: {
    flex: 1,
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
  listCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#EEF0F4",
    paddingHorizontal: 14,
    marginBottom: 12,
  },
  rowDivider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#E5E7EB",
  },
  sessionRow: {
    paddingVertical: 14,
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
  liveNowButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FECACA",
    borderRadius: 999,
    paddingLeft: 10,
    paddingRight: 8,
    paddingVertical: 7,
  },
  liveNowDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#DC2626",
  },
  liveNowText: {
    fontSize: 12.5,
    fontFamily: fonts.bold,
    color: "#DC2626",
  },
  meetingsCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#EEF0F4",
    paddingHorizontal: 14,
    marginBottom: 12,
    elevation: 1,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
  },
  meetingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 14,
  },
  meetingRowDivider: {
    borderTopWidth: 1,
    borderTopColor: "#F1F3F6",
  },
  meetingIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "#EAF0FD",
    alignItems: "center",
    justifyContent: "center",
  },
  meetingIconLive: {
    backgroundColor: "#FEF2F2",
  },
  meetingTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  meetingTitle: {
    fontSize: 14,
    fontFamily: fonts.bold,
    color: "#111827",
  },
  meetingMeta: {
    fontSize: 12,
    fontFamily: fonts.medium,
    color: "#4B5563",
    marginTop: 2,
  },
  meetingWhen: {
    fontSize: 11.5,
    fontFamily: fonts.regular,
    color: "#9AA6B2",
    marginTop: 2,
  },
  meetingStartButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#2F6FE0",
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  meetingStartText: {
    fontSize: 12.5,
    fontFamily: fonts.bold,
    color: "#fff",
  },
  upcomingChip: {
    backgroundColor: "#F3F4F6",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  upcomingChipText: {
    fontSize: 11.5,
    fontFamily: fonts.semibold,
    color: "#6B7280",
  },
  infoBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#EAF0FD",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
  },
  infoBannerText: {
    flex: 1,
    fontSize: 12,
    fontFamily: fonts.medium,
    color: "#1E3A8A",
  },
  folderGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: 14,
  },
  folderCard: {
    width: "48%",
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#EEF0F4",
    padding: 16,
    gap: 4,
  },
  folderIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  folderName: {
    fontSize: 14,
    fontFamily: fonts.bold,
    color: "#111827",
  },
  folderMeta: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: "#9AA6B2",
  },
  recordingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
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
  formLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  selectAllText: {
    fontSize: 12,
    fontFamily: fonts.bold,
    color: "#2F6FE0",
    marginTop: 14,
    marginBottom: 8,
  },
  classRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 13,
  },
  classRowLabel: {
    fontSize: 13.5,
    fontFamily: fonts.semibold,
    color: "#111827",
  },
  pickerField: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  pickerFieldText: {
    flex: 1,
    fontSize: 13.5,
    fontFamily: fonts.semibold,
    color: "#111827",
  },
  pickerFieldPlaceholder: {
    color: "#9AA6B2",
    fontFamily: fonts.medium,
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
