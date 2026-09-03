import React from "react";
import { View } from "react-native";
import MapView, { Circle, Marker } from "react-native-maps";

interface EventMapViewProps {
  region: {
    latitude: number;
    longitude: number;
    latitudeDelta?: number | undefined;
    longitudeDelta?: number | undefined;
  };
  radiusMeters: number;
  venueName?: string | undefined;
}

export function EventMapView({ region, radiusMeters, venueName }: EventMapViewProps) {
  return (
    <View className="overflow-hidden rounded-lg border border-slate-200 bg-white">
      <MapView
        style={{ height: 240 }}
        initialRegion={{
          latitude: region.latitude,
          longitude: region.longitude,
          latitudeDelta: region.latitudeDelta ?? 0.005,
          longitudeDelta: region.longitudeDelta ?? 0.005
        }}
      >
        <Marker
          coordinate={{ latitude: region.latitude, longitude: region.longitude }}
          title={venueName ?? "Event venue"}
        />
        <Circle
          center={{ latitude: region.latitude, longitude: region.longitude }}
          radius={radiusMeters}
          strokeColor="#0f766e"
          fillColor="rgba(15,118,110,0.12)"
        />
      </MapView>
    </View>
  );
}
