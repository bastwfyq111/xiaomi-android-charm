import { useState } from "react";
import {
  addReportHeader,
  appendRows,
  createExcelWorkbook,
  downloadWorkbook,
  formatWorksheet,
  getExcelPalette,
  loadReportLetterhead,
} from "@/lib/excelExport";
import { Printer, FileSpreadsheet, Trash2, Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useReportDate } from "@/lib/reportDate";
import { exportTablePdf } from "@/lib/pdfExporter";
import { buildTableHtml, escapeHtml, tablePrintStyles } from "@/lib/printTableHtml";

export type TabCol = { key: string; label: string };

type Props = {
  title: string;
  rows: Record<string, any>[];
  columns: TabCol[];
  fileName: string;
  onClear?: () => void;
  numericKeys?: string[];
  className?: string;
  printLabel?: string;
};

export default function TabActions({
  title,
  rows,
  columns,
  fileName,
  onClear,
  numericKeys = [],
  className = "",
  printLabel = "طباعة",
}: Props) {
  const [pdfBusy, setPdfBusy] = useState(false);
  const { reportDate, reportDateLabel } = useReportDate();

  // نفس محتوى وأنماط الطباعة المستخدمة في تنزيل PDF (مصدر واحد مشترك)
  const tableHtml = () => buildTableHtml({ title, columns, rows, numericKeys, reportDate });
  const printStyles = tablePrintStyles;


  const handlePrint = () => {
    if (!rows.length) {
      toast.error("لا توجد بيانات للطباعة");
      return;
    }
    const w = window.open("", "_blank", "width=1200,height=800");
    if (!w) return;

    const head = `
      <meta charset="utf-8" />
      <title>${escapeHtml(title)} - ${escapeHtml(reportDateLabel)}</title>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
      <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      <style>
        ${printStyles}
        @page { size: A4 landscape; margin: 6mm; }
        @media print {
          * { margin: 0; padding: 0; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          body { margin: 0; padding: 4mm 6mm; color: #000 !important; font-weight: 600; }
          th, td { color: #000 !important; font-weight: 700; }
        }
      </style>
    `;

    w.document.write(`<!doctype html><html lang="ar" dir="rtl"><head>${head}</head><body>
      ${tableHtml()}
      <script>
        window.onload = () => {
          setTimeout(() => {
            window.print();
          }, 300);
        };
      </script>
    </body></html>`);
    w.document.close();
  };

  const handleDownloadPdf = async () => {
    if (!rows.length) {
      toast.error("لا توجد بيانات للتصدير");
      return;
    }
    if (pdfBusy) return;
    setPdfBusy(true);
    try {
      await exportTablePdf({ title, columns, rows, numericKeys, fileName, reportDate });
      toast.success("تم تنزيل الملف بنجاح");
    } catch (err) {
      console.error("PDF export error:", err);
      toast.error("تعذّر تنزيل ملف PDF، حاول مرة أخرى");
    } finally {
      setPdfBusy(false);
    }
  };


  const handleExcel = async () => {
    if (!rows.length) {
      toast.error("لا توجد بيانات للتصدير");
      return;
    }

    try {
      const headers = ["م", ...columns.map((c) => c.label)];
      const dataRows = rows.map((r, i) => [
        i + 1,
        ...columns.map((c) => {
          const v = r[c.key];
          return numericKeys.includes(c.key) || typeof v === "number" ? Number(v) || 0 : v ?? "";
        }),
      ]);
      const totalRow = [
        "الإجمالي",
        ...columns.map((c) =>
          numericKeys.includes(c.key)
            ? rows.reduce((sum, r) => sum + (Number(r[c.key]) || 0), 0)
            : "",
        ),
      ];

      const workbook = await createExcelWorkbook();
      const worksheet = workbook.addWorksheet(title.slice(0, 31) || "Sheet1");
      const imageId = await loadReportLetterhead(workbook);
      const dataStartRow = addReportHeader(workbook, worksheet, {
        title,
        reportDateLabel,
        recordCount: rows.length,
        totalColumns: headers.length,
        palette: getExcelPalette(title),
      }, imageId);

      appendRows(worksheet, [headers, ...dataRows, totalRow], dataStartRow);
      formatWorksheet(worksheet, {
        headerRow: dataStartRow,
        totalRows: [dataStartRow + dataRows.length + 1],
        palette: getExcelPalette(title),
      });
      await downloadWorkbook(workbook, `${fileName}-${reportDate}.xlsx`);
      toast.success("تم تصدير الملف بنجاح");
    } catch (error) {
      console.error("Excel export error:", error);
      toast.error("تعذّر تصدير ملف Excel، حاول مرة أخرى");
    }
  };

  const handleClear = () => {
    if (!onClear) return;
    if (!confirm(`هل أنت متأكد من مسح جميع بيانات: ${title}؟ لا يمكن التراجع.`)) return;
    onClear();
    toast.success("تم مسح البيانات");
  };

  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      <button
        onClick={handlePrint}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-white text-[#10528e] border border-[#10528e]/30 rounded-lg text-xs font-bold shadow-sm hover:bg-blue-50 active:scale-95 transition-all cursor-pointer"
        title="طباعة هذا التبويب"
      >
        <Printer className="w-4 h-4" /> {printLabel}
      </button>
      <button
        onClick={handleDownloadPdf}
        disabled={pdfBusy}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-[#10528e] text-white rounded-lg text-xs font-bold shadow-sm hover:bg-[#0d4272] active:scale-95 transition-all cursor-pointer disabled:opacity-60 disabled:cursor-wait"
        title="تنزيل PDF بنفس تنسيق الطباعة"
      >
        {pdfBusy ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" /> جارٍ التحضير…
          </>
        ) : (
          <>
            <Download className="w-4 h-4" /> تنزيل PDF
          </>
        )}
      </button>

      <button
        onClick={handleExcel}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-bold shadow-sm hover:bg-emerald-700 active:scale-95 transition-all cursor-pointer"
        title="تصدير إلى Excel"
      >
        <FileSpreadsheet className="w-4 h-4" /> تصدير Excel
      </button>
      {onClear && (
        <button
          onClick={handleClear}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 text-white rounded-lg text-xs font-bold shadow-sm hover:bg-rose-700 active:scale-95 transition-all cursor-pointer"
          title="مسح بيانات هذا التبويب"
        >
          <Trash2 className="w-4 h-4" /> مسح البيانات
        </button>
      )}
    </div>
  );
}
