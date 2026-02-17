import type { Metadata, Viewport } from "next";
import { Playfair_Display, Inter } from "next/font/google";
import "./globals.css";
import { AudioProvider } from "@/context/AudioContext";
import { AuthProvider } from "@/context/AuthContext";
import BottomNav from "@/components/BottomNav";
import MiniPlayer from "@/components/MiniPlayer";
import ErrorBoundary from "@/components/ErrorBoundary";
import HydrationGuard from "@/components/HydrationGuard";

// Elegant Serif for Headings - "Midnight Library" aesthetic
const playfair = Playfair_Display({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: '--font-playfair',
  display: 'swap',
});

// Clean Sans for UI and Body Text
const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: '--font-inter',
  display: 'swap',
});

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export const metadata: Metadata = {
  title: "GTY Sermon Companion",
  description: "The complete teaching archive of John MacArthur - Study sermons by scripture, topic, or series",
  other: {
    'apple-mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-status-bar-style': 'black-translucent',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${playfair.variable} ${inter.variable} antialiased min-h-screen bg-[var(--bg-primary)]`}>
        <HydrationGuard>
          <AuthProvider>
            <AudioProvider>
              {/* Mobile-first container with max width */}
              <main className="max-w-md w-full mx-auto min-h-screen relative bg-[var(--bg-primary)] shadow-2xl">
                <ErrorBoundary>
                  {children}
                </ErrorBoundary>
              </main>
              {/* Fixed-position elements must be outside the relative main
                  to avoid Safari stacking context issues with position:fixed */}
              <ErrorBoundary>
                <MiniPlayer />
              </ErrorBoundary>
              <BottomNav />
            </AudioProvider>
          </AuthProvider>
        </HydrationGuard>
      </body>
    </html>
  );
}
