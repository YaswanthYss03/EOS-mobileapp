import { useLocalSearchParams } from "expo-router";
import { FolderResourcesScreen } from "@/features/academics/lms/FolderResourcesScreen";

// Reached from the erp tab's own Current Semester/LMS copy (see
// app/(tabs)/erp/lms/[subjectId].tsx) - same screen as
// app/(tabs)/academics/lms/folder/[folderId].tsx, just living in this tab's
// own stack so Employee/HoD never cross into the (hidden, for these roles)
// Academics tab.
export default function LmsFolderErpRoute() {
  const { folderId, title } = useLocalSearchParams<{ folderId: string; title?: string }>();
  return <FolderResourcesScreen folderId={Number(folderId)} title={title} />;
}
