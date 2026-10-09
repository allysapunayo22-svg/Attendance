export const LOCATION_MAX_AGE_MS = 60_000;

export type BrowserLocationErrorCode = "unsupported" | "permission_denied" | "unavailable" | "timeout" | "stale";

export class BrowserLocationError extends Error {
  readonly code: BrowserLocationErrorCode;

  constructor(code: BrowserLocationErrorCode, message: string) {
    super(message);
    this.code = code;
    this.name = "BrowserLocationError";
  }
}

export interface BrowserLocation {
  latitude: number;
  longitude: number;
  accuracy: number;
  capturedAt: string;
}

interface GeolocationLike {
  getCurrentPosition(
    success: PositionCallback,
    error?: PositionErrorCallback | null,
    options?: PositionOptions
  ): void;
}

function locationError(error: GeolocationPositionError) {
  if (error.code === error.PERMISSION_DENIED) return new BrowserLocationError("permission_denied", "Location permission is required for attendance. Allow location access and try again.");
  if (error.code === error.TIMEOUT) return new BrowserLocationError("timeout", "Getting your location took too long. Move to an open area and try again.");
  return new BrowserLocationError("unavailable", "Your current location is unavailable. Check location services and try again.");
}

export function isLocationStale(location: BrowserLocation, now = Date.now(), maxAgeMs = LOCATION_MAX_AGE_MS) {
  const capturedAt = Date.parse(location.capturedAt);
  return !Number.isFinite(capturedAt) || capturedAt > now + 5_000 || now - capturedAt > maxAgeMs;
}

export function isLocationAccurate(location: BrowserLocation, requiredAccuracyMeters: number) {
  return Number.isFinite(location.accuracy) && location.accuracy >= 0 && location.accuracy <= requiredAccuracyMeters;
}

export function getCurrentBrowserLocation(
  geolocation: GeolocationLike | undefined = typeof navigator === "undefined" ? undefined : navigator.geolocation,
  now = () => Date.now()
) {
  if (!geolocation) return Promise.reject(new BrowserLocationError("unsupported", "This browser does not support location capture."));

  return new Promise<BrowserLocation>((resolve, reject) => {
    geolocation.getCurrentPosition(
      (position) => {
        const location = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          capturedAt: new Date(position.timestamp).toISOString()
        };

        if (isLocationStale(location, now())) {
          reject(new BrowserLocationError("stale", "The browser returned an old location. Refresh your location and try again."));
          return;
        }
        resolve(location);
      },
      (error) => reject(locationError(error)),
      { enableHighAccuracy: true, maximumAge: 0, timeout: 15_000 }
    );
  });
}
