import { useCallback, useEffect, useState, type ReactNode } from "react";
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SkeletonListRows } from "@/components/ui/Skeleton";
import { WatermarkBackground } from "@/components/layout/WatermarkBackground";
import { fonts } from "@/theme";
import { useParentChildren } from "./useParentChildren";
import { ChildSelector } from "./ChildSelector";

// Shared shell for every Parent Campus-tab "history" screen (Food Court/
// Library/Medical/Stationery Store/Copy Center) - deliberately its own
// simple read-only list layout (header + ChildSelector + rows), NOT a
// role-branch grafted onto the student's own ordering/booking screens,
// per explicit request not to just clone the student UI. Each screen only
// supplies its title, its fetch function, and how to render one row - this
// shell owns the loading/error/empty states and re-fetching when the
// selected child changes.
export function ParentHistoryShell<T>({
  title,
  subtitle,
  emptyIcon,
  emptyText,
  fetchForChild,
  renderItem,
  keyFor,
}: {
  title: string;
  subtitle: string;
  emptyIcon: keyof typeof Ionicons.glyphMap;
  emptyText: string;
  fetchForChild: (studentId: number) => Promise<T[]>;
  renderItem: (item: T) => ReactNode;
  keyFor: (item: T) => string | number;
}) {
  const navigation = useNavigation();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const { status: childrenStatus, error: childrenError, children, selectedChild, setSelectedChildId, reload: reloadChildren } =
    useParentChildren();

  const [items, setItems] = useState<T[] | null>(null);
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");

  useFocusEffect(
    useCallback(() => {
      navigation.getParent()?.setOptions({ headerShown: false });
      return undefined;
    }, [navigation]),
  );

  const load = useCallback(
    (studentId: number) => {
      setStatus("loading");
      fetchForChild(studentId)
        .then((data) => {
          setItems(data);
          setStatus("success");
        })
        .catch(() => setStatus("error"));
    },
    [fetchForChild],
  );

  useEffect(() => {
    if (selectedChild) load(selectedChild.id);
  }, [selectedChild, load]);

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <WatermarkBackground />
      <LinearGradient
        colors={["#2F6FE0", "#1A3D8F"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.header, { paddingTop: insets.top + 10 }]}
      >
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="arrow-back" size={20} color="#fff" />
        </TouchableOpacity>
        <View>
          <Text style={styles.headerTitle}>{title}</Text>
          <Text style={styles.headerSubtitle}>{subtitle}</Text>
        </View>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {childrenStatus === "loading" ? (
          <SkeletonListRows count={3} />
        ) : childrenStatus === "error" ? (
          <ErrorNotice message={childrenError ?? "Something went wrong."} onRetry={reloadChildren} />
        ) : children.length === 0 ? (
          <EmptyState icon="people-outline" text="No linked children found" />
        ) : selectedChild ? (
          <>
            <ChildSelector children={children} selected={selectedChild} onSelect={(c) => setSelectedChildId(c.id)} />

            {status === "loading" ? (
              <SkeletonListRows count={3} />
            ) : status === "error" ? (
              <ErrorNotice message="Couldn't load this history." onRetry={() => load(selectedChild.id)} />
            ) : (items ?? []).length === 0 ? (
              <EmptyState icon={emptyIcon} text={emptyText} />
            ) : (
              (items ?? []).map((item) => <View key={keyFor(item)}>{renderItem(item)}</View>)
            )}
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function ErrorNotice({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <View style={styles.errorNotice}>
      <Ionicons name="alert-circle-outline" size={22} color="#DC2626" />
      <Text style={styles.errorNoticeText}>{message}</Text>
      <TouchableOpacity onPress={onRetry} style={styles.retryButton} activeOpacity={0.8}>
        <Text style={styles.retryButtonText}>Retry</Text>
      </TouchableOpacity>
    </View>
  );
}

function EmptyState({ icon, text }: { icon: keyof typeof Ionicons.glyphMap; text: string }) {
  return (
    <View style={styles.emptyState}>
      <Ionicons name={icon} size={32} color="#B0B7C3" />
      <Text style={styles.emptyStateText}>{text}</Text>
    </View>
  );
}

export const rowStyles = StyleSheet.create({
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    elevation: 2,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  title: {
    fontSize: 14,
    fontFamily: fonts.bold,
    color: "#111827",
    flex: 1,
    marginRight: 8,
  },
  statusBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  statusBadgeText: {
    fontSize: 10.5,
    fontFamily: fonts.bold,
  },
  metaText: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: "#6B7280",
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: "#F1F3F6",
    marginVertical: 8,
  },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F7F8FA" },
  header: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingBottom: 14 },
  backButton: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  headerTitle: { color: "#fff", fontSize: 18, fontFamily: fonts.bold },
  headerSubtitle: { color: "#D7E2FA", fontSize: 12, fontFamily: fonts.medium, marginTop: 2 },
  content: { padding: 16, paddingBottom: 32 },
  errorNotice: { alignItems: "center", gap: 8, paddingVertical: 40 },
  errorNoticeText: { fontSize: 13, fontFamily: fonts.regular, color: "#6B7280", textAlign: "center", paddingHorizontal: 12 },
  retryButton: { marginTop: 4, borderRadius: 999, borderWidth: 1, borderColor: "#2F6FE0", paddingHorizontal: 16, paddingVertical: 6 },
  retryButtonText: { fontSize: 12, fontFamily: fonts.bold, color: "#2F6FE0" },
  emptyState: { alignItems: "center", paddingVertical: 40, gap: 8 },
  emptyStateText: { fontSize: 13, fontFamily: fonts.medium, color: "#9AA6B2" },
});
