import type { MetadataRoute } from "next";
import { projectManager } from "@/config/projectmanager";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: projectManager.app.name,
    short_name: "AIF Portal",
    description: projectManager.app.description,
    start_url: "/login",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#ffffff",
    theme_color: "#1B3C6C",
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/apple-touch-icon.png",
        sizes: "180x180",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}
