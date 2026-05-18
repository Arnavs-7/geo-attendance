import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { Toaster } from "react-hot-toast";
import ServiceWorkerRegister from "@/components/shared/ServiceWorkerRegister";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  applicationName: "GeoAttendance",
  title: "GeoAttendance — Smart Location-Based Attendance",
  description:
    "GPS-verified, geofenced check-in and check-out for your team. Installable on any phone — no app store needed.",
  manifest: "/manifest.json",
  icons: {
    icon: "/icon.svg",
    apple: "/icon.svg",
  },
  appleWebApp: {
    capable: true,
    title: "GeoAttendance",
    statusBarStyle: "black-translucent",
  },
};

export const viewport: Viewport = {
  themeColor: "#0f172a",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} min-h-screen gradient-bg gradient-mesh`}>
        <AuthProvider>
          {children}
          <ServiceWorkerRegister />
          <Toaster
            position="top-right"
            toastOptions={{
              style: {
                background: "rgba(15, 23, 42, 0.9)",
                backdropFilter: "blur(12px)",
                color: "#e2e8f0",
                border: "1px solid rgba(59, 130, 246, 0.2)",
                borderRadius: "12px",
                fontSize: "14px",
              },
              success: {
                iconTheme: { primary: "#3b82f6", secondary: "#0f172a" },
              },
              error: {
                iconTheme: { primary: "#ef4444", secondary: "#0f172a" },
              },
            }}
          />
        </AuthProvider>
      </body>
    </html>
  );
}
