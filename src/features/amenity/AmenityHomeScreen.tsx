import { useCallback } from "react";
import { View, Text, Pressable, StyleSheet, useWindowDimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { BackHeader } from "@/components/layout/BackHeader";
import { WatermarkBackground } from "@/components/layout/WatermarkBackground";
import { fonts } from "@/theme";
import { useRole } from "@/hooks/useRole";
import { useAuth } from "@/context/AuthContext";
import { toast } from "@/utils/toast";

type AmenityOption = {
  id: string;
  title: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  route:
    | "/(tabs)/amenity/craveo"
    | "/(tabs)/amenity/stationary"
    | "/(tabs)/amenity/stationery-store"
    | "/(tabs)/amenity/medical-appointment"
    | "/(tabs)/amenity/library"
    | "/(tabs)/amenity/service-feedback"
    | "/(tabs)/amenity/parent-craveo-history"
    | "/(tabs)/amenity/parent-library-history"
    | "/(tabs)/amenity/parent-medical-history"
    | "/(tabs)/amenity/parent-stationery-history"
    | "/(tabs)/amenity/parent-stationary-history"
    | "/(tabs)/amenity/parent-feedback"
    | "/(tabs)/amenity/hod-faculty-feedback"
    | null;
};

// Must match the grid/card styles' own paddingHorizontal/gap below - kept
// as named constants (not re-read from the style objects) since the width
// calc above needs the same numbers.
const GRID_HORIZONTAL_PADDING = 16;
const GRID_GAP = 16;

const options: AmenityOption[] = [
  {
    id: "craveo",
    title: "Craveo",
    description: "Order food from the campus canteen",
    icon: "fast-food-outline",
    route: "/(tabs)/amenity/craveo",
  },
  {
    id: "stationary",
    title: "Stationary",
    description: "Order stationery and supplies",
    icon: "book-outline",
    route: "/(tabs)/amenity/stationary",
  },
];

// Student's own "Campus" tab (this screen renamed for that role - see
// app/(tabs)/_layout.tsx) - Craveo/Stationary renamed, plus Library/Medical
// moved in from the Progress (erp) tab's own Requests section (see
// dashboardConfig.ts) - same routes/screens as before, just reachable from
// here now instead, not duplicated. "Feedback" here is the single
// consolidated Feedback card for every kind of feedback a student can
// give - Food Court/Medical/Library/Stationary/Copy Center service
// reviews, Hostel Mess feedback (moved in from the Hostel hub), and
// Academic/Course feedback (moved in from the Academics tab's "Current
// Semester" page) - all behind one filter on AmenityServiceFeedbackScreen,
// not three separate entry points.
const studentOptions: AmenityOption[] = [
  {
    id: "craveo",
    title: "Food Court",
    description: "Order food from the campus canteen",
    icon: "fast-food-outline",
    route: "/(tabs)/amenity/craveo",
  },
  {
    id: "library",
    title: "Library",
    description: "Book issues, returns and due dates",
    icon: "library-outline",
    // This tab's OWN local route copy (not the erp tab's) - see
    // app/(tabs)/amenity/library/index.tsx's comment for why.
    route: "/(tabs)/amenity/library",
  },
  {
    id: "medical",
    title: "Medical",
    description: "Book a medical appointment",
    icon: "medkit-outline",
    // This tab's OWN local route copy (not the erp tab's) - see
    // app/(tabs)/amenity/medical-appointment/index.tsx's comment for why:
    // reaching the erp-tab version cross-tab from here left its own back
    // button (and its date-drill-down push) popping into the erp tab's
    // Stack instead of back to Campus.
    route: "/(tabs)/amenity/medical-appointment",
  },
  {
    id: "copy-printer",
    title: "Copy Center",
    description: "Order stationery and supplies",
    icon: "book-outline",
    route: "/(tabs)/amenity/stationary",
  },
  {
    id: "stationary",
    title: "Stationery Store",
    description: "Notebooks, snacks, hostel & college essentials",
    icon: "cart-outline",
    route: "/(tabs)/amenity/stationery-store",
  },
  {
    id: "feedback",
    title: "Feedback",
    description: "Rate campus services",
    icon: "star-outline",
    route: "/(tabs)/amenity/service-feedback",
  },
];

// Parent's own "Campus" tab - same 5 services as the student list, plus
// Feedback, but every card here is a READ-ONLY history/orders view of the
// linked child's activity, not the student's own ordering/booking flow (a
// parent never places a food/stationery order, checks out a library book,
// or books a medical slot on the child's behalf) - deliberately separate
// screens from studentOptions' (see each Parent*HistoryScreen.tsx), not a
// role-branch bolted onto the student screens, per explicit request not to
// just clone the student UI. Feedback here is also its own form - feedback
// ABOUT the child or ABOUT the college, not a service star-rating (see
// ParentCampusFeedbackScreen.tsx).
const parentOptions: AmenityOption[] = [
  {
    id: "craveo",
    title: "Food Court",
    description: "Your child's order history",
    icon: "fast-food-outline",
    route: "/(tabs)/amenity/parent-craveo-history",
  },
  {
    id: "library",
    title: "Library",
    description: "Your child's borrow history",
    icon: "library-outline",
    route: "/(tabs)/amenity/parent-library-history",
  },
  {
    id: "medical",
    title: "Medical",
    description: "Your child's appointment history",
    icon: "medkit-outline",
    route: "/(tabs)/amenity/parent-medical-history",
  },
  {
    id: "copy-printer",
    title: "Copy Center",
    description: "Your child's print request history",
    icon: "book-outline",
    route: "/(tabs)/amenity/parent-stationary-history",
  },
  {
    id: "stationary",
    title: "Stationery Store",
    description: "Your child's order history",
    icon: "cart-outline",
    route: "/(tabs)/amenity/parent-stationery-history",
  },
  {
    id: "feedback",
    title: "Feedback",
    description: "Share feedback about your child or the college",
    icon: "star-outline",
    route: "/(tabs)/amenity/parent-feedback",
  },
];

// HOD acting as HOD's own Campus tab - just the one card. Not the
// Craveo/Library/Medical/Copy Center/Stationery set every other role here
// gets (none of that is HOD-relevant); HOD acting as FACULTY instead sees
// the normal actsAsEmployee-derived studentOptions below, unaffected.
const hodOptions: AmenityOption[] = [
  {
    id: "faculty-feedback",
    title: "Faculty Feedback",
    description: "Student feedback about your department's subject-handling faculty",
    icon: "chatbox-ellipses-outline",
    route: "/(tabs)/amenity/hod-faculty-feedback",
  },
];

// Placements/Higher Education/Entrepreneur used to live here as their own
// 3-card set - moved out to the Principal's own Services tab instead (see
// PrincipalDashboard.tsx's academicsItems, own erp-tab-local route copies)
// per explicit request, freeing this tab up to get the same faculty-style
// Campus design every other actsAsEmployee-style role already has (see
// visibleOptions below).

export function AmenityHomeScreen() {
  const router = useRouter();
  const role = useRole();
  const navigation = useNavigation();
  // Exact-fit 2-column card width, computed from the real screen width
  // instead of a percentage flexBasis - "45%" left an uneven leftover
  // sliver after the gap (since 45%+45%+16px gap doesn't sum to exactly
  // 100% of the row), which flexGrow:0 (needed so a lone odd-count last row
  // doesn't stretch) couldn't absorb, so it showed up as extra blank space
  // on the right of every row. This always sums to exactly the row's full
  // width on any device.
  const { width: windowWidth } = useWindowDimensions();
  const cardWidth = (windowWidth - GRID_HORIZONTAL_PADDING * 2 - GRID_GAP) / 2;
  // A HOD switched to "Faculty" view (see app/(tabs)/_layout.tsx's
  // isHodActingAsFaculty) still has role === "hod" (useRole() derives from
  // the real backend role, not activeAccountMode) - without this, their
  // Campus tab fell into the generic `options` (Craveo/Stationary only)
  // instead of the same subject-handling-faculty card set a genuine
  // Employee login sees. HR & Payroll's and Principal's own Campus tabs
  // (see app/(tabs)/_layout.tsx's isHrPayroll/isPrincipal) are designed to
  // match that same subject-handling-faculty set too, per explicit request
  // (Principal's Placements/Higher Education/Entrepreneur cards that used
  // to live here moved to the Services tab instead - see
  // PrincipalDashboard.tsx's academicsItems).
  const { activeAccountMode } = useAuth();
  const actsAsEmployee =
    role === "employee" ||
    role === "hr-payroll" ||
    role === "principal" ||
    (role === "hod" && activeAccountMode === "FACULTY");

  // Swaps the shared CollegeHeader (mounted at the Tabs level, see
  // app/(tabs)/_layout.tsx) for a plain "Amenity" + back button while this
  // screen is focused - same pattern as the ERP dashboards (see
  // DashboardHeader). Applies regardless of role - the principal branch
  // below only changes which cards render, not the header treatment. No
  // cleanup on blur: this screen pushes into many leaf screens (Craveo,
  // Stationary, Medical, Library, ...), each of which sets its own header
  // state on its own focus without ever touching this screen's - an
  // unconditional reset-on-blur here raced those focus effects (undefined
  // ordering between screens in the same Stack), intermittently leaving
  // the wrong header shown (see PrincipalStudentsScreen.tsx in
  // erp/principal/students for the identical bug and fix this mirrors).
  // Coming back here re-fires this effect regardless, so nothing is lost.
  useFocusEffect(
    useCallback(() => {
      navigation.getParent()?.setOptions({
        headerShown: true,
        header: () => (
          <BackHeader title="Sri Eshwar College of Engineering" onBack={() => router.replace("/(tabs)/home")} />
        ),
      });
      return undefined;
    }, [navigation, router]),
  );

  // Same bordered icon-card grid as AcademicsChooserScreen (Edu tab) -
  // requested to match that look rather than the old photo-cover cards.
  // One shared render for every role branch; only the option list differs.
  // Employee (faculty), HR Payroll, and Principal all see the same Campus
  // tab as students, per the Class tab's own bottom-nav rename (see
  // app/(tabs)/_layout.tsx) - minus Feedback, which is a student-only
  // self-service form with no faculty equivalent.
  const visibleOptions: AmenityOption[] =
    role === "student"
      ? studentOptions
      : role === "parent"
        ? parentOptions
        : role === "hod" && !actsAsEmployee
          ? hodOptions
          : actsAsEmployee
            ? studentOptions.filter((option) => option.id !== "feedback")
            : options;

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <WatermarkBackground />
      <View style={styles.grid}>
        {visibleOptions.map((option) => (
          <Pressable
            key={option.id}
            style={[styles.card, { width: cardWidth }]}
            onPress={() =>
              option.route ? router.push(option.route) : toast.info(`${option.title} is coming soon`)
            }
          >
            <View style={styles.iconWrap}>
              <Ionicons name={option.icon} size={26} color="#2F6FE0" />
            </View>
            <Text style={styles.cardTitle}>{option.title}</Text>
            <Text style={styles.cardDescription}>{option.description}</Text>
          </Pressable>
        ))}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: GRID_HORIZONTAL_PADDING,
    paddingTop: 16,
    gap: GRID_GAP,
  },
  card: {
    // Width is set inline per-render from the exact `cardWidth` calc above
    // (see that constant's own comment) - no flexBasis/flexGrow needed, an
    // explicit width can't leave leftover slack the way a percentage
    // flexBasis did.
    minHeight: 180,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#EEF0F4",
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
    paddingVertical: 20,
    gap: 4,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: 18,
    backgroundColor: "#EAF0FD",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontFamily: fonts.bold,
    color: "#111",
    textAlign: "center",
  },
  cardDescription: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: "#7A828E",
    textAlign: "center",
    marginTop: 2,
    lineHeight: 17,
  },
});
