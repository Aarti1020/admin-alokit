import type { Metadata } from "next";
import { Manrope, Sora } from "next/font/google";
import { Toaster } from "react-hot-toast";
import { AuthProvider } from "@/context/auth";
import "./globals.css";

const bodyFont = Manrope({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap"
});

const headingFont = Sora({
  subsets: ["latin"],
  variable: "--font-heading",
  display: "swap"
});

export const metadata: Metadata = {
  title: "Alokit Admin",
  description: "Admin control panel for Alokit operations and content."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${bodyFont.variable} ${headingFont.variable}`}>
      <body>
        <AuthProvider>
          {children}
          <Toaster
            position="top-right"
            toastOptions={{
              style: {
                background: "#10141f",
                color: "#f5f7fb",
                border: "1px solid rgba(255,255,255,0.08)"
              }
            }}
          />
        </AuthProvider>
      </body>
    </html>
  );
}
