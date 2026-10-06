"use client";

import { useEffect, useState } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const dismissKey = "aif-pwa-install-dismissed";

function isStandalone() {
  const navigatorWithStandalone = navigator as Navigator & { standalone?: boolean };
  return window.matchMedia("(display-mode: standalone)").matches || navigatorWithStandalone.standalone === true;
}

export default function PwaInstall() {
  const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [iosHint, setIosHint] = useState(false);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    void navigator.serviceWorker.register("/sw.js").catch(() => undefined);

    if (isStandalone() || sessionStorage.getItem(dismissKey)) return;

    function onPrompt(event: Event) {
      event.preventDefault();
      setPromptEvent(event as BeforeInstallPromptEvent);
    }

    window.addEventListener("beforeinstallprompt", onPrompt);

    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
    const otherBrowser = /crios|fxios|edgios/i.test(navigator.userAgent);
    if (ios && !otherBrowser) setIosHint(true);

    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  if (!promptEvent && !iosHint) return null;

  function dismiss() {
    sessionStorage.setItem(dismissKey, "1");
    setPromptEvent(null);
    setIosHint(false);
  }

  async function install() {
    if (!promptEvent) return;
    await promptEvent.prompt();
    const choice = await promptEvent.userChoice;
    setPromptEvent(null);
    if (choice.outcome !== "accepted") dismiss();
  }

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
      <div className="mx-auto flex max-w-lg flex-wrap items-center gap-3 rounded-2xl border border-[#E6EDF5] bg-white p-3 shadow-[0_12px_32px_rgba(20,50,90,0.16)]">
        <img src="/favicon_io%20(2)/android-chrome-192x192.png" alt="" className="h-11 w-11 rounded-xl" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-[#16324F]">Install AIF Portal</p>
          <p className="text-xs leading-5 text-[#5C6B7A]">
            {promptEvent ? "Add this portal to your phone home screen." : "Tap Share, then Add to Home Screen."}
          </p>
        </div>
        {promptEvent ? (
          <button type="button" onClick={() => void install()} className="shrink-0 rounded-full bg-[#F97316] px-3.5 py-2 text-sm font-medium text-white hover:bg-[#EA6C0C]">
            Install
          </button>
        ) : null}
        <button type="button" onClick={dismiss} className="shrink-0 text-sm font-medium text-[#7B8794]">
          Not now
        </button>
      </div>
    </div>
  );
}
