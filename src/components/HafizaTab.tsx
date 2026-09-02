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
import WebActionMenu, { type WebActionItem } from "./WebActionMenu";
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
 const { trainees, hafiza, addHafiza, deleteHafiza, clearHafiza, addTrainee, updateHafiza } = useStore();
 const [form, setForm] = useState < Form > (empty);
 const [nameQuery, setNameQuery] = useState("");
 const [showSugg, setShowSugg] = useState(false);
 
 const [activeCell, setActiveCell] = useState < { rowId: string;colKey: string } | null > (null);
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
 
 const handleClearHafiza = () => {
  if (hafiza.length === 0) {
   toast.info("لا توجد سجلات حوافظ لمسحها");
   return;
  }
  if (!confirm("هل أنت متأكد من مسح جميع سجلات الحوافظ؟ لا يمكن التراجع عن هذا الإجراء.")) return;
  clearHafiza();
  setActiveCell(null);
  toast.success("تم مسح جميع سجلات الحوافظ بنجاح");
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
 
 const handleCellSave = (row: Record < string, unknown > & { id: string }) => {
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
 
 const hafizaWebActions: WebActionItem[] = [
 {
  label: "إضافة حافظة",
  icon: Plus,
  onSelect: () => setShowForm(true),
  disabled: showForm,
 },
 {
  label: "استيراد Excel",
  onSelect: () => undefined,
  content: (
   <div className="flex w-full items-center rounded-lg hover:bg-gold text-black border border-black">
          <ImportButton kind="hafiza" />
        </div>
  ),
 },
 {
  label: "مسح البيانات",
  icon: Trash2,
  onSelect: handleClearHafiza,
  disabled: hafiza.length === 0,
  destructive: true,
 }, ];
 return (
  <div className="w-full min-h-screen p-1.5 sm:p-3 bg-gradient-to-br from-[red]to-white text-black" dir="rtl">
      {/* HERO */}
<div className="mb-3 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
        </div>
<div className="bg-[oklch(0.80_0.02_100)] border border-black shadow-xm rounded-xl p-3">
  <div className="flex items-center gap-2">
    <span className="p-1.5 rounded-lg bg-[oklch(0.92_0.03_240)] border border-black text-[oklch(0.12_0_0)] shadow-xs shrink-0">
      <Wallet className="w-4 h-4" />
    </span>
    <h1 className="text-xl md:text-base font-bold text-[oklch(0.12_0_0)] whitespace-nowrap">
      لوحة الحوافظ التوريد
    </h1>
  </div>
  <p className="text-[11px] text-[oklch(0.25_0_0)] mt-1 whitespace-nowrap truncate">
    تصميم ملائم للهواتف: صفان من الحقول، عناصر متراصة وأقسام مرقمة بألوان مميزة.
  </p>
</div>

<Card className="w-full md:w-auto p-2 bg-[oklch(0.96_0.02_240)] rounded-2xl border border-black/15 shadow-sm">
  <div className="web-only-actions">
    <WebActionMenu label="إجراءات الحوافظ" actions={hafizaWebActions} />
  </div>
  <div className="apk-only-actions grid grid-cols-2 sm:flex items-center justify-end gap-1.5 sm:gap-2">
    {!showForm && (
      <Button onClick={() => setShowForm(true)} className="min-w-0 justify-center bg-[oklch(0.88_0.04_245)] hover:bg-[oklch(0.82_0.05_245)] text-[oklch(0.12_0_0)] border border-black/15 rounded-full px-2 sm:px-3 py-1 text-xs sm:text-sm shadow-xs font-semibold">
        <Plus className="w-4 h-4 ml-1" /> إضافة
      </Button>
    )}
    <ImportButton kind="hafiza" />
    <Button
      type="button"
      variant="outline"
      onClick={handleClearHafiza}
      className="min-w-0 justify-center rounded-full border-red-500/30 text-red-700 hover:bg-red-500/10 hover:text-red-800 px-2 sm:px-3 py-1 text-xs sm:text-sm font-medium"
      disabled={hafiza.length === 0}
    >
      <Trash2 className="w-4 h-4 ml-1" />
      مسح البيانات
    </Button>
  </div>
</Card>

      {/* MAIN LAYOUT: SIDEBAR + CONTENT */}
<div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
        {/* CONTENT */}
        <main className="lg:col-span-12 space-y-3">
          {/* FORM (قابلة للطي) */}
 <div className={`transition-all duration-300 ${showForm ? "max-h-[1400px] opacity-100" : "max-h-0 opacity-0 overflow-hidden"}`}>
            <Card className="p-3  bg-gradient-to-b from-sky-50/60 to-white shadow-lg border border-sky-100 rounded-2xl">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <h3 className="text-xl font-bold flex items-center gap-2 text-white">
                    <span className="p-2 rounded-md bg-white/10 text-white border border-black/30">
                      <Plus className="w-4 h-4" />
                    </span>
                    إضافة حافظة
                  </h3>
                  <p className="text-xs text-slate-300 mt-1">صفان من الحقول في كل صف — تصميم مدمج للهواتف.</p>
                </div>

              </div>

              <CardContent className="p-0 mt-3">
                {/* compact grid: always two columns so each row shows 2 fields */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xl font-semibold text-white mb-1 block">الاسم الكامل *</label>
                    <div className="relative">
                      <div className="absolute right-2 top-1/2 -translate-y-1/2 bg-slate-100 p-1 rounded-md border border-black z-10">
                        <User className="w-4 h-4 text-amber-600" />
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
                        placeholder="ابحث أو اكتب..."
                        className="pr-10 bg-white text-black border-2 border-black/80 focus:border-black rounded-md h-8 text-xs font-semibold placeholder:text-slate-500 shadow-inner"
                      />
                    </div>

                    {showSugg && nameSuggestions.length > 0 && (
                      <ul className="absolute z-50 left-0 right-0 mt-1 bg-white border-2 border-black rounded-lg shadow-xl max-h-40 overflow-y-auto text-slate-900 text-sm">
                        {nameSuggestions.map((t) => (
                          <li key={t.name + t.batch}>
                            <button type="button" onMouseDown={() => pickName(t)} className="w-full text-right px-2 py-2 hover:bg-amber-100 transition-colors flex flex-col border-b border-gray-100 last:border-b-0">
                              <span className="font-bold text-slate-900 text-sm">{t.name}</span>
                              <span className="text-xs text-slate-600">{t.specialty} — {t.batch}</span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  <FieldDark label="الدفعة" icon={<Sparkles className="w-4 h-4 text-white-500" />} v={form.batch} on={(v) => setForm({ ...form, batch: v })} />
                  <FieldDark label="التخصص" icon={<FileText className="w-4 h-4 text-white-600" />} v={form.specialty} on={(v) => setForm({ ...form, specialty: v })} />
                  <FieldDark label="التاريخ" type="date" icon={<Calendar className="w-4 h-4 text-white-600" />} v={form.date} on={(v) => setForm({ ...form, date: v })} />
                  <FieldDark label="رقم الحافظة" icon={<Hash className="w-4 h-4 text-white-600" />} v={form.hafizaNo} on={(v) => setForm({ ...form, hafizaNo: v })} />
                  <FieldDark label="مبلغ الحافظة" type="number" icon={<Banknote className="w-4 h-4 text-white-600" />} v={form.hafizaAmount} on={(v) => setForm({ ...form, hafizaAmount: v })} />

                  <div>
                    <label className="text-xs font-semibold text-white -200 mb-1 block">البيان</label>
                    <div className="relative">
                      <div className="absolute right-2 top-1/2 -translate-y-1/2 bg-slate-100 p-1 rounded-md border border-black/40 z-10">
                        <ScrollText className="w-4 h-4 text-white-600" />
                      </div>
                      <Input list="hafiza-descriptions" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="اكتب أو اختر..." className="pr-10 bg-white text-black border-2 border-black/80 focus:border-black rounded-md h-8 text-xs font-semibold placeholder:text-slate-500 shadow-inner" />
                    </div>
                    <datalist id="hafiza-descriptions">
                      {Array.from(new Set([...DESCRIPTIONS, ...hafiza.map((h) => h.description).filter(Boolean)])).map((d) => (
                        <option key={d} value={d} />
                      ))}
                    </datalist>
                  </div>

                  <FieldDark label="تاريخ التوريد" type="date" icon={<Calendar className="w-4 h-4 text-w-600" />} v={form.notifyDate} on={(v) => setForm({ ...form, notifyDate: v })} />
                  <FieldDark label="رقم الاشعار" icon={<Hash className="w-4 h-4 text-sky-600" />} v={form.notifyNo} on={(v) => setForm({ ...form, notifyNo: v })} />
                  <FieldDark label="مبلغ التوريد" type="number" icon
                  ={<CreditCard className="w-4 h-4 text-emerald-600" />} v={form.notifyAmount} on={(v) => setForm({ ...form, notifyAmount: v })} />

                </div>

                <div className="mt-4 flex items-center gap-3 justify-end pt-2 border-t border-black/30">
                  <Button onClick={submit} className="bg-emerald-600 hover:bg-emerald-500 text-white border-2 border-black rounded-lg py-2 px-5 text-base font-bold shadow-md flex items-center gap-1.5 transition-colors">
                    <Save className="w-5 h-5" /> حفظ
                  </Button>
                  <Button variant="outline" onClick={() => { setForm(empty); setNameQuery(""); }} className="rounded-lg py-2 px-5 text-base font-bold text-white bg-rose-700 hover:bg-rose-600 border-2 border-black shadow-md flex items-center gap-1.5 transition-colors">
                    <Eraser className="w-5 h-5 text-white" /> مسح
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* TABLE CARD */}
          <Card className="p-0 bg-white rounded-2xl border border-[#2e6b8a]/10 shadow-sm border-l-4 border-[#2e6b8a]">
            <CardHeader className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between p-2 sm:p-3 gap-2 border-b border-gray-100">
              <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                <div className="p-2 rounded-lg bg-[#2e6b8a]/10 text-[#2e6b8a]">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <CardTitle className="text-md font-bold text-slate-800">كشف القيود</CardTitle>
                  <CardDescription className="text-sm text-slate-600">عرض وتدقيق كافة حوافظ التوريد</CardDescription>
                </div>
                <Badge className="mr-4 bg-[#b8d4e8] text-[#1a1206]">{filtered.length} سجل</Badge>
              </div>

              <div className="grid grid-cols-2 sm:flex items-center justify-end gap-1 sm:gap-2 w-full sm:w-auto">
                <div className="col-span-2 sm:col-span-1 relative min-w-0">
                  <input
                    value={filters.name || ""}
                    onChange={(e) => setFilter("name", e.target.value)}
                    placeholder="بحث بالاسم..."
                    className="w-full sm:w-40 px-1.5 py-1 rounded-full border border-gray-200 text-xs sm:text-xs bg-white text-slate-800"
                  />
                  <Search className="w-3.5 h-3.5 absolute left-2 top-1.5 text-slate-400" />
                </div>

                <Button size="sm" onClick={handleCopyAmountsToNotify} className="min-w-0 justify-center bg-emerald-500 text-white rounded-full px-1.5 sm:px-2 py-1 text-xs sm:text-xs">
                  <CheckSquare className="w-4 h-4" />
                </Button>

                {Object.values(filters).some(Boolean) && (
                  <Button variant="ghost" size="sm" onClick={clearFilters} className="min-w-0 justify-center text-red-500 px-1.5 py-1 text-xs sm:text-xs">
                    <X className="w-4 h-4" />
                  </Button>
                )}

                <TabActions title="حوافظ التوريد" rows={hafiza} columns={COLS} fileName="حوافظ-التوريد" pdfLayout="wide-centered" className="col-span-2 w-full !grid !grid-cols-2 sm:!flex !gap-1 sm:!gap-2 [&>button]:min-w-0 [&>button]:justify-center [&>button]:px-1 [&>button]:py-1 sm:[&>button]:px-2 sm:[&>button]:py-1 [&>button]:text-xs sm:[&>button]:text-xs" />
              </div>
            </CardHeader>

            <CardContent className="p-0">
              <div className="w-full overflow-auto max-h-[72vh] overscroll-x-contain rounded-xl">
                <Table className="min-w-max table-auto text-sm sm:text-base font-semibold">
                  <TableHeader className="bg-[#2e6b8a] sticky top-0 z-10 [&_th]:text-white">
                    <TableRow>
                      <TableHead className="whitespace-nowrap !px-1 !py-1.5 sm:!px-2 sm:!py-2 !text-sm sm:!text-base text-center text-slate-500">#</TableHead>
                      {COLS.map((c) => (
                        <TableHead key={c.key} className="whitespace-nowrap !px-1 !py-1.5 sm:!px-2 sm:!py-2 !text-sm sm:!text-base text-center">
                          <div className="flex flex-col items-center">
                            <button onClick={() => toggleSort(c.key)} className="flex items-center gap-1 whitespace-nowrap text-slate-800 text-xs sm:text-sm">
                              <span className="font-semibold">{c.label}</span>
                              {sortIndicator(sortKey === c.key, sortDir)}
                            </button>
                            <div className="mt-1 relative">
                              <Filter className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                              <input
                                value={filters[c.key] || ""}
                                onChange={(e) => setFilter(c.key, e.target.value)}
                                placeholder="فلتر..."
                        className="w-20 sm:w-24 max-w-none whitespace-nowrap bg-white px-1 py-1 text-xs sm:text-xs text-center text-slate-800 border border-gray-200 rounded-full"
                              />
                            </div>
                          </div>
                        </TableHead>
                      ))}
                      <TableHead className="whitespace-nowrap !px-1 !py-1.5 sm:!px-2 sm:!py-2 !text-sm sm:!text-base text-center text-slate-500">إجراءات</TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {filtered.map((row, idx) => (
                      <TableRow key={row.id} className="hover:bg-sky-50 transition-colors">
                        <TableCell className="whitespace-nowrap !px-1 !py-1.5 sm:!px-2 sm:!py-2 !text-sm sm:!text-base text-center text-slate-600">{idx + 1}</TableCell>
                        {COLS.map((c) => {
                          const isEditing = activeCell?.rowId === row.id && activeCell?.colKey === c.key;
                          const val = (row as any)[c.key];
                          const isMoney = c.key === "hafizaAmount" || c.key === "notifyAmount";
                          const isDate = /date|تاريخ|اليوم|الشهر|السنة|year|month|day/i.test(`${c.key} ${c.label}`);

                          return (
                            <TableCell
                              key={c.key}
                              className={`whitespace-nowrap !px-1 !py-1.5 sm:!px-2 sm:!py-2 !text-sm sm:!text-base text-center align-middle ${isMoney ? "numeric-cell" : ""} ${isDate ? "date-cell" : ""} ${isEditing ? "bg-sky-50" : "cursor-pointer"}`}
                              onClick={() => !isEditing && handleCellClick(row.id, c.key, val)}
                            >
                              {isEditing ? (
                                <Input
                                  autoFocus
                                  value={cellValue}
                                  onChange={(e) => setCellValue(e.target.value)}
                                  onBlur={() => handleCellSave(row as Record<string, unknown> & { id: string })}
                                  onKeyDown={(e) => e.key === "Enter" && handleCellSave(row as Record<string, unknown> & { id: string })}
                                  className="h-8 sm:h-9 text-xs sm:text-sm bg-white text-slate-900 border-2 border-amber-400 text-center rounded-md"
                                />
                              ) : (
                                <span className={`${isMoney ? "numeric-cell font-mono font-bold text-amber-700 px-1.5 py-1 sm:px-2 rounded-md bg-sky-50 inline-block text-xs sm:text-sm" : isDate ? "date-cell text-slate-800 font-medium text-xs sm:text-sm whitespace-nowrap" : "text-slate-800 font-medium text-xs sm:text-sm whitespace-nowrap"}`}>
                                  {isMoney ? fmt(Number(val) || 0) : String(val ?? "")}
                                </span>
                              )}
                            </TableCell>
                          );
                        })}
                        <TableCell className="whitespace-nowrap !px-1 !py-1.5 sm:!px-2 sm:!py-2 !text-sm sm:!text-base text-center">
                          <div className="flex items-center justify-center gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                if (confirm("هل أنت متأكد من حذف هذا السجل؟")) deleteHafiza(row.id);
                              }}
                              className="h-7 w-7 sm:h-8 sm:w-8 text-slate-500 hover:text-white hover:bg-red-500 rounded-md"
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
                        <TableCell colSpan={COLS.length + 2} className="h-36 text-center">
                          <div className="flex flex-col items-center justify-center gap-2 text-slate-600">
                            <div className="p-2 rounded-full bg-sky-50">
                              <Search className="w-6 h-6 opacity-60 text-amber-500" />
                            </div>
                            <div className="font-bold text-slate-700">لا توجد سجلات مطابقة</div>
                            <div className="text-xs text-slate-600">جرب تعديل عوامل التصفية أو إضافة سجل جديد</div>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>

                  {filtered.length > 0 && (
                    <TableFooter>
                      <TableRow>
                        <TableCell className="text-center font-bold text-slate-600">∑</TableCell>
                        <TableCell className="text-center font-bold text-slate-800">إجمالي الصفحة</TableCell>
                        <TableCell colSpan={5}></TableCell>
                        <TableCell className="text-center numeric-cell font-mono font-bold text-amber-700 text-xs sm:text-sm">
                          {fmt(totalHafizaAmount)}
                        </TableCell>
                        <TableCell colSpan={4}></TableCell>
                        <TableCell className="text-center numeric-cell font-mono font-bolder text-black-700 text-xs sm:text-sm">
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
 type ? : string;
 icon ? : React.ReactNode;
 className ? : string;
}) {
 return (
  <div className="w-full">
      <label className="text-xs font-medium text-slate-700 mb-1 block">{label}</label>
      <div className="relative">
        {icon && (
          <div className="absolute right-2 top-1/2 -translate-y-1/2 z-10 bg-white p-1 rounded-md border border-gray-100">
            {icon}
          </div>
        )}
        <Input
          type={type}
          value={v}
          onChange={(e) => on(e.target.value)}
          className={`${icon ? "pr-10" : "px-2"} bg-white text-slate-900 border border-gray-200 rounded-md h-8 text-sm ${className}`}
        />
      </div>
    </div>
 );
}

function Stat({ label, value, icon }: { label: string;value: string;icon: React.ReactNode }) {
 return (
  <div className="flex items-center justify-between">
      <div className="text-xs text-slate-600">{label}</div>
      <div className="flex items-center gap-2">
        <div className="text-sm font-semibold text-slate-800">{value}</div>
        <div className="p-1 rounded-md bg-sky-50">{icon}</div>
      </div>
    </div>
 );
}