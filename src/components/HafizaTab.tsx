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

  const [showForm, setShowForm] = useState(true);

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
    setShowForm(false);
  };

  const handleCopyAmountsToNotify = () => {
    if (filtered.length === 0) {
      toast.error("لا توجد سجلات حالية لنقل مبالغها");
      return;
    }
    // حافظ على الAPI الحالي: تحدث كل صف (يمكن تبديله لاحقًا لبulkUpdate)
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
    <div className="w-full min-h-screen p-6 md:p-10" dir="rtl">
      {/* HERO */}
      <div className="mb-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 flex items-center gap-3">
            <span className="p-3 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-md text-white">
              <Wallet className="w-6 h-6" />
            </span>
            لوحة الحوافظ — تصميم متطور
          </h1>
          <p className="text-sm text-slate-500 mt-1">مشاهدة، إضافة، وتحرير الحوافظ بطريقة أنيقة وسريعة.</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden sm:flex gap-3">
            <Button onClick={() => setShowForm((s) => !s)} className="bg-gradient-to-r from-fuchsia-500 to-indigo-600 text-white rounded-2xl px-4 py-2">
              <Plus className="w-4 h-4" /> {showForm ? "إخفاء النموذج" : "إضافة حافظة"}
            </Button>
            <ImportButton kind="hafiza" />
          </div>

          <div className="flex gap-3">
            <Card className="px-4 py-3 bg-white/80 backdrop-blur rounded-2xl border border-slate-100 shadow-sm flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gradient-to-br from-indigo-500 to-sky-500 text-white">
                <Layers className="w-5 h-5" />
              </div>
              <div className="text-right">
                <div className="text-[11px] text-slate-500 font-bold uppercase">السجلات</div>
                <div className="text-lg font-black">{hafiza.length}</div>
              </div>
            </Card>
            <Card className="px-4 py-3 bg-white/80 backdrop-blur rounded-2xl border border-slate-100 shadow-sm flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gradient-to-br from-emerald-400 to-teal-500 text-white">
                <ArrowUpRight className="w-5 h-5" />
              </div>
              <div className="text-right">
                <div className="text-[11px] text-slate-500 font-bold uppercase">المبلغ الإجمالي</div>
                <div className="text-lg font-black">{fmt(totalHafizaAmount)}</div>
              </div>
            </Card>
          </div>
        </div>
      </div>

      {/* MAIN LAYOUT: SIDEBAR + CONTENT */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* SIDEBAR */}
        <aside className="lg:col-span-3 flex flex-col gap-4">
          <div className="sticky top-6 space-y-4">
            <Card className="p-4 bg-gradient-to-br from-white/60 to-white/40 backdrop-blur rounded-2xl border border-slate-100 shadow">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs text-slate-500 font-semibold">حالة التوازن</div>
                  <div className="mt-2 text-sm font-bold text-slate-800">{fmt(totalHafizaAmount - totalNotifyAmount)}</div>
                </div>
                <div className="p-2 rounded-full bg-indigo-50">
                  <Wallet className="w-5 h-5 text-indigo-600" />
                </div>
              </div>

              <div className="mt-4">
                <div className="text-[11px] text-slate-500 font-semibold">نسخة سريعة</div>
                <div className="flex gap-2 mt-3">
                  <Button size="sm" onClick={handleCopyAmountsToNotify} className="flex-1 bg-emerald-500 text-white rounded-xl">
                    <CheckSquare className="w-4 h-4" /> نسخ مبالغ
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => { setForm(empty); setNameQuery(""); }} className="rounded-xl">
                    <Eraser className="w-4 h-4" /> مسح
                  </Button>
                </div>
              </div>
            </Card>

            <Card className="p-4 bg-white/70 backdrop-blur rounded-2xl border border-slate-100 shadow">
              <div className="text-xs text-slate-500 font-semibold">إحصاءات سريعة</div>
              <div className="mt-3 space-y-3">
                <Stat label="حوافظ مسجلة" value={`${hafiza.length}`} icon={<Layers className="w-4 h-4 text-indigo-600" />} />
                <Stat label="المبلغ الكلي" value={fmt(totalHafizaAmount)} icon={<Banknote className="w-4 h-4 text-emerald-600" />} />
                <Stat label="ترحيلات التوريد" value={fmt(totalNotifyAmount)} icon={<CreditCard className="w-4 h-4 text-teal-500" />} />
              </div>
            </Card>

            <Card className="p-4 bg-white/60 backdrop-blur rounded-2xl border border-slate-100 shadow">
              <div className="flex items-center justify-between">
                <div className="text-sm font-bold">تلميحات</div>
                <PartyPopper className="w-5 h-5 text-rose-500" />
              </div>
              <div className="mt-3 text-xs text-slate-500">
                اضغط على أي خلية لبدء التعديل، أو استخدم زر "نسخ مبالغ" لنسخ مبالغ الحافظة إلى عمود التوريد تلقائياً.
              </div>
            </Card>
          </div>
        </aside>

        {/* CONTENT */}
        <main className="lg:col-span-9 space-y-6">
          {/* FORM (قابلة للطي) */}
          <div className={`transition-all duration-300 ${showForm ? "max-h-[1200px] opacity-100" : "max-h-0 opacity-0 overflow-hidden"}`}>
            <Card className="p-6 bg-white/80 backdrop-blur rounded-3xl border border-slate-100 shadow-lg">
              <div className="flex items-start justify-between gap-6">
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-slate-800 flex items-center gap-3">
                    <span className="p-2 rounded-lg bg-gradient-to-br from-indigo-600 to-violet-600 text-white">
                      <Plus className="w-4 h-4" />
                    </span>
                    إضافة حافظة جديدة
                  </h3>
                  <p className="text-sm text-slate-500 mt-1">املأ الحقول أدناه ثم اضغط حفظ.</p>
                </div>

                <div className="flex items-center gap-2">
                  <ImportButton kind="hafiza" />
                </div>
              </div>

              <CardContent className="p-0 mt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="md:col-span-2">
                    <label className="text-xs font-bold text-slate-700 mb-2.5 block mr-2">اسم المتدرب الكامل *</label>
                    <div className="relative">
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/80 p-2 rounded-lg shadow-sm">
                        <User className="w-4 h-4 text-indigo-600" />
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
                        className="pr-14 bg-white/70 border border-slate-200 rounded-2xl h-12"
                      />
                    </div>

                    {showSugg && nameSuggestions.length > 0 && (
                      <ul className="absolute z-50 left-0 right-0 mt-3 bg-white/95 backdrop-blur rounded-xl border border-slate-100 shadow-lg max-h-56 overflow-y-auto">
                        {nameSuggestions.map((t) => (
                          <li key={t.name + t.batch} >
                            <button type="button" onMouseDown={() => pickName(t)} className="w-full text-right px-4 py-3 hover:bg-indigo-50 transition-colors flex flex-col">
                              <span className="font-bold text-slate-800">{t.name}</span>
                              <span className="text-xs text-slate-500">{t.specialty} — {t.batch}</span>
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
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 bg-white p-2 rounded-lg shadow-sm">
                        <ScrollText className="w-4 h-4 text-cyan-600" />
                      </div>
                      <Input list="hafiza-descriptions" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="اكتب أو اختر..." className="pr-14 bg-white/70 border border-slate-200 rounded-2xl h-12" />
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

                <div className="mt-6 flex gap-3">
                  <Button onClick={submit} className="bg-gradient-to-r from-fuchsia-500 to-indigo-600 text-white rounded-2xl px-6 py-2">
                    <Save className="w-4 h-4" /> حفظ
                  </Button>
                  <Button variant="outline" onClick={() => { setForm(empty); setNameQuery(""); }} className="rounded-2xl px-6 py-2">
                    <Eraser className="w-4 h-4" /> مسح الحقول
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* TABLE CARD */}
          <Card className="p-0 bg-white/70 backdrop-blur rounded-3xl border border-slate-100 shadow-lg">
            <CardHeader className="flex items-center justify-between p-4 border-b">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <CardTitle className="text-lg font-bold">كشف القيود</CardTitle>
                  <CardDescription className="text-sm text-slate-500">عرض وتدقيق كافة حوافظ التوريد</CardDescription>
                </div>
                <Badge className="mr-4 bg-indigo-600 text-white">{filtered.length} سجل</Badge>
              </div>

              <div className="flex items-center gap-2">
                <div className="relative">
                  <input
                    value={filters.name || ""}
                    onChange={(e) => setFilter("name", e.target.value)}
                    placeholder="بحث بالاسم..."
                    className="px-3 py-2 rounded-full border border-slate-200 text-sm shadow-sm"
                  />
                  <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                </div>

                <Button size="sm" onClick={handleCopyAmountsToNotify} className="bg-emerald-500 text-white rounded-full px-3 py-2">
                  <CheckSquare className="w-4 h-4" /> نسخ المبالغ
                </Button>

                {Object.values(filters).some(Boolean) && (
                  <Button variant="ghost" size="sm" onClick={clearFilters} className="text-rose-500">
                    <X className="w-4 h-4" /> مسح الفلاتر
                  </Button>
                )}

                <TabActions title="حوافظ التوريد" rows={hafiza} columns={COLS} />
              </div>
            </CardHeader>

            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-white/70 sticky top-0 z-10">
                    <TableRow>
                      <TableHead className="w-12 text-center">#</TableHead>
                      {COLS.map((c) => (
                        <TableHead key={c.key} className="text-center py-3">
                          <div className="flex flex-col items-center">
                            <button onClick={() => toggleSort(c.key)} className="flex items-center gap-2">
                              <span className="font-bold text-slate-700 text-sm">{c.label}</span>
                              {sortIndicator(sortKey, sortDir, c.key)}
                            </button>
                            <div className="mt-2 relative">
                              <Filter className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                              <input
                                value={filters[c.key] || ""}
                                onChange={(e) => setFilter(c.key, e.target.value)}
                                placeholder="فلتر..."
                                className="w-full pr-8 pl-2 py-1 text-[11px] bg-white border border-slate-200 rounded-full text-center"
                              />
                            </div>
                          </div>
                        </TableHead>
                      ))}
                      <TableHead className="w-24 text-center">إجراءات</TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {filtered.map((row, idx) => (
                      <TableRow key={row.id} className="hover:bg-indigo-50/40 transition-colors">
                        <TableCell className="text-center text-slate-500">{idx + 1}</TableCell>
                        {COLS.map((c) => {
                          const isEditing = activeCell?.rowId === row.id && activeCell?.colKey === c.key;
                          const val = (row as any)[c.key];
                          const isMoney = c.key === "hafizaAmount" || c.key === "notifyAmount";

                          return (
                            <TableCell
                              key={c.key}
                              className={`text-center py-2 align-middle ${isEditing ? "bg-indigo-50" : "cursor-pointer"}`}
                              onClick={() => !isEditing && handleCellClick(row.id, c.key, val)}
                            >
                              {isEditing ? (
                                <Input
                                  autoFocus
                                  value={cellValue}
                                  onChange={(e) => setCellValue(e.target.value)}
                                  onBlur={() => handleCellSave(row as Record<string, unknown> & { id: string })}
                                  onKeyDown={(e) => e.key === "Enter" && handleCellSave(row as Record<string, unknown> & { id: string })}
                                  className="h-9 text-sm bg-white border-2 border-indigo-400 text-center rounded-xl"
                                />
                              ) : (
                                <span className={`${isMoney ? "font-mono font-bold text-slate-800 px-2 py-1 rounded-md bg-indigo-50 inline-block" : "text-slate-700 font-medium"}`}>
                                  {isMoney ? fmt(Number(val) || 0) : String(val ?? "")}
                                </span>
                              )}
                            </TableCell>
                          );
                        })}
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                if (confirm("هل أنت متأكد من حذف هذا السجل؟")) deleteHafiza(row.id);
                              }}
                              className="h-8 w-8 text-slate-400 hover:text-white hover:bg-red-500 rounded-md"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}

                    {filtered.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={COLS.length + 2} className="h-48 text-center">
                          <div className="flex flex-col items-center justify-center gap-3 text-slate-400">
                            <div className="p-4 rounded-full bg-slate-100">
                              <Search className="w-8 h-8 opacity-40" />
                            </div>
                            <div className="font-bold text-slate-600">لا توجد سجلات مطابقة للبحث</div>
                            <div className="text-xs text-slate-400">جرب تعديل عوامل التصفية أو إضافة سجل جديد</div>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>

                  {filtered.length > 0 && (
                    <TableFooter>
                      <TableRow>
                        <TableCell className="text-center font-bold">∑</TableCell>
                        <TableCell className="text-center font-bold">إجمالي الصفحة</TableCell>
                        <TableCell colSpan={5}></TableCell>
                        <TableCell className="text-center font-mono font-bold text-indigo-700">
                          {fmt(totalHafizaAmount)}
                        </TableCell>
                        <TableCell colSpan={2}></TableCell>
                        <TableCell className="text-center font-mono font-bold text-emerald-700">
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
        </main>
      </div>

      {/* Floating Action Button for small screens */}
      <button
        onClick={() => setShowForm((s) => !s)}
        className="fixed bottom-6 left-6 md:left-auto md:right-6 z-50 bg-gradient-to-br from-fuchsia-500 to-indigo-600 text-white p-4 rounded-full shadow-2xl hover:scale-105 transition-transform"
        aria-label="Toggle form"
      >
        <Plus className="w-5 h-5" />
      </button>
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
          <div className="absolute right-4 top-1/2 -translate-y-1/2 z-10 bg-white p-2 rounded-lg shadow-sm">
            {icon}
          </div>
        )}
        <Input
          type={type}
          value={v}
          onChange={(e) => on(e.target.value)}
          className={`${icon ? "pr-14" : "px-4"} bg-white/70 border border-slate-200 rounded-2xl h-12 ${className}`}
        />
      </div>
    </div>
  );
}

function Stat({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <div className="text-xs text-slate-500">{label}</div>
      <div className="flex items-center gap-3">
        <div className="text-sm font-semibold">{value}</div>
        <div className="p-2 rounded-md bg-white/70">{icon}</div>
      </div>
    </div>
  );
}