import { apiClient } from "./client";

// Principal-only (also Academic Coordinator's original capability, now
// shared) full CRUD over academic_calendars/calendar_events, mirroring
// EOS-backend's academic-calendar + academic-calendar-events modules
// directly (see EOS-backend/src/modules/academic-structure/academic-calendar*).
// Unlike the read-only student-facing GET /me/academic-calendar, these hit
// the raw CRUD endpoints with an explicit batch_id/semester picked by the
// caller - there is no "current batch" for a Principal to default to.

export type AdminBatch = {
  id: number;
  name: string;
  start_year: number;
  end_year: number;
};

export async function listBatches(): Promise<AdminBatch[]> {
  const { data } = await apiClient.get<{ data: AdminBatch[] }>("/batches");
  return data.data;
}

export type AdminAcademicCalendar = {
  id: number;
  batch_id: number;
  semester: number;
  start_date: string;
  end_date: string;
  created_by_user_id: number;
};

/** GET /academic-calendar?batch_id=&semester= - at most one match (unique on the pair). */
export async function findAcademicCalendar(
  batchId: number,
  semester: number,
): Promise<AdminAcademicCalendar | null> {
  const { data } = await apiClient.get<{ data: AdminAcademicCalendar[] }>("/academic-calendar", {
    params: { batch_id: batchId, semester },
  });
  return data.data[0] ?? null;
}

export async function createAcademicCalendar(
  batchId: number,
  semester: number,
  startDate: string,
  endDate: string,
): Promise<AdminAcademicCalendar> {
  const { data } = await apiClient.post<{ data: AdminAcademicCalendar }>("/academic-calendar", {
    batch_id: batchId,
    semester,
    start_date: startDate,
    end_date: endDate,
  });
  return data.data;
}

export type CalendarEventType = "holiday" | "event";

export type AdminCalendarEvent = {
  id: number;
  academic_calendar_id: number;
  title: string;
  description: string | null;
  event_date: string;
  event_type: CalendarEventType;
  start_time: string;
  end_time: string;
  created_by_user_id: number | null;
};

export type CalendarEventInput = {
  title: string;
  description?: string;
  event_date: string;
  event_type: CalendarEventType;
  start_time: string;
  end_time: string;
};

export async function listCalendarEvents(academicCalendarId: number): Promise<AdminCalendarEvent[]> {
  const { data } = await apiClient.get<{ data: AdminCalendarEvent[] }>("/academic-calendar-events", {
    params: { academic_calendar_id: academicCalendarId },
  });
  return data.data;
}

export async function createCalendarEvent(
  academicCalendarId: number,
  input: CalendarEventInput,
): Promise<AdminCalendarEvent> {
  const { data } = await apiClient.post<{ data: AdminCalendarEvent }>("/academic-calendar-events", {
    academic_calendar_id: academicCalendarId,
    ...input,
  });
  return data.data;
}

export async function updateCalendarEvent(
  id: number,
  input: CalendarEventInput,
): Promise<AdminCalendarEvent> {
  const { data } = await apiClient.patch<{ data: AdminCalendarEvent }>(`/academic-calendar-events/${id}`, input);
  return data.data;
}

export async function deleteCalendarEvent(id: number): Promise<void> {
  await apiClient.delete(`/academic-calendar-events/${id}`);
}
