import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "hapa",
    short_name: "hapa",
    description: "Your feed, your vibe. An AI DJ for shopping.",
    start_url: "/",
    display: "standalone",
    background_color: "#faf7f2",
    theme_color: "#faf7f2",
  };
}
