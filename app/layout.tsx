import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import ChatWidget from "@/components/ChatWidget";
import AppBanner from "@/components/AppBanner";

// Fonts are bundled with the site (app/fonts) instead of fetched from
// Google Fonts during every build, so a Google hiccup can't break a
// deploy. Both are open-source (SIL Open Font License, included).
const playfair = localFont({
  src: [
    { path: "./fonts/playfair-display.woff", weight: "400 900", style: "normal" },
    { path: "./fonts/playfair-display-italic.woff", weight: "400 900", style: "italic" },
  ],
  variable: "--font-playfair",
  display: "swap",
});

const inter = localFont({
  src: [{ path: "./fonts/inter.woff", weight: "100 900", style: "normal" }],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://glowing-beauty-salon.vercel.app"),
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: "Glowing Beauty Salon",
    title: "Glowing Beauty Salon | Premium Hair, Skin & Bridal Studio",
    description:
      "Book hair, skin, spa and bridal appointments — in-studio or at your doorstep. Choose your stylist, pick a slot, and glow.",
    images: [{ url: "/icons/icon-512.png", width: 512, height: 512 }],
  },
  title: "Glowing Beauty Salon | Premium Hair, Skin & Bridal Studio",
  description:
    "Book hair, skin, spa and bridal appointments at Glowing Beauty Salon — in-studio or at your doorstep. Choose your stylist, pick a slot, and glow.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#b8765f",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        {/* Look up Supabase's address early (cheap). Signed-out visitors may never
            call it, so a full preconnect would be wasted for them. */}
        {process.env.NEXT_PUBLIC_SUPABASE_URL && (
          <link rel="dns-prefetch" href={process.env.NEXT_PUBLIC_SUPABASE_URL} />
        )}
      </head>
      <body
        className={`${playfair.variable} ${inter.variable} bg-[#fdf5f1] text-[#3a241f] antialiased`}
      >
        <AppBanner />
        {children}
        <ChatWidget />
      </body>
    </html>
  );
}
