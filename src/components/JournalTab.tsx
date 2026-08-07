import { useState, useMemo, useRef, useEffect } from "react";
import { useStore } from "@/lib/store";
import { Edit, Save, Trash2, Plus, X, ChevronDown, Search } from "lucide-react";
import { toast } from "sonner";
import ImportButton from "@/components/ImportButton";
import TabActions from "@/components/TabActions";
import type { Journal } from "@/lib/store";

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

// 1. إضافة حقل الوصف للسطر
interface EntryLine {
  id: string;
  account: string;
  amount: number;
  type: "debit" | "credit";
  description?: string;
}

// ── قائمة منسدلة مع بحث ومودال على الموبايل ──────────────────────────────
function AccountDropdown({
  value,
  onChange,
  type,
  lineIndex,
}: {
  value: string;
  onChange: (v: string) => void;
  type: "debit" | "credit";
  lineIndex: number;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const isDebit = type === "debit";
  const accent = isDebit ? "emerald" : "rose";

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
    <div ref={wrapRef} className="relative w-full">
      <button
        type="button"
        onClick={handleOpen}
        className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl border-2
          ${
            value
              ? isDebit
                ? "border-emerald-500 bg-emerald-50 text-emerald-900"
                : "border-rose-500 bg-rose-50 text-rose-900"
              : "border-slate-300 bg-slate-50 text-slate-400"
          }
          text-sm font-medium text-right transition-all active:scale-95`}
      >
        <span className="truncate flex-1 text-right leading-snug">
          {value || (isDebit ? "اختر الحساب المدين…" : "اختر الحساب الدائن…")}
        </span>
        <ChevronDown
          className={`w-4 h-4 shrink-0 transition-transform ${open ? "rotate-180" : ""} text-slate-400`}
        />
      </button>

      {open && (
        <div
          ref={listRef}
          className="absolute right-0 left-0 mt-1 z-[999] rounded-2xl border-2 border-slate-200 bg-white shadow-2xl overflow-hidden"
          style={{ maxHeight: "55vh" }}
        >
          <div
            className={`flex items-center gap-2 px-3 py-2.5 border-b-2
            ${isDebit ? "bg-emerald-600" : "bg-rose-600"}`}
          >
            <Search className="w-4 h-4 text-white shrink-0" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={isDebit ? "ابحث في الحسابات المدينة…" : "ابحث في الحسابات الدائنة…"}
              className="flex-1 bg-transparent text-white placeholder-white/70 text-sm outline-none text-right"
              onKeyDown={(e) => e.key === "Escape" && setOpen(false)}
            />
            <button onClick={() => setOpen(false)} className="text-white/80 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="px-3 py-1.5 bg-slate-50 border-b border-slate-100 text-xs text-slate-400 text-right">
            {filtered.length} حساب متاح
          </div>

          <div className="overflow-y-auto" style={{ maxHeight: "calc(55vh - 80px)" }}>
            {filtered.length === 0 ? (
              <p className="p-4 text-center text-slate-400 text-sm">لا توجد نتائج مطابقة</p>
            ) : (
              filtered.map((acc, i) => (
                <button
                  key={acc}
                  type="button"
                  onClick={() => pick(acc)}
                  className={`w-full text-right px-4 py-3 text-sm font-medium leading-snug transition-colors
                    border-b border-slate-100 last:border-0
                    ${
                      value === acc
                        ? isDebit
                          ? "bg-emerald-100 text-emerald-900 font-bold"
                          : "bg-rose-100 text-rose-900 font-bold"
                        : "text-slate-700 hover:bg-slate-50 active:bg-slate-100"
                    }
                    `}
                >
                  <span
                    className={`inline-block w-6 text-center text-xs font-bold ml-2
                    ${isDebit ? "text-emerald-400" : "text-rose-400"}`}
                  >
                    {i + 1}
                  </span>
                  {acc}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── hook تصغير الخط ───────────────────────────────────────────────────────
function useFitText(ref: React.RefObject<HTMLTableElement | null>) {
  useEffect(() => {
    const table = ref.current;
    if (!table) return;
    function fitCells() {
      table!.querySelectorAll<HTMLElement>("td, th").forEach((cell) => {
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

// ── المكوّن الرئيسي ───────────────────────────────────────────────────────
export default function JournalTab() {
  const { journal, addJournal, updateJournal, deleteJournal, clearJournal } = useStore();

  const tableRef1 = useRef<HTMLTableElement>(null);
  const tableRef2 = useRef<HTMLTableElement>(null);
  useFitText(tableRef1);
  useFitText(tableRef2);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [formNo, setFormNo] = useState("");
  const [settlement, setSettlement] = useState("");
  const [date, setDate] = useState("");
  const [description, setDescription] = useState(""); // البيان العام

  // 2. تحديث القيم الافتراضية لتشمل حقل الوصف
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

  const totalDebit = lines
    .filter((l) => l.type === "debit")
    .reduce((s, l) => s + (Number(l.amount) || 0), 0);
  const totalCredit = lines
    .filter((l) => l.type === "credit")
    .reduce((s, l) => s + (Number(l.amount) || 0), 0);
  const isBalanced = totalDebit > 0 && totalCredit > 0 && totalDebit === totalCredit;

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

        // 3. دمج البيان العام مع بيان السطرين للحصول على تفصيل دقيق في الجدول
        const combinedDescription = [description, dl.description, cl.description]
          .filter((desc) => desc && desc.trim() !== "") // إزالة الحقول الفارغة
          .join(" - "); // الفصل بينهم بشرطة

        const payload: Omit<Journal, "id"> = {
          date,
          formNo,
          settlement,
          description: combinedDescription, // استخدام البيان المدمج
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

  // ── مساعد لعرض سطر واحد (مدين أو دائن) ──────────────────────────────
  const renderLine = (l: EntryLine, idx: number) => {
    const isDebit = l.type === "debit";
    return (
      <div
        key={l.id}
        className={`rounded-xl border-2 p-3 flex flex-col gap-3
          ${isDebit ? "border-emerald-300 bg-emerald-50/60" : "border-rose-300 bg-rose-50/60"}`}
      >
        {/* الصف العلوي: تسمية + زر حذف */}
        <div className="flex items-center justify-between">
          <span
            className={`text-xs font-black px-3 py-1 rounded-full
            ${isDebit ? "bg-emerald-600 text-white" : "bg-rose-600 text-white"}`}
          >
            {isDebit ? `مدين ${idx + 1}` : `دائن ${idx + 1}`}
          </span>
          <button
            onClick={() => removeLine(l.id)}
            className="p-1.5 rounded-full text-slate-400 hover:bg-red-100 hover:text-red-600 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* القائمة المنسدلة */}
        <AccountDropdown
          value={l.account}
          onChange={(v) => updateLine(l.id, "account", v)}
          type={l.type}
          lineIndex={idx}
        />

        {/* حقول الإدخال: البيان والمبلغ جنبًا إلى جنب */}
        <div className="flex gap-2">
          {/* 4. حقل إدخال بيان السطر (الجديد) */}
          <input
            type="text"
            value={l.description || ""}
            onChange={(e) => updateLine(l.id, "description", e.target.value)}
            placeholder="بيان السطر (اختياري)"
            className={`flex-1 border-2 rounded-xl px-3 py-2.5 text-sm outline-none bg-white
              ${
                isDebit
                  ? "border-emerald-300 focus:border-emerald-500 text-emerald-900"
                  : "border-rose-300 focus:border-rose-500 text-rose-900"
              }`}
          />

          {/* حقل المبلغ */}
          <input
            type="number"
            inputMode="decimal"
            value={l.amount || ""}
            onChange={(e) => updateLine(l.id, "amount", e.target.value)}
            placeholder="المبلغ 0.00"
            className={`w-1/3 border-2 rounded-xl px-3 py-2.5 text-center font-mono font-bold text-base outline-none bg-white
              ${
                isDebit
                  ? "border-emerald-300 focus:border-emerald-500 text-emerald-700"
                  : "border-rose-300 focus:border-rose-500 text-rose-700"
              }`}
          />
        </div>
      </div>
    );
  };

  return (
    <div className="w-full space-y-5" dir="rtl">
      {/* ══ بطاقة إدخال القيد ══════════════════════════════════════════════ */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {/* رأس البطاقة */}
        <div className="bg-gradient-to-l from-slate-800 to-slate-950 px-4 py-3 flex flex-wrap items-center justify-between gap-3">
          <h3 className="font-bold text-base text-white">
            {editingId ? "✏️ تعديل القيد المركب" : "➕ قيد يومية مركب"}
          </h3>
          <div className="flex gap-2 flex-wrap">
            <ImportButton kind="journal" />
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
              onClear={clearJournal}
            />
          </div>
        </div>

        <div className="p-4 space-y-4">
          {/* بيانات رأس القيد */}
          <div className="grid grid-cols-2 gap-3">
            <input
              placeholder="رقم الاستمارة"
              value={formNo}
              onChange={(e) => setFormNo(e.target.value)}
              className="border-2 border-slate-200 focus:border-teal-500 rounded-xl px-3 py-2.5 text-sm text-center outline-none bg-slate-50"
            />
            <input
              placeholder="كشف التسوية"
              value={settlement}
              onChange={(e) => setSettlement(e.target.value)}
              className="border-2 border-slate-200 focus:border-teal-500 rounded-xl px-3 py-2.5 text-sm text-center outline-none bg-slate-50"
            />
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="col-span-2 border-2 border-slate-200 focus:border-teal-500 rounded-xl px-3 py-2.5 text-sm text-center outline-none bg-slate-50"
            />
            <input
              placeholder="البيان العام للقيد (اختياري في حال تعبئة بيانات الأسطر)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="col-span-2 border-2 border-slate-200 focus:border-teal-500 rounded-xl px-3 py-2.5 text-sm text-center outline-none bg-slate-50"
            />
          </div>

          {/* ── الجانب المدين ────────────────────────────────────────── */}
          <div className="rounded-2xl border-2 border-emerald-200 overflow-hidden">
            <div className="bg-emerald-600 px-4 py-2 flex items-center justify-between">
              <span className="text-white font-bold text-sm">الجانب المدين (الاستخدامات)</span>
              <span className="bg-white/20 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                {lines.filter((l) => l.type === "debit").length} سطر
              </span>
            </div>
            <div className="p-3 space-y-3 bg-white">
              {lines.filter((l) => l.type === "debit").map((l, i) => renderLine(l, i))}
              <button
                onClick={() => addLine("debit")}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 border-dashed border-emerald-300 text-emerald-700 text-sm font-bold hover:bg-emerald-50 active:bg-emerald-100 transition-colors"
              >
                <Plus className="w-4 h-4" /> إضافة حساب مدين
              </button>
            </div>
          </div>

          {/* ── الجانب الدائن ────────────────────────────────────────── */}
          <div className="rounded-2xl border-2 border-rose-200 overflow-hidden">
            <div className="bg-rose-600 px-4 py-2 flex items-center justify-between">
              <span className="text-white font-bold text-sm">الجانب الدائن (الموارد)</span>
              <span className="bg-white/20 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                {lines.filter((l) => l.type === "credit").length} سطر
              </span>
            </div>
            <div className="p-3 space-y-3 bg-white">
              {lines.filter((l) => l.type === "credit").map((l, i) => renderLine(l, i))}
              <button
                onClick={() => addLine("credit")}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 border-dashed border-rose-300 text-rose-700 text-sm font-bold hover:bg-rose-50 active:bg-rose-100 transition-colors"
              >
                <Plus className="w-4 h-4" /> إضافة حساب دائن
              </button>
            </div>
          </div>

          {/* ── شريط التوازن ─────────────────────────────────────────── */}
          <div
            className={`rounded-xl px-4 py-3 flex flex-wrap items-center justify-between gap-2
            ${isBalanced ? "bg-emerald-50 border-2 border-emerald-400" : "bg-amber-50 border-2 border-amber-300"}`}
          >
            <div className="flex gap-4 text-sm font-mono font-bold">
              <span className="text-emerald-700">مدين: {totalDebit.toLocaleString()}</span>
              <span className="text-slate-400">|</span>
              <span className="text-rose-700">دائن: {totalCredit.toLocaleString()}</span>
            </div>
            <span
              className={`text-sm font-bold ${isBalanced ? "text-emerald-700" : "text-amber-700"}`}
            >
              {isBalanced
                ? "✅ متوازن"
                : totalDebit > 0 || totalCredit > 0
                  ? "⚠️ غير متوازن"
                  : "أدخل المبالغ"}
            </span>
          </div>

          {/* ── أزرار الحفظ/الإلغاء ──────────────────────────────────── */}
          <div className="flex gap-3">
            <button
              onClick={handleSave}
              className="flex-1 bg-teal-600 hover:bg-teal-700 active:bg-teal-800 text-white px-4 py-3 rounded-xl flex items-center justify-center gap-2 font-bold text-sm transition-all shadow-sm"
            >
              <Save className="w-4 h-4" />
              {editingId ? "تحديث القيد" : "حفظ القيد المركب"}
            </button>
            {editingId && (
              <button
                onClick={resetForm}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-3 rounded-xl font-bold text-sm transition-all"
              >
                إلغاء
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ══ جدول استعراض القيود ════════════════════════════════════════════ */}
      <div className="bg-white border border-black rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-auto max-h-[60vh] relative">
          <table ref={tableRef2} className="w-full text-sm border-collapse text-center">
            <thead className="bg-slate-800 text-white sticky top-0 z-20 shadow-md">
              <tr>
                <th className="border border-black p-3 text-center font-semibold whitespace-nowrap overflow-hidden">
                  رقم الاستمارة
                </th>
                <th className="border border-black p-3 text-center font-semibold whitespace-nowrap overflow-hidden">
                  التسوية
                </th>
                <th className="border border-black p-3 text-center font-semibold whitespace-nowrap overflow-hidden">
                  التاريخ
                </th>
                <th className="border border-black p-3 text-center font-semibold whitespace-nowrap overflow-hidden">
                  البيان
                </th>
                <th className="border border-black p-3 text-center font-semibold whitespace-nowrap overflow-hidden">
                  الحساب المدين
                </th>
                <th className="border border-black p-3 text-center font-semibold whitespace-nowrap overflow-hidden">
                  الحساب الدائن
                </th>
                <th className="border border-black p-3 text-center font-semibold whitespace-nowrap overflow-hidden">
                  مدين
                </th>
                <th className="border border-black p-3 text-center font-semibold whitespace-nowrap overflow-hidden">
                  دائن
                </th>
                <th className="border border-black p-3 text-center font-semibold whitespace-nowrap overflow-hidden">
                  الإجراءات
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black">
              {journal.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-10 text-center text-slate-400 font-medium">
                    لا توجد قيود يومية — ابدأ بإضافة قيد جديد أو استيراد ملف
                  </td>
                </tr>
              ) : (
                journal.map((j) => (
                  <tr key={j.id} className="hover:bg-slate-50 transition-colors">
                    <td className="border border-black p-3 font-mono text-slate-600 text-center whitespace-nowrap overflow-hidden">
                      {j.formNo || "—"}
                    </td>
                    <td className="border border-black p-3 text-slate-600 text-center whitespace-nowrap overflow-hidden">
                      {j.settlement || "—"}
                    </td>
                    <td className="border border-black p-3 font-mono text-slate-600 text-center whitespace-nowrap overflow-hidden">
                      {j.date || "—"}
                    </td>
                    <td
                      className="border border-black p-3 text-slate-800 font-medium text-center whitespace-nowrap overflow-hidden"
                      title={j.description}
                    >
                      {j.description || "—"}
                    </td>
                    <td className="border border-black p-3 text-emerald-700 font-bold text-center whitespace-nowrap overflow-hidden">
                      {j.debitAccount || "—"}
                    </td>
                    <td className="border border-black p-3 text-rose-700 font-bold text-center whitespace-nowrap overflow-hidden">
                      {j.creditAccount || "—"}
                    </td>
                    <td className="border border-black p-3 font-mono font-bold text-emerald-600 bg-emerald-50/20 text-center whitespace-nowrap overflow-hidden">
                      {j.debit ? j.debit.toLocaleString() : "—"}
                    </td>
                    <td className="border border-black p-3 font-mono font-bold text-rose-600 bg-rose-50/20 text-center whitespace-nowrap overflow-hidden">
                      {j.credit ? j.credit.toLocaleString() : "—"}
                    </td>
                    <td className="border border-black p-3 text-center whitespace-nowrap overflow-hidden">
                      <div className="flex justify-center gap-1.5">
                        <button
                          onClick={() => {
                            setEditingId(j.id);
                            setFormNo(j.formNo || "");
                            setSettlement(j.settlement || "");
                            setDate(j.date || "");
                            // 5. استرجاع الوصف وتعبئته عند الضغط على تعديل
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
                          }}
                          className="p-1 text-blue-600 bg-blue-50 rounded hover:bg-blue-600 hover:text-white transition-colors"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => deleteJournal(j.id)}
                          className="p-1 text-rose-600 bg-rose-50 rounded hover:bg-rose-600 hover:text-white transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
