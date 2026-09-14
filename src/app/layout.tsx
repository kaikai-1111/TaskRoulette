import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
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
  title: "Task Roulette",
  description: "Quick, weird 30-second tasks for AI training data.",
};

// Runs before paint so a saved theme choice applies immediately, instead of
// flashing the system-default theme first and then swapping.
const THEME_INIT_SCRIPT = `(function(){try{var t=localStorage.getItem('theme');if(t==='light'||t==='dark')document.documentElement.classList.add(t);}catch(e){}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      {/* Browser extensions (Grammarly, password managers, etc.) commonly
          inject attributes into <body> before React hydrates, which trips
          React's hydration-mismatch warning even though nothing is actually
          broken — suppressed here per React's own guidance for this case. */}
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        <Script id="theme-init" strategy="beforeInteractive">
          {THEME_INIT_SCRIPT}
        </Script>
        <NavHeader />
        <main className="flex flex-1 flex-col">
          <AgeGate>{children}</AgeGate>
        </main>
      </body>
    </html>
  );
}
