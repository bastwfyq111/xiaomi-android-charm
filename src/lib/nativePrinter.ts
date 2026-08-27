import { Capacitor } from "@capacitor/core";
import { registerReportWindow } from "@/lib/capacitorNavigation";

export function isNativePrintingAvailable(): boolean {
  return typeof window !== "undefined" && Capacitor.isNativePlatform();
}

async function printWithNativePrinter(name: string, html: string): Promise<void> {
  const { Printer } = await import("@capgo/capacitor-printer");
  await Printer.printHtml({ name, html });
}

/**
 * يفتح واجهة الطباعة الأصلية في Android عند التشغيل داخل APK.
 * في الويب يستخدم نافذة التقرير الحالية، لذلك لا يتغير سلوك PWA.
 */
export function printReportHtml(html: string, name: string): boolean {
  if (isNativePrintingAvailable()) {
    void printWithNativePrinter(name, html).catch((error) => {
      console.error("[Print] Native Android printing failed", error);
    });
    return true;
  }

  const reportWindow = registerReportWindow(window.open("", "_blank", "width=1200,height=800"));
  if (!reportWindow) return false;
  reportWindow.document.open();
  reportWindow.document.write(html);
  reportWindow.document.close();
  return true;
}

export async function printReportHtmlAsync(html: string, name: string): Promise<boolean> {
  if (isNativePrintingAvailable()) {
    try {
      await printWithNativePrinter(name, html);
      return true;
    } catch (error) {
      console.error("[Print] Native Android printing failed", error);
      return false;
    }
  }

  return printReportHtml(html, name);
}
