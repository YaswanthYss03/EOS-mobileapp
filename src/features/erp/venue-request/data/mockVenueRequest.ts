export type VenueBookingStatus = "pending" | "approved" | "rejected";

export type VenueBookingRequest = {
  id: string;
  venueName: string;
  fromDate: string;
  toDate: string;
  fromTime: string;
  toTime: string;
  purpose: string;
  capacity: string;
  status: VenueBookingStatus;
  appliedOn: string;
};

// TODO: replace with a real call once a venue-booking backend endpoint exists.
export const venues = [
  "Seminar Hall - Block A",
  "Auditorium",
  "Conference Room - CSE Dept",
  "Mini Hall - Block C",
  "Open Air Theatre",
];

// 08:00 AM through 08:00 PM in 30-minute steps.
function generateTimeSlots(): string[] {
  const slots: string[] = [];
  for (let hour = 8; hour <= 20; hour++) {
    for (const minute of [0, 30]) {
      if (hour === 20 && minute === 30) continue;
      const period = hour < 12 ? "AM" : "PM";
      const displayHour = hour % 12 === 0 ? 12 : hour % 12;
      slots.push(`${String(displayHour).padStart(2, "0")}:${String(minute).padStart(2, "0")} ${period}`);
    }
  }
  return slots;
}

export const timeSlots = generateTimeSlots();

export const mockVenueHistory: VenueBookingRequest[] = [
  {
    id: "1",
    venueName: "Seminar Hall - Block A",
    fromDate: "05 Aug 2026",
    toDate: "05 Aug 2026",
    fromTime: "10:00 AM",
    toTime: "12:00 PM",
    purpose: "Guest lecture on Deep Learning.",
    capacity: "120",
    status: "pending",
    appliedOn: "30 Jul 2026",
  },
  {
    id: "2",
    venueName: "Auditorium",
    fromDate: "20 Jul 2026",
    toDate: "20 Jul 2026",
    fromTime: "02:00 PM",
    toTime: "05:00 PM",
    purpose: "Annual day rehearsal.",
    capacity: "300",
    status: "approved",
    appliedOn: "15 Jul 2026",
  },
  {
    id: "3",
    venueName: "Conference Room - CSE Dept",
    fromDate: "10 Jul 2026",
    toDate: "10 Jul 2026",
    fromTime: "11:00 AM",
    toTime: "01:00 PM",
    purpose: "Department review meeting.",
    capacity: "25",
    status: "approved",
    appliedOn: "08 Jul 2026",
  },
  {
    id: "4",
    venueName: "Mini Hall - Block C",
    fromDate: "25 Jun 2026",
    toDate: "25 Jun 2026",
    fromTime: "03:00 PM",
    toTime: "04:00 PM",
    purpose: "Club activity.",
    capacity: "60",
    status: "rejected",
    appliedOn: "20 Jun 2026",
  },
];
