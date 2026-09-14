import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import NavHeader from "@/components/NavHeader";
import AgeGate from "@/components/AgeGate";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "quicktask",
  description: "Quick, weird 30-second tasks for AI training data.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <NavHeader />
        <main className="flex flex-1 flex-col">
          <AgeGate>{children}</AgeGate>
        </main>
      </body>
    </html>
  );
}
