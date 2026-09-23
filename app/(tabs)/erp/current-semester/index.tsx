import { CurrentSemesterScreen } from "@/features/academics/current-semester/CurrentSemesterScreen";

// Reached from the Employee/HoD dashboard's Quick Access tile (Subject
// Handling Faculty's Campus/Student modules - see
// accountModeStudentModules.ts), not the Academics tab - see
// app/(tabs)/erp/timetable/index.tsx's identical comment for why this needs
// its own copy of the route (that tab is hidden entirely for these roles).
export default function CurrentSemesterErpRoute() {
  return <CurrentSemesterScreen />;
}
