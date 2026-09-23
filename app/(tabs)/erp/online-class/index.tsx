import { OnlineClassScreen } from "@/features/academics/online-class/OnlineClassScreen";

// Reached from the Employee/HoD dashboard's Quick Access tile (Subject
// Handling Faculty's Campus/Student modules - see
// accountModeStudentModules.ts), not the Academics tab - see
// app/(tabs)/erp/timetable/index.tsx's identical comment for why this needs
// its own copy of the route: that tab is hidden entirely for these roles,
// and crossing into a hidden tab left the Tabs navigator's own back-stack
// corrupted (switching tabs afterward force-exited the app). Same
// screen/component either way - see OnlineClassScreen's own `basePath`
// logic for how its internal join/call navigation stays inside whichever
// tab it was reached from.
export default function OnlineClassErpRoute() {
  return <OnlineClassScreen />;
}
