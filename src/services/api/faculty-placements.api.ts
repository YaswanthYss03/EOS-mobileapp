import { apiClient } from "./client";
import type { ApplicationStatus } from "./placements.api";

// Mirrors EOS-backend's placement/drives module faculty (mentor) view - see
// EOSbackend1/src/modules/placement/drives/{drives.service,me-drives.controller}.ts.
// Distinct from @/services/api/placements.api.ts (the student's own
// self-service view): a faculty isn't an applicant on any drive, so
// "Upcoming Drives" here has no per-application status at all - just the
// drive itself. "History" is scoped through class_mentors: the faculty
// picks one of their mentees, then sees that student's own placement
// history (same status vocabulary as the student's own view).

export type UpcomingDrive = {
  drive_id: number;
  company_name: string;
  company_profile_info: string | null;
  scheduled_date: string;
  is_disclosed: boolean;
  disclosed_reveal_date: string | null;
};

export type MentoredStudent = {
  student_id: number;
  student_id_no: string;
  name: string;
  section: string | null;
  department_name: string | null;
};

export type DriveHistoryItem = {
  drive_id: number;
  company_name: string;
  scheduled_date: string;
  drive_status: string;
  application_status: ApplicationStatus;
  last_cleared_round: number | null;
};

export async function getUpcomingDrivesForFaculty(): Promise<UpcomingDrive[]> {
  const { data } = await apiClient.get<{ data: UpcomingDrive[] }>("/me/upcoming-drives");
  return data.data;
}

export async function getMentoredStudents(): Promise<MentoredStudent[]> {
  const { data } = await apiClient.get<{ data: MentoredStudent[] }>("/me/mentored-students");
  return data.data;
}

export async function getStudentPlacementHistory(studentId: number): Promise<DriveHistoryItem[]> {
  const { data } = await apiClient.get<{ data: DriveHistoryItem[] }>(
    `/me/mentored-students/${studentId}/placement-history`,
  );
  return data.data;
}
