import { Redirect } from "expo-router";
import { useRole } from "@/hooks/useRole";

export default function ErpIndex() {
  const role = useRole();
  return <Redirect href={`/(tabs)/erp/${role}`} />;
}
