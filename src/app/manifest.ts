import type { MetadataRoute } from "next";

export const dynamic = "force-static";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Rally — household huddle for wildfire",
    short_name: "Rally",
    description:
      "One rally lot, live routes, a go-window against the wind. Rally draws the play so households meet instead of waiting.",
    start_url: "/play",
    display: "standalone",
    orientation: "any",
    background_color: "#161310",
    theme_color: "#f4c430",
    categories: ["utilities", "navigation", "weather"],
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" }],
  };
}
