import { useCallback, useEffect, useState } from "react";
import { View, Text, ScrollView, Image, Pressable, TouchableOpacity, StyleSheet } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SkeletonDetailBlock } from "@/components/ui/Skeleton";
import { fonts } from "@/theme";
import { formatDate } from "@/utils/calendar";
import { getApiErrorMessage } from "@/services/api/client";
import { getPrincipalFacultyProfile, type PrincipalFacultyProfile } from "@/services/api/principal-faculty.api";
import { WatermarkBackground } from "@/components/layout/WatermarkBackground";

function initialsFromName(name: string | null | undefined) {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  return parts
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

function fmtDate(value: string | null): string {
  if (!value) return "—";
  try {
    return formatDate(new Date(value));
  } catch {
    return value;
  }
}

function titleCase(value: string | null): string {
  if (!value) return "—";
  return value
    .split("_")
    .map((w) => (w.length > 0 ? w[0].toUpperCase() + w.slice(1) : w))
    .join(" ");
}

// Principal's own Faculty & Staff drill-down - reached only from
// FacultyStaffScreen's search results (see its FacultyRow onPress), so the
// route lives under app/(tabs)/erp/principal/faculty-staff/ to keep
// back-navigation inside the same tab Stack (same pattern as
// app/(tabs)/erp/placements/student/[studentId].tsx).
export function PrincipalFacultyDetailScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ id: string; name?: string }>();
  const facultyId = Number(params.id);

  // No cleanup on blur - see PrincipalStudentDetailScreen.tsx's identical
  // comment (this screen is pushed on top of FacultyStaffScreen.tsx the
  // same way, and races the same way).
  useFocusEffect(
    useCallback(() => {
      navigation.getParent()?.setOptions({ headerShown: false });
      return undefined;
    }, [navigation]),
  );

  const [profile, setProfile] = useState<PrincipalFacultyProfile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    if (!facultyId) return;
    setLoading(true);
    setError(null);
    getPrincipalFacultyProfile(facultyId)
      .then(setProfile)
      .catch((err) => setError(getApiErrorMessage(err, "Couldn't load this faculty member's profile.")))
      .finally(() => setLoading(false));
  }, [facultyId]);

  useEffect(() => {
    load();
  }, [load]);

  const headerName = profile?.name ?? params.name ?? "Faculty";

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <WatermarkBackground />
      <LinearGradient
        colors={["#2F6FE0", "#1A3D8F"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.header, { paddingTop: insets.top + 10 }]}
      >
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </Pressable>
        <View style={styles.headerAvatar}>
          {profile?.photo_url ? (
            <Image source={{ uri: profile.photo_url }} style={styles.headerAvatarImage} />
          ) : (
            <Text style={styles.headerAvatarText}>{initialsFromName(headerName)}</Text>
          )}
        </View>
        <View style={styles.headerTextWrap}>
          <Text style={styles.title} numberOfLines={1}>
            {headerName}
          </Text>
          <Text style={styles.subtitle}>
            {profile?.staff_code ? profile.staff_code : "Loading…"}
            {profile?.designation ? ` · ${profile.designation}` : ""}
          </Text>
        </View>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {loading && <SkeletonDetailBlock />}

        {!loading && error && (
          <View style={styles.centerState}>
            <Ionicons name="cloud-offline-outline" size={28} color="#B0B7C3" />
            <Text style={styles.centerStateText}>{error}</Text>
            <TouchableOpacity onPress={load}>
              <Text style={styles.retryText}>Tap to retry</Text>
            </TouchableOpacity>
          </View>
        )}

        {!loading && !error && profile && (
          <>
            {/* Employment - every field always shown, "—" for anything not
                on file, rather than silently hiding the row (a hidden row
                reads as "nothing to show" when it's really "not entered
                yet" - the distinction matters for Principal/Correspondent
                auditing staff records for completeness). */}
            <SectionCard title="Employment">
              <DetailLine label="Designation" value={profile.designation ?? "—"} />
              <DetailLine label="Department" value={profile.department ? `${profile.department.name} (${profile.department.code})` : "—"} />
              <DetailLine label="Status" value={titleCase(profile.status)} />
              <DetailLine label="Employment status" value={titleCase(profile.employment_status)} />
              <DetailLine label="Employment type" value={titleCase(profile.employment_type)} />
              <DetailLine label="Date of joining" value={fmtDate(profile.date_of_joining)} />
              <DetailLine label="Experience" value={profile.experience_years !== null ? `${profile.experience_years} yrs` : "—"} />
              <DetailLine label="Staff code" value={profile.staff_code ?? "—"} />
              <DetailLine label="Office room" value={profile.office_room ?? "—"} />
              <DetailLine label="Work location" value={profile.work_location ?? "—"} />
            </SectionCard>

            {/* Personal */}
            <SectionCard title="Personal">
              <DetailLine label="Gender" value={titleCase(profile.gender)} />
              <DetailLine label="Date of birth" value={fmtDate(profile.date_of_birth)} />
              <DetailLine label="Institute email" value={profile.institute_email} />
              <DetailLine label="Personal email" value={profile.personal_email ?? "—"} />
              <DetailLine label="Phone" value={profile.phone ?? "—"} />
              <DetailLine label="Qualification" value={profile.qualification ?? "—"} />
              <DetailLine label="Specialization" value={profile.specialization ?? "—"} />
              <DetailLine label="Previous institution" value={profile.previous_institution ?? "—"} />
            </SectionCard>

            {/* Teaching load */}
            <SectionCard title="Teaching load">
              <DetailLine
                label="Attendance this term"
                value={profile.attendance_pct_this_term !== null ? `${profile.attendance_pct_this_term}%` : "—"}
              />
              <DetailLine label="Periods per week" value={String(profile.periods_per_week)} />
              <DetailLine label="Class advisor of" value={profile.class_advisor_of ?? "—"} />
              {profile.subjects_handled.length > 0 && (
                <View style={styles.subList}>
                  <Text style={styles.subListTitle}>Subjects handled</Text>
                  {profile.subjects_handled.map((subj, i) => (
                    <View key={`${subj.code}-${i}`} style={styles.subRow}>
                      <Text style={styles.subRowTitle}>
                        {subj.code} · {subj.name}
                      </Text>
                      <Text style={styles.subRowMeta}>
                        {subj.semester !== null ? `Sem ${subj.semester}` : "Sem —"} · Section {subj.section} · {subj.academic_year}
                      </Text>
                    </View>
                  ))}
                </View>
              )}
            </SectionCard>

            {/* Leave & OD */}
            {(profile.leave_balances.length > 0 || profile.leave_history.length > 0 || profile.od_history.length > 0) && (
              <SectionCard title="Leave & OD">
                {profile.leave_balances.length > 0 && (
                  <View style={styles.subList}>
                    <Text style={styles.subListTitle}>Leave balances</Text>
                    {profile.leave_balances.map((bal, i) => (
                      <View key={`${bal.leave_type}-${i}`} style={styles.subRow}>
                        <Text style={styles.subRowTitle}>{titleCase(bal.leave_type)}</Text>
                        <Text style={styles.subRowMeta}>
                          {bal.used} / {bal.allocated} used · {bal.academic_year}
                        </Text>
                      </View>
                    ))}
                  </View>
                )}

                {profile.leave_history.length > 0 && (
                  <View style={styles.subList}>
                    <Text style={styles.subListTitle}>Recent leave</Text>
                    {profile.leave_history.slice(0, 10).map((lv, i) => (
                      <View key={i} style={styles.subRow}>
                        <Text style={styles.subRowTitle}>
                          {fmtDate(lv.from_date)} – {fmtDate(lv.to_date)}
                        </Text>
                        <Text style={styles.subRowMeta}>
                          {lv.reason ?? "No reason given"} · HoD {titleCase(lv.hod_status)} · HR {titleCase(lv.hr_status)}
                        </Text>
                      </View>
                    ))}
                  </View>
                )}

                {profile.od_history.length > 0 && (
                  <View style={styles.subList}>
                    <Text style={styles.subListTitle}>Recent OD</Text>
                    {profile.od_history.slice(0, 10).map((od, i) => (
                      <View key={i} style={styles.subRow}>
                        <Text style={styles.subRowTitle}>
                          {fmtDate(od.from_date)} – {fmtDate(od.to_date)}
                        </Text>
                        <Text style={styles.subRowMeta}>
                          {od.purpose ?? "No purpose given"}
                          {od.place ? ` · ${od.place}` : ""} · HoD {titleCase(od.hod_status)} · HR {titleCase(od.hr_status)}
                        </Text>
                      </View>
                    ))}
                  </View>
                )}
              </SectionCard>
            )}

            {/* Appraisal */}
            {profile.appraisal && (
              <SectionCard title="Appraisal">
                <DetailLine label="Status" value={titleCase(profile.appraisal.status)} />
                <DetailLine label="Academic year" value={profile.appraisal.academic_year ?? "—"} />
                <DetailLine label="HoD reviewed" value={fmtDate(profile.appraisal.hod_reviewed_at)} />
                <DetailLine label="Management approved" value={fmtDate(profile.appraisal.management_approved_at)} />
                <DetailLine label="Remarks" value={profile.appraisal.remarks ?? "—"} />
              </SectionCard>
            )}

            {/* Publications & awards */}
            {(profile.publications_summary.total > 0 || profile.publications.length > 0 || profile.awards.length > 0) && (
              <SectionCard title="Publications & awards">
                {profile.publications_summary.total > 0 && (
                  <View style={styles.statsRow}>
                    <MiniStat label="Total" value={String(profile.publications_summary.total)} />
                    <MiniStat label="Journals" value={String(profile.publications_summary.journals)} />
                    <MiniStat label="Conferences" value={String(profile.publications_summary.conferences)} />
                    <MiniStat label="Books" value={String(profile.publications_summary.books)} />
                    <MiniStat label="Citations" value={String(profile.publications_summary.total_citations)} />
                    <MiniStat label="h-index" value={String(profile.publications_summary.h_index)} />
                  </View>
                )}

                {profile.publications.length > 0 && (
                  <View style={styles.subList}>
                    <Text style={styles.subListTitle}>Publications</Text>
                    {profile.publications.map((pub, i) => (
                      <View key={i} style={styles.subRow}>
                        <Text style={styles.subRowTitle}>{pub.title}</Text>
                        <Text style={styles.subRowMeta}>
                          {titleCase(pub.type)} · {pub.year} · {pub.citation_count} citations
                        </Text>
                      </View>
                    ))}
                  </View>
                )}

                {profile.awards.length > 0 && (
                  <View style={styles.subList}>
                    <Text style={styles.subListTitle}>Awards</Text>
                    {profile.awards.map((award, i) => (
                      <View key={i} style={styles.subRow}>
                        <Text style={styles.subRowTitle}>{award.title}</Text>
                        <Text style={styles.subRowMeta}>
                          {award.year}
                          {award.awarded_by ? ` · ${award.awarded_by}` : ""}
                        </Text>
                      </View>
                    ))}
                  </View>
                )}
              </SectionCard>
            )}

            {/* Responsibilities */}
            {profile.responsibilities.length > 0 && (
              <SectionCard title="Responsibilities">
                {profile.responsibilities.map((resp, i) => (
                  <View key={i} style={styles.subRow}>
                    <Text style={styles.subRowTitle}>{resp.title}</Text>
                    <Text style={styles.subRowMeta}>{resp.academic_year}</Text>
                  </View>
                ))}
              </SectionCard>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{title}</Text>
      {children}
    </View>
  );
}

function DetailLine({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailLine}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.miniStat}>
      <Text style={styles.miniStatValue}>{value}</Text>
      <Text style={styles.miniStatLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F7F8FA" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingBottom: 14,
  },
  headerAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerAvatarImage: { width: 44, height: 44, borderRadius: 22 },
  headerAvatarText: { fontSize: 16, fontFamily: fonts.bold, color: "#fff" },
  headerTextWrap: { flex: 1 },
  title: { fontSize: 18, fontFamily: fonts.bold, color: "#fff" },
  subtitle: { fontSize: 11, fontFamily: fonts.regular, color: "#D7E2FA", marginTop: 2 },
  content: { padding: 16, paddingBottom: 40 },
  centerState: { alignItems: "center", paddingVertical: 40, gap: 8 },
  centerStateText: { fontSize: 13, fontFamily: fonts.medium, color: "#9AA6B2", textAlign: "center", paddingHorizontal: 20 },
  retryText: { fontSize: 13, fontFamily: fonts.bold, color: "#2F6FE0", marginTop: 4 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#EEF0F4",
    padding: 16,
    marginBottom: 14,
  },
  cardTitle: { fontSize: 15, fontFamily: fonts.bold, color: "#111827", marginBottom: 10 },
  detailLine: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F3F6",
  },
  detailLabel: { fontSize: 12, fontFamily: fonts.medium, color: "#9AA6B2" },
  detailValue: { flex: 1, fontSize: 13, fontFamily: fonts.semibold, color: "#111827", textAlign: "right" },
  subList: { marginTop: 12 },
  subListTitle: { fontSize: 12, fontFamily: fonts.bold, color: "#4B5563", marginBottom: 8 },
  subRow: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F3F6",
    gap: 2,
  },
  subRowTitle: { fontSize: 13, fontFamily: fonts.semibold, color: "#111827" },
  subRowMeta: { fontSize: 11, fontFamily: fonts.regular, color: "#8A93A3" },
  statsRow: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  miniStat: {
    minWidth: 70,
    backgroundColor: "#F7F8FA",
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
    alignItems: "center",
  },
  miniStatValue: { fontSize: 15, fontFamily: fonts.bold, color: "#111827" },
  miniStatLabel: { fontSize: 10, fontFamily: fonts.medium, color: "#9AA6B2", marginTop: 2 },
});
