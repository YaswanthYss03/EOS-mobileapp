import { useCallback, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { CollegeHeader } from "@/components/layout/CollegeHeader";
import { fonts } from "@/theme";
import { mockDrives, placementStats, type Drive } from "./data/mockDrives";
import { mockPlaced, type PlacedStudent } from "./data/mockPlaced";
import { mockTraining, type TrainingProgramme } from "./data/mockTraining";
import { mockBatchHistory, type BatchRecord } from "./data/mockBatchHistory";

type PlacementTab = "drives" | "placed" | "training" | "history";

const TABS: { id: PlacementTab; label: string }[] = [
  { id: "drives", label: "Drives" },
  { id: "placed", label: "Placed" },
  { id: "training", label: "Training" },
  { id: "history", label: "History" },
];

const SECTION_FILTERS = ["All", "CSE-A", "CSE-B", "CSE-C"];

function PlacementsHeader({ onBack }: { onBack: () => void }) {
  const insets = useSafeAreaInsets();

  return (
    <LinearGradient
      colors={["#2F6FE0", "#1A3D8F"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.header, { paddingTop: insets.top + 10 }]}
    >
      <TouchableOpacity
        onPress={onBack}
        style={styles.backButton}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Ionicons name="arrow-back" size={20} color="#fff" />
      </TouchableOpacity>
      <View>
        <Text style={styles.headerTitle}>Placements</Text>
        <Text style={styles.headerSubtitle}>CSE · batch 2026</Text>
      </View>
    </LinearGradient>
  );
}

// TODO: view-only - replace mockDrives/mockHistory with real placement backend
// calls once they exist. Placed and Training don't have a data model yet.
export function PlacementsOverviewScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const [tab, setTab] = useState<PlacementTab>("drives");

  useFocusEffect(
    useCallback(() => {
      navigation.getParent()?.setOptions({
        header: () => <PlacementsHeader onBack={() => router.back()} />,
      });
      return () => {
        navigation.getParent()?.setOptions({ header: () => <CollegeHeader /> });
      };
    }, [navigation, router]),
  );

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <View style={styles.tabRow}>
        {TABS.map((t) => (
          <TouchableOpacity
            key={t.id}
            style={[styles.tabPill, tab === t.id && styles.tabPillActive]}
            onPress={() => setTab(t.id)}
          >
            <Text style={[styles.tabPillText, tab === t.id && styles.tabPillTextActive]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.statsRow}>
          <StatCard value={String(mockDrives.length)} label="Active drives" />
          <StatCard value={String(placementStats.studentsPlaced)} label="Students placed" />
          <StatCard value={`${placementStats.placementRate}%`} label="Placement rate" />
          <StatCard value={placementStats.highestCtc} label="Highest CTC" />
        </View>

        {tab === "drives" && <DrivesTab />}
        {tab === "placed" && <PlacedTab />}
        {tab === "training" && <TrainingTab />}
        {tab === "history" && <HistoryTab />}
      </ScrollView>
    </SafeAreaView>
  );
}

function DrivesTab() {
  return (
    <View>
      <Text style={styles.sectionTitle}>Drive details</Text>
      {mockDrives.map((drive) => (
        <DriveCard key={drive.id} drive={drive} />
      ))}
    </View>
  );
}

function PlacedTab() {
  const [section, setSection] = useState("All");
  const students = section === "All" ? mockPlaced : mockPlaced.filter((s) => s.section === section);

  return (
    <View>
      <View style={styles.tabRowInline}>
        {SECTION_FILTERS.map((s) => (
          <TouchableOpacity
            key={s}
            style={[styles.tabPill, section === s && styles.tabPillActive]}
            onPress={() => setSection(s)}
          >
            <Text style={[styles.tabPillText, section === s && styles.tabPillTextActive]}>{s}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {students.map((student) => (
        <PlacedCard key={student.id} student={student} />
      ))}

      {students.length === 0 && <ComingSoon icon="ribbon-outline" text="No placements in this section yet." />}
    </View>
  );
}

function PlacedCard({ student }: { student: PlacedStudent }) {
  const accepted = student.status === "Offer accepted";

  return (
    <View style={styles.driveCard}>
      <View style={styles.driveHeader}>
        <View style={styles.placedAvatar}>
          <Text style={styles.avatarText}>{initialsFromName(student.name)}</Text>
        </View>
        <View style={styles.driveHeaderText}>
          <Text style={styles.company}>{student.name}</Text>
          <Text style={styles.roleLine}>
            {student.rollNo} · {student.section} · CGPA {student.cgpa}
          </Text>
        </View>
        <View style={styles.placedMeta}>
          <Text style={styles.placedPackage}>{student.package}</Text>
          <Text style={styles.appliedOn}>{student.placedOn}</Text>
        </View>
      </View>

      <View style={styles.divider} />

      <View style={styles.footerRow}>
        <Text style={styles.roundsText}>
          {student.company} · {student.role}
        </Text>
        <View style={[styles.statusBadge, !accepted && styles.statusBadgeNeutral]}>
          <Text style={[styles.statusBadgeText, !accepted && styles.statusBadgeTextNeutral]}>{student.status}</Text>
        </View>
      </View>
    </View>
  );
}

// Names are "A. Karthikeyan" / "R. Bala Krishnan" style - initial + first name -> "AK" / "RB".
function initialsFromName(name: string) {
  const [first, second] = name.split(/\s+/);
  return `${first.charAt(0)}${second?.charAt(0) ?? ""}`.toUpperCase();
}

function TrainingTab() {
  return (
    <View>
      <Text style={styles.sectionTitle}>Training programmes</Text>
      {mockTraining.map((programme) => (
        <TrainingCard key={programme.id} programme={programme} />
      ))}
    </View>
  );
}

function TrainingCard({ programme }: { programme: TrainingProgramme }) {
  const percent = Math.round((programme.completedSessions / programme.totalSessions) * 100);

  return (
    <View style={styles.driveCard}>
      <View style={styles.trainingHeader}>
        <Text style={styles.trainingTitle}>{programme.title}</Text>
        <View style={styles.statusBadge}>
          <Text style={styles.statusBadgeText}>{programme.status}</Text>
        </View>
      </View>
      <Text style={styles.roleLine}>
        {programme.conductedBy} · {programme.schedule}
      </Text>

      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${percent}%` }]} />
      </View>

      <View style={styles.footerRow}>
        <Text style={styles.roundsText}>
          {programme.completedSessions} of {programme.totalSessions} sessions
        </Text>
        <Text style={styles.studentListLink}>{percent}%</Text>
      </View>
    </View>
  );
}

function StatCard({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function DriveCard({ drive }: { drive: Drive }) {
  return (
    <View style={styles.driveCard}>
      <View style={styles.driveHeader}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{drive.initials}</Text>
        </View>
        <View style={styles.driveHeaderText}>
          <Text style={styles.company}>{drive.company}</Text>
          <Text style={styles.roleLine}>
            {drive.role} · {drive.package}
          </Text>
        </View>
        <View style={styles.statusBadge}>
          <Text style={styles.statusBadgeText}>{drive.status}</Text>
        </View>
      </View>

      <View style={styles.chipRow}>
        <Chip text={drive.driveDate} />
        <Chip text={drive.mode} />
        <Chip text={drive.minCgpa} />
        <Chip text={drive.arrearsRule} />
      </View>

      <View style={styles.miniStatsRow}>
        <MiniStat value={String(drive.eligible)} label="Eligible" />
        <MiniStat value={String(drive.applied)} label="Applied" />
        <MiniStat value={drive.selected === null ? "—" : String(drive.selected)} label="Selected" />
      </View>

      <View style={styles.divider} />

      <View style={styles.footerRow}>
        <Text style={styles.roundsText}>Rounds: {drive.rounds}</Text>
        <Text style={styles.studentListLink}>Student list</Text>
      </View>
    </View>
  );
}

function Chip({ text }: { text: string }) {
  return (
    <View style={styles.chip}>
      <Text style={styles.chipText}>{text}</Text>
    </View>
  );
}

function MiniStat({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.miniStat}>
      <Text style={styles.miniStatValue}>{value}</Text>
      <Text style={styles.miniStatLabel}>{label}</Text>
    </View>
  );
}

function ComingSoon({ icon, text }: { icon: keyof typeof Ionicons.glyphMap; text: string }) {
  return (
    <View style={styles.comingSoon}>
      <Ionicons name={icon} size={32} color="#B0B7C3" />
      <Text style={styles.comingSoonText}>{text}</Text>
    </View>
  );
}

function HistoryTab() {
  return (
    <View>
      <Text style={styles.sectionTitle}>Batch-wise record</Text>
      {mockBatchHistory.map((record) => (
        <BatchCard key={record.id} record={record} />
      ))}
    </View>
  );
}

function BatchCard({ record }: { record: BatchRecord }) {
  return (
    <View style={styles.driveCard}>
      <View style={styles.trainingHeader}>
        <Text style={styles.trainingTitle}>Batch {record.year}</Text>
        <View style={styles.rateBadge}>
          <Text style={styles.rateBadgeText}>{record.placementRate}% placed</Text>
        </View>
      </View>

      <View style={styles.miniStatsRow}>
        <MiniStat value={String(record.drives)} label="Drives" />
        <MiniStat value={String(record.placed)} label="Placed" />
        <MiniStat value={record.avgCtc} label="Avg CTC" />
      </View>

      <View style={styles.divider} />

      <View style={styles.footerRow}>
        <Text style={styles.roundsText}>
          Top offer · {record.topOfferCompany} · {record.topOfferPackage}
        </Text>
        <Text style={styles.studentListLink}>Report</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
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
  tabRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F3F6",
  },
  tabPill: {
    borderRadius: 999,
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  tabPillActive: {
    backgroundColor: "#2F6FE0",
    borderColor: "#2F6FE0",
  },
  tabPillText: {
    fontSize: 13,
    fontFamily: fonts.semibold,
    color: "#4B5563",
  },
  tabPillTextActive: {
    color: "#fff",
  },
  tabRowInline: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 14,
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  statsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 20,
  },
  statCard: {
    flexGrow: 1,
    minWidth: "22%",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#EEF0F4",
    paddingVertical: 14,
    paddingHorizontal: 8,
    alignItems: "center",
    gap: 4,
  },
  statValue: {
    fontSize: 18,
    fontFamily: fonts.bold,
    color: "#2F6FE0",
  },
  statLabel: {
    fontSize: 9,
    fontFamily: fonts.bold,
    color: "#9AA6B2",
    letterSpacing: 0.5,
    textTransform: "uppercase",
    textAlign: "center",
  },
  sectionTitle: {
    fontSize: 12,
    fontFamily: fonts.bold,
    color: "#8A93A3",
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 12,
  },
  driveCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#EEF0F4",
    padding: 14,
    marginBottom: 14,
  },
  driveHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    marginBottom: 12,
  },
  trainingHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 10,
    marginBottom: 4,
  },
  trainingTitle: {
    flex: 1,
    fontSize: 16,
    fontFamily: fonts.bold,
    color: "#111827",
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: "#EAF0FD",
    marginTop: 14,
    marginBottom: 10,
  },
  progressFill: {
    height: 6,
    borderRadius: 3,
    backgroundColor: "#2F6FE0",
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#EAF0FD",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: 14,
    fontFamily: fonts.bold,
    color: "#2F6FE0",
  },
  placedAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#EAF0FD",
    alignItems: "center",
    justifyContent: "center",
  },
  driveHeaderText: {
    flex: 1,
  },
  placedMeta: {
    alignItems: "flex-end",
  },
  placedPackage: {
    fontSize: 15,
    fontFamily: fonts.bold,
    color: "#2F6FE0",
  },
  company: {
    fontSize: 16,
    fontFamily: fonts.bold,
    color: "#111827",
  },
  roleLine: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: "#8A93A3",
    marginTop: 2,
  },
  statusBadge: {
    backgroundColor: "#EAF0FD",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  statusBadgeText: {
    fontSize: 11,
    fontFamily: fonts.bold,
    color: "#2F6FE0",
  },
  statusBadgeNeutral: {
    backgroundColor: "#F1F3F6",
  },
  statusBadgeTextNeutral: {
    color: "#6B7280",
  },
  rateBadge: {
    backgroundColor: "#2F6FE0",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  rateBadgeText: {
    fontSize: 12,
    fontFamily: fonts.bold,
    color: "#fff",
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 12,
  },
  chip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  chipText: {
    fontSize: 11,
    fontFamily: fonts.medium,
    color: "#4B5563",
  },
  miniStatsRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 12,
  },
  miniStat: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#EEF0F4",
    paddingVertical: 12,
    alignItems: "center",
    gap: 2,
  },
  miniStatValue: {
    fontSize: 15,
    fontFamily: fonts.bold,
    color: "#111827",
  },
  miniStatLabel: {
    fontSize: 9,
    fontFamily: fonts.bold,
    color: "#9AA6B2",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  divider: {
    height: 1,
    backgroundColor: "#F1F3F6",
    marginBottom: 10,
  },
  footerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  roundsText: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: "#8A93A3",
    flex: 1,
    marginRight: 8,
  },
  studentListLink: {
    fontSize: 13,
    fontFamily: fonts.bold,
    color: "#2F6FE0",
  },
  appliedOn: {
    fontSize: 11,
    fontFamily: fonts.regular,
    color: "#9AA6B2",
    marginTop: 2,
    marginBottom: 10,
  },
  comingSoon: {
    alignItems: "center",
    paddingVertical: 60,
    gap: 8,
  },
  comingSoonText: {
    fontSize: 13,
    fontFamily: fonts.medium,
    color: "#9AA6B2",
    textAlign: "center",
  },
});
