import { useLocalSearchParams } from "expo-router";
import { TaskSubmissionsScreen } from "@/features/academics/lms/faculty/TaskSubmissionsScreen";

export default function LmsTaskRoute() {
  const { taskId, title } = useLocalSearchParams<{ taskId: string; title?: string }>();
  return <TaskSubmissionsScreen taskId={Number(taskId)} title={title} />;
}
