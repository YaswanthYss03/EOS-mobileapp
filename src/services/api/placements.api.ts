import { apiClient } from "./client";

// Mirrors EOS-backend's placement/drives module (see
// EOSbackend1/src/modules/placement/drives/drives.service.ts,
// getUpcomingForStudent/getHistoryForStudent). The real schema has no
// package/CTC column on placement_drives or companies, and no per-round
// name (just a coarse drive_application_status_enum: applied/r1_cleared/
// r2_cleared/r3_cleared/rejected/placed) - so this module doesn't invent a
// salary figure or a named round checklist the backend can't back up.
//
// "Upcoming" vs "History" is split by the student's OWN outcome
// (student_drive_applications.status), not the drive's institution-wide
// status - a drive stays "scheduled" even after individual students have
// been marked placed/rejected on it, so the drive-level status alone can't
// tell upcoming from decided for a given student.

export type ApplicationStatus = "applied" | "r1_cleared" | "r2_cleared" | "r3_cleared" | "rejected" | "placed";

export type UpcomingDrive = {
  drive_id: number;
  company_name: string;
  company_profile_info: string | null;
  scheduled_date: string;
  is_disclosed: boolean;
  disclosed_reveal_date: string | null;
  application_status: ApplicationStatus;
};

export type DriveHistoryItem = {
  drive_id: number;
  company_name: string;
  scheduled_date: string;
  drive_status: string;
  application_status: ApplicationStatus;
  // Highest round ever cleared (1-3), tracked independently of
  // application_status so it survives a later transition to "rejected" -
  // null means rejected/placed without ever clearing a round.
  last_cleared_round: number | null;
};

export async function getUpcomingDrives(): Promise<UpcomingDrive[]> {
  const { data } = await apiClient.get<{ data: UpcomingDrive[] }>("/drives/student/upcoming");
  return data.data;
}

export async function getDriveHistory(): Promise<DriveHistoryItem[]> {
  const { data } = await apiClient.get<{ data: DriveHistoryItem[] }>("/drives/student/history");
  return data.data;
}
