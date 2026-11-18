// Tells when a bus has reached a place the viewer cares about (their boarding stop, the campus).

/** The bus counts as arrived inside this distance... */
export const ARRIVE_WITHIN_M = 150;
/** ...and must get this far away again before the same place can announce it a second time. */
export const LEAVE_BEYOND_M = 400;

export type Point = { lat: number; lon: number };
export type ArrivalTarget = Point & { key: string; label: string };

const EARTH_RADIUS_M = 6_371_000;
const rad = (deg: number) => (deg * Math.PI) / 180;

/** Straight-line distance in metres (haversine). */
export function distanceMeters(a: Point, b: Point): number {
  const dLat = rad(b.lat - a.lat);
  const dLon = rad(b.lon - a.lon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

/**
 * Looks at where the bus is now and returns the targets it has just arrived at, plus the new
 * "already announced" set to pass in next time. Pure: nothing is stored here.
 */
export function detectArrivals(
  bus: Point | null,
  targets: ArrivalTarget[],
  announced: ReadonlySet<string>,
): { arrived: ArrivalTarget[]; announced: Set<string> } {
  const next = new Set(announced);
  const arrived: ArrivalTarget[] = [];
  if (!bus) return { arrived, announced: next };
  for (const target of targets) {
    const d = distanceMeters(bus, target);
    if (!next.has(target.key) && d <= ARRIVE_WITHIN_M) {
      next.add(target.key);
      arrived.push(target);
    } else if (next.has(target.key) && d >= LEAVE_BEYOND_M) {
      next.delete(target.key);
    }
  }
  return { arrived, announced: next };
}
