import { useCallback } from "react";
import { View, Text, ScrollView, Pressable, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { fonts } from "@/theme";
import { hostelFormStyles } from "./hostelFormStyles";
import { HostelPageHeader } from "./HostelPageHeader";
import { HostelRoomCard } from "./HostelRoomCard";
import { useHostelRoom } from "./useHostelRoom";
import { WatermarkBackground } from "@/components/layout/WatermarkBackground";

type TileKey = "outing" | "leave" | "complaints" | "night-attendance";

const TILES: { key: TileKey; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: "outing", label: "Outing", icon: "walk-outline" },
  { key: "leave", label: "Leave", icon: "exit-outline" },
  { key: "complaints", label: "Complaints", icon: "construct-outline" },
  { key: "night-attendance", label: "Night attendance", icon: "moon-outline" },
];

// Hostel services hub - was previously one screen with Outing/Complaints/
// Mess feedback as in-page tabs (AnimatedTabBar + TabTransitionView); now a
// landing page with a tile per page, each its own separate screen
// (StudentHostelOutingScreen/StudentHostelLeaveScreen/
// StudentHostelComplaintsScreen/StudentHostelNightAttendanceScreen),
// matching how every other multi-page section of this app is a set of real
// pushed screens rather than an in-page switcher, per explicit request.
// Mess feedback moved out of this hub entirely - it's now one of the
// filter options on the Campus tab's single consolidated Feedback card
// (see AmenityServiceFeedbackScreen), alongside Academic/Course feedback
// and the original Campus service reviews. Reachable
// two ways: pushed from a tile (back button pops normally), or as the root
// of the bus-tracking tab itself for a hosteller (see
// app/(tabs)/bus-tracking/index.tsx, which replaces "My Bus" with this
// screen for that role).
//
// As the tab's own root, this now uses the same gradient
// header-with-back-arrow every other section (e.g. Academics) shows once
// you're a level in - bug fix: the bare CollegeHeader it used to swap in
// here looked identical to a bottom-tab root with nothing behind it, but
// wasn't actually one (there's real content, just no visual way back to
// Home). `onBack` goes to Home via `router.replace` rather than
// `router.back()` - same reasoning as StudentDashboard's own header, since
// there's nothing to pop at a tab's own root. Also decides which tab's own
// local route copy of the 5 sub-pages to push into (see basePath below -
// same erp-tab-local/bus-tracking-tab-local route-copy convention used
// elsewhere in this app, e.g. LmsSubjectScreen's lmsBasePath) so
// back-navigation from a sub-page stays inside whichever tab the hub was
// reached from.
export function StudentHostelScreen({ asTabRoot }: { asTabRoot?: boolean } = {}) {
  const navigation = useNavigation();
  const router = useRouter();
  const { status, room } = useHostelRoom();
  const basePath = asTabRoot ? "/(tabs)/bus-tracking" : "/(tabs)/erp/student-hostel";

  useFocusEffect(
    useCallback(() => {
      if (asTabRoot) {
        navigation.getParent()?.setOptions({
          headerShown: true,
          header: () => <HostelPageHeader title="Hostel" onBack={() => router.replace("/(tabs)/home")} />,
        });
      } else {
        navigation.getParent()?.setOptions({ headerShown: false });
      }
      // No cleanup - see PrincipalStudentsScreen.tsx's comment (this
      // screen's own sub-pages race this the same way).
      return undefined;
    }, [navigation, asTabRoot, router]),
  );

  return (
    <SafeAreaView style={hostelFormStyles.container} edges={[]}>
      <WatermarkBackground />
      {!asTabRoot && <HostelPageHeader title="Hostel services" onBack={() => router.back()} />}
      <ScrollView contentContainerStyle={hostelFormStyles.content} showsVerticalScrollIndicator={false}>
        <HostelRoomCard status={status} room={room} />
        <View style={styles.grid}>
          {TILES.map((tile) => (
            <Pressable
              key={tile.key}
              style={styles.tile}
              onPress={() => router.push(`${basePath}/${tile.key}` as never)}
            >
              <View style={styles.iconWrap}>
                <Ionicons name={tile.icon} size={24} color="#fff" />
              </View>
              <Text style={styles.tileLabel} numberOfLines={2}>
                {tile.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  tile: {
    width: "33.33%",
    alignItems: "center",
    gap: 4,
    paddingVertical: 6,
  },
  iconWrap: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#2F6FE0",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  tileLabel: {
    fontSize: 12,
    fontFamily: fonts.medium,
    color: "#333",
    textAlign: "center",
  },
});
