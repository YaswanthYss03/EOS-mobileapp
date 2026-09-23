import { useCallback, useMemo, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useRouter } from "expo-router";
import * as Linking from "expo-linking";
import { Ionicons } from "@expo/vector-icons";
import { CollegeHeader } from "@/components/layout/CollegeHeader";
import { SkeletonListRows } from "@/components/ui/Skeleton";
import { fonts } from "@/theme";
import { toast } from "@/utils/toast";
import { getMyLmsSubjects, getStudentTasks, type LmsStudentTask } from "@/services/api/lms.api";
import { getTodayOnlineClasses, type OnlineClass } from "@/services/api/online-class.api";
import { WatermarkBackground } from "@/components/layout/WatermarkBackground";

// Wired to EOS-backend's real LMS tasks (see @/services/api/lms.api.ts) -
// there's no single "all my tasks" endpoint, so this fans out over the
// student's current-semester subjects (getMyLmsSubjects) and merges each
// one's getStudentTasks. pending/submitted/late is derived client-side
// (is_submitted + due_date vs now) since the schema has no such status
// column. "assigned on X" isn't shown - assignments has no created_at
// column, so there's no real date for that.

type TaskStatus = "pending" | "submitted" | "late";

type DailyTask = LmsStudentTask & {
  subjectId: number;
  subjectName: string;
  teacherName: string | null;
};

const STATUS_META: Record<TaskStatus, { bg: string; text: string; label: string }> = {
  pending: { bg: "#EEF0F4", text: "#6B7280", label: "Pending" },
  submitted: { bg: "#EAF0FD", text: "#2F6FE0", label: "Submitted" },
  late: { bg: "#FEF2F2", text: "#DC2626", label: "Late" },
};

// The real assignments table has leftover seed/test rows from before real
// syllabus content existed - obviously fake, not something this screen
// should present as a real assignment. Filtered here rather than in the
// database (that's real production data outside this app's own scope to
// delete unasked).
function isPlaceholderSeedTask(task: LmsStudentTask): boolean {
  if (task.title?.trim().toLowerCase() === "test") return true;
  if (task.description?.toLowerCase().includes("generic placeholder assignment")) return true;
  if (task.due_date && new Date(task.due_date).getFullYear() < 2000) return true;
  return false;
}

function deriveStatus(task: LmsStudentTask): TaskStatus {
  if (task.is_submitted) return "submitted";
  if (task.due_date && new Date(task.due_date) < new Date()) return "late";
  return "pending";
}

function subjectInitials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

function formatDueDate(value: string | null): string {
  if (!value) return "No due date";
  return `Due ${new Date(value).toLocaleDateString(undefined, { day: "2-digit", month: "short" })}`;
}

function dateIso(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function buildWeekStrip(): { label: string; day: number; iso: string; isToday: boolean }[] {
  const today = new Date();
  const monday = new Date(today);
  const dayOfWeek = today.getDay();
  monday.setDate(today.getDate() - ((dayOfWeek + 6) % 7));

  const labels = ["MON", "TUE", "WED", "THU", "FRI", "SAT"];
  return labels.map((label, index) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + index);
    return { label, day: date.getDate(), iso: dateIso(date), isToday: date.toDateString() === today.toDateString() };
  });
}

function DailyTaskHeader({ onBack }: { onBack: () => void }) {
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
      <Text style={styles.headerTitle}>Daily Task</Text>
    </LinearGradient>
  );
}

export function DailyTaskScreen() {
  const router = useRouter();
  const navigation = useNavigation();

  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [tasks, setTasks] = useState<DailyTask[]>([]);
  const [subjectsById, setSubjectsById] = useState<Map<number, string>>(new Map());
  const [todayOnlineClasses, setTodayOnlineClasses] = useState<OnlineClass[]>([]);
  const [selectedDateIso, setSelectedDateIso] = useState<string | null>(null);

  const weekStrip = useMemo(() => buildWeekStrip(), []);
  const todayIso = useMemo(() => dateIso(new Date()), []);

  const load = useCallback(() => {
    setStatus("loading");
    getMyLmsSubjects()
      .then(async (subjects) => {
        setSubjectsById(new Map(subjects.map((s) => [s.subject_id, s.subject_name])));
        const perSubject = await Promise.all(
          subjects.map((subject) =>
            getStudentTasks(subject.subject_id)
              .then((subjectTasks) =>
                subjectTasks.map((task) => ({
                  ...task,
                  subjectId: subject.subject_id,
                  subjectName: subject.subject_name,
                  teacherName: subject.faculty_name,
                })),
              )
              .catch(() => [] as DailyTask[]),
          ),
        );
        const merged = perSubject
          .flat()
          .filter((task) => !isPlaceholderSeedTask(task))
          .sort((a, b) => {
          if (!a.due_date) return 1;
          if (!b.due_date) return -1;
          return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
        });
        setTasks(merged);
        setStatus("success");
      })
      .catch(() => setStatus("error"));
    // Independent of the task load above (and allowed to fail silently -
    // it's a "today" convenience banner, not this screen's core content) -
    // GET /online-classes/today, same data OnlineClassScreen/
    // StudentOnlineClassTab already use.
    getTodayOnlineClasses()
      .then((classes) => setTodayOnlineClasses(classes.filter((c) => c.status !== "completed")))
      .catch(() => setTodayOnlineClasses([]));
  }, []);

  // Today's pending assignments (due today, not yet submitted) - a quick
  // "upload" shortcut into the LMS Task tab, separate from the day-filtered
  // full task list below (which still shows every task, any status, any day).
  const todaysPendingTasks = useMemo(
    () => tasks.filter((t) => t.due_date?.slice(0, 10) === todayIso && !t.is_submitted),
    [tasks, todayIso],
  );

  useFocusEffect(
    useCallback(() => {
      load();
      navigation.getParent()?.setOptions({ headerShown: false });
      return () => {
        navigation.getParent()?.setOptions({ headerShown: true, header: () => <CollegeHeader /> });
      };
    }, [load, navigation]),
  );

  const filtered = tasks.filter(
    (t) => !selectedDateIso || (t.due_date && t.due_date.slice(0, 10) === selectedDateIso),
  );

  function openAttachment(url: string) {
    Linking.openURL(url).catch(() => toast.error("Couldn't open the file"));
  }

  function goToTaskTab(task: DailyTask) {
    router.push({
      pathname: "/(tabs)/academics/lms/[subjectId]",
      params: { subjectId: String(task.subjectId), subjectName: task.subjectName, tab: "task" },
    } as never);
  }

  function goToOnlineClassTab(oc: OnlineClass) {
    router.push({
      pathname: "/(tabs)/academics/lms/[subjectId]",
      params: {
        subjectId: String(oc.subject_id),
        subjectName: subjectsById.get(oc.subject_id) ?? "",
        tab: "online-class",
      },
    } as never);
  }

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <WatermarkBackground />
      {/* Daily Task is student-only (see the doc comment at the top of this
          file), reached from the Campus tab's own Academics screen - a plain
          back pops within that same stack, back to Academics. */}
      <DailyTaskHeader onBack={() => router.back()} />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.weekStrip}>
          {weekStrip.map((day) => {
            const selected = selectedDateIso === day.iso;
            return (
              <TouchableOpacity
                key={day.label}
                style={[styles.dayChip, selected && styles.dayChipActive]}
                onPress={() => setSelectedDateIso((prev) => (prev === day.iso ? null : day.iso))}
                activeOpacity={0.8}
              >
                <Text style={[styles.dayChipLabel, selected && styles.dayChipLabelActive]}>{day.label}</Text>
                <Text style={[styles.dayChipNumber, selected && styles.dayChipNumberActive]}>{day.day}</Text>
                {day.isToday && !selected && <View style={styles.dayChipTodayDot} />}
              </TouchableOpacity>
            );
          })}
        </View>

        {todaysPendingTasks.length > 0 && (
          <View style={styles.todaySection}>
            <Text style={styles.sectionLabel}>Assignment</Text>
            {todaysPendingTasks.map((task) => (
              <View key={task.id} style={styles.todayCard}>
                <View style={styles.subjectAvatar}>
                  <Text style={styles.subjectAvatarText}>{subjectInitials(task.subjectName)}</Text>
                </View>
                <View style={styles.todayCardTextWrap}>
                  <Text style={styles.todayCardTitle}>{task.subjectName}</Text>
                  <Text style={styles.todayCardMeta}>{task.title ?? "Assignment due today"}</Text>
                </View>
                <TouchableOpacity style={styles.todayCardButton} onPress={() => goToTaskTab(task)} activeOpacity={0.85}>
                  <Text style={styles.todayCardButtonText}>Upload</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        {todayOnlineClasses.length > 0 && (
          <View style={styles.todaySection}>
            <Text style={styles.sectionLabel}>Online Class</Text>
            {todayOnlineClasses.map((oc) => (
              <View key={oc.id} style={styles.todayCard}>
                <View style={styles.subjectAvatar}>
                  <Ionicons name="videocam-outline" size={18} color="#2F6FE0" />
                </View>
                <View style={styles.todayCardTextWrap}>
                  <Text style={styles.todayCardTitle}>{subjectsById.get(oc.subject_id) ?? "Online class"}</Text>
                  <Text style={styles.todayCardMeta}>{oc.status === "live" ? "Live now" : "Scheduled today"}</Text>
                </View>
                <TouchableOpacity
                  style={styles.todayCardButton}
                  onPress={() => goToOnlineClassTab(oc)}
                  activeOpacity={0.85}
                >
                  <Text style={styles.todayCardButtonText}>Join</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        <Text style={styles.sectionLabel}>
          {selectedDateIso
            ? `Due ${new Date(selectedDateIso).toLocaleDateString(undefined, { day: "2-digit", month: "short" })}`
            : "Assigned tasks"}
        </Text>

        {status === "loading" ? (
          <SkeletonListRows count={3} />
        ) : status === "error" ? (
          <View style={styles.emptyState}>
            <Ionicons name="cloud-offline-outline" size={28} color="#B0B7C3" />
            <Text style={styles.emptyStateText}>Couldn't load your tasks.</Text>
            <TouchableOpacity onPress={load} activeOpacity={0.8}>
              <Text style={styles.retryText}>Tap to retry</Text>
            </TouchableOpacity>
          </View>
        ) : filtered.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="checkmark-done-outline" size={28} color="#B0B7C3" />
            <Text style={styles.emptyStateText}>
              {selectedDateIso ? "Nothing due on this day." : "Nothing matches this filter."}
            </Text>
          </View>
        ) : (
          filtered.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onOpenInLms={() => goToTaskTab(task)}
              onOpenAttachment={openAttachment}
            />
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function TaskCard({
  task,
  onOpenInLms,
  onOpenAttachment,
}: {
  task: DailyTask;
  // Submission itself only ever happens inside the LMS Task tab now (see
  // goToTaskTab) - this screen is a read-only summary/shortcut, not a
  // second place to actually upload a file.
  onOpenInLms: () => void;
  onOpenAttachment: (url: string) => void;
}) {
  const taskStatus = deriveStatus(task);
  const meta = STATUS_META[taskStatus];
  const canSubmit = task.marks_obtained === null;

  return (
    <View style={styles.taskCard}>
      <View style={styles.taskTopRow}>
        <View style={styles.subjectAvatar}>
          <Text style={styles.subjectAvatarText}>{subjectInitials(task.subjectName)}</Text>
        </View>
        <View style={styles.taskTitleWrap}>
          <Text style={styles.taskSubject}>{task.subjectName}</Text>
          <Text style={styles.taskMeta}>{task.teacherName ?? "Faculty not assigned"}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: meta.bg }]}>
          <Text style={[styles.statusBadgeText, { color: meta.text }]}>
            {task.marks_obtained !== null ? `${task.marks_obtained}/${task.max_marks ?? "—"}` : meta.label}
          </Text>
        </View>
      </View>

      {task.title && <Text style={styles.taskTitleText}>{task.title}</Text>}
      {task.description && <Text style={styles.taskDescription}>{task.description}</Text>}

      {task.attachment_url && (
        <TouchableOpacity
          style={styles.attachmentRow}
          onPress={() => onOpenAttachment(task.attachment_url!)}
          activeOpacity={0.8}
        >
          <Ionicons name="document-text-outline" size={16} color="#2F6FE0" />
          <Text style={styles.attachmentName} numberOfLines={1}>
            Attachment from teacher
          </Text>
          <Text style={styles.attachmentOpen}>Open</Text>
        </TouchableOpacity>
      )}

      {task.submission_file_url && (
        <TouchableOpacity
          style={styles.attachmentRow}
          onPress={() => onOpenAttachment(task.submission_file_url!)}
          activeOpacity={0.8}
        >
          <Ionicons name="checkmark-circle-outline" size={16} color="#16A34A" />
          <Text style={styles.attachmentName} numberOfLines={1}>
            Your submission
          </Text>
          <Text style={styles.attachmentOpen}>Open</Text>
        </TouchableOpacity>
      )}

      <View style={styles.taskBottomRow}>
        <Text style={styles.dueText}>{formatDueDate(task.due_date)}</Text>
        {canSubmit ? (
          <TouchableOpacity style={styles.completeButton} onPress={onOpenInLms} activeOpacity={0.85}>
            <Text style={styles.completeButtonText}>{task.is_submitted ? "Resubmit" : "Upload"}</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.completedChip}>
            <Ionicons name="checkmark" size={13} color="#2F6FE0" />
            <Text style={styles.completedChipText}>Graded</Text>
          </View>
        )}
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
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  weekStrip: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  dayChip: {
    flex: 1,
    alignItems: "center",
    gap: 4,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#EEF0F4",
    borderRadius: 12,
    paddingVertical: 10,
    marginHorizontal: 3,
  },
  dayChipActive: {
    backgroundColor: "#2F6FE0",
    borderColor: "#2F6FE0",
  },
  dayChipLabel: {
    fontSize: 10,
    fontFamily: fonts.bold,
    color: "#9AA6B2",
    letterSpacing: 0.3,
  },
  dayChipLabelActive: {
    color: "#D7E2FA",
  },
  dayChipNumber: {
    fontSize: 15,
    fontFamily: fonts.bold,
    color: "#111827",
  },
  dayChipNumberActive: {
    color: "#fff",
  },
  dayChipTodayDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#2F6FE0",
    marginTop: 2,
  },
  sectionLabel: {
    fontSize: 12,
    fontFamily: fonts.bold,
    color: "#8A93A3",
    letterSpacing: 0.5,
    textTransform: "uppercase",
    marginBottom: 10,
  },
  todaySection: {
    marginBottom: 14,
  },
  todayCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#fff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#EEF0F4",
    padding: 12,
    marginBottom: 8,
  },
  todayCardTextWrap: {
    flex: 1,
  },
  todayCardTitle: {
    fontSize: 13.5,
    fontFamily: fonts.bold,
    color: "#111827",
  },
  todayCardMeta: {
    fontSize: 11.5,
    fontFamily: fonts.regular,
    color: "#9AA6B2",
    marginTop: 2,
  },
  todayCardButton: {
    borderRadius: 10,
    backgroundColor: "#2F6FE0",
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  todayCardButtonText: {
    fontSize: 12.5,
    fontFamily: fonts.bold,
    color: "#fff",
  },
  taskCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#EEF0F4",
    padding: 14,
    marginBottom: 12,
  },
  taskTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  subjectAvatar: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: "#EAF0FD",
    alignItems: "center",
    justifyContent: "center",
  },
  subjectAvatarText: {
    fontSize: 12.5,
    fontFamily: fonts.bold,
    color: "#2F6FE0",
  },
  taskTitleWrap: {
    flex: 1,
  },
  taskSubject: {
    fontSize: 14.5,
    fontFamily: fonts.bold,
    color: "#111827",
  },
  taskMeta: {
    fontSize: 11.5,
    fontFamily: fonts.regular,
    color: "#9AA6B2",
    marginTop: 2,
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
  taskTitleText: {
    fontSize: 13.5,
    fontFamily: fonts.bold,
    color: "#111827",
    marginTop: 10,
  },
  taskDescription: {
    fontSize: 12.5,
    fontFamily: fonts.regular,
    color: "#4B5563",
    lineHeight: 18,
    marginTop: 4,
  },
  attachmentRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#EEF0F4",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 9,
    marginTop: 10,
  },
  attachmentName: {
    flex: 1,
    fontSize: 12.5,
    fontFamily: fonts.semibold,
    color: "#2F6FE0",
  },
  attachmentOpen: {
    fontSize: 11.5,
    fontFamily: fonts.medium,
    color: "#9AA6B2",
  },
  taskBottomRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#F1F3F6",
  },
  dueText: {
    fontSize: 12.5,
    fontFamily: fonts.semibold,
    color: "#6B7280",
  },
  completeButton: {
    borderRadius: 10,
    backgroundColor: "#2F6FE0",
    paddingHorizontal: 16,
    paddingVertical: 9,
    minWidth: 84,
    alignItems: "center",
  },
  completeButtonText: {
    fontSize: 12.5,
    fontFamily: fonts.bold,
    color: "#fff",
  },
  completedChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  completedChipText: {
    fontSize: 12.5,
    fontFamily: fonts.bold,
    color: "#2F6FE0",
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
  retryText: {
    fontSize: 13,
    fontFamily: fonts.bold,
    color: "#2F6FE0",
  },
});
