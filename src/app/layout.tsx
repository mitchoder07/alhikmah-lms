import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { AppProvider } from "@/components/app-provider";
import { PWARegister } from "@/components/pwa-register";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Al-Hikmah LMS | Department of Economics",
  description: "Learning Management System for the Department of Economics, Al-Hikmah University, Ilorin. Stream lectures, take quizzes, earn verified certificates.",
  keywords: ["Al-Hikmah University", "LMS", "Economics", "Ilorin", "e-learning", "certificates"],
  authors: [{ name: "Al-Hikmah University, Ilorin" }],
  applicationName: "Al-Hikmah LMS",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Al-Hikmah LMS",
  },
  openGraph: {
    title: "Al-Hikmah LMS | Department of Economics",
    description: "Learn Economics. Earn Verified Certificates. Al-Hikmah University, Ilorin.",
    type: "website",
    siteName: "Al-Hikmah LMS",
  },
};

export const viewport: Viewport = {
  themeColor: "#006633",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        <AppProvider>{children}</AppProvider>
        <PWARegister />
        <Toaster />
        <Sonner />
      </body>
    </html>
  );
}
