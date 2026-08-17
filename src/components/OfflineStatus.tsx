import { useEffect, useState } from "react";
import { WifiOff } from "lucide-react";

const CONNECTIVITY_CHECK_INTERVAL_MS = 15_000;
const CONNECTIVITY_CHECK_TIMEOUT_MS = 5_000;

export default function OfflineStatus() {
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    let disposed = false;
    let activeController: AbortController | null = null;

    const checkConnectivity = async () => {
      if (!navigator.onLine) {
        if (!disposed) setIsOffline(true);
        return;
      }

      activeController?.abort();
      const controller = new AbortController();
      activeController = controller;
      const timeoutId = window.setTimeout(
        () => controller.abort(),
        CONNECTIVITY_CHECK_TIMEOUT_MS,
      );

      try {
        // هذا الفحص اختياري للحالة فقط؛ لا يُستخدم لتحميل بيانات التطبيق.
        const response = await fetch(`/manifest.json?offline_probe=${Date.now()}`, {
          method: "HEAD",
          cache: "no-store",
          signal: controller.signal,
        });
        if (!disposed) setIsOffline(!response.ok);
      } catch {
        if (!disposed) setIsOffline(true);
      } finally {
        window.clearTimeout(timeoutId);
      }
    };

    const handleOffline = () => setIsOffline(true);
    const handleOnline = () => {
      setIsOffline(false);
      void checkConnectivity();
    };

    void checkConnectivity();
    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);
    const intervalId = window.setInterval(
      checkConnectivity,
      CONNECTIVITY_CHECK_INTERVAL_MS,
    );

    return () => {
      disposed = true;
      activeController?.abort();
      window.clearInterval(intervalId);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
    };
  }, []);

  if (!isOffline) return null;

  return (
    <div
      className="fixed inset-x-0 top-0 z-[100] flex min-h-9 items-center justify-center gap-2 bg-[#7f1d1d] px-3 py-2 text-center text-xs font-bold text-white shadow-md sm:text-sm"
      role="status"
      aria-live="polite"
      dir="rtl"
    >
      <WifiOff className="h-4 w-4 shrink-0" aria-hidden="true" />
      <span>
        تعمل الآن دون اتصال بالإنترنت — البيانات المعروضة محفوظة على الجهاز وقد لا تكون محدثة.
      </span>
    </div>
  );
}
