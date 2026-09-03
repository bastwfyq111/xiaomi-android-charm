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
  Filter,
  CreditCard,
  ScrollText,
} from "lucide-react";
import TabActions from "./TabActions";
import WebActionMenu, { type WebActionItem } from "./WebActionMenu";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

// palette inspired by the provided image (top -> bottom)
const PALETTE = ["#6A4C93", "#1982C4", "#8AC926", "#FFCA3A", "#FF595E"];

// table columns
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
  const { trainees, hafiza, addHafiza, deleteHafiza, clearHafiza, addTrainee, updateHafiza } =
    useStore();
  const [form, setForm] = useState<Form>(empty);
  const [nameQuery, setNameQuery] = useState("");
  const [showSugg, setShowSugg] = useState(false);

  const [activeCell, setActiveCell] = useState<{ rowId: string; colKey: string } | null>(null);
  const [cellValue, setCellValue] = useState("");

  const [showForm, setShowForm] = useState(true);

  const { rows: filtered, sortKey, sortDir, toggleSort, filters, setFilter, clearFilters } =
    useTableControls(hafiza, COLS.map((c) => c.key));

  const totalHafizaAmount = useMemo(
    () => filtered.reduce((sum, item) => sum + (Number(item.hafizaAmount) || 0), 0),
    [filtered],
  );

  const totalNotifyAmount = useMemo(
    () => filtered.reduce((sum, item) => sum + (Number(item.notifyAmount) || 0), 0),
    [filtered],
  );

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
        <div className="flex w-full items-center rounded-lg hover:brightness-95" style={{ border: "1px solid #000" }}>
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
    },
  ];

  return (
    <div
      className="w-full min-h-screen p-2 sm:p-3"
      dir="rtl"
      style={{
        background: `linear-gradient(180deg, ${PALETTE[0]} 0%, ${PALETTE[1]} 22%, ${PALETTE[2]} 44%, ${PALETTE[3]} 66%, ${PALETTE[4]} 100%)`,
        WebkitFontSmoothing: "antialiased",
      }}
    >
      <div className="mb-3 flex flex-col md:flex-row items-start md:items-center justify-between gap-3" />

      <div
        className="rounded-xl p-3 mb-3"
        style={{
          background: "rgba(255,255,255,0.92)",
          border: "1px solid #000",
          boxShadow: "0 6px 18px rgba(0,0,0,0.12)",
        }}
      >
        <div className="flex items-center gap-3">
          <span
            className="p-2 rounded-lg flex items-center justify-center"
            style={{ background: "#fff", border: "1px solid #000" }}
          >
            <Wallet className="w-5 h-5 text-black" />
          </span>
          <div>
            <h1 className="text-lg font-bold text-black">لوحة الحوافظ التوريد</h1>
            <p className="text-xs text-slate-700 mt-1">عرض سريع متوافق مع شاشات الهواتف</p>
          </div>
        </div>
      </div>

      <div className="mb-3 flex items-center gap-2 flex-wrap">
        <div style={{ border: "1px solid #000", borderRadius: 12, overflow: "hidden" }}>
          <Card className="p-2 bg-white/90" style={{ border: "none", boxShadow: "none" }}>
            <div className="flex items-center gap-2">
              <WebActionMenu label="إجراءات الحوافظ" actions={hafizaWebActions} />
            </div>
          </Card>
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <Button
            onClick={handleCopyAmountsToNotify}
            className="px-3 py-1 rounded-full font-bold"
            style={{ background: PALETTE[3], color: "#000", border: "1px solid #000" }}
          >
            <CheckSquare className="w-4 h-4 ml-1" />
            نسخ مبالغ للحوالة
          </Button>

          <Button
            onClick={() => setShowForm((s) => !s)}
            className="px-3 py-1 rounded-full font-bold"
            style={{ background: PALETTE[2], color: "#fff", border: "1px solid #000" }}
          >
            <Plus className="w-4 h-4 ml-1" />
            إضافة / إظهار الفورم
          </Button>
        </div>
      </div>

      <div className={`transition-all duration-300 ${showForm ? "max-h-[1400px]" : "max-h-0 overflow-hidden"}`}>
        <Card
          className="mb-3"
          style={{
            background: "rgba(255,255,255,0.96)",
            border: "1px solid #000",
            borderRadius: 14,
            boxShadow: "0 8px 24px rgba(0,0,0,0.14)",
            padding: 12,
          }}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 12,
                  background: PALETTE[1],
                  display: "grid",
                  placeItems: "center",
                }}
              >
                <Plus className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-black">إضافة حافظة</h3>
                <p className="text-xs text-slate-700 mt-1">صفين من الحقول — مناسب للشاشات الصغيرة</p>
              </div>
            </div>
          </div>

          <CardContent>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-sm font-semibold text-black block mb-1">الاسم الكامل *</label>
                <div className="relative">
                  <div style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", background: "#fff", padding: 6, borderRadius: 8, border: "1px solid #000" }}>
                    <User className="w-4 h-4 text-black" />
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
                    className="pr-10 bg-white text-black border border-black rounded-md h-9 text-sm"
                  />
                </div>

                {showSugg && nameSuggestions.length > 0 && (
                  <ul style={{ position: "absolute", zIndex: 60, left: 0, right: 0, marginTop: 6, background: "#fff", border: "1px solid #000", borderRadius: 10, maxHeight: 200, overflow: "auto" }}>
                    {nameSuggestions.map((t) => (
                      <li key={t.name + t.batch}>
                        <button type="button" onMouseDown={() => pickName(t)} className="w-full text-right px-3 py-2 hover:bg-slate-50 flex flex-col">
                          <span className="font-bold text-sm text-black">{t.name}</span>
                          <span className="text-xs text-slate-600">{t.specialty} — {t.batch}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <FieldDark label="الدفعة" icon={<Sparkles className="w-4 h-4 text-black" />} v={form.batch} on={(v) => setForm({ ...form, batch: v })} />
              <FieldDark label="التخصص" icon={<FileText className="w-4 h-4 text-black" />} v={form.specialty} on={(v) => setForm({ ...form, specialty: v })} />
              <FieldDark label="التاريخ" type="date" icon={<Calendar className="w-4 h-4 text-black" />} v={form.date} on={(v) => setForm({ ...form, date: v })} />
              <FieldDark label="رقم الحافظة" icon={<Hash className="w-4 h-4 text-black" />} v={form.hafizaNo} on={(v) => setForm({ ...form, hafizaNo: v })} />
              <FieldDark label="مبلغ الحافظة" type="number" icon={<CreditCard className="w-4 h-4 text-black" />} v={form.hafizaAmount} on={(v) => setForm({ ...form, hafizaAmount: v })} />

              <div>
                <label className="text-xs font-semibold text-black mb-1 block">البيان</label>
                <div className="relative">
                  <div style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", background: "#fff", padding: 6, borderRadius: 8, border: "1px solid rgba(0,0,0,0.15)" }}>
                    <ScrollText className="w-4 h-4 text-black" />
                  </div>
                  <Input
                    list="hafiza-descriptions"
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    placeholder="اكتب أو اختر..."
                    className="bg-white text-black border border-black rounded-md h-9 text-sm px-2"
                  />
                </div>
                <datalist id="hafiza-descriptions">
                  {Array.from(new Set([...DESCRIPTIONS, ...hafiza.map((h) => h.description).filter(Boolean)])).map((d) => (
                    <option key={d} value={d} />
                  ))}
                </datalist>
              </div>

              <FieldDark label="تاريخ التوريد" type="date" icon={<Calendar className="w-4 h-4 text-black" />} v={form.notifyDate} on={(v) => setForm({ ...form, notifyDate: v })} />
              <FieldDark label="رقم الاشعار" icon={<Hash className="w-4 h-4 text-black" />} v={form.notifyNo} on={(v) => setForm({ ...form, notifyNo: v })} />
              <FieldDark label="مبلغ التوريد" type="number" icon={<CreditCard className="w-4 h-4 text-black" />} v={form.notifyAmount} on={(v) => setForm({ ...form, notifyAmount: v })} />
            </div>

            <div className="mt-4 flex items-center gap-3 justify-end pt-2" style={{ borderTop: "1px solid rgba(0,0,0,0.12)" }}>
              <Button onClick={submit} className="px-4 py-2 rounded-full font-bold" style={{ background: PALETTE[2], color: "#fff", border: "1px solid #000" }}>
                <Save className="w-4 h-4 ml-1" /> حفظ
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setForm(empty);
                  setNameQuery("");
                }}
                className="px-4 py-2 rounded-full font-bold"
                style={{ background: PALETTE[4], color: "#fff", border: "1px solid #000" }}
              >
                <Eraser className="w-4 h-4" /> مسح
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card style={{ border: "1px solid #000", borderRadius: 14, background: "rgba(255,255,255,0.94)", boxShadow: "0 8px 20px rgba(0,0,0,0.12)" }}>
        <CardHeader style={{ borderBottom: "1px solid rgba(0,0,0,0.06)" }}>
          <div className="flex items-center gap-3">
            <div style={{ width: 44, height: 44, borderRadius: 10, background: PALETTE[1], display: "grid", placeItems: "center" }}>
              <FileText className="w-5 h-5 text-white" />
            </div>
            <div>
              <CardTitle className="text-lg font-bold text-black">كشف القيود</CardTitle>
              <CardDescription className="text-xs text-slate-700">عرض وتدقيق كافة حوافظ التوريد</CardDescription>
            </div>
            <div style={{ marginLeft: 12 }}>
              <Badge style={{ background: PALETTE[0], color: "#fff", border: "1px solid #000" }}>{filtered.length} سجل</Badge>
            </div>
          </div>

          <div style={{ marginTop: 8 }} className="flex gap-2 items-center">
            <input
              value={filters.name || ""}
              onChange={(e) => setFilter("name", e.target.value)}
              placeholder="بحث بالاسم..."
              className="px-2 py-1 rounded-full"
              style={{ border: "1px solid #000", width: 180 }}
            />
            <Button size="sm" onClick={handleCopyAmountsToNotify} style={{ background: PALETTE[3], color: "#000", border: "1px solid #000" }}>
              <CheckSquare className="w-4 h-4" />
            </Button>
            {Object.values(filters).some(Boolean) && (
              <Button variant="ghost" size="sm" onClick={clearFilters} style={{ border: "1px solid #000" }}>
                <X className="w-4 h-4" />
              </Button>
            )}
            <div style={{ marginLeft: "auto" }}>
              <TabActions title="حوافظ التوريد" rows={hafiza} columns={COLS} fileName="حوافظ-التوريد" pdfLayout="wide-centered" />
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <div className="w-full overflow-auto max-h-[72vh] rounded-lg">
            <Table>
              <TableHeader style={{ background: PALETTE[0], color: "#fff" }}>
                <TableRow>
                  <TableHead>#</TableHead>
                  {COLS.map((c) => (
                    <TableHead key={c.key}>
                      <div className="flex flex-col items-center">
                        <button onClick={() => toggleSort(c.key)} className="flex items-center gap-1 text-xs">
                          <span className="font-semibold">{c.label}</span>
                          {sortIndicator(sortKey === c.key, sortDir)}
                        </button>
                        <div style={{ marginTop: 6 }}>
                          <input
                            value={filters[c.key] || ""}
                            onChange={(e) => setFilter(c.key, e.target.value)}
                            placeholder="فلتر..."
                            className="px-1 py-1 rounded-full"
                            style={{ width: 92, border: "1px solid rgba(0,0,0,0.12)" }}
                          />
                        </div>
                      </div>
                    </TableHead>
                  ))}
                  <TableHead>إجراءات</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {filtered.map((row, idx) => (
                  <TableRow key={row.id} style={{ borderBottom: "1px solid rgba(0,0,0,0.06)" }}>
                    <TableCell>{idx + 1}</TableCell>
                    {COLS.map((c) => {
                      const isEditing = activeCell?.rowId === row.id && activeCell?.colKey === c.key;
                      const val = (row as any)[c.key];
                      const isMoney = c.key === "hafizaAmount" || c.key === "notifyAmount";

                      return (
                        <TableCell key={c.key} onClick={() => !isEditing && handleCellClick(row.id, c.key, val)}>
                          {isEditing ? (
                            <Input
                              autoFocus
                              value={cellValue}
                              onChange={(e) => setCellValue(e.target.value)}
                              onBlur={() => handleCellSave(row as Record<string, unknown> & { id: string })}
                              onKeyDown={(e) => e.key === "Enter" && handleCellSave(row as Record<string, unknown> & { id: string })}
                              className="h-8 text-sm bg-white"
                              style={{ border: "2px solid rgba(0,0,0,0.12)", textAlign: "center" }}
                            />
                          ) : (
                            <span style={{ display: "inline-block", minWidth: 64 }}>
                              {isMoney ? fmt(Number(val) || 0) : String(val ?? "")}
                            </span>
                          )}
                        </TableCell>
                      );
                    })}
                    <TableCell>
                      <div className="flex items-center justify-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            if (confirm("هل أنت متأكد من حذف هذا السجل؟")) deleteHafiza(row.id);
                          }}
                          style={{ border: "1px solid #000" }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>

              {filtered.length > 0 && (
                <TableFooter>
                  <TableRow>
                    <TableCell>∑</TableCell>
                    <TableCell>إجمالي الصفحة</TableCell>
                    <TableCell colSpan={5}></TableCell>
                    <TableCell style={{ textAlign: "center", fontFamily: "monospace", fontWeight: 700 }}>{fmt(totalHafizaAmount)}</TableCell>
                    <TableCell colSpan={4}></TableCell>
                    <TableCell style={{ textAlign: "center", fontFamily: "monospace", fontWeight: 700 }}>{fmt(totalNotifyAmount)}</TableCell>
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
      <label className="text-sm font-bold text-black mb-1 block">{label}</label>
      <div className="relative">
        {icon && (
          <div style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", zIndex: 10, background: "#fff", padding: 6, border: "1px solid #000", borderRadius: 8 }}>
            {icon}
          </div>
        )}
        <Input
          type={type}
          value={v}
          onChange={(e) => on(e.target.value)}
          className={`${icon ? "pr-10" : "px-2"} bg-white text-slate-900 rounded-md h-9 text-sm ${className}`}
          style={{ border: "1px solid #000" }}
        />
      </div>
    </div>
  );
}
