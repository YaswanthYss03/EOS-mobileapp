import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AccessibilityInfo, ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, Vibration, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import MapView, { Marker } from "react-native-maps";
import { Ionicons } from "@expo/vector-icons";
import { fonts } from "@/theme";
import { getMyBusTracking, type BusTracking, type TrackedBus } from "@/services/api/bus-tracking.api";
import { detectArrivals, type ArrivalTarget } from "./arrival";

/** How often the bus position is refreshed while this screen is open. */
const POLL_MS = 10_000;
/** How long the "bus has reached" banner stays up. */
const BANNER_MS = 12_000;
/** Buzz, pause, buzz, pause, buzz. */
const ARRIVAL_VIBRATION = [0, 500, 200, 500, 200, 500];

function lastSeenText(iso: string): string {
  const minutes = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60_000));
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  return hours < 24 ? `${hours} h ago` : `${Math.round(hours / 24)} d ago`;
}

export function BusTrackingScreen() {
  const mapRef = useRef<MapView>(null);
  const [data, setData] = useState<BusTracking | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [arrival, setArrival] = useState<string | null>(null);
  const announcedRef = useRef<Set<string>>(new Set());
  const fittedForRef = useRef<number | null>(null);

  const load = useCallback(async () => {
    try {
      setData(await getMyBusTracking());
      setError(null);
    } catch {
      setError("Could not load the bus position. Check your connection.");
    }
  }, []);

  useEffect(() => {
    load();
    const timer = setInterval(load, POLL_MS);
    return () => clearInterval(timer);
  }, [load]);

  const buses = data?.buses ?? [];
  // The office sees the whole fleet: start on a bus that is actually reporting, not just the first in the list.
  const current: TrackedBus | undefined = buses.find((b) => b.bus.id === selectedId) ?? buses.find((b) => b.location?.online) ?? buses[0];
  const loc = current?.location ?? null;

  const boardingStop = current?.boarding_stage && current.boarding_location ? { name: current.boarding_stage, ...current.boarding_location } : null;
  const campus = data?.campus ?? null;

  // The places this viewer is waiting for: their own stop (where they board) and the campus.
  const targets = useMemo<ArrivalTarget[]>(() => {
    if (!current) return [];
    const list: ArrivalTarget[] = [];
    if (boardingStop) list.push({ key: `${current.bus.id}:stop`, label: boardingStop.name, lat: boardingStop.lat, lon: boardingStop.lon });
    if (campus) list.push({ key: `${current.bus.id}:campus`, label: campus.name, lat: campus.lat, lon: campus.lon });
    return list;
  }, [current?.bus.id, boardingStop?.name, boardingStop?.lat, boardingStop?.lon, campus?.name, campus?.lat, campus?.lon]); // eslint-disable-line react-hooks/exhaustive-deps

  // The bus has just reached one of them: vibrate and say so (once per visit; it can announce again after leaving).
  useEffect(() => {
    if (!loc?.online) return;
    const result = detectArrivals({ lat: loc.lat, lon: loc.lon }, targets, announcedRef.current);
    announcedRef.current = result.announced;
    if (result.arrived.length === 0) return;
    const text = result.arrived
      .map((t) => (t.key.endsWith(":campus") ? `The bus has reached ${t.label}` : `The bus has reached your stop, ${t.label}`))
      .join(". ");
    Vibration.vibrate(ARRIVAL_VIBRATION);
    setArrival(text);
    AccessibilityInfo.announceForAccessibility(text);
  }, [loc?.lat, loc?.lon, loc?.online, targets]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!arrival) return;
    const timer = setTimeout(() => setArrival(null), BANNER_MS);
    return () => clearTimeout(timer);
  }, [arrival]);

  useEffect(() => () => Vibration.cancel(), []);

  // Show the bus together with the viewer's stop and the campus the first time its position arrives, then keep following the bus.
  useEffect(() => {
    if (!loc || !current) return;
    if (fittedForRef.current !== current.bus.id) {
      fittedForRef.current = current.bus.id;
      const points = [{ latitude: loc.lat, longitude: loc.lon }];
      if (boardingStop) points.push({ latitude: boardingStop.lat, longitude: boardingStop.lon });
      if (campus) points.push({ latitude: campus.lat, longitude: campus.lon });
      if (points.length > 1) {
        mapRef.current?.fitToCoordinates(points, { edgePadding: { top: 80, right: 60, bottom: 60, left: 60 }, animated: true });
        return;
      }
    }
    mapRef.current?.animateCamera({ center: { latitude: loc.lat, longitude: loc.lon } }, { duration: 800 });
  }, [loc?.lat, loc?.lon, current?.bus.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!data && !error) {
    return (
      <SafeAreaView style={[styles.container, styles.center]} edges={[]}>
        <ActivityIndicator />
      </SafeAreaView>
    );
  }

  if (!data || !current) {
    const message = error
      ? error
      : data && !data.registered
        ? "You are not registered for college bus transport. Contact the transport office if you should be."
        : "No bus is available to show yet.";
    return (
      <SafeAreaView style={[styles.container, styles.center]} edges={[]}>
        <Ionicons name="bus-outline" size={40} color="#999" />
        <Text style={styles.emptyText}>{message}</Text>
        {error ? (
          <Pressable onPress={load} style={styles.retry} accessibilityRole="button">
            <Text style={styles.retryText}>Try again</Text>
          </Pressable>
        ) : null}
      </SafeAreaView>
    );
  }

  const boardingAt = current.boarding_stage;

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <View style={styles.header}>
        <Text style={styles.title}>{buses.length > 1 ? "Buses" : "My Bus"}</Text>
        <View style={[styles.liveBadge, !loc?.online && styles.offlineBadge]}>
          <View style={[styles.liveDot, !loc?.online && styles.offlineDot]} />
          <Text style={[styles.liveText, !loc?.online && styles.offlineText]}>{loc?.online ? "LIVE" : "OFFLINE"}</Text>
        </View>
      </View>

      {buses.length > 1 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chips} contentContainerStyle={{ gap: 8, paddingHorizontal: 16 }}>
          {buses.map((b) => {
            const on = b.bus.id === current.bus.id;
            return (
              <Pressable key={b.bus.id} onPress={() => setSelectedId(b.bus.id)} style={[styles.chip, on && styles.chipOn]} accessibilityRole="button" accessibilityState={{ selected: on }}>
                <Text style={[styles.chipText, on && styles.chipTextOn]}>{b.bus.bus_no}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      ) : null}

      {arrival ? (
        <Pressable onPress={() => setArrival(null)} style={styles.arrivalBanner} accessibilityRole="alert" accessibilityLabel={arrival}>
          <Ionicons name="checkmark-circle" size={18} color="#fff" />
          <Text style={styles.arrivalText}>{arrival}</Text>
        </Pressable>
      ) : null}

      {loc ? (
        <MapView
          ref={mapRef}
          style={styles.map}
          initialRegion={{ latitude: loc.lat, longitude: loc.lon, latitudeDelta: 0.03, longitudeDelta: 0.03 }}
        >
          {boardingStop ? (
            <Marker coordinate={{ latitude: boardingStop.lat, longitude: boardingStop.lon }} title={`Your stop: ${boardingStop.name}`} anchor={{ x: 0.5, y: 0.5 }}>
              <View style={styles.stopMarker}>
                <Ionicons name="person" size={13} color="#fff" />
              </View>
            </Marker>
          ) : null}
          {campus ? (
            <Marker coordinate={{ latitude: campus.lat, longitude: campus.lon }} title={campus.name} anchor={{ x: 0.5, y: 0.5 }}>
              <View style={styles.campusMarker}>
                <Ionicons name="school" size={14} color="#fff" />
              </View>
            </Marker>
          ) : null}
          <Marker coordinate={{ latitude: loc.lat, longitude: loc.lon }} anchor={{ x: 0.5, y: 0.5 }} rotation={loc.heading ?? 0} flat>
            <View style={[styles.busMarker, !loc.online && styles.busMarkerOffline]}>
              <Ionicons name="bus" size={16} color="#fff" />
            </View>
          </Marker>
        </MapView>
      ) : (
        <View style={[styles.map, styles.center]}>
          <Ionicons name="locate-outline" size={36} color="#999" />
          <Text style={styles.emptyText}>This bus has not reported its location yet.</Text>
        </View>
      )}

      <View style={styles.infoCard}>
        <View style={styles.infoRow}>
          <Text style={styles.routeName}>{current.route?.name ?? "No route assigned"}</Text>
          <Text style={styles.busNumber}>{current.bus.vehicle_number}</Text>
        </View>
        {loc ? (
          <View style={styles.infoRow}>
            <View style={styles.infoItem}>
              <Ionicons name="speedometer-outline" size={14} color="#666" />
              <Text style={styles.infoText}>{loc.online && loc.speed_kmh != null ? `${Math.round(loc.speed_kmh)} km/h` : "Not moving"}</Text>
            </View>
            <View style={styles.infoItem}>
              <Ionicons name="time-outline" size={14} color="#666" />
              <Text style={styles.infoText}>Updated {lastSeenText(loc.updated_at)}</Text>
            </View>
          </View>
        ) : null}
        {boardingAt ? (
          <View style={styles.infoItem}>
            <Ionicons name="location-outline" size={14} color="#666" />
            <Text style={styles.infoText}>Your stop: {boardingAt}</Text>
          </View>
        ) : null}
        {current.bus.driver_name ? <Text style={styles.driver}>Driver: {current.bus.driver_name}</Text> : null}
        {error ? <Text style={styles.stale}>{error}</Text> : null}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  title: {
    fontSize: 20,
    fontFamily: fonts.bold,
  },
  liveBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#FEF2F2",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: "#DC2626",
  },
  liveText: {
    fontSize: 11,
    fontFamily: fonts.bold,
    color: "#DC2626",
  },
  map: {
    flex: 1,
  },
  center: {
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    padding: 24,
  },
  emptyText: {
    fontSize: 14,
    fontFamily: fonts.regular,
    color: "#666",
    textAlign: "center",
  },
  retry: {
    marginTop: 4,
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: "#1E3A8A",
  },
  retryText: {
    color: "#fff",
    fontFamily: fonts.bold,
    fontSize: 13,
  },
  offlineBadge: {
    backgroundColor: "#F3F4F6",
  },
  offlineDot: {
    backgroundColor: "#6B7280",
  },
  offlineText: {
    color: "#6B7280",
  },
  chips: {
    flexGrow: 0,
    paddingBottom: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: "#F3F4F6",
  },
  chipOn: {
    backgroundColor: "#1E3A8A",
  },
  chipText: {
    fontSize: 12,
    fontFamily: fonts.bold,
    color: "#444",
  },
  chipTextOn: {
    color: "#fff",
  },
  arrivalBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginHorizontal: 16,
    marginBottom: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: "#15803D",
  },
  arrivalText: {
    flex: 1,
    color: "#fff",
    fontSize: 13,
    fontFamily: fonts.bold,
  },
  stopMarker: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#DC2626",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#fff",
  },
  campusMarker: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "#15803D",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#fff",
  },
  busMarkerOffline: {
    backgroundColor: "#6B7280",
  },
  stale: {
    fontSize: 11,
    fontFamily: fonts.regular,
    color: "#B45309",
  },
  stopDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#fff",
    borderWidth: 2,
    borderColor: "#1E3A8A",
  },
  busMarker: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#1E3A8A",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#fff",
  },
  infoCard: {
    padding: 16,
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: "#eee",
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  routeName: {
    flexShrink: 1,
    fontSize: 15,
    fontFamily: fonts.bold,
  },
  busNumber: {
    flexShrink: 0,
    marginLeft: 8,
    fontSize: 12,
    fontFamily: fonts.regular,
    color: "#666",
  },
  infoItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  infoText: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: "#444",
  },
  driver: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: "#888",
  },
});
