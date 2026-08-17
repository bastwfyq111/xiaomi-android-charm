// تسجيل service worker للعمل بدون إنترنت + التقاط حدث التثبيت
// وحدة التسجيل الوحيدة في المشروع: لا تُسجّل أبداً في وضع التطوير أو داخل معاينة Lovable.
let deferredPrompt: any = null;
const listeners = new Set<(canInstall: boolean) => void>();
const observedWorkers = new WeakSet<ServiceWorker>();
const SERVICE_WORKER_READY_TIMEOUT_MS = 15_000;

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
    const results = await Promise.all(
      registrations
        .filter((registration) => {
          const scriptUrl =
            registration.active?.scriptURL ||
            registration.waiting?.scriptURL ||
            registration.installing?.scriptURL ||
            "";
          return scriptUrl.endsWith(SW_URL);
        })
        .map(async (registration) => ({
          registration,
          unregistered: await registration.unregister(),
        })),
    );
    results.forEach(({ registration, unregistered }) => {
      console.info("[PWA] Service worker unregistration result", {
        scope: registration.scope,
        unregistered,
      });
    });
  } catch (error) {
    console.error("[PWA] Failed to unregister service worker", error);
    throw error;
  }
}

function observeWorker(
  worker: ServiceWorker | null | undefined,
  source: string,
) {
  if (!worker || observedWorkers.has(worker)) return;
  observedWorkers.add(worker);

  const logState = () => {
    console.info("[PWA] Service worker state changed", {
      source,
      scriptURL: worker.scriptURL,
      state: worker.state,
    });
    if (worker.state === "activated") {
      console.info("[PWA] Service worker is activated", {
        source,
        scriptURL: worker.scriptURL,
      });
    }
    if (worker.state === "redundant") {
      console.error("[PWA] Service worker became redundant", {
        source,
        scriptURL: worker.scriptURL,
      });
    }
  };

  worker.addEventListener("statechange", logState);
  logState();
}

function observeRegistration(
  registration: ServiceWorkerRegistration,
  source: string,
) {
  console.info("[PWA] Service worker registration available", {
    source,
    scope: registration.scope,
    installing: registration.installing?.scriptURL ?? null,
    waiting: registration.waiting?.scriptURL ?? null,
    active: registration.active?.scriptURL ?? null,
  });

  observeWorker(registration.installing, `${source}:installing`);
  observeWorker(registration.waiting, `${source}:waiting`);
  observeWorker(registration.active, `${source}:active`);

  registration.addEventListener("updatefound", () => {
    console.info("[PWA] Service worker update found", {
      scope: registration.scope,
    });
    if (registration.installing) {
      observeWorker(registration.installing, `${source}:update`);
    }
  });
}

async function waitForActivatedServiceWorker() {
  const timeout = new Promise<never>((_, reject) => {
    window.setTimeout(() => {
      reject(
        new Error(
          `Service worker did not reach ready state within ${SERVICE_WORKER_READY_TIMEOUT_MS}ms`,
        ),
      );
    }, SERVICE_WORKER_READY_TIMEOUT_MS);
  });

  const registration = await Promise.race([
    navigator.serviceWorker.ready,
    timeout,
  ]);
  observeRegistration(registration, "ready");

  if (registration.active?.state !== "activated") {
    console.warn("[PWA] Service worker is ready without an activated worker", {
      scope: registration.scope,
      activeState: registration.active?.state ?? null,
    });
  } else {
    console.info("[PWA] Service worker activation confirmed", {
      scope: registration.scope,
      scriptURL: registration.active.scriptURL,
    });
  }

  return registration;
}

async function registerAppServiceWorker() {
  try {
    const { registerSW } = await import("virtual:pwa-register");

    // registerSW يعيد دالة تحديث، بينما اكتمال التسجيل الحقيقي يُؤكَّد عبر ready.
    await registerSW({
        immediate: true,
        onOfflineReady: () => {
          console.info("[PWA] Offline precache is ready");
        },
        onNeedRefresh: () => {
          console.info("[PWA] A new service worker is waiting to be activated");
        },
        onRegisteredSW: (scriptUrl, registration) => {
          console.info("[PWA] Service worker registered", {
            scriptUrl,
            scope: registration?.scope ?? null,
          });
          if (registration) {
            observeRegistration(registration, "registered");
          } else {
            console.warn("[PWA] Service worker registered without a registration object");
          }
        },
        onRegisterError: (error) => {
          console.error("[PWA] Service worker registration failed", error);
        },
      });

    await waitForActivatedServiceWorker();
  } catch (error) {
    console.error("[PWA] Service worker initialization failed", error);
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

  if (!("serviceWorker" in navigator)) {
    console.error("[PWA] Service workers are not supported by this browser");
    return;
  }

  navigator.serviceWorker.addEventListener("controllerchange", () => {
    console.info("[PWA] Service worker controller changed", {
      controller: navigator.serviceWorker.controller?.scriptURL ?? null,
    });
  });

  if (isBlockedContext()) {
    void unregisterAppServiceWorkers().catch((error) => {
      console.error("[PWA] Blocked-context service worker cleanup failed", error);
    });
    return;
  }

  void registerAppServiceWorker();
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
