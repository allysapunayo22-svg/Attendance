"use client";

import { MapContainer, Marker, Circle, Polygon, TileLayer, useMapEvents } from "react-leaflet";
import type { LatLngExpression } from "leaflet";
import L from "leaflet";

if (typeof window !== "undefined") {
  delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: "/marker-icon-2x.png",
    iconUrl: "/marker-icon.png",
    shadowUrl: "/marker-shadow.png"
  });
}

interface LocationPickerProps {
  latitude: number;
  longitude: number;
  radiusMeters: number;
  drawPolygon?: boolean;
  polygonPoints?: Array<{ latitude: number; longitude: number }>;
  onChange: (coordinate: { latitude: number; longitude: number }) => void;
  onPolygonChange?: (points: Array<{ latitude: number; longitude: number }>) => void;
}

interface ClickHandlerProps {
  drawPolygon: boolean;
  polygonPoints: Array<{ latitude: number; longitude: number }>;
  onChange: LocationPickerProps["onChange"];
  onPolygonChange: ((points: Array<{ latitude: number; longitude: number }>) => void) | undefined;
}

function ClickHandler({ drawPolygon, polygonPoints, onChange, onPolygonChange }: ClickHandlerProps) {
  useMapEvents({
    click(event) {
      if (drawPolygon) {
        onPolygonChange?.([...polygonPoints, { latitude: event.latlng.lat, longitude: event.latlng.lng }]);
        return;
      }
      onChange({ latitude: event.latlng.lat, longitude: event.latlng.lng });
    }
  });
  return null;
}

export function LocationPicker({ latitude, longitude, radiusMeters, drawPolygon, polygonPoints = [], onChange, onPolygonChange }: LocationPickerProps) {
  const center: LatLngExpression = [latitude || 14.5995, longitude || 120.9842];
  const polygon: LatLngExpression[] = polygonPoints.map((point) => [point.latitude, point.longitude]);

  return (
    <div className="overflow-hidden rounded-md border border-slate-200">
      <MapContainer center={center} zoom={17} scrollWheelZoom className="h-96">
        <TileLayer attribution="&copy; OpenStreetMap contributors" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <Marker
          position={center}
          draggable
          eventHandlers={{
            dragend(event) {
              const marker = event.target;
              const position = marker.getLatLng();
              onChange({ latitude: position.lat, longitude: position.lng });
            }
          }}
        />
        <Circle center={center} radius={radiusMeters} pathOptions={{ color: "#1d4ed8", fillColor: "#3b82f6", fillOpacity: 0.16 }} />
        {polygon.length >= 3 ? <Polygon positions={polygon} pathOptions={{ color: "#2563eb", fillColor: "#60a5fa", fillOpacity: 0.18 }} /> : null}
        {polygonPoints.map((point, index) => (
          <Marker key={`${point.latitude}-${point.longitude}-${index}`} position={[point.latitude, point.longitude]} />
        ))}
        <ClickHandler
          drawPolygon={Boolean(drawPolygon)}
          polygonPoints={polygonPoints}
          onChange={onChange}
          onPolygonChange={onPolygonChange}
        />
      </MapContainer>
    </div>
  );
}
