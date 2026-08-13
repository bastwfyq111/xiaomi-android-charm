import React, { useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import { fmt, today } from "@/lib/format";
import { DESCRIPTIONS } from "@/lib/accounts";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { useTableControls, sortIndicator } from "@/hooks/useTableControls";
import {
  X,
  Plus,
  Edit,
  Trash2,
  Save,
  Eraser,
  FileSpreadsheet,
  Link,
  RefreshCw,
  Calendar,
  Hash,
  FileText,
  User,
  ArrowUpRight,
  ArrowDownLeft,
  Wallet,
  Zap,
  Stethoscope,
  Landmark,
  Ticket,
} from "lucide-react";
import TabActions from "./TabActions";
import schema from "@/data/revenueTemplate.json";

/* ============================================================
   الحساب الجاري — خلفية بيج/فضية فاتحة، نص أسود غامق وكبير،
   كل أيقونة بلون مختلف، وتحسين طباعة لاحتواء الخلايا تلقائياً.
   ============================================================ */

const COLS = [
  { key: "date", label: "التاريخ" },
  { key: "hafizaNo", label: "رقم الحافظة" },
  { key: "notifyNo", label: "رقم الإشعار" },
  { key: "notifyDate", label: "تاريخ التوريد" },
  { key: "checkNo", label: "رقم الشيك" },
  { key: "checkDate", label: "تاريخ الشيك" },
  { key: "description", label: "البيان" },
  { key: "specialty", label: "التخصص" },
  { key: "name", label: "الاسم" },
  { key: "hafizaAmount", label: "مبلغ الحافظة" },
  { key: "income", label: "الإيرادات" },
  { key: "expense", label: "المصروفات" },
  { key: "revenueKey", label: "رمز الإيراد" },
  { key: "balance", label: "الرصيد" },
];

type FormType = {
  date: string;
  hafizaNo: string;
  notifyNo: string;
  notifyDate: string;
  checkNo: string;
  checkDate: string;
  description: string;
  specialty: string;
  name: string;
  hafizaAmount: string;
  income: string;
  expense: string;
  revenueKey: string;
};

const emptyForm: FormType = {
  date: today(),
  hafizaNo: "",
  notifyNo: "",
  notifyDate: "",
  checkNo: "",
  checkDate: "",
  description: "",
  specialty: "",
  name: "",
  hafizaAmount: "",
  income: "",
  expense: "",
  revenueKey: "",
};

const parseAmount = (val: any): number => {
  if (val === undefined || val === null || val === "") return 0;
  if (typeof val === "number") return val;
  const cleanString = String(val).replace(/[^\d.-]/g, "");
  const parsed = parseFloat(cleanString);
  return isNaN(parsed) ? 0 : parsed;
};

/* أنماط الطباعة: احتواء تلقائي لنص الخلايا بدل القطع، مع حدود سوداء واضحة */
const PRINT_STYLES = `
@media print {
  .accounts-print-scope { background: #fff !important; }
  .accounts-print-area, .accounts-print-area * { visibility: visible !important; }
  .accounts-print-hide { display: none !important; }
  .accounts-print-area table {
    border-collapse: collapse !important;
    width: 100% !important;
    table-layout: auto !important;
  }
  .accounts-print-area th,
  .accounts-print-area td {
    border: 1px solid #000 !important;
    white-space: normal !important;
    overflow: visible !important;
    text-overflow: unset !important;
    word-break: break-word !important;
    height: auto !important;
    max-width: none !important;
    color: #000 !important;
    background: #fff !important;
  }
  .accounts-print-area .overflow-x-auto,
  .accounts-print-area .overflow-y-auto {
    overflow: visible !important;
    max-height: none !important;
  }
}
`;

/* ---------- عناصر واجهة أساسية بالهوية الفاتحة ---------- */

const Modal = ({
  title,
  isOpen,
  onClose,
  children,
}: {
  title: string;
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) => {
  if (!isOpen) return null;
  return (
    <div
      className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-2 sm:p-4"
      dir="rtl"
    >
      <div className="bg-[#FAF9F6] rounded-t-2xl sm:rounded-2xl w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-y-auto border border-black/10">
        <div className="flex justify-between items-center px-5 py-4 border-b border-black/10 bg-white sticky top-0 z-10">
          <h3 className="font-black text-base sm:text-lg text-[#171412] flex items-center gap-2 tracking-tight">
            {title}
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-black/5 rounded-xl transition-colors text-[#6B655D] hover:text-[#171412]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
};

function Field({
  label,
  v,
  on,
  type = "text",
  placeholder = "",
  icon,
  className = "",
}: {
  label: string;
  v: string;
  on: (v: string) => void;
  type?: string;
  placeholder?: string;
  icon?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className="w-full">
      <label className="block text-[12px] font-black text-[#171412]/70 mb-1.5 mr-0.5 tracking-wide">
        {label}
      </label>
      <div className="relative flex items-center">
        {icon && <span className="absolute right-3 z-10">{icon}</span>}
        <input
          type={type}
          value={v}
          onChange={(e) => on(e.target.value)}
          placeholder={placeholder}
          className={`w-full ${icon ? "pr-9" : "px-3"} pl-3 py-2 text-[15px] border border-black/15 rounded-xl outline-none focus:border-[#171412] focus:ring-2 focus:ring-[#171412]/10 bg-white text-[#171412] font-bold shadow-sm transition-colors ${className}`}
        />
      </div>
    </div>
  );
}

function LedgerStat({
  label,
  value,
  tone,
  icon,
}: {
  label: string;
  value: number;
  tone: "income" | "expense" | "balance";
  icon: React.ReactNode;
}) {
  const toneMap = {
    income: { text: "text-[#1E8E5A]", chip: "bg-[#1E8E5A]/10" },
    expense: { text: "text-[#D14343]", chip: "bg-[#D14343]/10" },
    balance: { text: "text-[#2563AC]", chip: "bg-[#2563AC]/10" },
  } as const;
  const t = toneMap[tone];
  return (
    <div className="relative bg-white rounded-2xl px-5 py-4 border border-black/10 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <span className="text-[12px] font-black text-[#6B655D] tracking-wide">{label}</span>
          <div className={`text-2xl sm:text-[28px] font-black font-mono tabular-nums mt-1.5 ${t.text}`}>
            {fmt(value)}
          </div>
        </div>
        <div className={`p-3 rounded-2xl ${t.chip} ${t.text}`}>{icon}</div>
      </div>
    </div>
  );
}

export default function AccountsTab() {
  const {
    accounts,
    addAccount,
    updateAccount,
    deleteAccount,
    clearAccounts,
    hafiza = [],
  } = useStore();
  const [form, setForm] = useState<FormType>(emptyForm);
  const [editingRow, setEditingRow] = useState<any | null>(null);

  // مطابقة شاملة معتمدة على sourceHafizaId (مفتاح فريد) لمنع التكرار
  const handleSyncFromHafiza = () => {
    const source = hafiza && hafiza.length > 0 ? hafiza : useStore.getState().hafiza || [];
    if (!source || source.length === 0) {
      toast.error("لا توجد بيانات في تبويب حوافظ التوريد!");
      return;
    }

    const normalizeStr = (val: any) => String(val ?? "").trim();
    const normalizeNum = (val: any): number => {
      const num = Number(val);
      return isNaN(num) ? 0 : num;
    };
    const cleanDate = (dateStr: string) => String(dateStr ?? "").replace(/[^\d]/g, "");

    const hafiza2026 = source.filter((h: any) => cleanDate(h?.date).substring(0, 4) === "2026");

    if (hafiza2026.length === 0) {
      toast.info("لا توجد حوافظ لعام 2026.");
      return;
    }

    let addedCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;

    // فهرس ديناميكي يُحدَّث داخل الحلقة لمنع التكرار حتى لو تكرر الزر
    const currentAccounts = useStore.getState().accounts;
    const byHafizaId = new Map<string, any>();
    const byHafizaNo = new Map<string, any>();
    const linkedAccountIds = new Set<string>();

    currentAccounts.forEach((acc: any) => {
      if (acc.sourceHafizaId) {
        byHafizaId.set(normalizeStr(acc.sourceHafizaId), acc);
        linkedAccountIds.add(acc.id);
      }
    });
    // فقط الحسابات غير المرتبطة سابقاً تكون متاحة للربط برقم الحافظة (مرة واحدة)
    currentAccounts.forEach((acc: any) => {
      if (
        acc.hafizaNo &&
        !linkedAccountIds.has(acc.id) &&
        !byHafizaNo.has(normalizeStr(acc.hafizaNo))
      ) {
        byHafizaNo.set(normalizeStr(acc.hafizaNo), acc);
      }
    });

    hafiza2026.forEach((hafizaRow: any) => {
      if (!hafizaRow?.id) return;
      const hid = normalizeStr(hafizaRow.id);

      const notifyAmountValue =
        hafizaRow.notifyAmount ?? hafizaRow.supplyAmount ?? hafizaRow.tawreedAmount ?? 0;
      const incomeValue = normalizeNum(notifyAmountValue);

      const mappedData = {
        date: hafizaRow.date || today(),
        hafizaNo: normalizeStr(hafizaRow.hafizaNo),
        notifyNo: normalizeStr(hafizaRow.notifyNo),
        notifyDate: hafizaRow.notifyDate || "",
        description: normalizeStr(hafizaRow.description),
        specialty: normalizeStr(hafizaRow.specialty),
        name: normalizeStr(hafizaRow.name),
        hafizaAmount: normalizeNum(hafizaRow.hafizaAmount || hafizaRow.amount),
        income: incomeValue,
        // ملاحظة: عمود المصروفات (expense) لا يُمَسّ مطلقاً في عملية المطابقة
      };

      // 1) مطابقة بمعرف الحافظة (مفتاح فريد قوي)
      let existing = byHafizaId.get(hid);
      // 2) أو ربط حساب يدوي قديم برقم الحافظة لمرة واحدة فقط
      if (!existing && mappedData.hafizaNo) {
        existing = byHafizaNo.get(mappedData.hafizaNo);
        if (existing) byHafizaNo.delete(mappedData.hafizaNo);
      }

      if (!existing) {
        const created = addAccount({
          ...mappedData,
          checkNo: "",
          checkDate: "",
          expense: 0,
          revenueKey: undefined,
          sourceHafizaId: hafizaRow.id,
        });
        // تسجيل فوري في الفهرس لمنع التكرار داخل نفس الحلقة
        byHafizaId.set(hid, { ...created, sourceHafizaId: hafizaRow.id });
        addedCount++;
        return;
      }

      const hasDiff =
        cleanDate(existing.date) !== cleanDate(mappedData.date) ||
        normalizeStr(existing.hafizaNo) !== mappedData.hafizaNo ||
        normalizeStr(existing.notifyNo) !== mappedData.notifyNo ||
        normalizeStr(existing.notifyDate) !== mappedData.notifyDate ||
        normalizeStr(existing.description) !== mappedData.description ||
        normalizeStr(existing.specialty) !== mappedData.specialty ||
        normalizeStr(existing.name) !== mappedData.name ||
        normalizeNum(existing.hafizaAmount) !== mappedData.hafizaAmount ||
        normalizeNum(existing.income) !== mappedData.income ||
        existing.sourceHafizaId !== hafizaRow.id;

      if (hasDiff) {
        // الحفاظ التام على عمود المصروفات وأي بيانات شيك يدوية
        updateAccount(existing.id, {
          ...existing,
          ...mappedData,
          expense: Number(existing.expense) || 0,
          checkNo: existing.checkNo || "",
          checkDate: existing.checkDate || "",
          revenueKey: existing.revenueKey,
          sourceHafizaId: hafizaRow.id,
        });
        byHafizaId.set(hid, { ...existing, ...mappedData, sourceHafizaId: hafizaRow.id });
        updatedCount++;
      } else {
        skippedCount++;
      }
    });

    if (addedCount > 0 || updatedCount > 0) {
      toast.success(
        `المطابقة: إضافة ${addedCount} | تحديث ${updatedCount} | تطابق ${skippedCount}`,
      );
    } else {
      toast.info(`جميع السجلات الـ ${skippedCount} متطابقة.`);
    }
  };

  const {
    rows: filtered,
    sortKey,
    sortDir,
    toggleSort,
    filters,
    setFilter,
    clearFilters,
  } = useTableControls(
    accounts,
    COLS.map((c) => c.key),
  );

  const revenueTypes = useMemo(() => {
    const list: { key: string; label: string }[] = [];
    if (schema && schema.chapters) {
      schema.chapters.forEach((ch: any) =>
        ch.sections.forEach((sec: any) =>
          sec.items.forEach((it: any) =>
            it.types.forEach((t: any) => {
              list.push({
                key: `${ch.no}-${sec.no}-${it.no}-${t.no}`,
                label: `${ch.title} ← ${t.title}`,
              });
            }),
          ),
        ),
      );
    }
    return list;
  }, []);

  const totalIncome = useMemo(
    () => accounts.reduce((sum, a) => sum + (Number(a.income) || 0), 0),
    [accounts],
  );
  const totalExpense = useMemo(
    () => accounts.reduce((sum, a) => sum + (Number(a.expense) || 0), 0),
    [accounts],
  );
  const currentBalance = totalIncome - totalExpense;

  const filteredWithBalance = useMemo(() => {
    // هل بيان الصف يمثّل "رصيد افتتاحي"؟
    const isOpeningRow = (row: any) =>
      String(row.description ?? "").includes("رصيد افتتاحي");

    // صف الرصيد الافتتاحي ثابت (يُؤخذ من كل السجلات، لا يتأثر بالفرز/الفلترة)
    const openingRow = accounts.find(isOpeningRow);
    const base = openingRow ? Number(openingRow.income) || 0 : 0;

    // باقي الصفوف بترتيب العرض الحالي (فرز/فلترة) مع استبعاد صف الافتتاحي
    const displayedRows = filtered.filter((r) => !isOpeningRow(r));

    // نمط إكسل: رصيد الصف = رصيد الصف الذي فوقه مباشرةً + إيراد − مصروف
    let runningBalance = base;
    const rest = displayedRows.map((row) => {
      runningBalance += (Number(row.income) || 0) - (Number(row.expense) || 0);
      return { ...row, balance: runningBalance };
    });

    // صف الافتتاحي مثبّت في الأعلى ورصيده = مبلغ الإيراد نفسه (الأساس)
    const pinned = openingRow ? [{ ...openingRow, balance: base }] : [];
    return [...pinned, ...rest];
  }, [filtered, accounts]);

  const [accountReportMode, setAccountReportMode] = useState<"quarter" | "halfYear" | "year">("quarter");
  const [accountReportYear, setAccountReportYear] = useState(new Date().getFullYear());
  const [accountReportPeriod, setAccountReportPeriod] = useState(1);

  const accountReportStartMonth =
    accountReportMode === "quarter"
      ? (accountReportPeriod - 1) * 3 + 1
      : accountReportMode === "halfYear"
        ? (accountReportPeriod - 1) * 6 + 1
        : 1;
  const accountReportEndMonth =
    accountReportMode === "quarter"
      ? accountReportPeriod * 3
      : accountReportMode === "halfYear"
        ? accountReportPeriod * 6
        : 12;
  const accountReportLabel =
    accountReportMode === "quarter"
      ? `الربع ${["الأول", "الثاني", "الثالث", "الرابع"][accountReportPeriod - 1]} ${accountReportYear}م`
      : accountReportMode === "halfYear"
        ? `النصف ${["الأول", "الثاني"][accountReportPeriod - 1]} ${accountReportYear}م`
        : `السنة المالية ${accountReportYear}م`;

  const accountReportRows = useMemo(() => {
    const isOpeningRow = (row: any) => String(row.description ?? "").includes("رصيد افتتاحي");
    const openingRow = accounts.find(isOpeningRow);
    let openingBalance = openingRow ? Number(openingRow.income) || 0 : 0;
    const periodRows: any[] = [];

    accounts.forEach((row: any) => {
      if (isOpeningRow(row)) return;
      const date = new Date(row.date);
      if (isNaN(date.getTime()) || date.getFullYear() !== accountReportYear) return;
      const rowMonth = date.getMonth() + 1;
      const movement = (Number(row.income) || 0) - (Number(row.expense) || 0);
      if (rowMonth < accountReportStartMonth) openingBalance += movement;
      if (rowMonth >= accountReportStartMonth && rowMonth <= accountReportEndMonth) {
        periodRows.push(row);
      }
    });

    periodRows.sort((a, b) => String(a.date || "").localeCompare(String(b.date || "")));
    let runningBalance = openingBalance;
    const rows = periodRows.map((row) => {
      runningBalance += (Number(row.income) || 0) - (Number(row.expense) || 0);
      return { ...row, balance: runningBalance };
    });
    const openingReportRow = {
      id: `period-opening-${accountReportYear}-${accountReportStartMonth}`,
      date: `${accountReportYear}-${String(accountReportStartMonth).padStart(2, "0")}-01`,
      hafizaNo: "",
      notifyNo: "",
      notifyDate: "",
      checkNo: "",
      checkDate: "",
      description: "رصيد افتتاحي للفترة",
      specialty: "",
      name: "",
      hafizaAmount: 0,
      income: 0,
      expense: 0,
      revenueKey: "",
      balance: openingBalance,
    };
    return [openingReportRow, ...rows];
  }, [accounts, accountReportYear, accountReportStartMonth, accountReportEndMonth]);

  const submit = () => {
    if (!form.description && !form.name) {
      toast.error("يرجى إدخال الاسم أو البيان على الأقل");
      return;
    }
    addAccount({
      date: form.date,
      hafizaNo: form.hafizaNo,
      notifyNo: form.notifyNo,
      notifyDate: form.notifyDate,
      checkNo: form.checkNo,
      checkDate: form.checkDate,
      description: form.description,
      specialty: form.specialty,
      name: form.name,
      hafizaAmount: Number(form.hafizaAmount) || 0,
      income: Number(form.income) || 0,
      expense: Number(form.expense) || 0,
      revenueKey: form.revenueKey || undefined,
    });
    toast.success("تم حفظ القيد يدوياً");
    setForm(emptyForm);
  };

  const handleEditSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRow) return;
    updateAccount(editingRow.id, {
      ...editingRow,
      hafizaAmount: Number(editingRow.hafizaAmount) || 0,
      income: Number(editingRow.income) || 0,
      expense: Number(editingRow.expense) || 0,
    });
    toast.success("تم تعديل السجل بنجاح");
    setEditingRow(null);
  };

  const handleImportExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json(worksheet, { raw: false, defval: "" });
        if (json.length === 0) throw new Error("الملف فارغ");

        const importedAccounts = json
          .map((row: any) => {
            const cleanRow: any = {};
            for (const key in row) {
              cleanRow[key.trim()] = row[key];
            }
            return cleanRow;
          })
          .filter((row: any) => row["الاسم"] || row["البيان"] || row["name"] || row["description"])
          .map((row: any) => ({
            date: row["التاريخ"] || row["date"] || today(),
            hafizaNo: String(row["رقم الحافظة"] || row["hafizaNo"] || ""),
            notifyNo: String(row["رقم الإشعار"] || row["رقم الاشعار"] || row["notifyNo"] || ""),
            notifyDate: row["تاريخ التوريد"] || row["notifyDate"] || "",
            checkNo: String(row["رقم الشيك"] || row["checkNo"] || ""),
            checkDate: row["تاريخ الشيك"] || row["checkDate"] || "",
            description: row["البيان"] || row["description"] || "",
            specialty: row["التخصص"] || row["specialty"] || "",
            name: row["الاسم"] || row["name"] || "",
            hafizaAmount: parseAmount(row["مبلغ الحافظة"] || row["hafizaAmount"]),
            income: parseAmount(row["الإيرادات"] || row["الايرادات"] || row["income"]),
            expense: parseAmount(
              row["المصروفات"] ||
                row["المصروف"] ||
                row["مصروفات"] ||
                row["مصروف"] ||
                row["expense"] ||
                row["expenses"],
            ),
            revenueKey: String(row["رمز الإيراد"] || row["revenueKey"] || ""),
          }));

        useStore.getState().importData({ accounts: importedAccounts });
        toast.success(`تم استيراد ${importedAccounts.length} سجل مالي بنجاح`);
      } catch (err) {
        toast.error("فشل استيراد ملف الإكسل");
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = "";
  };

  return (
    <div
      className="accounts-print-scope w-full space-y-6 bg-[#F2EFEA] p-4 sm:p-6 rounded-2xl"
      dir="rtl"
    >
      <style>{PRINT_STYLES}</style>

      {/* ===== شريط العنوان ===== */}
      <div className="accounts-print-hide flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-[#171412] tracking-tight">
            الحساب الجاري
          </h1>
          <p className="text-[12px] text-[#6B655D] font-bold tracking-wide mt-0.5">
            سجل الحركات المالية المُرحّلة
          </p>
        </div>
        <div className="hidden sm:flex items-center gap-2 px-3.5 py-2 bg-white rounded-xl border border-black/10 shadow-sm">
          <Landmark className="w-4 h-4 text-[#8B5CF6]" />
          <span className="text-[12px] text-[#6B655D] font-bold">عدد القيود</span>
          <span className="text-[#171412] font-mono text-base tabular-nums font-black">{accounts.length}</span>
        </div>
      </div>

      {/* ===== بطاقات الإجماليات ===== */}
      <div className="accounts-print-hide grid grid-cols-1 md:grid-cols-3 gap-4">
        <LedgerStat label="إجمالي الإيرادات" value={totalIncome} tone="income" icon={<ArrowUpRight className="w-6 h-6" />} />
        <LedgerStat label="إجمالي المصروفات" value={totalExpense} tone="expense" icon={<ArrowDownLeft className="w-6 h-6" />} />
        <LedgerStat label="الرصيد الحالي المتوفر" value={currentBalance} tone="balance" icon={<Wallet className="w-6 h-6" />} />
      </div>

      {/* ===== التقارير الدورية ===== */}
      <div className="accounts-print-hide w-full bg-white rounded-2xl overflow-hidden border border-black/10 shadow-sm">
        <div className="bg-[#FAF9F6] px-5 py-4 flex flex-wrap justify-between items-center gap-4 border-b border-black/10">
          <div>
            <h2 className="text-sm sm:text-base font-black text-[#171412] tracking-wide">تقارير الحساب الدورية</h2>
            <p className="text-[11px] text-[#6B655D] font-bold mt-1">اختر الربع أو النصف أو السنة ثم صدّر التقرير</p>
          </div>
          <div className="flex flex-wrap items-end gap-2">
            <label className="text-[11px] font-black text-[#6B655D]">
              نوع التقرير
              <select
                value={accountReportMode}
                onChange={(e) => {
                  const nextMode = e.target.value as "quarter" | "halfYear" | "year";
                  setAccountReportMode(nextMode);
                  setAccountReportPeriod(1);
                }}
                className="block mt-1 px-3 py-2 border border-black/15 rounded-xl bg-white text-[#171412] text-xs font-bold outline-none focus:border-[#2563AC]"
              >
                <option value="quarter">ربع سنوي</option>
                <option value="halfYear">نصف سنوي</option>
                <option value="year">سنوي</option>
              </select>
            </label>
            {accountReportMode !== "year" && (
              <label className="text-[11px] font-black text-[#6B655D]">
                الفترة
                <select
                  value={accountReportPeriod}
                  onChange={(e) => setAccountReportPeriod(Number(e.target.value))}
                  className="block mt-1 px-3 py-2 border border-black/15 rounded-xl bg-white text-[#171412] text-xs font-bold outline-none focus:border-[#2563AC]"
                >
                  {accountReportMode === "quarter" ? (
                    <>
                      <option value={1}>الربع الأول</option>
                      <option value={2}>الربع الثاني</option>
                      <option value={3}>الربع الثالث</option>
                      <option value={4}>الربع الرابع</option>
                    </>
                  ) : (
                    <>
                      <option value={1}>النصف الأول</option>
                      <option value={2}>النصف الثاني</option>
                    </>
                  )}
                </select>
              </label>
            )}
            <label className="text-[11px] font-black text-[#6B655D]">
              السنة
              <input
                type="number"
                value={accountReportYear}
                onChange={(e) => setAccountReportYear(Number(e.target.value) || accountReportYear)}
                className="block mt-1 w-24 px-3 py-2 border border-black/15 rounded-xl bg-white text-[#171412] text-xs font-bold font-mono text-center outline-none focus:border-[#2563AC]"
              />
            </label>
            <div className="text-xs font-black text-[#2563AC] px-2 py-2">{accountReportLabel}</div>
            <TabActions
              title={`تقرير الحساب الجاري - ${accountReportLabel}`}
              rows={accountReportRows}
              columns={COLS.filter((c) => c.key !== "revenueKey")}
              fileName={`الحساب-الجاري-${accountReportYear}`}
              numericKeys={["hafizaAmount", "income", "expense", "balance"]}
            />
          </div>
        </div>
      </div>

      {/* ===== لوحة القيد اليدوي والمطابقة ===== */}
      <div className="accounts-print-hide w-full bg-white rounded-2xl overflow-hidden border border-black/10 shadow-sm">
        <div className="bg-[#FAF9F6] px-5 py-4 flex flex-wrap justify-between items-center gap-4 border-b border-black/10">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-[#2563AC]/10 rounded-lg text-[#2563AC]">
              <Plus className="w-4 h-4" />
            </div>
            <h2 className="text-sm sm:text-base font-black text-[#171412] tracking-wide">
              قيد جديد أو ترحيل مطابق من الحوافظ
            </h2>
          </div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              onClick={handleSyncFromHafiza}
              className="flex items-center gap-2 px-4 py-2 bg-[#D97706] text-white rounded-full text-xs font-black hover:bg-[#B8620A] transition-colors active:scale-95 shadow-sm"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>مطابقة شاملة ٢٠٢٦</span>
            </button>
            <label className="flex items-center gap-1.5 px-3.5 py-2 border border-black/15 text-[#171412] rounded-full text-xs font-bold cursor-pointer hover:bg-black/5 transition-colors">
              <FileSpreadsheet className="w-3.5 h-3.5 text-[#1E8E5A]" /> <span>استيراد إكسل</span>
              <input
                type="file"
                accept=".xlsx, .xls, .csv"
                onChange={handleImportExcel}
                className="hidden"
              />
            </label>
          </div>
        </div>

        <div className="p-5">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6 gap-3 items-end">
            <Field
              label="التاريخ"
              type="date"
              icon={<Calendar className="w-4 h-4 text-[#2563AC]" />}
              v={form.date}
              on={(v) => setForm({ ...form, date: v })}
            />
            <Field
              label="رقم الحافظة"
              icon={<Hash className="w-4 h-4 text-[#8B5CF6]" />}
              v={form.hafizaNo}
              on={(v) => setForm({ ...form, hafizaNo: v })}
            />
            <Field
              label="رقم الإشعار"
              icon={<Hash className="w-4 h-4 text-[#D97706]" />}
              v={form.notifyNo}
              on={(v) => setForm({ ...form, notifyNo: v })}
            />
            <Field
              label="تاريخ التوريد"
              type="date"
              icon={<Calendar className="w-4 h-4 text-[#0EA5A5]" />}
              v={form.notifyDate}
              on={(v) => setForm({ ...form, notifyDate: v })}
            />
            <Field
              label="رقم الشيك"
              icon={<Ticket className="w-4 h-4 text-[#DB2777]" />}
              v={form.checkNo}
              on={(v) => setForm({ ...form, checkNo: v })}
            />
            <Field
              label="تاريخ الشيك"
              type="date"
              icon={<Calendar className="w-4 h-4 text-[#65A30D]" />}
              v={form.checkDate}
              on={(v) => setForm({ ...form, checkDate: v })}
            />

            <div className="relative">
              <label className="block text-[12px] font-black text-[#171412]/70 mb-1.5 mr-0.5 tracking-wide">
                البيان والشرح
              </label>
              <div className="relative flex items-center">
                <span className="absolute right-3 z-10">
                  <FileText className="w-4 h-4 text-[#DC2626]" />
                </span>
                <input
                  list="account-descriptions"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="اكتب أو اختر البيان..."
                  className="w-full pr-9 pl-3 py-2 text-[15px] border border-black/15 rounded-xl outline-none focus:border-[#171412] focus:ring-2 focus:ring-[#171412]/10 bg-white text-[#171412] font-bold"
                />
              </div>
              <datalist id="account-descriptions">
                {Array.from(
                  new Set([...DESCRIPTIONS, ...accounts.map((a) => a.description).filter(Boolean)]),
                ).map((d) => (
                  <option key={d} value={d} />
                ))}
              </datalist>
            </div>

            <Field
              label="التخصص الطبي"
              icon={<Stethoscope className="w-4 h-4 text-[#0891B2]" />}
              v={form.specialty}
              on={(v) => setForm({ ...form, specialty: v })}
            />
            <Field
              label="الاسم الكامل"
              icon={<User className="w-4 h-4 text-[#7C3AED]" />}
              v={form.name}
              on={(v) => setForm({ ...form, name: v })}
              placeholder="اسم المتدرب..."
            />
            <Field
              label="مبلغ الحافظة"
              type="number"
              icon={<span className="text-xs text-[#475569] font-black">ر.ي</span>}
              v={form.hafizaAmount}
              on={(v) => setForm({ ...form, hafizaAmount: v })}
              className="font-mono tabular-nums"
            />
            <Field
              label="الإيرادات"
              type="number"
              icon={<span className="text-xs text-[#1E8E5A] font-black">ر.ي</span>}
              v={form.income}
              on={(v) => setForm({ ...form, income: v })}
              placeholder="0.00"
              className="text-[#1E8E5A] font-black font-mono tabular-nums focus:border-[#1E8E5A]"
            />
            <Field
              label="المصروفات"
              type="number"
              icon={<span className="text-xs text-[#D14343] font-black">ر.ي</span>}
              v={form.expense}
              on={(v) => setForm({ ...form, expense: v })}
              placeholder="0.00"
              className="text-[#D14343] font-black font-mono tabular-nums focus:border-[#D14343]"
            />

            <div className="sm:col-span-2">
              <label className="flex items-center gap-1.5 text-[12px] font-black text-[#2563AC] mb-1.5 mr-0.5 tracking-wide">
                <Link className="w-3.5 h-3.5" /> ربط بدليل هيكل الإيرادات
              </label>
              <select
                value={form.revenueKey}
                onChange={(e) => setForm({ ...form, revenueKey: e.target.value })}
                className="w-full px-3 py-2 text-[15px] border border-[#2563AC]/25 rounded-xl outline-none bg-[#2563AC]/5 text-[#171412] font-bold focus:border-[#2563AC]"
              >
                <option value="">-- بدون ربط --</option>
                {revenueTypes.map((t) => (
                  <option key={t.key} value={t.key}>
                    {t.key} | {t.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-2 flex gap-2 pt-2">
              <button
                onClick={submit}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-[#171412] text-white rounded-xl font-black hover:bg-[#2A2521] text-xs shadow-sm active:scale-95 transition-transform"
              >
                <Save className="w-4 h-4 text-[#4ADE80]" /> ترحيل القيد
              </button>
              <button
                onClick={() => setForm(emptyForm)}
                className="flex items-center justify-center gap-2 px-3 py-2.5 border border-black/15 text-[#171412] bg-white rounded-xl font-bold text-xs active:scale-95 transition-transform hover:bg-black/5"
              >
                <Eraser className="w-4 h-4 text-[#D14343]" /> مسح
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ===== جدول القيود ===== */}
      <div className="accounts-print-area w-full bg-white rounded-2xl overflow-hidden border border-black/10 shadow-sm">
        <div className="accounts-print-hide bg-[#FAF9F6] px-5 py-3.5 flex flex-wrap justify-between items-center gap-3 border-b border-black/10">
          <div className="flex items-center gap-2.5">
            <div className="w-2 h-2 rounded-full bg-[#1E8E5A] animate-pulse"></div>
            <h2 className="text-xs sm:text-sm font-black text-[#171412] tracking-wide">
              سجل حركات الحساب الجاري ({accounts.length})
            </h2>
          </div>
          <div className="flex gap-2 flex-wrap">
            {Object.values(filters).some(Boolean) && (
              <button
                onClick={clearFilters}
                className="px-3 py-1.5 bg-black/5 hover:bg-black/10 text-[#171412] rounded-full text-xs font-bold transition-colors"
              >
                مسح مرشحات التصفية
              </button>
            )}
            <TabActions
              title="كشف الحساب الجاري"
              rows={filteredWithBalance}
              columns={COLS.filter((c) => c.key !== "revenueKey")}
              fileName="الحساب-الجاري"
              numericKeys={["hafizaAmount", "income", "expense", "balance"]}
              onClear={clearAccounts}
            />
          </div>
        </div>

        <div className="p-3">
          <div className="overflow-x-auto overflow-y-auto max-h-[550px] relative rounded-xl">
            <table className="w-full text-[15px] text-right border-collapse border-2 border-black table-auto">
              <thead className="sticky top-0 z-20 text-[#171412] font-black text-[13px] bg-[#E7E2D8]">
                <tr>
                  <th className="p-2 border border-black text-center w-10 bg-[#E7E2D8] sticky top-0 z-20">
                    م
                  </th>
                  {COLS.map((c) => (
                    <th
                      key={c.key}
                      className="p-2 border border-black min-w-[80px] cursor-pointer hover:bg-[#DCD5C6] transition-colors select-none sticky top-0 z-20 bg-[#E7E2D8]"
                      onClick={() => toggleSort(c.key)}
                    >
                      <div className="flex items-center justify-center gap-1.5">
                        <span>{c.label}</span>
                        <span className="text-[10px] text-[#2563AC] font-mono">
                          {sortIndicator(sortKey === c.key, sortDir)}
                        </span>
                      </div>
                    </th>
                  ))}
                  <th className="p-2 border border-black text-center bg-[#E7E2D8] sticky top-0 z-20 min-w-[60px]">
                    إجراءات
                  </th>
                </tr>
                <tr className="accounts-print-hide bg-[#F2EFEA]">
                  <th className="p-1 border border-black bg-[#F2EFEA]"></th>
                  {COLS.map((c) => (
                    <th key={c.key} className="p-1 border border-black bg-[#F2EFEA]">
                      <input
                        value={filters[c.key] || ""}
                        onChange={(e) => setFilter(c.key, e.target.value)}
                        placeholder="تصفية..."
                        className="w-full px-1.5 py-1 text-[12px] border border-black/15 rounded bg-white text-[#171412] outline-none focus:border-[#171412] font-bold transition-colors"
                      />
                    </th>
                  ))}
                  <th className="p-1 border border-black bg-[#F2EFEA]"></th>
                </tr>
              </thead>

              <tbody className="text-[#171412] font-bold">
                {filteredWithBalance.length === 0 ? (
                  <tr>
                    <td
                      colSpan={COLS.length + 2}
                      className="p-12 text-center text-[#6B655D] font-black border border-black bg-white"
                    >
                      لا توجد بيانات تطابق مرشحات البحث.
                    </td>
                  </tr>
                ) : (
                  filteredWithBalance.map((acc, index) => (
                    <tr key={acc.id} className="odd:bg-white even:bg-[#FAF9F6] hover:bg-[#F0EBDE] transition-colors group">
                      <td className="p-2 border border-black text-center font-mono tabular-nums text-[#6B655D]">
                        {index + 1}
                      </td>
                      <td className="p-2 border border-black font-mono tabular-nums min-w-[85px] text-center">
                        {acc.date}
                      </td>
                      <td className="p-2 border border-black font-mono tabular-nums font-black text-center">
                        {acc.hafizaNo || "—"}
                      </td>
                      <td className="p-2 border border-black font-mono tabular-nums text-center">
                        {acc.notifyNo || "—"}
                      </td>
                      <td className="p-2 border border-black font-mono tabular-nums min-w-[85px] text-center">
                        {acc.notifyDate || "—"}
                      </td>
                      <td className="p-2 border border-black font-mono tabular-nums text-center">
                        {acc.checkNo || "—"}
                      </td>
                      <td className="p-2 border border-black font-mono tabular-nums min-w-[85px] text-center">
                        {acc.checkDate || "—"}
                      </td>
                      <td className="p-2 border border-black min-w-[140px] text-[#171412]">
                        {acc.description || "—"}
                      </td>
                      <td className="p-2 border border-black min-w-[100px]">
                        {acc.specialty || "—"}
                      </td>
                      <td className="p-2 border border-black font-black min-w-[120px] text-[#171412]">
                        {acc.name || "—"}
                      </td>
                      <td className="p-2 border border-black font-mono tabular-nums text-center">
                        {Number(acc.hafizaAmount) > 0 ? fmt(Number(acc.hafizaAmount)) : "—"}
                      </td>
                      <td className="p-2 border border-black font-mono tabular-nums font-black text-[#1E8E5A] text-center bg-[#1E8E5A]/[0.06]">
                        {Number(acc.income) > 0 ? fmt(Number(acc.income)) : "—"}
                      </td>
                      <td className="p-2 border border-black font-mono tabular-nums font-black text-[#D14343] text-center bg-[#D14343]/[0.06]">
                        {Number(acc.expense) > 0 ? fmt(Number(acc.expense)) : "—"}
                      </td>

                      <td className="accounts-print-hide p-1 border border-black text-center min-w-[110px]">
                        <select
                          value={acc.revenueKey || ""}
                          onChange={(e) => {
                            const newKey = e.target.value;
                            updateAccount(acc.id, { ...acc, revenueKey: newKey || undefined });
                            toast.success("تم ربط رمز الإيراد بنجاح");
                          }}
                          className="w-full p-1 text-[11px] font-black text-[#7C3AED] bg-[#7C3AED]/5 border border-[#7C3AED]/25 rounded outline-none focus:border-[#7C3AED] cursor-pointer"
                        >
                          <option value="">— ربط الرمز —</option>
                          {revenueTypes.map((t) => (
                            <option key={t.key} value={t.key}>
                              {t.key}
                            </option>
                          ))}
                        </select>
                      </td>

                      <td className="p-2 border border-black font-mono tabular-nums font-black text-[#2563AC] text-center bg-[#2563AC]/[0.06]">
                        {fmt(acc.balance)}
                      </td>
                      <td className="accounts-print-hide p-2 border border-black text-center">
                        <div className="flex justify-center gap-1.5">
                          <button
                            onClick={() => setEditingRow(acc)}
                            className="p-1 text-[#1E8E5A] hover:bg-[#1E8E5A]/10 rounded transition-colors"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm("هل أنت متأكد من الحذف؟")) deleteAccount(acc.id);
                            }}
                            className="p-1 text-[#D14343] hover:bg-[#D14343]/10 rounded transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              {filteredWithBalance.length > 0 && (
                <tfoot>
                  <tr className="bg-[#E7E2D8]">
                    <td colSpan={10} className="p-2.5 border border-black text-left font-black text-[#171412] text-sm">
                      رصيد الإقفال
                    </td>
                    <td className="p-2.5 border border-black font-mono tabular-nums font-black text-[#1E8E5A] text-center">
                      {fmt(totalIncome)}
                    </td>
                    <td className="p-2.5 border border-black font-mono tabular-nums font-black text-[#D14343] text-center">
                      {fmt(totalExpense)}
                    </td>
                    <td className="border border-black"></td>
                    <td className="p-2.5 border border-black font-mono tabular-nums font-black text-[#2563AC] text-center bg-[#2563AC]/10">
                      {fmt(currentBalance)}
                    </td>
                    <td className="accounts-print-hide border border-black"></td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      </div>

      {/* مودال التعديل */}
      <Modal
        title="تعديل وتدقيق السجل المالي"
        isOpen={!!editingRow}
        onClose={() => setEditingRow(null)}
      >
        {editingRow && (
          <form onSubmit={handleEditSave} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[12px] font-black text-[#171412]/70 mb-1 tracking-wide">التاريخ</label>
                <input
                  type="date"
                  value={editingRow.date}
                  onChange={(e) => setEditingRow({ ...editingRow, date: e.target.value })}
                  className="w-full p-2 text-[15px] border border-black/15 rounded-xl outline-none bg-white text-[#171412] font-bold focus:border-[#171412]"
                  required
                />
              </div>
              <div>
                <label className="block text-[12px] font-black text-[#171412]/70 mb-1 tracking-wide">رقم الحافظة</label>
                <input
                  value={editingRow.hafizaNo}
                  onChange={(e) => setEditingRow({ ...editingRow, hafizaNo: e.target.value })}
                  className="w-full p-2 text-[15px] border border-black/15 rounded-xl outline-none bg-white text-[#171412] font-bold focus:border-[#171412]"
                />
              </div>
              <div>
                <label className="block text-[12px] font-black text-[#171412]/70 mb-1 tracking-wide">رقم الإشعار</label>
                <input
                  value={editingRow.notifyNo}
                  onChange={(e) => setEditingRow({ ...editingRow, notifyNo: e.target.value })}
                  className="w-full p-2 text-[15px] border border-black/15 rounded-xl outline-none bg-white text-[#171412] font-bold focus:border-[#171412]"
                />
              </div>
              <div>
                <label className="block text-[12px] font-black text-[#171412]/70 mb-1 tracking-wide">تاريخ التوريد</label>
                <input
                  type="date"
                  value={editingRow.notifyDate}
                  onChange={(e) => setEditingRow({ ...editingRow, notifyDate: e.target.value })}
                  className="w-full p-2 text-[15px] border border-black/15 rounded-xl outline-none bg-white text-[#171412] font-bold focus:border-[#171412]"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-[12px] font-black text-[#171412]/70 mb-1 tracking-wide">البيان والشرح</label>
                <input
                  value={editingRow.description}
                  onChange={(e) => setEditingRow({ ...editingRow, description: e.target.value })}
                  className="w-full p-2 text-[15px] border border-black/15 rounded-xl outline-none bg-white text-[#171412] font-bold focus:border-[#171412]"
                />
              </div>
              <div>
                <label className="block text-[12px] font-black text-[#171412]/70 mb-1 tracking-wide">الاسم</label>
                <input
                  value={editingRow.name}
                  onChange={(e) => setEditingRow({ ...editingRow, name: e.target.value })}
                  className="w-full p-2 text-[15px] border border-black/15 rounded-xl outline-none bg-white text-[#171412] font-bold focus:border-[#171412]"
                />
              </div>
              <div>
                <label className="block text-[12px] font-black text-[#171412]/70 mb-1 tracking-wide">مبلغ الحافظة</label>
                <input
                  type="number"
                  value={editingRow.hafizaAmount}
                  onChange={(e) => setEditingRow({ ...editingRow, hafizaAmount: e.target.value })}
                  className="w-full p-2 text-[15px] border border-black/15 rounded-xl outline-none bg-white text-[#171412] font-bold focus:border-[#171412] font-mono tabular-nums"
                />
              </div>
              <div>
                <label className="block text-[12px] font-black text-[#1E8E5A] mb-1 tracking-wide">الإيرادات</label>
                <input
                  type="number"
                  value={editingRow.income}
                  onChange={(e) => setEditingRow({ ...editingRow, income: e.target.value })}
                  className="w-full p-2 text-[15px] border border-[#1E8E5A]/30 rounded-xl bg-[#1E8E5A]/5 text-[#1E8E5A] font-black outline-none focus:border-[#1E8E5A] font-mono tabular-nums"
                />
              </div>
              <div>
                <label className="block text-[12px] font-black text-[#D14343] mb-1 tracking-wide">المصروفات</label>
                <input
                  type="number"
                  value={editingRow.expense}
                  onChange={(e) => setEditingRow({ ...editingRow, expense: e.target.value })}
                  className="w-full p-2 text-[15px] border border-[#D14343]/30 rounded-xl bg-[#D14343]/5 text-[#D14343] font-black outline-none focus:border-[#D14343] font-mono tabular-nums"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t border-black/10">
              <button
                type="button"
                onClick={() => setEditingRow(null)}
                className="px-4 py-2 bg-black/5 text-[#171412] rounded-xl font-bold text-xs sm:text-sm hover:bg-black/10"
              >
                إلغاء
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-[#171412] text-white rounded-xl font-black text-xs sm:text-sm hover:bg-[#2A2521]"
              >
                حفظ التعديلات
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
