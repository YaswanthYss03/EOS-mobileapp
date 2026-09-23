import { useLocalSearchParams } from "expo-router";
import { CraveoOrderSuccessScreen } from "@/features/amenity/craveo/CraveoOrderSuccessScreen";

export default function CraveoOrderSuccessRoute() {
  const { orderId } = useLocalSearchParams<{ orderId: string }>();
  return <CraveoOrderSuccessScreen orderId={Number(orderId)} />;
}
