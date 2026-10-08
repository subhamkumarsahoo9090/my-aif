import type { Metadata, Viewport } from "next";
import GoogleAnalytics from "@/components/analytics/GoogleAnalytics";
import PwaInstall from "@/components/pwa/PwaInstall";
import { AppProvider } from "@/context/AppProvider";
import { projectManager, themeVariablesCss } from "@/config/projectmanager";
import "./globals.css";

export const viewport: Viewport = {
  themeColor: "#1B3C6C",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  ...(projectManager.seo.siteUrl
    ? { metadataBase: new URL(projectManager.seo.siteUrl) }
    : {}),
  title: {
    default: projectManager.app.name,
    template: `%s | ${projectManager.app.name}`,
  },
  description: projectManager.app.description,
  applicationName: "AIF Portal",
  appleWebApp: {
    capable: true,
    title: "AIF Portal",
    statusBarStyle: "default",
  },
  icons: {
    icon: [
      { url: "/favicon_io%20(2)/favicon.ico" },
      {
        url: "/favicon_io%20(2)/favicon-16x16.png",
        sizes: "16x16",
        type: "image/png",
      },
      {
        url: "/favicon_io%20(2)/favicon-32x32.png",
        sizes: "32x32",
        type: "image/png",
      },
    ],
    apple: [
      {
        url: "/icons/apple-touch-icon.png",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full">
      <head>
        <link
          rel="apple-touch-startup-image"
          media="(device-width: 390px) and (device-height: 844px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)"
          href="/icons/apple-splash-1170x2532.png"
        />
        <link
          rel="apple-touch-startup-image"
          media="(device-width: 428px) and (device-height: 926px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)"
          href="/icons/apple-splash-1284x2778.png"
        />
        <link
          rel="apple-touch-startup-image"
          media="(device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)"
          href="/icons/apple-splash-828x1792.png"
        />
        <link
          rel="apple-touch-startup-image"
          media="(device-width: 375px) and (device-height: 667px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)"
          href="/icons/apple-splash-750x1334.png"
        />
      </head>
      <body
        suppressHydrationWarning
        className="flex min-h-full flex-col bg-background font-sans text-foreground antialiased"
      >
        <style dangerouslySetInnerHTML={{ __html: themeVariablesCss() }} />
        <GoogleAnalytics />
        <AppProvider>{children}</AppProvider>
        <PwaInstall />
      </body>
    </html>
  );
}
