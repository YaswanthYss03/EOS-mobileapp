export type AttendanceStats = {
  present: number;
  absent: number;
  onDuty: number;
  overallPercent: number;
};

export type StaffAttendanceRow = {
  id: string;
  name: string;
  subtitle: string;
  stats: AttendanceStats;
};

// There is no non-teaching-staff attendance table/module in the backend at
// all (same gap as the Others tab on the sibling Leave/OD screens), so this
// tab stays on static mock data for now.
export const mockOtherStaffAttendance: StaffAttendanceRow[] = [
  {
    id: "o1",
    name: "Mr. G. Venkatesan",
    subtitle: "Librarian",
    stats: { present: 22, absent: 1, onDuty: 0, overallPercent: 95.65 },
  },
  {
    id: "o2",
    name: "Mrs. S. Kalaivani",
    subtitle: "Lab Assistant · CSE",
    stats: { present: 21, absent: 2, onDuty: 0, overallPercent: 91.3 },
  },
  {
    id: "o3",
    name: "Mr. R. Muthu",
    subtitle: "Office Assistant",
    stats: { present: 23, absent: 0, onDuty: 0, overallPercent: 100 },
  },
];
