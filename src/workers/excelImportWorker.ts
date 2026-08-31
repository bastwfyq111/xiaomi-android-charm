import { importFromExcel, type ImportKind } from "@/lib/exportImport";
import { parseInstallmentsExcel } from "@/lib/parseInstallmentsExcel";
import { parseUsageExcel } from "@/lib/parseUsageExcel";

export type ExcelWorkerRequest =
  | { mode: "shared"; buffer: ArrayBuffer; name: string; kind: ImportKind }
  | { mode: "installments"; buffer: ArrayBuffer; year: 2025 | 2026 }
  | { mode: "usage"; buffer: ArrayBuffer; importMonthId: number };

self.onmessage = async (event: MessageEvent<ExcelWorkerRequest>) => {
  try {
    const request = event.data;
    if (request.mode === "installments") {
      const installments = parseInstallmentsExcel(request.buffer, request.year);
      self.postMessage({ ok: true, data: installments });
      return;
    }

    if (request.mode === "usage") {
      const rows = parseUsageExcel(request.buffer, request.importMonthId);
      self.postMessage({ ok: true, data: rows });
      return;
    }

    // ملاحظة: لا نستخدم `new File(...)` هنا — منشئ File غير موثوق داخل
    // Web Worker على بعض متصفحات أندرويد/شاومي ويفشل بصمت بدون أن
    // يصل الخطأ إلى catch. نمرر الـ ArrayBuffer مباشرة بدلاً من ذلك.
    const data = await importFromExcel(request.buffer, request.kind, request.name);
    self.postMessage({ ok: true, data });
  } catch (error) {
    self.postMessage({
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
};