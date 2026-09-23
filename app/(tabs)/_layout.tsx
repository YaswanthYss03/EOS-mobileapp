import { Tabs, Redirect } from "expo-router";
import { getFocusedRouteNameFromRoute, type RouteProp } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { FontAwesome6, Ionicons } from "@expo/vector-icons";
import { BuildingsLightIcon } from "@/components/icons/BuildingsLightIcon";
import { CollegeHeader } from "@/components/layout/CollegeHeader";
import { useAuth } from "@/context/AuthContext";
import { useRole } from "@/hooks/useRole";

// Home/Campus(Amenity)/Academics(student)/My Bus icons were originally
// spec'd as thin Ionicons-style outline glyphs (matching the very first
// design pass on this tab bar), rendered here via Ionicons - already the
// icon set every ERP screen in this app uses elsewhere, so no new
// dependency. A fixed numeric size (not the dynamic `size` React
// Navigation passes in, which varies by platform default) keeps every
// icon the same "medium" size on every device frame instead of
// inconsistently large.
const TAB_ICON_SIZE = 22;
// Fixed tab bar height (+ the device's own safe-area bottom inset) so the
// bar renders identically on every phone frame - notch or no notch,
// gesture-nav or button-nav - instead of drifting with whatever the
// platform default computes.
const TAB_BAR_BASE_HEIGHT = 54;

// Employee/HOD/HR Payroll/Principal's "Class"/"Progress" tab still uses the
// raw react-native-svg BuildingsLightIcon (not Ionicons, no matching
// outline glyph for this one) - scaled 1 (no scaling, same raw `size` every
// other tab icon gets) after an earlier attempt at scaling it down (0.78,
// on the theory that SVG glyphs render optically larger at the same
// numeric size) over-corrected and made it look too small next to its
// sibling FontAwesome6 icon.
const TAB_ICON_SVG_SCALE = 1;

// Every tab (home/academics/erp/amenity/bus-tracking) is itself a Stack of
// many sub-pages (see each one's own _layout.tsx) - the bottom tab bar
// should only show on that Stack's own root ("index"), not on any pushed
// sub-page, regardless of which of the 5 tabs it is or how deep that
// sub-page's route is. getFocusedRouteNameFromRoute reads the *immediate*
// child route name within one tab's Stack (e.g. "student-attendance" for
// app/(tabs)/erp/student-attendance/index.tsx), which is exactly the "am I
// still on this tab's own index screen" check - it does not require
// touching any of those many sub-pages individually.
function tabBarStyleForRoute(route: RouteProp<Record<string, object | undefined>, string>, insetsBottom: number) {
  const focusedRouteName = getFocusedRouteNameFromRoute(route) ?? "index";
  if (focusedRouteName !== "index") return { display: "none" as const };
  return {
    height: TAB_BAR_BASE_HEIGHT + insetsBottom,
    paddingTop: 6,
    paddingBottom: insetsBottom,
  };
}

// TODO: hide the ERP tab entirely for roles with no ERP access (see src/navigation/rbac)
export default function TabsLayout() {
  const { token, isLoading, studentType, dayscholarMode, activeAccountMode } = useAuth();
  const role = useRole();
  const insets = useSafeAreaInsets();
  // Student-only bottom-nav relabeling: Home / Academics (was "Campus", the
  // academics/ tab) / Class (unchanged, the erp/ tab) / Campus (was
  // "Amenity") / Bus-or-Hostel (was "My Bus") - same 5 routes/screens, just
  // renamed for this role only. Every other role's tabs are completely
  // unaffected (still Home/Campus-if-visible/Class/Amenity/My Bus).
  const isStudent = role === "student";
  // "employee" covers faculty as well as library/finance/academic_coordinator/
  // alumni (see useRole.ts's BACKEND_ROLE_MAP) - all of them share the one
  // EmployeeDashboard, which now also carries the moved-in academics/* tiles
  // (see mockDashboard.ts's studentSectionItems), so hiding this tab for the
  // whole "employee" bucket doesn't strand any of them. Declared before
  // isHosteller/isDayscholarOwnVehicle below since a real Faculty account
  // gets the exact same Bus/Hostel tab logic as a Student now (some faculty
  // are hostel residents or commute by college bus too - see
  // AuthContext.tsx's refreshTravelInfo).
  const isEmployee = role === "employee";
  const isStudentOrEmployee = isStudent || isEmployee;
  // Parent included too - AuthContext.refreshTravelInfo now also resolves
  // studentType for a parent account (from their linked child/children, see
  // its own comment) so a parent whose child is a hosteller gets the same
  // Bus->Hostel swap as the child themself.
  const isHosteller = (isStudentOrEmployee || role === "parent") && studentType === "hosteller";
  // Only a dayscholar who explicitly travels by their own vehicle drops to
  // 4 tabs - null (not yet loaded) or "transport" both keep the 5th tab, so
  // a real transport-using student/faculty is never flashed a missing tab
  // while this loads.
  const isDayscholarOwnVehicle =
    isStudentOrEmployee && studentType === "dayscholar" && dayscholarMode === "own_vehicle";
  const isPrincipal = role === "principal";
  // Strict visual/behavioral replica of Principal (see
  // CorrespondentDashboard.tsx) - same tab visibility.
  const isCorrespondent = role === "correspondent";
  // Class Advisor mode (see AuthContext.tsx's AccountMode, EmployeeDashboard.tsx's
  // AdvisorClassScreen branch) - Home + Class only, no Campus/Progress/Bus,
  // since Placements/Higher Education/Entrepreneur/Academics all now live
  // behind the Class tab's own card grid instead of separate tabs. HoD is
  // deliberately excluded here even though it shares the same AccountMode
  // type - "hod tab no changes" per spec, this only ever narrows Employee's
  // own tab set.
  const isAdvisorOnly = isEmployee && activeAccountMode === "ADVISOR";
  // HoD has its own separate Role value/dashboard (HodDashboard) - same
  // moved-in tiles now live in its own studentSectionItems too (see
  // src/features/erp/hod/data/mockDashboard.ts).
  const isHod = role === "hod";
  // Switch Account for a HOD - see AuthContext.tsx's ViewMode/TopBar.tsx.
  // "HOD" (the default) gets a completely separate 3-tab layout (Home/
  // Student/Faculty - see erpTab/academicsTab below, both repurposed and
  // relabeled rather than adding new tab routes, same convention as every
  // other role variant in this file). "FACULTY" gets the exact same
  // Class/Campus/Progress/Bus experience Employee already has - folded into
  // `actsAsEmployee` below rather than duplicating every isEmployee check.
  const isHodActingAsFaculty = isHod && activeAccountMode === "FACULTY";
  const isHodActingAsHod = isHod && !isHodActingAsFaculty;
  const actsAsEmployee = isEmployee || isHodActingAsFaculty;
  // HR Payroll's Academics chooser only ever showed Timetable + Calendar (no
  // Current Semester/Online Class/Placements - see
  // AcademicsOverviewScreen.tsx/AcademicsChooserScreen.tsx), so only those
  // two moved into its own Employee section (see
  // src/features/erp/hr-payroll/data/mockDashboard.ts) - still enough to
  // hide this tab entirely for this role too.
  const isHrPayroll = role === "hr-payroll";
  // Parent's Timetable/Calendar/Placements moved into its own Campus tile
  // grid too (see src/features/erp/parent/data/mockDashboard.ts) - those
  // shared academics/* routes already render parent-specific screens for
  // this role (ParentTimetableScreen/ParentCalendarScreen/
  // ParentPlacementsScreen), not the generic ones. Online Class was left
  // out of that move (already broken for parent - see mockDashboard.ts's
  // own comment), so hiding this tab doesn't strand a working feature.
  const isParent = role === "parent";
  // Alumni gets its own minimal 2-tab experience (Home + Campus only) - see
  // AcademicsChooserScreen.tsx's alumni branch for what Campus shows them
  // (Performance, and Exam schedule only if they have a standing arrear).
  // Class/Amenity/My Bus are all current-student/staff self-service
  // features that don't apply once graduated.
  const isAlumni = role === "alumni";

  // Normally app/index.tsx already routes signed-out users to login before
  // they ever reach here, but this guards direct/back navigation into (tabs)
  // too (e.g. after a 401 forces a logout while already on a tab screen).
  if (isLoading) return null;
  if (!token) return <Redirect href="/(auth)/login" />;

  // Declared as variables (not inline JSX) so their relative order can be
  // swapped per-role below, without duplicating either tab's own options.
  const amenityTab = (
    <Tabs.Screen
      key="amenity"
      name="amenity"
      options={({ route }) => ({
        // Renamed "Campus" for students, Employee/faculty, HR & Payroll,
        // Principal, Parent, and HOD acting as HOD (same tab, HOD-specific
        // read-only content - just a single "Faculty Feedback" card, see
        // AmenityHomeScreen.tsx's own hodOptions - still "Amenity" for
        // every other role that keeps this tab).
        title: isStudent || actsAsEmployee || isHrPayroll || isPrincipal || isParent || isHodActingAsHod ? "Campus" : "Amenity",
        // Parent has its own read-only Campus content (order/visit history
        // per service, plus feedback about their child/the college - see
        // AmenityHomeScreen.tsx's parentOptions). HOD acting as HOD now has
        // a single Feedback card here too (was fully hidden before - see
        // AmenityHomeScreen.tsx's hodOptions). Alumni has none. Advisor mode
        // drops to Home + Class only (see isAdvisorOnly). Correspondent
        // drops to Home + Services only - Campus/Bus have no
        // management-relevant content for this role either, and its own
        // Copy Center/Feedback content moved into the Services tab's own
        // Institution section instead (see CorrespondentDashboard.tsx).
        ...((isAlumni || isAdvisorOnly || isCorrespondent) && {
          tabBarButton: () => null,
          tabBarItemStyle: { display: "none" as const },
        }),
        tabBarStyle: tabBarStyleForRoute(route, insets.bottom),
        // Storefront outline - the original icon design for this tab (see
        // TAB_ICON_SIZE's own comment).
        tabBarIcon: ({ color }) => <Ionicons name="storefront-outline" size={TAB_ICON_SIZE} color={color} />,
      })}
    />
  );

  const erpTab = (
    <Tabs.Screen
      key="erp"
      name="erp"
      options={({ route }) => ({
        // Renamed for every login - the old Class tab (academics/) is now
        // hidden for every role that has one (employee/hod/hr-payroll/
        // parent/principal), with its features moved into this tab's own
        // grid instead, so "Class" is the more accurate label for them.
        // Students get "Progress" instead - their Attendance/Performance/
        // Fees stat cards plus the Requests (Leave/OD/Bonafide) section
        // (see StudentDashboard.tsx). Parent gets "Progress" too - the same
        // Attendance/Performance/Fees concept, just viewed for their child
        // (see ParentDashboard.tsx). HOD acting as HOD gets "Student"
        // instead - this tab's root renders the new 4-card Student screen
        // (see erp/index.tsx) rather than HodDashboard in that mode.
        // Principal/Correspondent get "College" instead of "Services" -
        // same tab/content, renamed per explicit request.
        title: isHodActingAsHod
          ? "Student"
          : isStudent || isParent
            ? "Progress"
            : isPrincipal || isCorrespondent
              ? "College"
              : isHrPayroll
                ? "Services"
                : "Class",
        // Alumni has no self-service OD/Leave/Library grid anymore -
        // Performance/Exam schedule moved to their own Campus tab instead
        // (see AcademicsChooserScreen.tsx).
        ...(isAlumni && {
          tabBarButton: () => null,
          tabBarItemStyle: { display: "none" as const },
        }),
        // Advisor mode keeps the shared Tabs header permanently off for the
        // whole Class tab (root AND every pushed sub-screen) instead of
        // toggling it per-screen via navigation.getParent().setOptions() -
        // every screen in that subtree (AdvisorClassScreen/
        // AdvisorAcademicsScreen/MenteeSubjectRecordsScreen/...) renders its
        // own header inline instead. Toggling per-screen was observed
        // showing two headers at once for a screen pushed two levels deep
        // (Academics -> Subject Records/No Due) - each screen's own
        // blur/focus-cleanup pair raced against the next screen's, and the
        // shared header sometimes ended up shown again. A single static
        // "always off" here has no race to lose.
        ...((isAdvisorOnly || isHodActingAsHod) && { headerShown: false }),
        tabBarStyle: tabBarStyleForRoute(route, insets.bottom),
        // HOD acting as HOD ("Student" label) gets the people outline glyph
        // - same icon Principal's own Students page tile uses (see
        // PrincipalDashboard.tsx's peopleItems), per explicit request. HR
        // Payroll ("Services") keeps the original graduation-cap glyph,
        // unchanged. Everyone else who reaches this tab as "Class"/
        // "Services" (Employee/Faculty/Subject-handling faculty, HOD acting
        // as Faculty via actsAsEmployee, Principal, Correspondent) gets the
        // school outline glyph instead - the same icon Student's own
        // Academics tab uses, per explicit request that these match it.
        // Student/Parent ("Progress" label) get the stats-chart outline
        // glyph, unchanged - this is itself the reference icon backing the
        // "Progress" glyph request above.
        tabBarIcon: ({ color, size }) =>
          isHodActingAsHod ? (
            // "Student" tab - school glyph (was "people-outline", too easy
            // to confuse at a glance with the Faculty tab's own people-style
            // icon below - per explicit request to make the two distinct).
            <Ionicons name="school-outline" size={TAB_ICON_SIZE} color={color} />
          ) : isHrPayroll ? (
            <FontAwesome6 name="graduation-cap" size={size} color={color} />
          ) : actsAsEmployee || isPrincipal || isCorrespondent ? (
            <Ionicons name="school-outline" size={TAB_ICON_SIZE} color={color} />
          ) : (
            <Ionicons name="stats-chart-outline" size={TAB_ICON_SIZE} color={color} />
          ),
      })}
    />
  );

  const academicsTab = (
    <Tabs.Screen
      key="academics"
      name="academics"
      options={({ route }) => {
        // This is the academics/ route (Academics chooser -> Current
        // Semester/Placements cards for students; Faculty self-service
        // Leave/OD/Payslip/Appraisal for Employee - see
        // AcademicsOverviewScreen.tsx). Labeled "Academics" for students,
        // "Progress" for Employee, "Campus" for alumni (the only other role
        // that keeps this tab) - separate from the erp/ tab (labeled
        // "Progress" for students, "Class" for everyone else).
        //
        // Every other role has this tab hidden: Correspondent has no
        // Timetable/Current-Semester/Online-Class screen at all (not
        // enrolled in or teaching a subject). HoD gets the same set from its
        // own dashboard's Student section (see hod/mockDashboard.ts's
        // studentSectionItems). Parent has Timetable/Calendar/Placements in
        // its own Quick Access section (parent/mockDashboard.ts).
        //
        // NOT using the `href: null` shortcut here - expo-router's Tabs
        // only applies that shortcut when a Screen's `options` is a plain
        // object (see node_modules/expo-router/build/layouts/TabsClient.js:
        // `typeof screen.options !== 'function'`), and this one has to be
        // a function to compute tabBarStyle/tabBarIcon per route. With a
        // function, `href: null` is silently ignored. Setting
        // tabBarButton/tabBarItemStyle directly is what the shortcut does
        // internally anyway, and it works from inside a function.
        // HOD keeps this tab visible in BOTH modes now (relabeled "Faculty"
        // or "Progress" - see title below), unlike every other role in this
        // OR list, which still hides it outright. HR Payroll and Principal
        // keep it visible too now, both relabeled "Progress" (their own
        // dedicated self-service tabs - see HrPayrollProgressScreen.tsx and
        // PrincipalProgressScreen.tsx), instead of hidden with their content
        // folded into a single Class-tab dashboard the way it used to be.
        const hideTab = isCorrespondent || isParent || isAdvisorOnly;
        return {
          title: isHodActingAsHod
            ? "Faculty"
            : isStudent
              ? "Academics"
              : actsAsEmployee || isHrPayroll || isPrincipal
                ? "Progress"
                : "Campus",
          ...(hideTab && {
            tabBarButton: () => null,
            tabBarItemStyle: { display: "none" as const },
          }),
          // Same static "always off, every screen renders its own header
          // inline" approach as the erp tab's isAdvisorOnly - see that
          // tab's identical comment for why the alternative (per-screen
          // getParent().setOptions() toggling) showed two headers at once
          // for a screen pushed two levels deep.
          ...(isHodActingAsHod && { headerShown: false }),
          tabBarStyle: tabBarStyleForRoute(route, insets.bottom),
          // HOD acting as HOD ("Faculty" label) gets the briefcase outline
          // glyph (was "people-circle-outline", too easy to confuse at a
          // glance with the Student tab's own school glyph's original
          // people-outline icon - per explicit request to make the two
          // distinct). HR Payroll ("Progress") keeps the original
          // Buildings glyph, unchanged. Employee/Faculty/Subject-handling
          // faculty (via actsAsEmployee) and Principal ("Progress" too) get
          // the stats-chart outline glyph instead - the same icon Student's
          // own Progress tab uses, per explicit request that these match
          // it. Student ("Academics") and Alumni ("Campus") get the school
          // outline glyph, unchanged - this is itself the reference icon
          // backing the "Progress"/"Class" glyph requests above.
          tabBarIcon: ({ color, size }) =>
            isHodActingAsHod ? (
              <Ionicons name="briefcase-outline" size={TAB_ICON_SIZE} color={color} />
            ) : isHrPayroll ? (
              <BuildingsLightIcon size={size * TAB_ICON_SVG_SCALE} color={color} />
            ) : actsAsEmployee || isPrincipal ? (
              <Ionicons name="stats-chart-outline" size={TAB_ICON_SIZE} color={color} />
            ) : (
              <Ionicons name="school-outline" size={TAB_ICON_SIZE} color={color} />
            ),
        };
      }}
    />
  );

  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        header: () => <CollegeHeader />,
        tabBarActiveTintColor: "#1E3A8A",
        tabBarInactiveTintColor: "#8E8E93",
        // Each tab's own `title` (set per Tabs.Screen below) renders as a
        // text label under its icon.
        tabBarShowLabel: true,
        // Explicit equal-width flex item for every VISIBLE tab (a hidden
        // tab's own `tabBarItemStyle: { display: "none" }`, set per-screen
        // below, fully replaces this default rather than merging with it -
        // so this only ever applies to tabs actually shown) - keeps
        // whatever's visible evenly spaced and centered across the bar's
        // full width on any device, whether that's all 5 tabs or a role
        // with fewer (e.g. Parent's 3).
        tabBarItemStyle: { flex: 1, alignItems: "center", justifyContent: "center" },
      }}
    >
      <Tabs.Screen
        name="home"
        options={({ route }) => ({
          title: "Home",
          tabBarStyle: tabBarStyleForRoute(route, insets.bottom),
          // Home outline - the original icon design for this tab (see
          // TAB_ICON_SIZE's own comment).
          tabBarIcon: ({ color }) => <Ionicons name="home-outline" size={TAB_ICON_SIZE} color={color} />,
        })}
      />
      {/* Three-way order of academics/erp/amenity, per role - Home is
          always first and bus-tracking always last, but which of these
          three renders 2nd/3rd/4th changes by role:
            - student:              Academics, Campus(amenity), Progress(erp)
            - employee:             Class(erp), Campus(amenity), Progress(academics)
            - hr-payroll/principal: Services(erp), Campus(amenity), Progress(academics)
            - everyone else: academics (hidden for most, "Campus" for
              alumni), Class(erp), Amenity
          Three flat expression slots (never a Fragment wrapping more than
          one) - <Tabs> needs literal Tabs.Screen elements as its direct
          children to register/order them correctly; wrapping any of these
          in a single Fragment broke tab registration entirely (observed
          live as a scrambled tab order, falling back to whatever order the
          file-based routes resolved in). */}
      {isHodActingAsHod || isHrPayroll || isPrincipal
        ? erpTab
        : isStudent
          ? academicsTab
          : actsAsEmployee
            ? erpTab
            : academicsTab}
      {isHodActingAsHod
        ? academicsTab
        : isHrPayroll || isPrincipal || isStudent
          ? amenityTab
          : actsAsEmployee
            ? amenityTab
            : erpTab}
      {isHodActingAsHod
        ? amenityTab
        : isHrPayroll || isPrincipal
          ? academicsTab
          : isStudent
            ? erpTab
            : actsAsEmployee
              ? academicsTab
              : amenityTab}
      <Tabs.Screen
        name="bus-tracking"
        options={({ route }) => ({
          // Renamed "Hostel" for a hosteller student - same underlying
          // bus-tracking screen/content, just relabeled (a dedicated Hostel
          // page wasn't part of this rename). Every other role keeps "My Bus".
          title: isHosteller ? "Hostel" : "My Bus",
          // Alumni isn't tracking a campus bus anymore - Home + Campus are
          // the only 2 tabs alumni gets. A dayscholar student on their own
          // vehicle has no Bus/Hostel need either - down to 4 tabs total.
          // Advisor mode drops to Home + Class only (see isAdvisorOnly). HOD
          // acting as HOD drops to Home + Student + Faculty only (see
          // isHodActingAsHod). Correspondent drops to Home + Services only
          // (see amenityTab's identical comment above).
          ...((isAlumni || isDayscholarOwnVehicle || isAdvisorOnly || isHodActingAsHod || isCorrespondent) && {
            tabBarButton: () => null,
            tabBarItemStyle: { display: "none" as const },
          }),
          tabBarStyle: tabBarStyleForRoute(route, insets.bottom),
          // Bus outline - the original icon design for this tab (see
          // TAB_ICON_SIZE's own comment). A hosteller gets a bed icon
          // instead - this tab shows their Hostel services hub, not bus
          // tracking, for that case (see title above and
          // app/(tabs)/bus-tracking/index.tsx), so the icon should say
          // "Hostel" at a glance too, not still look like the bus tab.
          tabBarIcon: ({ color }) => (
            <Ionicons name={isHosteller ? "bed-outline" : "bus-outline"} size={TAB_ICON_SIZE} color={color} />
          ),
        })}
      />
    </Tabs>
  );
}
