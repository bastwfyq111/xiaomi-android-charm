import React, { useMemo, useState } from "react";
import { useStore, type Trainee } from "@/lib/store";
import { fmt, today } from "@/lib/format";
import { DESCRIPTIONS } from "@/lib/accounts";
import { toast } from "sonner";
import ImportButton from "./ImportButton";
import { useTableControls, sortIndicator } from "@/hooks/useTableControls";
import {
  X,
  Plus,
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
  Layers,
  CreditCard,
  Banknote,
  ScrollText,
  BadgeCheck,
  PartyPopper,
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
  const { trainees, hafiza, addHafiza, deleteHafiza, addTrainee, updateHafiza } = useStore();
  const [form, setForm] = useState<Form>(empty);
  const [nameQuery, setNameQuery] = useState("");
  const [showSugg, setShowSugg] = useState(false);

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
    COLS.map((c) => c.key)
  );

  const totalHafizaAmount = useMemo(() => {
    return filtered.reduce((sum, item) => sum + (Number(item.hafizaAmount) || 0), 0);
  }, [filtered]);

  const totalNotifyAmount = useMemo(() => {
    return filtered.reduce((sum, item) => sum + (Number(item.notifyAmount) || 0), 0);
  }, [filtered]);

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
      updateHafiza(row.id, { ...row, notifyAmount: Number(row.hafizaAmount) || 0 });
    });
    toast.success(`تمت تسوية ونسخ المبالغ لـ (${filtered.length}) سجل بنجاح!`);
  };

  const handleCellClick = (rowId: string, colKey: string, currentVal: unknown) => {
    setActiveCell({ rowId, colKey });
    setCellValue(String(currentVal ?? ""));
  };

  const handleCellSave = (row: Record<string, unknown> & { id: string }) => {
    if (!activeCell) return;
    
    const { colKey, rowId } = activeCell;
    let finalVal: string | number = cellValue;
    
    if (colKey === "hafizaAmount" || colKey === "notifyAmount") {
      finalVal = Number(cellValue) || 0;
    }
    
    updateHafiza(rowId, { ...row, [colKey]: finalVal });
    setActiveCell(null);
    toast.success("تم تحديث الخلية تلقائياً");
  };

  return (
    <div className="w-full space-y-10 p-6 md:p-10 min-h-screen relative overflow-hidden" dir="rtl">
      {/* خلفية متطورة: تدرجات دائرية ناعمة مع تأثير زجاجي */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-0 -left-20 w-[500px] h-[500px] bg-gradient-to-br from-fuchsia-200/40 via-rose-200/30 to-transparent rounded-full blur-3xl opacity-70 animate-pulse" />
        <div className="absolute bottom-0 -right-20 w-[600px] h-[600px] bg-gradient-to-tl from-cyan-200/40 via-blue-200/30 to-transparent rounded-full blur-3xl opacity-70" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-to-r from-violet-100/20 to-amber-100/20 rounded-full blur-3xl opacity-50" />
        {/* شبكة دقيقة للخلفية */}
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiMyMTIxMjEiIGZpbGwtb3BhY2l0eT0iMC4wMiI+PHBhdGggZD0iTTM2IDM0djJIMjR2LTJoMTJ6TTM2IDI0djJIMjR2LTJoMTJ6TTM2IDE0djJIMjR2LTJoMTJ6TTM2IDR2MkgyNHYtMmgxMnoiLz48L2c+PC9nPjwvc3ZnPg==')] opacity-30" />
      </div>

      {/* ========== Header & Summary Stats ========== */}
      <div className="relative flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-700 via-purple-700 to-indigo-700 flex items-center gap-3">
            <div className="p-2.5 bg-white/60 backdrop-blur-md rounded-2xl shadow-lg shadow-fuchsia-200/50">
              <Wallet className="w-8 h-8 text-fuchsia-600" strokeWidth={1.8} />
            </div>
            نظام إدارة الحوافظ
          </h1>
          <p className="text-slate-600 text-sm mt-2 mr-16 font-medium">تتبع وإدارة حوافظ التوريد والبيانات المالية للمتدربين</p>
        </div>
        <div className="flex gap-4">
          <Card className="bg-white/70 backdrop-blur-xl border border-white/50 shadow-xl shadow-purple-100/50 px-5 py-3 flex items-center gap-4 rounded-3xl hover:shadow-2xl hover:-translate-y-0.5 transition-all duration-300">
            <div className="p-3 bg-gradient-to-br from-blue-400 to-blue-600 rounded-xl shadow-md shadow-blue-200">
              <Layers className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-[11px] text-slate-500 font-bold uppercase tracking-widest">إجمالي الحوافظ</p>
              <p className="text-2xl font-black text-slate-800">{hafiza.length}</p>
            </div>
          </Card>
          <Card className="bg-white/70 backdrop-blur-xl border border-white/50 shadow-xl shadow-emerald-100/50 px-5 py-3 flex items-center gap-4 rounded-3xl hover:shadow-2xl hover:-translate-y-0.5 transition-all duration-300">
            <div className="p-3 bg-gradient-to-br from-emerald-400 to-teal-600 rounded-xl shadow-md shadow-emerald-200">
              <ArrowUpRight className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-[11px] text-slate-500 font-bold uppercase tracking-widest">المبلغ الإجمالي</p>
              <p className="text-2xl font-black text-slate-800">{fmt(totalHafizaAmount)}</p>
            </div>
          </Card>
        </div>
      </div>

      {/* ========== Form Section ========== */}
      <Card className="relative border-0 shadow-2xl shadow-purple-200/30 overflow-hidden bg-white/80 backdrop-blur-2xl rounded-[2.5rem] ring-1 ring-white/50">
        <CardHeader className="border-b border-purple-100/50 flex flex-row items-center justify-between py-5 px-8 bg-gradient-to-r from-purple-50/50 to-pink-50/50">
          <div className="space-y-1">
            <CardTitle className="text-xl font-bold text-slate-800 flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl shadow-lg shadow-indigo-200">
                <Plus className="w-5 h-5 text-white" strokeWidth={2.5} />
              </div>
              إضافة حافظة جديدة
            </CardTitle>
            <CardDescription className="text-slate-500 mr-11">أدخل تفاصيل الحافظة لترحيلها إلى النظام</CardDescription>
          </div>
          <div className="flex items-center gap-2">
             <ImportButton kind="hafiza" />
          </div>
        </CardHeader>
        <CardContent className="p-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            <div className="relative col-span-1 md:col-span-2">
              <label className="text-xs font-bold text-slate-700 mb-2.5 block mr-2">اسم المتدرب الكامل *</label>
              <div className="relative">
                <div className="absolute right-4 top-1/2 -translate-y-1/2 bg-blue-100 p-1.5 rounded-lg">
                  <User className="w-4 h-4 text-blue-600" />
                </div>
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
                  className="pr-14 bg-white/60 backdrop-blur-sm border-slate-200/80 focus:bg-white focus:border-blue-400 focus:ring-4 focus:ring-blue-100 transition-all rounded-2xl h-12 text-sm font-medium shadow-sm"
                />
              </div>
              {showSugg && nameSuggestions.length > 0 && (
                <ul className="absolute z-50 left-0 right-0 mt-3 bg-white/90 backdrop-blur-xl border border-slate-100 rounded-2xl shadow-2xl shadow-slate-300/30 max-h-64 overflow-y-auto animate-in fade-in zoom-in duration-200">
                  {nameSuggestions.map((t) => (
                    <li key={t.name}>
                      <button type="button" onMouseDown={() => pickName(t)} className="w-full text-right px-5 py-3.5 hover:bg-gradient-to-r hover:from-indigo-50 hover:to-purple-50 border-b border-slate-50 transition-all flex flex-col gap-1">
                        <span className="font-bold text-sm text-slate-800">{t.name}</span>
                        <span className="text-xs text-indigo-600 font-semibold flex items-center gap-1">
                          <BadgeCheck className="w-3 h-3" /> {t.specialty} — {t.batch}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <Field label="الدفعة" icon={<Sparkles className="w-4 h-4 text-amber-500" />} v={form.batch} on={(v) => setForm({ ...form, batch: v })} />
            <Field label="التخصص الطبي" icon={<FileText className="w-4 h-4 text-emerald-500" />} v={form.specialty} on={(v) => setForm({ ...form, specialty: v })} />
            <Field label="التاريخ" type="date" icon={<Calendar className="w-4 h-4 text-rose-500" />} v={form.date} on={(v) => setForm({ ...form, date: v })} />
            <Field label="رقم الحافظة *" icon={<Hash className="w-4 h-4 text-violet-500" />} v={form.hafizaNo} on={(v) => setForm({ ...form, hafizaNo: v })} />
            <Field label="مبلغ الحافظة *" type="number" icon={<Banknote className="w-4 h-4 text-teal-500" />} v={form.hafizaAmount} on={(v) => setForm({ ...form, hafizaAmount: v })} />
            
            <div>
              <label className="text-xs font-bold text-slate-700 mb-2.5 block mr-2">البيان والشرح</label>
              <div className="relative">
                <div className="absolute right-4 top-1/2 -translate-y-1/2 bg-cyan-100 p-1.5 rounded-lg">
                  <ScrollText className="w-4 h-4 text-cyan-600" />
                </div>
                <Input list="hafiza-descriptions" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="اكتب أو اختر..." className="pr-14 bg-white/60 backdrop-blur-sm border-slate-200/80 focus:bg-white focus:border-cyan-400 focus:ring-4 focus:ring-cyan-100 transition-all rounded-2xl h-12 text-sm font-medium shadow-sm" />
              </div>
              <datalist id="hafiza-descriptions">
                {Array.from(new Set([...DESCRIPTIONS, ...hafiza.map((h) => h.description).filter(Boolean)])).map((d) => (
                  <option key={d} value={d} />
                ))}
              </datalist>
            </div>

            <Field label="تاريخ التوريد" type="date" icon={<Calendar className="w-4 h-4 text-orange-500" />} v={form.notifyDate} on={(v) => setForm({ ...form, notifyDate: v })} />
            <Field label="رقم الاشعار" icon={<Hash className="w-4 h-4 text-pink-500" />} v={form.notifyNo} on={(v) => setForm({ ...form, notifyNo: v })} />
            <Field label="مبلغ التوريد" type="number" icon={<CreditCard className="w-4 h-4 text-indigo-500" />} v={form.notifyAmount} on={(v) => setForm({ ...form, notifyAmount: v })} />
          </div>

          <div className="mt-10 flex gap-4 flex-wrap border-t border-purple-100 pt-8">
            <Button onClick={submit} className="bg-gradient-to-r from-fuchsia-500 via-purple-500 to-indigo-500 hover:from-fuchsia-600 hover:via-purple-600 hover:to-indigo-600 text-white rounded-2xl px-8 h-12 font-bold shadow-xl shadow-purple-300/50 transition-all hover:-translate-y-1 active:scale-[0.98] border-0 flex items-center gap-2">
              <Save className="w-5 h-5" /> حفظ الحافظة
            </Button>
            <Button variant="outline" onClick={() => { setForm(empty); setNameQuery(""); }} className="bg-white/70 backdrop-blur-sm hover:bg-white text-slate-700 rounded-2xl px-8 h-12 font-bold shadow-lg shadow-slate-200/50 border-slate-200/60 transition-all hover:-translate-y-1 hover:shadow-xl flex items-center gap-2">
              <Eraser className="w-5 h-5" /> تصفية الحقول
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ========== Table Section ========== */}
      <Card className="relative border-0 shadow-2xl shadow-indigo-200/30 overflow-hidden bg-white/80 backdrop-blur-2xl rounded-[2.5rem] ring-1 ring-white/50">
        <CardHeader className="border-b border-indigo-100/50 flex flex-col sm:flex-row items-start sm:items-center justify-between py-5 px-8 bg-gradient-to-r from-indigo-50/50 to-blue-50/50">
          <div className="flex items-center gap-4">
            <div className="p-2.5 bg-gradient-to-br from-indigo-500 to-blue-600 rounded-xl shadow-lg shadow-indigo-200">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <div>
              <CardTitle className="text-xl font-bold text-slate-800">كشف القيود</CardTitle>
              <CardDescription className="text-slate-500">عرض وتدقيق كافة حوافظ التوريد المسجلة</CardDescription>
            </div>
            <Badge className="bg-gradient-to-r from-indigo-500 to-blue-600 text-white border-0 px-4 py-1.5 rounded-full font-bold text-sm shadow-md shadow-indigo-200">
              {filtered.length} سجل
            </Badge>
          </div>
          <div className="flex gap-3 w-full sm:w-auto">
            <Button size="sm" onClick={handleCopyAmountsToNotify} className="bg-gradient-to-r from-emerald-400 to-teal-500 hover:from-emerald-500 hover:to-teal-600 text-white rounded-full shadow-lg shadow-teal-200/50 border-0 font-bold h-10 px-5 transition-all hover:-translate-y-0.5 flex items-center gap-1.5">
              <CheckSquare className="w-4 h-4" /> نسخ المبالغ
            </Button>
            {Object.values(filters).some(Boolean) && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-full font-bold h-10 px-4 transition-all flex items-center gap-1.5">
                <X className="w-4 h-4" /> مسح الفلاتر
              </Button>
            )}
            <TabActions title="حوافظ التوريد" rows={hafiza} columns={COLS} />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-gradient-to-b from-slate-50/80 to-white">
                <TableRow className="border-slate-100 hover:bg-transparent">
                  <TableHead className="w-14 text-center text-slate-500 font-bold text-sm">#</TableHead>
                  {COLS.map((c) => (
                    <TableHead key={c.key} className="text-center py-5 align-top">
                      <button onClick={() => toggleSort(c.key)} className="flex items-center justify-center w-full gap-2 hover:text-indigo-600 transition-colors group">
                        <span className="font-bold text-slate-700 group-hover:text-indigo-600 text-sm">{c.label}</span>
                        {sortIndicator(sortKey, sortDir, c.key)}
                      </button>
                      <div className="mt-3 relative mx-auto w-[90%] max-w-[130px]">
                        <Filter className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                        <input
                          value={filters[c.key] || ""}
                          onChange={(e) => setFilter(c.key, e.target.value)}
                          placeholder="تصفية..."
                          className="w-full pr-8 pl-3 py-1.5 text-[11px] bg-white/80 backdrop-blur-sm border border-slate-200 rounded-full outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all font-medium text-center shadow-sm"
                        />
                      </div>
                    </TableHead>
                  ))}
                  <TableHead className="w-20 text-center text-slate-500 font-bold text-sm">إجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((row, idx) => (
                  <TableRow key={row.id} className="hover:bg-gradient-to-r hover:from-indigo-50/60 hover:to-purple-50/60 transition-all border-slate-50 group">
                    <TableCell className="text-center text-slate-400 font-semibold text-xs align-middle">{idx + 1}</TableCell>
                    {COLS.map((c) => {
                      const isEditing = activeCell?.rowId === row.id && activeCell?.colKey === c.key;
                      const val = (row as any)[c.key];
                      const isMoney = c.key === "hafizaAmount" || c.key === "notifyAmount";

                      return (
                        <TableCell
                          key={c.key}
                          className={`text-center py-3.5 text-sm whitespace-normal break-words align-middle transition-all ${isEditing ? "p-1 bg-indigo-50/30" : "cursor-pointer group-hover:bg-white/50"}`}
                          onClick={() => !isEditing && handleCellClick(row.id, c.key, val)}
                        >
                          {isEditing ? (
                            <Input
                              autoFocus
                              value={cellValue}
                              onChange={(e) => setCellValue(e.target.value)}
                              onBlur={() => handleCellSave(row as Record<string, unknown> & { id: string })}
                              onKeyDown={(e) => e.key === "Enter" && handleCellSave(row as Record<string, unknown> & { id: string })}
                              className="h-9 text-sm bg-white border-2 border-indigo-400 text-center rounded-xl focus:ring-4 focus:ring-indigo-100 shadow-md"
                            />
                          ) : (
                            <span className={`${isMoney ? "font-mono font-bold text-slate-800 bg-gradient-to-r from-indigo-50 to-purple-50 px-3 py-1 rounded-xl" : "text-slate-700 font-medium"}`}>
                              {isMoney ? fmt(Number(val) || 0) : String(val ?? "")}
                            </span>
                          )}
                        </TableCell>
                      );
                    })}
                    <TableCell className="text-center align-middle">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          if (confirm("هل أنت متأكد من حذف هذا السجل؟")) deleteHafiza(row.id);
                        }}
                        className="h-9 w-9 text-slate-400 hover:text-white hover:bg-gradient-to-br hover:from-red-400 hover:to-rose-500 rounded-xl transition-all shadow-sm hover:shadow-lg hover:shadow-red-200/50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={COLS.length + 2} className="h-44 text-center">
                      <div className="flex flex-col items-center justify-center text-slate-400 gap-3">
                        <div className="p-4 bg-slate-100 rounded-full">
                          <Search className="w-8 h-8 opacity-40" />
                        </div>
                        <p className="font-bold text-slate-500">لا توجد سجلات مطابقة للبحث</p>
                        <p className="text-xs text-slate-400">جرب تعديل عوامل التصفية أو إضافة سجل جديد</p>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
              {filtered.length > 0 && (
                <TableFooter className="bg-gradient-to-r from-indigo-50/70 to-purple-50/70 border-t-2 border-indigo-100">
                  <TableRow className="hover:bg-transparent">
                    <TableCell className="text-center font-bold text-slate-500">∑</TableCell>
                    <TableCell className="text-center font-bold text-slate-800 text-base">إجمالي الصفحة</TableCell>
                    <TableCell colSpan={5}></TableCell>
                    <TableCell className="text-center font-mono font-bold text-indigo-700 bg-white/80 rounded-xl py-2 shadow-sm">
                      {fmt(totalHafizaAmount)}
                    </TableCell>
                    <TableCell colSpan={2}></TableCell>
                    <TableCell className="text-center font-mono font-bold text-emerald-700 bg-white/80 rounded-xl py-2 shadow-sm">
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
      <label className="text-xs font-bold text-slate-700 mb-2.5 block mr-2">{label}</label>
      <div className="relative">
        {icon && (
          <div className="absolute right-4 top-1/2 -translate-y-1/2 z-10 bg-white/80 p-1.5 rounded-lg shadow-sm">
            {icon}
          </div>
        )}
        <Input
          type={type}
          value={v}
          onChange={(e) => on(e.target.value)}
          className={`${icon ? "pr-14" : "px-4"} bg-white/60 backdrop-blur-sm border-slate-200/80 focus:bg-white focus:border-purple-400 focus:ring-4 focus:ring-purple-100 transition-all rounded-2xl h-12 text-sm font-medium shadow-sm ${className}`}
        />
      </div>
    </div>
  );
}