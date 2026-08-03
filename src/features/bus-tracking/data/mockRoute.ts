export type Stop = {
  name: string;
  latitude: number;
  longitude: number;
  eta: string;
};

export const mockRoute = {
  routeName: "Route 4 - Velachery",
  busNumber: "TN 09 CA 4521",
  driverName: "R. Suresh",
  stops: [
    { name: "Velachery", latitude: 12.9815, longitude: 80.218, eta: "Departed" },
    { name: "Guindy", latitude: 13.0067, longitude: 80.2206, eta: "5 min" },
    { name: "Saidapet", latitude: 13.0212, longitude: 80.2225, eta: "10 min" },
    { name: "Anna Nagar", latitude: 13.085, longitude: 80.2101, eta: "18 min" },
    { name: "College Campus", latitude: 13.0107, longitude: 80.235, eta: "25 min" },
  ] as Stop[],
};

export type WaypointStep = {
  latitude: number;
  longitude: number;
  segment: number;
};

export function buildWaypoints(stops: Stop[], stepsPerSegment = 12): WaypointStep[] {
  const points: WaypointStep[] = [];
  for (let s = 0; s < stops.length - 1; s++) {
    const a = stops[s];
    const b = stops[s + 1];
    for (let t = 0; t < stepsPerSegment; t++) {
      const frac = t / stepsPerSegment;
      points.push({
        latitude: a.latitude + (b.latitude - a.latitude) * frac,
        longitude: a.longitude + (b.longitude - a.longitude) * frac,
        segment: s,
      });
    }
  }
  const last = stops[stops.length - 1];
  points.push({ latitude: last.latitude, longitude: last.longitude, segment: stops.length - 2 });
  return points;
}
