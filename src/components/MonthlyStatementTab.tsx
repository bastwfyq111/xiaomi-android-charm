import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { useStore } from "@/lib/store";
import { fmt } from "@/lib/format";
import schema from "@/data/monthlyStatement.json";
import revenueSchema from "@/data/revenueTemplate.json";
import { exportMonthlyStatement } from "@/lib/exportImport";
import { monthlyStatementPdf } from "@/lib/exportPdf";
import { AlertOctagon, FileSpreadsheet, FileText } from "lucide-react";
import { toast } from "sonner";
import ImportButton from "./ImportButton";

const MONTH_NAMES = [
  "يناير",
  "فبراير",
  "مارس",
  "أبريل",
  "مايو",
  "يونيو",
  "يوليو",
  "أغسطس",
  "سبتمبر",
  "أكتوبر",
  "نوفمبر",
  "ديسمبر",
];

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

function useFitText(ref: React.RefObject<HTMLTableElement | null>) {
  useEffect(() => {
    const table = ref.current;
    if (!table) return;

    function fitCells() {
      const cells = table!.querySelectorAll<HTMLElement>("td, th");
      cells.forEach((cell) => {
        cell.style.fontSize = "";
        let size = parseFloat(getComputedStyle(cell).fontSize) || 14;
        const minSize = 7;
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
  const tableRef1 = useRef<HTMLTableElement>(null);
  const tableRef2 = useRef<HTMLTableElement>(null);
  useFitText(tableRef1);
  useFitText(tableRef2);

  const [year, setYear] = useState(new Date().getFullYear());
  const [mode, setMode] = useState<"month" | "quarter">("month");
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [quarter, setQuarter] = useState(Math.floor(new Date().getMonth() / 3) + 1);

  const startMonth = mode === "month" ? month : (quarter - 1) * 3 + 1;
  const endMonth = mode === "month" ? month : quarter * 3;

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
      if (cKey &&

<div class="se-ai-msg se-ai-msg--user"><div class="se-ai-msg__bubble"><p>اكمل</p>
</div></div>



import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { useStore } from "@/lib/store";
import { fmt } from "@/lib/format";
import schema from "@/data/monthlyStatement.json";
import revenueSchema from "@/data/revenueTemplate.json";
import { exportMonthlyStatement } from "@/lib/exportImport";
import { monthlyStatementPdf } from "@/lib/exportPdf";
import { AlertOctagon, FileSpreadsheet, FileText } from "lucide-react";
import { toast } from "sonner";
import ImportButton from "./ImportButton";

const MONTH_NAMES = [
  "يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو",
  "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر",
];

type Group = { title: string; accounts: string[] };
const GROUPS = (schema.groups as Group[]) || [];
const ALL_ACCOUNTS = GROUPS.flatMap((g) => g.accounts || []);

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

function useFitText(ref: React.RefObject<HTMLTableElement | null>) {
  useEffect(() => {
    const table = ref.current;
    if (!table) return;
    function fitCells() {
      const cells = table!.querySelectorAll<HTMLElement>("td, th");
      cells.forEach((cell) => {
        cell.style.fontSize = "";
        let size = parseFloat(getComputedStyle(cell).fontSize) || 14;
        const minSize = 7;
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
  const tableRef1 = useRef<HTMLTableElement>(null);
  const tableRef2 = useRef<HTMLTableElement>(null);
  useFitText(tableRef1);
  useFitText(tableRef2);

  const [year, setYear] = useState(new Date().getFullYear());
  const [mode, setMode] = useState<"month" | "quarter">("month");
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [quarter, setQuarter] = useState(Math.floor(new Date().getMonth() / 3) + 1);

  const startMonth = mode === "month" ? month : (quarter - 1) * 3 + 1;
  const endMonth = mode === "month" ? month : quarter * 3;

  const data = useMemo(() => {
    const map: Record<string, { prevDebit: number; prevCredit: number; curDebit: number; curCredit: number }> = {};
    ALL_ACCOUNTS.forEach((a) => (map[norm(a)] = { prevDebit: 0, prevCredit: 0, curDebit: 0, curCredit: 0 }));

    journal.forEach((j) => {
      const d = new Date(j.date);
      if (isNaN(d.getTime()) || d.getFullYear() !== year) return;
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
            map[`${ch.no}-${sec.no}-${it.no}-${t.no}`] = `${ch.title} ← ${sec.title || ""} ← ${it.title || ""} ← ${t.title}`;
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

  const revenueTotals = useMemo(() => {
    return revenueByCode.reduce(
      (a, r) => ({
        prev: a.prev + r.prev,
        cur: a.cur + r.cur,
        total: a.total + r.total,
        count: a.count + r.count,
      }),
      { prev: 0, cur: 0, total: 0, count: 0 },
    );
  }, [revenueByCode]);

  const handleClearAllData = () => {
    if (journal.length === 0) {
      toast.info("لا توجد بيانات حالية لمسحها");
      return;
    }
    if (window.confirm("⚠️ تنبيه حرج: هل أنت متأكد من مسح كافة البيانات؟")) {
      clearJournal?.();
      toast.success("تم مسح البيانات بنجاح");
    }
  };

  const handleExport = () => exportMonthlyStatement(journal, year);
  const handlePdf = () => monthlyStatementPdf({ journal, year, startMonth, endMonth, mode, quarter });

  const periodLabel = mode === "month" 
    ? `شهر ${MONTH_NAMES[month - 1]} ${year}م`
    : `الربع ${["الأول", "الثاني", "الثالث", "الرابع"][quarter - 1]} ${year}م`;

  return (
    <div className="space-y-5" dir="rtl">
      {/* Control Panel */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 flex flex-wrap items-end gap-3">
        <div className="w-full sm:w-auto sm:order-last sm:ml-auto flex gap-2">
          <ImportButton kind="monthly" />
          {journal.length > 0 && (
            <button onClick={handleClearAllData} className="px-4 py-2 bg-rose-50 text-rose-700 border border-rose-200 rounded-lg flex items-center gap-2 text-sm font-bold">
              <AlertOctagon className="w-4 h-4" /> مسح البيانات
            </button>
          )}
        </div>

        <div>
          <label className="text-xs font-bold text-slate-600 block mb-1">طريقة العرض</label>
          <select value={mode} onChange={(e) => setMode(e.target.value as "month" | "quarter")} className="px-3 py-2 border rounded-lg text-sm">
            <option value="month">شهري</option>
            <option value="quarter">ربع سنوي</option>
          </select>
        </div>

        {mode === "month" ? (
          <div>
            <label className="text-xs font-bold text-slate-600 block mb-1">الشهر</label>
            <select value={month} onChange={(e) => setMonth(Number(e.target.value))} className="px-3 py-2 border rounded-lg text-sm">
              {MONTH_NAMES.map((n, i) => <option key={i} value={i + 1}>{n}</option>)}
            </select>
          </div>
        ) : (
          <div>
            <label className="text-xs font-bold text-slate-600 block mb-1">الربع</label>
            <select value={quarter} onChange={(e) => setQuarter(Number(e.target.value))} className="px-3 py-2 border rounded-lg text-sm">
              <option value={1}>الربع الأول</option>
              <option value={2}>الربع الثاني</option>
              <option value={3}>الربع الثالث</option>
              <option value={4}>الربع الرابع</option>
            </select>
          </div>
        )}

        <div>
          <label className="text-xs font-bold text-slate-600 block mb-1">السنة</label>
          <input type="number" value={year} onChange={(e) => setYear(Number(e.target.value) || year)} className="w-20 px-3 py-2 border rounded-lg text-sm text-center" />
        </div>

        <div className="flex gap-2">
          <button onClick={handleExport} className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-bold flex items-center gap-1.5">
            <FileSpreadsheet className="w-4 h-4" /> Excel
          </button>
          <button onClick={handlePdf} className="px-4 py-2 bg-teal-700 text-white rounded-lg text-sm font-bold flex items-center gap-1.5">
            <FileText className="w-4 h-4" /> PDF
          </button>
        </div>
      </div>

      {/* Main Statement Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="bg-slate-800 text-white p-5 text-center">
          <h2 className="font-bold text-xl">{schema.title || "التقرير المالي"}</h2>
          <p className="text-xs opacity-80">{schema.office || ""} — {year}م</p>
          <div className="inline-block bg-teal-600/40 text-teal-300 text-xs px-3 py-1 rounded-full mt-2 border border-teal-500/20">
            الفترة: {periodLabel}
          </div>
        </div>

        <div className="overflow-auto max-h-[65vh]">
          <table ref={tableRef1} className="w-full text-sm border-collapse text-center">
            <thead className="bg-slate-100 sticky top-0 z-20 border-b border-black">
              <tr className="text-xs uppercase">
                <th rowSpan={2} className="border border-black p-2 bg-slate-100">بيان الحسابات</th>
                <th colSpan={2} className="border border-black p-1 bg-slate-200/60">الرصيد السابق</th>
                <th colSpan={2} className="border border-black p-1 bg-teal-50">الحركة الحالية</th>
                <th colSpan={2} className="border border-black p-1 bg-slate-200/60">الجملة التراكمية</th>
                <th colSpan={2} className="border border-black p-1 bg-amber-50">الرصيد الختامي</th>
              </tr>
              <tr className="text-[10px] bg-slate-50">
                <th className="border border-black p-1">مدين</th><th className="border border-black p-1">دائن</th>
                <th className="border border-black p-1">مدين</th><th className="border border-black p-1">دائن</th>
                <th className="border border-black p-1">مدين</th><th className="border border-black p-1">دائن</th>
                <th className="border border-black p-1">مدين</th><th className="border border-black p-1">دائن</th>
              </tr>
            </thead>
            <tbody>
              {GROUPS.map((g) => {
                let gPD = 0, gPC = 0, gCD = 0, gCC = 0;
                return (
                  <Fragment key={g.title}>
                    <tr className="bg-slate-100 font-bold"><td colSpan={9} className="border border-black p-2 text-right px-4">📁 {g.title}</td></tr>
                    {g.accounts.map((a) => {
                      const r = data[norm(a)] || { prevDebit: 0, prevCredit: 0, curDebit: 0, curCredit: 0 };
                      const totD = r.prevDebit + r.curDebit;
                      const totC = r.prevCredit + r.curCredit;
                      gPD += r.prevDebit; gPC += r.prevCredit; gCD += r.curDebit; gCC += r.curCredit;
                      return (
                        <tr key={a} className="hover:bg-slate-50">
                          <td className="border border-black p-2 text-right whitespace-normal">{a}</td>
                          <td className="border border-black p-1 font-mono">{r.prevDebit ? fmt(r.prevDebit) : "—"}</td>
                          <td className="border border-black p-1 font-mono">{r.prevCredit ? fmt(r.prevCredit) : "—"}</td>
                          <td className="border border-black p-1 font-mono text-teal-700">{r.curDebit ? fmt(r.curDebit) : "—"}</td>
                          <td className="border border-black p-1 font-mono text-teal-700">{r.curCredit ? fmt(r.curCredit) : "—"}</td>
                          <td className="border border-black p-1 font-mono">{totD ? fmt(totD) : "—"}</td>
                          <td className="border border-black p-1 font-mono">{totC ? fmt(totC) : "—"}</td>
                          <td className="border border-black p-1 font-mono text-emerald-700 font-bold">{Math.max(0, totD - totC) ? fmt(Math.max(0, totD - totC)) : "—"}</td>
                          <td className="border border-black p-1 font-mono text-rose-700 font-bold">{Math.max(0, totC - totD) ? fmt(Math.max(0, totC - totD)) : "—"}</td>
                        </tr>
                      );
                    })}
                    <tr className="bg-slate-50 font-bold">
                      <td className="border border-black p-2 text-right">جملة {g.title}</td>
                      <td className="border border-black p-1 font-mono">{fmt(gPD)}</td><td className="border border-black p-1 font-mono">{fmt(gPC)}</td>
                      <td className="border border-black p-1 font-mono">{fmt(gCD)}</td><td className="border border-black p-1 font-mono">{fmt(gCC)}</td>
                      <td className="border border-black p-1 font-mono">{fmt(gPD + gCD)}</td><td className="border border-black p-1 font-mono">{fmt(gPC + gCC)}</td>
                      <td className="border border-black p-1 font-mono text-emerald-700">{fmt(Math.max(0, gPD + gCD - (gPC + gCC)))}</td>
                      <td className="border border-black p-1 font-mono text-rose-700">{fmt(Math.max(0, gPC + gCC - (gPD + gCD)))}</td>
                    </tr>
                  </Fragment>
                );
              })}
              <tr className="bg-slate-900 text-white font-bold">
                <td className="border border-black p-2 text-center">الإجمالي العام</td>
                <td className="border border-black p-1 font-mono">{fmt(totals.prevDebit)}</td><td className="border border-black p-1 font-mono">{fmt(totals.prevCredit)}</td>
                <td className="border border-black p-1 font-mono text-teal-300">{fmt(totals.curDebit)}</td><td className="border border-black p-1 font-mono text-teal-300">{fmt(totals.curCredit)}</td>
                <td className="border border-black p-1 font-mono">{fmt(totals.prevDebit + totals.curDebit)}</td><td className="border border-black p-1 font-mono">{fmt(totals.prevCredit + totals.curCredit)}</td>
                <td className="border border-black p-1 font-mono text-emerald-400">{fmt(Math.max(0, totals.prevDebit + totals.curDebit - (totals.prevCredit + totals.curCredit)))}</td>
                <td className="border border-black p-1 font-mono text-rose-400">{fmt(Math.max(0, totals.prevCredit + totals.curCredit - (totals.prevDebit + totals.curDebit)))}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Revenue Summary Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="bg-teal-800 text-white p-4 flex justify-between items-center">
          <h3 className="font-bold">📊 تجميع الإيرادات</h3>
          <span className="text-xs opacity-80">عدد الرموز: {revenueByCode.length}</span>
        </div>
        <div className="overflow-auto max-h-[40vh]">
          <table ref={tableRef2} className="w-full text-sm border-collapse text-center">
            <thead className="bg-teal-50 text-teal-900 border-b border-black sticky top-0">
              <tr>
                <th className="border border-black p-2">م</th>
                <th className="border border-black p-2">الرمز</th>
                <th className="border border-black p-2">البيان</th>
                <th className="border border-black p-2">عدد</th>
                <th className="border border-black p-2">السابق</th>
                <th className="border border-black p-2">الحالي</th>
                <th className="border border-black p-2">الإجمالي</th>
              </tr>
            </thead>
            <tbody>
              {revenueByCode.map((r, i) => (
                <tr key={r.code} className="hover:bg-teal-50/50">
                  <td className="border border-black p-2">{i + 1}</td>
                  <td className="border border-black p-2 font-bold text-teal-800">{r.code}</td>
                  <td className="border border-black p-2 text-right">{r.label}</td>
                  <td className="border border-black p-2">{r.count}</td>
                  <td className="border border-black p-2">{fmt(r.prev)}</td>
                  <td className="border border-black p-2 text-teal-700 font-bold">{fmt(r.cur)}</td>
                  <td className="border border-black p-2 text-emerald-700 font-bold">{fmt(r.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}