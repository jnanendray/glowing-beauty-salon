import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import ChatWidget from "@/components/ChatWidget";

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
      <body
        className={`${playfair.variable} ${inter.variable} bg-[#fdf5f1] text-[#3a241f] antialiased`}
      >
        {children}
        <ChatWidget />
      </body>
    </html>
  );
}
