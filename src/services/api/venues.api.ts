import { apiClient } from "./client";

// Mirrors EOS-backend's GET /venues, POST /venue-bookings and
// GET /venue-bookings (see EOS-backend/src/modules/venues/venues/venues.service.ts).
// GET /venues is actually an availability check requiring a from/to window,
// not a plain directory - listVenues() below passes a wide window (today
// through +1 year) both to enumerate venues for the picker AND to surface
// which ones already have a booking somewhere in that window (only the most
// recently created non-rejected booking per venue is returned, not every
// booking in range). Booking status has 4 real values
// (venue_booking_status_enum): pending/approved/rejected and
// alternative_offered, the last meaning IQAC offered a different venue
// (only its id is returned, not its name). GET /venue-bookings is
// self-scoped to the caller for every role except IQAC.
export type VenueBookingStatus = "pending" | "approved" | "rejected" | "alternative_offered";

export type VenueRef = {
  id: number;
  name: string;
  location: string | null;
  capacity: number | null;
};

export type VenueBookingInfo = {
  purpose: string;
  booked_by: string;
  accommodating_strength: number | null;
  from_datetime: string;
  to_datetime: string;
};

export type Venue = VenueRef & {
  is_available: boolean;
  booking: VenueBookingInfo | null;
};

export type MyVenueBooking = {
  id: number;
  purpose: string;
  from_datetime: string;
  to_datetime: string;
  accommodating_strength: number | null;
  status: VenueBookingStatus;
  alternative_venue_id: number | null;
  created_at: string;
  venue: VenueRef;
};

type RawVenueBooking = {
  id: number;
  purpose: string;
  from_datetime: string;
  to_datetime: string;
  accommodating_strength: number | null;
  status: VenueBookingStatus;
  alternative_venue_id: number | null;
  created_at: string;
  venues_venue_bookings_venue_idTovenues: VenueRef;
};

function normalizeBooking(raw: RawVenueBooking): MyVenueBooking {
  return {
    id: raw.id,
    purpose: raw.purpose,
    from_datetime: raw.from_datetime,
    to_datetime: raw.to_datetime,
    accommodating_strength: raw.accommodating_strength,
    status: raw.status,
    alternative_venue_id: raw.alternative_venue_id,
    created_at: raw.created_at,
    venue: raw.venues_venue_bookings_venue_idTovenues,
  };
}

export async function listVenues(): Promise<Venue[]> {
  const now = new Date();
  const oneYearOut = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);
  const { data } = await apiClient.get<{ data: { data: Venue[] } }>("/venues", {
    params: { from: now.toISOString(), to: oneYearOut.toISOString(), limit: 100 },
  });
  return data.data.data;
}

export type CreateVenueBookingPayload = {
  venue_id: number;
  purpose: string;
  from_datetime: string;
  to_datetime: string;
  accommodating_strength?: number;
};

export async function createVenueBooking(payload: CreateVenueBookingPayload): Promise<MyVenueBooking> {
  const { data } = await apiClient.post<{ data: RawVenueBooking }>("/venue-bookings", payload);
  return normalizeBooking(data.data);
}

export async function listMyVenueBookings(): Promise<MyVenueBooking[]> {
  const { data } = await apiClient.get<{ data: { data: RawVenueBooking[] } }>("/venue-bookings", {
    params: { limit: 100 },
  });
  return data.data.data.map(normalizeBooking);
}
