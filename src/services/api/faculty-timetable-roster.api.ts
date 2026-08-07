import { apiClient } from "./client";

// Backs the HR/HoD "faculty timetable" roster (browse by department, then by
// faculty) - distinct from the self-scoped GET /me/faculty-timetable used by
// the faculty/HoD's own Timetable screen. See EOS-backend's
// src/modules/faculty/timetable/timetable.service.ts (listDepartmentsWithClasses,
// listFacultyInDepartment, getFullWeekForFacultyId) and
// me-faculty-timetable-roster.controller.ts.

export type TimetableDepartmentClass = {
  id: number;
  section: string;
  current_semester: number | null;
};

export type TimetableDepartment = {
  id: number;
  name: string;
  code: string;
  classes: TimetableDepartmentClass[];
};

export async function listTimetableDepartments(): Promise<TimetableDepartment[]> {
  const { data } = await apiClient.get<{ data: TimetableDepartment[] }>("/me/timetable-departments");
  return data.data;
}

export type TimetableRosterFaculty = {
  id: number;
  first_name: string;
  last_name: string;
  designation: string;
};

export async function listFacultyInDepartment(departmentId: number): Promise<TimetableRosterFaculty[]> {
  const { data } = await apiClient.get<{ data: TimetableRosterFaculty[] }>(
    `/me/timetable-departments/${departmentId}/faculty`,
  );
  return data.data;
}

// timetable_slots has no room column, so a "class" period's location is
// only ever the class's section + department - never a fabricated room.
export type FacultyTimetablePeriod =
  | {
      period_number: number;
      start_time: string;
      end_time: string;
      kind: "class";
      subject: { id: number; name: string; subject_code: string };
      class: { id: number; section: string; department: { id: number; name: string; code: string } };
    }
  | {
      period_number: number;
      start_time: string;
      end_time: string;
      kind: "free";
    };

export type FacultyTimetableDay = {
  day_of_week: number;
  periods: FacultyTimetablePeriod[];
};

export type FacultyTimetableRoster = {
  faculty: TimetableRosterFaculty;
  total_periods_per_week: number;
  // null whenever the faculty's real periods span more than one distinct
  // (academic_year, semester) at once - not fabricated to a single value.
  semester: number | null;
  academic_year: string | null;
  days: FacultyTimetableDay[];
};

export async function getFacultyTimetableRoster(facultyId: number): Promise<FacultyTimetableRoster> {
  const { data } = await apiClient.get<{ data: FacultyTimetableRoster }>(
    `/me/faculty-timetable-roster/${facultyId}`,
  );
  return data.data;
}
