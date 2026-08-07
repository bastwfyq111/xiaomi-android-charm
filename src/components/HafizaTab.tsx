import React, { useMemo, useState } from "react";
import { useStore, type Trainee } from "@/lib/store";
import { fmt, today } from "@/lib/format";
import { DESCRIPTIONS } from "@/lib/accounts";
import { toast } from "sonner";
import ImportButton from "./ImportButton";
import { useTableControls, sortIndicator } from "@/hooks/useTableControls";
import {
  Printer,
  X,
  Plus,
  Edit,
  Trash2,
  Search,
  Save,
  Eraser,
  CheckSquare,
  Calendar,
  Hash,
  FileText,
  User,
  Sparkles,
} from "lucide-react";
import TabActions from "./TabActions";

// تعريف أعمدة الجدول الثابتة
const COLS = [
  { key: "name", label: "الاسم" },
  { key: "batch", label: "الدفعة" },
  { key: "specialty", label: "التخصص" },
  { key: "date", label: "التاريخ" },
  { key: "hafizaNo", label: "رقم الحافظة" },
  { key: "description", label: "البيان" },
  { key: "hafizaAmount", label: "مبلغ الحافظة " },
  { key: "notifyDate", label: "تاريخ التوريد" },
  { key: "notifyNo", label: "رقم الاشعار" },
  { key: "notifyAmount", label: "مبلغ التوريد" },
];

type Form = {
  name: string;
  batch: string;
  specialty: string;
  date: string;
  hafizaNo: string;
  description: string;
  hafizaAmount: string;
  notifyDate: string;
  notifyNo: string;
  notifyAmount: string;
};

const empty: Form = {
  name: "",
  batch: "",
  specialty: "",
  date: today(),
  hafizaNo: "",
  description: "",
  hafizaAmount: "",
  notifyDate: "",
  notifyNo: "",
  notifyAmount: "",
};

export default function HafizaTab() {
  const { trainees, hafiza, addHafiza, deleteHafiza, addTrainee, updateHafiza, clearHafiza } =
    useStore();
  const [form, setForm] = useState<Form>(empty);
  const [nameQuery, setNameQuery] = useState("");
  const [showSugg, setShowSugg] = useState(false);

  // التحكم بالتعديل الفوري داخل الخلايا
  const [activeCell, setActiveCell] = useState<{ rowId: string; colKey: string } | null>(null);
  const [cellValue, setCellValue] = useState("");

  const {
    rows: filtered,
    sortKey,
    sortDir,
    toggleSort,
    filters,
    setFilter,
    clearFilters,
  } = useTableControls(
    hafiza,
    COLS.map((c) => c.key),
  );

  // احتساب الإجماليات بشكل ديناميكي بناءً على البيانات المصنوعة في البحث والتصفية
  const totalHafizaAmount = useMemo(() => {
    return filtered.reduce((sum, item) => sum + (Number(item.hafizaAmount) || 0), 0);
  }, [filtered]);

  const totalNotifyAmount = useMemo(() => {
    return filtered.reduce((sum, item) => sum + (Number(item.notifyAmount) || 0), 0);
  }, [filtered]);

  // إعداد قائمة المقترحات لأسماء المتدربين لتسهيل التعبئة السرية
  const nameSuggestions = useMemo(() => {
    const q = nameQuery.trim();
    if (!q) return trainees.slice(0, 8);
    return trainees.filter((t) => t.name.includes(q)).slice(0, 8);
  }, [trainees, nameQuery]);

  const pickName = (t: Trainee) => {
    setForm((f) => ({ ...f, name: t.name, batch: t.batch, specialty: t.specialty }));
    setNameQuery(t.name);
    setShowSugg(false);
  };

  const submit = () => {
    const amount = Number(form.hafizaAmount) || 0;
    const notifyAmt = Number(form.notifyAmount) || 0;

    if (!form.name || !form.hafizaNo) {
      toast.error("يرجى إدخال الاسم ورقم الحافظة على الأقل");
      return;
    }

    addHafiza({
      name: form.name,
      batch: form.batch,
      specialty: form.specialty,
      date: form.date,
      hafizaNo: form.hafizaNo,
      description: form.description,
      hafizaAmount: amount,
      notifyDate: form.notifyDate,
      notifyNo: form.notifyNo,
      notifyAmount: notifyAmt,
    });

    if (!trainees.find((t) => t.name === form.name)) {
      addTrainee({ name: form.name, batch: form.batch, specialty: form.specialty });
    }
    toast.success("تم حفظ الحافظة وترحيل البيانات بنجاح");
    setForm(empty);
    setNameQuery("");
  };

  const handleCopyAmountsToNotify = () => {
    if (filtered.length === 0) {
      toast.error("لا توجد سجلات حالية لنقل مبالغها");
      return;
    }

    filtered.forEach((row) => {
      updateHafiza(row.id, {
        ...row,
        notifyAmount: Number(row.hafizaAmount) || 0,
      });
    });

    toast.success(`تمت تسوية ونسخ المبالغ لـ (${filtered.length}) سجل بنجاح!`);
  };

  const handleCellClick = (rowId: string, colKey: string, currentVal: any) => {
    setActiveCell({ rowId, colKey });
    setCellValue(String(currentVal ?? ""));
  };

  const handleCellSave = (row: any) => {
    if (!activeCell) return;

    const { colKey, rowId } = activeCell;
    let finalVal: any = cellValue;

    if (colKey === "hafizaAmount" || colKey === "notifyAmount") {
      finalVal = Number(cellValue) || 0;
    }

    updateHafiza(rowId, {
      ...row,
      [colKey]: finalVal,
    });

    setActiveCell(null);
    toast.success("تم تحديث الخلية تلقائياً");
  };

  return (
    <div className="w-full space-y-6 p-0" dir="rtl">
      {/* ========== 1. نموذج إدخال الحوافظ المطور ========== */}
      <div className="w-full bg-white shadow-sm border border-black rounded-2xl overflow-hidden">
        <div className="bg-gradient-to-r from-amber-600 via-amber-500 to-amber-600 px-5 py-4 flex flex-wrap justify-between items-center gap-3 border-b-2 border-black">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-slate-950/10 rounded-lg text-slate-950">
              <Plus className="w-4 h-4" />
            </div>
            <h2 className="text-sm sm:text-base font-black text-slate-950">
              إضافة حافظة توريد جديدة للنظام
            </h2>
          </div>
          <div className="bg-slate-950 text-amber-200 border border-slate-950 rounded-xl text-xs font-bold hover:bg-slate-900 transition-all [&_button]:!text-amber-200">
            <ImportButton kind="hafiza" />
          </div>
        </div>

        <div className="p-4 bg-slate-50/40">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 items-end">
            {/* حقل البحث الذكي عن الاسم */}
            <div className="relative col-span-2">
              <label className="block text-xs font-bold text-amber-800 mb-1.5 mr-1">
                الاسم الكامل للمتدرب *
              </label>
              <div className="relative flex items-center">
                <span className="absolute right-3 z-10">
                  <User className="w-4 h-4 text-slate-400" />
                </span>
                <input
                  value={nameQuery}
                  onChange={(e) => {
                    setNameQuery(e.target.value);
                    setForm({ ...form, name: e.target.value });
                    setShowSugg(true);
                  }}
                  onFocus={() => setShowSugg(true)}
                  onBlur={() => setTimeout(() => setShowSugg(false), 200)}
                  placeholder="ابحث أو اكتب اسم المتدرب الجديد..."
                  className="w-full pr-9 pl-3 py-2 text-sm border border-slate-300 rounded-xl outline-none focus:border-[#10528e] bg-white text-slate-800 font-medium transition-colors shadow-sm"
                />
              </div>
              {showSugg && nameSuggestions.length > 0 && (
                <ul className="absolute z-30 left-0 right-0 mt-1 bg-white border border-slate-300 rounded-xl shadow-xl max-h-60 overflow-y-auto">
                  {nameSuggestions.map((t) => (
                    <li key={t.name}>
                      <button
                        type="button"
                        onMouseDown={() => pickName(t)}
                        className="w-full text-right px-4 py-2.5 hover:bg-blue-50/50 border-b border-slate-100 last:border-0 transition-colors"
                      >
                        <div className="font-bold text-sm text-slate-800">{t.name}</div>
                        <div className="text-xs text-[#10528e] mt-0.5 font-bold">
                          {t.specialty} — {t.batch}
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <Field
              label="الدفعة"
              icon={<Sparkles className="w-4 h-4 text-slate-400" />}
              v={form.batch}
              on={(v) => setForm({ ...form, batch: v })}
            />
            <Field
              label="التخصص الطبي"
              icon={<FileText className="w-4 h-4 text-slate-400" />}
              v={form.specialty}
              on={(v) => setForm({ ...form, specialty: v })}
            />
            <Field
              label="التاريخ"
              type="date"
              icon={<Calendar className="w-4 h-4 text-slate-400" />}
              v={form.date}
              on={(v) => setForm({ ...form, date: v })}
            />
            <Field
              label="رقم الحافظة *"
              icon={<Hash className="w-4 h-4 text-slate-400" />}
              v={form.hafizaNo}
              on={(v) => setForm({ ...form, hafizaNo: v })}
            />
            <Field
              label="مبلغ الحافظة *"
              type="number"
              icon={<span className="text-xs text-slate-400 font-bold">ر.ي</span>}
              v={form.hafizaAmount}
              on={(v) => setForm({ ...form, hafizaAmount: v })}
            />

            {/* حقل البيان المتكامل */}
            <div>
              <label className="block text-xs font-bold text-amber-800 mb-1.5 mr-1">
                البيان والشرح
              </label>
              <div className="relative flex items-center">
                <span className="absolute right-3 z-10">
                  <FileText className="w-4 h-4 text-slate-400" />
                </span>
                <input
                  list="hafiza-descriptions"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="اكتب أو اختر..."
                  className="w-full pr-9 pl-3 py-2 text-sm border border-slate-300 rounded-xl outline-none focus:border-[#10528e] bg-white text-slate-800 font-medium transition-colors shadow-sm"
                />
              </div>
              <datalist id="hafiza-descriptions">
                {Array.from(
                  new Set([...DESCRIPTIONS, ...hafiza.map((h) => h.description).filter(Boolean)]),
                ).map((d) => (
                  <option key={d} value={d} />
                ))}
              </datalist>
            </div>

            <Field
              label="تاريخ التوريد"
              type="date"
              icon={<Calendar className="w-4 h-4 text-slate-400" />}
              v={form.notifyDate}
              on={(v) => setForm({ ...form, notifyDate: v })}
            />
            <Field
              label="رقم الاشعار"
              icon={<Hash className="w-4 h-4 text-slate-400" />}
              v={form.notifyNo}
              on={(v) => setForm({ ...form, notifyNo: v })}
            />
            <Field
              label="مبلغ التوريد"
              type="number"
              icon={<span className="text-xs text-slate-400 font-bold">ر.ي</span>}
              v={form.notifyAmount}
              on={(v) => setForm({ ...form, notifyAmount: v })}
            />
          </div>

          {/* أزرار العمليات التفاعلية للنموذج */}
          <div className="mt-5 flex gap-2 flex-wrap border border-black pt-4 shadow-sm">
            <button
              onClick={submit}
              className="flex items-center gap-2 px-5 py-2 bg-amber-600 text-slate-950 rounded-xl font-black hover:bg-amber-500 active:scale-95 transition-all text-xs shadow-sm border border-black"
            >
              <Save className="w-4 h-4" /> حفظ وترحيل الحافظة
            </button>
            <button
              onClick={() => {
                setForm(empty);
                setNameQuery("");
              }}
              className="flex items-center gap-2 px-4 py-2 border border-black text-amber-800 bg-amber-50 rounded-xl font-bold hover:bg-amber-100 active:scale-95 transition-all text-xs shadow-sm"
            >
              <Eraser className="w-4 h-4" /> تصفية الحقول
            </button>
          </div>
        </div>
      </div>

      {/* ========== 2. جدول مراقبة وتدقيق الحوافظ ========== */}
      <div className="w-full bg-white shadow-sm border border-black rounded-xl overflow-hidden">
        <div className="bg-gradient-to-r from-amber-600 via-amber-500 to-amber-600 px-5 py-3.5 flex flex-wrap justify-between items-center gap-3 border-b-2 border-black">
          <div>
            <h2 className="text-xs sm:text-sm font-black text-slate-950 flex items-center gap-2">
              📑 كشف قيود حوافظ التوريد المعينة
              <span className="bg-slate-950/10 text-slate-950 px-2 py-0.5 rounded-full text-[11px] font-black">
                {hafiza.length}
              </span>
            </h2>
          </div>
          <div className="flex gap-1.5 items-center bg-slate-950/10 backdrop-blur rounded-xl p-1 border border-slate-950/20">
            <button
              onClick={handleCopyAmountsToNotify}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-950 hover:bg-slate-800 active:scale-95 text-amber-300 font-black rounded-lg text-xs transition-all"
              title="نسخ مبالغ الحافظة إلى عمود مبلغ التوريد"
            >
              <CheckSquare className="w-3.5 h-3.5" /> نسخ المبالغ
            </button>
            {Object.values(filters).some(Boolean) && (
              <button
                onClick={clearFilters}
                className="px-3 py-1.5 bg-white hover:bg-slate-100 active:scale-95 text-slate-900 rounded-lg text-xs font-bold transition-all"
              >
                مسح المرشحات
              </button>
            )}
            <div className="[&_button]:!text-amber-200 [&_button]:!bg-slate-950/70 [&_button:hover]:!bg-slate-900">
              <TabActions
                title="حوافظ التوريد"
                rows={hafiza}
                columns={COLS}
                fileName="حوافظ-التوريد"
                numericKeys={["hafizaAmount", "notifyAmount"]}
                onClear={clearHafiza}
              />
            </div>
          </div>
        </div>

        <div className="bg-white">
          <div className="overflow-x-auto overflow-y-auto max-h-[550px] relative">
            <table className="w-full border-collapse border border-black table-auto">
              {/* تعديل رأس الجدول ليصبح أزرق لامع مع نص أبيض عريض */}
              <thead className="sticky top-0 z-20 shadow-md text-white font-black text-sm bg-gradient-to-r from-blue-600 via-blue-500 to-blue-700">
                <tr>
                  {/* عمود المسلسل 'م' */}
                  <th className="p-2 border border-black/10 text-center vertical-align-middle w-10 bg-blue-700/50 sticky top-0 z-20">
                    م
                  </th>

                  {/* رؤوس الأعمدة الديناميكية */}
                  {COLS.map((c) => (
                    <th
                      key={c.key}
                      className="p-2 border border-black/10 text-center vertical-align-middle whitespace-nowrap min-w-[85px] cursor-pointer hover:bg-blue-400/30 transition-all select-none sticky top-0 z-20"
                      onClick={() => toggleSort(c.key)}
                    >
                      <div className="flex items-center justify-center gap-1.5">
                        <span className="drop-shadow-md">{c.label}</span>
                        <span className="text-[10px] text-blue-100 font-mono">
                          {sortIndicator(sortKey === c.key, sortDir)}
                        </span>
                      </div>
                    </th>
                  ))}

                  {/* عمود الإجراءات */}
                  <th className="p-2 border border-black/10 text-center vertical-align-middle bg-blue-700/50 sticky top-0 z-20 min-w-[60px]">
                    إجراءات
                  </th>
                </tr>

                {/* صف التصفية (الفلاتر) - يفضل أن يكون بلون فاتح لكي لا يختلط مع الرأس */}
                <tr className="bg-slate-100">
                  <th className="p-1 border border-black/10 bg-slate-100"></th>
                  {COLS.map((c) => (
                    <th key={c.key} className="p-1 border border-black/10 bg-slate-100">
                      <input
                        value={filters[c.key] || ""}
                        onChange={(e) => setFilter(c.key, e.target.value)}
                        placeholder="تصفية..."
                        className="w-full text-center px-1.5 py-1 text-[11px] border border-slate-300 rounded bg-white text-slate-800 outline-none focus:border-blue-500 font-medium transition-colors"
                      />
                    </th>
                  ))}
                  <th className="p-1 border border-black/10 bg-slate-100"></th>
                </tr>
              </thead>

              <tbody className="text-xs sm:text-sm text-slate-700 font-medium bg-white">
                {filtered.map((h, i) => (
                  <tr key={h.id} className="hover:bg-slate-100 transition-colors group">
                    <td className="p-2 border border-black text-center vertical-align-middle font-mono bg-slate-50/50">
                      {i + 1}
                    </td>

                    {COLS.map((col) => {
                      const isEditing =
                        activeCell?.rowId === h.id && activeCell?.colKey === col.key;
                      return (
                        <td
                          key={col.key}
                          onClick={() => handleCellClick(h.id, col.key, (h as any)[col.key])}
                          className={`p-2 border border-black text-center vertical-align-middle white-space-nowrap transition-all ${
                            col.key === "name"
                              ? "font-bold text-slate-900 min-w-[120px]"
                              : col.key === "description"
                                ? "min-w-[140px]"
                                : col.key === "hafizaAmount"
                                  ? "font-mono font-bold text-emerald-700 bg-emerald-50/20 min-w-[90px]"
                                  : col.key === "notifyAmount"
                                    ? "font-mono font-bold text-blue-700 bg-blue-50/20 min-w-[90px]"
                                    : "font-mono min-w-[80px]"
                          }`}
                        >
                          {isEditing ? (
                            <input
                              type={
                                col.key === "hafizaAmount" || col.key === "notifyAmount"
                                  ? "number"
                                  : col.key === "date" || col.key === "notifyDate"
                                    ? "date"
                                    : "text"
                              }
                              value={cellValue}
                              autoFocus
                              onChange={(e) => setCellValue(e.target.value)}
                              onBlur={() => handleCellSave(h)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") handleCellSave(h);
                                if (e.key === "Escape") setActiveCell(null);
                              }}
                              className="w-full text-center p-1 border border-black rounded bg-white text-slate-900 font-sans text-xs outline-none"
                            />
                          ) : (
                            <span className="block min-h-[18px] w-full align-middle">
                              {col.key === "hafizaAmount" || col.key === "notifyAmount"
                                ? fmt((h as any)[col.key])
                                : (h as any)[col.key] || "—"}
                            </span>
                          )}
                        </td>
                      );
                    })}

                    <td className="p-2 border border-black text-center vertical-align-middle bg-slate-50/50">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm("هل تريد حذف هذا القيد بالتأكيد؟")) deleteHafiza(h.id);
                        }}
                        className="p-1 text-rose-600 hover:bg-rose-100 rounded transition-colors"
                        title="حذف القيد"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td
                      colSpan={COLS.length + 2}
                      className="p-12 text-center text-slate-400 bg-slate-50 font-bold border border-black"
                    >
                      لا توجد سجلات مطابقة لمرشحات البحث الحالية.
                    </td>
                  </tr>
                )}
              </tbody>

              {/* صف الإجماليات المالي النهائي والمدقق */}
              {filtered.length > 0 && (
                <tfoot className="bg-slate-100 font-bold border-t-2 border-black sticky bottom-0 z-10 text-slate-900 text-xs">
                  <tr>
                    <td className="p-2 border border-black text-center vertical-align-middle bg-slate-200">
                      ∑
                    </td>
                    <td className="p-2 border border-black text-center vertical-align-middle font-black text-slate-900 white-space-nowrap">
                      إجمالي التقارير الحالية
                    </td>
                    <td className="p-2 border border-black text-center vertical-align-middle">—</td>
                    <td className="p-2 border border-black text-center vertical-align-middle">—</td>
                    <td className="p-2 border border-black text-center vertical-align-middle">—</td>
                    <td className="p-2 border border-black text-center vertical-align-middle">—</td>
                    <td className="p-2 border border-black text-center vertical-align-middle">—</td>
                    <td className="p-2 border border-black font-mono font-black text-emerald-800 bg-emerald-100 text-center vertical-align-middle white-space-nowrap">
                      {fmt(totalHafizaAmount)}
                    </td>
                    <td className="p-2 border border-black text-center vertical-align-middle">—</td>
                    <td className="p-2 border border-black text-center vertical-align-middle">—</td>
                    <td className="p-2 border border-black font-mono font-black text-blue-800 bg-blue-100 text-center vertical-align-middle white-space-nowrap">
                      {fmt(totalNotifyAmount)}
                    </td>
                    <td className="p-2 border border-black bg-slate-200 vertical-align-middle"></td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

// مكون الحقل الفرعي المدعوم بأيقونات دلالية للمستخدم
function Field({
  label,
  v,
  on,
  type = "text",
  icon,
  className = "",
}: {
  label: string;
  v: string;
  on: (v: string) => void;
  type?: string;
  icon?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className="w-full">
      <label className="block text-xs font-bold text-amber-800 mb-1.5 mr-1">{label}</label>
      <div className="relative flex items-center">
        {icon && <span className="absolute right-3 z-10">{icon}</span>}
        <input
          type={type}
          value={v}
          onChange={(e) => on(e.target.value)}
          className={`w-full ${icon ? "pr-9" : "px-3"} pl-3 py-2 text-sm border border-slate-300 rounded-xl outline-none focus:border-[#10528e] bg-white text-slate-800 font-medium shadow-sm transition-colors ${className}`}
        />
      </div>
    </div>
  );
}
