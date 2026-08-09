import { apiClient } from "./client";

// Principal-only private planner layered on top of the read-only
// institution academic calendar (see academic-calendar.api.ts's
// getInstitutionAcademicCalendar) - see EOS-backend's
// src/modules/personal-calendar/personal-calendar.service.ts. Every entry
// is scoped to its own owner server-side; never merged into the
// institution's real calendar_events and never visible to anyone else.

export type PersonalCalendarEntryCategory = "personal" | "reminder" | "meeting";

export type PersonalCalendarEntry = {
  id: number;
  entry_date: string;
  title: string;
  category: PersonalCalendarEntryCategory;
  details: string | null;
  created_at: string;
};

export async function listPersonalCalendarEntries(from?: string, to?: string): Promise<PersonalCalendarEntry[]> {
  const { data } = await apiClient.get<{ data: PersonalCalendarEntry[] }>("/me/personal-calendar-entries", {
    params: { from, to },
  });
  return data.data;
}

export async function createPersonalCalendarEntry(input: {
  entry_date: string;
  title: string;
  category: PersonalCalendarEntryCategory;
  details?: string;
}): Promise<PersonalCalendarEntry> {
  const { data } = await apiClient.post<{ data: PersonalCalendarEntry }>("/me/personal-calendar-entries", input);
  return data.data;
}

export async function updatePersonalCalendarEntry(
  id: number,
  input: Partial<{
    entry_date: string;
    title: string;
    category: PersonalCalendarEntryCategory;
    details: string;
  }>,
): Promise<PersonalCalendarEntry> {
  const { data } = await apiClient.patch<{ data: PersonalCalendarEntry }>(`/me/personal-calendar-entries/${id}`, input);
  return data.data;
}

export async function deletePersonalCalendarEntry(id: number): Promise<void> {
  await apiClient.delete(`/me/personal-calendar-entries/${id}`);
}
