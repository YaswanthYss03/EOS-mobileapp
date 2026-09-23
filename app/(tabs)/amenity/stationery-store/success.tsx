import { useLocalSearchParams } from "expo-router";
import { StationeryOrderSuccessScreen } from "@/features/amenity/stationery-store/StationeryOrderSuccessScreen";

export default function StationeryOrderSuccessRoute() {
  const { orderId } = useLocalSearchParams<{ orderId: string }>();
  return <StationeryOrderSuccessScreen orderId={Number(orderId)} />;
}
