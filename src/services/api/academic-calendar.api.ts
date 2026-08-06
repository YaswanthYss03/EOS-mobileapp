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
