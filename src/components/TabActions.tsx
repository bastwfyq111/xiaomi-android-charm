import * as XLSX from "xlsx";
import { Printer, FileSpreadsheet, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { fmt } from "@/lib/format";

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

const escapeHtml = (s: any) =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

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
  const handlePrint = () => {
    if (!rows.length) {
      toast.error("لا توجد بيانات للطباعة");
      return;
    }
    const w = window.open("", "_blank", "width=1200,height=800");
    if (!w) return;

    const head = `
      <meta charset="utf-8" />
      <title>${escapeHtml(title)}</title>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
      <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        @page { size: A4 landscape; margin: 6mm; }
        html { margin: 0; padding: 0; }
        body {
          font-family: 'Cairo', 'Tajawal', Tahoma, Arial, sans-serif;
          padding: 4mm 6mm;
          color: #000 !important;
          direction: rtl;
          margin: 0;
          width: 100%;
          box-sizing: border-box;
          font-weight: 600;
          font-size: 10px;
          line-height: 1.35;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        h1 {
          text-align: center;
          color: #000 !important;
          margin: 0 0 3px;
          font-size: 15px;
          font-weight: 800;
        }
        .sub {
          text-align: center;
          color: #000 !important;
          margin-bottom: 5px;
          font-size: 9.5px;
          font-weight: 700;
          border-bottom: 1.5pt solid #b8860b;
          padding-bottom: 4px;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          table-layout: auto;
          font-size: 10px;
        }
        th, td {
          border: 0.75pt solid #000;
          padding: 2.5px 3px;
          text-align: center;
          white-space: nowrap;
          color: #000 !important;
          font-weight: 700;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        thead th {
          background: #f5deb3 !important;
          color: #000 !important;
          font-weight: 800;
          font-size: 10px;
        }
        tbody tr:nth-child(even) td { background: #f8fafc !important; }
        .num {
          font-family: 'Courier New', monospace;
          text-align: center;
          direction: ltr;
          color: #000 !important;
          font-weight: 1000;
        }
        .idx { width: 28px; text-align: center; color: #000 !important; font-weight: 700; }
        .total-row td {
          background: #fef3c7 !important;
          font-weight: 800;
          border-top: 1.5pt solid #92400e;
        }
        thead { display: table-header-group; }
        tfoot { display: table-footer-group; }
        tr { page-break-inside: avoid; }
        @media print {
          * { margin: 0; padding: 0; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          body { margin: 0; padding: 4mm 6mm; color: #000 !important; font-weight: 600; }
          th, td { color: #000 !important; font-weight: 700; }
        }
      </style>
    `;

    const head2 = `<tr><th class="idx">م</th>${columns
      .map((c) => `<th>${escapeHtml(c.label)}</th>`)
      .join("")}</tr>`;

    // حساب الإجماليات للأعمدة الرقمية
    const totals: Record<string, number> = {};
    columns.forEach((c) => {
      if (numericKeys.includes(c.key)) {
        totals[c.key] = rows.reduce((sum, r) => sum + (Number(r[c.key]) || 0), 0);
      }
    });

    const totalRow = `<tr class="total-row"><td class="idx"></td>${columns
      .map((c) => {
        if (numericKeys.includes(c.key)) {
          return `<td class="num">${escapeHtml(fmt(totals[c.key] || 0))}</td>`;
        }
        return `<td></td>`;
      })
      .join("")}</tr>`;

    const body2 = rows
      .map(
        (r, i) =>
          `<tr><td class="idx">${i + 1}</td>${columns
            .map((c) => {
              const v = r[c.key];
              const isNum = numericKeys.includes(c.key) || typeof v === "number";
              return `<td class="${isNum ? "num" : ""}">${
                isNum ? escapeHtml(fmt(Number(v) || 0)) : escapeHtml(v)
              }</td>`;
            })
            .join("")}</tr>`
      )
      .join("");

    const today = new Date().toLocaleDateString("ar-EG-u-nu-latn");

    w.document.write(`<!doctype html><html lang="ar" dir="rtl"><head>${head}</head><body>
      <h1>${escapeHtml(title)}</h1>
      <div class="sub">المجلس اليمني للاختصاصات الطبية - صعدة • ${today} • عدد السجلات: ${rows.length}</div>
      <table><thead>${head2}</thead><tbody>${body2}${totalRow}</tbody></table>
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

  const handleExcel = () => {
    if (!rows.length) {
      toast.error("لا توجد بيانات للتصدير");
      return;
    }

    const data = rows.map((r, i) => {
      const out: Record<string, any> = { م: i + 1 };
      columns.forEach((c) => {
        const v = r[c.key];
        out[c.label] =
          numericKeys.includes(c.key) || typeof v === "number" ? Number(v) || 0 : v ?? "";
      });
      return out;
    });

    // إضافة صف الإجمالي للتصدير Excel
    const totalRow: Record<string, any> = { م: "الإجمالي" };
    columns.forEach((c) => {
      if (numericKeys.includes(c.key)) {
        totalRow[c.label] = rows.reduce((sum, r) => sum + (Number(r[c.key]) || 0), 0);
      } else {
        totalRow[c.label] = "";
      }
    });
    data.push(totalRow);

    const ws = XLSX.utils.json_to_sheet(data);

    if (!ws["!views"]) ws["!views"] = [];
    ws["!views"].push({ RTL: true });

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, title.slice(0, 30) || "Sheet1");
    XLSX.writeFile(wb, `${fileName}-${new Date().toISOString().slice(0, 10)}.xlsx`);
    toast.success("تم تصدير الملف بنجاح");
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
