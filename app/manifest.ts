import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Tandem Trails",
    short_name: "Tandem Trails",
    description: "A cooperative storybook platform adventure for 2–4 players.",
    start_url: "/",
    display: "standalone",
    background_color: "#071927",
    theme_color: "#123747",
    icons: [{ src: "/favicon.svg", sizes: "any", type: "image/svg+xml" }],
  };
}
