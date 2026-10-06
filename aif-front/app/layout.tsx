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
        url: "/favicon_io%20(2)/apple-touch-icon.png",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full">
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
