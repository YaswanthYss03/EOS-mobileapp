import { useCallback, useState } from "react";
import { View, Text, ScrollView, TextInput, TouchableOpacity, StyleSheet } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { CollegeHeader } from "@/components/layout/CollegeHeader";
import { fonts } from "@/theme";
import { toast } from "@/utils/toast";
import { formatDate } from "@/utils/calendar";
import {
  cycleInfo,
  appraisalCategories,
  mockAppraisalHistory,
  type AppraisalCategoryConfig,
  type AppraisalHistoryEntry,
} from "./data/mockAppraisalRequest";

type Tab = "apply" | "history";
type CategoryEntries = Record<string, string>[];

function buildInitialEntries(): Record<string, CategoryEntries> {
  const initial: Record<string, CategoryEntries> = {};
  for (const category of appraisalCategories) {
    initial[category.id] = [{}];
  }
  return initial;
}

// TODO: this is an apply+history UI over mockAppraisalRequest - wire to a
// real appraisal backend endpoint once one exists. This is the logged-in
// employee's OWN appraisal submission (Employee section), not the HoD's
// review of others' appraisals (see erp/review-appraisal). Reachable from
// both the Employee/Faculty and HoD dashboards.
export function AppraisalRequestScreen() {
  const navigation = useNavigation();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [tab, setTab] = useState<Tab>("apply");
  const [expandedId, setExpandedId] = useState<string | null>(appraisalCategories[0]?.id ?? null);
  const [entriesByCategory, setEntriesByCategory] = useState(buildInitialEntries);
  const [history, setHistory] = useState(mockAppraisalHistory);

  // This screen renders its own full header below, so hide the shared
  // CollegeHeader while it's focused - same pattern as the other ERP
  // sub-screens.
  useFocusEffect(
    useCallback(() => {
      navigation.getParent()?.setOptions({ headerShown: false });
      return () => {
        navigation.getParent()?.setOptions({ headerShown: true, header: () => <CollegeHeader /> });
      };
    }, [navigation]),
  );

  function toggleExpanded(id: string) {
    setExpandedId((prev) => (prev === id ? null : id));
  }

  function addEntry(categoryId: string) {
    setEntriesByCategory((prev) => ({
      ...prev,
      [categoryId]: [...prev[categoryId], {}],
    }));
  }

  function updateField(categoryId: string, entryIndex: number, fieldKey: string, value: string) {
    setEntriesByCategory((prev) => ({
      ...prev,
      [categoryId]: prev[categoryId].map((entry, index) =>
        index === entryIndex ? { ...entry, [fieldKey]: value } : entry,
      ),
    }));
  }

  function resetForm() {
    setEntriesByCategory(buildInitialEntries());
    setExpandedId(appraisalCategories[0]?.id ?? null);
  }

  function handleSubmit() {
    const subjectEntries = entriesByCategory["subject-handling"] ?? [];
    const hasSubject = subjectEntries.some((entry) => entry.subject?.trim());
    if (!hasSubject) {
      toast.warning("Add at least one subject under Subject Handling");
      return;
    }

    const newEntry: AppraisalHistoryEntry = {
      id: `local-${history.length}-${Date.now()}`,
      cycleLabel: cycleInfo.label,
      submittedOn: formatDate(new Date()),
      status: "pending",
    };
    setHistory((prev) => [newEntry, ...prev]);
    toast.success("Appraisal request submitted");
    resetForm();
    setTab("history");
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
        <View>
          <Text style={styles.headerTitle}>Request Appraisal</Text>
          <Text style={styles.headerSubtitle}>
            {cycleInfo.label} · closes {cycleInfo.closesOn}
          </Text>
        </View>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.tabSwitch}>
          <TouchableOpacity
            style={[styles.tabSwitchButton, tab === "apply" && styles.tabSwitchButtonActive]}
            onPress={() => setTab("apply")}
          >
            <Text style={[styles.tabSwitchText, tab === "apply" && styles.tabSwitchTextActive]}>Apply</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabSwitchButton, tab === "history" && styles.tabSwitchButtonActive]}
            onPress={() => setTab("history")}
          >
            <Text style={[styles.tabSwitchText, tab === "history" && styles.tabSwitchTextActive]}>History</Text>
          </TouchableOpacity>
        </View>

        {tab === "apply" ? (
          <>
            {appraisalCategories.map((category) => (
              <AppraisalCategoryCard
                key={category.id}
                config={category}
                entries={entriesByCategory[category.id] ?? []}
                expanded={expandedId === category.id}
                onToggleExpand={() => toggleExpanded(category.id)}
                onAddEntry={() => addEntry(category.id)}
                onUpdateField={(entryIndex, fieldKey, value) =>
                  updateField(category.id, entryIndex, fieldKey, value)
                }
              />
            ))}

            <TouchableOpacity style={styles.submitButton} onPress={handleSubmit} activeOpacity={0.85}>
              <Text style={styles.submitButtonText}>Submit Appraisal Request</Text>
            </TouchableOpacity>
          </>
        ) : history.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="document-text-outline" size={32} color="#B0B7C3" />
            <Text style={styles.emptyStateText}>No appraisal history yet</Text>
          </View>
        ) : (
          history.map((item) => <HistoryCard key={item.id} item={item} />)
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function AppraisalCategoryCard({
  config,
  entries,
  expanded,
  onToggleExpand,
  onAddEntry,
  onUpdateField,
}: {
  config: AppraisalCategoryConfig;
  entries: CategoryEntries;
  expanded: boolean;
  onToggleExpand: () => void;
  onAddEntry: () => void;
  onUpdateField: (entryIndex: number, fieldKey: string, value: string) => void;
}) {
  return (
    <View style={styles.categoryCard}>
      <TouchableOpacity style={styles.categoryHeader} onPress={onToggleExpand} activeOpacity={0.8}>
        <View style={styles.categoryAccent} />
        <View style={styles.categoryTextWrap}>
          <Text style={styles.categoryTitle}>{config.title}</Text>
          <Text style={styles.categorySubtitle}>{config.subtitle}</Text>
        </View>
        <View style={styles.addedBadge}>
          <Text style={styles.addedBadgeText}>
            {entries.length} added
          </Text>
        </View>
        <Ionicons name={expanded ? "chevron-up" : "chevron-down"} size={18} color="#B0B7C3" />
      </TouchableOpacity>

      {expanded && (
        <View style={styles.categoryBody}>
          {entries.map((entry, index) => (
            <View key={index} style={styles.entryBlock}>
              <Text style={styles.entryLabel}>
                {config.entryLabel.toUpperCase()} {index + 1}
              </Text>
              {config.fields.map((field) => (
                <View key={field.key} style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>{field.label}</Text>
                  <TextInput
                    style={styles.input}
                    placeholder={field.placeholder}
                    placeholderTextColor="#9AA6B2"
                    value={entry[field.key] ?? ""}
                    onChangeText={(text) => onUpdateField(index, field.key, text)}
                  />
                </View>
              ))}
            </View>
          ))}

          <TouchableOpacity style={styles.addEntryButton} onPress={onAddEntry} activeOpacity={0.8}>
            <Ionicons name="add" size={16} color="#2F6FE0" />
            <Text style={styles.addEntryButtonText}>Add another {config.entryLabel.toLowerCase()}</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

function HistoryCard({ item }: { item: AppraisalHistoryEntry }) {
  return (
    <View style={styles.historyCard}>
      <View style={styles.historyHeader}>
        <Text style={styles.historyCycle}>{item.cycleLabel}</Text>
        <View
          style={[
            styles.statusBadge,
            item.status === "approved" && styles.statusBadgeApproved,
            item.status === "returned" && styles.statusBadgeReturned,
          ]}
        >
          <Text
            style={[
              styles.statusBadgeText,
              item.status === "approved" && styles.statusBadgeTextApproved,
              item.status === "returned" && styles.statusBadgeTextReturned,
            ]}
          >
            {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
          </Text>
        </View>
      </View>
      <Text style={styles.historySubmittedOn}>Submitted {item.submittedOn}</Text>
      {typeof item.score === "number" && <Text style={styles.historyScore}>Score: {item.score}/100</Text>}
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
  tabSwitchButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 9,
    paddingVertical: 10,
  },
  tabSwitchButtonActive: {
    backgroundColor: "#2F6FE0",
  },
  tabSwitchText: {
    fontSize: 13,
    fontFamily: fonts.semibold,
    color: "#4B5563",
  },
  tabSwitchTextActive: {
    color: "#fff",
  },
  categoryCard: {
    backgroundColor: "#fff",
    borderRadius: 14,
    marginBottom: 12,
    elevation: 2,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    overflow: "hidden",
  },
  categoryHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 14,
  },
  categoryAccent: {
    width: 4,
    height: 32,
    borderRadius: 2,
    backgroundColor: "#2F6FE0",
  },
  categoryTextWrap: {
    flex: 1,
  },
  categoryTitle: {
    fontSize: 14,
    fontFamily: fonts.bold,
    color: "#111827",
  },
  categorySubtitle: {
    fontSize: 11,
    fontFamily: fonts.regular,
    color: "#9AA6B2",
    marginTop: 1,
  },
  addedBadge: {
    backgroundColor: "#E4EBFB",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  addedBadgeText: {
    fontSize: 11,
    fontFamily: fonts.bold,
    color: "#2F6FE0",
  },
  categoryBody: {
    paddingHorizontal: 14,
    paddingBottom: 14,
  },
  entryBlock: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },
  entryLabel: {
    fontSize: 10,
    fontFamily: fonts.bold,
    color: "#2F6FE0",
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  fieldGroup: {
    marginBottom: 10,
  },
  fieldLabel: {
    fontSize: 11,
    fontFamily: fonts.medium,
    color: "#9AA6B2",
    marginBottom: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#F9FAFB",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    fontFamily: fonts.regular,
    color: "#111827",
  },
  addEntryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderWidth: 1.5,
    borderColor: "#B7CBE6",
    borderStyle: "dashed",
    borderRadius: 12,
    paddingVertical: 12,
  },
  addEntryButtonText: {
    fontSize: 13,
    fontFamily: fonts.semibold,
    color: "#2F6FE0",
  },
  submitButton: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#2F6FE0",
    borderRadius: 14,
    paddingVertical: 15,
    marginTop: 4,
    elevation: 3,
    shadowColor: "#2F6FE0",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  submitButtonText: {
    fontSize: 14,
    fontFamily: fonts.bold,
    color: "#fff",
  },
  historyCard: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    elevation: 2,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
  },
  historyHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 8,
  },
  historyCycle: {
    flex: 1,
    fontSize: 14,
    fontFamily: fonts.bold,
    color: "#111827",
  },
  statusBadge: {
    backgroundColor: "#FEF3C7",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  statusBadgeApproved: {
    backgroundColor: "#F0FDF4",
  },
  statusBadgeReturned: {
    backgroundColor: "#FEF2F2",
  },
  statusBadgeText: {
    fontSize: 11,
    fontFamily: fonts.bold,
    color: "#D97706",
  },
  statusBadgeTextApproved: {
    color: "#16A34A",
  },
  statusBadgeTextReturned: {
    color: "#DC2626",
  },
  historySubmittedOn: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: "#9AA6B2",
    marginTop: 6,
  },
  historyScore: {
    fontSize: 13,
    fontFamily: fonts.semibold,
    color: "#2F6FE0",
    marginTop: 4,
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
});
