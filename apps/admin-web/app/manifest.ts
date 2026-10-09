import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/student",
    name: "ClickIn Student Attendance",
    short_name: "ClickIn",
    description: "Student events and secure attendance capture, including durable offline submission.",
    start_url: "/student",
    scope: "/",
    display: "standalone",
    background_color: "#f3f7f7",
    theme_color: "#0b3b3c",
    orientation: "any",
    categories: ["education", "productivity"],
    icons: [
      { src: "/pwa/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/pwa/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/pwa/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" }
    ]
  };
}
