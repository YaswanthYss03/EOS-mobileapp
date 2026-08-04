import { Redirect } from "expo-router";
import { useAuth } from "@/context/AuthContext";

export default function Index() {
  const { token, isLoading } = useAuth();

  // Still checking SecureStore for a persisted session - render nothing
  // rather than flashing the login screen first.
  if (isLoading) return null;

  return <Redirect href={token ? "/(tabs)/home" : "/(auth)/login"} />;
}
