import React from "react";
import { View, Text, Linking, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";

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
  const { latitude, longitude } = region;
  const delta = 0.004;
  const bbox = `${longitude - delta}%2C${latitude - delta}%2C${longitude + delta}%2C${latitude + delta}`;
  const embedUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${latitude}%2C${longitude}`;
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;

  return (
    <View className="overflow-hidden rounded-lg border border-slate-200 bg-white">
      <View style={{ height: 240, width: "100%", position: "relative" }}>
        <iframe
          title={venueName ?? "Event Venue"}
          width="100%"
          height="100%"
          style={{ border: 0 }}
          loading="lazy"
          src={embedUrl}
        />
        <View
          style={{
            position: "absolute",
            bottom: 8,
            left: 8,
            right: 8,
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center"
          }}
        >
          <View className="rounded-md bg-white/95 px-2.5 py-1.5 shadow-sm border border-slate-200">
            <Text className="text-xs font-semibold text-slate-800">
              Radius: <Text className="text-brand-700">{radiusMeters}m</Text>
            </Text>
          </View>
          <Pressable
            onPress={() => Linking.openURL(mapsUrl)}
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 4,
              borderRadius: 6,
              backgroundColor: "#0f766e",
              paddingHorizontal: 12,
              paddingVertical: 6
            }}
          >
            <Ionicons name="navigate-outline" size={14} color="#ffffff" />
            <Text className="text-xs font-semibold text-white">Directions</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}
