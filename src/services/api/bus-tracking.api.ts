import { apiClient } from "./client";

export async function getBusLocation(routeId: string) {
  const { data } = await apiClient.get(`/bus-tracking/routes/${routeId}/location`);
  return data;
}
