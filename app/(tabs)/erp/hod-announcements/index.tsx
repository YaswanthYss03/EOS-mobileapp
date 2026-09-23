import { AnnouncementsScreen } from "@/features/erp/announcements/AnnouncementsScreen";

// HOD's own local route copy (Student tab) - no ?audience= param, so both
// "Target classes" and "Target faculty" (department-wide) sections show,
// unlike the Employee/Faculty entry point under academics/announcements.
export default function HodAnnouncementsRoute() {
  return <AnnouncementsScreen />;
}
