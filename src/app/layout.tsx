import type { Metadata } from "next";
import { Inter } from "next/font/google"; // Using Inter as a default, or I can use Geist if provided
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import PresenceManager from "@/components/PresenceManager";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Booking Sport",
  description: "Booking Sport application",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className} suppressHydrationWarning={true}>
        <AuthProvider>
          <PresenceManager />
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
