import { Tabs, Redirect } from "expo-router";
import { getFocusedRouteNameFromRoute, type RouteProp } from "@react-navigation/native";
import { Ionicons, FontAwesome6 } from "@expo/vector-icons";
import { BuildingsLightIcon } from "@/components/icons/BuildingsLightIcon";
import { CollegeHeader } from "@/components/layout/CollegeHeader";
import { useAuth } from "@/context/AuthContext";
import { useRole } from "@/hooks/useRole";

// Every tab (home/academics/erp/amenity/bus-tracking) is itself a Stack of
// many sub-pages (see each one's own _layout.tsx) - the bottom tab bar
// should only show on that Stack's own root ("index"), not on any pushed
// sub-page, regardless of which of the 5 tabs it is or how deep that
// sub-page's route is. getFocusedRouteNameFromRoute reads the *immediate*
// child route name within one tab's Stack (e.g. "student-attendance" for
// app/(tabs)/erp/student-attendance/index.tsx), which is exactly the "am I
// still on this tab's own index screen" check - it does not require
// touching any of those many sub-pages individually.
function tabBarStyleForRoute(route: RouteProp<Record<string, object | undefined>, string>) {
  const focusedRouteName = getFocusedRouteNameFromRoute(route) ?? "index";
  return focusedRouteName === "index" ? undefined : { display: "none" as const };
}

// TODO: hide the ERP tab entirely for roles with no ERP access (see src/navigation/rbac)
export default function TabsLayout() {
  const { token, isLoading } = useAuth();
  const role = useRole();
  const isPrincipal = role === "principal";
  // "employee" covers faculty as well as library/finance/academic_coordinator/
  // alumni (see useRole.ts's BACKEND_ROLE_MAP) - all of them share the one
  // EmployeeDashboard, which now also carries the moved-in academics/* tiles
  // (see mockDashboard.ts's studentSectionItems), so hiding this tab for the
  // whole "employee" bucket doesn't strand any of them.
  const isEmployee = role === "employee";
  // HoD has its own separate Role value/dashboard (HodDashboard) - same
  // moved-in tiles now live in its own studentSectionItems too (see
  // src/features/erp/hod/data/mockDashboard.ts).
  const isHod = role === "hod";
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

  // Normally app/index.tsx already routes signed-out users to login before
  // they ever reach here, but this guards direct/back navigation into (tabs)
  // too (e.g. after a 401 forces a logout while already on a tab screen).
  if (isLoading) return null;
  if (!token) return <Redirect href="/(auth)/login" />;

  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        header: () => <CollegeHeader />,
        tabBarActiveTintColor: "#1E3A8A",
        tabBarInactiveTintColor: "#8E8E93",
        // Icons only, no text label under each tab.
        tabBarShowLabel: false,
      }}
    >
      <Tabs.Screen
        name="home"
        options={({ route }) => ({
          title: "Home",
          tabBarStyle: tabBarStyleForRoute(route),
          // react-icons (HiOutlineHome/PiBuildingsLight/LuGraduationCap/
          // FaBusSimple) is a web-only (react-dom/SVG) library and can't run
          // in React Native - FontAwesome6 (already bundled in
          // @expo/vector-icons, used elsewhere in this app) is the closest
          // equivalent actually available on-device. Its free glyph set only
          // ships a "solid" weight for these particular icons (no
          // light/regular variant), so focus state is color-only here rather
          // than a weight/outline swap like the other tabs still use.
          tabBarIcon: ({ color, size }) => <FontAwesome6 name="house" size={size} color={color} />,
        })}
      />
      <Tabs.Screen
        name="erp"
        options={({ route }) => ({
          // Renamed for every login - the old Class tab (academics/) is now
          // hidden for every role that has one (employee/hod/hr-payroll/
          // parent/principal), with its features moved into this tab's own
          // grid instead, so "Class" is the more accurate label everywhere
          // now. Students are the one exception - see the academics/ tab
          // below, brought back as their own "Campus" tab.
          title: "Class",
          tabBarStyle: tabBarStyleForRoute(route),
          // The exact PiBuildingsLight (Phosphor "Buildings", light weight)
          // glyph, rendered from its own SVG path via react-native-svg -
          // see BuildingsLightIcon's doc comment for why react-icons itself
          // (a web-only/react-dom package) can't be used directly here.
          tabBarIcon: ({ color, size }) => <BuildingsLightIcon size={size} color={color} />,
        })}
      />
      <Tabs.Screen
        name="academics"
        options={({ route }) => {
          // This is the academics/ route (Academics chooser -> Current
          // Semester/Timetable/Calendar/Daily Task/Online Class, plus
          // Placements). Labeled "Campus" and shown ONLY for students - it's
          // their own dedicated tab (see AcademicsChooserScreen's "Edu"
          // header), separate from the erp/ tab above (labeled "Class",
          // their OD/Leave/Library/etc self-service tiles).
          //
          // Every other role still has this tab hidden: Principal has no
          // Timetable/Current-Semester/Online-Class screen at all (not
          // enrolled in or teaching a subject) and gets Calendar/Placements
          // from its own ERP dashboard sections instead (see
          // PrincipalDashboard.tsx). Faculty ("employee" - see useRole.ts)
          // and HoD get the same set from their own dashboard's Student
          // section (see employee/hod mockDashboard.ts's studentSectionItems).
          // HR Payroll's Academics chooser only ever had Timetable + Calendar,
          // both already in its own Employee section (see hr-payroll/
          // mockDashboard.ts). Parent has Timetable/Calendar/Placements in
          // its own Quick Access section (parent/mockDashboard.ts) - those
          // routes already render parent-specific screens for that role.
          //
          // NOT using the `href: null` shortcut here - expo-router's Tabs
          // only applies that shortcut when a Screen's `options` is a plain
          // object (see node_modules/expo-router/build/layouts/TabsClient.js:
          // `typeof screen.options !== 'function'`), and this one has to be
          // a function to compute tabBarStyle/tabBarIcon per route. With a
          // function, `href: null` is silently ignored. Setting
          // tabBarButton/tabBarItemStyle directly is what the shortcut does
          // internally anyway, and it works from inside a function.
          const hideTab = isPrincipal || isEmployee || isHod || isHrPayroll || isParent;
          return {
            title: "Campus",
            ...(hideTab && {
              tabBarButton: () => null,
              tabBarItemStyle: { display: "none" as const },
            }),
            tabBarStyle: tabBarStyleForRoute(route),
            // Approximates LuGraduationCap (Lucide) - see the home tab's
            // comment on why react-icons itself isn't usable here.
            tabBarIcon: ({ color, size }) => <FontAwesome6 name="graduation-cap" size={size} color={color} />,
          };
        }}
      />
      <Tabs.Screen
        name="amenity"
        options={({ route }) => ({
          title: "Amenity",
          tabBarStyle: tabBarStyleForRoute(route),
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? "storefront" : "storefront-outline"} size={size} color={color} />
          ),
        })}
      />
      <Tabs.Screen
        name="bus-tracking"
        options={({ route }) => ({
          title: "My Bus",
          tabBarStyle: tabBarStyleForRoute(route),
          // Approximates FaBusSimple (react-icons/fa6) - the same icon
          // family, already bundled locally instead of via the web-only
          // react-icons package (see the home tab's comment above).
          tabBarIcon: ({ color, size }) => <FontAwesome6 name="bus-simple" size={size} color={color} />,
        })}
      />
    </Tabs>
  );
}
