import { useState, useMemo, useRef, useEffect } from "react";
import { useStore } from "@/lib/store";
import {
  Edit,
  Save,
  Trash2,
  Plus,
  X,
  ChevronDown,
  Search,
  BookOpenText,
  Hash,
  FileText,
  CalendarDays,
  Scale,
  CheckCircle2,
  AlertTriangle,
  Inbox,
} from "lucide-react";
import { toast } from "sonner";
import ImportButton from "@/components/ImportButton";
import TabActions from "@/components/TabActions";
import type { WebActionItem } from "@/components/WebActionMenu";
import type { Journal } from "@/lib/store";
import { useTableControls } from "@/hooks/useTableControls";

const JOURNAL_COLS = [
  { key: "formNo", label: "رقم الاستمارة" },
  { key: "settlement", label: "التسوية" },
  { key: "date", label: "التاريخ" },
  { key: "description", label: "البيان" },
  { key: "debitAccount", label: "الحساب المدين" },
  { key: "creditAccount", label: "الحساب الدائن" },
  { key: "debit", label: "مدين" },
  { key: "credit", label: "دائن" },
] as const;

const ALL_EXCEL_ACCOUNTS = [
  "الباب الاول (الأجور والمرتبات)",
  "الباب الثاني (النفقات التشغيلية)",
  "الباب الثالث (الدعم والموارد)",
  "الباب الرابع (اكتساب الأصول غير المالية)",
  "حساب البنك نفقات تشغيلية محلية",
  "حساب البنك اكتساب اصول غير مالية",
  "حساب البنك موارد محلية",
  "حساب البنك موارد عامة مشتركة",
  "حساب البنك حسابات جارية",
  "ح/ النقدية للصندوق",
  "حسابات سلف الحسابات الجارية",
  "حساب السلف على الأجور",
  "حساب السلف المؤقتة",
  "حساب المبالغ المدفوعة مقدما",
  "ح/ المدينين مالية",
  "ح/ الدائنين مالية",
  "حساب الموارد العامة المشتركة",
  "حساب الموارد المشتركة",
  "حساب الحسابات الجارية",
  "حساب المساهمات الذاتية",
  "حساب المبالغ الدائنة تحت التسوية",
  "حساب البنك امانات",
  "حساب التزامات سلع وخدمات وممتلكات",
  "حساب التزامات اكتساب اصول ثابتة",
  "حساب التزامات اكتساب اصول غير منتجة",
  "حساب تسوية الموارد المحصلة مقدما",
  "حساب الموارد المستحقة",
  "حساب النفقات المقدمة عن سلع وخدمات",
  "حساب مرتجع الاجور",
  "حساب التامينات المتنوعة",
  "حساب المبالغ الدائنة المحصلة للغير",
  "حساب دائنون التزمات قائمة",
  "حساب تسوية المستحقات والمقدمات المدينة",
  "حساب الكفالات",
  "حساب امانات الكفالات",
  "حساب الديون المستحقة للحكومة",
  "حساب متابعة مطلوبات الحكومة",
  "حساب اكتساب الاصول غير المالية",
  "حساب مراقبة اكتساب الاصول غير المالية",
  "حساب الاستخدامات",
  "حساب الموارد",
];

interface EntryLine {
  id: string;
  account: string;
  amount: number;
  type: "debit" | "credit";
  description?: string;
}

// ── حقل مع تسمية عائمة (رأس النموذج فقط) ───────────────────────────────────
function Field({
  label,
  icon,
  className = "",
  children,
}: {
  label: string;
  icon?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <label className={`group relative block min-w-0 ${className}`}>
      <span className="mb-1 flex items-center gap-1.5 text-xs font-bold text-slate-500 sm:mb-1.5 sm:text-xs">
        {icon}
        {label}
      </span>
      {children}
    </label>
  );
}

const inputCls =
  "w-full min-w-0 rounded-xl border border-slate-200 bg-slate-50/80 px-2.5 py-2.5 text-[13px] font-medium text-slate-800 outline-none transition-all placeholder:text-slate-400 focus:border-sky-500 focus:bg-white focus:ring-4 focus:ring-sky-500/10 sm:px-3 sm:py-3 sm:text-sm";

const journalClampCls =
  "block max-w-[90px] overflow-hidden text-ellipsis whitespace-nowrap leading-snug sm:max-w-[180px]";

// ── قائمة اختيار الحساب: تُفتح كنافذة منبثقة فوق خلية الجدول ───────────────
function AccountDropdownCell({
  value,
  onChange,
  type,
}: {
  value: string;
  onChange: (v: string) => void;
  type: "debit" | "credit";
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const isDebit = type === "debit";

  const filtered = useMemo(() => {
    const q = query.trim();
    if (!q) return ALL_EXCEL_ACCOUNTS;
    return ALL_EXCEL_ACCOUNTS.filter((a) => a.toLowerCase().includes(q.toLowerCase()));
  }, [query]);

  useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const handleOpen = () => {
    setOpen(true);
    setQuery("");
    setTimeout(() => inputRef.current?.focus(), 60);
  };

  const pick = (acc: string) => {
    onChange(acc);
    setOpen(false);
    setQuery("");
  };

  return (
    <div ref={wrapRef} className="relative w-full min-w-[180px] sm:min-w-[210px]">
      <button
        type="button"
        onClick={handleOpen}
        className={`flex min-h-[40px] w-full items-center justify-between gap-1.5 rounded-lg border px-2 py-2 text-right text-sm font-bold transition-all active:scale-[0.99] sm:min-h-[42px] sm:gap-2 sm:px-2.5 sm:text-[13px]
          ${
            value
              ? isDebit
                ? "border-emerald-400/70 bg-emerald-50 text-black-900"
                : "border-rose-400/70 bg-rose-50 text-rose-900"
              : "border-dashed border-slate-300 bg-slate-50 text-slate-400"
          }`}
      >
        <span className="min-w-0 flex-1 truncate text-right leading-snug">
          {value || (isDebit ? "اختر الحساب المدين…" : "اختر الحساب الدائن…")}
        </span>
        <ChevronDown className="h-3.5 w-3.5 shrink-0 text-slate-400" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-[998] bg-slate-950/40 backdrop-blur-[2px] md:hidden" />
          <div
            className="fixed inset-x-0 bottom-0 z-[999] max-h-[72vh] overflow-hidden rounded-t-3xl border border-slate-200 bg-white shadow-2xl
              md:absolute md:inset-x-auto md:bottom-auto md:right-0 md:left-0 md:top-full md:mt-1 md:max-h-[60vh] md:w-[360px] md:rounded-2xl"
            dir="rtl"
          >
            <div className="mx-auto mt-2 h-1.5 w-12 rounded-full bg-slate-200 md:hidden" />
            <div
              className={`mt-2 flex items-center gap-1.5 px-2.5 py-2.5 md:mt-0 md:gap-2 md:px-3 md:py-3
              ${isDebit ? "bg-gradient-to-l from-sky-700 to-sky-500" : "bg-gradient-to-l from-rose-700 to-rose-500"}`}
            >
              <Search className="h-4 w-4 shrink-0 text-white" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={isDebit ? "ابحث في الحسابات المدينة…" : "ابحث في الحسابات الدائنة…"}
                className="min-w-0 flex-1 bg-transparent text-right text-[13px] text-white outline-none placeholder:text-white/70 sm:text-sm"
                onKeyDown={(e) => e.key === "Escape" && setOpen(false)}
              />
              <button
                onClick={() => setOpen(false)}
                className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-white/80 transition-colors hover:bg-white/15 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="border-b border-slate-100 bg-slate-50 px-3 py-1.5 text-right text-xs font-bold text-slate-400">
              {filtered.length} حساب متاح
            </div>

            <div className="overflow-y-auto overscroll-contain" style={{ maxHeight: "56vh" }}>
              {filtered.length === 0 ? (
                <p className="p-8 text-center text-sm text-slate-400">لا توجد نتائج مطابقة</p>
              ) : (
                filtered.map((acc, i) => (
                  <button
                    key={acc}
                    type="button"
                    onClick={() => pick(acc)}
                    className={`w-full break-words border-b border-slate-100 px-3 py-3 text-right text-[13px] font-medium leading-relaxed transition-colors last:border-0 sm:px-4 sm:py-3.5 sm:text-sm
                      ${
                        value === acc
                          ? isDebit
                            ? "bg-emerald-100 font-bold text-black-900"
                            : "bg-rose-100 font-bold text-rose-900"
                          : "text-slate-700 hover:bg-slate-50 active:bg-slate-100"
                      }`}
                  >
                    <span
                      className={`ml-2 inline-block w-6 text-center text-xs font-bold
                      ${isDebit ? "text-black-400" : "text-rose-400"}`}
                    >
                      {i + 1}
                    </span>
                    {acc}
                  </button>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ── المكوّن الرئيسي ───────────────────────────────────────────────────────
export default function JournalTab() {
  const { journal, addJournal, updateJournal, deleteJournal, clearJournal } = useStore();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [formNo, setFormNo] = useState("");
  const [settlement, setSettlement] = useState("");
  const [date, setDate] = useState("");
  const [description, setDescription] = useState("");

  const [lines, setLines] = useState<EntryLine[]>([
    { id: "d1", account: "", amount: 0, type: "debit", description: "" },
    { id: "c1", account: "", amount: 0, type: "credit", description: "" },
  ]);

  const genId = () => Math.random().toString(36).slice(2, 8);

  const addLine = (type: "debit" | "credit") =>
    setLines((p) => [...p, { id: genId(), account: "", amount: 0, type, description: "" }]);
  const removeLine = (id: string) => setLines((p) => p.filter((l) => l.id !== id));
  const updateLine = (id: string, field: keyof EntryLine, value: any) =>
    setLines((p) => p.map((l) => (l.id === id ? { ...l, [field]: value } : l)));

  const debitLinesArr = lines.filter((l) => l.type === "debit");
  const creditLinesArr = lines.filter((l) => l.type === "credit");

  const totalDebit = debitLinesArr.reduce((s, l) => s + (Number(l.amount) || 0), 0);
  const totalCredit = creditLinesArr.reduce((s, l) => s + (Number(l.amount) || 0), 0);
  const isBalanced = totalDebit > 0 && totalCredit > 0 && totalDebit === totalCredit;
  const diff = Math.abs(totalDebit - totalCredit);
  const balanceRatio =
    Math.max(totalDebit, totalCredit) > 0
      ? Math.min(totalDebit, totalCredit) / Math.max(totalDebit, totalCredit)
      : 0;

  const {
    rows: filteredJournal,
    filters: journalFilters,
    setFilter: setJournalFilter,
    clearFilters: clearJournalFilters,
  } = useTableControls(journal, JOURNAL_COLS.map((c) => c.key));

  const grandDebit = filteredJournal.reduce((s, j) => s + (Number(j.debit) || 0), 0);
  const grandCredit = filteredJournal.reduce((s, j) => s + (Number(j.credit) || 0), 0);

  const resetForm = () => {
    setFormNo("");
    setSettlement("");
    setDate("");
    setDescription("");
    setLines([
      { id: "d1", account: "", amount: 0, type: "debit", description: "" },
      { id: "c1", account: "", amount: 0, type: "credit", description: "" },
    ]);
    setEditingId(null);
  };

  const handleSave = () => {
    if (!description && lines.every((l) => !l.description)) {
      toast.error("يرجى تعبئة حقل البيان العام أو بيان الأسطر");
      return;
    }
    if (!isBalanced) {
      toast.error("القيد غير متوازن — يجب أن يتساوى إجمالي المدين والدائن");
      return;
    }

    const debitLines = lines.filter((l) => l.type === "debit");
    const creditLines = lines.filter((l) => l.type === "credit");

    if (editingId) {
      deleteJournal(editingId);
    }

    debitLines.forEach((dl) => {
      creditLines.forEach((cl) => {
        const ratio = (Number(cl.amount) || 0) / totalCredit;

        const combinedDescription = [description, dl.description, cl.description]
          .filter((desc) => desc && desc.trim() !== "")
          .join(" - ");

        const payload: Omit<Journal, "id"> = {
          date,
          formNo,
          settlement,
          description: combinedDescription,
          account: dl.account,
          debitAccount: dl.account,
          creditAccount: cl.account,
          debit: Number(dl.amount) || 0,
          credit: Math.round((Number(dl.amount) || 0) * ratio),
        };
        addJournal(payload);
      });
    });

    toast.success(editingId ? "تم تحديث القيد المركب بنجاح" : "تم حفظ القيد المركب بنجاح");
    resetForm();
  };

  const startEdit = (j: Journal) => {
    setEditingId(j.id);
    setFormNo(j.formNo || "");
    setSettlement(j.settlement || "");
    setDate(j.date || "");
    setDescription(j.description || "");
    setLines([
      {
        id: genId(),
        account: j.debitAccount || "",
        amount: j.debit || 0,
        type: "debit",
        description: "",
      },
      {
        id: genId(),
        account: j.creditAccount || "",
        amount: j.credit || 0,
        type: "credit",
        description: "",
      },
    ]);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // ── جدول أسطر الإدخال (مدين + دائن في جدول واحد) ────────────────────────
  const renderEntryRow = (l: EntryLine, idx: number, total: number) => {
    const isDebit = l.type === "debit";
    return (
      <tr
        key={l.id}
        className={`border-b border-slate-100 transition-colors ${
          isDebit ? "bg-emerald-50/40 hover:bg-emerald-50/70" : "bg-rose-50/40 hover:bg-rose-50/70"
        }`}
      >
        <td className="!whitespace-nowrap text-center !px-1 !py-1.5 sm:!px-2 sm:!py-2 !text-sm sm:!text-base">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-xs font-black text-white
            ${isDebit ? "bg-emerald-600" : "bg-rose-600"}`}
          >
            {idx + 1} · {isDebit ? "مدين" : "دائن"}
          </span>
        </td>
        <td className="min-w-[180px] sm:min-w-[210px] !px-1 !py-1.5 sm:!px-2 sm:!py-2 !text-sm sm:!text-base whitespace-nowrap">
          <AccountDropdownCell
            value={l.account}
            onChange={(v) => updateLine(l.id, "account", v)}
            type={l.type}
          />
        </td>
        <td className="min-w-[150px] sm:min-w-[180px] !px-1 !py-1.5 sm:!px-2 sm:!py-2 !text-sm sm:!text-base whitespace-nowrap">
          <input
            type="text"
            value={l.description || ""}
            onChange={(e) => updateLine(l.id, "description", e.target.value)}
            placeholder="بيان السطر (اختياري)"
            className={`min-w-0 w-full rounded-lg border bg-white px-2 py-2.5 text-sm outline-none transition-all sm:px-2.5 sm:py-2 sm:text-[13px]
              ${
                isDebit
                  ? "border-emerald-200 text-black-900 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
                  : "border-rose-200 text-rose-900 focus:border-rose-500 focus:ring-4 focus:ring-rose-500/10"
              }`}
          />
        </td>
        <td className="w-[110px] sm:w-[130px] !px-1 !py-1.5 sm:!px-2 sm:!py-2 !text-sm sm:!text-base whitespace-nowrap">
          <input
            type="number"
            inputMode="decimal"
            dir="ltr"
            value={l.amount || ""}
            onChange={(e) => updateLine(l.id, "amount", e.target.value)}
            placeholder="0.00"
            className={`min-w-0 w-full rounded-lg border bg-white px-1.5 py-2.5 text-center font-mono text-[13px] font-bold outline-none transition-all sm:px-2 sm:py-2 sm:text-sm
              ${
                isDebit
                  ? "border-emerald-200 text-black-700 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
                  : "border-rose-200 text-rose-700 focus:border-rose-500 focus:ring-4 focus:ring-rose-500/10"
              }`}
          />
        </td>
        <td className="w-[52px] text-center !px-1 !py-1.5 sm:!px-2 sm:!py-2 !text-sm sm:!text-base whitespace-nowrap">
          {total > 1 && (
            <button
              onClick={() => removeLine(l.id)}
              className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 transition-colors hover:bg-rose-100 hover:text-rose-600"
              title="حذف السطر"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </td>
      </tr>
    );
  };

  const journalWebActions: WebActionItem[] = [
    {
      label: "استيراد Excel",
      onSelect: () => undefined,
      content: (
        <div className="flex w-full items-center rounded-lg hover:bg-slate-100">
          <ImportButton kind="journal" />
        </div>
      ),
    },
  ];

  const tabActions = (
    <TabActions
      title="قيود اليومية"
      rows={journal}
      columns={[
        { key: "date", label: "التاريخ" },
        { key: "formNo", label: "رقم الاستمارة" },
        { key: "description", label: "البيان" },
        { key: "debitAccount", label: "الحساب المدين" },
        { key: "debit", label: "مدين" },
        { key: "creditAccount", label: "الحساب الدائن" },
        { key: "credit", label: "دائن" },
      ]}
      fileName="قيود-اليومية"
      numericKeys={["debit", "credit"]}
      pdfLayout="wide-centered"
      onClear={clearJournal}
      additionalWebActions={journalWebActions}
      className="w-full !grid !grid-cols-2 sm:!flex !gap-1 sm:!gap-2 [&>button]:min-w-0 [&>button]:justify-center [&>button]:px-1 [&>button]:py-1 sm:[&>button]:px-2 sm:[&>button]:py-1 [&>button]:text-xs sm:[&>button]:text-xs"
    />
  );

  return (
    <div className="w-full space-y-3 overflow-x-hidden p-1.5 sm:p-3" dir="rtl">
      {/* ══ بطاقة إدخال القيد ══ */}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="relative bg-gradient-to-l from-[#2e6b8a] via-[#12405c] to-[#0d4f4a] px-2 py-2 sm:px-4 sm:py-3">
          <div className="absolute inset-x-0 top-0 h-[3px] bg-[repeating-linear-gradient(90deg,#b8d4e8_0_10px,transparent_10px_20px)] opacity-70" />
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 sm:gap-3">
            <div className="flex min-w-0 items-center gap-2.5">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-white/15 bg-white/10 text-[#dbeafe]">
                <BookOpenText className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <h3 className="truncate text-[15px] font-bold text-white">
                  {editingId ? "تعديل القيد المركب" : "قيد يومية مركب"}
                </h3>
                <p className="truncate text-xs font-medium text-[#cfe0ec]">
                  إدخال أطراف متعددة مع توزيع تلقائي للمبالغ
                </p>
              </div>
            </div>
            <div className="apk-only-actions shrink-0 [&>label]:border-emerald-700 [&>label]:bg-emerald-600 [&>label]:text-white [&>label]:hover:bg-emerald-700 [&>label]:px-1.5 [&>label]:py-1 [&>label]:text-xs sm:[&>label]:px-2 sm:[&>label]:py-1 sm:[&>label]:text-xs">
              <ImportButton kind="journal" />
            </div>
          </div>
          <div className="mt-2 border-t border-white/10 pt-2 sm:mt-2.5 sm:pt-2.5">{tabActions}</div>
        </div>

        <div className="space-y-4 p-3 sm:p-4">
          {/* رأس القيد */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="رقم الاستمارة" icon={<Hash className="h-3.5 w-3.5" />}>
              <input
                placeholder="مثال: 145"
                value={formNo}
                onChange={(e) => setFormNo(e.target.value)}
                className={inputCls}
              />
            </Field>
            <Field label="كشف التسوية" icon={<FileText className="h-3.5 w-3.5" />}>
              <input
                placeholder="مثال: كشف 3"
                value={settlement}
                onChange={(e) => setSettlement(e.target.value)}
                className={inputCls}
              />
            </Field>
            <Field label="التاريخ" icon={<CalendarDays className="h-3.5 w-3.5" />}>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className={inputCls}
              />
            </Field>
            <Field
              label="البيان العام للقيد"
              icon={<FileText className="h-3.5 w-3.5" />}
              className="sm:col-span-1"
            >
              <input
                placeholder="اختياري في حال تعبئة بيانات الأسطر"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className={inputCls}
              />
            </Field>
          </div>

          {/* جدول أسطر القيد (مدين + دائن) */}
          <div className="overflow-hidden rounded-2xl border border-slate-200">
            <div className="overflow-auto max-h-[72vh]">
              <table className="min-w-max table-auto border-collapse text-right text-sm sm:text-base font-semibold">
                <thead className="bg-[#2e6b8a] text-white">
                  <tr>
                    <th className="!whitespace-nowrap text-center font-bold !px-1 !py-1.5 sm:!px-2 sm:!py-2 !text-sm sm:!text-base">
                      #
                    </th>
                    <th className="!whitespace-nowrap text-right font-bold !px-1 !py-1.5 sm:!px-2 sm:!py-2 !text-sm sm:!text-base">
                      الحساب
                    </th>
                    <th className="!whitespace-nowrap text-right font-bold !px-1 !py-1.5 sm:!px-2 sm:!py-2 !text-sm sm:!text-base">
                      بيان السطر
                    </th>
                    <th className="!whitespace-nowrap text-center font-bold !px-1 !py-1.5 sm:!px-2 sm:!py-2 !text-sm sm:!text-base">
                      المبلغ
                    </th>
                    <th className="!whitespace-nowrap text-center font-bold !px-1 !py-1.5 sm:!px-2 sm:!py-2 !text-sm sm:!text-base" />
                  </tr>
                </thead>
                <tbody>
                  {debitLinesArr.map((l, i) => renderEntryRow(l, i, debitLinesArr.length))}
                  {creditLinesArr.map((l, i) => renderEntryRow(l, i, creditLinesArr.length))}
                </tbody>
                <tfoot>
                  <tr className="border-t border-slate-200 bg-slate-50">
                    <td colSpan={5} className="!px-1 !py-1.5 sm:!px-2 sm:!py-2 !text-sm sm:!text-base whitespace-nowrap">
                      <div className="grid grid-cols-2 sm:flex items-center gap-1.5 sm:gap-2">
                        <button
                          onClick={() => addLine("debit")}
                          className="min-w-0 flex min-h-[32px] items-center justify-center gap-1 rounded-lg border border-dashed border-emerald-300 px-1.5 sm:px-2 text-xs sm:text-xs font-bold text-black-700 transition-colors hover:bg-emerald-50 active:bg-emerald-100"
                        >
                          <Plus className="h-3.5 w-3.5" /> إضافة حساب مدين
                        </button>
                        <button
                          onClick={() => addLine("credit")}
                          className="min-w-0 flex min-h-[32px] items-center justify-center gap-1 rounded-lg border border-dashed border-rose-300 px-1.5 sm:px-2 text-xs sm:text-xs font-bold text-rose-700 transition-colors hover:bg-rose-50 active:bg-rose-100"
                        >
                          <Plus className="h-3.5 w-3.5" /> إضافة حساب دائن
                        </button>
                        <span className="col-span-2 flex items-center justify-center gap-1.5 font-mono text-xs sm:mr-auto sm:col-span-1 sm:justify-start sm:gap-2 sm:text-xs font-bold">
                            <span className="rounded-full bg-emerald-100 px-1.5 py-0.5 text-black-800 sm:px-2.5 sm:py-1">
                            مدين {totalDebit.toLocaleString("en-US")}
                          </span>
                            <span className="rounded-full bg-rose-100 px-1.5 py-0.5 text-rose-800 sm:px-2.5 sm:py-1">
                            دائن {totalCredit.toLocaleString("en-US")}
                          </span>
                        </span>
                      </div>
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* شريط التوازن + الحفظ */}
          <div
            className={`sticky bottom-2 z-30 rounded-2xl border p-2 sm:p-3 shadow-lg backdrop-blur
              ${isBalanced ? "border-emerald-300 bg-emerald-50/95" : "border-amber-300 bg-sky-50/95"}`}
          >
            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 sm:gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-sm font-bold">
                  <span className="text-black-700">
                    مدين {totalDebit.toLocaleString("en-US")}
                  </span>
                  <span className="text-slate-300">|</span>
                  <span className="text-rose-700">دائن {totalCredit.toLocaleString("en-US")}</span>
                </div>
                <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${isBalanced ? "bg-emerald-500" : "bg-amber-400"}`}
                    style={{ width: `${Math.round(balanceRatio * 100)}%` }}
                  />
                </div>
              </div>
              <span
                className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-black
                ${isBalanced ? "bg-emerald-600 text-white" : "bg-amber-500 text-white"}`}
              >
                {isBalanced ? (
                  <>
                    <CheckCircle2 className="h-3.5 w-3.5" /> متوازن
                  </>
                ) : totalDebit > 0 || totalCredit > 0 ? (
                  <>
                    <AlertTriangle className="h-3.5 w-3.5" /> فرق {diff.toLocaleString("en-US")}
                  </>
                ) : (
                  <>
                    <Scale className="h-3.5 w-3.5" /> أدخل المبالغ
                  </>
                )}
              </span>
            </div>

            <div className="mt-2 grid grid-cols-2 sm:mt-3 sm:flex gap-1.5 sm:gap-2">
              <button
                onClick={handleSave}
                title={isBalanced ? "" : "يجب تساوي إجمالي المدين والدائن"}
                className={`min-w-0 flex min-h-[40px] flex-1 items-center justify-center gap-1.5 rounded-xl px-2 sm:min-h-[48px] sm:gap-2 sm:px-4 text-xs sm:text-sm font-bold text-white shadow-sm transition-all active:scale-[0.99]
                  ${isBalanced ? "bg-gradient-to-l from-sky-700 to-sky-600 hover:brightness-110" : "bg-slate-300 text-slate-600"}`}
              >
                <Save className="h-4 w-4" />
                {editingId ? "تحديث القيد" : "حفظ القيد المركب"}
              </button>
              {editingId && (
                <button
                  onClick={resetForm}
                  className="min-h-[40px] rounded-xl bg-white px-2 text-xs sm:min-h-[48px] sm:px-4 sm:text-sm font-bold text-slate-700 ring-1 ring-slate-200 transition-colors hover:bg-slate-100"
                >
                  إلغاء
                </button>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ══ سجل القيود (جدول واحد لكل الأحجام) ══ */}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 sm:gap-3 bg-gradient-to-l from-[#2e6b8a] to-[#12405c] px-2 py-2 sm:px-4 sm:py-2.5">
          <h3 className="truncate text-[14px] font-bold text-white">سجل القيود اليومية</h3>
          <div className="flex min-w-0 items-center justify-end gap-1.5 sm:gap-2">
            {Object.values(journalFilters).some(Boolean) && (
              <button
                onClick={clearJournalFilters}
                className="min-w-0 rounded-full bg-white/15 px-2 py-1 text-[11px] font-bold text-white transition-colors hover:bg-white/25 sm:text-xs"
              >
                مسح التصفية
              </button>
            )}
            <span className="shrink-0 rounded-full bg-white/15 px-2.5 py-0.5 text-xs font-bold text-[#dbeafe]">
              {filteredJournal.length} قيد
            </span>
          </div>
        </div>

        {journal.length === 0 ? (
          <div className="flex flex-col items-center gap-3 p-10 text-center">
            <span className="grid h-14 w-14 place-items-center rounded-2xl bg-slate-100 text-slate-400">
              <Inbox className="h-7 w-7" />
            </span>
            <p className="text-sm font-bold text-slate-500">لا توجد قيود يومية بعد</p>
            <p className="text-xs text-slate-400">ابدأ بإضافة قيد جديد أعلاه أو استورد ملف Excel</p>
            <div className="[&>label]:border-emerald-700 [&>label]:bg-emerald-600 [&>label]:text-white [&>label]:hover:bg-emerald-700">
              <ImportButton kind="journal" />
            </div>
          </div>
        ) : (
          <>
            <div className="overflow-auto max-h-[72vh]">
              <table className="w-full min-w-0 table-auto border-collapse text-center text-sm sm:text-base font-semibold">
                <thead className="sticky top-0 z-20 bg-[#2e6b8a] text-white shadow-md">
                  <tr>
                    {JOURNAL_COLS.map((c) => (
                      <th
                        key={c.key}
                        className="min-w-0 max-w-[120px] whitespace-nowrap border-b border-white/10 text-center font-bold leading-tight !px-1 !py-1.5 sm:!px-2 sm:!py-2 !text-sm sm:!text-base"
                      >
                        {c.label}
                      </th>
                    ))}
                    <th className="min-w-0 max-w-[120px] whitespace-nowrap border-b border-white/10 text-center font-bold leading-tight !px-1 !py-1.5 sm:!px-2 sm:!py-2 !text-sm sm:!text-base">
                      الإجراءات
                    </th>
                  </tr>
                  <tr className="bg-[#f4f9fd] text-slate-700">
                    {JOURNAL_COLS.map((c) => (
                      <th key={c.key} className="border-b border-slate-200 !px-1 !py-1.5 sm:!px-2 sm:!py-2">
                        <input
                          value={journalFilters[c.key] || ""}
                          onChange={(e) => setJournalFilter(c.key, e.target.value)}
                          placeholder="تصفية..."
                          aria-label={`تصفية ${c.label}`}
                          className="w-full min-w-[58px] rounded border border-slate-300 bg-white px-1 py-1 text-xs font-bold text-slate-800 outline-none transition-colors placeholder:text-slate-400 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 sm:text-sm"
                        />
                      </th>
                    ))}
                    <th className="border-b border-slate-200 !px-1 !py-1.5 sm:!px-2 sm:!py-2" />
                  </tr>
                </thead>
                <tbody>
                  {filteredJournal.length === 0 ? (
                    <tr>
                      <td colSpan={JOURNAL_COLS.length + 1} className="border-b border-slate-100 bg-white px-2 py-4 text-center text-sm font-bold text-slate-500 sm:text-base">
                        لا توجد قيود تطابق حقول التصفية.
                      </td>
                    </tr>
                  ) : (
                  filteredJournal.map((j) => (
                    <tr
                      key={j.id}
                      className="border-b border-slate-100 odd:bg-white even:bg-slate-50/70 transition-colors hover:bg-sky-50/60"
                    >
                      <td className="min-w-0 max-w-[90px] numeric-cell font-mono text-slate-600 !px-1 !py-1.5 sm:!px-2 sm:!py-2 !text-sm sm:!text-base whitespace-nowrap">
                        <span className={journalClampCls}>{j.formNo || "—"}</span>
                      </td>
                      <td className="min-w-0 max-w-[90px] text-slate-600 !px-1 !py-1.5 sm:!px-2 sm:!py-2 !text-sm sm:!text-base">
                        <span className={journalClampCls}>{j.settlement || "—"}</span>
                      </td>
                      <td className="min-w-0 max-w-[105px] date-cell numeric-cell font-mono text-slate-600 !px-1 !py-1.5 sm:!px-2 sm:!py-2 !text-sm sm:!text-base whitespace-nowrap">
                        <span className={journalClampCls}>{j.date || "—"}</span>
                      </td>
                      <td
                        className="min-w-0 max-w-[180px] font-medium text-slate-800 !px-1 !py-1.5 sm:!px-2 sm:!py-2 !text-sm sm:!text-base"
                        title={j.description}
                      >
                        <span className={journalClampCls}>{j.description || "—"}</span>
                      </td>
                      <td className="min-w-0 max-w-[180px] !px-1 !py-1.5 sm:!px-2 sm:!py-2 !text-sm sm:!text-base">
                        <span className={`${journalClampCls} rounded-full bg-emerald-50 px-2 py-1 text-sm font-bold text-black-800`}>
                          {j.debitAccount || "—"}
                        </span>
                      </td>
                      <td className="min-w-0 max-w-[180px] !px-1 !py-1.5 sm:!px-2 sm:!py-2 !text-sm sm:!text-base">
                        <span className={`${journalClampCls} rounded-full bg-rose-50 px-2 py-1 text-sm font-bold text-rose-800`}>
                          {j.creditAccount || "—"}
                        </span>
                      </td>
                      <td className="min-w-0 max-w-[105px] numeric-cell font-mono font-black text-black-700 !px-1 !py-1.5 sm:!px-2 sm:!py-2 !text-sm sm:!text-base whitespace-nowrap">
                        <span className={journalClampCls}>{j.debit ? j.debit.toLocaleString("en-US") : "—"}</span>
                      </td>
                      <td className="min-w-0 max-w-[105px] numeric-cell font-mono font-black text-rose-700 !px-1 !py-1.5 sm:!px-2 sm:!py-2 !text-sm sm:!text-base whitespace-nowrap">
                        <span className={journalClampCls}>{j.credit ? j.credit.toLocaleString("en-US") : "—"}</span>
                      </td>
                      <td className="min-w-0 !px-1 !py-1.5 sm:!px-2 sm:!py-2 !text-sm sm:!text-base">
                        <div className="flex justify-center gap-1.5">
                          <button
                            onClick={() => startEdit(j)}
                            className="grid h-8 w-8 place-items-center rounded-lg bg-sky-50 text-sky-600 transition-colors hover:bg-sky-600 hover:text-white"
                          >
                            <Edit className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => deleteJournal(j.id)}
                            className="grid h-8 w-8 place-items-center rounded-lg bg-rose-50 text-rose-600 transition-colors hover:bg-rose-600 hover:text-white"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                  )}
                </tbody>
                <tfoot className="sticky bottom-0 bg-[#f4f9fd]">
                  <tr className="border-t-2 border-[#b8d4e8]/60">
                    <td colSpan={6} className="text-right font-bold text-slate-700 !px-1 !py-1.5 sm:!px-2 sm:!py-2 !text-sm sm:!text-base whitespace-nowrap">
                      الإجمالي
                    </td>
                    <td className="numeric-cell font-mono font-black text-black-800 !px-1 !py-1.5 sm:!px-2 sm:!py-2 !text-sm sm:!text-base whitespace-nowrap">
                      {grandDebit.toLocaleString("en-US")}
                    </td>
                    <td className="numeric-cell font-mono font-black text-rose-800 !px-1 !py-1.5 sm:!px-2 sm:!py-2 !text-sm sm:!text-base whitespace-nowrap">
                      {grandCredit.toLocaleString("en-US")}
                    </td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
