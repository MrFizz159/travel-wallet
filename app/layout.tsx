import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { BottomNav } from "@/components/bottom-nav";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Travel Wallet",
  description: "Plan trips compliantly, manage your travel documents, and build your travel history.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-surface text-foreground">
        <main className="flex-1 pb-20">{children}</main>
        <BottomNav />
      </body>
    </html>
  );
}
