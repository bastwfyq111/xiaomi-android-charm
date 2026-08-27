type ReportWindow = Window;
type AppBackHandler = () => boolean | Promise<boolean>;
type ListenerHandle = { remove: () => Promise<void> };

const reportWindows = new Set<ReportWindow>();

const isClosed = (reportWindow: ReportWindow) => {
  try {
    return reportWindow.closed;
  } catch {
    return true;
  }
};

/**
 * يسجل نافذة تقرير مفتوحة حتى يتعامل زر الرجوع المادي معها قبل سجل التبويبات.
 * يعيد نفس القيمة لتسهيل استبدال window.open مباشرةً.
 */
export function registerReportWindow(reportWindow: ReportWindow | null): ReportWindow | null {
  if (!reportWindow) return null;

  reportWindows.add(reportWindow);
  const cleanupIfClosed = () => {
    if (isClosed(reportWindow)) reportWindows.delete(reportWindow);
  };

  reportWindow.addEventListener("beforeunload", cleanupIfClosed, { once: true });
  reportWindow.addEventListener("pagehide", cleanupIfClosed, { once: true });
  reportWindow.addEventListener("afterprint", () => {
    window.setTimeout(cleanupIfClosed, 0);
  });

  return reportWindow;
}

export function unregisterReportWindow(reportWindow: ReportWindow | null) {
  if (reportWindow) reportWindows.delete(reportWindow);
}

/** يغلق آخر تقرير ما زال مفتوحاً، ويعيد true إذا تمت معالجة الرجوع. */
export function closeActiveReportWindow(): boolean {
  const openReports = Array.from(reportWindows).reverse();

  for (const reportWindow of openReports) {
    if (isClosed(reportWindow)) {
      reportWindows.delete(reportWindow);
      continue;
    }

    try {
      reportWindow.close();
    } catch (error) {
      console.warn("تعذر إغلاق نافذة التقرير المفتوحة:", error);
    }
    reportWindows.delete(reportWindow);
    return true;
  }

  return false;
}

/**
 * يثبت مستمع زر الرجوع في Capacitor عند تشغيل APK فقط.
 * في الويب لا يتم تحميل @capacitor/app ولا يتغير سلوك المتصفح.
 */
export function installAndroidBackButton(onBack: AppBackHandler): () => void {
  if (typeof window === "undefined") return () => undefined;

  let disposed = false;
  let listenerHandle: ListenerHandle | null = null;

  void (async () => {
    try {
      const { Capacitor } = await import("@capacitor/core");
      if (!Capacitor.isNativePlatform()) return;

      const { App } = await import("@capacitor/app");
      const handle = await App.addListener("backButton", async () => {
        if (closeActiveReportWindow()) return;

        let handled = false;
        try {
          handled = await onBack();
        } catch (error) {
          console.error("فشل التعامل مع الرجوع داخل التطبيق:", error);
        }

        // عند الجذر فقط يسمح للتطبيق بالخروج من Android.
        if (!handled) {
          try {
            await App.exitApp();
          } catch (error) {
            console.error("فشل إنهاء التطبيق بعد الرجوع من الجذر:", error);
          }
        }
      });

      if (disposed) {
        await handle.remove();
      } else {
        listenerHandle = handle;
      }
    } catch (error) {
      console.error("تعذر تهيئة زر الرجوع في Capacitor:", error);
    }
  })();

  return () => {
    disposed = true;
    if (listenerHandle) {
      void listenerHandle.remove().catch((error) => {
        console.error("تعذر تنظيف مستمع زر الرجوع:", error);
      });
      listenerHandle = null;
    }
  };
}
