import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "ParkMel — Melbourne street parking",
  icons: { icon: "/brand/parkmel-logo.png", apple: "/brand/parkmel-logo.png" },
  description: "Explore Melbourne street parking rules for your arrival time and length of stay.",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
