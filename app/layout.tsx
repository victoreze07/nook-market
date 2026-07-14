import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Nook Market — Big finds. Better prices.",
  description: "Discover great deals, rare treasures, and trusted sellers on Nook Market.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
