import { useCallback, useMemo, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, StyleSheet } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { SkeletonListRows } from "@/components/ui/Skeleton";
import { fonts } from "@/theme";
import { toast } from "@/utils/toast";
import { getApiErrorMessage } from "@/services/api/client";
import { getMyTodos, completeMyTodo, type MyTodo } from "@/services/api/todo.api";

// Wired to EOS-backend's real /me/todos (see student-todos.service.ts) -
// Placement Cell posts a to-do, every student sees it here. Lives inside
// PlacementsOverviewScreen's own "Todo" tab (see StudentPlacementsBody) -
// not a standalone route, and not an Academics-tab page. There's only one
// real source today (Placement Cell) - the mock version's separate
// Academic/Higher Education/Entrepreneurship/Department "cells" had no
// backend behind them and are dropped rather than kept as fake filters.

type TodoStatus = "pending" | "due-soon" | "completed";
type StatusFilter = "all" | TodoStatus;

const DUE_SOON_THRESHOLD_DAYS = 3;

const STATUS_BADGE_META: Record<TodoStatus, { bg: string; text: string; label: string }> = {
  pending: { bg: "#EAF0FD", text: "#2F6FE0", label: "Pending" },
  "due-soon": { bg: "#FEF3C7", text: "#D97706", label: "Due soon" },
  completed: { bg: "#F0FDF4", text: "#16A34A", label: "Completed" },
};

const PRIORITY_COLOR: Record<TodoStatus, string> = {
  pending: "#2F6FE0",
  "due-soon": "#D97706",
  completed: "#16A34A",
};

const STATUS_FILTERS: { id: StatusFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "pending", label: "Pending" },
  { id: "due-soon", label: "Due Soon" },
  { id: "completed", label: "Completed" },
];

function deriveStatus(todo: MyTodo): TodoStatus {
  if (todo.is_completed) return "completed";
  if (todo.deadline) {
    const daysUntil = (new Date(todo.deadline).getTime() - Date.now()) / 86400000;
    if (daysUntil <= DUE_SOON_THRESHOLD_DAYS) return "due-soon";
  }
  return "pending";
}

function formatDeadline(todo: MyTodo): string {
  if (todo.is_completed && todo.completed_at) {
    return `Completed ${new Date(todo.completed_at).toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" })}`;
  }
  if (!todo.deadline) return "No deadline";
  return `Deadline: ${new Date(todo.deadline).toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" })}`;
}

export function TodoTabBody() {
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [todos, setTodos] = useState<MyTodo[]>([]);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [completingId, setCompletingId] = useState<number | null>(null);

  const load = useCallback(() => {
    setStatus("loading");
    getMyTodos()
      .then((data) => {
        setTodos(data);
        setStatus("success");
      })
      .catch(() => setStatus("error"));
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const counts = useMemo(() => {
    const result = { pending: 0, dueSoon: 0, completed: 0 };
    for (const todo of todos) {
      const s = deriveStatus(todo);
      if (s === "pending") result.pending += 1;
      else if (s === "due-soon") result.dueSoon += 1;
      else result.completed += 1;
    }
    return result;
  }, [todos]);

  const filtered = statusFilter === "all" ? todos : todos.filter((t) => deriveStatus(t) === statusFilter);

  function handleAction(todo: MyTodo) {
    if (todo.is_completed) {
      toast.info(todo.description ?? todo.title);
      return;
    }
    setCompletingId(todo.id);
    completeMyTodo(todo.id)
      .then(() => {
        toast.success(`Marked "${todo.title}" as done`);
        load();
      })
      .catch((err) => toast.error(getApiErrorMessage(err, "Couldn't update that.")))
      .finally(() => setCompletingId(null));
  }

  return (
    <View>
      <View style={styles.summaryRow}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryValue}>{counts.pending}</Text>
          <Text style={styles.summaryLabel}>Pending</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={[styles.summaryValue, { color: "#D97706" }]}>{counts.dueSoon}</Text>
          <Text style={styles.summaryLabel}>Due soon</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={[styles.summaryValue, { color: "#16A34A" }]}>{counts.completed}</Text>
          <Text style={styles.summaryLabel}>Completed</Text>
        </View>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
        {STATUS_FILTERS.map((filter) => (
          <TouchableOpacity
            key={filter.id}
            style={[styles.statusChip, statusFilter === filter.id && styles.statusChipActive]}
            onPress={() => setStatusFilter(filter.id)}
            activeOpacity={0.8}
          >
            <Text style={[styles.statusChipText, statusFilter === filter.id && styles.statusChipTextActive]}>
              {filter.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {status === "loading" ? (
        <SkeletonListRows count={3} />
      ) : status === "error" ? (
        <View style={styles.emptyState}>
          <Ionicons name="cloud-offline-outline" size={32} color="#B0B7C3" />
          <Text style={styles.emptyStateText}>Couldn't load your to-dos.</Text>
          <TouchableOpacity onPress={load} activeOpacity={0.8}>
            <Text style={styles.retryText}>Tap to retry</Text>
          </TouchableOpacity>
        </View>
      ) : filtered.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="checkmark-done-outline" size={32} color="#B0B7C3" />
          <Text style={styles.emptyStateText}>
            {todos.length === 0 ? "Nothing from the Placement Cell yet." : "Nothing matches this filter."}
          </Text>
        </View>
      ) : (
        filtered.map((todo) => (
          <TodoCard
            key={todo.id}
            todo={todo}
            completing={completingId === todo.id}
            onAction={() => handleAction(todo)}
          />
        ))
      )}
    </View>
  );
}

function TodoCard({ todo, completing, onAction }: { todo: MyTodo; completing: boolean; onAction: () => void }) {
  const todoStatus = deriveStatus(todo);
  const badge = STATUS_BADGE_META[todoStatus];

  return (
    <View style={styles.card}>
      <View style={styles.cardTopRow}>
        <View style={styles.sourceRow}>
          <Ionicons name="briefcase-outline" size={14} color="#2F6FE0" />
          <Text style={styles.sourceLabel}>PLACEMENT CELL</Text>
        </View>
        <View style={[styles.priorityDot, { backgroundColor: PRIORITY_COLOR[todoStatus] }]} />
      </View>

      <Text style={styles.cardTitle}>{todo.title}</Text>
      {todo.description && <Text style={styles.cardDescription}>{todo.description}</Text>}

      <View style={styles.cardBottomRow}>
        <View>
          <Text style={styles.deadlineText}>{formatDeadline(todo)}</Text>
          <View style={[styles.statusBadge, { backgroundColor: badge.bg }]}>
            <Text style={[styles.statusBadgeText, { color: badge.text }]}>{badge.label}</Text>
          </View>
        </View>
        <TouchableOpacity
          style={[styles.ctaButton, todo.is_completed && styles.ctaButtonSecondary]}
          onPress={onAction}
          activeOpacity={0.85}
          disabled={completing}
        >
          {completing ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={[styles.ctaButtonText, todo.is_completed && styles.ctaButtonTextSecondary]}>
              {todo.is_completed ? "View" : "Mark done"}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  summaryRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 16,
  },
  summaryCard: {
    flex: 1,
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#EEF0F4",
    paddingVertical: 12,
    gap: 2,
  },
  summaryValue: {
    fontSize: 20,
    fontFamily: fonts.bold,
    color: "#111827",
  },
  summaryLabel: {
    fontSize: 11,
    fontFamily: fonts.medium,
    color: "#9AA6B2",
  },
  chipRow: {
    marginBottom: 10,
  },
  statusChip: {
    borderRadius: 999,
    backgroundColor: "#EEF0F4",
    paddingHorizontal: 14,
    paddingVertical: 7,
    marginRight: 8,
  },
  statusChipActive: {
    backgroundColor: "#111827",
  },
  statusChipText: {
    fontSize: 12,
    fontFamily: fonts.semibold,
    color: "#6B7280",
  },
  statusChipTextActive: {
    color: "#fff",
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#EEF0F4",
    padding: 14,
    marginTop: 12,
  },
  cardTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sourceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  sourceLabel: {
    fontSize: 10.5,
    fontFamily: fonts.bold,
    color: "#2F6FE0",
    letterSpacing: 0.5,
  },
  priorityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  cardTitle: {
    fontSize: 15,
    fontFamily: fonts.bold,
    color: "#111827",
    marginTop: 8,
  },
  cardDescription: {
    fontSize: 12.5,
    fontFamily: fonts.regular,
    color: "#6B7280",
    marginTop: 4,
    lineHeight: 18,
  },
  cardBottomRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#F1F3F6",
  },
  deadlineText: {
    fontSize: 11.5,
    fontFamily: fonts.medium,
    color: "#8A93A3",
    marginBottom: 5,
  },
  statusBadge: {
    alignSelf: "flex-start",
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 3,
  },
  statusBadgeText: {
    fontSize: 10.5,
    fontFamily: fonts.bold,
  },
  ctaButton: {
    borderRadius: 10,
    backgroundColor: "#2F6FE0",
    paddingHorizontal: 18,
    paddingVertical: 9,
    minWidth: 84,
    alignItems: "center",
  },
  ctaButtonSecondary: {
    backgroundColor: "#fff",
    borderWidth: 1.5,
    borderColor: "#2F6FE0",
  },
  ctaButtonText: {
    fontSize: 12.5,
    fontFamily: fonts.bold,
    color: "#fff",
  },
  ctaButtonTextSecondary: {
    color: "#2F6FE0",
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 48,
    gap: 8,
  },
  emptyStateText: {
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
});
