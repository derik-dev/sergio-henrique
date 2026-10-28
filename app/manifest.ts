import type { MetadataRoute } from "next";
import { PRODUCT_NAME, PRODUCT_TAGLINE } from "@/lib/brand";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: PRODUCT_NAME,
    short_name: PRODUCT_NAME,
    description: PRODUCT_TAGLINE,
    lang: "pt-BR",
    start_url: "/",
    display: "standalone",
    background_color: "#07090b",
    theme_color: "#07090b",
    icons: [
      { src: "/icons/192", sizes: "192x192", type: "image/png" },
      { src: "/icons/512", sizes: "512x512", type: "image/png" },
      { src: "/icons/512", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
