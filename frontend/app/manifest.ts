import type { MetadataRoute } from "next";

/**
 * PWA manifest (US-15). Makes Suluhu installable on a field agent's phone so it
 * launches standalone and works offline. Next serves this at /manifest.webmanifest
 * and links it automatically.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Suluhu — Farmer Intelligence",
    short_name: "Suluhu",
    description:
      "Farmer-intelligence copilot for agricultural extension agents — capture, prioritise, and act across your caseload, even offline.",
    start_url: "/queue",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#ffffff",
    theme_color: "#07371b",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
    ],
  };
}
