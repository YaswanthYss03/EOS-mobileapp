import { useLocalSearchParams } from "expo-router";
import { StationeryCategoryScreen } from "@/features/amenity/stationery-store/StationeryCategoryScreen";
import type { StationeryCategory } from "@/services/api/stationery.api";

export default function StationeryCategoryRoute() {
  const { category } = useLocalSearchParams<{ category: StationeryCategory }>();
  return <StationeryCategoryScreen category={category} />;
}
