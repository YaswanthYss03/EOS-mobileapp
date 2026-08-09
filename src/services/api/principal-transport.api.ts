import { apiClient } from "./client";

// Principal-only Transport overview - see EOS-backend's
// src/modules/principal-transport/principal-transport.service.ts.

export type PrincipalTransportBus = {
  bus_no: string;
  vehicle_number: string;
  driver_name: string | null;
};

export type PrincipalTransportRoute = {
  id: number;
  name: string;
  student_count: number;
  buses: PrincipalTransportBus[];
};

export type PrincipalTransportOverview = {
  routes_count: number;
  students_on_transport: number;
  total_buses: number;
  buses_assigned: number;
  routes: PrincipalTransportRoute[];
};

export async function getPrincipalTransportOverview(): Promise<PrincipalTransportOverview> {
  const { data } = await apiClient.get<{ data: PrincipalTransportOverview }>("/principal-transport/overview");
  return data.data;
}
