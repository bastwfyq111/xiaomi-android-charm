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
  Wallet,
  ArrowUpRight,
  Filter,
} from "lucide-react";
import TabActions from "./TabActions";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

// تعريف أعمدة الجدول الثابتة
const COLS = [
  { key: "name", label: "الاسم" },
  { key: "batch", label: "الدفعة" },
  { key: "specialty", label: "التخصص" },
  { key: "date", label: "التاريخ" },
  { key: "hafizaNo", label: "رقم الحافظة" },
  { key: "description", label: "البيان" },
  { key: "hafizaAmount", label: "مبلغ الحافظة" },
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
    <div className="w-full space-y-8 p-4 md:p-6 bg-slate-50/50 min-h-screen" dir="rtl">
      {/* ========== 1. Header & Summary Stats ========== */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Wallet className="w-8 h-8 text-indigo-600" />
            نظام إدارة الحوافظ
          </h1>
          <p className="text-slate-500 text-sm mt-1">تتبع وإدارة حوافظ التوريد والبيانات المالية للمتدربين</p>
        </div>
        <div className="flex gap-3">
          <Card className="bg-white border-none shadow-sm px-4 py-2 flex items-center gap-3">
            <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">إجمالي الحوافظ</p>
              <p className="text-lg font-bold text-slate-900">{hafiza.length}</p>
            </div>
          </Card>
          <Card className="bg-white border-none shadow-sm px-4 py-2 flex items-center gap-3">
            <div className="p-2 bg-emerald-50 rounded-lg text-emerald-600">
              <ArrowUpRight className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">المبلغ الإجمالي</p>
              <p className="text-lg font-bold text-slate-900">{fmt(totalHafizaAmount)}</p>
            </div>
          </Card>
        </div>
      </div>

      {/* ========== 2. Form Section ========== */}
      <Card className="border-none shadow-md overflow-hidden bg-white">
        <CardHeader className="bg-white border-b border-slate-100 flex flex-row items-center justify-between py-4">
          <div className="space-y-1">
            <CardTitle className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <Plus className="w-5 h-5 text-indigo-600" />
              إضافة حافظة جديدة
            </CardTitle>
            <CardDescription>أدخل تفاصيل الحافظة لترحيلها إلى النظام</CardDescription>
          </div>
          <div className="flex items-center gap-2">
             <ImportButton kind="hafiza" />
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
            {/* Name Input with Suggestions */}
            <div className="relative col-span-1 md:col-span-2">
              <label className="text-xs font-bold text-slate-600 mb-2 block mr-1">اسم المتدرب الكامل *</label>
              <div className="relative">
                <User className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  value={nameQuery}
                  onChange={(e) => {
                    setNameQuery(e.target.value);
                    setForm({ ...form, name: e.target.value });
                    setShowSugg(true);
                  }}
                  onFocus={() => setShowSugg(true)}
                  onBlur={() => setTimeout(() => setShowSugg(false), 200)}
                  placeholder="ابحث أو اكتب اسم المتدرب..."
                  className="pr-10 bg-slate-50 border-slate-200 focus:bg-white transition-all rounded-xl h-11"
                />
              </div>
              {showSugg && nameSuggestions.length > 0 && (
                <ul className="absolute z-50 left-0 right-0 mt-2 bg-white border border-slate-100 rounded-xl shadow-2xl max-h-64 overflow-y-auto animate-in fade-in zoom-in duration-200">
                  {nameSuggestions.map((t) => (
                    <li key={t.name}>
                      <button
                        type="button"
                        onMouseDown={() => pickName(t)}
                        className="w-full text-right px-4 py-3 hover:bg-indigo-50 border-b border-slate-50 last:border-0 transition-colors flex flex-col gap-0.5"
                      >
                        <span className="font-bold text-sm text-slate-800">{t.name}</span>
                        <span className="text-xs text-indigo-600 font-medium">{t.specialty} — {t.batch}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <Field label="الدفعة" icon={<Sparkles className="w-4 h-4 text-slate-400" />} v={form.batch} on={(v) => setForm({ ...form, batch: v })} />
            <Field label="التخصص الطبي" icon={<FileText className="w-4 h-4 text-slate-400" />} v={form.specialty} on={(v) => setForm({ ...form, specialty: v })} />
            <Field label="التاريخ" type="date" icon={<Calendar className="w-4 h-4 text-slate-400" />} v={form.date} on={(v) => setForm({ ...form, date: v })} />
            <Field label="رقم الحافظة *" icon={<Hash className="w-4 h-4 text-slate-400" />} v={form.hafizaNo} on={(v) => setForm({ ...form, hafizaNo: v })} />
            <Field label="مبلغ الحافظة *" type="number" icon={<span className="text-[10px] text-slate-400 font-bold">ر.ي</span>} v={form.hafizaAmount} on={(v) => setForm({ ...form, hafizaAmount: v })} />
            
            {/* Description with Datalist */}
            <div>
              <label className="text-xs font-bold text-slate-600 mb-2 block mr-1">البيان والشرح</label>
              <div className="relative">
                <FileText className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  list="hafiza-descriptions"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="اكتب أو اختر..."
                  className="pr-10 bg-slate-50 border-slate-200 focus:bg-white transition-all rounded-xl h-11"
                />
              </div>
              <datalist id="hafiza-descriptions">
                {Array.from(new Set([...DESCRIPTIONS, ...hafiza.map((h) => h.description).filter(Boolean)])).map((d) => (
                  <option key={d} value={d} />
                ))}
              </datalist>
            </div>

            <Field label="تاريخ التوريد" type="date" icon={<Calendar className="w-4 h-4 text-slate-400" />} v={form.notifyDate} on={(v) => setForm({ ...form, notifyDate: v })} />
            <Field label="رقم الاشعار" icon={<Hash className="w-4 h-4 text-slate-400" />} v={form.notifyNo} on={(v) => setForm({ ...form, notifyNo: v })} />
            <Field label="مبلغ التوريد" type="number" icon={<span className="text-[10px] text-slate-400 font-bold">ر.ي</span>} v={form.notifyAmount} on={(v) => setForm({ ...form, notifyAmount: v })} />
          </div>

          <div className="mt-8 flex gap-3 flex-wrap border-t border-slate-100 pt-6">
            <Button onClick={submit} className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl px-6 h-11 font-bold shadow-indigo-200 shadow-lg transition-all active:scale-95">
              <Save className="w-4 h-4 ml-2" /> حفظ الحافظة
            </Button>
            <Button variant="outline" onClick={() => { setForm(empty); setNameQuery(""); }} className="border-slate-200 text-slate-600 rounded-xl px-6 h-11 font-bold hover:bg-slate-50 transition-all">
              <Eraser className="w-4 h-4 ml-2" /> تصفية الحقول
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ========== 3. Table Section ========== */}
      <Card className="border-none shadow-md overflow-hidden bg-white">
        <CardHeader className="bg-white border-b border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between py-4 gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
              <TableHead className="p-0 h-auto text-indigo-600"><FileText className="w-5 h-5" /></TableHead>
            </div>
            <div>
              <CardTitle className="text-lg font-bold text-slate-800">كشف القيود</CardTitle>
              <CardDescription>عرض وتدقيق كافة حوافظ التوريد المسجلة</CardDescription>
            </div>
            <Badge variant="secondary" className="bg-indigo-50 text-indigo-700 hover:bg-indigo-50 border-none px-2.5 py-0.5 rounded-full font-bold">
              {filtered.length} سجل
            </Badge>
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <Button variant="outline" size="sm" onClick={handleCopyAmountsToNotify} className="bg-emerald-50 border-emerald-100 text-emerald-700 hover:bg-emerald-100 hover:text-emerald-800 rounded-lg text-xs font-bold h-9">
              <CheckSquare className="w-3.5 h-3.5 ml-1.5" /> نسخ المبالغ
            </Button>
            {Object.values(filters).some(Boolean) && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="text-slate-500 hover:text-slate-700 text-xs font-bold h-9">
                <X className="w-3.5 h-3.5 ml-1.5" /> مسح الفلاتر
              </Button>
            )}
            <TabActions title="حوافظ التوريد" rows={hafiza} columns={COLS} />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50/80">
                <TableRow className="border-slate-100">
                  <TableHead className="w-12 text-center text-slate-500 font-bold">#</TableHead>
                  {COLS.map((c) => (
                    <TableHead key={c.key} className="text-right py-4">
                      <button onClick={() => toggleSort(c.key)} className="flex items-center gap-1 hover:text-indigo-600 transition-colors group">
                        <span className="font-bold text-slate-700 group-hover:text-indigo-600">{c.label}</span>
                        {sortIndicator(sortKey, sortDir, c.key)}
                      </button>
                      <div className="mt-2 relative">
                        <Filter className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-300" />
                        <input
                          value={filters[c.key] || ""}
                          onChange={(e) => setFilter(c.key, e.target.value)}
                          placeholder="تصفية..."
                          className="w-full pr-7 pl-2 py-1 text-[10px] bg-white border border-slate-200 rounded-md outline-none focus:border-indigo-400 transition-all font-medium"
                        />
                      </div>
                    </TableHead>
                  ))}
                  <TableHead className="w-20 text-center text-slate-500 font-bold">إجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((row, idx) => (
                  <TableRow key={row.id} className="hover:bg-slate-50/50 transition-colors border-slate-50">
                    <TableCell className="text-center text-slate-400 font-medium text-xs">{idx + 1}</TableCell>
                    {COLS.map((c) => {
                      const isEditing = activeCell?.rowId === row.id && activeCell?.colKey === c.key;
                      const val = row[c.key];
                      const isMoney = c.key === "hafizaAmount" || c.key === "notifyAmount";

                      return (
                        <TableCell
                          key={c.key}
                          className={`text-right py-3 text-sm ${isEditing ? "p-1" : "cursor-pointer hover:bg-indigo-50/30"}`}
                          onClick={() => !isEditing && handleCellClick(row.id, c.key, val)}
                        >
                          {isEditing ? (
                            <Input
                              autoFocus
                              value={cellValue}
                              onChange={(e) => setCellValue(e.target.value)}
                              onBlur={() => handleCellSave(row)}
                              onKeyDown={(e) => e.key === "Enter" && handleCellSave(row)}
                              className="h-8 text-sm bg-white border-indigo-400 focus:ring-1 focus:ring-indigo-400 rounded-md"
                            />
                          ) : (
                            <span className={`${isMoney ? "font-mono font-bold text-slate-700" : "text-slate-600 font-medium"}`}>
                              {isMoney ? fmt(val) : val}
                            </span>
                          )}
                        </TableCell>
                      );
                    })}
                    <TableCell className="text-center">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          if (confirm("هل أنت متأكد من حذف هذا السجل؟")) deleteHafiza(row.id);
                        }}
                        className="h-8 w-8 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={COLS.length + 2} className="h-40 text-center">
                      <div className="flex flex-col items-center justify-center text-slate-400 gap-2">
                        <Search className="w-8 h-8 opacity-20" />
                        <p className="font-bold">لا توجد سجلات مطابقة للبحث</p>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
              {filtered.length > 0 && (
                <TableFooter className="bg-slate-50/80 border-t border-slate-200">
                  <TableRow>
                    <TableCell className="text-center font-bold text-slate-400">∑</TableCell>
                    <TableCell className="font-bold text-slate-900">إجمالي الصفحة</TableCell>
                    <TableCell colSpan={5}></TableCell>
                    <TableCell className="text-right font-mono font-bold text-indigo-700 bg-indigo-50/50">
                      {fmt(totalHafizaAmount)}
                    </TableCell>
                    <TableCell colSpan={2}></TableCell>
                    <TableCell className="text-right font-mono font-bold text-emerald-700 bg-emerald-50/50">
                      {fmt(totalNotifyAmount)}
                    </TableCell>
                    <TableCell></TableCell>
                  </TableRow>
                </TableFooter>
              )}
            </Table>
          </div>
        </CardContent>
      </Card>
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
      <label className="text-xs font-bold text-slate-600 mb-2 block mr-1">{label}</label>
      <div className="relative">
        {icon && <span className="absolute right-3 top-1/2 -translate-y-1/2 z-10">{icon}</span>}
        <Input
          type={type}
          value={v}
          onChange={(e) => on(e.target.value)}
          className={`${icon ? "pr-10" : "px-3"} bg-slate-50 border-slate-200 focus:bg-white transition-all rounded-xl h-11 text-sm font-medium ${className}`}
        />
      </div>
    </div>
  );
}
