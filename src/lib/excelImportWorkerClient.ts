import type { Installment } from "./store";
import type { ImportKind } from "./exportImport";
import type { ExcelWorkerRequest } from "@/workers/excelImportWorker";
import ExcelImportWorker from "../workers/excelImportWorker?worker";

type WorkerSuccess<T> = { ok: true; data: T };
type WorkerFailure = { ok: false; error: string };
type WorkerResponse<T> = WorkerSuccess<T> | WorkerFailure;

function runWorker<T>(request: ExcelWorkerRequest, transfer: ArrayBuffer): Promise<T> {
  return new Promise((resolve, reject) => {
    let worker: Worker;
    try {
      worker = new ExcelImportWorker();
    } catch (error) {
      reject(error);
      return;
    }

    const finish = () => worker.terminate();
    worker.onmessage = (event: MessageEvent<WorkerResponse<T>>) => {
      finish();
      if (event.data.ok) resolve(event.data.data);
      else reject(new Error(event.data.error));
    };
    worker.onerror = (event) => {
      finish();
      reject(new Error(event.message || "Excel worker failed"));
    };
    worker.onmessageerror = () => {
      finish();
      reject(new Error("Excel worker message could not be read"));
    };
    worker.postMessage(request, [transfer]);
  });
}

async function runWithFallback<T>(
  file: File,
  request: (buffer: ArrayBuffer) => ExcelWorkerRequest,
  fallback: () => Promise<T>,
): Promise<T> {
  if (typeof Worker === "undefined") return fallback();

  const buffer = await file.arrayBuffer();
  try {
    return await runWorker<T>(request(buffer), buffer);
  } catch (error) {
    console.warn("[Excel] Worker unavailable; using compatibility fallback", error);
    return fallback();
  }
}

export function importExcelInWorker(file: File, kind: ImportKind) {
  return runWithFallback(
    file,
    (buffer) => ({ mode: "shared", buffer, name: file.name, kind }),
    async () => {
      const { importFromExcel } = await import("./exportImport");
      return importFromExcel(file, kind);
    },
  );
}

export function importUsageInWorker(file: File, importMonthId: number) {
  return runWithFallback(
    file,
    (buffer) => ({ mode: "usage", buffer, importMonthId }),
    async () => {
      const { parseUsageExcel } = await import("./parseUsageExcel");
      return parseUsageExcel(await file.arrayBuffer(), importMonthId);
    },
  );
}

export function importInstallmentsInWorker(file: File, year: 2025 | 2026) {
  return runWithFallback(
    file,
    (buffer) => ({ mode: "installments", buffer, year }),
    async () => {
      const { parseInstallmentsExcel } = await import("./parseInstallmentsExcel");
      return parseInstallmentsExcel(await file.arrayBuffer(), year);
    },
  ) as Promise<Installment[]>;
}
