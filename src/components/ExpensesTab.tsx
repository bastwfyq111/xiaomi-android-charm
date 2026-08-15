import React, { useMemo, useState, useEffect } from "react";
import * as XLSX from "xlsx";
import { toast } from "sonner";
import schemaJson from "@/lib/expensesSchema.json";
import { useReportDate } from "@/lib/reportDate";

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

// ===== ألوان الصفوف =====
const rowClass = (lv: Row["lv"]) => {
  switch (lv) {
    case "header":
      return "bg-teal-700 text-white font-bold";
    case "bab":
      return "bg-emerald-100 text-emerald-900 font-bold";
    case "fasl":
      return "bg-yellow-100 text-amber-900 font-semibold";
    case "band":
      return "bg-sky-50 text-slate-800 font-medium";
    case "type":
      return "bg-white text-slate-700";
    default:
      return "bg-slate-50 text-slate-600 italic";
  }
};

const fmt = (n: number) => (n === 0 ? "0" : n.toLocaleString("en-US"));

// ===== ثوابت ألوان الأعمدة =====
// الشهر الجاري  → أصفر برتقالي
// الأشهر السابقة → أزرق فاتح
// الجملة         → أخضر فاتح
const CUR_H = "bg-amber-300 text-amber-900"; // رأس الشهر الجاري
const CUR_C = "bg-amber-50"; // خلايا الشهر الجاري
const PREV_H = "bg-sky-300 text-sky-900"; // رأس الأشهر السابقة
const PREV_C = "bg-sky-50"; // خلايا الأشهر السابقة
const TOT_H = "bg-emerald-200 text-emerald-900"; // رأس الجملة
const TOT_C = "bg-emerald-50"; // خلايا الجملة

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
    className={`border border-black px-1 sm:px-2 py-1 !whitespace-nowrap text-center text-sm sm:text-base font-bold ${cls}`}
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
    className={`border border-black px-1 sm:px-2 py-1 !whitespace-nowrap font-mono text-sm sm:text-base ${right ? "text-right" : "text-center"} ${cls}`}
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
        <div className="bg-teal-800 text-white text-center py-2 font-bold text-sm tracking-wide">
          إجمالي الاستخدامات — ملخص حسب الأبواب
        </div>
        <div className="overflow-x-auto">
          <table className="w-max w-max table-auto border-collapse text-sm sm:text-base">
            <thead className="font-bold text-xs">
              <tr>
                <TH rowSpan={2} cls="bg-slate-200 text-slate-800 min-w-[240px] text-right">
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
                const base = isGrand
                  ? "bg-teal-700 text-white font-bold"
                  : i % 2 === 0
                    ? "bg-white font-semibold"
                    : "bg-slate-50 font-semibold";
                return (
                  <tr key={i} className={base}>
                    <td className="border border-black text-right !whitespace-nowrap font-semibold !px-0.5 !py-1 sm:!px-1 sm:!py-1 !text-[10px] sm:!text-xs">
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
      className="bg-white rounded-2xl border-2 border-teal-700 p-8 text-center space-y-4 shadow-md max-w-3xl mx-auto"
      dir="rtl"
    >
      <div className="space-y-1">
        <h3 className="text-xl font-bold text-teal-900">الجمهورية اليمنية</h3>
        <h4 className="text-lg font-semibold text-teal-800">وزارة المالية</h4>
      </div>
      <div className="border-t-2 border-b-2 border-teal-700 py-6 my-6">
        <h2 className="text-3xl font-extrabold text-teal-900 mb-2">كشف الحساب الشهري</h2>
        <p className="text-base text-slate-700">
          عن العام المالي <span className="font-bold">{year}م</span>
        </p>
      </div>
      <div className="space-y-2 text-right max-w-md mx-auto text-slate-800">
        <p>
          المحافظة : <span className="font-bold">صعـــدة</span>
        </p>
        <p>
          المديرية : <span className="font-bold">مركز المحافظة</span>
        </p>
        <p>
          المكتب : <span className="font-bold">المجلس الطبي فرع صعدة</span>
        </p>
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
        <div className="bg-white rounded-xl border-2 border-black shadow-sm overflow-hidden">
          <div className="bg-gradient-to-r from-teal-700 to-emerald-700 text-white p-3 text-center">
            <h3 className="text-base sm:text-lg font-bold">{opts.title}</h3>
            <p className="text-xs opacity-90">{opts.subtitle}</p>
            <p className="text-[10px] opacity-75 mt-0.5">
              المجلس اليمني للاختصاصات الطبية فرع - صعدة
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-max w-max table-auto border-collapse text-sm sm:text-base">
              <thead className="sticky top-0 z-10 font-bold text-xs">
                <tr>
                  <TH rowSpan={2} cls="bg-slate-200 text-slate-800 min-w-[240px] text-right">
                    بيان مفردات الاستخدامات
                  </TH>
                  <TH rowSpan={2} cls="bg-slate-200 text-slate-800">
                    الباب
                  </TH>
                  <TH rowSpan={2} cls="bg-slate-200 text-slate-800">
                    الفصل
                  </TH>
                  <TH rowSpan={2} cls="bg-slate-200 text-slate-800">
                    البند
                  </TH>
                  <TH rowSpan={2} cls="bg-slate-200 text-slate-800">
                    النوع
                  </TH>
                  <TH colSpan={2} cls={CUR_H}>
                    {opts.currentLabel}
                  </TH>
                  <TH colSpan={2} cls={PREV_H}>
                    {opts.previousLabel}
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
                {schema.rows.map((r, idx) => {
                  const cur = opts.currentValues[idx];
                  const prev = opts.previousValues[idx];
                  const tot = totalValues[idx];
                  const editable = opts.editable && isLeaf(r) && opts.editMonthIdx !== undefined;
                  return (
                    <tr key={idx} className={rowClass(r.lv)}>
                      <td className="border border-black text-right whitespace-nowrap !px-0.5 !py-1 sm:!px-1 sm:!py-1 !text-[10px] sm:!text-xs">
                        {r.n}
                      </td>
                      <TD>{r.b || ""}</TD>
                      <TD>{r.c || ""}</TD>
                      <TD>{r.d || ""}</TD>
                      <TD>{r.e || ""}</TD>
                      {editable ? (
                        <>
                          <td className={`border border-black p-0.5 ${CUR_C}`}>
                            <input
                              type="number"
                              min={0}
                              value={cur.f || ""}
                              onChange={(e) =>
                                updateCell(
                                  opts.editMonthIdx!,
                                  idx,
                                  "f",
                                  Number(e.target.value) || 0,
                                )
                              }
                              className="w-14 text-center text-sm sm:text-base px-1 py-0.5 outline-none bg-transparent focus:ring-1 focus:ring-amber-500 rounded"
                            />
                          </td>
                          <td className={`border border-black p-0.5 ${CUR_C}`}>
                            <input
                              type="number"
                              min={0}
                              value={cur.r || ""}
                              onChange={(e) =>
                                updateCell(
                                  opts.editMonthIdx!,
                                  idx,
                                  "r",
                                  Number(e.target.value) || 0,
                                )
                              }
                              className="w-24 text-center text-sm sm:text-base px-1 py-0.5 outline-none bg-transparent focus:ring-1 focus:ring-amber-500 rounded"
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
        {/* جدول تفصيل الأشهر */}
        <div className="rounded-xl border-2 border-black overflow-hidden shadow-sm">
          <div className="bg-gradient-to-r from-indigo-700 to-purple-700 text-white p-3 text-center">
            <h3 className="text-base sm:text-lg font-bold">كشف حساب السنة</h3>
            <p className="text-xs opacity-90">ملخص جميع الأشهر للعام {year}م</p>
          </div>
          <div className="overflow-auto max-h-[65vh]">
            <table className="w-max w-max table-auto border-collapse text-sm sm:text-base">
              <thead className="font-bold text-xs sticky top-0 z-20">
                <tr>
                  <TH cls="bg-slate-200 text-slate-800 min-w-[220px] text-right">البيان</TH>
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
                  <tr key={idx} className={rowClass(r.lv)}>
                    <td className="border border-black text-right whitespace-nowrap !px-0.5 !py-1 sm:!px-1 sm:!py-1 !text-[10px] sm:!text-xs">
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

        {/* ملخص الأبواب شهرياً */}
        <div className="rounded-xl border-2 border-black overflow-hidden shadow-sm">
          <div className="bg-teal-800 text-white p-3 text-center">
            <h3 className="text-base font-bold">ملخص إجمالي الاستخدامات حسب الأبواب — شهرياً</h3>
            <p className="text-xs opacity-80">المبالغ بالريال — الشهر الجاري فقط</p>
          </div>
          <div className="overflow-auto">
            <table className="w-max w-max table-auto border-collapse text-sm sm:text-base">
              <thead className="font-bold text-xs sticky top-0 z-10">
                <tr>
                  <TH cls="bg-slate-200 text-slate-800 min-w-[260px] text-right">البيان</TH>
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
                  const base = isGrand
                    ? "bg-teal-700 text-white font-bold"
                    : btIdx % 2 === 0
                      ? "bg-white font-semibold"
                      : "bg-slate-50 font-semibold";
                  return (
                    <tr key={btIdx} className={base}>
                      <td className="border border-black text-right whitespace-nowrap !px-0.5 !py-1 sm:!px-1 sm:!py-1 !text-[10px] sm:!text-xs">
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

  // ====== شريط التبويبات ======
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
        ? "bg-teal-700"
        : g === "period"
          ? "bg-amber-600"
          : g === "final"
            ? "bg-rose-700"
            : "bg-indigo-700";

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
        <div className="flex gap-2">
          <button
            onClick={() => {
              const el = document.getElementById("expenses-view-content");
              if (!el) return;
              const w = window.open("", "_blank", "width=1200,height=800");
              if (!w) return;
              w.document
                .write(`<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><title>المصروفات - ${view} - ${reportDateLabel}</title>
                <style>*{margin:0;padding:0}@page{size:A4 landscape;margin:0mm;padding:0}html{margin:0;padding:0}body{font-family:Tajawal,Cairo,Tahoma,Arial,sans-serif;padding:8px;margin:0;width:100%;box-sizing:border-box;color:#000 !important;font-weight:700 !important}
                table{width:100%;min-width:100%;table-layout:fixed;border-collapse:collapse;font-size:clamp(8px,1.35vw,11px)}
                th,td{border:1px solid black;padding:0 !important;text-align:center;white-space:normal;overflow:hidden;text-overflow:clip;overflow-wrap:anywhere;word-break:break-word;hyphens:auto;line-height:1.1;max-height:2.2em;font-size:clamp(7px,1.05vw,12px);color:whait !important;font-weight:1000 !important}
                thead th{background:#0b3d6d;color:whait!important;font-weight:700 !important}
                .cur{background:#fef9c3}.prev{background:#e0f2fe}.tot{background:#d1fae5}
                @media print{*{margin:0;padding:0;-webkit-print-color-adjust:exact !important;print-color-adjust:exact !important}body{margin:0;padding:8px;color:#000 !important;font-weight:700 !important}th,td{color:#000 !important;font-weight:700 !important;-webkit-print-color-adjust:exact !important;print-color-adjust:exact !important}}</style>
                </head><body><h2 style="text-align:center;color:#000 !important;font-weight:800">جدول المصروفات - ${year}م</h2><div style="text-align:center;font-size:11px;font-weight:700;margin-bottom:8px;">تاريخ التقرير: ${reportDateLabel}</div>${el.innerHTML}
                <script>window.onload=()=>setTimeout(()=>window.print(),300)</script></body></html>`);
              w.document.close();
            }}
            className="px-3 py-1.5 bg-white text-[#10528e] border border-[#10528e]/30 rounded-lg text-xs font-bold shadow-sm hover:bg-blue-50"
          >
            🖨️ طباعة
          </button>
          <button
            onClick={() => {
              const el = document.getElementById("expenses-view-content");
              if (!el) return;
              const tables = el.querySelectorAll("table");
              if (!tables.length) {
                toast.error("لا يوجد جدول للتصدير");
                return;
              }
              const wb = XLSX.utils.book_new();
              tables.forEach((tb, i) => {
                const ws = XLSX.utils.table_to_sheet(tb as HTMLTableElement);
                XLSX.utils.book_append_sheet(wb, ws, `ورقة${i + 1}`.slice(0, 30));
              });
              XLSX.writeFile(wb, `المصروفات-${view}-${year}-${reportDate}.xlsx`);
              toast.success("تم التصدير");
            }}
            className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-bold shadow-sm hover:bg-emerald-700"
          >
            📊 Excel
          </button>
          <button
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
