import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/admin", "/api/", "/auth/", "/book", "/login", "/demo"] }],
    sitemap: "https://glowing-beauty-salon.vercel.app/sitemap.xml",
  };
}
