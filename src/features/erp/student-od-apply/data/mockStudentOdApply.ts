// Real backend data now (see @/services/api/od.api.ts) - this file only
// holds the display metadata for the on-duty statuses the backend returns,
// since EOSbackend1's od_requests model has no event name/venue/faculty
// mentor fields to mock in the first place.
export type OverallOdStatus = "pending_mentor" | "pending_hod" | "approved" | "rejected";

export const OD_STATUS_META: Record<OverallOdStatus, { label: string; bg: string; text: string }> = {
  pending_mentor: { label: "Pending mentor", bg: "#FEF3C7", text: "#D97706" },
  pending_hod: { label: "Pending HoD", bg: "#FEF3C7", text: "#D97706" },
  approved: { label: "Approved", bg: "#EAF0FD", text: "#2F6FE0" },
  rejected: { label: "Rejected", bg: "#FEF2F2", text: "#DC2626" },
};

export type TimeSlot = { label: string; value: string };

// 08:00 AM through 08:00 PM in 30-minute steps. `value` is 24-hour HH:mm -
// what the backend's from_time/to_time columns actually expect (see
// CreateOdRequestDto's TIME_REGEX); `label` is what the picker displays.
function generateTimeSlots(): TimeSlot[] {
  const slots: TimeSlot[] = [];
  for (let hour = 8; hour <= 20; hour++) {
    for (const minute of [0, 30]) {
      if (hour === 20 && minute === 30) continue;
      const period = hour < 12 ? "AM" : "PM";
      const displayHour = hour % 12 === 0 ? 12 : hour % 12;
      slots.push({
        label: `${String(displayHour).padStart(2, "0")}:${String(minute).padStart(2, "0")} ${period}`,
        value: `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`,
      });
    }
  }
  return slots;
}

export const timeSlots = generateTimeSlots();
