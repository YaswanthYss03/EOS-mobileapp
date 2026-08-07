import { apiClient } from "./client";
import type { MyAttendanceResponse } from "./attendance.api";
import type { ExamResultsResponse } from "./academics.api";
import type { MyFeesResponse } from "./fees.api";
import type { MyTimetableDay } from "./current-semester.api";
import type { MyAcademicCalendar } from "./academic-calendar.api";
import type { UpcomingDrive, DriveHistoryItem } from "./placements.api";

// Mirrors EOS-backend's parent-facing endpoints (see
// EOS-backend/src/modules/parents/parents.service.ts). A parent can be
// linked to more than one child (siblings) via parent_student_mapping, so
// this is always a list, never an assumed single student. Ownership of each
// child is enforced server-side (parent_student_mapping lookup) - a
// student_id the caller isn't actually linked to 403s as NOT_THIS_PARENT
// rather than ever being trusted from the client.
export type ParentChild = {
  id: number;
  name: string;
  student_id_no: string;
  roll_no: string | null;
  relationship: "father" | "mother" | "guardian";
  section: string | null;
  semester: number | null;
  department: { id: number; name: string; code: string } | null;
};

export async function listMyChildren(): Promise<ParentChild[]> {
  const { data } = await apiClient.get<{ data: ParentChild[] }>("/me/children");
  return data.data;
}

// Same response shape as getMyAttendance (student's own) - see attendance.api.ts.
export async function getChildAttendance(
  studentId: number,
  from: string,
  to: string,
  subjectId?: number,
): Promise<MyAttendanceResponse> {
  const { data } = await apiClient.get<{ data: MyAttendanceResponse }>(
    `/me/children/${studentId}/attendance`,
    { params: { from, to, ...(subjectId !== undefined ? { subject_id: subjectId } : {}) } },
  );
  return data.data;
}

// Same response shape as getMyExamResults (student's own) - see academics.api.ts.
export async function getChildPerformance(
  studentId: number,
  semester: number,
): Promise<ExamResultsResponse> {
  const { data } = await apiClient.get<{ data: ExamResultsResponse }>(
    `/me/children/${studentId}/performance`,
    { params: { semester } },
  );
  return data.data;
}

// Same response shape as getMyFees (student's own) - see fees.api.ts.
export async function getChildFees(studentId: number): Promise<MyFeesResponse> {
  const { data } = await apiClient.get<{ data: MyFeesResponse }>(`/me/children/${studentId}/fees`);
  return data.data;
}

// Same response shape as getMyTimetable (student's own) - see current-semester.api.ts.
export async function getChildTimetable(studentId: number): Promise<MyTimetableDay[]> {
  const { data } = await apiClient.get<{ data: { days: MyTimetableDay[] } }>(
    `/me/children/${studentId}/timetable`,
  );
  return data.data.days;
}

// Same response shape as getMyAcademicCalendar (student's own) - see academic-calendar.api.ts.
export async function getChildAcademicCalendar(studentId: number): Promise<MyAcademicCalendar> {
  const { data } = await apiClient.get<{ data: MyAcademicCalendar }>(
    `/me/children/${studentId}/academic-calendar`,
  );
  return data.data;
}

// Same response shape as getUpcomingDrives/getDriveHistory (student's own) - see placements.api.ts.
export async function getChildUpcomingDrives(studentId: number): Promise<UpcomingDrive[]> {
  const { data } = await apiClient.get<{ data: UpcomingDrive[] }>(
    `/me/children/${studentId}/upcoming-drives`,
  );
  return data.data;
}

export async function getChildPlacementHistory(studentId: number): Promise<DriveHistoryItem[]> {
  const { data } = await apiClient.get<{ data: DriveHistoryItem[] }>(
    `/me/children/${studentId}/placement-history`,
  );
  return data.data;
}
