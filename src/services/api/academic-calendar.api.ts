import { apiClient } from "./client";

// Mirrors EOS-backend's GET /me/academic-calendar (student-only, self-scoped
// via class_id -> classes.batch_id/current_semester -> academic_calendars ->
// calendar_events - see
// EOS-backend/src/modules/admissions/students/me-profile/me-academic-calendar.service.ts).
// event_type is only ever "holiday" or "event" - there is no "review"/"exam"
// category anywhere in the schema.
export type CalendarEventType = "holiday" | "event";

export type MyCalendarEvent = {
  id: number;
  event_date: string;
  event_type: CalendarEventType;
  title: string;
  description: string | null;
};

export type MyAcademicCalendar = {
  semester: number | null;
  start_date: string | null;
  end_date: string | null;
  events: MyCalendarEvent[];
};

export async function getMyAcademicCalendar(): Promise<MyAcademicCalendar> {
  const { data } = await apiClient.get<{ data: MyAcademicCalendar }>("/me/academic-calendar");
  return data.data;
}

// GET /me/faculty-academic-calendar (Faculty/HoD) - see
// EOS-backend/src/modules/faculty/timetable/timetable.service.ts
// getMergedAcademicCalendarForFaculty(). GET /me/academic-calendar above is
// student-only; a faculty member can teach into several distinct
// (batch, semester) calendars at once, so this merges all of them into one
// deduped events list. `semester` is only a single number when every
// resolved calendar shares it - otherwise null (same MyAcademicCalendar
// shape, so this is a drop-in for the shared AcademicCalendarScreen).
export async function getMyAcademicCalendarAsFaculty(): Promise<MyAcademicCalendar> {
  const { data } = await apiClient.get<{ data: MyAcademicCalendar }>("/me/faculty-academic-calendar");
  return data.data;
}

// GET /me/academic-calendar-institution (HoD/HR Payroll) - see
// EOS-backend's TimetableService.getInstitutionAcademicCalendar(). HR
// Payroll has no "own" batch/semester to scope a calendar to, so this
// merges every academic_calendars row institution-wide instead - same
// MyAcademicCalendar shape (semester is realistically always null here,
// since more than one semester's calendar exists at once institution-wide).
export async function getInstitutionAcademicCalendar(): Promise<MyAcademicCalendar> {
  const { data } = await apiClient.get<{ data: MyAcademicCalendar }>("/me/academic-calendar-institution");
  return data.data;
}
