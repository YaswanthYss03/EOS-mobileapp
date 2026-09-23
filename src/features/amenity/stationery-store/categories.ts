import { Ionicons } from "@expo/vector-icons";
import type { StationeryCategory } from "@/services/api/stationery.api";

// Fixed, small set (5) - matches the reference design's own CATEGORIES_RAW
// exactly (see "College ERP stationery login/Stationery Login.dc.html").
// No backend "categories" endpoint - these are stable enough to hardcode,
// same convention as this app's other small fixed option sets.
export const STATIONERY_CATEGORIES: { id: StationeryCategory; name: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { id: "study", name: "Study Essentials", icon: "book-outline" },
  { id: "food", name: "Food & Snacks", icon: "fast-food-outline" },
  { id: "care", name: "Personal Care", icon: "water-outline" },
  { id: "hostel", name: "Hostel Essentials", icon: "bed-outline" },
  { id: "college", name: "College Essentials", icon: "school-outline" },
];

export function categoryName(id: StationeryCategory): string {
  return STATIONERY_CATEGORIES.find((c) => c.id === id)?.name ?? id;
}
