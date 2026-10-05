import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import NavHeader from "@/components/NavHeader";
import AgeGate from "@/components/AgeGate";
import NameGate from "@/components/NameGate";
import BanGate from "@/components/BanGate";
import { CreditsProvider } from "@/components/CreditsProvider";
import { IdentityProvider } from "@/components/IdentityProvider";
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
  description: "Quick tasks and surveys that crowdsource data — for AI training and anything else.",
};

// Runs before paint so the right theme applies immediately, instead of
// flashing one theme and then swapping. Always resolves to an explicit
// light/dark class — including for "follow system" (no saved choice) —
// since every dark: Tailwind utility in the app only activates when a
// .dark class is actually present on an ancestor (see globals.css), not
// from the prefers-color-scheme media query alone.
const THEME_INIT_SCRIPT = `(function(){try{var t=localStorage.getItem('theme');if(t!=='light'&&t!=='dark')t=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';document.documentElement.classList.add(t);}catch(e){}})();`;

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
        <CreditsProvider>
          <IdentityProvider>
            <NavHeader />
            <main className="flex flex-1 flex-col">
              <BanGate>
                <AgeGate>
                  <NameGate>{children}</NameGate>
                </AgeGate>
              </BanGate>
            </main>
          </IdentityProvider>
        </CreditsProvider>
      </body>
    </html>
  );
}
