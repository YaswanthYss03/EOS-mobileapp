export const roomInfo = {
  block: "Block C",
  room: "214",
  warden: "Mr. Ravichandran",
  boardType: "Veg full board",
};

// TODO: replace with a real call once a hostel backend endpoint exists.
export const outingTypes = ["Home visit", "Medical visit", "Academic work", "Weekend outing"];

export const complaintCategories = ["Electrical", "Plumbing", "Furniture", "Internet/WiFi", "Housekeeping"];

export const meals = ["Breakfast", "Lunch", "Snacks", "Dinner"];

export type Grade = "A" | "B" | "C" | "D" | "E";

export const grades: { grade: Grade; label: string }[] = [
  { grade: "A", label: "Excellent" },
  { grade: "B", label: "Very good" },
  { grade: "C", label: "Good" },
  { grade: "D", label: "Average" },
  { grade: "E", label: "Poor" },
];

// TODO: pull from the logged-in student's profile once that endpoint exists
// (see src/context/AuthContext - only id/email/role are available today).
export const studentProfile = {
  name: "Aarav Menon",
  registerNo: "21CS1042",
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
