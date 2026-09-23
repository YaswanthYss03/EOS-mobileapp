import { useLocalSearchParams } from "expo-router";
import { CraveoMenuScreen } from "@/features/amenity/craveo/CraveoMenuScreen";

export default function CraveoMenuRoute() {
  const { category } = useLocalSearchParams<{ category?: string }>();
  return <CraveoMenuScreen initialCategoryId={category ? Number(category) : undefined} />;
}
