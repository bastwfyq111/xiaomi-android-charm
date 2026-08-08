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
    <div className="w-full min-h-screen p-4 md:p-8 bg-slate-900 text-slate-100" dir="rtl">
      {/* HERO */}
      <div className="mb-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold flex items-center gap-3">
            <span className="p-2 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-md text-white">
              <Wallet className="w-6 h-6" />
            </span>
            لوحة الحوافظ — مظهر داكن عصري
          </h1>
          <p className="text-sm text-slate-300 mt-1">تصميم مُحسّن للهواتف: الحقول متجاورة على الشاشات الأكبر وتتكدّس بشكل عملي على الهواتف.</p>
        </div>

        <div className="flex items-center gap-2">
          <div className="hidden sm:flex gap-2">
            <Button onClick={() => setShowForm((s) => !s)} className="bg-gradient-to-r from-fuchsia-500 to-indigo-600 text-white rounded-2xl px-3 py-2 shadow-lg">
              <Plus className="w-4 h-4" /> {showForm ? "إخفاء النموذج" : "إضافة حافظة"}
            </Button>
            <ImportButton kind="hafiza" />
          </div>

          <div className="flex gap-2">
            <Card className="px-3 py-2 bg-slate-800/70 border border-slate-700 rounded-2xl shadow-sm flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gradient-to-br from-indigo-600 to-sky-500 text-white">
                <Layers className="w-4 h-4" />
              </div>
              <div className="text-right">
                <div className="text-[11px] text-slate-400 font-semibold uppercase">السجلات</div>
                <div className="text-lg font-black">{hafiza.length}</div>
              </div>
            </Card>

            <Card className="px-3 py-2 bg-slate-800/70 border border-slate-700 rounded-2xl shadow-sm flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gradient-to-br from-emerald-400 to-teal-500 text-white">
                <ArrowUpRight className="w-4 h-4" />
              </div>
              <div className="text-right">
                <div className="text-[11px] text-slate-400 font-semibold uppercase">المبلغ الإجمالي</div>
                <div className="text-lg font-black">{fmt(totalHafizaAmount)}</div>
              </div>
            </Card>
          </div>
        </div>
      </div>

      {/* MAIN LAYOUT: SIDEBAR + CONTENT */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* SIDEBAR */}
        <aside className="lg:col-span-3 flex flex-col gap-3">
          <div className="sticky top-4 space-y-3">
            <Card className="p-3 bg-slate-800/60 border border-slate-700 rounded-2xl shadow">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs text-slate-400 font-semibold">حالة التوازن</div>
                  <div className="mt-2 text-sm font-bold text-slate-100">{fmt(totalHafizaAmount - totalNotifyAmount)}</div>
                </div>
                <div className="p-2 rounded-full bg-slate-700">
                  <Wallet className="w-5 h-5 text-amber-400" />
                </div>
              </div>

              <div className="mt-3">
                <div className="text-[11px] text-slate-400 font-semibold">نسخة سريعة</div>
                <div className="flex gap-2 mt-3">
                  <Button size="sm" onClick={handleCopyAmountsToNotify} className="flex-1 bg-emerald-500 text-white rounded-xl shadow-sm">
                    <CheckSquare className="w-4 h-4" /> نسخ مبالغ
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => { setForm(empty); setNameQuery(""); }} className="rounded-xl text-slate-200/90">
                    <Eraser className="w-4 h-4 text-orange-300" /> مسح
                  </Button>
                </div>
              </div>
            </Card>

            <Card className="p-3 bg-slate-800/60 border border-slate-700 rounded-2xl shadow">
              <div className="text-xs text-slate-400 font-semibold">إحصاءات سريعة</div>
              <div className="mt-3 space-y-2">
                <Stat label="حوافظ مسجلة" value={`${hafiza.length}`} icon={<Layers className="w-4 h-4 text-indigo-400" />} />
                <Stat label="المبلغ الكلي" value={fmt(totalHafizaAmount)} icon={<Banknote className="w-4 h-4 text-emerald-400" />} />
                <Stat label="ترحيلات التوريد" value={fmt(totalNotifyAmount)} icon={<CreditCard className="w-4 h-4 text-teal-400" />} />
              </div>
            </Card>

            <Card className="p-3 bg-slate-800/60 border border-slate-700 rounded-2xl shadow">
              <div className="flex items-center justify-between">
                <div className="text-sm font-bold">تلميحات</div>
                <PartyPopper className="w-5 h-5 text-pink-400" />
              </div>
              <div className="mt-2 text-xs text-slate-400">
                اضغط على أي خلية لبدء التعديل، أو استخدم زر "نسخ مبالغ" لنسخ مبالغ الحافظة إلى عمود التوريد تلقائياً.
              </div>
            </Card>
          </div>
        </aside>

        {/* CONTENT */}
        <main className="lg:col-span-9 space-y-3">
          {/* FORM (قابلة للطي) */}
          <div className={`transition-all duration-300 ${showForm ? "max-h-[1400px] opacity-100" : "max-h-0 opacity-0 overflow-hidden"}`}>
            <Card className="p-4 bg-slate-800/60 rounded-3xl border border-slate-700 shadow-lg">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <h3 className="text-lg font-bold flex items-center gap-2">
                    <span className="p-2 rounded-lg bg-gradient-to-br from-indigo-600 to-violet-600 text-white">
                      <Plus className="w-4 h-4" />
                    </span>
                    إضافة حافظة جديدة
                  </h3>
                  <p className="text-sm text-slate-400 mt-1">املأ الحقول ثم اضغط حفظ — تصميم محسّن للهواتف.</p>
                </div>

                <div className="flex items-center gap-2">
                  <ImportButton kind="hafiza" />
                </div>
              </div>

              <CardContent className="p-0 mt-4">
                {/* responsive grid: mobile single column, small screens 2 cols, md 3 cols */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  <div className="sm:col-span-2 md:col-span-2">
                    <label className="text-xs font-semibold text-slate-300 mb-1 block">اسم المتدرب الكامل *</label>
                    <div className="relative">
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 bg-slate-700 p-2 rounded-lg">
                        <User className="w-4 h-4 text-amber-300" />
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
                        className="pr-12 bg-slate-700 text-slate-100 border border-slate-600 rounded-xl h-11"
                      />
                    </div>

                    {showSugg && nameSuggestions.length > 0 && (
                      <ul className="absolute z-50 left-0 right-0 mt-2 bg-slate-800/95 border border-slate-700 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                        {nameSuggestions.map((t) => (
                          <li key={t.name + t.batch}>
                            <button type="button" onMouseDown={() => pickName(t)} className="w-full text-right px-3 py-2 hover:bg-indigo-700/40 transition-colors flex flex-col">
                              <span className="font-bold text-slate-100 text-sm">{t.name}</span>
                              <span className="text-xs text-slate-300">{t.specialty} — {t.batch}</span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  <FieldDark label="الدفعة" icon={<Sparkles className="w-4 h-4 text-amber-300" />} v={form.batch} on={(v) => setForm({ ...form, batch: v })} />
                  <FieldDark label="التخصص الطبي" icon={<FileText className="w-4 h-4 text-emerald-300" />} v={form.specialty} on={(v) => setForm({ ...form, specialty: v })} />
                  <FieldDark label="التاريخ" type="date" icon={<Calendar className="w-4 h-4 text-rose-300" />} v={form.date} on={(v) => setForm({ ...form, date: v })} />
                  <FieldDark label="رقم الحافظة *" icon={<Hash className="w-4 h-4 text-violet-300" />} v={form.hafizaNo} on={(v) => setForm({ ...form, hafizaNo: v })} />
                  <FieldDark label="مبلغ الحافظة *" type="number" icon={<Banknote className="w-4 h-4 text-teal-300" />} v={form.hafizaAmount} on={(v) => setForm({ ...form, hafizaAmount: v })} />

                  <div>
                    <label className="text-xs font-semibold text-slate-300 mb-1 block">البيان والشرح</label>
                    <div className="relative">
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 bg-slate-700 p-2 rounded-lg">
                        <ScrollText className="w-4 h-4 text-cyan-300" />
                      </div>
                      <Input list="hafiza-descriptions" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="اكتب أو اختر..." className="pr-12 bg-slate-700 text-slate-100 border border-slate-600 rounded-xl h-11" />
                    </div>
                    <datalist id="hafiza-descriptions">
                      {Array.from(new Set([...DESCRIPTIONS, ...hafiza.map((h) => h.description).filter(Boolean)])).map((d) => (
                        <option key={d} value={d} />
                      ))}
                    </datalist>
                  </div>

                  <FieldDark label="تاريخ التوريد" type="date" icon={<Calendar className="w-4 h-4 text-orange-300" />} v={form.notifyDate} on={(v) => setForm({ ...form, notifyDate: v })} />
                  <FieldDark label="رقم الاشعار" icon={<Hash className="w-4 h-4 text-pink-300" />} v={form.notifyNo} on={(v) => setForm({ ...form, notifyNo: v })} />
                  <FieldDark label="مبلغ التوريد" type="number" icon={<CreditCard className="w-4 h-4 text-indigo-300" />} v={form.notifyAmount} on={(v) => setForm({ ...form, notifyAmount: v })} />
                </div>

                <div className="mt-3 flex flex-col sm:flex-row gap-2">
                  <Button onClick={submit} className="flex-1 bg-gradient-to-r from-fuchsia-500 to-indigo-600 text-white rounded-xl py-2 shadow-md">
                    <Save className="w-4 h-4" /> حفظ
                  </Button>
                  <Button variant="outline" onClick={() => { setForm(empty); setNameQuery(""); }} className="flex-1 rounded-xl py-2 text-slate-200 border border-slate-600">
                    <Eraser className="w-4 h-4 text-orange-300" /> مسح الحقول
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* TABLE CARD */}
          <Card className="p-0 bg-slate-800/50 rounded-3xl border border-slate-700 shadow-lg">
            <CardHeader className="flex items-center justify-between p-3 border-b border-slate-700">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-slate-700 text-amber-300">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <CardTitle className="text-lg font-bold text-slate-50">كشف القيود</CardTitle>
                  <CardDescription className="text-sm text-slate-400">عرض وتدقيق كافة حوافظ التوريد</CardDescription>
                </div>
                <Badge className="mr-4 bg-amber-400 text-slate-900">{filtered.length} سجل</Badge>
              </div>

              <div className="flex items-center gap-2">
                <div className="relative">
                  <input
                    value={filters.name || ""}
                    onChange={(e) => setFilter("name", e.target.value)}
                    placeholder="بحث بالاسم..."
                    className="px-3 py-2 rounded-full border border-slate-700 text-sm bg-slate-800 text-slate-100"
                  />
                  <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                </div>

                <Button size="sm" onClick={handleCopyAmountsToNotify} className="bg-emerald-500 text-white rounded-full px-3 py-2">
                  <CheckSquare className="w-4 h-4" /> نسخ المبالغ
                </Button>

                {Object.values(filters).some(Boolean) && (
                  <Button variant="ghost" size="sm" onClick={clearFilters} className="text-rose-400">
                    <X className="w-4 h-4" /> مسح الفلاتر
                  </Button>
                )}

                <TabActions title="حوافظ التوريد" rows={hafiza} columns={COLS} />
              </div>
            </CardHeader>

            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-slate-800/70 sticky top-0 z-10">
                    <TableRow>
                      <TableHead className="w-12 text-center text-slate-300">#</TableHead>
                      {COLS.map((c) => (
                        <TableHead key={c.key} className="text-center py-2">
                          <div className="flex flex-col items-center">
                            <button onClick={() => toggleSort(c.key)} className="flex items-center gap-2 text-slate-100">
                              <span className="font-bold text-sm">{c.label}</span>
                              {sortIndicator(sortKey, sortDir, c.key)}
                            </button>
                            <div className="mt-2 relative">
                              <Filter className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
                              <input
                                value={filters[c.key] || ""}
                                onChange={(e) => setFilter(c.key, e.target.value)}
                                placeholder="فلتر..."
                                className="w-full pr-8 pl-2 py-1 text-[11px] bg-slate-800 text-slate-100 border border-slate-700 rounded-full text-center"
                              />
                            </div>
                          </div>
                        </TableHead>
                      ))}
                      <TableHead className="w-24 text-center text-slate-300">إجراءات</TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {filtered.map((row, idx) => (
                      <TableRow key={row.id} className="hover:bg-slate-800/60 transition-colors">
                        <TableCell className="text-center text-slate-400">{idx + 1}</TableCell>
                        {COLS.map((c) => {
                          const isEditing = activeCell?.rowId === row.id && activeCell?.colKey === c.key;
                          const val = (row as any)[c.key];
                          const isMoney = c.key === "hafizaAmount" || c.key === "notifyAmount";

                          return (
                            <TableCell
                              key={c.key}
                              className={`text-center py-2 align-middle ${isEditing ? "bg-slate-700" : "cursor-pointer"}`}
                              onClick={() => !isEditing && handleCellClick(row.id, c.key, val)}
                            >
                              {isEditing ? (
                                <Input
                                  autoFocus
                                  value={cellValue}
                                  onChange={(e) => setCellValue(e.target.value)}
                                  onBlur={() => handleCellSave(row as Record<string, unknown> & { id: string })}
                                  onKeyDown={(e) => e.key === "Enter" && handleCellSave(row as Record<string, unknown> & { id: string })}
                                  className="h-9 text-sm bg-slate-700 text-slate-100 border-2 border-amber-400 text-center rounded-xl"
                                />
                              ) : (
                                <span className={`${isMoney ? "font-mono font-bold text-amber-200 px-2 py-1 rounded-md bg-slate-800 inline-block" : "text-slate-100 font-medium"}`}>
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
                              aria-label="حذف السجل"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}

                    {filtered.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={COLS.length + 2} className="h-44 text-center">
                          <div className="flex flex-col items-center justify-center gap-3 text-slate-400">
                            <div className="p-3 rounded-full bg-slate-700">
                              <Search className="w-8 h-8 opacity-50" />
                            </div>
                            <div className="font-bold text-slate-300">لا توجد سجلات مطابقة للبحث</div>
                            <div className="text-xs text-slate-400">جرب تعديل عوامل التصفية أو إضافة سجل جديد</div>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>

                  {filtered.length > 0 && (
                    <TableFooter>
                      <TableRow>
                        <TableCell className="text-center font-bold text-slate-300">∑</TableCell>
                        <TableCell className="text-center font-bold text-slate-100">إجمالي الصفحة</TableCell>
                        <TableCell colSpan={5}></TableCell>
                        <TableCell className="text-center font-mono font-bold text-amber-300">
                          {fmt(totalHafizaAmount)}
                        </TableCell>
                        <TableCell colSpan={2}></TableCell>
                        <TableCell className="text-center font-mono font-bold text-emerald-300">
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
        className="fixed bottom-4 left-4 md:left-auto md:right-6 z-50 bg-gradient-to-br from-fuchsia-500 to-indigo-600 text-white p-3 rounded-full shadow-2xl hover:scale-105 transition-transform"
        aria-label="Toggle form"
      >
        <Plus className="w-5 h-5" />
      </button>
    </div>
  );
}

function FieldDark({
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
      <label className="text-xs font-semibold text-slate-300 mb-1 block">{label}</label>
      <div className="relative">
        {icon && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 z-10 bg-slate-700 p-2 rounded-lg">
            {icon}
          </div>
        )}
        <Input
          type={type}
          value={v}
          onChange={(e) => on(e.target.value)}
          className={`${icon ? "pr-12" : "px-3"} bg-slate-700 text-slate-100 border border-slate-600 rounded-xl h-11 ${className}`}
        />
      </div>
    </div>
  );
}

function Stat({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <div className="text-xs text-slate-400">{label}</div>
      <div className="flex items-center gap-3">
        <div className="text-sm font-semibold text-slate-100">{value}</div>
        <div className="p-2 rounded-md bg-slate-700">{icon}</div>
      </div>
    </div>
  );
}