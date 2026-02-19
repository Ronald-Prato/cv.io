import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AppConvexProvider } from "@/components/convex-provider";
import { AppI18nProvider } from "@/components/i18n-provider";
import { LanguageSwitcher } from "@/components/language-switcher";
import { Toaster } from "@/components/ui/sonner";
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
  title: "cv.io",
  description: "AI resume workspace",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <AppConvexProvider>
          <AppI18nProvider>
            <LanguageSwitcher />
            {children}
            <Toaster richColors position="top-right" />
          </AppI18nProvider>
        </AppConvexProvider>
      </body>
    </html>
  );
}
