import React, { useEffect, useMemo, useState } from "react";
import { X, Printer, RotateCcw, Check } from "lucide-react";

export type PrintMargin = "narrow" | "normal" | "wide";

export type InstallmentsPrintSettings = {
  orientation: "landscape" | "portrait";
  pageSize: "A4" | "A3";
  margin: PrintMargin;
  fontMode: "auto" | "manual";
  fontSize: number;
  hiddenColumns: string[];
  showTotals: boolean;
  showHeader: boolean;
  colored: boolean;
};

export const DEFAULT_PRINT_SETTINGS: InstallmentsPrintSettings = {
  orientation: "landscape",
  pageSize: "A4",
  margin: "narrow",
  fontMode: "auto",
  fontSize: 10,
  hiddenColumns: [],
  showTotals: true,
  showHeader: true,
  colored: true,
};

const STORAGE_PREFIX = "installments-print-settings";

export const marginToCss = (m: PrintMargin) =>
  m === "narrow" ? "4mm 3mm" : m === "wide" ? "14mm 12mm" : "8mm 6mm";

export function loadPrintSettings(year: number): InstallmentsPrintSettings {
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}-${year}`);
    if (!raw) return DEFAULT_PRINT_SETTINGS;
    return { ...DEFAULT_PRINT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_PRINT_SETTINGS;
  }
}

export function savePrintSettings(year: number, s: InstallmentsPrintSettings) {
  try {
    localStorage.setItem(`${STORAGE_PREFIX}-${year}`, JSON.stringify(s));
  } catch {
    /* تجاهل التخزين المؤقت عند الحظر */
  }
}

type Props = {
  open: boolean;
  year: number;
  columnOptions: { key: string; label: string }[];
  onClose: () => void;
  onPrint: (settings: InstallmentsPrintSettings) => void;
};

const Segmented = <T extends string | number>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) => (
  <div className="flex gap-1 p-1 bg-teal-50 rounded-xl border border-teal-100">
    {options.map((o) => (
      <button
        key={String(o.value)}
        type="button"
        onClick={() => onChange(o.value)}
        className={`flex-1 min-h-[38px] px-2 rounded-lg text-xs font-bold transition-all ${
          value === o.value
            ? "bg-gradient-to-l from-teal-600 to-emerald-600 text-white shadow"
            : "text-black hover:bg-white"
        }`}
      >
        {o.label}
      </button>
    ))}
  </div>
);

const Toggle = ({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) => (
  <button
    type="button"
    onClick={() => onChange(!checked)}
    className="flex items-center justify-between w-full min-h-[44px] px-3 rounded-xl border border-teal-100 bg-white hover:bg-teal-50/60 transition-colors"
  >
    <span className="text-xs font-bold text-black">{label}</span>
    <span
      className={`w-10 h-5 rounded-full relative transition-colors ${
        checked ? "bg-emerald-500" : "bg-slate-300"
      }`}
    >
      <span
        className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${
          checked ? "right-0.5" : "right-5"
        }`}
      />
    </span>
  </button>
);

export default function PrintSettingsModal({
  open,
  year,
  columnOptions,
  onClose,
  onPrint,
}: Props) {
  const [s, setS] = useState<InstallmentsPrintSettings>(DEFAULT_PRINT_SETTINGS);

  useEffect(() => {
    if (open) setS(loadPrintSettings(year));
  }, [open, year]);

  const hidden = useMemo(() => new Set(s.hiddenColumns), [s.hiddenColumns]);

  if (!open) return null;

  const toggleCol = (key: string) => {
    const next = new Set(hidden);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    setS({ ...s, hiddenColumns: [...next] });
  };

  const handlePrint = () => {
    savePrintSettings(year, s);
    onPrint(s);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[80] bg-slate-900/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div
        dir="rtl"
        className="w-full sm:max-w-lg bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[92vh] overflow-y-auto"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between px-4 py-3 bg-gradient-to-l from-teal-700 via-teal-600 to-emerald-600 text-white">
          <div className="min-w-0">
            <h3 className="text-sm sm:text-base font-extrabold truncate">إعدادات الطباعة والتوسيط التلقائي</h3>
            <p className="text-[11px] text-teal-100">تقرير أقساط العام {year}م</p>
          </div>
          <button
            onClick={onClose}
            className="shrink-0 p-2 rounded-xl bg-white/15 hover:bg-white/25 transition-colors"
            aria-label="إغلاق"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          <div className="space-y-1.5">
            <span className="text-[11px] font-bold text-black">اتجاه الصفحة</span>
            <Segmented
              value={s.orientation}
              onChange={(v) => setS({ ...s, orientation: v })}
              options={[
                { value: "landscape" as const, label: "عرضي" },
                { value: "portrait" as const, label: "طولي" },
              ]}
            />
          </div>

          <div className="space-y-1.5">
            <span className="text-[11px] font-bold text-black">حجم الورق</span>
            <Segmented
              value={s.pageSize}
              onChange={(v) => setS({ ...s, pageSize: v })}
              options={[
                { value: "A4" as const, label: "A4" },
                { value: "A3" as const, label: "A3" },
              ]}
            />
          </div>

          <div className="space-y-1.5">
            <span className="text-[11px] font-bold text-black">الهوامش</span>
            <Segmented
              value={s.margin}
              onChange={(v) => setS({ ...s, margin: v })}
              options={[
                { value: "narrow" as const, label: "ضيق" },
                { value: "normal" as const, label: "عادي" },
                { value: "wide" as const, label: "واسع" },
              ]}
            />
          </div>

          <div className="space-y-1.5">
            <span className="text-[11px] font-bold text-black">حجم الخط والاحتواء</span>
            <Segmented
              value={s.fontMode}
              onChange={(v) => setS({ ...s, fontMode: v })}
              options={[
                { value: "auto" as const, label: "تلقائي (ملاءمة الصفحة)" },
                { value: "manual" as const, label: "يدوي" },
              ]}
            />
            {s.fontMode === "manual" && (
              <div className="flex items-center gap-3 pt-1">
                <input
                  type="range"
                  min={5}
                  max={14}
                  step={0.5}
                  value={s.fontSize}
                  onChange={(e) => setS({ ...s, fontSize: Number(e.target.value) })}
                  className="flex-1 accent-emerald-600"
                />
                <span className="font-mono text-xs font-bold text-black w-12 text-center">
                  {s.fontSize}px
                </span>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Toggle
              label="إظهار ترويسة التقرير والتاريخ"
              checked={s.showHeader}
              onChange={(v) => setS({ ...s, showHeader: v })}
            />
            <Toggle
              label="إظهار صف الإجماليات"
              checked={s.showTotals}
              onChange={(v) => setS({ ...s, showTotals: v })}
            />
            <Toggle
              label="طباعة بالألوان (بدلاً من أبيض/أسود)"
              checked={s.colored}
              onChange={(v) => setS({ ...s, colored: v })}
            />
          </div>

          {columnOptions.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-black">الأعمدة المطبوعة</span>
                <button
                  type="button"
                  onClick={() => setS({ ...s, hiddenColumns: [] })}
                  className="flex items-center gap-1 text-[11px] font-bold text-black hover:text-black"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> تحديد الكل
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {columnOptions.map((c) => {
                  const on = !hidden.has(c.key);
                  return (
                    <button
                      key={c.key}
                      type="button"
                      onClick={() => toggleCol(c.key)}
                      className={`min-h-[34px] px-2.5 rounded-lg text-[11px] font-bold border transition-all ${
                        on
                          ? "bg-emerald-50 border-emerald-300 text-black"
                          : "bg-slate-50 border-slate-200 text-slate-400 line-through"
                      }`}
                    >
                      {on && <Check className="w-3 h-3 inline-block ml-1 -mt-0.5" />}
                      {c.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="sticky bottom-0 flex gap-2 p-3 bg-white/95 backdrop-blur border-t border-slate-100">
          <button
            onClick={onClose}
            className="min-h-[48px] px-4 rounded-xl border border-slate-200 text-black text-sm font-bold hover:bg-slate-50"
          >
            إلغاء
          </button>
          <button
            onClick={handlePrint}
            className="flex-1 min-h-[48px] rounded-xl bg-gradient-to-l from-teal-700 to-emerald-600 text-white text-sm font-extrabold shadow-lg hover:brightness-110 active:scale-[0.99] transition-all flex items-center justify-center gap-2"
          >
            <Printer className="w-4 h-4" /> طباعة وتصدير PDF
          </button>
        </div>
      </div>
    </div>
  );
}
