import { useLocalSearchParams } from "expo-router";
import { HodFacultyFeedbackResultsScreen } from "@/features/erp/hod/HodFacultyFeedbackResultsScreen";

export default function HodFacultyFeedbackResultsRoute() {
  const { formId } = useLocalSearchParams<{ formId: string }>();
  return <HodFacultyFeedbackResultsScreen formId={Number(formId)} />;
}
