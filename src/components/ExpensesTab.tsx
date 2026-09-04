import React, { useMemo, useState, useEffect } from "react";
import {
  addReportHeader,
  appendRows,
  createExcelWorkbook,
  downloadWorkbook,
  formatWorksheet,
  getExcelPalette,
  loadReportLetterhead,
} from "@/lib/excelExport";
import { toast } from "sonner";
import schemaJson from "@/lib/expensesSchema.json";
import { useReportDate } from "@/lib/reportDate";
import { escapeHtml, reportLetterheadHtml } from "@/lib/printTableHtml";
import { printReportHtml } from "@/lib/nativePrinter";
import WebActionMenu, { type WebActionItem } from "./WebActionMenu";

// ====== نوع الصف ======
type Row = {
  n: string;
  b: number | "";
  c: number | "";
  d: number | "";
  e: number | "";
  lv: "header" | "bab" | "fasl" | "band" | "type" | "sub";
};
const schema = schemaJson as { rows: Row[]; totals: string[] };

// ====== أسماء الأشهر ======
const MONTHS = [
  "يناير",
  "فبراير",
  "مارس",
  "ابريل",
  "مايو",
  "يونيو",
  "يوليو",
  "اغسطس",
  "سبتمبر",
  "اكتوبر",
  "نوفمبر",
  "ديسمبر",
];
const QUARTERS = [
  { key: "p1", label: "المدة الأولى", months: [0, 1, 2] },
  { key: "p2", label: "المدة الثانية", months: [3, 4, 5] },
  { key: "p3", label: "المدة الثالثة", months: [6, 7, 8] },
  { key: "p4", label: "المدة الرابعة", months: [9, 10, 11] },
];

const YEAR_DEFAULT = 2026;
const STORAGE_KEY = "expenses-data-v1";

type Cell = { f: number; r: number };
type Store = Record<string, Cell>;
const emptyCell: Cell = { f: 0, r: 0 };

function loadStore(): Store {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
  } catch {
    return {};
  }
}
function saveStore(s: Store) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
}

const isLeaf = (r: Row) => r.lv === "type";

function htmlTableToMatrix(table: HTMLTableElement): string[][] {
  const grid: string[][] = [];

  Array.from(table.rows).forEach((row, rowIndex) => {
    if (!grid[rowIndex]) grid[rowIndex] = [];
    let columnIndex = 0;

    Array.from(row.cells).forEach((cell) => {
      while (grid[rowIndex][columnIndex] !== undefined) columnIndex += 1;

      const rowSpan = Math.max(1, cell.rowSpan || 1);
      const columnSpan = Math.max(1, cell.colSpan || 1);
      const value = cell.textContent?.replace(/\s+/g, " ").trim() || "";

      for (let rowOffset = 0; rowOffset < rowSpan; rowOffset += 1) {
        const targetRowIndex = rowIndex + rowOffset;
        if (!grid[targetRowIndex]) grid[targetRowIndex] = [];
        for (let columnOffset = 0; columnOffset < columnSpan; columnOffset += 1) {
          const targetColumnIndex = columnIndex + columnOffset;
          grid[targetRowIndex][targetColumnIndex] =
            rowOffset === 0 && columnOffset === 0 ? value : "";
        }
      }

      columnIndex += columnSpan;
    });
  });

  const columnCount = Math.max(1, ...grid.map((row) => row.length));
  return grid.map((row) =>
    Array.from({ length: columnCount }, (_, index) => row[index] ?? ""),
  );
}

// ===== حساب التجميعات =====
function computeAggregates(values: Cell[]): Cell[] {
  const rows = schema.rows;
  const out = values.map((v) => ({ ...v }));
  const rank: Record<string, number> = { header: 0, bab: 1, fasl: 2, band: 3, type: 4, sub: 5 };
  for (let i = rows.length - 1; i >= 0; i--) {
    const r = rows[i];
    if (isLeaf(r) || r.lv === "sub") continue;
    let sf = 0,
      sr = 0;
    const my = rank[r.lv];
    for (let j = i + 1; j < rows.length; j++) {
      if (rank[rows[j].lv] <= my) break;
      if (isLeaf(rows[j])) {
        sf += out[j].f;
        sr += out[j].r;
      }
    }
    sr += Math.floor(sf / 100);
    sf = sf % 100;
    out[i] = { f: sf, r: sr };
  }
  return out;
}

// ===== مجاميع الأبواب =====
interface BabTotal {
  label: string;
  babNum: number | null;
  cur: Cell;
  prev: Cell;
  total: Cell;
}

function addTwo(a: Cell, b: Cell): Cell {
  let f = a.f + b.f,
    r = a.r + b.r;
  r += Math.floor(f / 100);
  f = f % 100;
  return { f, r };
}

function computeBabTotals(cur: Cell[], prev: Cell[]): BabTotal[] {
  const rows = schema.rows;
  const babMap = new Map<number, { label: string; indices: number[] }>();
  let cb: number | null = null;
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    if (r.lv === "bab" && typeof r.b === "number") {
      cb = r.b;
      if (!babMap.has(cb)) babMap.set(cb, { label: r.n, indices: [] });
    }
    if (r.lv === "type" && cb !== null) babMap.get(cb)!.indices.push(i);
  }
  const sum = (idxs: number[], vals: Cell[]): Cell => {
    let f = 0,
      r = 0;
    idxs.forEach((i) => {
      f += vals[i].f;
      r += vals[i].r;
    });
    r += Math.floor(f / 100);
    f = f % 100;
    return { f, r };
  };
  const labels: Record<number, string> = {
    1: "جملة الباب الأول : أجور وتعويضات العاملين",
    2: "جملة الباب الثاني : نفقات على السلع والخدمات والممتلكات",
    // يمكن إضافة مسميات أبواب أخرى هنا إن وجدت
  };
  const result: BabTotal[] = [];
  let gc: Cell = emptyCell,
    gp: Cell = emptyCell;
  babMap.forEach((val, bn) => {
    const c = sum(val.indices, cur);
    const p = sum(val.indices, prev);
    gc = addTwo(gc, c);
    gp = addTwo(gp, p);
    result.push({
      label: labels[bn] || val.label,
      babNum: bn,
      cur: c,
      prev: p,
      total: addTwo(c, p),
    });
  });
  result.push({
    label: "الاجمالي العام للاستخدامات",
    babNum: null,
    cur: gc,
    prev: gp,
    total: addTwo(gc, gp),
  });
  return result;
}

// ===== ألوان الصفوف (محدثة لدعم ألوان مختلفة لكل باب) =====
const rowClass = (r: Row) => {
  if (r.lv === "bab") {
    // إعطاء كل باب لوناً مميزاً بناءً على رقم الباب
    switch (r.b) {
      case 1:
        return "bg-emerald-200 text-emerald-900 font-bold bab-1";
      case 2:
        return "bg-blue-200 text-blue-900 font-bold bab-2";
      case 3:
        return "bg-fuchsia-200 text-fuchsia-900 font-bold bab-3";
      case 4:
        return "bg-orange-200 text-orange-900 font-bold bab-4";
      case 5:
        return "bg-rose-200 text-rose-900 font-bold bab-5";
      default:
        return "bg-emerald-100 text-emerald-900 font-bold bab-default";
    }
  }

  switch (r.lv) {
    case "header":
      return "bg-sky-700 text-white font-bold";
    case "fasl":
      return "bg-sky-100 text-amber-900 font-semibold";
    case "band":
      return "bg-sky-50 text-slate-800 font-medium";
    case "type":
      return "bg-white text-slate-700";
    default:
      return "bg-slate-50 text-slate-600 italic";
  }
};

// الدالة المساعدة لملخصات الأبواب لتطبيق نفس الألوان
const getBabSummaryColor = (bn: number | null) => {
  if (bn === null) return "bg-sky-700 text-white font-bold";
  switch (bn) {
    case 1: return "bg-emerald-200 text-emerald-900 font-semibold bab-1";
    case 2: return "bg-blue-200 text-blue-900 font-semibold bab-2";
    case 3: return "bg-fuchsia-200 text-fuchsia-900 font-semibold bab-3";
    case 4: return "bg-orange-200 text-orange-900 font-semibold bab-4";
    case 5: return "bg-rose-200 text-rose-900 font-semibold bab-5";
    default: return "bg-emerald-100 text-emerald-900 font-semibold bab-default";
  }
};

const fmt = (n: number) => (n === 0 ? "0" : n.toLocaleString("en-US"));

// ===== ثوابت ألوان الأعمدة =====
const CUR_H = "bg-amber-300 text-amber-900"; 
const CUR_C = "bg-sky-50"; 
const PREV_H = "bg-sky-300 text-sky-900"; 
const PREV_C = "bg-sky-50"; 
const TOT_H = "bg-emerald-200 text-black-900"; 
const TOT_C = "bg-emerald-50"; 

// ===== خلية رأس موحدة =====
const TH = ({
  children,
  cls = "",
  rowSpan = 1,
  colSpan = 1,
}: {
  children: React.ReactNode;
  cls?: string;
  rowSpan?: number;
  colSpan?: number;
}) => (
  <th
    rowSpan={rowSpan}
    colSpan={colSpan}
    className={`border border-black px-1 sm:px-2 py-1 whitespace-normal break-words text-center align-middle text-sm sm:text-base font-bold ${cls}`}
  >
    {children}
  </th>
);

// ===== خلية بيانات موحدة =====
const TD = ({
  children,
  cls = "",
  right = false,
}: {
  children: React.ReactNode;
  cls?: string;
  right?: boolean;
}) => (
  <td
    className={`border border-black px-1 sm:px-2 py-1 whitespace-nowrap align-middle numeric-cell font-mono text-sm sm:text-base ${right ? "text-right" : "text-center"} ${cls}`}
  >
    {children}
  </td>
);

// ============================================================
export default function ExpensesTab() {
  const [store, setStore] = useState<Store>(() => loadStore());
  const { reportDate, reportDateLabel } = useReportDate();
  const [year] = useState<number>(YEAR_DEFAULT);
  const [view, setView] = useState<string>("cover");

  useEffect(() => {
    saveStore(store);
  }, [store]);

  const monthlyLeaves: Cell[][] = useMemo(
    () =>
      MONTHS.map((_, m) => schema.rows.map((_, idx) => store[`${year}-${m}-${idx}`] || emptyCell)),
    [store, year],
  );

  const monthlyComputed: Cell[][] = useMemo(
    () => monthlyLeaves.map((v) => computeAggregates(v)),
    [monthlyLeaves],
  );

  const updateCell = (mi: number, ri: number, field: "f" | "r", val: number) => {
    setStore((prev) => {
      const key = `${year}-${mi}-${ri}`;
      const cur = prev[key] || emptyCell;
      const next = { ...cur, [field]: val };
      if (next.f === 0 && next.r === 0) {
        const { [key]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [key]: next };
    });
  };

  const sumCells = (arrs: Cell[][]): Cell[] => {
    if (!arrs.length) return schema.rows.map(() => emptyCell);
    return schema.rows.map((_, idx) => {
      let f = 0,
        r = 0;
      arrs.forEach((a) => {
        f += a[idx].f;
        r += a[idx].r;
      });
      r += Math.floor(f / 100);
      f = f % 100;
      return { f, r };
    });
  };

  // ========= ملخص الأبواب =========
  const renderBabSummary = (
    curVals: Cell[],
    prevVals: Cell[],
    curLabel: string,
    prevLabel: string,
  ) => {
    const totals = computeBabTotals(curVals, prevVals);
    return (
      <div className="mt-3 rounded-xl overflow-hidden border-2 border-black shadow" dir="rtl">
        <div className="bg-sky-800 text-white text-center py-2 font-bold text-sm tracking-wide">
          إجمالي الاستخدامات — ملخص حسب الأبواب
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-max table-auto border-collapse text-sm sm:text-base">
            <thead className="font-bold text-xs">
              <tr>
                <TH rowSpan={2} cls="bg-slate-200 text-slate-800 text-center w-1/4">
                  البيان
                </TH>
                <TH colSpan={2} cls={CUR_H}>
                  {curLabel}
                </TH>
                <TH colSpan={2} cls={PREV_H}>
                  {prevLabel}
                </TH>
                <TH colSpan={2} cls={TOT_H}>
                  الجملة
                </TH>
              </tr>
              <tr className="text-[11px]">
                <TH cls={CUR_H}>ف</TH> <TH cls={CUR_H}>ريال</TH>
                <TH cls={PREV_H}>ف</TH> <TH cls={PREV_H}>ريال</TH>
                <TH cls={TOT_H}>ف</TH> <TH cls={TOT_H}>ريال</TH>
              </tr>
            </thead>
            <tbody>
              {totals.map((t, i) => {
                const isGrand = t.babNum === null;
                const baseClass = getBabSummaryColor(t.babNum);
                return (
                  <tr key={i} className={baseClass}>
                    {/* تم تعديل التنسيق هنا لاحتواء النص تلقائياً والتوسيط */}
                    <td className="border border-black text-center align-middle whitespace-normal break-words font-semibold px-2 py-1 text-xs sm:text-sm">
                      {t.label}
                    </td>
                    <TD cls={isGrand ? "" : CUR_C}>{fmt(t.cur.f)}</TD>
                    <TD cls={isGrand ? "" : CUR_C}>{fmt(t.cur.r)}</TD>
                    <TD cls={isGrand ? "" : PREV_C}>{fmt(t.prev.f)}</TD>
                    <TD cls={isGrand ? "" : PREV_C}>{fmt(t.prev.r)}</TD>
                    <TD cls={isGrand ? "" : TOT_C}>{fmt(t.total.f)}</TD>
                    <TD cls={isGrand ? "" : TOT_C}>{fmt(t.total.r)}</TD>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  // ========= الغلاف =========
  const renderCover = () => (
    <div
      className="mx-4 my-6 w-auto max-w-none rounded-[2rem] border-[3px] border-sky-700 bg-white px-5 py-10 text-center shadow-sm sm:mx-auto sm:max-w-2xl sm:px-12 sm:py-12"
      dir="rtl"
    >
      {/* الترويسة العلوية */}
      <div className="space-y-1">
        <h3 className="text-[2rem] font-extrabold leading-[1.35] tracking-wide text-sky-800 sm:text-3xl">
          الجمهورية اليمنية
        </h3>
        <h4 className="text-[1.65rem] font-bold leading-[1.45] text-sky-700 sm:text-2xl">
          وزارة المالية
        </h4>
      </div>

      {/* الخط الفاصل الأول */}
      <hr className="mx-auto my-8 w-[88%] border-t-[3px] border-sky-700 opacity-90" />

      {/* العنوان الرئيسي */}
      <div className="my-9 space-y-3 sm:my-10 sm:space-y-4">
        <h1 className="text-[3.15rem] font-black leading-[1.18] tracking-tight text-sky-800 sm:text-[4rem]">
          كشف الحساب
          <br />
          الشهري
        </h1>
        <p className="mt-5 text-[1.45rem] font-semibold leading-[1.5] text-slate-700 sm:mt-6 sm:text-2xl">
          عن العام المالي <span className="font-bold text-sky-700">{year}م</span>
        </p>
      </div>

      {/* الخط الفاصل الثاني */}
      <hr className="mx-auto my-8 w-[88%] border-t-[3px] border-sky-700 opacity-90" />

      {/* بيانات الجهة */}
      <div className="flex flex-col items-center">
        <div className="w-full max-w-md space-y-4 text-right text-[1.25rem] font-medium leading-[1.7] text-slate-700 sm:space-y-5 sm:text-xl">
          <p className="flex items-center justify-end gap-3">
            <span className="w-20 shrink-0 text-slate-600">المحافظة</span>
            <span className="font-extrabold text-slate-900">: صعـــدة</span>
          </p>
          <p className="flex items-center justify-end gap-3">
            <span className="w-20 shrink-0 text-slate-600">المديرية</span>
            <span className="font-extrabold text-slate-900">: مركز المحافظة</span>
          </p>
          <p className="flex items-center justify-end gap-3">
            <span className="w-20 shrink-0 text-slate-600">المكتب</span>
            <span className="font-extrabold text-slate-900 text-[1.1rem] sm:text-xl">: المجلس الطبي فرع صعدة</span>
          </p>
        </div>
      </div>
    </div>
  );

  // ========= الجدول الرئيسي =========
  const renderSheet = (opts: {
    title: string;
    subtitle: string;
    currentLabel: string;
    previousLabel: string;
    currentValues: Cell[];
    previousValues: Cell[];
    editable: boolean;
    editMonthIdx?: number;
  }) => {
    const totalValues = schema.rows.map((_, idx) => {
      let f = opts.currentValues[idx].f + opts.previousValues[idx].f;
      let r = opts.currentValues[idx].r + opts.previousValues[idx].r;
      r += Math.floor(f / 100);
      f = f % 100;
      return { f, r };
    });

    return (
      <div className="space-y-0" dir="rtl">
        <div className="w-full max-w-full overflow-hidden rounded-lg border border-black bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] table-auto border-collapse text-sm sm:text-base">
              <thead className="sticky top-0 z-10 font-bold text-xs">
                <tr>
                  {/* تغيير تنسيق الرأس ليكون متوسط النص بدلاً من المحاذاة لليمين فقط */}
                  <TH rowSpan={2} cls="bg-slate-200 text-slate-800 text-center w-1/3">
                    بيان مفردات الاستخدامات
                  </TH>
                  <TH rowSpan={2} cls="bg-slate-200 text-slate-800">الباب</TH>
                  <TH rowSpan={2} cls="bg-slate-200 text-slate-800">الفصل</TH>
                  <TH rowSpan={2} cls="bg-slate-200 text-slate-800">البند</TH>
                  <TH rowSpan={2} cls="bg-slate-200 text-slate-800">النوع</TH>
                  <TH colSpan={2} cls={CUR_H}>{opts.currentLabel}</TH>
                  <TH colSpan={2} cls={PREV_H}>{opts.previousLabel}</TH>
                  <TH colSpan={2} cls={TOT_H}>الجملة</TH>
                </tr>
                <tr className="text-[11px]">
                  <TH cls={CUR_H}>ف</TH> <TH cls={CUR_H}>ريال</TH>
                  <TH cls={PREV_H}>ف</TH> <TH cls={PREV_H}>ريال</TH>
                  <TH cls={TOT_H}>ف</TH> <TH cls={TOT_H}>ريال</TH>
                </tr>
              </thead>
              <tbody>
                {schema.rows.map((r, idx) => {
                  const cur = opts.currentValues[idx];
                  const prev = opts.previousValues[idx];
                  const tot = totalValues[idx];
                  const editable = opts.editable && isLeaf(r) && opts.editMonthIdx !== undefined;
                  return (
                    <tr key={idx} className={rowClass(r)}>
                      {/* تفعيل التفاف النص (break-words whitespace-normal) والتوسيط (text-center align-middle) */}
                      <td className="border border-black text-center align-middle numeric-cell whitespace-nowrap px-2 py-1 text-[10px] sm:text-xs">
                        {r.n}
                      </td>
                      <TD>{r.b || ""}</TD>
                      <TD>{r.c || ""}</TD>
                      <TD>{r.d || ""}</TD>
                      <TD>{r.e || ""}</TD>
                      {editable ? (
                        <>
                          <td className={`border border-black p-0.5 align-middle text-center numeric-cell whitespace-nowrap ${CUR_C}`}>
                            <input
                              type="number"
                              min={0}
                              value={cur.f || ""}
                              onChange={(e) =>
                                updateCell(opts.editMonthIdx!, idx, "f", Number(e.target.value) || 0)
                              }
                              className="w-14 text-center text-sm sm:text-base px-1 py-0.5 outline-none bg-transparent focus:ring-1 focus:ring-amber-500 rounded mx-auto"
                            />
                          </td>
                          <td className={`border border-black p-0.5 align-middle text-center numeric-cell whitespace-nowrap ${CUR_C}`}>
                            <input
                              type="number"
                              min={0}
                              value={cur.r || ""}
                              onChange={(e) =>
                                updateCell(opts.editMonthIdx!, idx, "r", Number(e.target.value) || 0)
                              }
                              className="w-24 text-center text-sm sm:text-base px-1 py-0.5 outline-none bg-transparent focus:ring-1 focus:ring-amber-500 rounded mx-auto"
                            />
                          </td>
                        </>
                      ) : (
                        <>
                          <TD cls={CUR_C}>{fmt(cur.f)}</TD>
                          <TD cls={CUR_C}>{fmt(cur.r)}</TD>
                        </>
                      )}
                      <TD cls={PREV_C}>{fmt(prev.f)}</TD>
                      <TD cls={PREV_C}>{fmt(prev.r)}</TD>
                      <TD cls={`${TOT_C} font-semibold`}>{fmt(tot.f)}</TD>
                      <TD cls={`${TOT_C} font-semibold`}>{fmt(tot.r)}</TD>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {renderBabSummary(
          opts.currentValues,
          opts.previousValues,
          opts.currentLabel,
          opts.previousLabel,
        )}
      </div>
    );
  };

  const renderMonth = (m: number) =>
    renderSheet({
      title: "كشف المصروفات الشهري",
      subtitle: `عن شهر ${MONTHS[m]} من العام المالي ${year}م`,
      currentLabel: "الشهر الجاري",
      previousLabel: "الأشهر السابقة",
      currentValues: monthlyComputed[m],
      previousValues: sumCells(monthlyComputed.slice(0, m)),
      editable: true,
      editMonthIdx: m,
    });

  const renderQuarter = (qIdx: number) => {
    const q = QUARTERS[qIdx];
    const prevMonths: number[] = [];
    for (let p = 0; p < qIdx; p++) prevMonths.push(...QUARTERS[p].months);
    return renderSheet({
      title: "كشف حساب المدة",
      subtitle: `${q.label} من العام المالي ${year}م`,
      currentLabel: q.label,
      previousLabel: "المدد السابقة",
      currentValues: sumCells(q.months.map((mi) => monthlyComputed[mi])),
      previousValues: sumCells(prevMonths.map((mi) => monthlyComputed[mi])),
      editable: false,
    });
  };

  const renderFinal = () =>
    renderSheet({
      title: "كشف الحساب النهائي (الأخيرة)",
      subtitle: `إجمالي العام المالي ${year}م`,
      currentLabel: "إجمالي العام",
      previousLabel: "—",
      currentValues: sumCells(monthlyComputed),
      previousValues: schema.rows.map(() => emptyCell),
      editable: false,
    });

  // ========= كشف السنة =========
  const renderYear = () => {
    const cur = sumCells(monthlyComputed);
    const monthBabTotals = MONTHS.map((_, mi) =>
      computeBabTotals(monthlyComputed[mi], sumCells(monthlyComputed.slice(0, mi))),
    );
    const yearTotals = computeBabTotals(
      cur,
      schema.rows.map(() => emptyCell),
    );

    return (
      <div className="space-y-4" dir="rtl">
        <div className="rounded-xl border-2 border-black overflow-hidden shadow-sm">
          <div className="bg-gradient-to-r from-sky-700 to-sky-700 text-white p-3 text-center">
            <h3 className="text-base sm:text-lg font-bold">كشف حساب السنة</h3>
            <p className="text-xs opacity-90">ملخص جميع الأشهر للعام {year}م</p>
          </div>
          <div className="overflow-auto max-h-[65vh]">
            <table className="w-full min-w-max table-auto border-collapse text-sm sm:text-base">
              <thead className="font-bold text-xs sticky top-0 z-20">
                <tr>
                  <TH cls="bg-slate-200 text-slate-800 text-center w-1/4">البيان</TH>
                  {MONTHS.map((m) => (
                    <TH key={m} cls="bg-slate-100 text-slate-800">
                      {m}
                    </TH>
                  ))}
                  <TH cls={TOT_H}>المجموع</TH>
                </tr>
              </thead>
              <tbody>
                {schema.rows.map((r, idx) => (
                  <tr key={idx} className={rowClass(r)}>
                    <td className="border border-black text-center align-middle whitespace-normal break-words px-2 py-1 text-[10px] sm:text-xs">
                      {r.n}
                    </td>
                    {MONTHS.map((_, mi) => (
                      <TD key={mi}>{fmt(monthlyComputed[mi][idx].r)}</TD>
                    ))}
                    <TD cls={`${TOT_C} font-bold`}>{fmt(cur[idx].r)}</TD>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-xl border-2 border-black overflow-hidden shadow-sm">
          <div className="bg-sky-800 text-white p-3 text-center">
            <h3 className="text-base font-bold">ملخص إجمالي الاستخدامات حسب الأبواب — شهرياً</h3>
            <p className="text-xs opacity-80">المبالغ بالريال — الشهر الجاري فقط</p>
          </div>
          <div className="overflow-auto">
            <table className="w-full min-w-max table-auto border-collapse text-sm sm:text-base">
              <thead className="font-bold text-xs sticky top-0 z-10">
                <tr>
                  <TH cls="bg-slate-200 text-slate-800 text-center w-1/4">البيان</TH>
                  {MONTHS.map((m) => (
                    <TH key={m} cls={CUR_H}>
                      {m}
                    </TH>
                  ))}
                  <TH cls={TOT_H}>المجموع</TH>
                </tr>
              </thead>
              <tbody>
                {monthBabTotals[0].map((bt, btIdx) => {
                  const isGrand = bt.babNum === null;
                  const baseClass = getBabSummaryColor(bt.babNum);
                  return (
                    <tr key={btIdx} className={baseClass}>
                      <td className="border border-black text-center align-middle whitespace-normal break-words px-2 py-1 text-[10px] sm:text-xs">
                        {bt.label}
                      </td>
                      {MONTHS.map((_, mi) => (
                        <TD key={mi} cls={isGrand ? "" : CUR_C}>
                          {fmt(monthBabTotals[mi][btIdx].cur.r)}
                        </TD>
                      ))}
                      <TD cls={isGrand ? "" : TOT_C}>{fmt(yearTotals[btIdx]?.cur.r ?? 0)}</TD>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  const subTabs = [
    { key: "cover", label: "الغلاف", group: "intro" },
    ...MONTHS.map((m, i) => ({ key: `m${i}`, label: m, group: "month" })),
    ...QUARTERS.map((q) => ({ key: q.key, label: q.label, group: "period" })),
    { key: "final", label: "الأخيرة", group: "final" },
    { key: "year", label: "كشف السنة", group: "year" },
  ];
  
  const groupCls = (g: string) =>
    g === "intro"
      ? "bg-slate-700"
      : g === "month"
        ? "bg-sky-700"
        : g === "period"
          ? "bg-amber-600"
          : g === "final"
            ? "bg-rose-700"
            : "bg-sky-700";

  const triggerExpenseAction = (id: string) => {
    (document.getElementById(id) as HTMLButtonElement | null)?.click();
  };

  const expenseWebActions: WebActionItem[] = [
    { label: "طباعة التقرير", onSelect: () => triggerExpenseAction("expenses-print-action") },
    { label: "تصدير Excel", onSelect: () => triggerExpenseAction("expenses-excel-action") },
    {
      label: "مسح بيانات المصروفات",
      destructive: true,
      onSelect: () => triggerExpenseAction("expenses-clear-action"),
    },
  ];

  return (
    <div className="space-y-3" dir="rtl">
      {/* شريط التبويبات + أزرار */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="bg-slate-100 p-1.5 rounded-xl border border-slate-200 overflow-x-auto flex-1 min-w-0">
          <div className="flex gap-1 w-max min-w-full">
            {subTabs.map((t) => (
              <button
                key={t.key}
                onClick={() => setView(t.key)}
                className={`px-2.5 py-1.5 text-[11px] sm:text-xs font-bold rounded-lg transition-all whitespace-nowrap ${
                  view === t.key
                    ? `${groupCls(t.group)} text-white shadow-md`
                    : "bg-white text-slate-700 hover:bg-slate-50 border border-slate-200"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
        <div className="web-only-actions sm:w-auto">
          <WebActionMenu label="إجراءات المصروفات" actions={expenseWebActions} />
        </div>
        <div className="apk-only-actions flex gap-2">
          {/* زر الطباعة المحدّث مع دعم ألوان الأبواب والاحتواء التلقائي */}
          <button
            id="expenses-print-action"
            onClick={() => {
              const el = document.getElementById("expenses-view-content");
              if (!el) return;
              const html = `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>${escapeHtml(`المصروفات - ${view} - ${reportDateLabel}`)}</title>
                <style>
                @page { size: A4 landscape; margin: 3mm; }
                * { box-sizing: border-box; }
                html, body { margin: 0; padding: 0; }
                body { direction: rtl; background: #f1f5f9; color: #000; font-family: Cairo, Tajawal, Tahoma, Arial, sans-serif; font-weight: 700; }
                .print-page { min-height: auto; width: 100%; margin: 0; padding: 0; border: 0; background: #fff; }
                .report-letterhead-block { display: flex; width: 100%; max-width: none; height: 30mm; min-height: 30mm; max-height: 30mm; align-items: stretch; justify-content: center; margin: 0 0 3mm; page-break-before: avoid; page-break-after: avoid; }
                .report-letterhead-image { display: block; width: 100%; max-width: none; height: 100%; max-height: 100%; object-fit: fill; object-position: center; margin: 0; }
                ${runningLetterheadCss}
                #expenses-report { width: 100%; }
                #expenses-report > * { margin-bottom: 4mm; }
                #expenses-report .overflow-x-auto, #expenses-report .overflow-auto { overflow: visible !important; }
                #expenses-report .rounded-xl { border-radius: 9px; }
                #expenses-report .border-2 { border-width: 2px; }
                #expenses-report .border-black, #expenses-report .border { border-color: #000 !important; }
                #expenses-report .shadow, #expenses-report .shadow-sm, #expenses-report .shadow-md { box-shadow: none !important; }
                #expenses-report .bg-gradient-to-r { background: linear-gradient(90deg, #0f766e, #047857) !important; color: #fff !important; padding: 9px !important; text-align: center; }
                #expenses-report .bg-sky-800 { background: #115e59 !important; color: #fff !important; padding: 8px !important; text-align: center; }
                #expenses-report .bg-sky-700 { background: #0f766e !important; color: #fff !important; }
                #expenses-report .bg-sky-100 { background: #fef3c7 !important; color: #78350f !important; }
                #expenses-report .bg-sky-50 { background: #f0f9ff !important; color: #1e293b !important; }
                #expenses-report .bg-slate-50 { background: #f8fafc !important; color: #000 !important; }
                #expenses-report .bg-white { background: #fff !important; color: #000 !important; }
                #expenses-report .bg-slate-200 { background: #e2e8f0 !important; color: #000 !important; }
                #expenses-report .bg-amber-300 { background: #fcd34d !important; color: #78350f !important; }
                #expenses-report .bg-sky-50 { background: #fffbeb !important; color: #000 !important; }
                #expenses-report .bg-sky-300 { background: #7dd3fc !important; color: #0c4a6e !important; }
                #expenses-report .bg-emerald-200 { background: #a7f3d0 !important; color: #064e3b !important; }
                #expenses-report .bg-emerald-50 { background: #ecfdf5 !important; color: #000 !important; }
                #expenses-report .bab-1 { background-color: #a7f3d0 !important; color: #064e3b !important; }
                #expenses-report .bab-2 { background-color: #bfdbfe !important; color: #1e3a8a !important; }
                #expenses-report .bab-3 { background-color: #f5d0fe !important; color: #701a75 !important; }
                #expenses-report .bab-4 { background-color: #fed7aa !important; color: #7c2d12 !important; }
                #expenses-report .bab-5 { background-color: #fecdd3 !important; color: #881337 !important; }
                #expenses-report .bab-default { background-color: #d1fae5 !important; color: #064e3b !important; }
                #expenses-report table { width: 100%; max-width: 100%; min-width: 0; table-layout: auto; border-collapse: collapse; font-size: 9px; }
                #expenses-report th, #expenses-report td { border: 1px solid #000 !important; padding: 2px 3px !important; text-align: center !important; vertical-align: middle !important; white-space: normal !important; overflow: visible !important; overflow-wrap: break-word !important; word-break: normal !important; line-height: 1.2; color: #000 !important; font-weight: 700 !important; }
                #expenses-report thead th { font-size: 9px; font-weight: 900 !important; }
                #expenses-report tbody td { font-size: 8.5px; }
                #expenses-report .numeric-cell, #expenses-report .date-cell, #expenses-report .font-mono, #expenses-report input[type="number"], #expenses-report input[type="date"] { width: 1% !important; min-width: 0 !important; white-space: nowrap !important; overflow: visible !important; overflow-wrap: normal !important; word-break: keep-all !important; font-family: 'Times New Roman', Times, serif !important; font-size: clamp(8px, 1vw, 11px) !important; font-variant-numeric: tabular-nums; direction: ltr; }
                #expenses-report input { width: 100% !important; min-width: 0 !important; border: 0; background: transparent; color: #000; font: inherit; text-align: center; }
                #expenses-report .text-white { color: #fff !important; }
                @media print {
                  * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
                  body { background: #fff; }
                  .print-page { min-height: auto; width: 100%; padding: 0; border: 0; }
                  #expenses-report { page-break-before: avoid; }
                  #expenses-report table { page-break-inside: auto; }
                  #expenses-report thead { display: table-header-group; }
                  #expenses-report tr { page-break-inside: avoid; }
                  #expenses-report th, #expenses-report td { white-space: normal !important; }
                  #expenses-report .numeric-cell, #expenses-report .date-cell, #expenses-report .font-mono { white-space: nowrap !important; }
                }
                </style></head><body><div class="print-page">${reportLetterheadHtml()}<div class="report-heading"><h1>جدول المصروفات - ${escapeHtml(view)} - ${year}م</h1><p>المجلس اليمني للاختصاصات الطبية فرع - صعدة</p><p class="date">تاريخ التقرير: ${escapeHtml(reportDateLabel)}</p></div><div id="expenses-report">${el.innerHTML}</div></div>
                <script>window.onload=()=>setTimeout(()=>window.print(),300)</script></body></html>`;
              const opened = printReportHtml(html, `المصروفات - ${view} - ${reportDateLabel}`);
              if (!opened) toast.error("تم منع فتح نافذة الطباعة، يرجى السماح بالنوافذ المنبثقة");
            }}
            className="px-3 py-1.5 bg-white text-[#10528e] border border-[#10528e]/30 rounded-lg text-xs font-bold shadow-sm hover:bg-blue-50"
          >
            🖨️ طباعة
          </button>
          {/* ... باقي الأزرار دون تغيير ... */}
          <button
            id="expenses-excel-action"
            onClick={async () => {
              const el = document.getElementById("expenses-view-content");
              if (!el) return;
              const tables = Array.from(el.querySelectorAll("table")) as HTMLTableElement[];
              if (!tables.length) {
                toast.error("لا يوجد جدول للتصدير");
                return;
              }

              try {
                const workbook = await createExcelWorkbook();
                const imageId = await loadReportLetterhead(workbook);
                const tableMatrices = tables.map(htmlTableToMatrix);
                const totalColumns = Math.max(
                  1,
                  ...tableMatrices.map((matrix) => matrix[0]?.length || 1),
                );
                const worksheet = workbook.addWorksheet("المصروفات", {
                  views: [{ rightToLeft: true }],
                });
                const dataStartRow = addReportHeader(
                  workbook,
                  worksheet,
                  {
                    title: `المصروفات - ${view} - ${year}م`,
                    reportDateLabel,
                    recordCount: tableMatrices.reduce(
                      (count, matrix) => count + Math.max(0, matrix.length - 2),
                      0,
                    ),
                    totalColumns,
                    palette: getExcelPalette("المصروفات"),
                  },
                  imageId,
                );

                let nextRow = dataStartRow;
                let firstHeaderRow = dataStartRow;
                tableMatrices.forEach((matrix, tableIndex) => {
                  if (tableIndex > 0) nextRow += 1;
                  const sectionRow = worksheet.getRow(nextRow);
                  sectionRow.getCell(1).value =
                    tableIndex === 0 ? `تفاصيل تقرير ${view}` : "ملخص إجمالي الاستخدامات حسب الأبواب";
                  worksheet.mergeCells(nextRow, 1, nextRow, totalColumns);
                  sectionRow.height = 22;
                  sectionRow.getCell(1).font = {
                    name: "Arial",
                    size: 11,
                    bold: true,
                    color: { argb: "FF000000" },
                  };
                  sectionRow.getCell(1).alignment = {
                    horizontal: "right",
                    vertical: "middle",
                    wrapText: true,
                    shrinkToFit: true,
                  };
                  sectionRow.getCell(1).border = {
                    top: { style: "thin", color: { argb: "FF000000" } },
                    left: { style: "thin", color: { argb: "FF000000" } },
                    bottom: { style: "thin", color: { argb: "FF000000" } },
                    right: { style: "thin", color: { argb: "FF000000" } },
                  };
                  sectionRow.getCell(1).fill = {
                    type: "pattern",
                    pattern: "solid",
                    fgColor: { argb: "FFE7E2D8" },
                  };

                  const headerRow = nextRow + 1;
                  if (tableIndex === 0) firstHeaderRow = headerRow;
                  appendRows(worksheet, matrix, headerRow);
                  nextRow = headerRow + matrix.length;
                });

                formatWorksheet(worksheet, {
                  headerRow: firstHeaderRow,
                  palette: getExcelPalette("المصروفات"),
                  maxColumnWidth: 32,
                });
                await downloadWorkbook(workbook, `المصروفات-${view}-${year}-${reportDate}.xlsx`);
                toast.success("تم التصدير");
              } catch (error) {
                console.error("Expenses Excel export error:", error);
                toast.error("تعذّر تصدير ملف Excel");
              }
            }}
            className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-bold shadow-sm hover:bg-emerald-700"
          >
            📊 Excel
          </button>
          <button
            id="expenses-clear-action"
            onClick={() => {
              if (!confirm("هل أنت متأكد من مسح جميع بيانات المصروفات؟")) return;
              setStore({});
              localStorage.removeItem(STORAGE_KEY);
              toast.success("تم مسح البيانات");
            }}
            className="px-3 py-1.5 bg-rose-600 text-white rounded-lg text-xs font-bold shadow-sm hover:bg-rose-700"
          >
            🗑️ مسح
          </button>
        </div>
      </div>

      {/* محتوى التبويب */}
      <div id="expenses-view-content">
        {view === "cover" && renderCover()}
        {view.startsWith("m") && view.length <= 3 && renderMonth(Number(view.slice(1)))}
        {view.startsWith("p") && renderQuarter(Number(view.slice(1)) - 1)}
        {view === "final" && renderFinal()}
        {view === "year" && renderYear()}
      </div>

      {/* مفتاح الألوان */}
      <div
        className="flex flex-wrap gap-3 justify-center text-[10px] bg-slate-50 p-2 rounded-lg border border-slate-200"
        dir="rtl"
      >
        <span className="flex items-center gap-1">
          <span className={`inline-block w-4 h-4 rounded ${CUR_C} border border-black`}></span>{" "}
          الشهر / المدة الجارية
        </span>
        <span className="flex items-center gap-1">
          <span className={`inline-block w-4 h-4 rounded ${PREV_C} border border-black`}></span>{" "}
          الأشهر / المدد السابقة
        </span>
        <span className="flex items-center gap-1">
          <span className={`inline-block w-4 h-4 rounded ${TOT_C} border border-black`}></span>{" "}
          الجملة
        </span>
        <span className="text-slate-400">|</span>
        <span className="text-slate-500">
          الصفوف البيضاء (النوع) قابلة للإدخال — الباقي يُحسب تلقائياً
        </span>
      </div>
    </div>
  );
}
