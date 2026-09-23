import { StudentLibraryScreen } from "@/features/erp/student-library/StudentLibraryScreen";

// Reached from the Campus tab's own grid (see AmenityHomeScreen.tsx's
// studentOptions), not the erp tab's copy of this route - a cross-tab push
// into the erp tab meant hardware back / swipe-back gestures (which pop
// within the CURRENT tab's own Stack, bypassing this screen's own back
// button entirely) landed on the Class tab instead of back to Campus. Same
// reasoning as medical-appointment/index.tsx's identical fix.
export default function LibraryAmenityRoute() {
  return <StudentLibraryScreen />;
}
