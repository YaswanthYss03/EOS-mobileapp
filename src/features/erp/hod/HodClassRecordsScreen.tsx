import { useCallback, useEffect, useMemo, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { BackHeader } from "@/components/layout/BackHeader";
import { WatermarkBackground } from "@/components/layout/WatermarkBackground";
import { SkeletonListRows } from "@/components/ui/Skeleton";
import { AnchoredDropdown, useDropdown } from "@/components/ui/dropdown";
import { fonts } from "@/theme";
import { toast } from "@/utils/toast";
import { getApiErrorMessage } from "@/services/api/client";
import {
  getDepartmentClasses,
  getDepartmentClassDetail,
  type HodClassSummary,
  type HodClassDetail,
} from "@/services/api/hod-class-records.api";

type LoadStatus = "loading" | "success" | "error";

function flagTone(tone: "red" | "amber" | "green" | "grey"): { bg: string; text: string } {
  switch (tone) {
    case "red":
      return { bg: "#FEF2F2", text: "#DC2626" };
    case "amber":
      return { bg: "#FEF3C7", text: "#D97706" };
    case "green":
      return { bg: "#F0FDF4", text: "#16A34A" };
    default:
      return { bg: "#F1F3F6", text: "#6B7280" };
  }
}

// Reached from the HOD's own Student-tab "Academics" card (renamed from
// "Subject Records" - see HodAcademicsScreen.tsx). Batch -> Class(+section)
// -> Semester is a cascading drill-down to ONE class, not 3 independent
// filters - in this schema a class row already fixes its own batch and
// current semester (classes.batch_id/current_semester), so the Semester
// picker always ends up with exactly one valid option once a class is
// chosen; it's still a real dropdown (not a hardcoded label), just backed
// by a single confirmed value rather than a free choice.
export function HodClassRecordsScreen() {
  const navigation = useNavigation();
  const router = useRouter();

  const [status, setStatus] = useState<LoadStatus>("loading");
  const [classes, setClasses] = useState<HodClassSummary[]>([]);

  const [batchId, setBatchId] = useState<number | null>(null);
  const [classId, setClassId] = useState<number | null>(null);

  const [detailStatus, setDetailStatus] = useState<LoadStatus | null>(null);
  const [detail, setDetail] = useState<HodClassDetail | null>(null);

  const batchPicker = useDropdown();
  const classPicker = useDropdown();
  const semesterPicker = useDropdown();

  useFocusEffect(
    useCallback(() => {
      navigation.getParent()?.setOptions({ headerShown: false });
      return undefined;
    }, [navigation]),
  );

  useEffect(() => {
    setStatus("loading");
    getDepartmentClasses()
      .then((rows) => {
        setClasses(rows);
        setStatus("success");
      })
      .catch((err) => {
        toast.error(getApiErrorMessage(err, "Couldn't load your department's classes."));
        setStatus("error");
      });
  }, []);

  const batches = useMemo(() => {
    const seen = new Map<number, string>();
    for (const cls of classes) seen.set(cls.batch_id, cls.batch_name);
    return Array.from(seen.entries()).map(([id, name]) => ({ id, name }));
  }, [classes]);

  const classesInBatch = useMemo(
    () => classes.filter((cls) => cls.batch_id === batchId),
    [classes, batchId],
  );

  const selectedClass = classes.find((cls) => cls.class_id === classId) ?? null;

  function selectBatch(id: number) {
    setBatchId(id);
    setClassId(null);
    setDetail(null);
    setDetailStatus(null);
    batchPicker.close();
  }

  function selectClass(cls: HodClassSummary) {
    setClassId(cls.class_id);
    classPicker.close();
    setDetailStatus("loading");
    getDepartmentClassDetail(cls.class_id)
      .then((data) => {
        setDetail(data);
        setDetailStatus("success");
      })
      .catch((err) => {
        toast.error(getApiErrorMessage(err, "Couldn't load this class's records."));
        setDetailStatus("error");
      });
  }

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <BackHeader title="Class Records" onBack={() => router.back()} />
      <WatermarkBackground />
      <ScrollView contentContainerStyle={styles.content}>
        {status === "loading" ? (
          <SkeletonListRows count={3} />
        ) : status === "error" ? (
          <View style={styles.centerState}>
            <Ionicons name="cloud-offline-outline" size={28} color="#B0B7C3" />
            <Text style={styles.centerStateText}>Couldn't load your department's classes.</Text>
          </View>
        ) : (
          <>
            <Text style={styles.fieldLabel}>Batch</Text>
            <View ref={batchPicker.anchorRef} collapsable={false}>
              <TouchableOpacity style={styles.selectRow} onPress={batchPicker.open} activeOpacity={0.8}>
                <Text style={[styles.selectValue, batchId == null && styles.selectValuePlaceholder]}>
                  {batches.find((b) => b.id === batchId)?.name ?? "Choose a batch"}
                </Text>
                <Ionicons name="chevron-down" size={18} color="#B0B7C3" />
              </TouchableOpacity>
            </View>

            <Text style={styles.fieldLabel}>Class</Text>
            <View ref={classPicker.anchorRef} collapsable={false}>
              <TouchableOpacity
                style={[styles.selectRow, batchId == null && styles.selectRowDisabled]}
                onPress={() => batchId != null && classPicker.open()}
                activeOpacity={0.8}
                disabled={batchId == null}
              >
                <Text style={[styles.selectValue, classId == null && styles.selectValuePlaceholder]}>
                  {selectedClass ? `${selectedClass.year} Year - Section ${selectedClass.section}` : "Choose a class"}
                </Text>
                <Ionicons name="chevron-down" size={18} color="#B0B7C3" />
              </TouchableOpacity>
            </View>

            <Text style={styles.fieldLabel}>Semester</Text>
            <View ref={semesterPicker.anchorRef} collapsable={false}>
              <TouchableOpacity
                style={[styles.selectRow, selectedClass == null && styles.selectRowDisabled]}
                onPress={() => selectedClass != null && semesterPicker.open()}
                activeOpacity={0.8}
                disabled={selectedClass == null}
              >
                <Text style={[styles.selectValue, selectedClass == null && styles.selectValuePlaceholder]}>
                  {selectedClass ? `Semester ${selectedClass.semester}` : "—"}
                </Text>
                <Ionicons name="chevron-down" size={18} color="#B0B7C3" />
              </TouchableOpacity>
            </View>

            <View style={styles.divider} />

            {classId == null ? (
              <View style={styles.centerState}>
                <Ionicons name="school-outline" size={28} color="#B0B7C3" />
                <Text style={styles.centerStateText}>Select a batch and class to view its records.</Text>
              </View>
            ) : detailStatus === "loading" ? (
              <SkeletonListRows count={5} />
            ) : detailStatus === "error" ? (
              <View style={styles.centerState}>
                <Ionicons name="cloud-offline-outline" size={28} color="#B0B7C3" />
                <Text style={styles.centerStateText}>Couldn't load this class's records.</Text>
              </View>
            ) : detail ? (
              <>
                <View style={styles.summaryRow}>
                  <SummaryTile label="Mean attendance" value={detail.stats?.mean_attendance != null ? `${detail.stats.mean_attendance}%` : "—"} />
                  <SummaryTile label="Average CGPA" value={detail.stats?.average_cgpa != null ? `${detail.stats.average_cgpa}` : "—"} />
                  <SummaryTile label="Placed" value={`${detail.stats?.placed_count ?? 0}/${detail.stats?.eligible_count ?? 0}`} />
                </View>

                {detail.advisor && (
                  <View style={styles.advisorCard}>
                    <Ionicons name="person-circle-outline" size={20} color="#2F6FE0" />
                    <View style={styles.advisorTextWrap}>
                      <Text style={styles.advisorName}>{detail.advisor.name}</Text>
                      <Text style={styles.advisorSubtitle}>Class Advisor · {detail.advisor.designation}</Text>
                    </View>
                  </View>
                )}

                {detail.students.map((s) => (
                  <View key={s.student_id} style={styles.studentCard}>
                    <View style={styles.studentTopRow}>
                      <View style={styles.studentTextWrap}>
                        <Text style={styles.studentName}>{s.name}</Text>
                        <Text style={styles.studentSubtitle}>{s.student_id_no}</Text>
                      </View>
                      <View style={styles.studentStatsCol}>
                        <Text style={styles.studentStatValue}>{s.cgpa ?? "—"}</Text>
                        <Text style={styles.studentStatLabel}>CGPA</Text>
                      </View>
                      <View style={styles.studentStatsCol}>
                        <Text style={styles.studentStatValue}>{s.attendance_percent != null ? `${s.attendance_percent}%` : "—"}</Text>
                        <Text style={styles.studentStatLabel}>Attend.</Text>
                      </View>
                    </View>
                    {s.flags.length > 0 && (
                      <View style={styles.flagsRow}>
                        {s.flags.map((flag, i) => {
                          const tone = flagTone(flag.tone);
                          return (
                            <View key={i} style={[styles.flagBadge, { backgroundColor: tone.bg }]}>
                              <Text style={[styles.flagBadgeText, { color: tone.text }]}>{flag.label}</Text>
                            </View>
                          );
                        })}
                      </View>
                    )}
                  </View>
                ))}
              </>
            ) : null}
          </>
        )}
      </ScrollView>

      <AnchoredDropdown anchorRef={batchPicker.anchorRef} visible={batchPicker.visible} onClose={batchPicker.close} contentStyle={[styles.modalCard, styles.anchoredCard]}>
        <Text style={styles.modalTitle}>Choose a batch</Text>
        {batches.map((batch) => (
          <TouchableOpacity key={batch.id} style={styles.modalOptionRow} onPress={() => selectBatch(batch.id)} activeOpacity={0.8}>
            <Text style={styles.modalOptionName}>{batch.name}</Text>
            {batchId === batch.id && <Ionicons name="checkmark" size={18} color="#2F6FE0" />}
          </TouchableOpacity>
        ))}
      </AnchoredDropdown>

      <AnchoredDropdown anchorRef={classPicker.anchorRef} visible={classPicker.visible} onClose={classPicker.close} contentStyle={[styles.modalCard, styles.anchoredCard]}>
        <Text style={styles.modalTitle}>Choose a class</Text>
        {classesInBatch.map((cls) => (
          <TouchableOpacity key={cls.class_id} style={styles.modalOptionRow} onPress={() => selectClass(cls)} activeOpacity={0.8}>
            <Text style={styles.modalOptionName}>
              {cls.year} Year - Section {cls.section}
            </Text>
            {classId === cls.class_id && <Ionicons name="checkmark" size={18} color="#2F6FE0" />}
          </TouchableOpacity>
        ))}
      </AnchoredDropdown>

      <AnchoredDropdown anchorRef={semesterPicker.anchorRef} visible={semesterPicker.visible} onClose={semesterPicker.close} contentStyle={[styles.modalCard, styles.anchoredCard]}>
        <Text style={styles.modalTitle}>Semester</Text>
        {selectedClass && (
          <TouchableOpacity style={styles.modalOptionRow} onPress={semesterPicker.close} activeOpacity={0.8}>
            <Text style={styles.modalOptionName}>Semester {selectedClass.semester}</Text>
            <Ionicons name="checkmark" size={18} color="#2F6FE0" />
          </TouchableOpacity>
        )}
      </AnchoredDropdown>
    </SafeAreaView>
  );
}

function SummaryTile({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.summaryTile}>
      <Text style={styles.summaryTileValue}>{value}</Text>
      <Text style={styles.summaryTileLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  content: { padding: 16, paddingBottom: 32 },
  fieldLabel: { fontSize: 12.5, fontFamily: fonts.semibold, color: "#6B7280", marginBottom: 6, marginTop: 12 },
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
  },
  selectRowDisabled: { opacity: 0.5 },
  selectValue: { fontSize: 14, fontFamily: fonts.bold, color: "#111827" },
  selectValuePlaceholder: { fontFamily: fonts.regular, color: "#9AA6B2" },
  divider: { height: 1, backgroundColor: "#F1F3F6", marginVertical: 18 },
  centerState: { alignItems: "center", paddingVertical: 40, gap: 8 },
  centerStateText: { fontSize: 13, fontFamily: fonts.medium, color: "#9AA6B2", textAlign: "center", paddingHorizontal: 20 },
  summaryRow: { flexDirection: "row", gap: 10, marginBottom: 16 },
  summaryTile: {
    flex: 1,
    backgroundColor: "#EAF0FD",
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
  },
  summaryTileValue: { fontSize: 17, fontFamily: fonts.bold, color: "#111827" },
  summaryTileLabel: { fontSize: 10.5, fontFamily: fonts.semibold, color: "#2F6FE0", marginTop: 2, textAlign: "center" },
  advisorCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#EEF0F4",
    borderRadius: 14,
    padding: 12,
    marginBottom: 16,
  },
  advisorTextWrap: { flex: 1 },
  advisorName: { fontSize: 13.5, fontFamily: fonts.bold, color: "#111827" },
  advisorSubtitle: { fontSize: 11.5, fontFamily: fonts.regular, color: "#9AA6B2", marginTop: 1 },
  studentCard: {
    backgroundColor: "#fff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#EEF0F4",
    padding: 12,
    marginBottom: 10,
  },
  studentTopRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  studentTextWrap: { flex: 1 },
  studentName: { fontSize: 14, fontFamily: fonts.bold, color: "#111827" },
  studentSubtitle: { fontSize: 11.5, fontFamily: fonts.regular, color: "#9AA6B2", marginTop: 1 },
  studentStatsCol: { alignItems: "center", minWidth: 48 },
  studentStatValue: { fontSize: 14, fontFamily: fonts.bold, color: "#111827" },
  studentStatLabel: { fontSize: 9.5, fontFamily: fonts.regular, color: "#9AA6B2" },
  flagsRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 10 },
  flagBadge: { borderRadius: 999, paddingHorizontal: 9, paddingVertical: 4 },
  flagBadgeText: { fontSize: 10.5, fontFamily: fonts.bold },
  modalCard: { backgroundColor: "#fff", borderRadius: 18, padding: 18 },
  anchoredCard: {
    width: 280,
    maxHeight: 360,
    elevation: 6,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },
  modalTitle: { fontSize: 15, fontFamily: fonts.bold, color: "#111827", marginBottom: 10 },
  modalOptionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F3F6",
  },
  modalOptionName: { fontSize: 14, fontFamily: fonts.semibold, color: "#111827" },
});
