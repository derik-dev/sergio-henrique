import { Suspense } from "react";
import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import { AppHeader } from "@/components/AppHeader";
import { RegisterSW } from "@/components/RegisterSW";
import { PRODUCT_NAME, PRODUCT_TAGLINE } from "@/lib/brand";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: { default: PRODUCT_NAME, template: `%s · ${PRODUCT_NAME}` },
  description: PRODUCT_TAGLINE,
  // favicon: app/icon.svg (convenção do Next)
  icons: { apple: "/icons/192" },
  appleWebApp: { capable: true, title: PRODUCT_NAME, statusBarStyle: "black-translucent" },
};

export const viewport: Viewport = {
  themeColor: "#07090b",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className={`${geistSans.variable} h-full antialiased`}>
      <body className="min-h-full">
        <Suspense fallback={<div className="h-14 border-b border-line" aria-hidden="true" />}>
          <AppHeader />
        </Suspense>
        {children}
        <RegisterSW />
      </body>
    </html>
  );
}
