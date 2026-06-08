import type { Metadata, Viewport } from "next";
import "./globals.css";
import { PwaRegister } from "@/components/PwaRegister";
import { InstallPrompt } from "@/components/InstallPrompt";
import { ToastProvider } from "@/components/ui/Toast";

export const metadata: Metadata = {
  title: "決裁者レーダー",
  description: "テレアポ接触データを訪問営業の成果に変える営業支援SaaS",
  applicationName: "決裁者レーダー",
  appleWebApp: {
    capable: true,
    title: "決裁者レーダー",
    statusBarStyle: "black-translucent",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { url: "/icons/favicon-32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: [
      { url: "/icons/apple-touch-icon.png", sizes: "180x180" },
    ],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // maximumScale を外す（WCAG準拠、ズーム可能に）
  viewportFit: "cover",
  themeColor: "#0F172A",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body className="min-h-screen">
        <ToastProvider>
          {children}
          <PwaRegister />
          <InstallPrompt />
        </ToastProvider>
      </body>
    </html>
  );
}
