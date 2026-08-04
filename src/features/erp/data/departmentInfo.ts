// Shared HoD department context, used by the Faculty tab's context card in
// ApprovalRequestsScreen (Leave, On Duty, ...) and the Student tab's "All
// sections" row - it's the same HoD/department regardless of which
// approval workflow is being viewed.
// TODO: replace with a real call once a departments backend endpoint exists.
export const departmentInfo = {
  name: "Computer Science & Engineering",
  facultyCount: 38,
  sectionCount: 9,
};
