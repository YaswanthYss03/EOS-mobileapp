import { apiClient } from "./client";

// Mirrors EOS-backend's GET /me/timetable (student-only, self-scoped to the
// caller's own class + its classes.current_semester - see
// EOS-backend/src/modules/faculty/timetable/timetable.service.ts
// findForStudent()). timetable_slots has no "room" column at all, so there
// is no real room to show per subject.
export type MyTimetableSlot = {
  period_number: number;
  start_time: string;
  end_time: string;
  subject: { id: number; name: string; subject_code: string };
  faculty: { id: number; name: string };
};

export type MyTimetableDay = {
  day_of_week: number;
  slots: MyTimetableSlot[];
};

export async function getMyTimetable(): Promise<MyTimetableDay[]> {
  const { data } = await apiClient.get<{ data: { days: MyTimetableDay[] } }>("/me/timetable");
  return data.data.days;
}

// GET /me/faculty-timetable (Faculty/HoD) - see
// EOS-backend/src/modules/faculty/timetable/timetable.service.ts
// findFullWeekForFaculty(). GET /me/timetable above is student-only
// (@Roles(ROLES.STUDENT)); this is the separate faculty/HoD self-scoped
// equivalent, returning the exact same MyTimetableDay[] shape so it's a
// drop-in for the shared TimetableScreen.
export async function getMyTimetableAsFaculty(): Promise<MyTimetableDay[]> {
  const { data } = await apiClient.get<{ data: { days: MyTimetableDay[] } }>("/me/faculty-timetable");
  return data.data.days;
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

// GET /me/profile only for class_section - see
// EOS-backend/src/modules/admissions/students/me-profile/me-profile.service.ts.
export async function getMyClassSection(): Promise<string | null> {
  const { data } = await apiClient.get<{ data: { class_section: string | null } }>("/me/profile");
  return data.data.class_section;
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
