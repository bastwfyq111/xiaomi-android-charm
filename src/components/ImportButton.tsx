import { useRef } from "react";
import { toast } from "sonner";
import { useStore } from "@/lib/store";
import type { ImportKind } from "@/lib/exportImport";
import { importExcelInWorker } from "@/lib/excelImportWorkerClient";

const LABELS: Record<ImportKind, string> = {
  hafiza: "حافظة",
  account: "حساب",
  journal: "قيد",
  installments: "قسط",
  revenue: "إيراد",
  monthly: "كشف",
};

export default function ImportButton({ kind }: { kind: ImportKind }) {
  const ref = useRef<HTMLInputElement>(null);
  const importData = useStore((s) => s.importData);

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    try {
      const data = await importExcelInWorker(f, kind);
      let count = 0;
      if (kind === "account") count = data.accounts.length;
      else if (kind === "revenue") count = Object.keys(data.revenue).length;
      else if (kind === "monthly") count = data.journal.length;
      else if (kind === "hafiza") count = data.hafiza.length;
      else if (kind === "journal") count = data.journal.length;
      else if (kind === "installments") count = data.installments.length;
      if (!count) {
        toast.error(`لم يتم العثور على بيانات ${LABELS[kind]} في الملف`);
      } else {
        importData(data);
        toast.success(`تم استيراد ${count} ${LABELS[kind]}`);
      }
    } catch (err) {
      console.error(err);
      toast.error("فشل قراءة الملف");
    }
    if (ref.current) ref.current.value = "";
  };

  return (
    <label className="px-3 py-1.5 border-2 border-primary text-White rounded-lg text-sm font-semibold cursor-pointer hover:bg-primary/5 inline-flex items-center gap-1">
      استيراد Excel
      <input ref={ref} type="file" accept=".xlsx,.xls" onChange={onFile} className="hidden" />
    </label>
  );
}
