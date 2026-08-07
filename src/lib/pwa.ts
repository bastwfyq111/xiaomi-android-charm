// تسجيل service worker للعمل بدون إنترنت + التقاط حدث التثبيت
// وحدة التسجيل الوحيدة في المشروع: لا تُسجّل أبداً في وضع التطوير أو داخل معاينة Lovable.
let deferredPrompt: any = null;
const listeners = new Set<(canInstall: boolean) => void>();

const SW_URL = "/sw.js";

function isBlockedContext() {
  if (!import.meta.env.PROD) return true;

  try {
    if (window.self !== window.top) return true;
  } catch {
    return true;
  }

  const host = window.location.hostname;
  const blockedHost =
    host.startsWith("id-preview--") ||
    host.startsWith("preview--") ||
    host === "lovableproject.com" ||
    host.endsWith(".lovableproject.com") ||
    host === "lovableproject-dev.com" ||
    host.endsWith(".lovableproject-dev.com") ||
    host === "beta.lovable.dev" ||
    host.endsWith(".beta.lovable.dev");

  const swOff = new URLSearchParams(window.location.search).get("sw") === "off";

  return blockedHost || swOff;
}

async function unregisterAppServiceWorkers() {
  if (!("serviceWorker" in navigator)) return;
  try {
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.allSettled(
      registrations
        .filter((registration) => {
          const scriptUrl =
            registration.active?.scriptURL ||
            registration.waiting?.scriptURL ||
            registration.installing?.scriptURL ||
            "";
          return scriptUrl.endsWith(SW_URL);
        })
        .map((registration) => registration.unregister()),
    );
  } catch {
    // تجاهل: لا يؤثر على عمل التطبيق
  }
}

export function initPwa() {
  if (typeof window === "undefined") return;

  // متابعة إمكانية التثبيت تعمل في كل السياقات
  window.addEventListener("beforeinstallprompt", (e: any) => {
    e.preventDefault();
    deferredPrompt = e;
    listeners.forEach((l) => l(true));
  });

  window.addEventListener("appinstalled", () => {
    deferredPrompt = null;
    listeners.forEach((l) => l(false));
  });

  if (isBlockedContext()) {
    void unregisterAppServiceWorkers();
    return;
  }

  void import("virtual:pwa-register")
    .then(({ registerSW }) => {
      registerSW({ immediate: true });
    })
    .catch(() => {
      // العمل بدون إنترنت غير متاح — التطبيق يعمل بشكل طبيعي
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
