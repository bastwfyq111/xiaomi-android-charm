import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { useStore } from "@/lib/store";
import { fmt } from "@/lib/format";
import schema from "@/data/monthlyStatement.json";
import revenueSchema from "@/data/revenueTemplate.json";
import { exportPeriodicStatement } from "@/lib/exportImport";
import { monthlyStatementPdf } from "@/lib/exportPdf";
import {
  getPeriodRange,
  getReportMovementLabel,
  getReportPeriodLabel,
  REPORT_MONTH_NAMES,
  type ReportPeriodMode,
} from "@/lib/reportPeriods";
import { AlertOctagon, FileSpreadsheet, FileText } from "lucide-react";
import WebActionMenu, { type WebActionItem } from "./WebActionMenu";
import { toast } from "sonner";
import ImportButton from "./ImportButton";
import { useReportDate } from "@/lib/reportDate";


type Group = { title: string; accounts: string[] };
const GROUPS = schema.groups as Group[];
const ALL_ACCOUNTS = GROUPS.flatMap((g) => g.accounts);

const norm = (s: string) => {
  if (!s) return "";
  return s
    .replace(/[\u064B-\u0652\u0670\u0640]/g, "")
    .replace(/[\u0622\u0623\u0625]/g, "\u0627")
    .replace(/[\u0649\u064A]/g, "\u064A")
    .replace(/\u0629/g, "\u0647")
    .replace(/\u062D\s*\/\s*/g, "\u062D\u0633\u0627\u0628 ")
    .replace(/[()[\]./\\،,]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
};

const STOP_WORDS = new Set(["حساب", "حسابات", "ح", "محلية", "محليه", "عامة", "عامه"]);
const tokens = (s: string) =>
  norm(s)
    .split(" ")
    .filter((w) => w && !STOP_WORDS.has(w));

const ALL_NORM = ALL_ACCOUNTS.map((a) => ({ name: a, norm: norm(a), toks: tokens(a) }));

const matchAccount = (raw: string): string | null => {
  if (!raw) return null;
  const n = norm(raw);
  if (!n) return null;

  const exact = ALL_NORM.find((a) => a.norm === n);
  if (exact) return exact.name;

  const contains = ALL_NORM.find((a) => a.norm.includes(n) || n.includes(a.norm));
  if (contains) return contains.name;

  const rawToks = tokens(raw);
  if (!rawToks.length) return null;
  let best: { name: string; score: number } | null = null;
  for (const a of ALL_NORM) {
    if (!a.toks.length) continue;
    const common = a.toks.filter((t) => rawToks.includes(t)).length;
    if (!common) continue;
    const score = common / Math.max(a.toks.length, rawToks.length);
    if (!best || score > best.score) best = { name: a.name, score };
  }
  return best && best.score >= 0.6 ? best.name : null;
};

function lastDayOfMonth(y: number, m: number) {
  return new Date(y, m, 0).getDate();
}

// مكوّن مساعد يُصغّر خط الخلية تلقائياً حتى يتسع النص
function useFitText(ref: React.RefObject<HTMLTableElement | null>) {
  useEffect(() => {
    const table = ref.current;
    if (!table) return;

    function fitCells() {
      const cells = table!.querySelectorAll<HTMLElement>("td, th");
      cells.forEach((cell) => {
        // أعد الضبط أولاً
        cell.style.fontSize = "";
        let size = parseFloat(getComputedStyle(cell).fontSize) || 14;
        const minSize = 7;
        // قلّص حتى لا يفيض المحتوى أفقياً
        while (size > minSize && cell.scrollWidth > cell.clientWidth + 1) {
          size -= 0.5;
          cell.style.fontSize = size + "px";
        }
      });
    }

    fitCells();
    const ro = new ResizeObserver(fitCells);
    ro.observe(table);
    return () => ro.disconnect();
  }, [ref]);
}

export default function MonthlyStatementTab() {
  const { journal, accounts, clearJournal } = useStore();
  const { reportDate } = useReportDate();
  const tableRef1 = useRef<HTMLTableElement>(null);
  const tableRef2 = useRef<HTMLTableElement>(null);
  useFitText(tableRef1);
  useFitText(tableRef2);

  const [year, setYear] = useState(new Date().getFullYear());
  const [mode, setMode] = useState<ReportPeriodMode>("month");
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [quarter, setQuarter] = useState(Math.floor(new Date().getMonth() / 3) + 1);
  const [halfYear, setHalfYear] = useState(new Date().getMonth() < 6 ? 1 : 2);

  const { startMonth, endMonth } = getPeriodRange({ mode, year, month, quarter, halfYear });

  const data = useMemo(() => {
    const map: Record<
      string,
      { prevDebit: number; prevCredit: number; curDebit: number; curCredit: number }
    > = {};
    ALL_ACCOUNTS.forEach(
      (a) => (map[norm(a)] = { prevDebit: 0, prevCredit: 0, curDebit: 0, curCredit: 0 }),
    );

    journal.forEach((j) => {
      const d = new Date(j.date);
      if (isNaN(d.getTime())) return;
      if (d.getFullYear() !== year) return;
      const m = d.getMonth() + 1;
      const isCurrent = m >= startMonth && m <= endMonth;
      const isPrev = m < startMonth;
      if (!isCurrent && !isPrev) return;

      const dMatch = matchAccount(j.debitAccount || j.account || "");
      const cMatch = matchAccount(j.creditAccount || "");
      const dKey = dMatch ? norm(dMatch) : "";
      const cKey = cMatch ? norm(cMatch) : "";

      if (dKey && map[dKey]) {
        if (isCurrent) map[dKey].curDebit += Number(j.debit) || 0;
        else map[dKey].prevDebit += Number(j.debit) || 0;
      }
      if (cKey && map[cKey]) {
        if (isCurrent) map[cKey].curCredit += Number(j.credit) || 0;
        else map[cKey].prevCredit += Number(j.credit) || 0;
      }
    });
    return map;
  }, [journal, year, startMonth, endMonth]);

  const totals = useMemo(() => {
    return Object.values(data).reduce(
      (a, r) => ({
        prevDebit: a.prevDebit + r.prevDebit,
        prevCredit: a.prevCredit + r.prevCredit,
        curDebit: a.curDebit + r.curDebit,
        curCredit: a.curCredit + r.curCredit,
      }),
      { prevDebit: 0, prevCredit: 0, curDebit: 0, curCredit: 0 },
    );
  }, [data]);

  const revenueLabelByKey = useMemo(() => {
    const map: Record<string, string> = {};
    (revenueSchema as any).chapters?.forEach((ch: any) =>
      ch.sections?.forEach((sec: any) =>
        sec.items?.forEach((it: any) =>
          it.types?.forEach((t: any) => {
            map[`${ch.no}-${sec.no}-${it.no}-${t.no}`] =
              `${ch.title} ← ${sec.title || ""} ← ${it.title || ""} ← ${t.title}`;
          }),
        ),
      ),
    );
    return map;
  }, []);

  const revenueByCode = useMemo(() => {
    const agg: Record<string, { prev: number; cur: number; count: number }> = {};
    (accounts || []).forEach((acc: any) => {
      const code = acc.revenueKey;
      if (!code) return;
      const income = Number(acc.income) || 0;
      if (!income) return;
      const d = new Date(acc.date);
      if (isNaN(d.getTime()) || d.getFullYear() !== year) return;
      const m = d.getMonth() + 1;
      const isCurrent = m >= startMonth && m <= endMonth;
      const isPrev = m < startMonth;
      if (!isCurrent && !isPrev) return;
      if (!agg[code]) agg[code] = { prev: 0, cur: 0, count: 0 };
      if (isCurrent) agg[code].cur += income;
      else agg[code].prev += income;
      agg[code].count++;
    });
    return Object.entries(agg)
      .map(([code, v]) => ({
        code,
        label: revenueLabelByKey[code] || code,
        ...v,
        total: v.prev + v.cur,
      }))
      .sort((a, b) => a.code.localeCompare(b.code));
  }, [accounts, year, startMonth, endMonth, revenueLabelByKey]);

  const revenueTotals = useMemo(
    () =>
      revenueByCode.reduce(
        (a, r) => ({
          prev: a.prev + r.prev,
          cur: a.cur + r.cur,
          total: a.total + r.total,
          count: a.count + r.count,
        }),
        { prev: 0, cur: 0, total: 0, count: 0 },
      ),
    [revenueByCode],
  );

  const handleClearAllData = () => {
    if (journal.length === 0) {
      toast.info("لا توجد بيانات حالية لمسحها");
      return;
    }

    const confirmClear = window.confirm(
      "⚠️ تنبيه حرج: هل أنت متأكد تماماً من رغبتك في مسح كافة القيود والبيانات المالية لهذا التبويب؟ لن تتمكن من استعادتها إلا بإعادة الاستيراد.",
    );

    if (confirmClear) {
      if (clearJournal) {
        clearJournal();
        toast.success("تم تصفير ومسح كافة البيانات المالية بنجاح");
      } else {
        toast.error("حدث خطأ: دالة clearJournal غير معرفة بالـ Store الخاص بك.");
      }
    }
  };

  const periodSelection = { mode, year, month, quarter, halfYear };
  const periodLabel = getReportPeriodLabel(periodSelection);
  const movementLabel = getReportMovementLabel(periodSelection);

  const handleExport = () =>
    exportPeriodicStatement(journal, year, { ...periodSelection, reportDate });
  const handlePdf = () =>
    monthlyStatementPdf({
      journal,
      year,
      startMonth,
      endMonth,
      mode,
      month,
      quarter,
      halfYear,
      reportDate,
    });

  const webActions: WebActionItem[] = [
    {
      label: "استيراد Excel",
      onSelect: () => undefined,
      content: <ImportButton kind="monthly" />,
    },
    ...(journal.length > 0
      ? [{ label: "مسح البيانات", icon: AlertOctagon, onSelect: handleClearAllData, destructive: true }]
      : []),
    { label: "تصدير Excel", icon: FileSpreadsheet, onSelect: handleExport },
    { label: "تصدير PDF", icon: FileText, onSelect: handlePdf },
  ];

  return (
    <div className="space-y-3 p-1.5 sm:space-y-5 sm:p-3" dir="rtl">
      {/* لوحة التحكم العلوية */}
      <div className="grid grid-cols-2 items-end gap-1.5 rounded-xl border border-slate-200 bg-white p-1.5 shadow-sm sm:flex sm:flex-wrap sm:gap-3 sm:p-4">
        <div className="apk-only-actions col-span-2 grid w-full grid-cols-2 gap-1.5 sm:order-last sm:ml-auto sm:flex sm:w-auto sm:gap-2">
          <div className="[&>label]:min-w-0 [&>label]:justify-center [&>label]:px-1.5 [&>label]:py-1 [&>label]:text-xs sm:[&>label]:px-2 sm:[&>label]:py-1 sm:[&>label]:text-xs">
            <ImportButton kind="monthly" />
          </div>
          {journal.length > 0 && (
            <button
              onClick={handleClearAllData}
              className="min-w-0 justify-center px-1.5 py-1 text-xs sm:px-2 sm:py-1 sm:text-xs bg-rose-50 border border-rose-200 text-rose-700 font-bold rounded-lg hover:bg-rose-600 hover:text-white transition-all flex items-center gap-1 sm:gap-2"
              title="مسح كامل القيود الحالية"
            >
              <AlertOctagon className="w-4 h-4" /> مسح البيانات
            </button>
          )}
        </div>

        <div>
          <label className="mb-1 block text-xs font-bold text-slate-600 sm:text-xs">طريقة العرض المالي</label>
          <select
            value={mode}
            onChange={(e) => setMode(e.target.value as ReportPeriodMode)}
            className="block w-full px-2 py-1.5 text-xs border border-slate-300 rounded-lg bg-slate-50 focus:outline-none focus:ring-2 focus:ring-sky-500 sm:w-auto sm:px-3 sm:py-2 sm:text-sm"
          >
            <option value="month">كشف شهري تفصيلي</option>
            <option value="quarter">تقرير ربع سنوي</option>
            <option value="halfYear">تقرير نصف سنوي</option>
            <option value="year">تقرير سنوي</option>
          </select>
        </div>

        {mode === "month" ? (
          <div>
            <label className="mb-1 block text-xs font-bold text-slate-600 sm:text-xs">الفترة الزمنية (الشهر)</label>
            <select
              value={month}
              onChange={(e) => setMonth(Number(e.target.value))}
              className="block w-full px-2 py-1.5 text-xs border border-slate-300 rounded-lg bg-slate-50 focus:outline-none focus:ring-2 focus:ring-sky-500 sm:w-auto sm:px-3 sm:py-2 sm:text-sm"
            >
              {REPORT_MONTH_NAMES.map((n, i) => (
                <option key={i} value={i + 1}>
                  {n}
                </option>
              ))}
            </select>
          </div>
        ) : mode === "quarter" ? (
          <div>
            <label className="mb-1 block text-xs font-bold text-slate-600 sm:text-xs">الربع المالي</label>
            <select
              value={quarter}
              onChange={(e) => setQuarter(Number(e.target.value))}
              className="block w-full px-2 py-1.5 text-xs border border-slate-300 rounded-lg bg-slate-50 focus:outline-none focus:ring-2 focus:ring-sky-500 sm:w-auto sm:px-3 sm:py-2 sm:text-sm"
            >
              <option value={1}>الربع الأول (يناير - مارس)</option>
              <option value={2}>الربع الثاني (أبريل - يونيو)</option>
              <option value={3}>الربع الثالث (يوليو - سبتمبر)</option>
              <option value={4}>الربع الرابع (أكتوبر - ديسمبر)</option>
            </select>
          </div>
        ) : mode === "halfYear" ? (
          <div>
            <label className="mb-1 block text-xs font-bold text-slate-600 sm:text-xs">النصف المالي</label>
            <select
              value={halfYear}
              onChange={(e) => setHalfYear(Number(e.target.value))}
              className="block w-full px-2 py-1.5 text-xs border border-slate-300 rounded-lg bg-slate-50 focus:outline-none focus:ring-2 focus:ring-sky-500 sm:w-auto sm:px-3 sm:py-2 sm:text-sm"
            >
              <option value={1}>النصف الأول (يناير - يونيو)</option>
              <option value={2}>النصف الثاني (يوليو - ديسمبر)</option>
            </select>
          </div>
        ) : (
          <div className="px-2 py-1.5 text-xs font-bold text-slate-700 bg-slate-50 border border-slate-300 rounded-lg sm:px-3 sm:py-2 sm:text-sm">
            يناير - ديسمبر
          </div>
        )}

        <div>
          <label className="mb-1 block text-xs font-bold text-slate-600 sm:text-xs">السنة المالية</label>
          <input
            type="number"
            value={year}
            onChange={(e) => setYear(Number(e.target.value) || year)}
            className="block w-full px-2 py-1.5 text-xs border border-slate-300 rounded-lg bg-slate-50 focus:outline-none focus:ring-2 focus:ring-sky-500 sm:w-auto sm:px-3 sm:py-2 sm:text-sm font-mono text-center"
          />
        </div>

        <div className="flex-1" />

        <div className="apk-only-actions col-span-2 grid w-full grid-cols-2 gap-1.5 sm:col-span-1 sm:flex sm:w-auto sm:gap-2">
          <button
            onClick={handleExport}
            className="min-w-0 flex-1 justify-center px-1.5 py-1 text-xs sm:flex-initial sm:px-2 sm:py-1 sm:text-xs bg-emerald-600 text-white rounded-lg font-bold hover:bg-emerald-700 shadow-sm transition flex items-center gap-1 sm:gap-1.5"
          >
            <FileSpreadsheet className="w-4 h-4" /> تصدير Excel
          </button>
          <button
            onClick={handlePdf}
            className="min-w-0 flex-1 justify-center px-1.5 py-1 text-xs sm:flex-initial sm:px-2 sm:py-1 sm:text-xs bg-sky-700 text-white rounded-lg font-bold hover:bg-sky-800 shadow-sm transition flex items-center gap-1 sm:gap-1.5"
          >
            <FileText className="w-4 h-4" /> تصدير PDF
          </button>
        </div>
        <div className="web-only-actions col-span-2 sm:col-span-1 sm:mr-auto">
          <WebActionMenu label="إجراءات الحساب الشهري" actions={webActions} className="w-full sm:w-auto" />
        </div>
      </div>

      {/* جدول البيانات المالي */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="bg-gradient-to-r from-slate-800 to-slate-950 text-white p-2.5 text-center sm:p-5">
          <h2 className="font-bold text-lg tracking-wide sm:text-xl">
            {schema.title || "المجلس اليمني للاختصاصات الطبية"}
          </h2>
          <p className="text-xs opacity-80 mt-1">
            {schema.office || "دفتر اليومية العامة والبيانات المساعدة"} —{" "}
            {schema.governorate || "العام المالي 2026م"}
          </p>
          <div className="inline-block bg-sky-600/40 text-sky-300 text-xs px-3 py-1 rounded-full font-medium mt-2 border border-sky-500/20">
            تقرير مالي عن: {periodLabel}
          </div>
        </div>

        <div className="relative max-h-[72vh] overflow-auto">
          <table ref={tableRef1} className="min-w-max table-auto border-collapse text-sm sm:text-base text-center font-semibold">
            <thead className="bg-slate-100 text-slate-800 font-bold border-b border-black sticky top-0 z-20 shadow-sm">
              <tr>
                <th
                  rowSpan={2}
                  className="border border-black text-center bg-slate-100 text-slate-900 font-extrabold break-words !px-1 !py-1.5 sm:!px-2 sm:!py-2 !text-sm sm:!text-base whitespace-normal"
                >
    بيان الحسابات (طبقاً للنظام المحاسبي الموحد)
                </th>
                <th
                  colSpan={2}
                  className="border border-black text-center bg-slate-200/60 font-bold text-slate-800 !px-1 !py-1.5 sm:!px-2 sm:!py-2 !text-sm sm:!text-base whitespace-normal"
                >
                  الرصيد الافتتاحي / السابق في{" "}
                  {startMonth === 1 ? `1/1/${year}` : `${year}/${startMonth}/1`}م
                </th>
                <th
                  colSpan={2}
                  className="border border-black text-center bg-sky-50 text-sky-900 font-bold !px-1 !py-1.5 sm:!px-2 sm:!py-2 !text-sm sm:!text-base whitespace-normal"
                >
                  {movementLabel}
                </th>
                <th
                  colSpan={2}
                  className="border border-black text-center bg-slate-200/60 font-bold text-slate-800 !px-1 !py-1.5 sm:!px-2 sm:!py-2 !text-sm sm:!text-base whitespace-normal"
                >
 الجملــــــــــــة التراكمية
                </th>
                <th
                  colSpan={2}
                  className="border border-black text-center bg-sky-50 text-amber-900 font-extrabold !px-1 !py-1.5 sm:!px-2 sm:!py-2 !text-sm sm:!text-base whitespace-normal"
                >
   الرصيد الختامي في {year}/{endMonth}/{lastDayOfMonth(year, endMonth)}م
                </th>
              </tr>
              <tr className="bg-slate-50 text-xs text-slate-600 border-b border-black">
                <th className="border border-black text-center font-semibold bg-slate-50 min-w-[100px] sm:min-w-[100px] whitespace-normal overflow-hidden !px-1 !py-1.5 sm:!px-2 sm:!py-2 !text-sm sm:!text-base">
           إيرادات / مدين
                </th>
                <th className="border border-black text-center font-semibold bg-slate-50 min-w-[96px] sm:min-w-[120px] whitespace-normal overflow-hidden !px-1 !py-1.5 sm:!px-2 sm:!py-2 !text-sm sm:!text-base">
                  مصروفات / دائن
                </th>
                <th className="border border-black text-center font-semibold bg-sky-50/50 text-sky-950 min-w-[100px] sm:min-w-[120px] whitespace-normal overflow-hidden !px-1 !py-1.5 sm:!px-2 sm:!py-2 !text-sm sm:!text-base">
                  إيرادات / مدين
                </th>
                <th className="border border-black text-center font-semibold bg-sky-50/50 text-sky-950 min-w-[96px] sm:min-w-[120px] whitespace-normal overflow-hidden !px-1 !py-1.5 sm:!px-2 sm:!py-2 !text-sm sm:!text-base">
                  مصروفات / دائن
                </th>
                <th className="border border-black text-center font-semibold bg-slate-50 min-w-[96px] sm:min-w-[120px] whitespace-normal overflow-hidden !px-1 !py-1.5 sm:!px-2 sm:!py-2 !text-sm sm:!text-base">
                  إيرادات / مدين
                </th>
                <th className="border border-black text-center font-semibold bg-slate-50 min-w-[96px] sm:min-w-[120px] whitespace-normal overflow-hidden !px-1 !py-1.5 sm:!px-2 sm:!py-2 !text-sm sm:!text-base">
                  مصروفات / دائن
                </th>
                <th className="border border-black text-center font-bold bg-sky-50/50 text-amber-950 min-w-[96px] sm:min-w-[120px] whitespace-normal overflow-hidden !px-1 !py-1.5 sm:!px-2 sm:!py-2 !text-sm sm:!text-base">
                  أرصدة مدينة
                </th>
                <th className="border border-black text-center font-bold bg-sky-50/50 text-amber-950 min-w-[96px] sm:min-w-[120px] whitespace-normal overflow-hidden !px-1 !py-1.5 sm:!px-2 sm:!py-2 !text-sm sm:!text-base">
                  أرصدة دائنة
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black">
              {GROUPS.map((g) => {
                let gPD = 0,
                  gPC = 0,
                  gCD = 0,
                  gCC = 0;
                return (
                  <Fragment key={g.title}>
                    <tr className="bg-slate-100/80 font-bold">
                      <td
                        colSpan={9}
                        className="border border-black text-center text-slate-900 font-bold bg-slate-200/50 !px-1 !py-1.5 sm:!px-2 sm:!py-2 !text-sm sm:!text-base whitespace-normal"
                      >
                        📁 {g.title}
                      </td>
                    </tr>
                    {g.accounts.map((a) => {
                      const r = data[norm(a)] || {
                        prevDebit: 0,
                        prevCredit: 0,
                        curDebit: 0,
                        curCredit: 0,
                      };
                      const totD = r.prevDebit + r.curDebit;
                      const totC = r.prevCredit + r.curCredit;
                      const balD = Math.max(0, totD - totC);
                      const balC = Math.max(0, totC - totD);

                      gPD += r.prevDebit;
                      gPC += r.prevCredit;
                      gCD += r.curDebit;
                      gCC += r.curCredit;

                      return (
                        <tr key={a} className="hover:bg-slate-50/80 transition-colors">
                          <td className="border border-black font-medium text-slate-700 text-center min-w-[96px] sm:min-w-[120px] whitespace-normal overflow-hidden !px-1 !py-1.5 sm:!px-2 sm:!py-2 !text-sm sm:!text-base">
                            {a}
                          </td>
                          <td className="border border-black numeric-cell font-mono text-center text-slate-600 min-w-[96px] sm:min-w-[120px] whitespace-normal overflow-hidden !px-1 !py-1.5 sm:!px-2 sm:!py-2 !text-sm sm:!text-base">
                            {r.prevDebit ? fmt(r.prevDebit) : "—"}
                          </td>
                          <td className="border border-black numeric-cell font-mono text-center text-slate-600 min-w-[96px] sm:min-w-[120px] whitespace-normal overflow-hidden !px-1 !py-1.5 sm:!px-2 sm:!py-2 !text-sm sm:!text-base">
                            {r.prevCredit ? fmt(r.prevCredit) : "—"}
                          </td>
                          <td className="border border-black numeric-cell font-mono text-center text-sky-700 bg-sky-50/10 min-w-[96px] sm:min-w-[120px] whitespace-normal overflow-hidden !px-1 !py-1.5 sm:!px-2 sm:!py-2 !text-sm sm:!text-base">
                            {r.curDebit ? fmt(r.curDebit) : "—"}
                          </td>
                          <td className="border border-black numeric-cell font-mono text-center text-sky-700 bg-sky-50/10 min-w-[96px] sm:min-w-[120px] whitespace-normal overflow-hidden !px-1 !py-1.5 sm:!px-2 sm:!py-2 !text-sm sm:!text-base">
                            {r.curCredit ? fmt(r.curCredit) : "—"}
                          </td>
                          <td className="border border-black numeric-cell font-mono text-center text-slate-800 font-medium min-w-[96px] sm:min-w-[120px] whitespace-normal overflow-hidden !px-1 !py-1.5 sm:!px-2 sm:!py-2 !text-sm sm:!text-base">
                            {totD ? fmt(totD) : "—"}
                          </td>
                          <td className="border border-black numeric-cell font-mono text-center text-slate-800 font-medium min-w-[96px] sm:min-w-[120px] whitespace-normal overflow-hidden !px-1 !py-1.5 sm:!px-2 sm:!py-2 !text-sm sm:!text-base">
                            {totC ? fmt(totC) : "—"}
                          </td>
                          <td className="border border-black numeric-cell font-mono text-center text-emerald-700 font-bold bg-emerald-50/20 min-w-[96px] sm:min-w-[120px] whitespace-normal overflow-hidden !px-1 !py-1.5 sm:!px-2 sm:!py-2 !text-sm sm:!text-base">
                            {balD ? fmt(balD) : "—"}
                          </td>
                          <td className="border border-black numeric-cell font-mono text-center text-rose-700 font-bold bg-rose-50/20 min-w-[96px] sm:min-w-[120px] whitespace-normal overflow-hidden !px-1 !py-1.5 sm:!px-2 sm:!py-2 !text-sm sm:!text-base">
                            {balC ? fmt(balC) : "—"}
                          </td>
                        </tr>
                      );
                    })}
                    <tr className="bg-slate-50 font-bold text-slate-900 border-b border-black">
                      <td className="border border-black text-center text-slate-800 font-bold min-w-[96px] sm:min-w-[120px] whitespace-normal overflow-hidden !px-1 !py-1.5 sm:!px-2 sm:!py-2 !text-sm sm:!text-base">
                        جملة بند: {g.title}
                      </td>
                      <td className="border border-black numeric-cell font-mono text-center text-slate-700 bg-slate-100/50 min-w-[96px] sm:min-w-[120px] whitespace-normal overflow-hidden !px-1 !py-1.5 sm:!px-2 sm:!py-2 !text-sm sm:!text-base">
                        {fmt(gPD)}
                      </td>
                      <td className="border border-black numeric-cell font-mono text-center text-slate-700 bg-slate-100/50 min-w-[96px] sm:min-w-[120px] whitespace-normal overflow-hidden !px-1 !py-1.5 sm:!px-2 sm:!py-2 !text-sm sm:!text-base">
                        {fmt(gPC)}
                      </td>
                      <td className="border border-black numeric-cell font-mono text-center text-sky-800 bg-sky-50/40 min-w-[96px] sm:min-w-[120px] whitespace-normal overflow-hidden !px-1 !py-1.5 sm:!px-2 sm:!py-2 !text-sm sm:!text-base">
                        {fmt(gCD)}
                      </td>
                      <td className="border border-black numeric-cell font-mono text-center text-sky-800 bg-sky-50/40 min-w-[96px] sm:min-w-[120px] whitespace-normal overflow-hidden !px-1 !py-1.5 sm:!px-2 sm:!py-2 !text-sm sm:!text-base">
                        {fmt(gCC)}
                      </td>
                      <td className="border border-black numeric-cell font-mono text-center text-slate-900 min-w-[96px] sm:min-w-[120px] whitespace-normal overflow-hidden !px-1 !py-1.5 sm:!px-2 sm:!py-2 !text-sm sm:!text-base">
                        {fmt(gPD + gCD)}
                      </td>
                      <td className="border border-black numeric-cell font-mono text-center text-slate-900 min-w-[96px] sm:min-w-[120px] whitespace-normal overflow-hidden !px-1 !py-1.5 sm:!px-2 sm:!py-2 !text-sm sm:!text-base">
                        {fmt(gPC + gCC)}
                      </td>
                      <td className="border border-black numeric-cell font-mono text-center text-emerald-800 bg-emerald-100/20 min-w-[96px] sm:min-w-[120px] whitespace-normal overflow-hidden !px-1 !py-1.5 sm:!px-2 sm:!py-2 !text-sm sm:!text-base">
                        {fmt(Math.max(0, gPD + gCD - (gPC + gCC)))}
                      </td>
                      <td className="border border-black numeric-cell font-mono text-center text-rose-800 bg-rose-100/20 min-w-[96px] sm:min-w-[120px] whitespace-normal overflow-hidden !px-1 !py-1.5 sm:!px-2 sm:!py-2 !text-sm sm:!text-base">
                        {fmt(Math.max(0, gPC + gCC - (gPD + gCD)))}
                      </td>
                    </tr>
                  </Fragment>
                );
              })}

              <tr className="bg-slate-900 text-white font-extrabold text-sm border-t-2 border-black">
                <td className="border border-black text-center bg-slate-950 font-black min-w-[96px] sm:min-w-[120px] whitespace-normal overflow-hidden !px-1 !py-1.5 sm:!px-2 sm:!py-2 !text-sm sm:!text-base">
                  الإجمالي العام النهائي للحسابات الكلية
                </td>
                <td className="border border-black numeric-cell font-mono text-center text-slate-200 min-w-[96px] sm:min-w-[120px] whitespace-normal overflow-hidden !px-1 !py-1.5 sm:!px-2 sm:!py-2 !text-sm sm:!text-base">
                  {fmt(totals.prevDebit)}
                </td>
                <td className="border border-black numeric-cell font-mono text-center text-slate-200 min-w-[96px] sm:min-w-[120px] whitespace-normal overflow-hidden !px-1 !py-1.5 sm:!px-2 sm:!py-2 !text-sm sm:!text-base">
                  {fmt(totals.prevCredit)}
                </td>
                <td className="border border-black numeric-cell font-mono text-center text-sky-300 bg-slate-800 min-w-[96px] sm:min-w-[120px] whitespace-normal overflow-hidden !px-1 !py-1.5 sm:!px-2 sm:!py-2 !text-sm sm:!text-base">
                  {fmt(totals.curDebit)}
                </td>
                <td className="border border-black numeric-cell font-mono text-center text-sky-300 bg-slate-800 min-w-[96px] sm:min-w-[120px] whitespace-normal overflow-hidden !px-1 !py-1.5 sm:!px-2 sm:!py-2 !text-sm sm:!text-base">
                  {fmt(totals.curCredit)}
                </td>
                <td className="border border-black numeric-cell font-mono text-center text-slate-100 min-w-[96px] sm:min-w-[120px] whitespace-normal overflow-hidden !px-1 !py-1.5 sm:!px-2 sm:!py-2 !text-sm sm:!text-base">
                  {fmt(totals.prevDebit + totals.curDebit)}
                </td>
                <td className="border border-black numeric-cell font-mono text-center text-slate-100 min-w-[96px] sm:min-w-[120px] whitespace-normal overflow-hidden !px-1 !py-1.5 sm:!px-2 sm:!py-2 !text-sm sm:!text-base">
                  {fmt(totals.prevCredit + totals.curCredit)}
                </td>
                <td className="border border-black numeric-cell font-mono text-center text-emerald-400 bg-sky-950/50 min-w-[96px] sm:min-w-[120px] whitespace-normal overflow-hidden !px-1 !py-1.5 sm:!px-2 sm:!py-2 !text-sm sm:!text-base">
                  {fmt(
                    Math.max(
                      0,
                      totals.prevDebit + totals.curDebit - (totals.prevCredit + totals.curCredit),
                    ),
                  )}
                </td>
                <td className="border border-black numeric-cell font-mono text-center text-rose-400 bg-sky-950/50 min-w-[96px] sm:min-w-[120px] whitespace-normal overflow-hidden !px-1 !py-1.5 sm:!px-2 sm:!py-2 !text-sm sm:!text-base">
                  {fmt(
                    Math.max(
                      0,
                      totals.prevCredit + totals.curCredit - (totals.prevDebit + totals.curDebit),
                    ),
                  )}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* جدول تجميع إيرادات الحساب */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="flex flex-col items-stretch justify-between gap-2 bg-gradient-to-r from-sky-700 to-sky-900 p-2.5 text-white sm:flex-row sm:items-center sm:p-4">
          <div>
            <h3 className="font-bold text-base">📊 تجميع إيرادات الحساب حسب رمز الإيراد</h3>
            <p className="text-xs opacity-80 mt-0.5">
              مصدر البيانات: تبويب الحساب — للفترة: {periodLabel}
            </p>
          </div>
          <div className="bg-white/10 border border-white/10 rounded-full px-3 py-1 text-xs font-bold">
            عدد الرموز: {revenueByCode.length} | عدد السجلات: {revenueTotals.count}
          </div>
        </div>
        <div className="relative max-h-[72vh] overflow-auto">
          <table ref={tableRef2} className="min-w-max table-auto border-collapse text-sm sm:text-base text-center font-semibold">
            <thead className="bg-sky-50 text-sky-900 font-bold border-b border-black sticky top-0 z-20 shadow-sm">
              <tr>
                <th className="border border-black text-center min-w-[96px] sm:min-w-[120px] whitespace-normal overflow-hidden !px-1 !py-1.5 sm:!px-2 sm:!py-2 !text-sm sm:!text-base">
                  م
                </th>
                <th className="border border-black text-center min-w-[96px] sm:min-w-[120px] whitespace-normal overflow-hidden !px-1 !py-1.5 sm:!px-2 sm:!py-2 !text-sm sm:!text-base">
                  رمز الإيراد
                </th>
                <th className="border border-black text-center min-w-[96px] sm:min-w-[120px] whitespace-normal overflow-hidden !px-1 !py-1.5 sm:!px-2 sm:!py-2 !text-sm sm:!text-base">
                  بيان الإيراد (من قالب الإيرادات)
                </th>
                <th className="border border-black text-center min-w-[96px] sm:min-w-[120px] whitespace-normal overflow-hidden !px-1 !py-1.5 sm:!px-2 sm:!py-2 !text-sm sm:!text-base">
                  عدد السجلات
                </th>
                <th className="border border-black text-center min-w-[96px] sm:min-w-[120px] whitespace-normal overflow-hidden !px-1 !py-1.5 sm:!px-2 sm:!py-2 !text-sm sm:!text-base">
                  إيراد الفترة السابقة
                </th>
                <th className="border border-black text-center min-w-[96px] sm:min-w-[120px] whitespace-normal overflow-hidden !px-1 !py-1.5 sm:!px-2 sm:!py-2 !text-sm sm:!text-base">
                  إيراد الفترة الحالية
                </th>
                <th className="border border-black text-center min-w-[96px] sm:min-w-[120px] whitespace-normal overflow-hidden !px-1 !py-1.5 sm:!px-2 sm:!py-2 !text-sm sm:!text-base">
                  الإجمالي التراكمي
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black">
              {revenueByCode.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center text-slate-500 font-medium !px-1 !py-1.5 sm:!px-2 sm:!py-2 !text-sm sm:!text-base whitespace-normal">
                    لا توجد سجلات في تبويب الحساب لها رمز إيراد ضمن الفترة المختارة.
                  </td>
                </tr>
              ) : (
                revenueByCode.map((r, i) => (
                  <tr key={r.code} className="hover:bg-sky-50/40 transition-colors">
                    <td className="border border-black text-center numeric-cell font-mono text-slate-500 min-w-[96px] sm:min-w-[120px] whitespace-normal overflow-hidden !px-1 !py-1.5 sm:!px-2 sm:!py-2 !text-sm sm:!text-base">
                      {i + 1}
                    </td>
                    <td className="border border-black text-center numeric-cell font-mono font-extrabold text-sky-800 bg-sky-50/40 min-w-[96px] sm:min-w-[120px] whitespace-normal overflow-hidden !px-1 !py-1.5 sm:!px-2 sm:!py-2 !text-sm sm:!text-base">
                      {r.code}
                    </td>
                    <td className="border border-black text-center font-medium text-slate-800 min-w-[96px] sm:min-w-[120px] whitespace-normal overflow-hidden !px-1 !py-1.5 sm:!px-2 sm:!py-2 !text-sm sm:!text-base">
                      {r.label}
                    </td>
                    <td className="border border-black text-center numeric-cell font-mono text-slate-600 min-w-[96px] sm:min-w-[120px] whitespace-normal overflow-hidden !px-1 !py-1.5 sm:!px-2 sm:!py-2 !text-sm sm:!text-base">
                      {r.count}
                    </td>
                    <td className="border border-black text-center numeric-cell font-mono text-slate-700 min-w-[96px] sm:min-w-[120px] whitespace-normal overflow-hidden !px-1 !py-1.5 sm:!px-2 sm:!py-2 !text-sm sm:!text-base">
                      {r.prev ? fmt(r.prev) : "—"}
                    </td>
                    <td className="border border-black text-center numeric-cell font-mono text-sky-700 font-bold bg-sky-50/30 min-w-[96px] sm:min-w-[120px] whitespace-normal overflow-hidden !px-1 !py-1.5 sm:!px-2 sm:!py-2 !text-sm sm:!text-base">
                      {r.cur ? fmt(r.cur) : "—"}
                    </td>
                    <td className="border border-black text-center numeric-cell font-mono text-emerald-700 font-black bg-emerald-50/30 min-w-[96px] sm:min-w-[120px] whitespace-normal overflow-hidden !px-1 !py-1.5 sm:!px-2 sm:!py-2 !text-sm sm:!text-base">
                      {fmt(r.total)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {revenueByCode.length > 0 && (
              <tfoot>
                <tr className="bg-slate-900 text-white font-extrabold">
                  <td
                    colSpan={3}
                    className="border border-black text-center !px-1 !py-1.5 sm:!px-2 sm:!py-2 !text-sm sm:!text-base whitespace-normal"
                  >
                    الإجمالي العام لرموز الإيراد
                  </td>
                  <td className="border border-black text-center numeric-cell font-mono min-w-[96px] sm:min-w-[120px] whitespace-normal overflow-hidden !px-1 !py-1.5 sm:!px-2 sm:!py-2 !text-sm sm:!text-base">
                    {revenueTotals.count}
                  </td>
                  <td className="border border-black text-center numeric-cell font-mono text-slate-200 min-w-[96px] sm:min-w-[120px] whitespace-normal overflow-hidden !px-1 !py-1.5 sm:!px-2 sm:!py-2 !text-sm sm:!text-base">
                    {fmt(revenueTotals.prev)}
                  </td>
                  <td className="border border-black text-center numeric-cell font-mono text-sky-300 min-w-[96px] sm:min-w-[120px] whitespace-normal overflow-hidden !px-1 !py-1.5 sm:!px-2 sm:!py-2 !text-sm sm:!text-base">
                    {fmt(revenueTotals.cur)}
                  </td>
                  <td className="border border-black text-center numeric-cell font-mono text-emerald-400 min-w-[96px] sm:min-w-[120px] whitespace-normal overflow-hidden !px-1 !py-1.5 sm:!px-2 sm:!py-2 !text-sm sm:!text-base">
                    {fmt(revenueTotals.total)}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
}
