import { apiClient } from "./client";
import type { ApplicationStatus } from "./placements.api";

// Mirrors EOS-backend's placement/drives module faculty/HoD (mentor) view -
// see EOSbackend1/src/modules/placement/drives/{drives.service,me-drives.controller}.ts.
// Distinct from @/services/api/placements.api.ts (the student's own
// self-service view): neither role is an applicant on any drive, so
// "Upcoming Drives" here has no per-application status at all - just the
// drive itself (shared by both roles - GET /me/upcoming-drives).
// "History" is scoped differently per role, though the shape returned is
// identical (see MentoredStudent/DriveHistoryItem below, reused for both):
//  - Faculty: through class_mentors - the faculty picks one of their
//    mentees, then sees that student's own placement history.
//  - HoD: through the HoD's own department_id - every student in every
//    class of the department, not just ones the HoD personally mentors.

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

// ───────────────────────────── HoD (department) view ─────────────────────────────
// Same MentoredStudent/DriveHistoryItem shapes as the faculty mentor view
// above - only the backend scoping differs (department_id, not
// class_mentors) - see GET /me/department-students[/:studentId/placement-history].

export type DepartmentClass = {
  class_id: number;
  section: string;
  semester: number | null;
  batch_name: string;
  course_name: string;
  course_code: string;
};

// For the History tab's class selector - most recent batch first (see
// DrivesService.getDepartmentClasses).
export async function getDepartmentClasses(): Promise<DepartmentClass[]> {
  const { data } = await apiClient.get<{ data: DepartmentClass[] }>("/me/department-classes");
  return data.data;
}

// classId narrows the list down to one class (from the selector above) -
// omit it to get every student across the whole department, as before.
export async function getDepartmentStudents(classId?: number): Promise<MentoredStudent[]> {
  const { data } = await apiClient.get<{ data: MentoredStudent[] }>("/me/department-students", {
    params: classId ? { class_id: classId } : undefined,
  });
  return data.data;
}

export async function getDepartmentStudentPlacementHistory(studentId: number): Promise<DriveHistoryItem[]> {
  const { data } = await apiClient.get<{ data: DriveHistoryItem[] }>(
    `/me/department-students/${studentId}/placement-history`,
  );
  return data.data;
}
