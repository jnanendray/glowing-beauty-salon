import type { MetadataRoute } from "next";

/**
 * Web app manifest — lets phones "install" the site, and is what the
 * Android app shell (android/) is generated from.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Glowing Beauty Salon",
    short_name: "Glowing Beauty",
    description: "Book hair, skin, spa and bridal appointments — in-studio or at your doorstep.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#fdf5f1",
    theme_color: "#b8765f",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
