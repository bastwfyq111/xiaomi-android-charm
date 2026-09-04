import React, { useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import { fmt, today } from "@/lib/format";
import { DESCRIPTIONS } from "@/lib/accounts";
import { toast } from "sonner";
import { importExcelInWorker } from "@/lib/excelImportWorkerClient";
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
import WebActionMenu, { type WebActionItem } from "./WebActionMenu";
import schema from "@/data/revenueTemplate.json";

/* ============================================================
   الحساب الجاري — لوحة ألوان مخصصة وحجم عناصر مناسب للهواتف
   ============================================================ */

/* لوحة الألوان المرسلة */
const THEME = {
  sage: "#CDD5AE",
  paleSage: "#E9EDCA",
  cream: "#FEF9E1",
  warmCream: "#FAEDCD",
  accent: "#D3A373", // بارز/أزرار أساسية
  text: "#171412",
  muted: "#6B655D",
  Camel: "#D3A373",
  LightBrown: "#C89B6E",
  Lavender: "#E9EDCA",
};

/* أحجام أيقونات وأزرار محسّنة للمحمول */
const ICON_MOBILE = "w-5 h-5 sm:w-6 sm:h-6";
const BTN_MOBILE = "px-3 py-2 sm:px-4 sm:py-2.5 text-sm sm:text-sm";
const HEADING_MOBILE = "text-lg sm:text-2xl font-black";

/* أعمدة الجدول */
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
  .accounts-print-scope { background:#B4CEB6 !important; }
  .accounts-print-area, .accounts-print-area * { visibility: visible !important; }
  .accounts-print-hide { display: none !important;
background:"#5C1D24", 
bolder:1px solid black; 
   
  }
  .accounts-print-area table {
    border-collapse: collapse !important;
    width: 100٪ !important;
    min-width:auto !important;
    table-layout:auto!important;
  }
  .accounts-print-area thead th {
    color: white !important;
    font-weight: 1000 !important;
  }
  .accounts-print-area tbody td,
  .accounts-print-area tfoot td {
    color: #000 !important;
    font-weight: 800 !important;
  }
  .accounts-print-area th,
  .accounts-print-area td {
    border: 1px solid #000 !important;
    white-space: nowrap!important;
    text-overflow: clip !important;
    overflow-wrap: anywhere !important;
    word-break: break-word !important;
    hyphens: auto !important;
    line-height: 1.1 !important;
    padding: 0 !important;
    line-height: 1.1 !important;
    font-size: 16px !important;
    height: auto !important;
    max-width: none !important;
    color: #000 !important;
  }
  .accounts-print-area td.numeric-cell,
  .accounts-print-area th.numeric-cell,
  .accounts-print-area td.date-cell,
  .accounts-print-area th.date-cell,
  .accounts-print-area td.font-mono,
  .accounts-print-area th.font-mono {
    font-family: 'Times New Roman', Times, serif !important;
    font-size: 16px !important;
    line-height: 1.05 !important;
    white-space: nowrap !important;
    overflow-wrap: normal !important;
    word-break: keep-all !important;
    hyphens: none !important;
  }
  .accounts-print-area td.numeric-cell *,
  .accounts-print-area th.numeric-cell *,
  .accounts-print-area td.date-cell *,
  .accounts-print-area th.date-cell *,
  .accounts-print-area td.font-mono *,
  .accounts-print-area th.font-mono * {
    font-size: inherit !important;
    line-height: inherit !important;
    white-space: nowrap !important;
    overflow-wrap: normal !important;
    word-break: keep-all !important;
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
      className="fixed inset-0  backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-2 sm:p-4"
      dir="rtl"
    >
      <div
        className="rounded-t-2xl sm:rounded-2xl w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-y-auto border border-1-black"
  
      >
        <div className="flex justify-between items-center px-5 py-4 border-b black top-0 z-10" style={{ borderColor: "#000", background: THEME.LightBrown }}>
          <h3 className={`${HEADING_MOBILE} text-[#171412] flex items-center gap-2 tracking-tight`}>{title}</h3>
<button
 onClick={onClose}
 className="p-2 hover:bg-blue rounded-xl transition-colors text-[#6B655D] hover:text-[#171412]"
aria-label="إغلاق"
          >
            <X className={ICON_MOBILE} />
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
      <label className="block text-sm font-black text-[#171412]/70 mb-1.5 mr-0.5 tracking-wide">
        {label}
      </label>
      <div className="relative flex items-center">
        {icon && <span className="absolute right-3 z-10">{icon}</span>}
        <input
          type={type}
          value={v}
          onChange={(e) => on(e.target.value)}
          placeholder={placeholder}
          className={`w-full ${icon ? "pr-9" : "px-3"} pl-3 py-2 text-[15px] border rounded-xl outline-none focus:border-[#171412] focus:ring-2 focus:ring-[#171412]/10 bg-white text-[#171412] ${className}`}
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
    income: { text: "text-[#1E8E5A]", chipBg: THEME.paleSage },
    expense: { text: "text-[#D14343]", chipBg: "#FFEDEE" },
    balance: { text: "text-[#2563AC]", chipBg: THEME.warmCream },
  } as const;
  const t = toneMap[tone];
  return (
    <div
      className="relative rounded-2xl px-2 py-2 sm:px-4 sm:py-3 border shadow-sm"
      style={{ background: THEME.cream, borderColor: "rgba(0,0,0,0.08)" }}
    >
      <div className="flex items-center justify-between">
        <div>
          <span className="text-xs sm:text-sm font-black text-[#6B655D] tracking-wide">{label}</span>
          <div className={`text-base sm:text-2xl font-black font-mono tabular-nums numeric-cell mt-0.5 sm:mt-1.5 ${t.text}`}>
            {fmt(value)}
          </div>
        </div>
        <div
          className="p-2 rounded-xl flex items-center justify-center"
          style={{ background: t.chipBg }}
        >
          {React.isValidElement(icon) ? React.cloneElement(icon as any, { className: ICON_MOBILE }) : icon}
        </div>
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

  const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    try {
      const data = await importExcelInWorker(file, "account");
      const importedAccounts = data.accounts;
      if (importedAccounts.length === 0) throw new Error("الملف فارغ");
      useStore.getState().importData({ accounts: importedAccounts });
      toast.success(`تم استيراد ${importedAccounts.length} سجل مالي بنجاح`);
    } catch (error) {
      console.error("[Excel] Account import failed", error);
      toast.error("فشل استيراد ملف الإكسل");
    }
  };

  const accountEntryWebActions: WebActionItem[] = [
    {
      label: "مطابقة شاملة ٢٠٢٦",
      icon: Zap,
      onSelect: handleSyncFromHafiza,
    },
    {
      label: "استيراد Excel",
      icon: FileSpreadsheet,
      onSelect: () => undefined,
      content: (
        <label className="flex w-full cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-xl font-bold text-black hover:bg-sky border border-1-black">
          <FileSpreadsheet className={ICON_MOBILE} />
          <span>استيراد Excel</span>
          <input
            type="file"
            accept=".xlsx, .xls, .csv"
            onChange={handleImportExcel}
            className="hidden"
          />
        </label>
      ),
    },
  ];

  return (
    <div
      className="accounts-print-scope w-full space-y-6 p-1.5 sm:p-4 rounded-2xl"
      dir="rtl"
      style={{ background: THEME.Lavender }}
    >
      <style>{PRINT_STYLES}</style>
 {/*شريط العنوان */}
      <div className="accounts-print-hide flex items-center justify-between">
        <div>
<h1 className={`${HEADING_MOBILE} text-white tracking-tight`}>الحساب الجاري</h1>
<p className="text-xm text-[#6B655D font-bold tracking-wide mt-0.5"> سجل الحركات المالية
المُرحّلة
 </p>
     </div>
 
 <div className="hidden sm:flex items-center gap-2 px-3.5 py-2 rounded-xl bg-#3F6978">

<Landmark className={ICON_MOBILE} 
style={{ color: "#8B5CF6"}} />
  <span className="text-sm text-[#6B655D] font-bold">عدد القيود</span>
  <span className="text-[#171412] font-mono text-base tabular-nums font-black">{accounts.length}</span>
        </div>
      </div>

      {/* ===== بطاقات الإجماليات ===== */}
<div className="accounts-print-hide grid grid-cols-3 gap-2">

<LedgerStat label="إجمالي الإيرادات" 
style={{ background:THEME.Camel, borderColor: "#000"}} 
value={totalIncome} tone="income" icon={<ArrowUpRight />} />
        
<LedgerStat label="إجمالي المصروفات" 
style={{ background:THEME.LightBrown, borderColor: "#000"}} 
value={totalExpense} tone="expense" icon={<ArrowDownLeft />} />

  <LedgerStat label="الرصيد الحالي المتوفر"
 style={{ background:THEME.Lavender, borderColor: "#000"}} 
value={currentBalance} tone="balance" icon={<Wallet />} />
      </div>

      {/* ===== التقارير الدورية ===== */}
      <div className="accounts-print-hide w-full rounded-2xl overflow-hidden border shadow-sm" style={{ background: THEME.paleSage, borderColor: "rgba(0,0,0,0.08)" }}>
        <div className="px-4 py-3 flex flex-wrap justify-between items-center gap-3 border-b" style={{ background: THEME.warmCream, borderColor: "rgba(0,0,0,0.08)" }}>
          <div>
            <h2 className="text-base font-black text-[#171412] tracking-wide">تقارير الحساب الدورية</h2>
            <p className="text-xs text-[#6B655D] font-bold mt-1">اختر الربع أو النصف أو السنة ثم صدّر التقرير</p>
          </div>

          <div className="flex flex-wrap items-end gap-2">
            <label className="text-xs font-black text-[#171412]">
              نوع التقرير
              <select
                value={accountReportMode}
                onChange={(e) => {
                  const nextMode = e.target.value as "quarter" | "halfYear" | "year";
                  setAccountReportMode(nextMode);
                  setAccountReportPeriod(1);
                }}
                className="block mt-1 px-3 py-2 border rounded-xl bg-white text-[#171412] text-xs font-bold outline-none focus:border-[#2563AC]"
              >
                <option value="quarter">ربع سنوي</option>
                <option value="halfYear">نصف سنوي</option>
                <option value="year">سنوي</option>
              </select>
            </label>
            {accountReportMode !== "year" && (
              <label className="text-xs font-black text-[#6B655D]">
                الفترة
                <select
                  value={accountReportPeriod}
                  onChange={(e) => setAccountReportPeriod(Number(e.target.value))}
                  className="block mt-1 px-3 py-2 border rounded-xl bg-white text-[#171412] text-xs font-bold outline-none focus:border-[#2563AC]"
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
            <label className="text-xs font-black text-[#6B655D]">
              السنة
              <input
                type="number"
                value={accountReportYear}
                onChange={(e) => setAccountReportYear(Number(e.target.value) || accountReportYear)}
                className="block mt-1 w-24 px-3 py-2 border rounded-xl bg-white text-[#171412] text-xs font-bold font-mono text-center outline-none focus:border-[#2563AC]"
              />
            </label>
            <div className="text-xs font-black text-[#2563AC] px-2 py-2">{accountReportLabel}</div>
            <TabActions
              title={`تقرير الحساب الجاري - ${accountReportLabel}`}
              rows={accountReportRows}
              columns={COLS.filter((c) => c.key !== "revenueKey")}
              fileName={`الحساب-الجاري-${accountReportYear}`}
              numericKeys={["hafizaAmount", "income", "expense", "balance"]}
              pdfLayout="wide-centered"
            />
          </div>
        </div>
      </div>

      {/* ===== لوحة القيد اليدوي والمطابقة ===== */}
      <div className="accounts-print-hide w-full rounded-2xl overflow-hidden border shadow-sm" style={{ background: THEME.paleSage, borderColor: "rgba(0,0,0,0.08)" }}>
        <div className="px-4 py-3 flex flex-wrap justify-between items-center gap-3" style={{ background: THEME.warmCream, borderColor: "rgba(0,0,0,0.06)" }}>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg" style={{ background: `${THEME.accent}20`, color: THEME.accent }}>
              <Plus className={ICON_MOBILE} />
            </div>
            <h2 className="text-sm sm:text-base font-black text-[#171412] tracking-wide">
              قيد جديد أو ترحيل مطابق من الحوافظ
            </h2>
          </div>
          <div className="web-only-actions">
            <WebActionMenu label="إجراءات الإدخال والمطابقة" actions={accountEntryWebActions} />
          </div>
          <div className="apk-only-actions flex items-center gap-2.5 flex-wrap">
            <button
              onClick={handleSyncFromHafiza}
              className={`${BTN_MOBILE} flex items-center justify-center gap-2 rounded-full font-black`}
              style={{ background: THEME.accent, color: "#fff" }}
            >
              <Zap className={ICON_MOBILE} />
              <span className="text-sm">مطابقة شاملة ٢٠٢٦</span>
            </button>
            <label
              className={`flex items-center justify-center gap-2 rounded-full border px-3 py-2 cursor-pointer text-[#171412] font-bold`}
              style={{ borderColor: "rgba(0,0,0,0.08)", background: "#fff" }}
            >
              <FileSpreadsheet className={ICON_MOBILE} style={{ color: "#1E8E5A" }} />
              <span>استيراد إكسل</span>
              <input
                type="file"
                accept=".xlsx, .xls, .csv"
                onChange={handleImportExcel}
                className="hidden"
              />
            </label>
          </div>
        </div>

        <div className="p-2 sm:p-5">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6 gap-2 sm:gap-3 items-end">
            <Field
              label="التاريخ"
              type="date"
              icon={<Calendar className={ICON_MOBILE} style={{ color: "#2563AC" }} />}
              v={form.date}
              on={(v) => setForm({ ...form, date: v })}
            />
            <Field
              label="رقم الحافظة"
              icon={<Hash className={ICON_MOBILE} style={{ color: "#8B5CF6" }} />}
              v={form.hafizaNo}
              on={(v) => setForm({ ...form, hafizaNo: v })}
            />
            <Field
              label="رقم الإشعار"
              icon={<Hash className={ICON_MOBILE} style={{ color: "#D97706" }} />}
              v={form.notifyNo}
              on={(v) => setForm({ ...form, notifyNo: v })}
            />
            <Field
              label="تاريخ التوريد"
              type="date"
              icon={<Calendar className={ICON_MOBILE} style={{ color: "#0EA5A5" }} />}
              v={form.notifyDate}
              on={(v) => setForm({ ...form, notifyDate: v })}
            />
            <Field
              label="رقم الشيك"
              icon={<Ticket className={ICON_MOBILE} style={{ color: "#DB2777" }} />}
              v={form.checkNo}
              on={(v) => setForm({ ...form, checkNo: v })}
            />
            <Field
              label="تاريخ الشيك"
              type="date"
              icon={<Calendar className={ICON_MOBILE} style={{ color: "#65A30D" }} />}
              v={form.checkDate}
              on={(v) => setForm({ ...form, checkDate: v })}
            />

            <div className="relative">
              <label className="block text-[16px] font-black text-[#171412]/70 mb-1.5 mr-0.5 tracking-wide">
                البيان والشرح
              </label>
              <div className="relative flex items-center">
                <span className="absolute right-3 z-10">
                  <FileText className={ICON_MOBILE} style={{ color: "#DC2626" }} />
                </span>
                <input
                  list="account-descriptions"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="اكتب أو اختر البيان..."
                  className="w-full pr-9 pl-3 py-2 text-[16px] border rounded-xl outline-none focus:border-[#171412] focus:ring-2 focus:ring-[#171412]/10 bg-white text-[#171412] font-bold"
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
              icon={<Stethoscope className={ICON_MOBILE} style={{ color: "#0891B2" }} />}
              v={form.specialty}
              on={(v) => setForm({ ...form, specialty: v })}
            />
            <Field
              label="الاسم الكامل"
              icon={<User className={ICON_MOBILE} style={{ color: "#7C3AED" }} />}
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
              className="font-mono tabular-nums numeric-cell"
            />
            <Field
              label="الإيرادات"
              type="number"
              icon={<span className="text-xs text-[#1E8E5A] font-black">ر.ي</span>}
              v={form.income}
              on={(v) => setForm({ ...form, income: v })}
              placeholder="0.00"
              className="text-[#1E8E5A] font-black font-mono tabular-nums numeric-cell focus:border-[#1E8E5A]"
            />
            <Field
              label="المصروفات"
              type="number"
              icon={<span className="text-xs text-[#D14343] font-black">ر.ي</span>}
              v={form.expense}
              on={(v) => setForm({ ...form, expense: v })}
              placeholder="0.00"
              className="text-[#D14343] font-black font-mono tabular-nums numeric-cell focus:border-[#D14343]"
            />

            <div className="sm:col-span-2">
              <label className="flex items-center gap-1.5 text-[16px] font-black text-[#2563AC] mb-1.5 mr-0.5 tracking-wide">
                <Link className={ICON_MOBILE} /> ربط بدليل هيكل الإيرادات
              </label>
              <select
                value={form.revenueKey}
                onChange={(e) => setForm({ ...form, revenueKey: e.target.value })}
                className="w-full px-3 py-2 text-[15px] border rounded-xl outline-none bg-[#2563AC]/5 text-[#171412] font-bold focus:border-[#2563AC]"
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
                className={`${BTN_MOBILE} flex-1 flex items-center justify-center gap-2 rounded-xl font-black text-white`}
                style={{ background: THEME.text }}
              >
                <Save className={ICON_MOBILE} style={{ color: "#4ADE80" }} /> <span>ترحيل القيد</span>
              </button>
              <button
                onClick={() => setForm(emptyForm)}
                className={`${BTN_MOBILE} flex items-center justify-center gap-2 rounded-xl border font-bold`}
                style={{ borderColor: "rgba(0,0,0,0.08)", background: "#fff", color: THEME.text }}
              >
                <Eraser className={ICON_MOBILE} style={{ color: "#D14343" }} /> <span>مسح</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ===== جدول القيود ===== */}
      <div className="accounts-print-area w-full rounded-2xl overflow-hidden border shadow-sm" style={{ background: "#fff", borderColor: "rgba(0,0,0,0.08)" }}>
        <div className="accounts-print-hide px-2 py-2 sm:px-5 sm:py-3.5 flex flex-col sm:flex-row justify-between items-stretch sm:items-center flex-wrap gap-2 border-b" style={{ background: THEME.cream, borderColor: "rgba(0,0,0,0.06)" }}>
          <div className="flex items-center gap-2.5">
            <div className="w-2 h-2 rounded-full bg-[#1E8E5A] animate-pulse"></div>
            <h2 className="text-xs sm:text-sm font-black text-[#171412] tracking-wide">
              سجل حركات الحساب الجاري ({accounts.length})
            </h2>
          </div>
          <div className="grid grid-cols-2 sm:flex gap-1 sm:gap-2 w-full sm:w-auto">
            {Object.values(filters).some(Boolean) && (
              <button
                onClick={clearFilters}
                className="px-2 py-1 bg-black/5 hover:bg-black/10 text-[#171412] rounded-full text-xs font-bold transition-colors"
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
              pdfLayout="wide-centered"
              onClear={clearAccounts}
              className="col-span-2 w-full"
            />
          </div>
        </div>

        <div className="p-1.5 sm:p-3">
          <div className="overflow-x-auto overflow-y-auto max-h-[72vh] relative rounded-xl">
            <table className="min-w-max table-auto text-xm xm:text-base text-center font-semibold border-collapse border-2 border-black">
              <thead className="sticky top-0 z-20 text-[#171412] font-black text-[16px]" style={{ background: THEME.warmCream }}>
                <tr>
                  <th className="border border-black text-center w-10 sticky top-0 z-20 px-1 py-1.5 sm:px-2 sm:py-2 text-sm whitespace-nowrap">م</th>
                  {COLS.map((c) => (
                    <th
                      key={c.key}
                      className="border border-black cursor-pointer hover:bg-[#DCD5C6] transition-colors select-none sticky top-0 z-20 px-1 py-1.5 sm:px-2 sm:py-2 text-sm"
                      onClick={() => toggleSort(c.key)}
                    >
                      <div className="flex items-center justify-center gap-1.5">
                        <span>{c.label}</span>
                        <span className="text-[14px] text-[#2563AC] font-mono">
                          {sortIndicator(sortKey === c.key, sortDir)}
                        </span>
                      </div>
                    </th>
                  ))}
                  <th className="border border-black text-center sticky top-0 z-20 px-1 py-1.5 sm:px-2 sm:py-2 text-sm whitespace-nowrap">إجراءات</th>
                </tr>
                <tr className="accounts-print-hide" style={{ background: THEME.cream }}>
                  <th className="border border-black px-1 py-1.5 sm:px-2 sm:py-2 text-sm whitespace-nowrap"></th>
                  {COLS.map((c) => (
                    <th key={c.key} className="border border-black px-1 py-1.5 sm:px-2 sm:py-2 text-sm whitespace-nowrap">
                      <input
                        value={filters[c.key] || ""}
                        onChange={(e) => setFilter(c.key, e.target.value)}
                        placeholder="تصفية..."
                        className="w-16 min-w-0 max-w-[50px] px-1 py-1 text-xs border rounded bg-white text-[#171412] outline-none focus:border-[#171412] font-bold transition-colors"
                      />
                    </th>
                  ))}
                  <th className="border border-black px-1 py-1.5 sm:px-2 sm:py-2 text-sm whitespace-nowrap"></th>
                </tr>
              </thead>

              <tbody className="text-[#171412] font-bolder">
                {filteredWithBalance.length === 0 ? (
                  <tr>
                    <td
                      colSpan={COLS.length + 2}
                      className="text-center font-black border border-black bg-white px-1 py-1.5 sm:px-2 sm:py-2 text-sm whitespace-nowrap"
                    >
                      لا توجد بيانات تطابق مرشحات البحث.
                    </td>
                  </tr>
                ) : (
                  filteredWithBalance.map((acc, index) => (
                    <tr key={acc.id} className="odd:bg-white even:bg-[#FEF9E1] hover:bg-[#F0EBDE] transition-colors group">
                      <td className="border border-black text-center font-mono tabular-nums numeric-cell px-1 py-1.5 sm:px-2 sm:py-2 text-xm sm:text-base whitespace-nowrap">
                        {index + 1}
                      </td>
                      <td className="border border-black font-mono tabular-nums numeric-cell text-center px-1 py-1.5 sm:px-2 sm:py-2 text-sm whitespace-nowrap">
                        {acc.date}
                      </td>
                      <td className="border border-black font-mono tabular-nums numeric-cell font-black text-center px-1 py-1.5 sm:px-2 sm:py-2 text-sm whitespace-nowrap">
                        {acc.hafizaNo || "—"}
                      </td>
                      <td className="border border-black font-mono tabular-nums numeric-cell text-center px-1 py-1.5 sm:px-2 sm:py-2 text-sm whitespace-nowrap">
                        {acc.notifyNo || "—"}
                      </td>
                      <td className="border border-black font-mono tabular-nums numeric-cell text-center px-1 py-1.5 sm:px-2 sm:py-2 text-sm whitespace-nowrap">
                        {acc.notifyDate || "—"}
                      </td>
                      <td className="border border-black font-mono tabular-nums numeric-cell text-center px-1 py-1.5 sm:px-2 sm:py-2 text-sm whitespace-nowrap">
                        {acc.checkNo || "—"}
                      </td>
                      <td className="border border-black font-mono tabular-nums numeric-cell text-center px-1 py-1.5 sm:px-2 sm:py-2 text-sm whitespace-nowrap">
                        {acc.checkDate || "—"}
                      </td>
                      <td className="border border-black px-1 py-1.5 sm:px-2 sm:py-2 text-sm whitespace-nowrap">
                        {acc.description || "—"}
                      </td>
                      <td className="border border-black px-1 py-1.5 sm:px-2 sm:py-2 text-sm whitespace-nowrap">
                        {acc.specialty || "—"}
                      </td>
                      <td className="border border-black font-black px-1 py-1.5 sm:px-2 sm:py-2 text-sm whitespace-nowrap">
                        {acc.name || "—"}
                      </td>
                      <td className="border border-black font-mono tabular-nums numeric-cell text-center px-1 py-1.5 sm:px-2 sm:py-2 text-sm whitespace-nowrap">
                        {Number(acc.hafizaAmount) > 0 ? fmt(Number(acc.hafizaAmount)) : "—"}
                      </td>
                      <td className="border border-black font-mono tabular-nums numeric-cell font-black text-center bg-[#1E8E5A]/[0.06] px-1 py-1.5 sm:px-2 sm:py-2 text-sm whitespace-nowrap">
                        {Number(acc.income) > 0 ? fmt(Number(acc.income)) : "—"}
                      </td>
                      <td className="border border-black font-mono tabular-nums numeric-cell font-black text-center bg-[#D14343]/[0.06] px-1 py-1.5 sm:px-2 sm:py-2 text-sm whitespace-nowrap">
                        {Number(acc.expense) > 0 ? fmt(Number(acc.expense)) : "—"}
                      </td>

                      <td className="accounts-print-hide border border-black text-center px-1 py-1.5 sm:px-2 sm:py-2 text-sm whitespace-nowrap">
                        <select
                          value={acc.revenueKey || ""}
                          onChange={(e) => {
                            const newKey = e.target.value;
                            updateAccount(acc.id, { ...acc, revenueKey: newKey || undefined });
                            toast.success("تم ربط رمز الإيراد بنجاح");
                          }}
                          className="w-full p-1 text-[13px] font-black text-[#7C3AED] bg-[#7C3AED]/5 border rounded outline-none focus:border-[#7C3AED] cursor-pointer"
                        >
                          <option value="">— ربط الرمز —</option>
                          {revenueTypes.map((t) => (
                            <option key={t.key} value={t.key}>
                              {t.key}
                            </option>
                          ))}
                        </select>
                      </td>

                      <td className="border border-black font-mono tabular-nums numeric-cell font-black text-center bg-[#2563AC]/[0.06] px-1 py-1.5 sm:px-2 sm:py-2 text-sm whitespace-nowrap">
                        {fmt(acc.balance)}
                      </td>
                      <td className="accounts-print-hide border border-black text-center px-1 py-1.5 sm:px-2 sm:py-2 text-sm whitespace-nowrap">
                        <div className="flex justify-center gap-1.5">
                          <button
                            onClick={() => setEditingRow(acc)}
                            className="p-2 text-[#1E8E5A] hover:bg-[#1E8E5A]/10 rounded transition-colors"
                            aria-label="تعديل"
                          >
                            <Edit className={ICON_MOBILE} />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm("هل أنت متأكد من الحذف؟")) deleteAccount(acc.id);
                            }}
                            className="p-2 text-[#D14343] hover:bg-[#D14343]/10 rounded transition-colors"
                            aria-label="حذف"
                          >
                            <Trash2 className={ICON_MOBILE} />
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
                    <td colSpan={10} className="border border-black text-left font-black px-1 py-1.5 sm:px-2 sm:py-2 text-sm whitespace-nowrap">
                      رصيد الإقفال
                    </td>
                    <td className="border border-black font-mono tabular-nums numeric-cell font-black text-center px-1 py-1.5 sm:px-2 sm:py-2 text-sm whitespace-nowrap">
                      {fmt(totalIncome)}
                    </td>
                    <td className="border border-black font-mono tabular-nums numeric-cell font-black text-center px-1 py-1.5 sm:px-2 sm:py-2 text-sm whitespace-nowrap">
                      {fmt(totalExpense)}
                    </td>
                    <td className="border border-black px-1 py-1.5 sm:px-2 sm:py-2 text-sm whitespace-nowrap"></td>
                    <td className="border border-black font-mono tabular-nums numeric-cell font-black text-center bg-[#2563AC]/10 px-1 py-1.5 sm:px-2 sm:py-2 text-sm whitespace-nowrap">
                      {fmt(currentBalance)}
                    </td>
                    <td className="accounts-print-hide border border-black px-1 py-1.5 sm:px-2 sm:py-2 text-sm whitespace-nowrap"></td>
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
                <label className="block text-sm font-black text-[#171412]/70 mb-1 tracking-wide">التاريخ</label>
                <input
                  type="date"
                  value={editingRow.date}
                  onChange={(e) => setEditingRow({ ...editingRow, date: e.target.value })}
                  className="w-full p-2 text-[15px] border rounded-xl outline-none bg-white text-[#171412] font-bold focus:border-[#171412]"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-black text-[#171412]/70 mb-1 tracking-wide">رقم الحافظة</label>
                <input
                  value={editingRow.hafizaNo}
                  onChange={(e) => setEditingRow({ ...editingRow, hafizaNo: e.target.value })}
                  className="w-full p-2 text-[15px] border rounded-xl outline-none bg-white text-[#171412] font-bold focus:border-[#171412]"
                />
              </div>
              <div>
                <label className="block text-sm font-black text-[#171412]/70 mb-1 tracking-wide">رقم الإشعار</label>
                <input
                  value={editingRow.notifyNo}
                  onChange={(e) => setEditingRow({ ...editingRow, notifyNo: e.target.value })}
                  className="w-full p-2 text-[15px] border rounded-xl outline-none bg-white text-[#171412] font-bold focus:border-[#171412]"
                />
              </div>
              <div>
                <label className="block text-sm font-black text-[#171412]/70 mb-1 tracking-wide">تاريخ التوريد</label>
                <input
                  type="date"
                  value={editingRow.notifyDate}
                  onChange={(e) => setEditingRow({ ...editingRow, notifyDate: e.target.value })}
                  className="w-full p-2 text-[15px] border rounded-xl outline-none bg-white text-[#171412] font-bold focus:border-[#171412]"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-black text-[#171412]/70 mb-1 tracking-wide">البيان والشرح</label>
                <input
                  value={editingRow.description}
                  onChange={(e) => setEditingRow({ ...editingRow, description: e.target.value })}
                  className="w-full p-2 text-[15px] border rounded-xl outline-none bg-white text-[#171412] font-bold focus:border-[#171412]"
                />
              </div>
              <div>
                <label className="block text-sm font-black text-[#171412]/70 mb-1 tracking-wide">الاسم</label>
                <input
                  value={editingRow.name}
                  onChange={(e) => setEditingRow({ ...editingRow, name: e.target.value })}
                  className="w-full p-2 text-[15px] border rounded-xl outline-none bg-white text-[#171412] font-bold focus:border-[#171412]"
                />
              </div>
              <div>
                <label className="block text-sm font-black text-[#171412]/70 mb-1 tracking-wide">مبلغ الحافظة</label>
                <input
                  type="number"
                  value={editingRow.hafizaAmount}
                  onChange={(e) => setEditingRow({ ...editingRow, hafizaAmount: e.target.value })}
                  className="w-full p-2 text-[15px] border rounded-xl outline-none bg-white text-[#171412] font-bold focus:border-[#171412] font-mono tabular-nums numeric-cell"
                />
              </div>
              <div>
                <label className="block text-sm font-black text-[#1E8E5A] mb-1 tracking-wide">الإيرادات</label>
                <input
                  type="number"
                  value={editingRow.income}
                  onChange={(e) => setEditingRow({ ...editingRow, income: e.target.value })}
                  className="w-full p-2 text-[15px] border rounded-xl bg-[#1E8E5A]/5 text-[#1E8E5A] font-black outline-none focus:border-[#1E8E5A] font-mono tabular-nums numeric-cell"
                />
              </div>
              <div>
                <label className="block text-sm font-black text-[#D14343] mb-1 tracking-wide">المصروفات</label>
                <input
                  type="number"
                  value={editingRow.expense}
                  onChange={(e) => setEditingRow({ ...editingRow, expense: e.target.value })}
                  className="w-full p-2 text-[15px] border rounded-xl bg-[#D14343]/5 text-[#D14343] font-black outline-none focus:border-[#D14343] font-mono tabular-nums numeric-cell"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t" style={{ borderColor: "rgba(0,0,0,0.06)" }}>
              <button
                type="button"
                onClick={() => setEditingRow(null)}
                className="px-4 py-2 bg-black/5 text-[#171412] rounded-xl font-bold text-sm hover:bg-black/10"
              >
                إلغاء
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-[#171412] text-white rounded-xl font-black text-sm hover:bg-[#2A2521]"
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