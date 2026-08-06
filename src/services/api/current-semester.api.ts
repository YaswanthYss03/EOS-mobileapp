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
