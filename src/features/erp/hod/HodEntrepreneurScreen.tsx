import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { View, Text, Image, ScrollView, TouchableOpacity, TextInput, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { BackHeader } from "@/components/layout/BackHeader";
import { SkeletonListRows } from "@/components/ui/Skeleton";
import { AnchoredDropdown } from "@/components/ui/dropdown";
import { fonts } from "@/theme";
import { getApiErrorMessage } from "@/services/api/client";
import { getDepartmentClasses, type DepartmentClass } from "@/services/api/faculty-placements.api";
import { getHodEdcOverview, type HodEdcRow, type HodEdcFilters } from "@/services/api/hod-entrepreneurship.api";
import { WatermarkBackground } from "@/components/layout/WatermarkBackground";

type LoadStatus = "loading" | "success" | "error";

function initialsFromName(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

function classLabel(c: DepartmentClass): string {
  return `${c.batch_name} · ${c.course_code}-${c.section}`;
}

// Department-wide Entrepreneurship roster for HoD - which students in their
// own department have registered a startup/business idea, from the real
// `student_entrepreneurship` table (see EOS-backend's HodEdcService, GET
// /hod/edc). Batch and Class+Section filters are both real server-side
// AND-filters, not client-side narrowing - the class list itself comes from
// the same GET /me/department-classes endpoint the HoD Placements History
// tab already uses (DrivesService.getDepartmentClasses), reused as-is
// rather than duplicated.
export function HodEntrepreneurScreen() {
  const router = useRouter();

  const [classesStatus, setClassesStatus] = useState<LoadStatus>("loading");
  const [classes, setClasses] = useState<DepartmentClass[]>([]);

  const [overviewStatus, setOverviewStatus] = useState<LoadStatus>("loading");
  const [overviewError, setOverviewError] = useState<string | null>(null);
  const [filters, setFilters] = useState<HodEdcFilters | null>(null);
  const [rows, setRows] = useState<HodEdcRow[]>([]);

  const [selectedBatchId, setSelectedBatchId] = useState<number | null>(null);
  const [selectedClassId, setSelectedClassId] = useState<number | null>(null);
  const [search, setSearch] = useState("");

  const [batchDropdownOpen, setBatchDropdownOpen] = useState(false);
  const batchAnchorRef = useRef<View | null>(null);
  const [classDropdownOpen, setClassDropdownOpen] = useState(false);
  const classAnchorRef = useRef<View | null>(null);

  useEffect(() => {
    setClassesStatus("loading");
    getDepartmentClasses()
      .then((rows) => {
        setClasses(rows);
        setClassesStatus("success");
      })
      .catch(() => setClassesStatus("error"));
  }, []);

  const loadOverview = useCallback((batchId: number | null, classId: number | null) => {
    setOverviewStatus("loading");
    setOverviewError(null);
    getHodEdcOverview({
      batchId: batchId ?? undefined,
      classId: classId ?? undefined,
    })
      .then((data) => {
        setFilters(data.filters);
        setRows(data.rows);
        setOverviewStatus("success");
      })
      .catch((err) => {
        setOverviewError(getApiErrorMessage(err, "Couldn't load entrepreneurship interest for your department."));
        setOverviewStatus("error");
      });
  }, []);

  useEffect(() => {
    loadOverview(selectedBatchId, selectedClassId);
  }, [selectedBatchId, selectedClassId, loadOverview]);

  const hasFilters = selectedBatchId !== null || selectedClassId !== null;
  const selectedClass = classes.find((c) => c.class_id === selectedClassId) ?? null;
  const selectedBatch = filters?.batches.find((b) => b.batch_id === selectedBatchId) ?? null;

  // Name/roll-number search on top of the already department (and
  // optionally batch/class) scoped rows - never a wider, unscoped fetch.
  const query = search.trim().toLowerCase();
  const visibleRows = useMemo(() => {
    if (!query) return rows;
    return rows.filter(
      (row) => row.name.toLowerCase().includes(query) || row.student_id_no.toLowerCase().includes(query),
    );
  }, [rows, query]);

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <WatermarkBackground />
      <BackHeader title="Entrepreneur" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={16} color="#9AA6B2" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name or roll number"
            placeholderTextColor="#9AA6B2"
            value={search}
            onChangeText={setSearch}
          />
        </View>

        <View style={styles.filterRow}>
          <View ref={batchAnchorRef} collapsable={false} style={styles.filterFieldFlex}>
            <TouchableOpacity
              style={[styles.filterField, batchDropdownOpen && styles.filterFieldOpen]}
              onPress={() => setBatchDropdownOpen((open) => !open)}
              activeOpacity={0.8}
            >
              <Text style={styles.filterFieldLabel}>BATCH</Text>
              <Text style={styles.filterFieldValue} numberOfLines={1}>
                {selectedBatch?.label ?? "All Batches"}
              </Text>
            </TouchableOpacity>
          </View>

          <View ref={classAnchorRef} collapsable={false} style={styles.filterFieldFlex}>
            <TouchableOpacity
              style={[styles.filterField, classDropdownOpen && styles.filterFieldOpen]}
              onPress={() => setClassDropdownOpen((open) => !open)}
              activeOpacity={0.8}
            >
              <Text style={styles.filterFieldLabel}>CLASS</Text>
              <Text style={styles.filterFieldValue} numberOfLines={1}>
                {selectedClass ? classLabel(selectedClass) : "All Classes"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <AnchoredDropdown
          anchorRef={batchAnchorRef}
          visible={batchDropdownOpen}
          onClose={() => setBatchDropdownOpen(false)}
          contentStyle={styles.dropdownCard}
        >
          <TouchableOpacity
            style={styles.filterOptionRow}
            onPress={() => {
              setSelectedBatchId(null);
              setBatchDropdownOpen(false);
            }}
          >
            <Text style={styles.filterOptionText}>All Batches</Text>
            {selectedBatchId === null && <Ionicons name="checkmark" size={16} color="#2F6FE0" />}
          </TouchableOpacity>
          {(filters?.batches ?? []).map((batch) => (
            <TouchableOpacity
              key={batch.batch_id}
              style={styles.filterOptionRow}
              onPress={() => {
                setSelectedBatchId(batch.batch_id);
                setBatchDropdownOpen(false);
              }}
            >
              <Text style={styles.filterOptionText}>{batch.label}</Text>
              {batch.batch_id === selectedBatchId && <Ionicons name="checkmark" size={16} color="#2F6FE0" />}
            </TouchableOpacity>
          ))}
        </AnchoredDropdown>

        <AnchoredDropdown
          anchorRef={classAnchorRef}
          visible={classDropdownOpen}
          onClose={() => setClassDropdownOpen(false)}
          contentStyle={styles.dropdownCard}
        >
          <TouchableOpacity
            style={styles.filterOptionRow}
            onPress={() => {
              setSelectedClassId(null);
              setClassDropdownOpen(false);
            }}
          >
            <Text style={styles.filterOptionText}>All Classes</Text>
            {selectedClassId === null && <Ionicons name="checkmark" size={16} color="#2F6FE0" />}
          </TouchableOpacity>
          {classesStatus === "success" &&
            classes.map((c) => (
              <TouchableOpacity
                key={c.class_id}
                style={styles.filterOptionRow}
                onPress={() => {
                  setSelectedClassId(c.class_id);
                  setClassDropdownOpen(false);
                }}
              >
                <Text style={styles.filterOptionText} numberOfLines={1}>
                  {classLabel(c)}
                </Text>
                {c.class_id === selectedClassId && <Ionicons name="checkmark" size={16} color="#2F6FE0" />}
              </TouchableOpacity>
            ))}
        </AnchoredDropdown>

        {overviewStatus === "loading" && <SkeletonListRows count={4} />}

        {overviewStatus === "error" && (
          <View style={styles.errorNotice}>
            <Ionicons name="alert-circle-outline" size={22} color="#DC2626" />
            <Text style={styles.errorNoticeText}>{overviewError}</Text>
          </View>
        )}

        {overviewStatus === "success" && visibleRows.length === 0 && (
          <View style={styles.emptyCard}>
            <Ionicons name="rocket-outline" size={26} color="#B0B7C3" />
            <Text style={styles.emptyCardText}>
              {query
                ? "No student matches this search"
                : hasFilters
                  ? "No student matches these filters"
                  : "No student in your department has opted for entrepreneurship yet"}
            </Text>
          </View>
        )}

        {overviewStatus === "success" &&
          visibleRows.map((row) => (
            <View key={row.id} style={styles.card}>
              <View style={styles.cardHeader}>
                {row.photo_url ? (
                  <Image source={{ uri: row.photo_url }} style={styles.avatar} />
                ) : (
                  <View style={styles.avatarFallback}>
                    <Text style={styles.avatarFallbackText}>{initialsFromName(row.name)}</Text>
                  </View>
                )}
                <View style={styles.studentTextWrap}>
                  <Text style={styles.studentName} numberOfLines={1}>
                    {row.name}
                  </Text>
                  <Text style={styles.studentMeta}>
                    {row.student_id_no}
                    {row.batch_label ? ` · ${row.batch_label}` : ""}
                  </Text>
                </View>
              </View>
              <Text style={styles.detailLine}>{row.venture}</Text>
              {(row.domain || row.stage) && (
                <Text style={styles.detailLineSub}>{[row.domain, row.stage].filter(Boolean).join(" · ")}</Text>
              )}
              {row.role && <Text style={styles.remarks}>{row.role}</Text>}
              {row.monthly_revenue != null && (
                <Text style={styles.revenueLine}>Monthly revenue: ₹{row.monthly_revenue}</Text>
              )}
            </View>
          ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F7F8FA",
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 12,
    elevation: 1,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    fontFamily: fonts.regular,
    color: "#111827",
  },
  filterRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 20,
  },
  filterFieldFlex: {
    flex: 1,
  },
  filterField: {
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  filterFieldOpen: {
    borderColor: "#2F6FE0",
  },
  filterFieldLabel: {
    fontSize: 9,
    fontFamily: fonts.bold,
    color: "#9AA6B2",
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  filterFieldValue: {
    fontSize: 12.5,
    fontFamily: fonts.bold,
    color: "#111827",
  },
  dropdownCard: {
    width: 240,
    maxHeight: 320,
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingHorizontal: 12,
    elevation: 6,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },
  filterOptionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F3F6",
  },
  filterOptionText: {
    fontSize: 13,
    fontFamily: fonts.semibold,
    color: "#111827",
  },
  errorNotice: {
    alignItems: "center",
    gap: 8,
    paddingVertical: 40,
  },
  errorNoticeText: {
    fontSize: 13,
    fontFamily: fonts.regular,
    color: "#6B7280",
    textAlign: "center",
    paddingHorizontal: 12,
  },
  emptyCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
    gap: 8,
  },
  emptyCardText: {
    fontSize: 13,
    fontFamily: fonts.medium,
    color: "#9AA6B2",
    textAlign: "center",
  },
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
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  avatarFallback: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#EAF0FD",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarFallbackText: {
    fontSize: 13,
    fontFamily: fonts.bold,
    color: "#2F6FE0",
  },
  studentTextWrap: {
    flex: 1,
  },
  studentName: {
    fontSize: 14,
    fontFamily: fonts.bold,
    color: "#111827",
  },
  studentMeta: {
    fontSize: 11,
    fontFamily: fonts.regular,
    color: "#9AA6B2",
    marginTop: 1,
  },
  detailLine: {
    fontSize: 12.5,
    fontFamily: fonts.semibold,
    color: "#2F6FE0",
    marginTop: 10,
  },
  detailLineSub: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: "#6B7280",
    marginTop: 2,
  },
  remarks: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: "#9AA6B2",
    marginTop: 6,
  },
  revenueLine: {
    fontSize: 12,
    fontFamily: fonts.semibold,
    color: "#111827",
    marginTop: 6,
  },
});
