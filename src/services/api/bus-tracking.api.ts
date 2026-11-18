import { apiClient } from "./client";

// Where is my bus? - see EOS-backend's src/modules/gps-integration/bus-tracking.service.ts.
// Transport office, principal and admin get every bus; a student only the bus on their own transport
// registration; a parent their children's buses.

export type TrackedBus = {
  bus: { id: number; bus_no: string; vehicle_number: string; driver_name: string | null; driver_phone: string | null };
  route: { id: number; name: string | null; stops: { sequence: number; name: string; lat: number | null; lon: number | null }[] } | null;
  /** The viewer's own boarding stop (students and parents). */
  boarding_stage: string | null;
  /** Where that stop is on the map, when the transport office has entered it. */
  boarding_location: { lat: number; lon: number } | null;
  location: {
    lat: number;
    lon: number;
    speed_kmh: number | null;
    heading: number | null;
    ignition: boolean | null;
    updated_at: string;
    online: boolean;
  } | null;
};

export type BusTracking = {
  /** false when a student or parent has no college transport registered. */
  registered: boolean;
  /** The college campus (a bus's destination), when the server knows where it is. */
  campus: { name: string; lat: number; lon: number } | null;
  buses: TrackedBus[];
};

export async function getMyBusTracking(): Promise<BusTracking> {
  const { data } = await apiClient.get<{ data: BusTracking }>("/bus-tracking/me");
  return data.data;
}
