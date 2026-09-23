import { useLocalSearchParams } from "expo-router";
import { TaskSubmissionsScreen } from "@/features/academics/lms/faculty/TaskSubmissionsScreen";

// Reached from the erp tab's own Current Semester/LMS copy (see
// app/(tabs)/erp/lms/[subjectId].tsx) - same screen as
// app/(tabs)/academics/lms/task/[taskId].tsx, just living in this tab's own
// stack so Employee/HoD never cross into the (hidden, for these roles)
// Academics tab.
export default function LmsTaskErpRoute() {
  const { taskId, title } = useLocalSearchParams<{ taskId: string; title?: string }>();
  return <TaskSubmissionsScreen taskId={Number(taskId)} title={title} />;
}
