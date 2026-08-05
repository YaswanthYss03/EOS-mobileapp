export type OdHistoryStatus = "pending" | "approved" | "rejected";

export type OdHistoryItem = {
  id: string;
  event: string;
  status: OdHistoryStatus;
  date: string;
  durationHours: number;
  venue: string;
  teamName: string;
  code: string;
  documentsSubmitted: boolean;
};

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

// TODO: replace with a real call once an on-duty backend endpoint exists.
// "Individual" applications (no team) use "—" as their code - there's
// nothing to share since no one else can join.
export const mockOdHistory: OdHistoryItem[] = [
  {
    id: "1",
    event: "IEEE paper presentation",
    status: "approved",
    date: "27 Jun 2026",
    durationHours: 4,
    venue: "SSN College, Chennai",
    teamName: "Team Cipher",
    code: "R4WD9X",
    documentsSubmitted: false,
  },
  {
    id: "2",
    event: "Inter-college coding contest",
    status: "approved",
    date: "12 Jun 2026",
    durationHours: 6,
    venue: "Kumaraguru College",
    teamName: "Team Byte",
    code: "T2LM8F",
    documentsSubmitted: false,
  },
  {
    id: "3",
    event: "NSS blood donation camp",
    status: "rejected",
    date: "30 May 2026",
    durationHours: 5,
    venue: "Campus auditorium",
    teamName: "Individual",
    code: "—",
    documentsSubmitted: false,
  },
];
