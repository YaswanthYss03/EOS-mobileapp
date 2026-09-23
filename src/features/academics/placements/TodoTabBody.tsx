import { useCallback, useState } from "react";
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet, Linking } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { SkeletonListRows } from "@/components/ui/Skeleton";
import { fonts } from "@/theme";
import { getApiErrorMessage } from "@/services/api/client";
import { toast } from "@/utils/toast";
import { getMyTodos, completeMyTodo, type MyTodo } from "@/services/api/todo.api";

// Wired to EOS-backend's real /me/todos (see student-todos.service.ts) -
// Placement Cell posts a to-do, every student sees it here. Lives inside
// PlacementsOverviewScreen's own "Todo" tab (see StudentPlacementsBody) -
// not a standalone route, and not an Academics-tab page.
//
// Plain checkbox list, not cards - a left-corner checkbox strikes the title
// through on tap, same interaction as a basic todo app, per explicit
// request to drop the status-filter chips/summary cards/card layout this
// used to have.

function formatDeadline(deadline: string | null): string | null {
  if (!deadline) return null;
  return new Date(deadline).toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" });
}

export function TodoTabBody() {
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [todos, setTodos] = useState<MyTodo[]>([]);
  const [togglingId, setTogglingId] = useState<number | null>(null);

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

  function handleToggle(todo: MyTodo) {
    // Already-completed to-dos have no "un-complete" endpoint on the
    // backend (markTodoComplete is a one-way, idempotent insert) - tapping
    // a checked box is a no-op, same as most simple todo apps.
    if (todo.is_completed) return;
    setTogglingId(todo.id);
    completeMyTodo(todo.id)
      .then(() => setTodos((prev) => prev.map((t) => (t.id === todo.id ? { ...t, is_completed: true } : t))))
      .catch((err) => toast.error(getApiErrorMessage(err, "Couldn't update that.")))
      .finally(() => setTogglingId(null));
  }

  if (status === "loading") return <SkeletonListRows count={4} />;

  if (status === "error") {
    return (
      <View style={styles.emptyState}>
        <Ionicons name="cloud-offline-outline" size={32} color="#B0B7C3" />
        <Text style={styles.emptyStateText}>Couldn't load your to-dos.</Text>
        <TouchableOpacity onPress={load} activeOpacity={0.8}>
          <Text style={styles.retryText}>Tap to retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (todos.length === 0) {
    return (
      <View style={styles.emptyState}>
        <Ionicons name="checkmark-done-outline" size={32} color="#B0B7C3" />
        <Text style={styles.emptyStateText}>Nothing from the Placement Cell yet.</Text>
      </View>
    );
  }

  return (
    <View>
      {todos.map((todo) => (
        <TodoRow
          key={todo.id}
          todo={todo}
          toggling={togglingId === todo.id}
          onToggle={() => handleToggle(todo)}
        />
      ))}
    </View>
  );
}

function TodoRow({ todo, toggling, onToggle }: { todo: MyTodo; toggling: boolean; onToggle: () => void }) {
  const deadline = formatDeadline(todo.deadline);

  return (
    <View style={styles.row}>
      <TouchableOpacity
        style={styles.checkboxHit}
        onPress={onToggle}
        activeOpacity={0.7}
        disabled={toggling}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        {toggling ? (
          <ActivityIndicator size="small" color="#2F6FE0" />
        ) : (
          <View style={[styles.checkbox, todo.is_completed && styles.checkboxChecked]}>
            {todo.is_completed && <Ionicons name="checkmark" size={14} color="#fff" />}
          </View>
        )}
      </TouchableOpacity>

      <View style={styles.rowBody}>
        <Text style={[styles.title, todo.is_completed && styles.titleDone]}>{todo.title}</Text>
        {todo.description && (
          <Text style={[styles.description, todo.is_completed && styles.titleDone]}>{todo.description}</Text>
        )}

        {(deadline || todo.pdf_url || todo.link_url) && (
          <View style={styles.metaRow}>
            {deadline && <Text style={styles.deadlineText}>Due {deadline}</Text>}
            {todo.pdf_url && (
              <TouchableOpacity onPress={() => Linking.openURL(todo.pdf_url!)} activeOpacity={0.7}>
                <Text style={styles.linkText}>View PDF</Text>
              </TouchableOpacity>
            )}
            {todo.link_url && (
              <TouchableOpacity onPress={() => Linking.openURL(todo.link_url!)} activeOpacity={0.7}>
                <Text style={styles.linkText}>Open link</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: 12,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#EEF0F4",
  },
  checkboxHit: {
    width: 22,
    height: 22,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "#B0B7C3",
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxChecked: {
    backgroundColor: "#2F6FE0",
    borderColor: "#2F6FE0",
  },
  rowBody: {
    flex: 1,
  },
  title: {
    fontSize: 14.5,
    fontFamily: fonts.semibold,
    color: "#111827",
  },
  titleDone: {
    color: "#9AA6B2",
    textDecorationLine: "line-through",
  },
  description: {
    fontSize: 12.5,
    fontFamily: fonts.regular,
    color: "#6B7280",
    marginTop: 3,
    lineHeight: 17,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginTop: 6,
  },
  deadlineText: {
    fontSize: 11.5,
    fontFamily: fonts.medium,
    color: "#8A93A3",
  },
  linkText: {
    fontSize: 11.5,
    fontFamily: fonts.semibold,
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
