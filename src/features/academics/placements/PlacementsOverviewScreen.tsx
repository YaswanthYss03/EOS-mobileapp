import { useCallback, useEffect, useMemo, useState, type RefObject } from "react";
import { View, Text, ScrollView, TouchableOpacity, TextInput, StyleSheet } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { CollegeHeader } from "@/components/layout/CollegeHeader";
import { WatermarkBackground } from "@/components/layout/WatermarkBackground";
import { SkeletonListRows, SkeletonStatCards } from "@/components/ui/Skeleton";
import { AnchoredDropdown, useDropdown } from "@/components/ui/dropdown";
import { AnimatedTabBar, TabTransitionView, useTabScrollMemory } from "@/components/ui/tabs";
import { fonts } from "@/theme";
import { formatDate } from "@/utils/calendar";
import { toast } from "@/utils/toast";
import { useRole } from "@/hooks/useRole";
import { useSkipSharedHeaderToggle } from "@/hooks/useSkipSharedHeaderToggle";
import {
  getUpcomingDrives,
  getDriveHistory,
  searchInstitutionUpcomingDrives,
  searchInstitutionDriveHistory,
  getPlacementBatches,
  type UpcomingDrive,
  type DriveHistoryItem,
  type ApplicationStatus,
  type InstitutionUpcomingDrive,
  type InstitutionDriveHistoryItem,
  type PlacementBatch,
} from "@/services/api/placements.api";
import {
  getInstitutionClasses,
  type InstitutionClass,
  type InstitutionDirectoryFilters,
} from "@/services/api/institution-directory.api";
import {
  getUpcomingDrivesForFaculty,
  getMentoredStudents,
  getDepartmentStudents,
  getDepartmentClasses,
  type UpcomingDrive as FacultyUpcomingDrive,
  type MentoredStudent,
  type DepartmentClass,
} from "@/services/api/faculty-placements.api";
import { listDepartments, type Department } from "@/services/api/departments.api";
import {
  getPrincipalPlacementsOverview,
  type PrincipalPlacementsOverview,
} from "@/services/api/principal-placements.api";
import { getApiErrorMessage } from "@/services/api/client";
import { TodoTabBody } from "./TodoTabBody";

type PlacementTab = "upcoming" | "history" | "todo";

// "Round N cleared" comes straight from drive_application_status_enum
// (applied/r1_cleared/r2_cleared/r3_cleared/rejected/placed) - the schema
// has no named-round checklist (no "Online assessment"/"Technical
// interview"/etc.), just this one coarse per-drive status, so that's the
// most detail a status can ever show.
const APPLICATION_STATUS_META: Record<ApplicationStatus, { label: string; bg: string; text: string }> = {
  applied: { label: "Applied", bg: "#EAF0FD", text: "#2F6FE0" },
  r1_cleared: { label: "Round 1 cleared", bg: "#FEF3C7", text: "#D97706" },
  r2_cleared: { label: "Round 2 cleared", bg: "#FEF3C7", text: "#D97706" },
  r3_cleared: { label: "Round 3 cleared", bg: "#FEF3C7", text: "#D97706" },
  placed: { label: "Offer", bg: "#F0FDF4", text: "#16A34A" },
  rejected: { label: "Rejected", bg: "#FEF2F2", text: "#DC2626" },
};

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
      <Text style={styles.headerTitle}>Placements</Text>
    </LinearGradient>
  );
}

// Wired to EOS-backend's placement/drives module - see
// @/services/api/placements.api.ts (student's own self-service view) and
// @/services/api/faculty-placements.api.ts (faculty/HoD mentor view).
// Reachable from the Academics tab's chooser for every role; branches on
// useRole() since a student and a faculty/HoD mentor need genuinely
// different data here - a student has their own application outcome to
// track, a mentor has none (they're not an applicant) but instead needs to
// see students' histories. Faculty and HoD share the exact same UI (the
// "History" tab is just "pick a student, see their placement history") -
// only which students they can pick from differs: a faculty mentor sees
// their own mentored classes, a HoD sees every class in their department.
export function PlacementsOverviewScreen() {
  const role = useRole();
  const router = useRouter();
  const navigation = useNavigation();
  // HoD's Student/Faculty tabs keep the shared Tabs header statically off
  // too (see app/(tabs)/_layout.tsx's isHodActingAsHod, alongside Class
  // Advisor's isAdvisorOnly) - this screen renders its own PlacementsHeader
  // inline instead of claiming the parent header for either case, so
  // there's nothing to toggle back on blur (an unconditional reset there
  // was leaking a stale headerShown:true onto whichever tab-root screen the
  // HoD navigated back to - see useSkipSharedHeaderToggle's own comment).
  const skipHeaderToggle = useSkipSharedHeaderToggle();

  const onBack = () =>
    role === "employee" || role === "hod" ? router.replace("/(tabs)/erp") : router.back();

  // Principal/Correspondent manage their own header (own back button +
  // dynamic season subtitle, see PrincipalPlacementsBody) instead of this
  // shared gradient one - skip claiming the parent header here so the two
  // don't race.
  useFocusEffect(
    useCallback(() => {
      if (skipHeaderToggle || role === "principal" || role === "correspondent") return undefined;
      navigation.getParent()?.setOptions({
        headerShown: true,
        // A faculty member reaches this via the Class tab's own Campus grid
        // (a separate tab's Stack) - see TimetableScreen's identical
        // comment for why router.back() alone isn't reliable there. A
        // student has their own dedicated Campus tab instead (this screen's
        // own Stack, via the Academics chooser), where router.back()
        // correctly pops back to Edu.
        header: () => <PlacementsHeader onBack={onBack} />,
      });
      return () => {
        navigation.getParent()?.setOptions({
          headerShown: true,
          header: () => <CollegeHeader />,
        });
      };
    }, [navigation, role, skipHeaderToggle]),
  );

  const body =
    role === "student" ? (
      <StudentPlacementsBody />
    ) : role === "principal" || role === "correspondent" ? (
      <PrincipalPlacementsBody />
    ) : role === "hod" ? (
      <MentorPlacementsBody
        fetchStudents={getDepartmentStudents}
        emptyStudentsText="No classes have been assigned to your department yet."
        classPicker
        hodFilters
      />
    ) : (
      <MentorPlacementsBody fetchStudents={getMentoredStudents} emptyStudentsText="You aren't mentoring any class yet." />
    );

  if (!skipHeaderToggle) return body;
  return (
    <View style={{ flex: 1 }}>
      <PlacementsHeader onBack={onBack} />
      {body}
    </View>
  );
}

// ───────────────────────────── Student body ─────────────────────────────

function StudentPlacementsBody() {
  const [tab, setTab] = useState<PlacementTab>("upcoming");
  const scrollMemory = useTabScrollMemory();

  const [upcoming, setUpcoming] = useState<UpcomingDrive[] | null>(null);
  const [upcomingLoading, setUpcomingLoading] = useState(true);
  const [upcomingErrored, setUpcomingErrored] = useState(false);
  const [upcomingReloadToken, setUpcomingReloadToken] = useState(0);

  const [history, setHistory] = useState<DriveHistoryItem[] | null>(null);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyErrored, setHistoryErrored] = useState(false);
  const [historyReloadToken, setHistoryReloadToken] = useState(0);

  useEffect(() => {
    setUpcomingLoading(true);
    setUpcomingErrored(false);
    getUpcomingDrives()
      .then(setUpcoming)
      .catch(() => setUpcomingErrored(true))
      .finally(() => setUpcomingLoading(false));
  }, [upcomingReloadToken]);

  useEffect(() => {
    setHistoryLoading(true);
    setHistoryErrored(false);
    getDriveHistory()
      .then(setHistory)
      .catch(() => setHistoryErrored(true))
      .finally(() => setHistoryLoading(false));
  }, [historyReloadToken]);

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <View style={styles.content}>
        <TabSwitch tab={tab} setTab={setTab} showTodo />

        {/* Bug fix: TabTransitionView's slide/fade animation was leaving the
            Todo tab's content stuck invisible for students - switched to a
            plain instant swap for this tab switcher only (Mentor/Principal
            keep their existing animated one below, unaffected). */}
        <View style={styles.tabContent}>
          {tab === "upcoming" ? (
            <ScrollView
              contentContainerStyle={styles.list}
              showsVerticalScrollIndicator={false}
              {...scrollMemory.bind("upcoming")}
            >
              {upcomingLoading ? (
                <LoadingState />
              ) : upcomingErrored ? (
                <ErrorState onRetry={() => setUpcomingReloadToken((n) => n + 1)} />
              ) : upcoming && upcoming.length > 0 ? (
                upcoming.map((drive) => <StudentUpcomingCard key={drive.drive_id} drive={drive} />)
              ) : (
                <EmptyState icon="briefcase-outline" text="No drives coming up right now." />
              )}
            </ScrollView>
          ) : tab === "history" ? (
            <ScrollView
              contentContainerStyle={styles.list}
              showsVerticalScrollIndicator={false}
              {...scrollMemory.bind("history")}
            >
              {historyLoading ? (
                <LoadingState />
              ) : historyErrored ? (
                <ErrorState onRetry={() => setHistoryReloadToken((n) => n + 1)} />
              ) : history && history.length > 0 ? (
                history.map((item) => <HistoryCard key={item.drive_id} item={item} />)
              ) : (
                <EmptyState icon="document-text-outline" text="No placement history yet." />
              )}
            </ScrollView>
          ) : (
            <ScrollView
              contentContainerStyle={styles.list}
              showsVerticalScrollIndicator={false}
              {...scrollMemory.bind("todo")}
            >
              <TodoTabBody />
            </ScrollView>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

function StudentUpcomingCard({ drive }: { drive: UpcomingDrive }) {
  const meta = APPLICATION_STATUS_META[drive.application_status];

  return (
    <View style={[styles.card, !drive.is_disclosed && styles.cardUndisclosed]}>
      <View style={styles.cardHeaderRow}>
        <View style={styles.cardHeader}>
          {!drive.is_disclosed && <Ionicons name="lock-closed" size={14} color="#8A93A3" />}
          <Text style={[styles.company, !drive.is_disclosed && styles.companyUndisclosed]}>{drive.company_name}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: meta.bg }]}>
          <Text style={[styles.statusBadgeText, { color: meta.text }]}>{meta.label}</Text>
        </View>
      </View>

      <View style={styles.metaRow}>
        <Ionicons name="calendar-outline" size={13} color="#8A93A3" />
        <Text style={styles.metaText}>Drive on {formatDate(new Date(drive.scheduled_date))}</Text>
      </View>

      {drive.is_disclosed && drive.company_profile_info && (
        <Text style={styles.profileInfo}>{drive.company_profile_info}</Text>
      )}

      {!drive.is_disclosed && (
        <Text style={styles.revealHint}>
          {drive.disclosed_reveal_date
            ? `Company name reveals on ${formatDate(new Date(drive.disclosed_reveal_date))}`
            : "Company name will be revealed closer to the drive date."}
        </Text>
      )}
    </View>
  );
}

// A rejection overwrites application_status, but last_cleared_round is
// tracked separately and survives it - so a student rejected after
// clearing a round gets to see that progress, not just a flat "Rejected".
function historyStatusLabel(item: DriveHistoryItem): string {
  const base = APPLICATION_STATUS_META[item.application_status].label;
  if (item.application_status === "rejected" && item.last_cleared_round) {
    return `Round ${item.last_cleared_round} cleared · ${base}`;
  }
  return base;
}

function HistoryCard({ item }: { item: DriveHistoryItem }) {
  const meta = APPLICATION_STATUS_META[item.application_status];

  return (
    <View style={styles.card}>
      <View style={styles.cardHeaderRow}>
        <Text style={styles.company}>{item.company_name}</Text>
        <View style={[styles.statusBadge, { backgroundColor: meta.bg }]}>
          <Text style={[styles.statusBadgeText, { color: meta.text }]}>{historyStatusLabel(item)}</Text>
        </View>
      </View>

      <View style={styles.metaRow}>
        <Ionicons name="calendar-outline" size={13} color="#8A93A3" />
        <Text style={styles.metaText}>Drive on {formatDate(new Date(item.scheduled_date))}</Text>
      </View>
    </View>
  );
}

// ───────────────────────────── Principal (any department) body ─────────────────────────────

// Unlike the HoD's own department (self-scoped, resolved server-side from
// their faculty row), a Principal can view every department - so this picks
// one via a dropdown first, then shows the exact same upcoming/history split
// as the student view, aggregated across every student in that department
// at once (each card additionally shows which student it belongs to). See
// EOS-backend's getUpcomingForDepartment/getHistoryForDepartment.
function PrincipalPlacementsBody() {
  const router = useRouter();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  // This body renders its own header below, so hide the shared header
  // (CollegeHeader / the gradient PlacementsHeader other roles use) while
  // it's focused. No cleanup on blur - this screen pushes into a per-student
  // history detail (StudentPlacementHistoryScreen, further down this file),
  // which only ever sets `header:` on its own focus and never touches
  // headerShown - if this screen's blur cleanup raced that focus effect
  // (undefined ordering between siblings in the same Stack), headerShown
  // could get stuck true, showing both headers at once (see
  // PrincipalStudentsScreen.tsx in erp/principal/students for the identical
  // bug and fix this mirrors).
  useFocusEffect(
    useCallback(() => {
      navigation.getParent()?.setOptions({ headerShown: false });
      return undefined;
    }, [navigation]),
  );

  const [overview, setOverview] = useState<PrincipalPlacementsOverview | null>(null);
  const [overviewError, setOverviewError] = useState<string | null>(null);
  const [overviewLoading, setOverviewLoading] = useState(true);

  const loadOverview = useCallback(() => {
    setOverviewLoading(true);
    setOverviewError(null);
    getPrincipalPlacementsOverview()
      .then(setOverview)
      .catch((err) => setOverviewError(getApiErrorMessage(err, "Couldn't load the placements overview.")))
      .finally(() => setOverviewLoading(false));
  }, []);

  useEffect(() => {
    loadOverview();
  }, [loadOverview]);

  const scrollMemory = useTabScrollMemory();
  const [tab, setTab] = useState<PlacementTab>("upcoming");

  // Search + Batch/Department/Class filter row (replaces the old single
  // "pick a department first" gate) - every field optional and combinable,
  // same InstitutionDirectoryFilters shape shared with the Higher Education
  // and Entrepreneur directory screens. See searchInstitutionUpcomingDrives/
  // searchInstitutionDriveHistory in placements.api.ts.
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), 350);
    return () => clearTimeout(timer);
  }, [search]);

  const [batches, setBatches] = useState<PlacementBatch[]>([]);
  const [selectedBatch, setSelectedBatch] = useState<PlacementBatch | null>(null);
  const {
    anchorRef: batchAnchorRef,
    visible: batchPickerOpen,
    open: openBatchPicker,
    close: closeBatchPicker,
  } = useDropdown();

  const [departments, setDepartments] = useState<Department[]>([]);
  const [selectedDepartment, setSelectedDepartment] = useState<Department | null>(null);
  const {
    anchorRef: departmentAnchorRef,
    visible: departmentPickerOpen,
    open: openDepartmentPicker,
    close: closeDepartmentPicker,
  } = useDropdown();

  const [classes, setClasses] = useState<InstitutionClass[]>([]);
  const [selectedClass, setSelectedClass] = useState<InstitutionClass | null>(null);
  const {
    anchorRef: classAnchorRef,
    visible: classPickerOpen,
    open: openClassPicker,
    close: closeClassPicker,
  } = useDropdown();

  const [upcoming, setUpcoming] = useState<InstitutionUpcomingDrive[] | null>(null);
  const [upcomingLoading, setUpcomingLoading] = useState(true);
  const [upcomingErrored, setUpcomingErrored] = useState(false);
  const [upcomingReloadToken, setUpcomingReloadToken] = useState(0);

  const [history, setHistory] = useState<InstitutionDriveHistoryItem[] | null>(null);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyErrored, setHistoryErrored] = useState(false);
  const [historyReloadToken, setHistoryReloadToken] = useState(0);

  useEffect(() => {
    getPlacementBatches()
      .then(setBatches)
      .catch(() => toast.error("Couldn't load the batch list"));
  }, []);

  useEffect(() => {
    listDepartments()
      .then(setDepartments)
      .catch(() => toast.error("Couldn't load the department list"));
  }, []);

  // Class dropdown options, narrowed by whichever of Batch/Department is
  // already picked - same two-step relationship CiaMarksScreen/
  // SubjectRecordsScreen use for their own class dropdowns.
  useEffect(() => {
    getInstitutionClasses({ batch_id: selectedBatch?.id, department_id: selectedDepartment?.id })
      .then(setClasses)
      .catch(() => toast.error("Couldn't load the class list"));
  }, [selectedBatch, selectedDepartment]);

  const filters: InstitutionDirectoryFilters = useMemo(
    () => ({
      search: debouncedSearch || undefined,
      batch_id: selectedBatch?.id,
      department_id: selectedDepartment?.id,
      class_id: selectedClass?.id,
    }),
    [debouncedSearch, selectedBatch, selectedDepartment, selectedClass],
  );

  // No more "must pick something first" gate - an all-empty filters call
  // legitimately returns every upcoming/historical application
  // institution-wide, same as PrincipalStudentsScreen's own default state.
  useEffect(() => {
    setUpcomingLoading(true);
    setUpcomingErrored(false);
    searchInstitutionUpcomingDrives(filters)
      .then(setUpcoming)
      .catch(() => setUpcomingErrored(true))
      .finally(() => setUpcomingLoading(false));
  }, [filters, upcomingReloadToken]);

  useEffect(() => {
    setHistoryLoading(true);
    setHistoryErrored(false);
    searchInstitutionDriveHistory(filters)
      .then(setHistory)
      .catch(() => setHistoryErrored(true))
      .finally(() => setHistoryLoading(false));
  }, [filters, historyReloadToken]);

  // Tab-invariant content (stats, department chart, department picker, and
  // the tab switcher itself) that used to scroll away above the ternary
  // upcoming/history body inside one shared ScrollView. The switcher here
  // sits BETWEEN that tab-invariant content and the list (not first after
  // the header, unlike every other switcher in this file) - hoisting it out
  // to a fixed position above the ScrollView like the other bodies would
  // reorder it in front of the stats/chart, which isn't a pure
  // animation-only change. So instead this whole section (switcher
  // included, kept as its original instant active/inactive swap) is
  // duplicated once into each per-tab ScrollView below, reproducing the
  // exact original scroll/position behavior - see StudentHostelScreen's
  // renderRoomCard for the same pattern.
  function renderHeaderSection() {
    return (
      <>
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={16} color="#9AA6B2" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search student name or roll no."
            placeholderTextColor="#9AA6B2"
            value={search}
            onChangeText={setSearch}
            autoCapitalize="none"
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch("")} hitSlop={8}>
              <Ionicons name="close-circle" size={16} color="#B0B7C3" />
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.pillsRow}>
          <FilterPill
            label={selectedBatch ? selectedBatch.name : "Batch"}
            active={!!selectedBatch}
            onPress={openBatchPicker}
            anchorRef={batchAnchorRef}
          />
          <FilterPill
            label={selectedDepartment ? selectedDepartment.name : "Department"}
            active={!!selectedDepartment}
            onPress={openDepartmentPicker}
            anchorRef={departmentAnchorRef}
          />
          <FilterPill
            label={selectedClass ? institutionClassLabel(selectedClass) : "Class"}
            active={!!selectedClass}
            onPress={openClassPicker}
            anchorRef={classAnchorRef}
          />
        </View>

        {overviewLoading && <SkeletonStatCards count={4} style={{ marginBottom: 16 }} />}

        {!overviewLoading && overviewError && (
          <View style={styles.centerState}>
            <Ionicons name="cloud-offline-outline" size={28} color="#B0B7C3" />
            <Text style={styles.centerStateText}>{overviewError}</Text>
            <TouchableOpacity onPress={loadOverview}>
              <Text style={styles.retryText}>Tap to retry</Text>
            </TouchableOpacity>
          </View>
        )}

        {!overviewLoading && !overviewError && overview && (
          <>
            <View style={styles.principalStatsGrid}>
              <PrincipalStatCard
                label="Placement percentage"
                value={overview.placement_pct !== null ? `${overview.placement_pct}%` : "—"}
                subtitle={
                  overview.placement_pct_delta !== null
                    ? `${overview.placement_pct_delta > 0 ? "+" : ""}${overview.placement_pct_delta} vs ${overview.season_year - 1}`
                    : "No prior season yet"
                }
                subtitleTone={
                  overview.placement_pct_delta === null ? undefined : overview.placement_pct_delta >= 0 ? "green" : "red"
                }
              />
              <PrincipalStatCard
                label="Highest package"
                value={overview.highest_package !== null ? `₹${overview.highest_package} LPA` : "—"}
                subtitle={overview.highest_package_role ?? "—"}
              />
              <PrincipalStatCard
                label="Average package"
                value={overview.average_package !== null ? `₹${overview.average_package} LPA` : "—"}
                subtitle="across all offers"
              />
              <PrincipalStatCard
                label="Students placed"
                value={overview.students_placed.toLocaleString()}
                subtitle={`of ${overview.applicants.toLocaleString()} applied`}
              />
            </View>

            <View style={styles.principalChartCard}>
              <Text style={styles.principalChartTitle}>Department-wise placement</Text>
              {overview.departments.length === 0 && (
                <Text style={styles.centerStateText}>No placement activity recorded this season.</Text>
              )}
              {overview.departments.map((dept) => (
                <View key={dept.code} style={styles.principalChartRow}>
                  <Text style={styles.principalChartLabel}>{dept.code}</Text>
                  <View style={styles.principalChartTrack}>
                    <View
                      style={[
                        styles.principalChartFill,
                        {
                          width: `${Math.min(dept.placement_pct ?? 0, 100)}%`,
                          backgroundColor: placementColor(dept.placement_pct),
                        },
                      ]}
                    />
                  </View>
                  <Text style={styles.principalChartValue}>
                    {dept.placement_pct !== null ? `${dept.placement_pct}%` : "—"}
                  </Text>
                </View>
              ))}
            </View>
          </>
        )}

        <View style={styles.tabSwitch}>
          <TouchableOpacity
            style={[styles.tabSwitchButton, tab === "upcoming" && styles.tabSwitchButtonActive]}
            onPress={() => setTab("upcoming")}
          >
            <Text style={[styles.tabSwitchText, tab === "upcoming" && styles.tabSwitchTextActive]}>
              Upcoming drives
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabSwitchButton, tab === "history" && styles.tabSwitchButtonActive]}
            onPress={() => setTab("history")}
          >
            <Text style={[styles.tabSwitchText, tab === "history" && styles.tabSwitchTextActive]}>History</Text>
          </TouchableOpacity>
        </View>
      </>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      {/* Reachable via the Campus/Amenity tab's own Principal-only
          "Placements" route (see app/(tabs)/amenity/placements/index.tsx) -
          not present on the Student/Mentor bodies above, which only render
          on the Academics tab's own route into this same screen. */}
      <WatermarkBackground />
      <LinearGradient
        colors={["#2F6FE0", "#1A3D8F"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.principalHeader, { paddingTop: insets.top + 10 }]}
      >
        {/* This body only ever renders for role === "principal" or
            "correspondent" (see the gate above), reached only via each
            role's own Services dashboard Placements tile - a normal
            same-stack push within that tab, not a cross-tab jump, so a
            plain router.back() is correct here (no stale-history risk like
            the Campus-tab entry points other roles use). */}
        <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <View style={styles.principalHeaderTextWrap}>
          <Text style={styles.principalHeaderTitle}>Placements</Text>
          <Text style={styles.principalHeaderSubtitle}>
            {overview
              ? `Placement season ${overview.season_year} · ${overview.companies} companies, ${overview.offers_released} offers released`
              : "Loading…"}
          </Text>
        </View>
      </LinearGradient>

      <TabTransitionView activeKey={tab} order={["upcoming", "history"]} style={styles.principalTabContent}>
        {tab === "upcoming" ? (
          <ScrollView
            contentContainerStyle={styles.principalContent}
            showsVerticalScrollIndicator={false}
            {...scrollMemory.bind("upcoming")}
          >
            {renderHeaderSection()}

            {upcomingLoading ? (
              <LoadingState />
            ) : upcomingErrored ? (
              <ErrorState onRetry={() => setUpcomingReloadToken((n) => n + 1)} />
            ) : upcoming && upcoming.length > 0 ? (
              dedupeDrivesById(upcoming).map((drive) => (
                <PrincipalUpcomingCard key={drive.drive_id} drive={drive} />
              ))
            ) : (
              <EmptyState icon="briefcase-outline" text="No drives coming up right now." />
            )}
          </ScrollView>
        ) : (
          <ScrollView
            contentContainerStyle={styles.principalContent}
            showsVerticalScrollIndicator={false}
            {...scrollMemory.bind("history")}
          >
            {renderHeaderSection()}

            {historyLoading ? (
              <LoadingState />
            ) : historyErrored ? (
              <ErrorState onRetry={() => setHistoryReloadToken((n) => n + 1)} />
            ) : history && history.length > 0 ? (
              history.map((item) => (
                <PrincipalHistoryCard key={`${item.drive_id}-${item.student.id}`} item={item} />
              ))
            ) : (
              <EmptyState icon="document-text-outline" text="No placement history yet." />
            )}
          </ScrollView>
        )}
      </TabTransitionView>

      <AnchoredDropdown
        anchorRef={batchAnchorRef}
        visible={batchPickerOpen}
        onClose={closeBatchPicker}
        contentStyle={[styles.modalCard, styles.anchoredCard]}
      >
        <Text style={styles.modalTitle}>Select a batch</Text>
        <ScrollView style={styles.classList} showsVerticalScrollIndicator={false}>
          <TouchableOpacity
            style={styles.classRow}
            onPress={() => {
              setSelectedBatch(null);
              closeBatchPicker();
            }}
          >
            <Text style={styles.classRowText}>All batches</Text>
            {!selectedBatch && <Ionicons name="checkmark" size={16} color="#2F6FE0" />}
          </TouchableOpacity>
          {batches.map((batch) => (
            <TouchableOpacity
              key={batch.id}
              style={styles.classRow}
              onPress={() => {
                setSelectedBatch(batch);
                // Selected class may not belong to the newly-picked batch -
                // reset it so the Class dropdown's narrowed options and the
                // active filter stay consistent with each other.
                if (selectedClass && selectedClass.batches?.name !== batch.name) {
                  setSelectedClass(null);
                }
                closeBatchPicker();
              }}
            >
              <Text style={styles.classRowText}>{batch.name}</Text>
              {selectedBatch?.id === batch.id && <Ionicons name="checkmark" size={16} color="#2F6FE0" />}
            </TouchableOpacity>
          ))}
        </ScrollView>
      </AnchoredDropdown>

      <AnchoredDropdown
        anchorRef={departmentAnchorRef}
        visible={departmentPickerOpen}
        onClose={closeDepartmentPicker}
        contentStyle={[styles.modalCard, styles.anchoredCard]}
      >
        <Text style={styles.modalTitle}>Select a department</Text>
        <ScrollView style={styles.classList} showsVerticalScrollIndicator={false}>
          <TouchableOpacity
            style={styles.classRow}
            onPress={() => {
              setSelectedDepartment(null);
              closeDepartmentPicker();
            }}
          >
            <Text style={styles.classRowText}>All departments</Text>
            {!selectedDepartment && <Ionicons name="checkmark" size={16} color="#2F6FE0" />}
          </TouchableOpacity>
          {departments.map((dept) => (
            <TouchableOpacity
              key={dept.id}
              style={styles.classRow}
              onPress={() => {
                setSelectedDepartment(dept);
                // Selected class may not belong to the newly-picked
                // department either - same reset as the Batch picker above.
                if (selectedClass && selectedClass.departments?.code !== dept.code) {
                  setSelectedClass(null);
                }
                closeDepartmentPicker();
              }}
            >
              <Text style={styles.classRowText}>{dept.name}</Text>
              {selectedDepartment?.id === dept.id && <Ionicons name="checkmark" size={16} color="#2F6FE0" />}
            </TouchableOpacity>
          ))}
        </ScrollView>
      </AnchoredDropdown>

      <AnchoredDropdown
        anchorRef={classAnchorRef}
        visible={classPickerOpen}
        onClose={closeClassPicker}
        contentStyle={[styles.modalCard, styles.anchoredCard]}
      >
        <Text style={styles.modalTitle}>Select a class</Text>
        <ScrollView style={styles.classList} showsVerticalScrollIndicator={false}>
          <TouchableOpacity
            style={styles.classRow}
            onPress={() => {
              setSelectedClass(null);
              closeClassPicker();
            }}
          >
            <Text style={styles.classRowText}>All classes</Text>
            {!selectedClass && <Ionicons name="checkmark" size={16} color="#2F6FE0" />}
          </TouchableOpacity>
          {classes.map((cls) => (
            <TouchableOpacity
              key={cls.id}
              style={styles.classRow}
              onPress={() => {
                setSelectedClass(cls);
                closeClassPicker();
              }}
            >
              <Text style={styles.classRowText}>{institutionClassLabel(cls)}</Text>
              {selectedClass?.id === cls.id && <Ionicons name="checkmark" size={16} color="#2F6FE0" />}
            </TouchableOpacity>
          ))}
        </ScrollView>
      </AnchoredDropdown>
    </SafeAreaView>
  );
}

function placementColor(pct: number | null): string {
  if (pct === null) return "#D1D5DB";
  if (pct >= 90) return "#16A34A";
  if (pct >= 80) return "#D97706";
  return "#DC2626";
}

function PrincipalStatCard({
  label,
  value,
  subtitle,
  subtitleTone,
}: {
  label: string;
  value: string;
  subtitle: string;
  subtitleTone?: "green" | "red";
}) {
  return (
    <View style={styles.principalStatCard}>
      <Text style={styles.principalStatLabel}>{label}</Text>
      <Text style={styles.principalStatValue}>{value}</Text>
      <Text
        style={[
          styles.principalStatSubtitle,
          subtitleTone === "green" ? { color: "#3FA66B" } : subtitleTone === "red" ? { color: "#DC2626" } : null,
        ]}
      >
        {subtitle}
      </Text>
    </View>
  );
}

// Principal's upcoming list is company-level, not per-student - the same
// drive_id otherwise repeats once per student who's applied to it (that's
// meaningful for the mentor view, which tracks each student's own outcome,
// but not here).
function dedupeDrivesById(drives: InstitutionUpcomingDrive[]): InstitutionUpcomingDrive[] {
  const seen = new Set<number>();
  const result: InstitutionUpcomingDrive[] = [];
  for (const drive of drives) {
    if (seen.has(drive.drive_id)) continue;
    seen.add(drive.drive_id);
    result.push(drive);
  }
  return result;
}

function PrincipalUpcomingCard({ drive }: { drive: InstitutionUpcomingDrive }) {
  return (
    <View style={[styles.card, !drive.is_disclosed && styles.cardUndisclosed]}>
      <View style={styles.cardHeader}>
        {!drive.is_disclosed && <Ionicons name="lock-closed" size={14} color="#8A93A3" />}
        <Text style={[styles.company, !drive.is_disclosed && styles.companyUndisclosed]}>{drive.company_name}</Text>
      </View>

      <View style={styles.metaRow}>
        <Ionicons name="calendar-outline" size={13} color="#8A93A3" />
        <Text style={styles.metaText}>Drive on {formatDate(new Date(drive.scheduled_date))}</Text>
      </View>

      {drive.is_disclosed && drive.company_profile_info && (
        <Text style={styles.profileInfo}>{drive.company_profile_info}</Text>
      )}

      {!drive.is_disclosed && (
        <Text style={styles.revealHint}>
          {drive.disclosed_reveal_date
            ? `Company name reveals on ${formatDate(new Date(drive.disclosed_reveal_date))}`
            : "Company name will be revealed closer to the drive date."}
        </Text>
      )}
    </View>
  );
}

function PrincipalHistoryCard({ item }: { item: InstitutionDriveHistoryItem }) {
  const meta = APPLICATION_STATUS_META[item.application_status];

  return (
    <View style={styles.card}>
      <View style={styles.cardHeaderRow}>
        <Text style={styles.company}>{item.company_name}</Text>
        <View style={[styles.statusBadge, { backgroundColor: meta.bg }]}>
          <Text style={[styles.statusBadgeText, { color: meta.text }]}>{historyStatusLabel(item)}</Text>
        </View>
      </View>

      <Text style={styles.studentLine}>{studentLineText(item.student)}</Text>

      <View style={styles.metaRow}>
        <Ionicons name="calendar-outline" size={13} color="#8A93A3" />
        <Text style={styles.metaText}>Drive on {formatDate(new Date(item.scheduled_date))}</Text>
      </View>
    </View>
  );
}

function studentLineText(student: {
  name: string;
  student_id_no: string;
  section: string | null;
  department_code?: string | null;
  batch_name?: string | null;
}): string {
  const parts = [student.name, student.student_id_no];
  if (student.department_code) parts.push(student.department_code);
  if (student.section) parts.push(`Sec ${student.section}`);
  if (student.batch_name) parts.push(student.batch_name);
  return parts.join(" · ");
}

// Institution-wide Class dropdown's option label - same
// `${course_code} - Section ${section} (${batch_name})` format as
// classLabel(DepartmentClass) below, adapted to InstitutionClass's
// (nested, nullable) field names.
function institutionClassLabel(cls: InstitutionClass): string {
  const course = cls.courses?.code ?? "—";
  return cls.batches?.name
    ? `${course} - Section ${cls.section} (${cls.batches.name})`
    : `${course} - Section ${cls.section}`;
}

function FilterPill({
  label,
  active,
  onPress,
  anchorRef,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  anchorRef: RefObject<View | null>;
}) {
  return (
    <View ref={anchorRef} collapsable={false}>
      <TouchableOpacity style={[styles.pill, active && styles.pillActive]} onPress={onPress} activeOpacity={0.8}>
        <Text style={[styles.pillText, active && styles.pillTextActive]}>{label}</Text>
        <Ionicons name="chevron-down" size={14} color={active ? "#fff" : "#8A93A3"} />
      </TouchableOpacity>
    </View>
  );
}

// ───────────────────────────── Faculty/HoD (mentor) body ─────────────────────────────

function initialsFromName(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

// Shared by both a faculty mentor and a HoD - identical UI, only which
// students are pickable differs (fetchStudents passed in by the caller;
// see PlacementsOverviewScreen). The drill-down destination
// (StudentPlacementHistoryScreen) re-derives the same role split itself via
// useRole(), so no route/param plumbing is needed here for that.
//
// `classPicker` additionally renders a class selector above the student
// list (HoD only - a faculty mentor already has a small, fixed set of
// mentored classes, so narrowing further isn't useful) - selecting a class
// re-fetches fetchStudents(classId), "All classes" (the default) omits it.
//
// `hodFilters` (HoD only, always paired with classPicker=true) additionally
// narrows that same Class dropdown behind a Batch dropdown picked first
// (same two-step relationship CiaMarksScreen/SubjectRecordsScreen use for
// their own class dropdowns), and adds a name/roll-number search box above
// the student list - both scoped to the HoD's own department only, never
// all students college-wide (fetchStudents/getDepartmentClasses are already
// department-scoped server-side).
function MentorPlacementsBody({
  fetchStudents,
  emptyStudentsText,
  classPicker,
  hodFilters,
}: {
  fetchStudents: (classId?: number) => Promise<MentoredStudent[]>;
  emptyStudentsText: string;
  classPicker?: boolean;
  hodFilters?: boolean;
}) {
  const router = useRouter();
  const [tab, setTab] = useState<PlacementTab>("upcoming");
  const scrollMemory = useTabScrollMemory();

  const [upcoming, setUpcoming] = useState<FacultyUpcomingDrive[] | null>(null);
  const [upcomingLoading, setUpcomingLoading] = useState(true);
  const [upcomingErrored, setUpcomingErrored] = useState(false);
  const [upcomingReloadToken, setUpcomingReloadToken] = useState(0);

  const [students, setStudents] = useState<MentoredStudent[] | null>(null);
  const [studentsLoading, setStudentsLoading] = useState(true);
  const [studentsErrored, setStudentsErrored] = useState(false);
  const [studentsReloadToken, setStudentsReloadToken] = useState(0);

  const [classes, setClasses] = useState<DepartmentClass[]>([]);
  const [selectedClass, setSelectedClass] = useState<DepartmentClass | null>(null);
  const {
    anchorRef: classAnchorRef,
    visible: classPickerOpen,
    open: openClassPicker,
    close: closeClassPicker,
  } = useDropdown();

  // HoD-only Batch narrowing (see doc comment above) - reuses the same
  // `classes` list already fetched for the Class dropdown below.
  const [selectedBatchName, setSelectedBatchName] = useState<string | null>(null);
  const {
    anchorRef: batchAnchorRef,
    visible: batchPickerOpen,
    open: openBatchPicker,
    close: closeBatchPicker,
  } = useDropdown();
  const [search, setSearch] = useState("");

  useEffect(() => {
    setUpcomingLoading(true);
    setUpcomingErrored(false);
    getUpcomingDrivesForFaculty()
      .then(setUpcoming)
      .catch(() => setUpcomingErrored(true))
      .finally(() => setUpcomingLoading(false));
  }, [upcomingReloadToken]);

  useEffect(() => {
    if (!classPicker) return;
    getDepartmentClasses()
      .then(setClasses)
      .catch(() => toast.error("Couldn't load the class list"));
  }, [classPicker]);

  useEffect(() => {
    setStudentsLoading(true);
    setStudentsErrored(false);
    fetchStudents(selectedClass?.class_id)
      .then(setStudents)
      .catch(() => setStudentsErrored(true))
      .finally(() => setStudentsLoading(false));
  }, [fetchStudents, selectedClass, studentsReloadToken]);

  // Distinct batch names across the department's classes, most-recent-batch
  // first (classes already comes back that way from getDepartmentClasses).
  const batchNames = useMemo(
    () => Array.from(new Set(classes.map((c) => c.batch_name))),
    [classes],
  );
  const classesInSelectedBatch = selectedBatchName
    ? classes.filter((c) => c.batch_name === selectedBatchName)
    : classes;

  // Name/roll-number search, applied on top of the already department (and
  // optionally class/batch) scoped student list - never fetched from a
  // wider, unscoped endpoint.
  const visibleStudents = useMemo(() => {
    if (!students) return students;
    const query = search.trim().toLowerCase();
    if (!query) return students;
    return students.filter(
      (s) => s.name.toLowerCase().includes(query) || s.student_id_no.toLowerCase().includes(query),
    );
  }, [students, search]);

  // MentorPlacementsBody only ever renders for role "hod" or "employee"
  // (see PlacementsOverviewScreen's own role branching above) - both reach
  // this screen via the erp tab's own local copy (app/(tabs)/erp/placements),
  // never the Academics tab (hidden entirely for these roles), so the
  // student drill-down below must stay in that same tab too - crossing into
  // a hidden tab corrupts the Tabs navigator's back-stack (the "switching
  // tabs exits the app" bug).
  function openStudentHistory(student: MentoredStudent) {
    router.push({
      pathname: "/(tabs)/erp/placements/student/[studentId]",
      params: {
        studentId: String(student.student_id),
        name: student.name,
        studentIdNo: student.student_id_no,
      },
    } as never);
  }

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <View style={styles.content}>
        <TabSwitch tab={tab} setTab={setTab} />

        <TabTransitionView activeKey={tab} order={["upcoming", "history"]} style={styles.tabContent}>
          {tab === "upcoming" ? (
            <ScrollView
              contentContainerStyle={styles.list}
              showsVerticalScrollIndicator={false}
              {...scrollMemory.bind("upcoming")}
            >
              {upcomingLoading ? (
                <LoadingState />
              ) : upcomingErrored ? (
                <ErrorState onRetry={() => setUpcomingReloadToken((n) => n + 1)} />
              ) : upcoming && upcoming.length > 0 ? (
                upcoming.map((drive) => <FacultyUpcomingCard key={drive.drive_id} drive={drive} />)
              ) : (
                <EmptyState icon="briefcase-outline" text="No drives coming up right now." />
              )}
            </ScrollView>
          ) : (
            <ScrollView
              contentContainerStyle={styles.list}
              showsVerticalScrollIndicator={false}
              {...scrollMemory.bind("history")}
            >
              {hodFilters && (
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
              )}

              {hodFilters && (
                <View ref={batchAnchorRef} collapsable={false}>
                  <TouchableOpacity
                    style={styles.classPickerButton}
                    onPress={openBatchPicker}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="calendar-outline" size={16} color="#2F6FE0" />
                    <Text style={styles.classPickerButtonText}>{selectedBatchName ?? "All batches"}</Text>
                    <Ionicons name="chevron-down" size={16} color="#2F6FE0" />
                  </TouchableOpacity>
                </View>
              )}

              {classPicker && (
                <View ref={classAnchorRef} collapsable={false}>
                  <TouchableOpacity
                    style={styles.classPickerButton}
                    onPress={openClassPicker}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="school-outline" size={16} color="#2F6FE0" />
                    <Text style={styles.classPickerButtonText}>
                      {selectedClass ? classLabel(selectedClass) : "All classes"}
                    </Text>
                    <Ionicons name="chevron-down" size={16} color="#2F6FE0" />
                  </TouchableOpacity>
                </View>
              )}

              {studentsLoading ? (
                <LoadingState />
              ) : studentsErrored ? (
                <ErrorState onRetry={() => setStudentsReloadToken((n) => n + 1)} />
              ) : visibleStudents && visibleStudents.length > 0 ? (
                <>
                  <Text style={styles.sectionHint}>Tap a student to see their placement history.</Text>
                  {visibleStudents.map((student) => (
                    <StudentRow
                      key={student.student_id}
                      student={student}
                      onPress={() => openStudentHistory(student)}
                    />
                  ))}
                </>
              ) : students && students.length > 0 ? (
                <EmptyState icon="people-outline" text="No students match this search." />
              ) : (
                <EmptyState icon="people-outline" text={selectedClass ? "No students in this class yet." : emptyStudentsText} />
              )}
            </ScrollView>
          )}
        </TabTransitionView>
      </View>

      {hodFilters && (
        <AnchoredDropdown
          anchorRef={batchAnchorRef}
          visible={batchPickerOpen}
          onClose={closeBatchPicker}
          contentStyle={[styles.modalCard, styles.anchoredCard]}
        >
          <Text style={styles.modalTitle}>Select a batch</Text>
          <ScrollView style={styles.classList} showsVerticalScrollIndicator={false}>
            <TouchableOpacity
              style={styles.classRow}
              onPress={() => {
                setSelectedBatchName(null);
                closeBatchPicker();
              }}
            >
              <Text style={styles.classRowText}>All batches</Text>
              {!selectedBatchName && <Ionicons name="checkmark" size={16} color="#2F6FE0" />}
            </TouchableOpacity>
            {batchNames.map((batchName) => (
              <TouchableOpacity
                key={batchName}
                style={styles.classRow}
                onPress={() => {
                  setSelectedBatchName(batchName);
                  // Selected class may not belong to the newly-picked batch -
                  // reset it so the Class dropdown's narrowed options and
                  // the active filter stay consistent with each other.
                  if (selectedClass && selectedClass.batch_name !== batchName) {
                    setSelectedClass(null);
                  }
                  closeBatchPicker();
                }}
              >
                <Text style={styles.classRowText}>{batchName}</Text>
                {selectedBatchName === batchName && <Ionicons name="checkmark" size={16} color="#2F6FE0" />}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </AnchoredDropdown>
      )}

      {classPicker && (
        <AnchoredDropdown
          anchorRef={classAnchorRef}
          visible={classPickerOpen}
          onClose={closeClassPicker}
          contentStyle={[styles.modalCard, styles.anchoredCard]}
        >
          <Text style={styles.modalTitle}>Select a class</Text>
          <ScrollView style={styles.classList} showsVerticalScrollIndicator={false}>
            <TouchableOpacity
              style={styles.classRow}
              onPress={() => {
                setSelectedClass(null);
                closeClassPicker();
              }}
            >
              <Text style={styles.classRowText}>All classes</Text>
              {!selectedClass && <Ionicons name="checkmark" size={16} color="#2F6FE0" />}
            </TouchableOpacity>
            {(hodFilters ? classesInSelectedBatch : classes).map((cls) => (
              <TouchableOpacity
                key={cls.class_id}
                style={styles.classRow}
                onPress={() => {
                  setSelectedClass(cls);
                  closeClassPicker();
                }}
              >
                <Text style={styles.classRowText}>{classLabel(cls)}</Text>
                {selectedClass?.class_id === cls.class_id && (
                  <Ionicons name="checkmark" size={16} color="#2F6FE0" />
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </AnchoredDropdown>
      )}
    </SafeAreaView>
  );
}

function classLabel(cls: DepartmentClass): string {
  return `${cls.course_code} - Section ${cls.section} (${cls.batch_name})`;
}

function FacultyUpcomingCard({ drive }: { drive: FacultyUpcomingDrive }) {
  return (
    <View style={[styles.card, !drive.is_disclosed && styles.cardUndisclosed]}>
      <View style={styles.cardHeader}>
        {!drive.is_disclosed && <Ionicons name="lock-closed" size={14} color="#8A93A3" />}
        <Text style={[styles.company, !drive.is_disclosed && styles.companyUndisclosed]}>{drive.company_name}</Text>
      </View>

      <View style={styles.metaRow}>
        <Ionicons name="calendar-outline" size={13} color="#8A93A3" />
        <Text style={styles.metaText}>Drive on {formatDate(new Date(drive.scheduled_date))}</Text>
      </View>

      {drive.is_disclosed && drive.company_profile_info && (
        <Text style={styles.profileInfo}>{drive.company_profile_info}</Text>
      )}

      {!drive.is_disclosed && (
        <Text style={styles.revealHint}>
          {drive.disclosed_reveal_date
            ? `Company name reveals on ${formatDate(new Date(drive.disclosed_reveal_date))}`
            : "Company name will be revealed closer to the drive date."}
        </Text>
      )}
    </View>
  );
}

function StudentRow({ student, onPress }: { student: MentoredStudent; onPress: () => void }) {
  const classLabel = student.section
    ? `${student.department_name ?? "—"} - ${student.section}`
    : "No class assigned";

  return (
    <TouchableOpacity style={styles.studentRow} onPress={onPress} activeOpacity={0.8}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{initialsFromName(student.name)}</Text>
      </View>
      <View style={styles.studentTextWrap}>
        <Text style={styles.studentName}>{student.name}</Text>
        <Text style={styles.studentSubtext}>
          {student.student_id_no} · {classLabel}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color="#B0B7C3" />
    </TouchableOpacity>
  );
}

// ───────────────────────────── Shared ─────────────────────────────

// Used by the Student and Mentor bodies, where the switcher already sits
// outside the ScrollView (hoisting it into AnimatedTabBar doesn't reorder
// anything there). The Principal body keeps its own inline, unconverted
// switcher instead - see renderHeaderSection's comment in
// PrincipalPlacementsBody for why.
function TabSwitch({
  tab,
  setTab,
  showTodo,
}: {
  tab: PlacementTab;
  setTab: (tab: PlacementTab) => void;
  showTodo?: boolean;
}) {
  const tabs: { key: PlacementTab; label: string }[] = [
    { key: "upcoming", label: "Upcoming Drives" },
    { key: "history", label: "History" },
    ...(showTodo ? [{ key: "todo" as PlacementTab, label: "Todo" }] : []),
  ];

  return (
    <AnimatedTabBar
      tabs={tabs}
      active={tab}
      onChange={setTab}
      containerStyle={styles.tabSwitch}
      tabStyle={styles.tabSwitchButton}
      tabTextStyle={styles.tabSwitchText}
      activeTabTextStyle={styles.tabSwitchTextActive}
      indicatorStyle={styles.tabSwitchIndicator}
    />
  );
}

function LoadingState() {
  return <SkeletonListRows count={3} />;
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <View style={styles.centerState}>
      <Ionicons name="cloud-offline-outline" size={32} color="#B0B7C3" />
      <Text style={styles.centerStateText}>Couldn't load this. Please try again.</Text>
      <TouchableOpacity onPress={onRetry} activeOpacity={0.8}>
        <Text style={styles.retryText}>Tap to retry</Text>
      </TouchableOpacity>
    </View>
  );
}

function EmptyState({ icon, text }: { icon: keyof typeof Ionicons.glyphMap; text: string }) {
  return (
    <View style={styles.centerState}>
      <Ionicons name={icon} size={32} color="#B0B7C3" />
      <Text style={styles.centerStateText}>{text}</Text>
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
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
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
    flex: 1,
    padding: 16,
  },
  tabContent: {
    flex: 1,
  },
  // Only the tail ternary body used to live inside one shared ScrollView
  // below the header/stats/chart/tab-switcher - this sizes the
  // TabTransitionView that now wraps the two per-tab ScrollViews (see
  // PrincipalPlacementsBody).
  principalTabContent: {
    flex: 1,
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
    paddingVertical: 12,
    paddingHorizontal: 4,
  },
  // Only used by PrincipalPlacementsBody's own inline, unconverted switcher
  // now (see its renderHeaderSection) - Student/Mentor switch to
  // AnimatedTabBar's indicatorStyle below instead.
  tabSwitchButtonActive: {
    backgroundColor: "#2F6FE0",
  },
  tabSwitchIndicator: {
    top: 0,
    bottom: 0,
    borderRadius: 9,
    backgroundColor: "#2F6FE0",
  },
  tabSwitchText: {
    // Smaller than the usual 14px tab-label size elsewhere in the app -
    // "Upcoming Drives" needs to fit on one line (AnimatedTabBar renders
    // every label with numberOfLines={1}, so anything wider than its
    // flex:1 slot truncates with an ellipsis instead of wrapping) inside
    // one of 3 equal-width tabs alongside History/Todo.
    fontSize: 12,
    fontFamily: fonts.semibold,
    color: "#4B5563",
    textAlign: "center",
  },
  tabSwitchTextActive: {
    color: "#fff",
    fontFamily: fonts.bold,
  },
  list: {
    paddingBottom: 32,
  },
  sectionHint: {
    fontSize: 12,
    fontFamily: fonts.medium,
    color: "#9AA6B2",
    marginBottom: 10,
  },
  classPickerButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    alignSelf: "flex-start",
    backgroundColor: "#EAF0FD",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    marginBottom: 12,
  },
  classPickerButtonText: {
    fontSize: 13,
    fontFamily: fonts.semibold,
    color: "#2F6FE0",
  },
  modalCard: {
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 18,
  },
  anchoredCard: {
    width: 280,
    maxHeight: 340,
    elevation: 6,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },
  modalTitle: {
    fontSize: 14,
    fontFamily: fonts.bold,
    color: "#111827",
    marginBottom: 12,
  },
  classList: {
    maxHeight: 400,
  },
  classRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F3F6",
  },
  classRowText: {
    flex: 1,
    fontSize: 13,
    fontFamily: fonts.medium,
    color: "#111827",
    paddingRight: 8,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#EEF0F4",
    padding: 16,
    marginBottom: 14,
  },
  cardUndisclosed: {
    borderStyle: "dashed",
    borderColor: "#D1D5DB",
    backgroundColor: "#FAFAFB",
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flex: 1,
    marginBottom: 8,
  },
  cardHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    marginBottom: 8,
  },
  company: {
    fontSize: 16,
    fontFamily: fonts.bold,
    color: "#111827",
  },
  companyUndisclosed: {
    color: "#6B7280",
    fontFamily: fonts.semibold,
  },
  studentLine: {
    fontSize: 12,
    fontFamily: fonts.semibold,
    color: "#2F6FE0",
    marginBottom: 6,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  metaText: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: "#8A93A3",
  },
  profileInfo: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: "#6B7280",
    marginTop: 8,
    lineHeight: 18,
  },
  revealHint: {
    fontSize: 12,
    fontFamily: fonts.medium,
    color: "#9AA6B2",
    marginTop: 8,
  },
  statusBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  statusBadgeText: {
    fontSize: 11,
    fontFamily: fonts.bold,
  },
  studentRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 12,
    marginBottom: 8,
    elevation: 1,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#E4EBFB",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
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
  studentSubtext: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: "#9AA6B2",
    marginTop: 2,
  },
  centerState: {
    alignItems: "center",
    paddingVertical: 60,
    gap: 8,
  },
  centerStateText: {
    fontSize: 13,
    fontFamily: fonts.medium,
    color: "#9AA6B2",
    textAlign: "center",
  },
  retryText: {
    fontSize: 13,
    fontFamily: fonts.bold,
    color: "#2F6FE0",
    marginTop: 4,
  },
  principalHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingBottom: 14,
  },
  principalHeaderTextWrap: {
    flex: 1,
  },
  principalHeaderTitle: {
    fontSize: 18,
    fontFamily: fonts.bold,
    color: "#fff",
  },
  principalHeaderSubtitle: {
    fontSize: 11,
    fontFamily: fonts.regular,
    color: "#D7E2FA",
    marginTop: 2,
  },
  principalContent: {
    padding: 16,
    paddingBottom: 40,
  },
  principalStatsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 16,
  },
  principalStatCard: {
    width: "48%",
    backgroundColor: "#fff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#EEF0F4",
    padding: 14,
    gap: 4,
  },
  principalStatLabel: {
    fontSize: 11,
    fontFamily: fonts.medium,
    color: "#8A93A3",
  },
  principalStatValue: {
    fontSize: 20,
    fontFamily: fonts.bold,
    color: "#111827",
  },
  principalStatSubtitle: {
    fontSize: 10,
    fontFamily: fonts.regular,
    color: "#9AA6B2",
  },
  principalChartCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#EEF0F4",
    padding: 16,
    marginBottom: 16,
    gap: 10,
  },
  principalChartTitle: {
    fontSize: 15,
    fontFamily: fonts.bold,
    color: "#111827",
    marginBottom: 4,
  },
  principalChartRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  principalChartLabel: {
    width: 40,
    fontSize: 11,
    fontFamily: fonts.semibold,
    color: "#4B5563",
  },
  principalChartTrack: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#F1F3F6",
    overflow: "hidden",
  },
  principalChartFill: {
    height: 8,
    borderRadius: 4,
  },
  principalChartValue: {
    width: 40,
    fontSize: 11,
    fontFamily: fonts.medium,
    color: "#9AA6B2",
    textAlign: "right",
  },
  // HoD-only search box above the History tab's Batch/Class filters -
  // same style as AssignFacultyScreen's own searchBar/searchInput.
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
  // Principal Placements' own Batch/Department/Class filter row - same
  // pill visual/interaction pattern as PrincipalStudentsScreen's own
  // Department/Year filter pills.
  // Plain wrapping row, not a horizontal ScrollView - see
  // HigherEducationScreen.tsx's identical comment for why.
  pillsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, paddingBottom: 12 },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#EEF0F4",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  pillActive: { backgroundColor: "#2F6FE0", borderColor: "#2F6FE0" },
  pillText: { fontSize: 12, fontFamily: fonts.medium, color: "#4B5563" },
  pillTextActive: { color: "#fff" },
});
