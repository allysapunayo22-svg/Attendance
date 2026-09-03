import * as Location from "expo-location";
import type { Event } from "@attendance/types";
import { haversineDistanceMeters, isPointInPolygon } from "@attendance/shared-utils";

export async function requestFreshLocation() {
  const permission = await Location.requestForegroundPermissionsAsync();
  if (permission.status !== "granted") {
    throw new Error("Location permission is required for attendance.");
  }

  const location = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.Highest,
    mayShowUserSettingsDialog: true
  });

  return {
    latitude: location.coords.latitude,
    longitude: location.coords.longitude,
    accuracy: location.coords.accuracy ?? 999,
    mocked: location.mocked ?? false
  };
}

export function evaluateLocationForEvent(event: Event, point: { latitude: number; longitude: number; accuracy: number }) {
  const location = event.location;
  if (!location) {
    return { distanceMeters: null, inside: false, accuracyOk: false, reason: "Event location is not configured." };
  }

  const distanceMeters = haversineDistanceMeters(point, {
    latitude: location.latitude,
    longitude: location.longitude
  });

  const accuracyOk = point.accuracy <= location.required_gps_accuracy_meters;
  const zones = event.zones ?? [];
  const insideZones = zones.length
    ? zones.some((zone) => {
        if (zone.zone_type === "polygon") return isPointInPolygon(point, zone.coordinates);
        const center = zone.coordinates[0] ?? { latitude: location.latitude, longitude: location.longitude };
        return haversineDistanceMeters(point, center) <= (zone.radius_meters ?? location.radius_meters);
      })
    : distanceMeters <= location.radius_meters;

  return {
    distanceMeters,
    inside: insideZones,
    accuracyOk,
    reason: !accuracyOk
      ? "Your GPS accuracy is too low. Move to an open area and try again."
      : insideZones
        ? "You are inside the attendance area."
        : `You are approximately ${Math.round(distanceMeters)} meters away. Move closer to check in.`
  };
}
