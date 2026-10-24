import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: "https://glowing-beauty-salon.vercel.app/",
      changeFrequency: "weekly",
      priority: 1,
    },
  ];
}
