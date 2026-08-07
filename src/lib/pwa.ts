// تسجيل service worker للعمل بدون إنترنت + التقاط حدث التثبيت
let deferredPrompt: any = null;
const listeners = new Set<(canInstall: boolean) => void>();

export function initPwa() {
  if (typeof window === "undefined") return;

  const inIframe = (() => {
    try {
      return window.self !== window.top;
    } catch {
      return true;
    }
  })();
  const host = window.location.hostname;
  const isPreview =
    host.includes("id-preview--") ||
    host.includes("lovableproject.com") ||
    (host.includes("lovable.app") && host.includes("preview"));

  if (inIframe || isPreview) {
    // إلغاء أي SW سابق في وضع المعاينة
    navigator.serviceWorker?.getRegistrations().then((rs) => rs.forEach((r) => r.unregister()));
    return;
  }

  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker
        .register("/sw.js")
        .catch((e) => console.warn("SW register failed", e));
    });
  }

  window.addEventListener("beforeinstallprompt", (e: any) => {
    e.preventDefault();
    deferredPrompt = e;
    listeners.forEach((l) => l(true));
  });

  window.addEventListener("appinstalled", () => {
    deferredPrompt = null;
    listeners.forEach((l) => l(false));
  });
}

export function canInstall() {
  return !!deferredPrompt;
}

export async function promptInstall() {
  if (!deferredPrompt) return false;
  deferredPrompt.prompt();
  const { outcome } = await deferredPrompt.userChoice;
  deferredPrompt = null;
  listeners.forEach((l) => l(false));
  return outcome === "accepted";
}

export function onInstallAvailability(cb: (canInstall: boolean) => void) {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}
