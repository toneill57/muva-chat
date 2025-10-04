import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import "../styles/accommodation-animations.css";
import { AuthProvider } from "@/contexts/AuthContext";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "InnPilot - Plataforma de Gestión Hotelera",
  description: "Sistema inteligente para gestión hotelera y compliance SIRE en Colombia",
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,        // Prevent zoom on iOS Safari
    userScalable: false,    // Prevent pinch-zoom
    viewportFit: 'cover'    // Support notch safe areas
  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
