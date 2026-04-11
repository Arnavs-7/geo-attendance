import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { Toaster } from "react-hot-toast";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "GeoAttendance — Smart Location-Based Attendance",
  description: "Enterprise-grade geofence-powered attendance tracking system with real-time GPS verification.",
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
                iconTheme: {
                  primary: "#3b82f6",
                  secondary: "#0f172a",
                },
              },
              error: {
                iconTheme: {
                  primary: "#ef4444",
                  secondary: "#0f172a",
                },
              },
            }}
          />
        </AuthProvider>
      </body>
    </html>
  );
}