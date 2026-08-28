import React, { useEffect, useState, useRef, useCallback } from "react";  
import {  
  FileSpreadsheet, Plus, Trash2, Upload, Download, FileText, Printer, Eraser,  
} from "lucide-react";  
import * as XLSX from "xlsx";
import { useReportDate } from "@/lib/reportDate";
import { toast } from "sonner";
import { reportLetterheadHtml } from "@/lib/printTableHtml";
import { printReportHtml } from "@/lib/nativePrinter";
import { importUsageInWorker } from "@/lib/excelImportWorkerClient";
import { saveBlobToInternalStorage } from "@/lib/nativeFileStorage";
import WebActionMenu from "./WebActionMenu";
  
const mainHeaders = ["رقم الاستمارة", "كشف التسوية", "التاريخ", "البيان"];  
const STORAGE_KEY = "app-tabs-usages-v1";  
  
const COLORS = { TOTAL_ALL: "#E5DFEC", BAB_TOTAL: "#DBEEF3", FASL: "#FDE9D9", BAND: "#C6D9F0" };  
const ARGB = { TOTAL_ALL: "FFE5DFEC", BAB_TOTAL: "FFDBEEF3", FASL: "FFFDE9D9", BAND: "FFC6D9F0",  
  DARK: "FF0B3D6D", GOLD: "FFFFD54A", CUR: "FFDBEAFE", PREV: "FFE2E8F0" };  
  
const dataColumnsOrder = [  
  "اجمالي عام الاستخدامات",  
  "اجمالي الباب الاول",  
  "الفصل الاول_باب1",  
  "المرتبات الاساسية", "اجور تعاقدية", "اجور عمل اضافي", "مكافات", "طبيعة عمل", "بدل ريف", "بدل سكن", "بدل تحديث",  
  "الفصل الثاني_باب1",  
  "ح/حكومة", "اصابة عمل",  
  "اجمالي الباب الثاني",  
  "الفصل الاول_باب2",  
  "مياه", "انارة", "ادوات كتابية", "نشر واعلان", "اتصالات", "مؤتمرات واحتفالات", "نفقات النظافة", "اخرى", "نقل مهام", "انتقالات داخلية", "ايجار مباني", "ادوية ومستلزمات طبية", "اغذية وملبوسات", "اخرى_2",  
  "الفصل الثاني_باب2",  
  "صيانة مباني", "وقود وزيوت", "قطع غيار وصيانة وسائل النقل", "قطع غيار وصيانة الالات والمعدات والاثاث",  
  "اجمالي الباب الرابع",  
  "مركز صحي قحزة", "وحدة الغسيل الكلوي", "مشروع دعم الكلى", "الصالة والمطبخ", "مركز صحي", "الامانات",  
];  
  
const allCols = [...mainHeaders, ...dataColumnsOrder];  
const TOTAL_COLS = allCols.length + 1; 
  
const isFormulaCol = (col: string) => col.includes("اجمالي") || col.includes("الفصل");  
  
const colArgb = (col: string) =>  
  col === "اجمالي عام الاستخدامات" ? ARGB.TOTAL_ALL  
  : col.includes("اجمالي الباب") ? ARGB.BAB_TOTAL  
  : col.includes("الفصل") ? ARGB.FASL : undefined;  
  
const MONTHS = [  
  { id: 1, name: "يناير" }, { id: 2, name: "فبراير" }, { id: 3, name: "مارس" }, { id: 4, name: "أبريل" },  
  { id: 5, name: "مايو" }, { id: 6, name: "يونيو" }, { id: 7, name: "يوليو" }, { id: 8, name: "أغسطس" },  
  { id: 9, name: "سبتمبر" }, { id: 10, name: "أكتوبر" }, { id: 11, name: "نوفمبر" }, { id: 12, name: "ديسمبر" },  
];  
  
const norm = (s: any) => String(s ?? "").replace(/\s+/g, " ").trim();

const normalizeDigits = (value: string) => value.replace(/[٠-٩]/g, (digit) =>
  String("٠١٢٣٤٥٦٧٨٩".indexOf(digit))
);

const MONTH_ALIASES = [
  ["يناير", "jan", "january"], ["فبراير", "فبر", "feb", "february"], ["مارس", "mar", "march"],
  ["أبريل", "ابريل", "apr", "april"], ["مايو", "may"], ["يونيو", "يونية", "jun", "june"],
  ["يوليو", "july", "jul"], ["أغسطس", "اغسطس", "aug", "august"], ["سبتمبر", "sep", "september"],
  ["أكتوبر", "اكتوبر", "oct", "october"], ["نوفمبر", "nov", "november"], ["ديسمبر", "dec", "december"],
];

const parseMonthId = (value: any): number | null => {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value.getMonth() + 1;
  const text = normalizeDigits(norm(value)).toLowerCase();
  if (!text) return null;

  const aliasIndex = MONTH_ALIASES.findIndex((aliases) => aliases.some((alias) =>
    text === alias || text.startsWith(`${alias} `) || text.includes(`شهر ${alias}`) || text.includes(`month ${alias}`)
  ));
  if (aliasIndex >= 0) return aliasIndex + 1;

  const monthLabel = text.match(/(?:شهر|month)\s*([0-9]{1,2})/);
  if (monthLabel) {
    const month = Number(monthLabel[1]);
    if (month >= 1 && month <= 12) return month;
  }

  const yearFirst = text.match(/(?:^|[^0-9])20[0-9]{2}[\/\\.-]([0-9]{1,2})(?:[\/\\.-][0-9]{1,2})?(?:$|[^0-9])/);
  if (yearFirst) {
    const month = Number(yearFirst[1]);
    if (month >= 1 && month <= 12) return month;
  }

  const numeric = Number(text.replace(/,/g, ""));
  return Number.isInteger(numeric) && numeric >= 1 && numeric <= 12 ? numeric : null;
};

const IMPORT_MONTH_KEYS = ["monthid", "month id", "month_id", "month", "monthname", "الشهر", "شهر", "اسم الشهر", "رقم الشهر", "الفترة"];
const IMPORT_DATE_KEYS = ["التاريخ", "date", "تاريخ"];

const hasNamedMonth = (value: any) => {
  const text = normalizeDigits(norm(value)).toLowerCase();
  return MONTH_ALIASES.some((aliases) => aliases.some((alias) =>
    text === alias || text.startsWith(`${alias} `) || text.includes(`شهر ${alias}`) || text.includes(`month ${alias}`)
  ));
};

const monthIdFromLookup = (lookup: Record<string, any>) => {
  for (const key of IMPORT_MONTH_KEYS) {
    const monthId = parseMonthId(lookup[norm(key).toLowerCase()]);
    if (monthId) return monthId;
  }
  for (const key of IMPORT_DATE_KEYS) {
    const monthId = parseMonthId(lookup[norm(key).toLowerCase()]);
    if (monthId) return monthId;
  }
  return null;
};
  
const formatNumberEn = (val: any) => {  
  if (val === "" || val === null || val === undefined) return "";  
  const num = Number(val);  
  if (isNaN(num)) return val;  
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(num);  
};  
  
const sumColumns = (row: any, cols: string[]): number =>  
  cols.reduce((acc, col) => {  
    const num = Number(row[col]);  
    return acc + (isNaN(num) ? 0 : num);  
  }, 0);  
  
const recomputeRow = (row: any) => {  
  const newRow = { ...row };  
  const fasl1Bab1 = sumColumns(newRow, ["المرتبات الاساسية", "اجور تعاقدية", "اجور عمل اضافي", "مكافات", "طبيعة عمل", "بدل ريف", "بدل سكن", "بدل تحديث"]);  
  const fasl2Bab1 = sumColumns(newRow, ["ح/حكومة", "اصابة عمل"]);  
  newRow["الفصل الاول_باب1"] = fasl1Bab1;  
  newRow["الفصل الثاني_باب1"] = fasl2Bab1;  
  newRow["اجمالي الباب الاول"] = fasl1Bab1 + fasl2Bab1;  
  
  const fasl1Bab2 = sumColumns(newRow, ["مياه", "انارة", "ادوات كتابية", "نشر واعلان", "اتصالات", "مؤتمرات واحتفالات", "نفقات النظافة", "اخرى", "نقل مهام", "انتقالات داخلية", "ايجار مباني", "ادوية ومستلزمات طبية", "اغذية وملبوسات", "اخرى_2"]);  
  const fasl2Bab2 = sumColumns(newRow, ["صيانة مباني", "وقود وزيوت", "قطع غيار وصيانة وسائل النقل", "قطع غيار وصيانة الالات والمعدات والاثاث"]);  
  newRow["الفصل الاول_باب2"] = fasl1Bab2;  
  newRow["الفصل الثاني_باب2"] = fasl2Bab2;  
  newRow["اجمالي الباب الثاني"] = fasl1Bab2 + fasl2Bab2;  
  
  newRow["اجمالي الباب الرابع"] = sumColumns(newRow, ["مركز صحي قحزة", "وحدة الغسيل الكلوي", "مشروع دعم الكلى", "الصالة والمطبخ", "مركز صحي", "الامانات"]);  
  newRow["اجمالي عام الاستخدامات"] =  
    newRow["اجمالي الباب الاول"] + newRow["اجمالي الباب الثاني"] + newRow["اجمالي الباب الرابع"];  
  return newRow;  
};  
  
const EditableCell: React.FC<{  
  rowId: string; field: string; value: any;  
  onCommit: (rowId: string, field: string, value: string) => void;  
}> = React.memo(({ rowId, field, value, onCommit }) => {  
  const isDate = field === "التاريخ";  
  return (  
    <input  
      type={isDate ? "date" : "text"}  
      value={value ?? ""}  
      onChange={(e) => onCommit(rowId, field, e.target.value)}  
      dir={isDate ? "ltr" : /^[\d.,\-]*$/.test(String(value ?? "")) ? "ltr" : "rtl"}  
      className="w-full h-full min-w-[70px] bg-transparent focus:bg-amber-50 focus:outline-none focus:ring-1 focus:ring-blue-500 rounded px-1 text-center text-[12px] text-slate-800"  
    />  
  );  
});  
EditableCell.displayName = "EditableCell";  
  
const FormulaCell: React.FC<{ value: any }> = React.memo(({ value }) => (  
  <div className="font-bold text-center text-[12px] text-slate-800" dir="ltr">  
    {formatNumberEn(value)}  
  </div>  
));  
FormulaCell.displayName = "FormulaCell";  
  
const THEAD_HTML = `  
<tr>  
  <th rowspan="4">رقم الاستمارة</th><th rowspan="4">كشف التسوية</th>  
  <th rowspan="4">التاريخ</th><th rowspan="4">البيان</th>  
  <th rowspan="4" class="c-total">اجمالي عام الاستخدامات</th>  
  <th colspan="13" class="c-bab">اجمالي الباب الاول</th>  
  <th colspan="21" class="c-bab">اجمالي الباب الثاني</th>  
  <th colspan="7" class="c-bab">اجمالي الباب الرابع</th>  
  <th rowspan="4">إجراء</th>  
</tr>  
<tr>  
  <th rowspan="3" class="c-bab">الإجمالي</th>  
  <th colspan="10" class="c-fasl">الفصل الاول</th>  
  <th colspan="2" class="c-fasl">الفصل الثاني</th>  
  <th rowspan="3" class="c-bab">الإجمالي</th>  
  <th colspan="15" class="c-fasl">الفصل الاول</th>  
  <th colspan="5" class="c-fasl">الفصل الثاني</th>  
  <th rowspan="3" class="c-bab">الإجمالي</th>  
  <th rowspan="3">مركز صحي قحزة</th><th rowspan="3">وحدة الغسيل الكلوي</th>  
  <th rowspan="3">مشروع دعم الكلى</th><th rowspan="3">الصالة والمطبخ</th>  
  <th rowspan="3">مركز صحي</th><th rowspan="3">الامانات</th>  
</tr>  
<tr>  
  <th rowspan="2" class="c-fasl">إجمالي ف1</th>  
  <th colspan="8" class="c-band">المرتبات والأجور</th>  
  <th rowspan="2" class="c-fasl">إجمالي ف2</th>  
  <th rowspan="2">ح/حكومة</th><th rowspan="2">اصابة عمل</th>  
  <th rowspan="2" class="c-fasl">إجمالي ف1</th>  
  <th rowspan="2">مياه</th><th rowspan="2">انارة</th><th rowspan="2">ادوات كتابية</th>  
  <th rowspan="2">نشر واعلان</th><th rowspan="2">اتصالات</th><th rowspan="2">مؤتمرات</th>  
  <th rowspan="2">نظافة</th><th rowspan="2">اخرى</th><th rowspan="2">نقل مهام</th>  
  <th rowspan="2">انتقالات</th><th rowspan="2">ايجار مباني</th><th rowspan="2">ادوية</th>  
  <th rowspan="2">اغذية</th><th rowspan="2">اخرى2</th>  
  <th rowspan="2" class="c-fasl">إجمالي ف2</th>  
  <th rowspan="2">صيانة مباني</th><th rowspan="2">وقود وزيوت</th>  
  <th rowspan="2">قطع غيار نقل</th><th rowspan="2">قطع غيار معدات</th>  
</tr>  
<tr>  
  <th>اساسية</th><th>تعاقدية</th><th>اضافي</th><th>مكافات</th>  
  <th>طبيعة عمل</th><th>بدل ريف</th><th>بدل سكن</th><th>تحديث</th>  
</tr>`;  
  
const AppTabs: React.FC = () => {  
  const { reportDate, reportDateLabel } = useReportDate();
  const [dataRows, setDataRows] = useState<any[]>(() => {  
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); }  
    catch { return []; }  
  });  
  const [importMonthId, setImportMonthId] = useState<number>(1);  
  const fileInputRef = useRef<HTMLInputElement>(null);  
  
  const latestDataRows = useRef(dataRows);
  const storageTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    latestDataRows.current = dataRows;
    if (storageTimer.current) clearTimeout(storageTimer.current);
    storageTimer.current = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(latestDataRows.current));
      } catch (error) {
        console.error("[Storage] Failed to persist usage rows", error);
      }
      storageTimer.current = null;
    }, 80);
    return () => {
      if (storageTimer.current) clearTimeout(storageTimer.current);
    };
  }, [dataRows]);

  useEffect(() => {
    const flush = () => {
      if (storageTimer.current) clearTimeout(storageTimer.current);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(latestDataRows.current));
      } catch (error) {
        console.error("[Storage] Failed to flush usage rows", error);
      }
      storageTimer.current = null;
    };
    window.addEventListener("pagehide", flush);
    return () => {
      window.removeEventListener("pagehide", flush);
      flush();
    };
  }, []);
  
  const rowsOfMonth = useCallback(  
    (id: number) => dataRows.filter((r) => r.monthId === id),  
    [dataRows]  
  );  
  
  const makeEmptyRow = (monthId: number) => {  
    const r: any = { id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, monthId };  
    mainHeaders.forEach((h) => (r[h] = ""));  
    dataColumnsOrder.forEach((h) => (r[h] = ""));  
    return recomputeRow(r);  
  };  
  
  useEffect(() => {  
    setDataRows((prev) => {  
      const counts: Record<number, number> = {};  
      prev.forEach((r) => (counts[r.monthId] = (counts[r.monthId] || 0) + 1));  
      const additions: any[] = [];  
      MONTHS.forEach((m) => { if (!counts[m.id]) additions.push(makeEmptyRow(m.id), makeEmptyRow(m.id)); });  
      return additions.length ? [...prev, ...additions] : prev;  
    });  
  }, []); 
  
  const updateCell = useCallback((rowId: string, key: string, rawValue: string) => {  
    setDataRows((prev) =>  
      prev.map((row) => (row.id === rowId ? recomputeRow({ ...row, [key]: rawValue }) : row))  
    );  
  }, []);  
  
  const handleAddRow = (monthId: number) => setDataRows((prev) => [...prev, makeEmptyRow(monthId)]);  
  
  const handleDeleteRow = (rowId: string) => {  
    if (!window.confirm("هل تريد حذف هذا السطر؟")) return;  
    setDataRows((prev) => prev.filter((row) => row.id !== rowId));  
  };  
  
  const handleClearAll = () => {  
    if (!window.confirm("سيتم حذف جميع بيانات كل الأشهر نهائياً. هل أنت متأكد؟")) return;  
    const fresh: any[] = [];  
    MONTHS.forEach((m) => fresh.push(makeEmptyRow(m.id), makeEmptyRow(m.id)));  
    setDataRows(fresh);  
  };  
  
  const sumOf = (rows: any[], col: string) =>  
    rows.reduce((acc, row) => acc + (Number(row[col]) || 0), 0);  
  
  const monthTotals = (id: number) => {  
    const cur = rowsOfMonth(id);  
    const before = dataRows.filter((r) => r.monthId < id);  
    const cum = dataRows.filter((r) => r.monthId <= id);  
    return {  
      current: (c: string) => sumOf(cur, c),  
      before: (c: string) => sumOf(before, c),  
      cumulative: (c: string) => sumOf(cum, c),  
    };  
  };  
  
  const handleImportClick = () => fileInputRef.current?.click();  
  
  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    try {
      const imported = await importUsageInWorker(file, importMonthId);
      if (!imported.length) {
        toast.error("لم يتم العثور على صفوف استخدامات صالحة في ملف Excel");
        return;
      }
      const importedMonths = new Set(imported.map((row: any) => row.monthId));
      setDataRows((prev) => [
        ...prev.filter((row) => !importedMonths.has(row.monthId)),
        ...imported,
      ]);
      toast.success(`تم استيراد ${imported.length} صف إلى ${importedMonths.size} شهر`);
    } catch (error) {
      console.error("[Excel] Usage import failed", error);
      toast.error("تعذّر قراءة الملف. تأكد أنه ملف Excel صالح أو صادر من هذا الجدول.");
    }
  };
  
  const border = {  
    top: { style: "thin" as const, color: { argb: "FF000000" } },
    left: { style: "thin" as const, color: { argb: "FF000000" } },
    bottom: { style: "thin" as const, color: { argb: "FF000000" } },
    right: { style: "thin" as const, color: { argb: "FF000000" } },
  };  
  
  const handleExportExcel = async () => {  
    const ExcelJS = (await import("exceljs")).default;  
    const wb = new ExcelJS.Workbook();  

    const disp = wb.addWorksheet("عرض", {
      views: [{ rightToLeft: true, state: "frozen", ySplit: 2 }],
      properties: { defaultRowHeight: 20, tabColor: { argb: ARGB.DARK } },
      pageSetup: {
        orientation: "landscape",
        paperSize: 9,
        fitToPage: true,
        fitToWidth: 1,
        fitToHeight: 0,
        horizontalDpi: 300,
        verticalDpi: 300,
        margins: { left: 0.25, right: 0.25, top: 0.35, bottom: 0.35, header: 0.15, footer: 0.15 },
      },
    });
  
    disp.mergeCells(1, 1, 1, allCols.length);  
    const title = disp.getCell(1, 1);  
    title.value = "سجل مفردات الاستخدامات والنفقات العامة";  
    title.font = { bold: true, size: 14, color: { argb: ARGB.DARK } };  
    title.alignment = { horizontal: "center", vertical: "middle", wrapText: true, shrinkToFit: true };
  
    disp.getRow(1).height = 28;
    const hdr = disp.getRow(2);
    hdr.height = 40;
    allCols.forEach((c, i) => {  
      const cell = hdr.getCell(i + 1);  
      cell.value = c;  
      cell.font = { bold: true, size: 9 };  
      cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true, shrinkToFit: true };
      cell.border = border;  
      const argb = colArgb(c);  
      if (argb) cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb } };  
    });  
    disp.getColumn(1).width = 12;
    allCols.forEach((_, i) => (disp.getColumn(i + 1).width = i < 4 ? 14 : 11));
  
    let r = 3;  
    MONTHS.forEach((m) => {  
      const rows = rowsOfMonth(m.id);  
      const t = monthTotals(m.id);  
  
      disp.mergeCells(r, 1, r, allCols.length);  
      const mc = disp.getCell(r, 1);  
      mc.value = `شهر ${m.name}`;  
      mc.font = { bold: true, color: { argb: ARGB.GOLD } };  
      mc.fill = { type: "pattern", pattern: "solid", fgColor: { argb: ARGB.DARK } };  
      mc.alignment = { horizontal: "right", vertical: "middle", wrapText: true, shrinkToFit: true };
      r++;  
  
      rows.forEach((row) => {  
        allCols.forEach((c, i) => {  
          const cell = disp.getCell(r, i + 1);  
          const v = row[c];  
          cell.value = (typeof v === "number") ? v : (v === "" ? "" : (isNaN(Number(v)) ? v : Number(v)));  
          cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true, shrinkToFit: true };
          cell.font = { size: 9, bold: isFormulaCol(c) };  
          cell.border = border;  
          const argb = colArgb(c);  
          if (argb) cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb } };  
        });  
        r++;  
      });  
  
      const rowCur = (label: string, getter: (c: string) => number, fillArgb: string, fontArgb: string) => {  
        disp.mergeCells(r, 1, r, 4);  
        const lc = disp.getCell(r, 1);  
        lc.value = label; lc.font = { bold: true, color: { argb: fontArgb } };  
        lc.alignment = { horizontal: "right", vertical: "middle", wrapText: true, shrinkToFit: true };
        lc.fill = { type: "pattern", pattern: "solid", fgColor: { argb: fillArgb } };  
        dataColumnsOrder.forEach((c, i) => {  
          const cell = disp.getCell(r, 5 + i);  
          const val = getter(c);  
          cell.value = val || "";  
          cell.font = { bold: true, size: 9, color: { argb: fontArgb } };  
          cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true, shrinkToFit: true };
          cell.border = border;  
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: fillArgb } };  
        });  
        r++;  
      };  
      rowCur(`إجمالي شهر ${m.name}`, t.current, ARGB.CUR, ARGB.DARK);  
      rowCur(`إجمالي الأشهر السابقة (قبل ${m.name})`, t.before, ARGB.PREV, "FF334155");  
      rowCur(`الإجمالي العام (حتى ${m.name})`, t.cumulative, ARGB.DARK, ARGB.GOLD);  
        });

    for (let col = 1; col <= allCols.length; col++) {
      let maxLength = allCols[col - 1].length;
      for (let row = 1; row <= disp.rowCount; row++) {
        const value = disp.getCell(row, col).value;
        maxLength = Math.max(maxLength, String(value ?? "").length);
      }
      disp.getColumn(col).width = Math.min(22, Math.max(col <= 4 ? 12 : 9, maxLength + 2));
    }
    disp.pageSetup.printArea = `A1:${XLSX.utils.encode_col(Math.min(allCols.length, 16384) - 1)}${Math.max(1, disp.rowCount)}`;
    disp.pageSetup.printTitlesRow = "2:2";
    disp.headerFooter = {
      oddFooter: '&L&"Arial"المجلس اليمني للاختصاصات الطبية&C&"Arial"صفحة &P من &N&R&"Arial"فرع صعدة',
    };

    const flat = wb.addWorksheet("بيانات", { views: [{ rightToLeft: true }] });
    flat.addRow(["monthId", ...allCols]);
    flat.getRow(1).height = 34;
    flat.getRow(1).eachCell({ includeEmpty: true }, (cell: any) => {
      cell.font = { bold: true, size: 9, color: { argb: "FFFFFFFF" } };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: ARGB.DARK } };
      cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true, shrinkToFit: true };
      cell.border = border;
    });
        MONTHS.forEach((m) =>
      rowsOfMonth(m.id).forEach((row) => flat.addRow([m.id, ...allCols.map((c) => row[c])]))
    );
    flat.eachRow({ includeEmpty: true }, (row: any) => {
      row.eachCell({ includeEmpty: true }, (cell: any) => {
        cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true, shrinkToFit: true };
        cell.border = border;
      });
    });
    allCols.forEach((col, index) => {
      const maxLength = Math.max(col.length, ...flat.getColumn(index + 2).values.slice(1).map((value: any) => String(value ?? "").length));
      flat.getColumn(index + 2).width = Math.min(22, Math.max(9, maxLength + 2));
    });
    flat.pageSetup = {
      orientation: "landscape",
      paperSize: 9,
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      margins: { left: 0.25, right: 0.25, top: 0.35, bottom: 0.35, header: 0.15, footer: 0.15 },
    };
    flat.pageSetup.printArea = `A1:${XLSX.utils.encode_col(Math.min(allCols.length + 1, 16384) - 1)}${Math.max(1, flat.rowCount)}`;
    flat.pageSetup.printTitlesRow = "1:1";
    flat.headerFooter = {
      oddFooter: '&L&"Arial"المجلس اليمني للاختصاصات الطبية&C&"Arial"صفحة &P من &N&R&"Arial"فرع صعدة',
    };
    const buf = await wb.xlsx.writeBuffer();
    const blob = new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const fileName = `الاستخدامات-${reportDate}.xlsx`;
    const internalUri = await saveBlobToInternalStorage(blob, fileName);
    if (internalUri) {
      toast.success("تم حفظ ملف Excel داخل تخزين التطبيق");
      return;
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);  
  };  
  
  const buildAllMonthsHtml = () => {  
    const numCell = (v: number) => (v > 0 ? formatNumberEn(v) : "-");  
    let body = "";  
    MONTHS.forEach((m) => {  
      const rows = rowsOfMonth(m.id);  
      const t = monthTotals(m.id);  
      body += `<tr class="month"><td colspan="${TOTAL_COLS}">شهر ${m.name}</td></tr>`;  
      rows.forEach((row) => {  
        body += "<tr>";  
        mainHeaders.forEach((h) => {
          const cls = h === "التاريخ" ? "date-cell" : h === "رقم الاستمارة" ? "num numeric-cell" : "text-cell";
          body += `<td class="${cls}">${row[h] ?? ""}</td>`;
        });
        dataColumnsOrder.forEach((c) => {
          const cls = `num numeric-cell${isFormulaCol(c) ? " formula" : ""}`;
          body += `<td class="${cls}">${row[c] === "" || row[c] === undefined ? "" : formatNumberEn(row[c])}</td>`;
        });
        body += `<td class="text-cell"></td></tr>`;
      });  
      const totalRow = (label: string, cls: string, getter: (c: string) => number) => {  
        let tr = `<tr class="${cls}"><td class="text-cell" colspan="4">${label}</td>`;
        dataColumnsOrder.forEach((c) => (tr += `<td class="num numeric-cell">${numCell(getter(c))}</td>`));
        tr += `<td class="text-cell"></td></tr>`;
        return tr;  
      };  
      body += totalRow(`إجمالي شهر ${m.name}`, "t-cur", t.current);  
      body += totalRow(`إجمالي الأشهر السابقة (قبل ${m.name})`, "t-prev", t.before);  
      body += totalRow(`الإجمالي العام (حتى ${m.name})`, "t-cum", t.cumulative);  
    });  
  
    return `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8">  
    <title>سجل مفردات الاستخدامات والنفقات العامة - ${reportDateLabel}</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">  
    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cairo:wght@600;700;800&family=Tajawal:wght@400;500;700&display=swap">  
    <style>  
      @page { size: A4 landscape; margin: 3mm; }
      * { box-sizing: border-box; }
      html, body { margin:0; padding:0; }
      body { font-family:'Cairo','Tajawal','Segoe UI',Tahoma,Arial,sans-serif; direction:rtl; color:#000 !important; padding:0 1px; width:100%; font-weight:700 !important; }
      .report-letterhead-block { display:flex; width:100%; max-width:none; height:30mm; min-height:30mm; max-height:30mm; overflow:hidden; align-items:stretch; justify-content:center; margin:0 0 3mm; page-break-before:avoid; page-break-after:avoid; }
      .report-letterhead-image { display:block; width:100% !important; max-width:none !important; height:100% !important; max-height:100% !important; object-fit:fill !important; object-position:center; margin:0 !important; }
      h2 { text-align:center; color:#000 !important; margin:0 0 3mm; font-weight:800; }
      .report-date { text-align:center; color:#000 !important; margin:0 0 5px; font-size:10px; font-weight:700; }
      table { width:100%; max-width:100%; min-width:0; border-collapse:collapse; table-layout:auto !important; font-size:clamp(7px,1.05vw,9px); }
      th, td { border:1px solid #000; padding:2px 3px !important; text-align:center; vertical-align:middle; white-space:normal; overflow:visible; overflow-wrap:break-word; word-break:normal; hyphens:none; line-height:1.15; font-size:clamp(7px,1.05vw,9px); color:#000 !important; font-weight:700 !important; -webkit-print-color-adjust:exact !important; print-color-adjust:exact !important; }
      .num, .numeric-cell, .date-cell { width:1%; min-width:0; white-space:nowrap !important; overflow:visible; overflow-wrap:normal; word-break:keep-all; hyphens:none; font-family:'Times New Roman',Times,serif !important; font-size:clamp(7px,1vw,10px) !important; font-variant-numeric:tabular-nums; direction:ltr; }
      .text-cell { width:auto; white-space:normal; overflow-wrap:break-word; word-break:normal; }
      .report-letterhead-cell { padding:0 !important; border:0 !important; width:100%; }
      thead th { background:#fff; font-weight:700; color:#000 !important; -webkit-print-color-adjust:exact !important; print-color-adjust:exact !important; }  
      thead .c-total { background:${COLORS.TOTAL_ALL}; -webkit-print-color-adjust:exact !important; print-color-adjust:exact !important; }  
      thead .c-bab   { background:${COLORS.BAB_TOTAL}; -webkit-print-color-adjust:exact !important; print-color-adjust:exact !important; }  
      thead .c-fasl  { background:${COLORS.FASL}; -webkit-print-color-adjust:exact !important; print-color-adjust:exact !important; }  
      thead .c-band  { background:${COLORS.BAND}; -webkit-print-color-adjust:exact !important; print-color-adjust:exact !important; }  
      td.formula { background:#f8fafc; font-weight:700; color:#000 !important; -webkit-print-color-adjust:exact !important; print-color-adjust:exact !important; }  
      tr.month td { background:#0b3d6d; color:#000 !important; font-weight:700 !important; text-align:right; padding:0 !important; -webkit-print-color-adjust:exact !important; print-color-adjust:exact !important; }
      tr.t-cur td  { background:#dbeafe; color:#000 !important; font-weight:700 !important; -webkit-print-color-adjust:exact !important; print-color-adjust:exact !important; }  
      tr.t-prev td { background:#e2e8f0; color:#000 !important; font-weight:700 !important; -webkit-print-color-adjust:exact !important; print-color-adjust:exact !important; }  
      tr.t-cum td  { background:#0b3d6d; color:#000 !important; font-weight:700 !important; -webkit-print-color-adjust:exact !important; print-color-adjust:exact !important; }  
      tr.t-cur td:first-child, tr.t-prev td:first-child, tr.t-cum td:first-child { text-align:right; padding-right:4px; }
      @media print { @page { size:A4 landscape; margin:3mm; } body { padding:0; } }
    </style></head><body>  
    ${reportLetterheadHtml()}
    <h2>سجل مفردات الاستخدامات والنفقات العامة</h2>
    <div class="report-date">تاريخ التقرير: ${reportDateLabel}</div>
    <table><thead>${THEAD_HTML}</thead><tbody>${body}</tbody></table>  
    </body></html>`;  
  };  
  
  const handlePrint = () => {
    const opened = printReportHtml(
      buildAllMonthsHtml(),
      `سجل مفردات الاستخدامات والنفقات العامة - ${reportDateLabel}`,
    );
    if (!opened) toast.error("تم منع فتح نافذة الطباعة، يرجى السماح بالنوافذ المنبثقة");
  };  
  
  const handlePdf = () => {  
    handlePrint();  
  };  
  
  return (  
    <div className="space-y-4 font-tajawal text-slate-800 p-2" dir="rtl">  
      <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 shadow-sm space-y-4">  
        <div className="flex flex-wrap items-center justify-between gap-3">  
          <div className="flex items-center gap-2">  
            <FileSpreadsheet className="w-5 h-5 text-blue-800" />  
            <h2 className="text-base font-bold text-blue-900">سجل مفردات الاستخدامات والنفقات العامة</h2>  
            <span className="rounded-full border border-amber-300 bg-amber-100 px-2 py-1 text-[10px] font-bold text-amber-900 whitespace-nowrap">اختبار الربط: main</span>
          </div>  
          <div className="flex flex-wrap items-center gap-2">  
            <select  
              value={importMonthId}  
              onChange={(e) => setImportMonthId(Number(e.target.value))}  
              className="text-xs border border-slate-300 rounded px-2 py-1.5"  
              title="الشهر الافتراضي للاستيراد (إن لم يحتوِ الملف عمود monthId)"  
            >  
              {MONTHS.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}  
            </select>  
            <div className="web-only-actions">
              <WebActionMenu
                label="إجراءات سجل الاستخدامات"
                actions={[
                  { label: "استيراد Excel", icon: Upload, onSelect: handleImportClick },
                  { label: "تصدير Excel", icon: Download, onSelect: handleExportExcel },
                  { label: "تحويل PDF", icon: FileText, onSelect: handlePdf },
                  { label: "طباعة", icon: Printer, onSelect: handlePrint },
                  { label: "مسح الكل", icon: Eraser, onSelect: handleClearAll, destructive: true },
                ]}
              />
            </div>
            <div className="apk-only-actions flex flex-wrap items-center gap-2">
              <button onClick={handleImportClick} className="flex items-center gap-1 bg-teal-600 hover:bg-teal-700 text-white text-xs px-3 py-2 rounded shadow-sm">
                <Upload className="w-4 h-4" /> استيراد Excel
              </button>
              <button onClick={handleExportExcel} className="flex items-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs px-3 py-2 rounded shadow-sm">
                <Download className="w-4 h-4" /> تصدير Excel
              </button>
              <button onClick={handlePdf} className="flex items-center gap-1 bg-rose-600 hover:bg-rose-700 text-white text-xs px-3 py-2 rounded shadow-sm">
                <FileText className="w-4 h-4" /> تحويل PDF
              </button>
              <button onClick={handlePrint} className="flex items-center gap-1 bg-slate-700 hover:bg-slate-800 text-white text-xs px-3 py-2 rounded shadow-sm">
                <Printer className="w-4 h-4" /> طباعة
              </button>
              <button onClick={handleClearAll} className="flex items-center gap-1 bg-red-600 hover:bg-red-700 text-white text-xs px-3 py-2 rounded shadow-sm">
                <Eraser className="w-4 h-4" /> مسح الكل
              </button>
            </div>
            <input ref={fileInputRef} type="file" accept=".xlsx,.xls" onChange={handleImportFile} className="hidden" />
          </div>  
        </div>  
      </div>  
  
      <div className="w-full overflow-x-auto border border-slate-300 shadow-sm bg-white rounded-b-lg" style={{ maxHeight: "70vh" }}>  
        <table className="w-max w-max table-auto text-center border-collapse !text-sm sm:!text-base !whitespace-nowrap">
          <thead className="sticky top-0 z-10 bg-white" dangerouslySetInnerHTML={{ __html: THEAD_HTML }}>  
          </thead>  
          
          {/* تم استكمال بناء جسم الجدول هنا */}
          <tbody>
            {MONTHS.map((m) => {
              const rows = rowsOfMonth(m.id);
              const t = monthTotals(m.id);

              return (
                <React.Fragment key={m.id}>
                  {/* شريط الشهر */}
                  <tr className="bg-blue-900 text-yellow-400 font-bold">
                    <td colSpan={TOTAL_COLS} className="text-right border border-slate-300 !px-0.5 !py-1 sm:!px-1 sm:!py-1 !text-[10px] sm:!text-xs whitespace-nowrap">
                      شهر {m.name}
                      <button 
                        onClick={() => handleAddRow(m.id)} 
                        className="mr-4 bg-blue-700 hover:bg-blue-600 text-white px-2 py-1 rounded text-xs inline-flex items-center gap-1"
                      >
                        <Plus className="w-3 h-3" /> إضافة سطر
                      </button>
                    </td>
                  </tr>

                  {/* صفوف البيانات الخاصة بالشهر */}
                  {rows.map((row) => (
                    <tr key={row.id} className="hover:bg-slate-50 transition-colors">
                      {mainHeaders.map((col) => (
                        <td key={col} className="border border-slate-300 bg-white !px-0.5 !py-1 sm:!px-1 sm:!py-1 !text-[10px] sm:!text-xs whitespace-nowrap">
                          <EditableCell rowId={row.id} field={col} value={row[col]} onCommit={updateCell} />
                        </td>
                      ))}
                      {dataColumnsOrder.map((col) => {
                        const isFormula = isFormulaCol(col);
                        return (
                          <td key={col} className={`border border-slate-300 p-0.5 ${isFormula ? "bg-slate-100" : "bg-white"}`}>
                            {isFormula ? (
                              <FormulaCell value={row[col]} />
                            ) : (
                              <EditableCell rowId={row.id} field={col} value={row[col]} onCommit={updateCell} />
                            )}
                          </td>
                        );
                      })}
                      {/* زر الحذف */}
                      <td className="border border-slate-300 bg-white !px-0.5 !py-1 sm:!px-1 sm:!py-1 !text-[10px] sm:!text-xs whitespace-nowrap">
                        <button onClick={() => handleDeleteRow(row.id)} className="text-red-500 hover:text-red-700">
                          <Trash2 className="w-4 h-4 mx-auto" />
                        </button>
                      </td>
                    </tr>
                  ))}

                  {/* صف الإجمالي للشهر الحالي */}
                  <tr className="bg-blue-100 text-blue-900 font-bold">
                    <td colSpan={4} className="border border-slate-300 text-right !px-0.5 !py-1 sm:!px-1 sm:!py-1 !text-[10px] sm:!text-xs whitespace-nowrap">إجمالي شهر {m.name}</td>
                    {dataColumnsOrder.map((c) => (
                      <td key={c} className="border border-slate-300 !px-0.5 !py-1 sm:!px-1 sm:!py-1 !text-[10px] sm:!text-xs whitespace-nowrap">
                        <FormulaCell value={t.current(c)} />
                      </td>
                    ))}
                    <td className="border border-slate-300 bg-white !px-0.5 !py-1 sm:!px-1 sm:!py-1 !text-[10px] sm:!text-xs whitespace-nowrap"></td>
                  </tr>

                  {/* صف إجمالي الأشهر السابقة */}
                  <tr className="bg-slate-200 text-slate-700 font-bold">
                    <td colSpan={4} className="border border-slate-300 text-right !px-0.5 !py-1 sm:!px-1 sm:!py-1 !text-[10px] sm:!text-xs whitespace-nowrap">إجمالي الأشهر السابقة (قبل {m.name})</td>
                    {dataColumnsOrder.map((c) => (
                      <td key={c} className="border border-slate-300 !px-0.5 !py-1 sm:!px-1 sm:!py-1 !text-[10px] sm:!text-xs whitespace-nowrap">
                        <FormulaCell value={t.before(c)} />
                      </td>
                    ))}
                    <td className="border border-slate-300 bg-white !px-0.5 !py-1 sm:!px-1 sm:!py-1 !text-[10px] sm:!text-xs whitespace-nowrap"></td>
                  </tr>

                  {/* صف الإجمالي العام التراكمي */}
                  <tr className="bg-blue-900 text-yellow-400 font-bold">
                    <td colSpan={4} className="border border-slate-300 text-right !px-0.5 !py-1 sm:!px-1 sm:!py-1 !text-[10px] sm:!text-xs whitespace-nowrap">الإجمالي العام (حتى {m.name})</td>
                    {dataColumnsOrder.map((c) => (
                      <td key={c} className="border border-slate-300 !px-0.5 !py-1 sm:!px-1 sm:!py-1 !text-[10px] sm:!text-xs whitespace-nowrap">
                        {formatNumberEn(t.cumulative(c)) || "-"}
                      </td>
                    ))}
                    <td className="border border-slate-300 bg-white !px-0.5 !py-1 sm:!px-1 sm:!py-1 !text-[10px] sm:!text-xs whitespace-nowrap"></td>
                  </tr>
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AppTabs;
