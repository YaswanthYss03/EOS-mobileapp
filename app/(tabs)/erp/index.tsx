import { Redirect } from "expo-router";
import { useRole } from "@/hooks/useRole";

// TODO: read the logged-in user's role from src/context/AuthContext (via useRole)
// and redirect to the matching erp/<role> route. Placeholder always sends to student.
export default function ErpIndex() {
  const role = useRole();
  return <Redirect href={`/(tabs)/erp/${role}`} />;
}
