import Script from "next/script";
import { projectManager } from "@/config/projectmanager";

const measurementIdPattern = /^G-[A-Za-z0-9]+$/;

export default function GoogleAnalytics() {
  const measurementId = projectManager.analytics.measurementId;

  if (!measurementIdPattern.test(measurementId)) {
    return null;
  }

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${measurementId}`}
        strategy="afterInteractive"
      />
      <Script id="google-analytics" strategy="afterInteractive">
        {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${measurementId}');`}
      </Script>
    </>
  );
}
