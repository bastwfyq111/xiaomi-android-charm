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

    const file = new File([request.buffer], request.name, {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const data = await importFromExcel(file, request.kind);
    self.postMessage({ ok: true, data });
  } catch (error) {
    self.postMessage({
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
};
