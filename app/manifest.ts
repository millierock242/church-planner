import type { MetadataRoute } from "next";

// Lets people add the site to their phone's home screen like an app.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Christ Community Church’s Planner",
    short_name: "CCC Planner",
    description: "Volunteer and service scheduling for Christ Community Church",
    start_url: "/portal",
    display: "standalone",
    background_color: "#f4fbe8",
    theme_color: "#3b7d0b",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" }],
  };
}
