import { apiClient } from "./client";

/**
 * Medical centre appointment booking - the booker's own side of it.
 *
 * Everyone except a parent can book: students, faculty, HoD, HR, secretary,
 * warden, and so on. The backend derives WHO is booking from the JWT, so
 * nothing here sends a user id.
 *
 * Two different things, deliberately not the same:
 *  - a **time part** is what medical staff opens on a date (e.g. 10:00-13:00)
 *  - a **slot** is one bookable 30-minute division of it (10:00-10:30)
 *
 * A booking is created as "pending" and does NOT put the person in the OPD
 * queue. Medical staff has to approve it first; only then does it become a real
 * visit in the queue. `MyAppointment.status` is how the app shows that.
 *
 * Backend: src/modules/medical-centre/medical-appointments.controller.ts
 */

export type AppointmentStatus = "pending" | "approved" | "rejected" | "cancelled";

/** One date that has at least one open time part - drives the calendar dots. */
export type AppointmentAvailabilityDay = {
  /** YYYY-MM-DD */
  slot_date: string;
  /** Slots on this date that still have room. */
  open_slots: number;
  total_slots: number;
};

export type AppointmentSlot = {
  /** HH:mm, 24-hour */
  slot_start: string;
  /** HH:mm, 24-hour */
  slot_end: string;
  capacity: number;
  /** How many people have already booked this slot (pending + approved). */
  booked: number;
  full: boolean;
  /**
   * Past its end time. A slot that has merely STARTED is NOT finished and is
   * still bookable - walking in at 10:15 for the 10:00-10:30 slot is being
   * inside your appointment, not late for it.
   */
  finished: boolean;
  /** True when the signed-in user already holds a live booking in this slot. */
  mine: boolean;
};

export type AppointmentTimePart = {
  window_id: number;
  /** HH:mm, 24-hour */
  start_time: string;
  /** HH:mm, 24-hour */
  end_time: string;
  slot_minutes: number;
  capacity_per_slot: number;
  status: "open" | "closed";
  slots: AppointmentSlot[];
};

export type AppointmentDay = {
  slot_date: string;
  time_parts: AppointmentTimePart[];
};

export type MyAppointment = {
  id: number;
  slot_date: string;
  slot_start: string;
  slot_end: string;
  status: AppointmentStatus;
  reason: string | null;
  decision_note: string | null;
  created_at: string;
  /** OPD queue token, present once approved. */
  visit_id: number | null;
};

/**
 * GET /me/medical-appointments/availability?from=&to=
 *
 * One request per visible month so the calendar can mark bookable dates
 * without a request per day cell.
 */
export async function getAppointmentAvailability(
  from: string,
  to: string,
): Promise<AppointmentAvailabilityDay[]> {
  const { data } = await apiClient.get<{ data: AppointmentAvailabilityDay[] }>(
    "/me/medical-appointments/availability",
    { params: { from, to } },
  );
  return data.data;
}

/** GET /me/medical-appointments/availability/:date - the time parts and their slots for one date. */
export async function getAppointmentDay(date: string): Promise<AppointmentDay> {
  const { data } = await apiClient.get<{ data: AppointmentDay }>(
    `/me/medical-appointments/availability/${date}`,
  );
  return data.data;
}

/**
 * POST /me/medical-appointments
 *
 * `slot_start` identifies which 30-minute division of the time part is wanted.
 * The server re-derives the slot from the window rather than trusting the
 * times sent, and rejects the booking if the slot is full or already held.
 */
export async function bookAppointment(input: {
  window_id: number;
  slot_start: string;
  reason?: string;
}): Promise<MyAppointment> {
  const { data } = await apiClient.post<{ data: MyAppointment }>("/me/medical-appointments", input);
  return data.data;
}

/** GET /me/medical-appointments/mine - the signed-in user's own bookings, newest first. */
export async function getMyAppointments(): Promise<MyAppointment[]> {
  const { data } = await apiClient.get<{ data: MyAppointment[] }>("/me/medical-appointments/mine");
  return data.data;
}

/** DELETE /me/medical-appointments/:id - withdraw one's own booking while it is still pending. */
export async function cancelMyAppointment(id: number): Promise<void> {
  await apiClient.delete(`/me/medical-appointments/${id}`);
}
