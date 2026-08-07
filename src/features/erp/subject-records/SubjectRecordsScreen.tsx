import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, View, Text, ScrollView, TouchableOpacity, Modal, StyleSheet } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { CollegeHeader } from "@/components/layout/CollegeHeader";
import { fonts } from "@/theme";
import { toast } from "@/utils/toast";
import { getApiErrorMessage } from "@/services/api/client";
import {
  getMySubjectRecordMappings,
  getMySubjectRecordDetail,
  publishSubjectRecordResult,
  type SubjectRecordMapping,
  type SubjectRecordDetail,
} from "@/services/api/subject-records.api";

type LoadStatus = "loading" | "success" | "error";

function initialsFromName(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

export function SubjectRecordsScreen() {
  const navigation = useNavigation();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [mappingsStatus, setMappingsStatus] = useState<LoadStatus>("loading");
  const [mappingsError, setMappingsError] = useState<string | null>(null);
  const [mappings, setMappings] = useState<SubjectRecordMapping[]>([]);
  const [selectedMappingId, setSelectedMappingId] = useState<number | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);

  const [detailStatus, setDetailStatus] = useState<LoadStatus>("loading");
  const [detailError, setDetailError] = useState<string | null>(null);
  const [detail, setDetail] = useState<SubjectRecordDetail | null>(null);
  const [publishing, setPublishing] = useState(false);

  const loadMappings = useCallback(() => {
    setMappingsStatus("loading");
    setMappingsError(null);
    getMySubjectRecordMappings()
      .then((rows) => {
        setMappings(rows);
        setMappingsStatus("success");
        if (rows.length > 0) {
          setSelectedMappingId((current) => current ?? rows[0].exam_subject_mapping_id);
        }
      })
      .catch((err) => {
        setMappingsError(getApiErrorMessage(err, "Couldn't load your classes & subjects."));
        setMappingsStatus("error");
      });
  }, []);

  const loadDetail = useCallback((examSubjectMappingId: number) => {
    setDetailStatus("loading");
    setDetailError(null);
    getMySubjectRecordDetail(examSubjectMappingId)
      .then((data) => {
        setDetail(data);
        setDetailStatus("success");
      })
      .catch((err) => {
        setDetailError(getApiErrorMessage(err, "Couldn't load this subject's records."));
        setDetailStatus("error");
      });
  }, []);

  useEffect(() => {
    loadMappings();
  }, [loadMappings]);

  useEffect(() => {
    if (selectedMappingId !== null) {
      loadDetail(selectedMappingId);
    }
  }, [selectedMappingId, loadDetail]);

  useFocusEffect(
    useCallback(() => {
      navigation.getParent()?.setOptions({ headerShown: false });
      return () => {
        navigation.getParent()?.setOptions({ headerShown: true, header: () => <CollegeHeader /> });
      };
    }, [navigation]),
  );

  const selectedMapping = useMemo(
    () => mappings.find((m) => m.exam_subject_mapping_id === selectedMappingId) ?? null,
    [mappings, selectedMappingId],
  );

  const maxCount = useMemo(() => {
    if (!detail || detail.grade_distribution.length === 0) return 1;
    return Math.max(1, ...detail.grade_distribution.map((item) => item.count));
  }, [detail]);

  function handlePickMapping(id: number) {
    setSelectedMappingId(id);
    setPickerOpen(false);
  }

  function handlePublish() {
    if (!detail || publishing) return;
    setPublishing(true);
    publishSubjectRecordResult(detail.exam_subject_mapping_id)
      .then((updated) => {
        setDetail((current) => (current ? { ...current, ...updated } : current));
        setMappings((current) =>
          current.map((m) =>
            m.exam_subject_mapping_id === updated.exam_subject_mapping_id ? { ...m, ...updated } : m,
          ),
        );
        toast.success("Result published to class");
      })
      .catch((err) => {
        toast.error(getApiErrorMessage(err, "Couldn't publish the result."));
      })
      .finally(() => setPublishing(false));
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
          <Text style={styles.headerTitle}>Subject Records</Text>
          <Text style={styles.headerSubtitle}>Semester performance</Text>
        </View>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.fieldLabel}>Class & Subject</Text>

        {mappingsStatus === "loading" && (
          <View style={styles.inlineLoading}>
            <ActivityIndicator color="#2F6FE0" />
          </View>
        )}

        {mappingsStatus === "error" && (
          <ErrorNotice message={mappingsError ?? "Something went wrong."} onRetry={loadMappings} />
        )}

        {mappingsStatus === "success" && mappings.length === 0 && (
          <View style={styles.emptyCard}>
            <Ionicons name="book-outline" size={26} color="#B0B7C3" />
            <Text style={styles.emptyCardText}>No subjects mapped to you yet</Text>
          </View>
        )}

        {mappingsStatus === "success" && mappings.length > 0 && (
          <TouchableOpacity style={styles.classCard} activeOpacity={0.8} onPress={() => setPickerOpen(true)}>
            <Text style={styles.classCardText} numberOfLines={1}>
              {selectedMapping
                ? `${selectedMapping.class.label} · ${selectedMapping.subject.subject_code} ${selectedMapping.subject.name}`
                : "Select a class & subject"}
            </Text>
            <Ionicons name="chevron-down" size={18} color="#B0B7C3" />
          </TouchableOpacity>
        )}

        {selectedMapping && (
          <Text style={styles.examMeta}>
            {selectedMapping.exam.type} · {selectedMapping.exam.academic_year} · Semester {selectedMapping.exam.semester}
          </Text>
        )}

        {detailStatus === "loading" && (
          <View style={styles.inlineLoading}>
            <ActivityIndicator color="#2F6FE0" />
          </View>
        )}

        {detailStatus === "error" && (
          <ErrorNotice
            message={detailError ?? "Something went wrong."}
            onRetry={() => selectedMappingId !== null && loadDetail(selectedMappingId)}
          />
        )}

        {detailStatus === "success" && detail && detail.entered_count === 0 && (
          <View style={styles.emptyCard}>
            <Ionicons name="bar-chart-outline" size={26} color="#B0B7C3" />
            <Text style={styles.emptyCardText}>No marks entered for this subject yet</Text>
          </View>
        )}

        {detailStatus === "success" && detail && detail.entered_count > 0 && (
          <>
            <Text style={styles.sectionTitle}>Grade Distribution</Text>
            <View style={styles.card}>
              {detail.grade_distribution.map((item) => (
                <View key={item.grade} style={styles.gradeRow}>
                  <Text style={styles.gradeLabel}>{item.grade}</Text>
                  <View style={styles.gradeBarTrack}>
                    <View
                      style={[
                        styles.gradeBarFill,
                        { width: `${Math.max((item.count / maxCount) * 100, item.count > 0 ? 6 : 0)}%` },
                      ]}
                    />
                  </View>
                  <Text style={styles.gradeCount}>{item.count}</Text>
                </View>
              ))}
            </View>

            <Text style={styles.sectionTitle}>Toppers</Text>
            <View style={styles.card}>
              {detail.toppers.length === 0 && (
                <Text style={styles.emptyCardText}>No scored entries yet</Text>
              )}
              {detail.toppers.map((topper, index) => (
                <View
                  key={topper.rank}
                  style={[styles.topperRow, index < detail.toppers.length - 1 && styles.topperRowDivider]}
                >
                  <View style={styles.rankBadge}>
                    <Text style={styles.rankBadgeText}>{topper.rank}</Text>
                  </View>
                  <View style={styles.topperAvatar}>
                    <Text style={styles.topperAvatarText}>{initialsFromName(topper.name)}</Text>
                  </View>
                  <View style={styles.topperTextWrap}>
                    <Text style={styles.topperName}>{topper.name}</Text>
                    <Text style={styles.topperRoll}>{topper.roll_no}</Text>
                  </View>
                  <Text style={styles.topperScore}>{topper.score}</Text>
                </View>
              ))}
            </View>

            <TouchableOpacity
              style={[styles.publishButton, (publishing || detail.is_published) && styles.publishButtonDisabled]}
              onPress={handlePublish}
              activeOpacity={0.85}
              disabled={publishing || detail.is_published}
            >
              {publishing ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.publishButtonText}>
                  {detail.is_published ? "Result Already Published" : "Publish Result to Class"}
                </Text>
              )}
            </TouchableOpacity>
          </>
        )}
      </ScrollView>

      <Modal visible={pickerOpen} transparent animationType="fade" onRequestClose={() => setPickerOpen(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setPickerOpen(false)}>
          <TouchableOpacity style={styles.modalCard} activeOpacity={1}>
            <Text style={styles.modalTitle}>Select Class & Subject</Text>
            <ScrollView style={styles.modalList}>
              {mappings.map((m) => (
                <TouchableOpacity
                  key={m.exam_subject_mapping_id}
                  style={styles.modalRow}
                  onPress={() => handlePickMapping(m.exam_subject_mapping_id)}
                  activeOpacity={0.7}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.modalRowText}>
                      {m.class.label} · {m.subject.subject_code} {m.subject.name}
                    </Text>
                    <Text style={styles.modalRowSubtext}>
                      {m.exam.type} · {m.exam.academic_year} · Sem {m.exam.semester}
                    </Text>
                  </View>
                  {m.exam_subject_mapping_id === selectedMappingId && (
                    <Ionicons name="checkmark-circle" size={20} color="#2F6FE0" />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
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
  fieldLabel: {
    fontSize: 11,
    fontFamily: fonts.medium,
    color: "#9AA6B2",
    marginBottom: 6,
  },
  inlineLoading: {
    paddingVertical: 24,
    alignItems: "center",
  },
  errorNotice: {
    alignItems: "center",
    gap: 8,
    paddingVertical: 20,
  },
  errorNoticeText: {
    fontSize: 13,
    fontFamily: fonts.regular,
    color: "#6B7280",
    textAlign: "center",
    paddingHorizontal: 12,
  },
  retryButton: {
    marginTop: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#2F6FE0",
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  retryButtonText: {
    fontSize: 12,
    fontFamily: fonts.bold,
    color: "#2F6FE0",
  },
  emptyCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    alignItems: "center",
    gap: 8,
    elevation: 2,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
  },
  emptyCardText: {
    fontSize: 13,
    fontFamily: fonts.medium,
    color: "#9AA6B2",
    textAlign: "center",
  },
  classCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#fff",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 14,
    marginBottom: 6,
    elevation: 2,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
  },
  classCardText: {
    flex: 1,
    fontSize: 14,
    fontFamily: fonts.bold,
    color: "#111827",
    marginRight: 8,
  },
  examMeta: {
    fontSize: 12,
    fontFamily: fonts.medium,
    color: "#9AA6B2",
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 12,
    fontFamily: fonts.bold,
    color: "#8A93A3",
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 8,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    elevation: 2,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
  },
  gradeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 7,
  },
  gradeLabel: {
    width: 28,
    fontSize: 12,
    fontFamily: fonts.bold,
    color: "#4B5563",
  },
  gradeBarTrack: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#EEF2F9",
    overflow: "hidden",
  },
  gradeBarFill: {
    height: "100%",
    borderRadius: 4,
    backgroundColor: "#2F6FE0",
  },
  gradeCount: {
    width: 24,
    textAlign: "right",
    fontSize: 12,
    fontFamily: fonts.semibold,
    color: "#111827",
  },
  topperRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
  },
  topperRowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: "#F1F3F6",
  },
  rankBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#E4EBFB",
    alignItems: "center",
    justifyContent: "center",
  },
  rankBadgeText: {
    fontSize: 11,
    fontFamily: fonts.bold,
    color: "#2F6FE0",
  },
  topperAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#E4EBFB",
    alignItems: "center",
    justifyContent: "center",
  },
  topperAvatarText: {
    fontSize: 11,
    fontFamily: fonts.bold,
    color: "#2F6FE0",
  },
  topperTextWrap: {
    flex: 1,
  },
  topperName: {
    fontSize: 13,
    fontFamily: fonts.semibold,
    color: "#111827",
  },
  topperRoll: {
    fontSize: 11,
    fontFamily: fonts.regular,
    color: "#9AA6B2",
    marginTop: 1,
  },
  topperScore: {
    fontSize: 15,
    fontFamily: fonts.bold,
    color: "#2F6FE0",
  },
  publishButton: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#2F6FE0",
    borderRadius: 16,
    paddingVertical: 16,
    elevation: 3,
    shadowColor: "#2F6FE0",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  publishButtonDisabled: {
    backgroundColor: "#9AB3E8",
    shadowOpacity: 0,
    elevation: 0,
  },
  publishButtonText: {
    fontSize: 15,
    fontFamily: fonts.bold,
    color: "#fff",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15,23,42,0.5)",
    justifyContent: "center",
    padding: 20,
  },
  modalCard: {
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 18,
    maxHeight: "70%",
  },
  modalTitle: {
    fontSize: 15,
    fontFamily: fonts.bold,
    color: "#111827",
    marginBottom: 10,
  },
  modalList: {
    maxHeight: 360,
  },
  modalRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F3F6",
  },
  modalRowText: {
    fontSize: 13,
    fontFamily: fonts.semibold,
    color: "#111827",
  },
  modalRowSubtext: {
    fontSize: 11,
    fontFamily: fonts.regular,
    color: "#9AA6B2",
    marginTop: 2,
  },
});
