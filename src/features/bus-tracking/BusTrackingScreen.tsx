import { useEffect, useMemo, useRef, useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import MapView, { Marker, Polyline } from "react-native-maps";
import { Ionicons } from "@expo/vector-icons";
import { mockRoute, buildWaypoints } from "./data/mockRoute";

const TICK_MS = 1500;

// TODO: replace the simulated waypoint stepping with the bus device's real GPS feed
// (poll src/services/api/bus-tracking.api.ts or a socket) once it's wired up.
export function BusTrackingScreen() {
  const mapRef = useRef<MapView>(null);
  const waypoints = useMemo(() => buildWaypoints(mockRoute.stops), []);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((i) => (i + 1) % waypoints.length);
    }, TICK_MS);
    return () => clearInterval(timer);
  }, [waypoints.length]);

  const current = waypoints[index];
  const nextStop = mockRoute.stops[current.segment + 1] ?? mockRoute.stops[mockRoute.stops.length - 1];

  useEffect(() => {
    mapRef.current?.animateCamera({ center: current }, { duration: TICK_MS * 0.9 });
  }, [current]);

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <View style={styles.header}>
        <Text style={styles.title}>My Bus</Text>
        <View style={styles.liveBadge}>
          <View style={styles.liveDot} />
          <Text style={styles.liveText}>LIVE</Text>
        </View>
      </View>

      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={{
          latitude: current.latitude,
          longitude: current.longitude,
          latitudeDelta: 0.06,
          longitudeDelta: 0.06,
        }}
      >
        <Polyline coordinates={mockRoute.stops} strokeColor="#1E3A8A" strokeWidth={3} />

        {mockRoute.stops.map((stop) => (
          <Marker key={stop.name} coordinate={stop} title={stop.name} anchor={{ x: 0.5, y: 0.5 }}>
            <View style={styles.stopDot} />
          </Marker>
        ))}

        <Marker coordinate={current} anchor={{ x: 0.5, y: 0.5 }}>
          <View style={styles.busMarker}>
            <Ionicons name="bus" size={16} color="#fff" />
          </View>
        </Marker>
      </MapView>

      <View style={styles.infoCard}>
        <View style={styles.infoRow}>
          <Text style={styles.routeName}>{mockRoute.routeName}</Text>
          <Text style={styles.busNumber}>{mockRoute.busNumber}</Text>
        </View>
        <View style={styles.infoRow}>
          <View style={styles.infoItem}>
            <Ionicons name="location-outline" size={14} color="#666" />
            <Text style={styles.infoText}>Next: {nextStop.name}</Text>
          </View>
          <View style={styles.infoItem}>
            <Ionicons name="time-outline" size={14} color="#666" />
            <Text style={styles.infoText}>ETA {nextStop.eta}</Text>
          </View>
        </View>
        <Text style={styles.driver}>Driver: {mockRoute.driverName}</Text>
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
    fontWeight: "700",
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
    fontWeight: "700",
    color: "#DC2626",
  },
  map: {
    flex: 1,
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
    fontSize: 15,
    fontWeight: "700",
  },
  busNumber: {
    fontSize: 12,
    color: "#666",
  },
  infoItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  infoText: {
    fontSize: 12,
    color: "#444",
  },
  driver: {
    fontSize: 12,
    color: "#888",
  },
});
