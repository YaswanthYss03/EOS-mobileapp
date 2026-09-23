import { useCallback, useEffect, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, Image, StyleSheet } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SkeletonDetailBlock, SkeletonListRows } from "@/components/ui/Skeleton";
import { fonts } from "@/theme";
import { formatDate } from "@/utils/calendar";
import { getApiErrorMessage } from "@/services/api/client";
import { getPrincipalStudentProfile, type PrincipalStudentProfile } from "@/services/api/principal-students.api";
import { WatermarkBackground } from "@/components/layout/WatermarkBackground";

// Full student profile, principal-side - drill-down from
// PrincipalStudentsScreen's search results/recent lookups (tapping a
// StudentRow there navigates here instead of the old shallow 6-line modal).
// GET /principal-students/:id/profile is comprehensive server-side; every
// section below only renders when it actually has data - never a fabricated
// placeholder beyond an honest "No X on file" line.

function initialsFromName(name: string | null | undefined) {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  return parts
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

function humanize(value: string | null | undefined) {
  if (!value) return value ?? null;
  return value
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function formatDateSafe(value: string | null | undefined): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return formatDate(date);
}

function formatCurrency(value: number | null | undefined): string | null {
  if (value === null || value === undefined) return null;
  return `₹${value.toLocaleString()}`;
}

type Row = { label: string; value: string | number | null | undefined };

// One bordered card per section - renders nothing (not even the title) when
// every row is empty, since biodata/records coverage varies a lot per
// student and an empty card reads worse than no card at all.
function Section({ title, rows }: { title: string; rows: Row[] }) {
  const visibleRows = rows.filter((row) => row.value !== null && row.value !== undefined && row.value !== "");
  if (visibleRows.length === 0) return null;

  return (
    <View style={styles.sectionWrap}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.card}>
        {visibleRows.map((row, index) => (
          <View key={`${row.label}-${index}`} style={[styles.detailLine, index > 0 && styles.detailLineDivider]}>
            <Text style={styles.detailLabel}>{row.label}</Text>
            <Text style={styles.detailValue}>{row.value}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

// A section made of several sub-cards (one per address / family member /
// etc.) rather than one flat row list - each sub-card is itself a Row list
// via Section's same rendering, just nested under one section title.
function SubCardSection({
  title,
  items,
}: {
  title: string;
  items: { heading: string; rows: Row[] }[];
}) {
  const visible = items
    .map((item) => ({
      heading: item.heading,
      rows: item.rows.filter((row) => row.value !== null && row.value !== undefined && row.value !== ""),
    }))
    .filter((item) => item.rows.length > 0);
  if (visible.length === 0) return null;

  return (
    <View style={styles.sectionWrap}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {visible.map((item, i) => (
        <View key={`${item.heading}-${i}`} style={[styles.card, i > 0 && { marginTop: 10 }]}>
          <Text style={styles.subCardHeading}>{item.heading}</Text>
          {item.rows.map((row, index) => (
            <View key={`${row.label}-${index}`} style={[styles.detailLine, index > 0 && styles.detailLineDivider]}>
              <Text style={styles.detailLabel}>{row.label}</Text>
              <Text style={styles.detailValue}>{row.value}</Text>
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}

export function PrincipalStudentDetailScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ id: string; name?: string }>();
  const studentId = Number(params.id);

  // No cleanup on blur - unlike the list screen this is pushed on top of
  // (PrincipalStudentsScreen.tsx), which still resets on its own blur for
  // when the whole subtree loses focus. A cleanup here would race that
  // screen's own focus effect on back-navigation (blur/focus ordering
  // between two screens in the same Stack isn't guaranteed), intermittently
  // leaving both this screen's own header AND the shared CollegeHeader
  // visible at once. Going back simply lets the list screen's focus effect
  // re-set headerShown:false, same as StudentPlacementHistoryScreen.tsx's
  // no-cleanup pattern.
  useFocusEffect(
    useCallback(() => {
      navigation.getParent()?.setOptions({ headerShown: false });
      return undefined;
    }, [navigation]),
  );

  const [profile, setProfile] = useState<PrincipalStudentProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    setLoading(true);
    setError(null);
    getPrincipalStudentProfile(studentId)
      .then(setProfile)
      .catch((err) => setError(getApiErrorMessage(err, "Couldn't load this student's profile.")))
      .finally(() => setLoading(false));
  }, [studentId, reloadToken]);

  const headerName = profile?.name ?? params.name ?? "Student";
  const headerSubtitle = profile ? profile.register_no ?? profile.student_id_no : "Loading…";

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <WatermarkBackground />
      <LinearGradient
        colors={["#2F6FE0", "#1A3D8F"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.header, { paddingTop: insets.top + 10 }]}
      >
        <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <View style={styles.avatar}>
          {profile?.photo_url ? (
            <Image source={{ uri: profile.photo_url }} style={styles.avatarImage} />
          ) : (
            <Text style={styles.avatarText}>{initialsFromName(headerName)}</Text>
          )}
        </View>
        <View style={styles.headerTextWrap}>
          <Text style={styles.title} numberOfLines={1}>
            {headerName}
          </Text>
          <Text style={styles.subtitle}>{headerSubtitle}</Text>
        </View>
      </LinearGradient>

      {loading && (
        <View style={styles.content}>
          <SkeletonDetailBlock style={{ marginBottom: 16 }} />
          <SkeletonListRows count={4} />
        </View>
      )}

      {!loading && error && (
        <View style={styles.centerState}>
          <Ionicons name="cloud-offline-outline" size={28} color="#B0B7C3" />
          <Text style={styles.centerStateText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => setReloadToken((n) => n + 1)} activeOpacity={0.8}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      {!loading && !error && profile && (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <Section
            title="Academic"
            rows={[
              { label: "Department", value: profile.department ? `${profile.department.name} (${profile.department.code})` : null },
              { label: "Programme", value: profile.programme },
              { label: "Batch", value: profile.batch },
              { label: "Section", value: profile.section },
              { label: "Semester", value: profile.semester },
              { label: "Status", value: humanize(profile.status) },
              { label: "Admission no", value: profile.admission_no },
              { label: "Admission date", value: formatDateSafe(profile.admission_date) },
              { label: "Admission type", value: humanize(profile.admission_type) },
              { label: "Admission quota", value: humanize(profile.admission_quota) },
              { label: "Class advisor", value: profile.class_advisor },
              { label: "Faculty mentor", value: profile.faculty_mentor },
            ]}
          />

          <Section
            title="Personal details"
            rows={[
              { label: "Gender", value: humanize(profile.gender) },
              { label: "Date of birth", value: formatDateSafe(profile.date_of_birth) },
              { label: "Blood group", value: profile.blood_group },
              { label: "Mother tongue", value: profile.mother_tongue },
              { label: "Community", value: profile.community },
              { label: "Nationality", value: profile.nationality },
              { label: "Religion", value: profile.religion },
              { label: "Caste", value: profile.caste },
              { label: "First graduate", value: profile.is_first_graduate ? "Yes" : "No" },
              { label: "Differently abled", value: profile.is_diff_abled ? "Yes" : "No" },
              ...(profile.is_diff_abled ? [{ label: "Disability details", value: profile.diff_abled_info }] : []),
              { label: "Aadhaar number", value: profile.aadhar_number },
              { label: "PAN number", value: profile.pan_number },
              { label: "Passport number", value: profile.passport_number },
              ...profile.identity_marks.map((mark, i) => ({
                label: `Identity mark ${i + 1}`,
                value: [mark.number, mark.description].filter(Boolean).join(" — ") || null,
              })),
            ]}
          />

          <Section
            title="Contact"
            rows={[
              { label: "Institute email", value: profile.institute_email },
              { label: "Personal email", value: profile.personal_email },
              { label: "Alternate email", value: profile.alternate_email },
              { label: "Mobile", value: profile.mobile },
            ]}
          />

          <SubCardSection
            title="Addresses"
            items={profile.addresses.map((addr, i) => ({
              heading: addr.type ? humanize(addr.type) ?? `Address ${i + 1}` : `Address ${i + 1}`,
              rows: [
                { label: "Line", value: addr.line },
                { label: "City", value: addr.city },
                { label: "District", value: addr.district },
                { label: "State", value: addr.state },
                { label: "Pincode", value: addr.pincode },
              ],
            }))}
          />

          <SubCardSection
            title="Family"
            items={[
              ...(profile.family?.father ? [{ heading: "Father", rows: familyRows(profile.family.father) }] : []),
              ...(profile.family?.mother ? [{ heading: "Mother", rows: familyRows(profile.family.mother) }] : []),
              ...(profile.family?.guardian ? [{ heading: "Guardian", rows: familyRows(profile.family.guardian) }] : []),
            ]}
          />

          <Section
            title="Academic performance"
            rows={[
              { label: "Overall GPA", value: profile.overall_gpa !== null ? profile.overall_gpa.toFixed(2) : null },
              { label: "Overall percentage", value: profile.overall_percentage !== null ? `${profile.overall_percentage}%` : null },
              ...profile.gpa_history.map((g) => ({
                label: `Semester ${g.semester}`,
                value: `GPA ${g.gpa !== null ? g.gpa.toFixed(2) : "—"} · Credits ${g.credits} · Arrears ${g.arrears}`,
              })),
              ...profile.current_semester_subjects.map((s) => ({
                label: `${s.name} (${s.code})`,
                value: `Int ${s.internal ?? "—"} / Ext ${s.external ?? "—"} / Total ${s.total} · ${s.grade}`,
              })),
            ]}
          />

          <Section
            title="Attendance"
            rows={[
              { label: "Overall attendance", value: profile.overall_attendance_pct !== null ? `${profile.overall_attendance_pct}%` : null },
              ...profile.monthly_attendance.map((m) => ({ label: m.month, value: `${m.pct}%` })),
            ]}
          />

          <Section
            title="Fees"
            rows={[
              { label: "Total demand", value: formatCurrency(profile.fees.total_demand) },
              { label: "Total paid", value: formatCurrency(profile.fees.total_paid) },
              { label: "Status", value: humanize(profile.fees.status) },
              ...profile.fee_ledger.map((f) => ({
                label: [f.name, f.academic_year, f.semester !== null ? `Sem ${f.semester}` : null].filter(Boolean).join(" · "),
                value: `${formatCurrency(f.paid_amount)} / ${formatCurrency(f.total_amount)} · ${humanize(f.status)}`,
              })),
            ]}
          />

          <Section
            title="Hostel"
            rows={
              profile.hostel
                ? [
                    { label: "Room number", value: profile.hostel.room_number },
                    { label: "Block", value: profile.hostel.block },
                    { label: "Allocated on", value: formatDateSafe(profile.hostel.allocated_date) },
                  ]
                : []
            }
          />

          <Section
            title="Transport"
            rows={profile.transport ? [{ label: "Route", value: `Route #${profile.transport.route_id}` }] : []}
          />

          <Section
            title="Documents"
            rows={profile.documents.map((doc) => ({
              label: doc.name,
              value: doc.available
                ? doc.verified_at
                  ? `Available · verified ${formatDateSafe(doc.verified_at)}`
                  : "Available"
                : "Not available",
            }))}
          />

          <Section
            title="Scholarships"
            rows={profile.scholarships.map((s) => ({
              label: s.scheme,
              value: [formatCurrency(s.amount), s.awarded_at ? `awarded ${formatDateSafe(s.awarded_at)}` : null]
                .filter(Boolean)
                .join(" · "),
            }))}
          />

          <Section
            title="Achievements"
            rows={profile.achievements.map((a) => ({
              label: a.label,
              value: [a.date ? formatDateSafe(a.date) : null, humanize(a.source)].filter(Boolean).join(" · "),
            }))}
          />

          <Section
            title="Discipline"
            rows={[
              {
                label: "Incidents",
                value: profile.discipline.incident_count > 0 ? `${profile.discipline.incident_count} incidents on file` : "No incidents on file",
              },
            ]}
          />

          <Section
            title="Placement"
            rows={profile.placement.map((p) => ({
              label: p.company,
              value: [humanize(p.status), humanize(p.offer_response), formatCurrency(p.offered_package)]
                .filter(Boolean)
                .join(" · "),
            }))}
          />

          <Section
            title="Other"
            rows={[
              { label: "Cutoff - Physics", value: profile.pre_admission?.cutoff_physics ?? null },
              { label: "Cutoff - Chemistry", value: profile.pre_admission?.cutoff_chemistry ?? null },
              { label: "Cutoff - Maths", value: profile.pre_admission?.cutoff_maths ?? null },
              { label: "Books issued", value: profile.library.books_issued > 0 ? profile.library.books_issued : null },
              { label: "Meeting notes on file", value: profile.meeting_notes.length > 0 ? profile.meeting_notes.length : null },
            ]}
          />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function familyRows(member: {
  name: string | null;
  qualification?: string | null;
  occupation?: string | null;
  annual_income?: number | null;
  email: string | null;
  mobile: string | null;
}): Row[] {
  return [
    { label: "Name", value: member.name },
    { label: "Qualification", value: member.qualification },
    { label: "Occupation", value: member.occupation },
    { label: "Annual income", value: formatCurrency(member.annual_income) },
    { label: "Email", value: member.email },
    { label: "Mobile", value: member.mobile },
  ];
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
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarImage: { width: 48, height: 48, borderRadius: 24 },
  avatarText: { fontSize: 16, fontFamily: fonts.bold, color: "#fff" },
  headerTextWrap: { flex: 1 },
  title: { fontSize: 16, fontFamily: fonts.bold, color: "#fff" },
  subtitle: { fontSize: 11, fontFamily: fonts.regular, color: "#D7E2FA", marginTop: 2 },
  content: { padding: 16, paddingBottom: 40 },
  centerState: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10, paddingHorizontal: 32 },
  centerStateText: { fontSize: 13, fontFamily: fonts.medium, color: "#9AA6B2", textAlign: "center" },
  retryButton: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10, backgroundColor: "#2F6FE0", marginTop: 4 },
  retryButtonText: { fontSize: 13, fontFamily: fonts.semibold, color: "#fff" },
  sectionWrap: { marginBottom: 18 },
  sectionTitle: { fontSize: 13, fontFamily: fonts.bold, color: "#111827", marginBottom: 8 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#EEF0F4",
    padding: 14,
  },
  subCardHeading: { fontSize: 12, fontFamily: fonts.bold, color: "#2F6FE0", marginBottom: 4 },
  detailLine: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
    paddingVertical: 8,
  },
  detailLineDivider: { borderTopWidth: 1, borderTopColor: "#F1F3F6" },
  detailLabel: { fontSize: 12, fontFamily: fonts.medium, color: "#9AA6B2", flexShrink: 0 },
  detailValue: { flex: 1, fontSize: 13, fontFamily: fonts.semibold, color: "#111827", textAlign: "right" },
});
