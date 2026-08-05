import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "hapa",
    short_name: "hapa",
    description: "Your feed, your vibe. An AI DJ for shopping.",
    start_url: "/",
    display: "standalone",
    background_color: "#F7F5EE",
    theme_color: "#F7F5EE",
    icons: [
      {
        src: "/brand/hapa-logo.svg",
        sizes: "any",
        type: "image/svg+xml",
      },
    ],
  };
}
