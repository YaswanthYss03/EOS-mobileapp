import { useCallback, useEffect, useRef, useState } from "react";
import { Animated, View, Text, FlatList, TouchableOpacity, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { SkeletonListRows } from "@/components/ui/Skeleton";
import { fonts } from "@/theme";
import {
  getStudentFolders,
  getStudentLessonPlan,
  type LmsLessonSession,
  type LmsStudentFolder,
} from "@/services/api/lms.api";

const MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

function DateBadge({ isoDate }: { isoDate: string }) {
  const d = new Date(isoDate);
  return (
    <View style={styles.dateBadge}>
      <Text style={styles.dateDay}>{d.getDate()}</Text>
      <Text style={styles.dateMonth}>{MONTHS[d.getMonth()]}</Text>
    </View>
  );
}

function useRotateStyle(expanded: boolean) {
  const anim = useRef(new Animated.Value(expanded ? 1 : 0)).current;
  useEffect(() => {
    Animated.timing(anim, { toValue: expanded ? 1 : 0, duration: 180, useNativeDriver: true }).start();
  }, [anim, expanded]);
  return { transform: [{ rotate: anim.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "180deg"] }) }] };
}

function FolderRow({ folder }: { folder: LmsStudentFolder }) {
  const router = useRouter();
  return (
    <TouchableOpacity
      style={styles.folderRow}
      activeOpacity={0.85}
      onPress={() =>
        router.push({
          pathname: "/(tabs)/academics/lms/folder/[folderId]",
          params: { folderId: String(folder.id), title: folder.title },
        })
      }
    >
      <View style={styles.folderIconWrap}>
        <Ionicons name="folder-outline" size={20} color="#2F6FE0" />
      </View>
      <View style={styles.textWrap}>
        <Text style={styles.folderTitle}>{folder.title}</Text>
        <Text style={styles.folderMeta}>
          {folder.faculty_name} · {folder.resource_count} {folder.resource_count === 1 ? "item" : "items"}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color="#B0B7C3" />
    </TouchableOpacity>
  );
}

function LessonCard({
  session,
  materials,
  expanded,
  onToggle,
}: {
  session: LmsLessonSession;
  materials: LmsStudentFolder[];
  expanded: boolean;
  onToggle: () => void;
}) {
  const rotateStyle = useRotateStyle(expanded);

  return (
    <View style={styles.card}>
      <TouchableOpacity style={styles.cardHeader} onPress={onToggle} activeOpacity={0.85}>
        <DateBadge isoDate={session.session_date} />
        <View style={styles.textWrap}>
          <Text style={styles.title}>{session.topic}</Text>
          {session.unit_title && <Text style={styles.meta}>{session.unit_title}</Text>}
        </View>
        <View style={[styles.badge, session.is_covered ? styles.badgeCovered : styles.badgePending]}>
          <Text
            style={[styles.badgeText, session.is_covered ? styles.badgeTextCovered : styles.badgeTextPending]}
          >
            {session.is_covered ? "Covered" : "Pending"}
          </Text>
        </View>
        <Animated.View style={rotateStyle}>
          <Ionicons name="chevron-down" size={18} color="#9AA6B2" />
        </Animated.View>
      </TouchableOpacity>

      {expanded && (
        <View style={styles.expandedBody}>
          {materials.length > 0 ? (
            <>
              <View style={styles.materialHeaderRow}>
                <Text style={styles.materialHeaderText}>MATERIAL AVAILABLE</Text>
                <Text style={styles.materialHeaderCount}>{materials.length}</Text>
              </View>
              {materials.map((folder) => (
                <FolderRow key={folder.id} folder={folder} />
              ))}
            </>
          ) : (
            <Text style={styles.noMaterialText}>No material uploaded yet for this subject.</Text>
          )}
        </View>
      )}
    </View>
  );
}

// Merges the old separate "Material" and "Lesson plan" tabs into one
// "Lessons" list - each syllabus session is its own accordion, expanding to
// show the subject's material folders mapped directly inline (there's no
// real database link between a lesson's unit and a specific folder - see
// lms.api.ts - so every lesson simply lists all of the subject's shared
// folders rather than guessing which one belongs to which unit).
export function StudentLessonsTab({ subjectId }: { subjectId: number }) {
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [sessions, setSessions] = useState<LmsLessonSession[]>([]);
  const [folders, setFolders] = useState<LmsStudentFolder[]>([]);
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());

  const load = useCallback(() => {
    setStatus("loading");
    Promise.all([getStudentLessonPlan(subjectId), getStudentFolders(subjectId)])
      .then(([plan, folderList]) => {
        setSessions(plan.sessions);
        setFolders(folderList);
        setStatus("success");
      })
      .catch(() => setStatus("error"));
  }, [subjectId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  function toggle(id: number) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  if (status === "loading") {
    return <SkeletonListRows count={4} style={styles.list} />;
  }

  if (status === "error") {
    return (
      <View style={styles.centerFill}>
        <Text style={styles.errorText}>Couldn't load the lesson plan.</Text>
        <TouchableOpacity onPress={load} style={styles.retryButton} activeOpacity={0.8}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const coveredCount = sessions.filter((s) => s.is_covered).length;

  return (
    <FlatList
      data={sessions}
      keyExtractor={(item) => String(item.id)}
      contentContainerStyle={styles.list}
      ListHeaderComponent={
        sessions.length > 0 ? (
          <View style={styles.progressCard}>
            <View style={styles.progressTextRow}>
              <Text style={styles.progressTitle}>Syllabus progress</Text>
              <Text style={styles.progressCount}>
                {coveredCount}/{sessions.length}
              </Text>
            </View>
            <View style={styles.progressTrack}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${sessions.length ? (coveredCount / sessions.length) * 100 : 0}%` },
                ]}
              />
            </View>
          </View>
        ) : null
      }
      ListEmptyComponent={
        <View style={styles.emptyState}>
          <Ionicons name="calendar-outline" size={30} color="#C7CDD8" />
          <Text style={styles.emptyText}>No lesson plan published yet</Text>
        </View>
      }
      renderItem={({ item }) => (
        <LessonCard
          session={item}
          materials={folders}
          expanded={expandedIds.has(item.id)}
          onToggle={() => toggle(item.id)}
        />
      )}
    />
  );
}

const styles = StyleSheet.create({
  centerFill: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  errorText: {
    fontSize: 13,
    fontFamily: fonts.regular,
    color: "#6B7280",
  },
  retryButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "#2F6FE0",
  },
  retryButtonText: {
    color: "#fff",
    fontSize: 13,
    fontFamily: fonts.semibold,
  },
  list: {
    padding: 16,
    paddingTop: 8,
  },
  progressCard: {
    backgroundColor: "#fff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#EEF0F4",
    padding: 14,
    marginBottom: 14,
  },
  progressTextRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  progressTitle: {
    fontSize: 12.5,
    fontFamily: fonts.bold,
    color: "#111827",
  },
  progressCount: {
    fontSize: 12.5,
    fontFamily: fonts.bold,
    color: "#2F6FE0",
  },
  progressTrack: {
    height: 7,
    borderRadius: 999,
    backgroundColor: "#EEF0F4",
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 999,
    backgroundColor: "#2F6FE0",
  },
  emptyState: {
    alignItems: "center",
    gap: 10,
    marginTop: 48,
  },
  emptyText: {
    fontSize: 13,
    fontFamily: fonts.medium,
    color: "#9AA6B2",
    textAlign: "center",
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#EEF0F4",
    marginBottom: 10,
    overflow: "hidden",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
  },
  dateBadge: {
    width: 44,
    alignItems: "center",
  },
  dateDay: {
    fontSize: 17,
    fontFamily: fonts.bold,
    color: "#2F6FE0",
  },
  dateMonth: {
    fontSize: 10,
    fontFamily: fonts.semibold,
    color: "#9AA6B2",
  },
  textWrap: {
    flex: 1,
  },
  title: {
    fontSize: 14,
    fontFamily: fonts.bold,
    color: "#111827",
  },
  meta: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: "#9AA6B2",
    marginTop: 2,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  badgeCovered: { backgroundColor: "#DCFCE7" },
  badgePending: { backgroundColor: "#E4EBFB" },
  badgeText: { fontSize: 11, fontFamily: fonts.bold },
  badgeTextCovered: { color: "#166534" },
  badgeTextPending: { color: "#2F6FE0" },
  expandedBody: {
    paddingHorizontal: 14,
    paddingBottom: 14,
    borderTopWidth: 1,
    borderTopColor: "#F1F3F6",
    paddingTop: 12,
  },
  materialHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  materialHeaderText: {
    fontSize: 10.5,
    fontFamily: fonts.bold,
    color: "#8A93A3",
    letterSpacing: 0.6,
  },
  materialHeaderCount: {
    fontSize: 11,
    fontFamily: fonts.bold,
    color: "#2F6FE0",
    backgroundColor: "#EAF0FD",
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
    overflow: "hidden",
  },
  folderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#F7F8FA",
    borderRadius: 12,
    padding: 10,
    marginBottom: 8,
  },
  folderIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 9,
    backgroundColor: "#EAF0FD",
    alignItems: "center",
    justifyContent: "center",
  },
  folderTitle: {
    fontSize: 13,
    fontFamily: fonts.bold,
    color: "#111827",
  },
  folderMeta: {
    fontSize: 11,
    fontFamily: fonts.regular,
    color: "#9AA6B2",
    marginTop: 2,
  },
  noMaterialText: {
    fontSize: 12.5,
    fontFamily: fonts.regular,
    fontStyle: "italic",
    color: "#9AA6B2",
  },
});
