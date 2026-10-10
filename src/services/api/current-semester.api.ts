import { apiClient } from "./client";

// Mirrors EOS-backend's GET /me/timetable (student-only, self-scoped to the
// caller's own class + its classes.current_semester - see
// EOS-backend/src/modules/faculty/timetable/timetable.service.ts
// findForStudent()). timetable_slots has no "room" column at all, so there
// is no real room to show per subject. course_type comes straight from the
// subjects table ('PRACTICAL'/'THEORY_WITH_PRACTICAL' = a lab period) - real
// data, not client-side guessing.
export type MyTimetableSlot = {
  period_number: number;
  start_time: string;
  end_time: string;
  subject: { id: number; name: string; subject_code: string; course_type: string | null };
  faculty: { id: number; name: string };
};

export type MyTimetableDay = {
  day_of_week: number;
  slots: MyTimetableSlot[];
};

// total_periods is the institution-wide period_timings count (excluding
// breaks) - the same every day, since period_timings has no day_of_week
// column - used for the Timetable screen's "Free" summary card
// (total_periods - that day's slots.length).
export type MyTimetable = {
  total_periods: number;
  days: MyTimetableDay[];
};

export async function getMyTimetable(): Promise<MyTimetable> {
  const { data } = await apiClient.get<{ data: MyTimetable }>("/me/timetable");
  return data.data;
}

// GET /me/faculty-timetable (Faculty/HoD) - see
// EOS-backend/src/modules/faculty/timetable/timetable.service.ts
// findFullWeekForFaculty(). GET /me/timetable above is student-only
// (@Roles(ROLES.STUDENT)); this is the separate faculty/HoD self-scoped
// equivalent, returning the exact same MyTimetable shape so it's a drop-in
// for the shared TimetableScreen.
export async function getMyTimetableAsFaculty(): Promise<MyTimetable> {
  const { data } = await apiClient.get<{ data: MyTimetable }>("/me/faculty-timetable");
  return data.data;
}

// GET /me/classes/today (Faculty/HoD) - see
// EOS-backend/src/modules/faculty/timetable/timetable.service.ts
// findTodayForFaculty(). Unlike MyTimetableSlot above, each row here
// includes subject_id/class_id - needed for the Online Class "Start"
// action (POST /online-classes/start), which getMyTimetableAsFaculty()'s
// shape can't provide.
export type MyTodayClassSlot = {
  id: number;
  period_number: number;
  start_time: string;
  end_time: string;
  subject_id: number;
  subject_name: string;
  subject_code: string;
  course_type: string | null;
  class_id: number;
  class_section: string;
  semester: number | null;
  department_name: string;
};

export async function getMyClassesToday(): Promise<MyTodayClassSlot[]> {
  const { data } = await apiClient.get<{ data: MyTodayClassSlot[] }>("/me/classes/today");
  return data.data;
}

// GET /me/lms-notes?subject_id= is a shared Faculty/Student read (see
// EOS-backend/src/modules/faculty/lms-notes/lms-notes.controller.ts - the
// controller's own doc comments say "/lms-notes" but it's actually
// @Controller('me') + @Get('lms-notes'), so the real path is /me/lms-notes;
// confirmed live, the bare /lms-notes path 404s). Only the pagination total
// is needed here, not the actual note rows.
export async function getLmsNoteCountForSubject(subjectId: number): Promise<number> {
  const { data } = await apiClient.get<{ data: { meta: { total: number } } }>("/me/lms-notes", {
    params: { subject_id: subjectId, limit: 1 },
  });
  return data.data.meta.total;
}

// GET /me/profile for class_section + current_semester - see
// EOS-backend/src/modules/admissions/students/me-profile/me-profile.service.ts.
// current_semester is the student's own classes.current_semester (their real
// current semester, e.g. 7) - this is the one place that number can be
// resolved from, since a student's own semester range isn't exposed
// anywhere else.
export type MyClassSection = {
  class_section: string | null;
  current_semester: number | null;
  department_code: string | null;
};

export async function getMyClassSection(): Promise<MyClassSection> {
  const { data } = await apiClient.get<{ data: MyClassSection }>("/me/profile");
  return {
    class_section: data.data.class_section,
    current_semester: data.data.current_semester,
    department_code: data.data.department_code,
  };
}

// GET /me/current-semester (Faculty/HoD) - see
// EOS-backend/src/modules/faculty/timetable/timetable.service.ts
// getCurrentSemesterForFaculty(). One row per (subject, class) combo the
// faculty teaches for their most recent academic_year - unlike a student, a
// faculty member can teach the same subject to several sections at once, so
// this is intentionally NOT deduplicated by subject_id.
export type MyFacultySubject = {
  subject_id: number;
  subject_code: string;
  subject_name: string;
  class_id: number;
  section: string;
  semester: number | null;
  department_code: string | null;
  hours_per_week: number;
  tasks: number;
  materials: number;
};

export type MyFacultyCurrentSemester = {
  academic_year: string | null;
  subjects: MyFacultySubject[];
};

export async function getMyCurrentSemesterAsFaculty(): Promise<MyFacultyCurrentSemester> {
  const { data } = await apiClient.get<{ data: MyFacultyCurrentSemester }>("/me/current-semester");
  return data.data;
}
