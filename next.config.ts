import type { NextConfig } from "next";

// Standard security headers on every page.
// - X-Frame-Options / frame-ancestors: nobody can embed the site in a
//   frame (stops "clickjacking" tricks on the booking/admin buttons).
// - nosniff: browsers never guess a file is a script.
// - Referrer-Policy: other sites only see our domain, never full URLs.
// - Permissions-Policy: camera/mic/payment off; location only for us
//   (the "Use my location" map pin).
const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), payment=(), usb=(), geolocation=(self)" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
};

export default nextConfig;
