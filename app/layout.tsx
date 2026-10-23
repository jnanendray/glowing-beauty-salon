import type { Metadata } from "next";
import { Playfair_Display, Inter } from "next/font/google";
import "./globals.css";

const playfair = Playfair_Display({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  style: ["normal", "italic"],
  variable: "--font-playfair",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Glowing Beauty Salon | Premium Hair, Skin & Bridal Studio",
  description:
    "Book hair, skin, spa and bridal appointments at Glowing Beauty Salon — in-studio or at your doorstep. Choose your stylist, pick a slot, and glow.",
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
      </body>
    </html>
  );
}
