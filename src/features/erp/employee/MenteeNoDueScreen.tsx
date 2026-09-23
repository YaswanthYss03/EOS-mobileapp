import { useCallback, useEffect, useMemo, useState } from "react";
import { View, Text, TextInput, ScrollView, TouchableOpacity, ActivityIndicator, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { BackHeader } from "@/components/layout/BackHeader";
import { SkeletonListRows } from "@/components/ui/Skeleton";
import { fonts } from "@/theme";
import { toast } from "@/utils/toast";
import { getApiErrorMessage } from "@/services/api/client";
import { WatermarkBackground } from "@/components/layout/WatermarkBackground";
import {
  getMyMentorClasses,
  getMentorClassNoDue,
  approveMentorClassNoDue,
  type MentorNoDueRow,
} from "@/services/api/class-mentors.api";

type LoadStatus = "loading" | "success" | "error";

function CategoryBadge({ label, cleared }: { label: string; cleared: boolean }) {
  return (
    <View style={[styles.categoryBadge, cleared ? styles.categoryBadgeCleared : styles.categoryBadgePending]}>
      <Ionicons name={cleared ? "checkmark" : "close"} size={11} color={cleared ? "#16A34A" : "#DC2626"} />
      <Text style={[styles.categoryBadgeText, cleared ? styles.categoryBadgeTextCleared : styles.categoryBadgeTextPending]}>
        {label}
      </Text>
    </View>
  );
}

// Class-mentor-scoped No Due approval (this Advisor's own mentored class
// only, not the whole department like the HoD-facing No Due page) - live
// fee/library/academics dues, same computation as that HoD view (see
// EOS-backend's class-mentors.service.ts's getNoDueForClassMentor).
export function MenteeNoDueScreen() {
  const router = useRouter();

  const [classId, setClassId] = useState<number | null>(null);
  const [status, setStatus] = useState<LoadStatus>("loading");
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<MentorNoDueRow[]>([]);
  const [approvingId, setApprovingId] = useState<number | null>(null);
  // Client-side, not a server round-trip - this class's roster is already
  // small (one class), and student_id_no doubles as the roll number shown
  // everywhere else this app searches by "roll no" (there is no separate
  // roll_no field on this row).
  const [search, setSearch] = useState("");

  const load = useCallback(() => {
    setStatus("loading");
    setError(null);
    getMyMentorClasses()
      .then((classes) => {
        if (classes.length === 0) {
          setRows([]);
          setStatus("success");
          return;
        }
        setClassId(classes[0].class_id);
        return getMentorClassNoDue(classes[0].class_id).then((response) => {
          setRows(response.rows);
          setStatus("success");
        });
      })
      .catch((err) => {
        setError(getApiErrorMessage(err, "Couldn't load No Due status for your class."));
        setStatus("error");
      });
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return rows;
    return rows.filter(
      (row) => row.name.toLowerCase().includes(query) || row.student_id_no.toLowerCase().includes(query),
    );
  }, [rows, search]);

  function handleApprove(studentId: number) {
    if (!classId || approvingId !== null) return;
    setApprovingId(studentId);
    approveMentorClassNoDue(classId, studentId)
      .then(() => {
        toast.success("No Due override issued");
        load();
      })
      .catch((err) => toast.error(getApiErrorMessage(err, "Couldn't issue the override.")))
      .finally(() => setApprovingId(null));
  }

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <WatermarkBackground />
      <BackHeader title="No Due" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {status === "loading" && <SkeletonListRows count={5} />}

        {status === "error" && (
          <View style={styles.errorNotice}>
            <Ionicons name="alert-circle-outline" size={22} color="#DC2626" />
            <Text style={styles.errorNoticeText}>{error}</Text>
          </View>
        )}

        {status === "success" && rows.length > 0 && (
          <View style={styles.searchField}>
            <Ionicons name="search-outline" size={16} color="#9AA6B2" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search by name or roll no"
              placeholderTextColor="#9AA6B2"
              value={search}
              onChangeText={setSearch}
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => setSearch("")} hitSlop={8}>
                <Ionicons name="close-circle" size={16} color="#B0B7C3" />
              </TouchableOpacity>
            )}
          </View>
        )}

        {status === "success" && rows.length === 0 && (
          <View style={styles.emptyCard}>
            <Ionicons name="checkmark-done-outline" size={26} color="#B0B7C3" />
            <Text style={styles.emptyCardText}>No students to show for your class</Text>
          </View>
        )}

        {status === "success" && rows.length > 0 && filteredRows.length === 0 && (
          <View style={styles.emptyCard}>
            <Ionicons name="search-outline" size={26} color="#B0B7C3" />
            <Text style={styles.emptyCardText}>No student matches "{search}"</Text>
          </View>
        )}

        {status === "success" &&
          filteredRows.map((row) => (
            <View key={row.student_id} style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.studentTextWrap}>
                  <Text style={styles.studentName} numberOfLines={1}>
                    {row.name}
                  </Text>
                  <Text style={styles.studentMeta}>{row.student_id_no}</Text>
                </View>
                {row.issued ? (
                  <View style={styles.issuedBadge}>
                    <Text style={styles.issuedBadgeText}>Issued</Text>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={styles.approveButton}
                    onPress={() => handleApprove(row.student_id)}
                    disabled={approvingId === row.student_id}
                    activeOpacity={0.85}
                  >
                    {approvingId === row.student_id ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Text style={styles.approveButtonText}>Issue</Text>
                    )}
                  </TouchableOpacity>
                )}
              </View>
              <View style={styles.badgeRow}>
                <CategoryBadge label="Library" cleared={row.library_cleared} />
                <CategoryBadge label="Lab" cleared={row.laboratory_cleared} />
                <CategoryBadge label="Fees" cleared={row.fees_cleared} />
                <CategoryBadge label="Hostel" cleared={row.hostel_cleared} />
                <CategoryBadge label="Academics" cleared={row.academics_cleared} />
              </View>
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
  searchField: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 14,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    fontFamily: fonts.regular,
    color: "#111827",
    padding: 0,
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
  approveButton: {
    minWidth: 64,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#2F6FE0",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  approveButtonText: {
    fontSize: 12,
    fontFamily: fonts.bold,
    color: "#fff",
  },
  issuedBadge: {
    backgroundColor: "#F0FDF4",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  issuedBadgeText: {
    fontSize: 11,
    fontFamily: fonts.bold,
    color: "#16A34A",
  },
  badgeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 10,
  },
  categoryBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  categoryBadgeCleared: {
    backgroundColor: "#F0FDF4",
  },
  categoryBadgePending: {
    backgroundColor: "#FEF2F2",
  },
  categoryBadgeText: {
    fontSize: 10,
    fontFamily: fonts.semibold,
  },
  categoryBadgeTextCleared: {
    color: "#16A34A",
  },
  categoryBadgeTextPending: {
    color: "#DC2626",
  },
});
