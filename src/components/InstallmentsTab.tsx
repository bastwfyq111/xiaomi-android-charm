import React, { useMemo, useState } from "react";
import { useStore, type InstallmentCustomColumn } from "@/lib/store";
import { fmt } from "@/lib/format";
import * as XLSX from "xlsx";
import { toast } from "sonner";
import { useTableControls } from "@/hooks/useTableControls";
import {
  X,
  Printer,
  AlertCircle,
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Edit,
  Plus,
  Trash,
  Palette,
  Settings,
  FileSpreadsheet,
  FileText,
  Image as ImageIcon,
} from "lucide-react";
import TabActions from "./TabActions";
import PrintSettingsModal, {
  DEFAULT_PRINT_SETTINGS,
  marginToCss,
  type InstallmentsPrintSettings,
} from "./PrintSettingsModal";
import { openPrintDocument } from "@/lib/printDocument";
import { useReportDate } from "@/lib/reportDate";

const MONTHS_2025 = [
  "يونيو 2024",
  "يوليو 2024",
  "أغسطس 2024",
  "مارس 2025",
  "ابريل 2025",
  "مايو 2025",
  "يونيو 2025",
  "يوليو 2025",
  "أغسطس 2025",
  "سبتمبر 2025",
  "أكتوبر 2025",
  "نوفمبر2025",
  "ديسمبر2025",
];

const MONTHS_2026 = [
  "يناير",
  "فبراير",
  "مارس",
  "ابريل",
  "مايو",
  "يونيو",
  "يوليو",
  "اغسطس",
  "سبتمبر",
  "اكتوبر ",
  "نوفمبر",
  "ديسمبر",
];

// دالة تنظيف الأرقام واستخراج القيم العددية
const cleanNumber = (val: any): number => {
  if (!val || isNaN(Number(String(val).replace(/[^0-9.-]/g, "")))) return 0;
  return Number(String(val).replace(/[^0-9.-]/g, "")) || 0;
};

const escapeHtml = (value: any): string =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const safePdfFileName = (value: any): string =>
  String(value || "متدرب")
    .replace(/[\\/:*?"<>|]/g, "-")
    .replace(/\s+/g, "_")
    .trim() || "متدرب";

// شبكة إحصائيات علوية بتصميم عصري
const StatsGrid = ({ stats, columns = 3 }: { stats: any[]; columns?: number }) => {
  const colClass = columns === 4 ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-1 sm:grid-cols-3";
  return (
    <div className={`grid ${colClass} gap-2 mb-4`}>
      {stats.map((stat, idx) => (
        <div
          key={idx}
          className={`${stat.bgClass} relative overflow-hidden min-h-[64px] px-3 py-2.5 rounded-2xl border ${stat.borderClass} shadow-sm hover:shadow-md active:scale-[0.99] transition-all`}
        >
          <span
            className={`absolute inset-y-0 right-0 w-1.5 ${stat.accentClass || "bg-teal-500"}`}
          />
          <div className="pr-2 min-w-0">
            <div className="text-[11px] sm:text-xs font-bold text-slate-500 truncate">
              {stat.label}
            </div>
            <div className="text-base sm:text-xl font-mono font-extrabold mt-0.5 text-slate-900 tabular-nums truncate">
              {stat.value}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

// مكوّن النافذة المنبثقة العامة
const Modal = ({
  title,
  isOpen,
  onClose,
  children,
}: {
  title: string;
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50 p-2 sm:p-4">
      <div
        className="bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto"
        dir="rtl"
      >
        <div className="flex justify-between items-center p-4 border-b bg-gradient-to-l from-blue-50 to-slate-50 sticky top-0 z-10">
          <h3 className="font-bold text-base sm:text-lg text-slate-900">{title}</h3>
          <button onClick={onClose} className="p-1 hover:bg-slate-200 rounded-lg">
            <X className="w-5 h-5 text-slate-600" />
          </button>
        </div>
        <div className="p-4 space-y-3">{children}</div>
      </div>
    </div>
  );
};

// أيقونة الفرز للأعمدة
const SortIcon = ({
  sortConfig,
  columnKey,
}: {
  sortConfig: { key: string; direction: "asc" | "desc" } | null;
  columnKey: string;
}) => {
  if (sortConfig?.key !== columnKey)
    return <ArrowUpDown className="w-3 h-3 text-white/70" />;
  return sortConfig.direction === "asc" ? (
    <ArrowUp className="w-3 h-3 text-emerald-300" />
  ) : (
    <ArrowDown className="w-3 h-3 text-emerald-300" />
  );
};

export default function InstallmentsTab() {
  const {
    installments,
    installments2025,
    clearInstallments,
    installmentCustomColumns2026,
    installmentConditionalRules2026,
    setInstallmentCustomColumns2026,
    setInstallmentConditionalRules2026,
  } = useStore() as any;
  const { reportDate, reportDateLabel } = useReportDate();

  const [paymentModal, setPaymentModal] = useState<{ row: any; month: string } | null>(null);
  const [payAmount, setPayAmount] = useState("");
  const [newPaymentModal, setNewPaymentModal] = useState(false);
  const [newStudentName, setNewStudentName] = useState("");
  const [newStudentAmount, setNewStudentAmount] = useState("");
  const [newStudentMonth, setNewStudentMonth] = useState("");
  const [editPaymentModal, setEditPaymentModal] = useState<{
    row: any;
    month: string;
    amount: number;
  } | null>(null);
  const [editAmount, setEditAmount] = useState("");
  const [nameSuggestions, setNameSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [, setHoveredCell] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [printSettingsYear, setPrintSettingsYear] = useState<number | null>(null);

  const [search2025, setSearch2025] = useState("");
  const [search2026, setSearch2026] = useState("");

  const [sortConfig2025, setSortConfig2025] = useState<{
    key: string;
    direction: "asc" | "desc";
  } | null>(null);
  const [sortConfig2026, setSortConfig2026] = useState<{
    key: string;
    direction: "asc" | "desc";
  } | null>(null);

  const [editRowModal, setEditRowModal] = useState<{
    year: number;
    row: any;
    index: number;
  } | null>(null);
  const [editRowData, setEditRowData] = useState<any>({});

  const extraCols2026 = (installmentCustomColumns2026 || []) as InstallmentCustomColumn[];
  const [newColModal, setNewColModal] = useState(false);
  const [newColName, setNewColName] = useState("");
  const [newColType, setNewColType] = useState<"text" | "select" | "formula">("text");
  const [newColOptions, setNewColOptions] = useState("");
  const [newColFormula, setNewColFormula] = useState("");

  const [editColModal, setEditColModal] = useState<{
    oldName: string;
    name: string;
    type: "text" | "select" | "formula";
    options: string;
    formula: string;
  } | null>(null);

  const [condFormatModal, setCondFormatModal] = useState(false);
  const [condFormatParams, setCondFormatParams] = useState({ text: "", color: "bg-yellow-100" });
  const condFormatRules = (installmentConditionalRules2026 || []) as Array<{
    text: string;
    color: string;
  }>;

  const [newRowModal2026, setNewRowModal2026] = useState(false);
  const [newRowData2026, setNewRowData2026] = useState({
    name: "",
    batch: "",
    specialty: "",
    prevDue: 0,
    fees: 0,
  });

  const controls2026 = useTableControls(installments || [], [
    "name",
    "batch",
    "specialty",
    "fees",
    "prevDue",
    "totalPaid",
    "remaining",
  ]);
  const controls2025 = useTableControls(installments2025 || [], [
    "name",
    "batch",
    "specialty",
    "fees",
    "totalPaid",
    "remaining",
  ]);

  const evaluateFormula = (formula: string, row: any) => {
    if (!formula) return "";
    try {
      let parsedFormula = formula;
      const variables: Record<string, number> = {
        fees: cleanNumber(row.fees),
        prevDue: cleanNumber(row.prevDue),
        totalPaid: cleanNumber(row.totalPaid),
        remaining: cleanNumber(row.remaining),
      };

      extraCols2026.forEach((col) => {
        if (col.type !== "formula") {
          variables[col.name] = cleanNumber(row.customData?.[col.name]);
        }
      });

      Object.keys(variables).forEach((key) => {
        const regex = new RegExp(`\\b${key}\\b`, "g");
        parsedFormula = parsedFormula.replace(regex, variables[key].toString());
      });

      const result = new Function(`return ${parsedFormula}`)();
      return isNaN(result) ? "خطأ" : Number(result).toFixed(2);
    } catch (e) {
      return "صيغة غير صالحة";
    }
  };

  const getConditionalRowClass = (row: any) => {
    const searchableValues = [
      row.name,
      row.batch,
      row.specialty,
      row.prevDue,
      row.fees,
      row.totalPaid,
      row.remaining,
      ...Object.values(row.payments || {}),
      ...Object.values(row.customData || {}),
    ].map((val) => String(val ?? "").toLowerCase());

    const matchedRule = condFormatRules.find((rule) => {
      const term = rule.text.trim().toLowerCase();
      return term && searchableValues.some((value) => value.includes(term));
    });

    return matchedRule?.color || "hover:bg-slate-50/80";
  };

  const addConditionalRule = () => {
    if (!condFormatParams.text.trim()) return toast.error("يرجى إدخال نص الشرط");
    setInstallmentConditionalRules2026([
      ...condFormatRules,
      { ...condFormatParams, text: condFormatParams.text.trim() },
    ]);
    setCondFormatParams({ text: "", color: "bg-yellow-100" });
    toast.success("تمت إضافة قاعدة التنسيق");
  };

  const deleteConditionalRule = (index: number) => {
    setInstallmentConditionalRules2026(condFormatRules.filter((_, i) => i !== index));
  };

  const filteredRows2025 = useMemo(() => {
    let result = controls2025.rows || [];
    if (search2025) {
      const term = search2025.toLowerCase();
      result = result.filter(
        (r: any) =>
          (r.name && r.name.toLowerCase().includes(term)) ||
          (r.batch && String(r.batch).toLowerCase().includes(term)) ||
          (r.specialty && r.specialty.toLowerCase().includes(term)),
      );
    }
    if (sortConfig2025) {
      result = [...result].sort((a: any, b: any) => {
        let aVal = a[sortConfig2025.key];
        let bVal = b[sortConfig2025.key];
        if (["fees", "totalPaid", "remaining"].includes(sortConfig2025.key)) {
          aVal = cleanNumber(aVal);
          bVal = cleanNumber(bVal);
        } else {
          aVal = aVal ? String(aVal).toLowerCase() : "";
          bVal = bVal ? String(bVal).toLowerCase() : "";
        }
        if (aVal < bVal) return sortConfig2025.direction === "asc" ? -1 : 1;
        if (aVal > bVal) return sortConfig2025.direction === "asc" ? 1 : -1;
        return 0;
      });
    }
    return result;
  }, [controls2025.rows, search2025, sortConfig2025]);

  const filteredRows2026 = useMemo(() => {
    let result = controls2026.rows || [];
    if (search2026) {
      const term = search2026.toLowerCase();
      result = result.filter(
        (r: any) =>
          (r.name && r.name.toLowerCase().includes(term)) ||
          (r.batch && String(r.batch).toLowerCase().includes(term)) ||
          (r.specialty && r.specialty.toLowerCase().includes(term)) ||
          (r.customData &&
            Object.values(r.customData).some((val) => String(val).toLowerCase().includes(term))),
      );
    }
    if (sortConfig2026) {
      result = [...result].sort((a: any, b: any) => {
        let aVal = a[sortConfig2026.key];
        let bVal = b[sortConfig2026.key];
        if (["prevDue", "fees", "totalPaid", "remaining"].includes(sortConfig2026.key)) {
          aVal = cleanNumber(aVal);
          bVal = cleanNumber(bVal);
        } else {
          aVal = aVal ? String(aVal).toLowerCase() : "";
          bVal = bVal ? String(bVal).toLowerCase() : "";
        }
        if (aVal < bVal) return sortConfig2026.direction === "asc" ? -1 : 1;
        if (aVal > bVal) return sortConfig2026.direction === "asc" ? 1 : -1;
        return 0;
      });
    }
    return result;
  }, [controls2026.rows, search2026, sortConfig2026]);

  const handleSort2025 = (key: string) => {
    let direction: "asc" | "desc" = "asc";
    if (sortConfig2025 && sortConfig2025.key === key && sortConfig2025.direction === "asc")
      direction = "desc";
    setSortConfig2025({ key, direction });
  };

  const handleSort2026 = (key: string) => {
    let direction: "asc" | "desc" = "asc";
    if (sortConfig2026 && sortConfig2026.key === key && sortConfig2026.direction === "asc")
      direction = "desc";
    setSortConfig2026({ key, direction });
  };

  const totals2025 = useMemo(
    () => ({
      fees: (filteredRows2025 || []).reduce((s, r) => s + cleanNumber(r.fees), 0),
      paid: (filteredRows2025 || []).reduce((s, r) => s + cleanNumber(r.totalPaid), 0),
      remaining: (filteredRows2025 || []).reduce((s, r) => s + cleanNumber(r.remaining), 0),
      months: MONTHS_2025.reduce((acc, m) => {
        acc[m] = (filteredRows2025 || []).reduce((s, r) => s + cleanNumber(r.payments?.[m]), 0);
        return acc;
      }, {} as Record<string, number>),
    }),
    [filteredRows2025],
  );

  const totals2026 = useMemo(
    () => ({
      prevDue: (filteredRows2026 || []).reduce((s, r) => s + cleanNumber(r.prevDue), 0),
      fees: (filteredRows2026 || []).reduce((s, r) => s + cleanNumber(r.fees), 0),
      paid: (filteredRows2026 || []).reduce((s, r) => s + cleanNumber(r.totalPaid), 0),
      remaining: (filteredRows2026 || []).reduce((s, r) => s + cleanNumber(r.remaining), 0),
      months: MONTHS_2026.reduce((acc, m) => {
        acc[m] = (filteredRows2026 || []).reduce((s, r) => s + cleanNumber(r.payments?.[m]), 0);
        return acc;
      }, {} as Record<string, number>),
    }),
    [filteredRows2026],
  );

  const allNames = useMemo(() => {
    const n1 = (installments2025 || []).map((s: any) => s.name);
    const n2 = (installments || []).map((s: any) => s.name);
    return [...new Set([...n1, ...n2])];
  }, [installments2025, installments]);

  const handleNameChange = (val: string) => {
    setNewStudentName(val);
    setShowSuggestions(val.length > 0);
    setNameSuggestions(
      val.length > 0 ? allNames.filter((n) => n.toLowerCase().includes(val.toLowerCase())) : [],
    );
  };

  const updateInstallments = (list: any[]) => useStore.setState({ installments: list });
  const updateInstallments2025 = (list: any[]) => useStore.setState({ installments2025: list });

  // تصدير ملف Excel مصحح ومكتمل
  const exportToExcel = (year: number) => {
    try {
      const monthsList = year === 2025 ? MONTHS_2025 : MONTHS_2026;
      const rows = year === 2025 ? filteredRows2025 : filteredRows2026;
      const extraCols = year === 2026 ? extraCols2026 : [];

      const headers =
        year === 2025
          ? ["#", "اسم المتدرب", "الدفعة", "المساق", "الرسوم", ...monthsList, "المسدد", "المتبقي"]
          : [
              "#",
              "اسم المتدرب",
              "الدفعة",
              "المساق",
              "المتبقي من 2025",
              "الرسوم",
              ...monthsList,
              ...extraCols.map((c) => c.name),
              "مسدد 2026",
              "الرصيد المتبقي",
              "الحالة",
            ];

      const data = rows.map((row: any, i: number) => {
        if (year === 2025) {
          return [
            i + 1,
            row.name || "",
            row.batch || "",
            row.specialty || "",
            row.fees || 0,
            ...monthsList.map((m) => row.payments?.[m] || 0),
            row.totalPaid || 0,
            row.remaining || 0,
          ];
        } else {
          const status = row.remaining <= 0 ? "له" : "عليه";
          return [
            i + 1,
            row.name || "",
            row.batch || "",
            row.specialty || "",
            row.prevDue || 0,
            row.fees || 0,
            ...monthsList.map((m) => row.payments?.[m] || 0),
            ...extraCols.map((col) => {
              if (col.type === "formula") return evaluateFormula(col.formula || "", row);
              return row.customData?.[col.name] || "";
            }),
            row.totalPaid || 0,
            row.remaining || 0,
            status,
          ];
        }
      });

      // إضافة صف الإجماليات
      if (year === 2025) {
        data.push([
          "الإجمالي",
          "",
          "",
          "",
          totals2025.fees,
          ...monthsList.map((m) => totals2025.months[m] || 0),
          totals2025.paid,
          totals2025.remaining,
        ]);
      } else {
        data.push([
          "الإجمالي",
          "",
          "",
          "",
          totals2026.prevDue,
          totals2026.fees,
          ...monthsList.map((m) => totals2026.months[m] || 0),
          ...extraCols.map(() => ""),
          totals2026.paid,
          totals2026.remaining,
          "",
        ]);
      }

      const worksheet = XLSX.utils.aoa_to_sheet([headers, ...data]);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, `أقساط ${year}`);
      XLSX.writeFile(workbook, `جدول_أقساط_${year}_${reportDate}.xlsx`);
      toast.success("تم تصدير ملف Excel بنجاح");
    } catch (error) {
      toast.error("حدث خطأ أثناء تصدير ملف Excel");
    }
  };

  // خيارات الأعمدة المتاحة في نافذة إعدادات الطباعة
  const printColumnOptions = (year: number) => {
    const monthsList = year === 2025 ? MONTHS_2025 : MONTHS_2026;
    const opts: { key: string; label: string }[] = [
      { key: "batch", label: "الدفعة" },
      { key: "specialty", label: "المساق" },
    ];
    if (year === 2026) opts.push({ key: "prevDue", label: "مدور 2025" });
    opts.push({ key: "fees", label: "الرسوم" });
    monthsList.forEach((m) => opts.push({ key: `month:${m}`, label: m.trim() }));
    if (year === 2026)
      extraCols2026.forEach((c) => opts.push({ key: `col:${c.name}`, label: c.name }));
    opts.push({ key: "totalPaid", label: "إجمالي المسدد" });
    opts.push({ key: "remaining", label: "الرصيد المتبقي" });
    if (year === 2026) opts.push({ key: "status", label: "الحالة" });
    return opts;
  };


const exportToPDF = (
  year: number,
  settings: InstallmentsPrintSettings = DEFAULT_PRINT_SETTINGS,
) => {
  try {
    const monthsList = year === 2025 ? MONTHS_2025 : MONTHS_2026;
    const rows = year === 2025 ? filteredRows2025 : filteredRows2026;
    const extraCols = year === 2026 ? extraCols2026 : [];
    const date = reportDateLabel;
    const hidden = new Set(settings.hiddenColumns || []);

    type PrintCol = {
      key: string;
      label: string;
      cell: (row: any, i: number) => string;
      total?: () => string;
      wide?: boolean;
      tone?: "paid" | "due" | "fees" | "plain";
    };

    const sum = (fn: (r: any) => any) =>
      (rows || []).reduce((s: number, r: any) => s + cleanNumber(fn(r)), 0);

    const allCols: PrintCol[] = [];
    allCols.push({
      key: "idx",
      label: "م",
      cell: (_r, i) => String(i + 1),
    });
    allCols.push({
      key: "name",
      label: "اسم المتدرب",
      cell: (r) => escapeHtml(r.name || ""),
      wide: true,
    });
    allCols.push({ key: "batch", label: "الدفعة", cell: (r) => escapeHtml(r.batch || "—") });
    allCols.push({
      key: "specialty",
      label: "المساق",
      cell: (r) => escapeHtml(r.specialty || "—"),
      wide: true,
    });
    if (year === 2026) {
      allCols.push({
        key: "prevDue",
        label: "مدور 2025",
        cell: (r) => fmt(cleanNumber(r.prevDue)),
        total: () => fmt(sum((r) => r.prevDue)),
        tone: "due",
      });
    }
    allCols.push({
      key: "fees",
      label: "الرسوم",
      cell: (r) => fmt(cleanNumber(r.fees)),
      total: () => fmt(sum((r) => r.fees)),
      tone: "fees",
    });
    monthsList.forEach((m) => {
      allCols.push({
        key: `month:${m}`,
        label: m.trim(),
        cell: (r) => (cleanNumber(r.payments?.[m]) ? fmt(cleanNumber(r.payments[m])) : "—"),
        total: () => {
          const t = sum((r) => r.payments?.[m]);
          return t > 0 ? fmt(t) : "—";
        },
      });
    });
    extraCols.forEach((col) => {
      allCols.push({
        key: `col:${col.name}`,
        label: col.name,
        cell: (r) =>
          col.type === "formula"
            ? escapeHtml(evaluateFormula(col.formula || "", r))
            : escapeHtml(r.customData?.[col.name] || "—"),
        total:
          col.type === "formula"
            ? () => {
                const t = (rows || []).reduce(
                  (s: number, r: any) => s + cleanNumber(evaluateFormula(col.formula || "", r)),
                  0,
                );
                return t !== 0 ? fmt(t) : "—";
              }
            : undefined,
      });
    });
    allCols.push({
      key: "totalPaid",
      label: "إجمالي المسدد",
      cell: (r) => fmt(cleanNumber(r.totalPaid)),
      total: () => fmt(sum((r) => r.totalPaid)),
      tone: "paid",
    });
    allCols.push({
      key: "remaining",
      label: "الرصيد المتبقي",
      cell: (r) => fmt(cleanNumber(r.remaining)),
      total: () => fmt(sum((r) => r.remaining)),
      tone: "due",
    });
    if (year === 2026) {
      allCols.push({
        key: "status",
        label: "الحالة",
        cell: (r) => (cleanNumber(r.remaining) <= 0 ? "له" : "عليه"),
      });
    }

    const cols = allCols.filter((c) => !hidden.has(c.key));

    // ملاءمة تلقائية لعرض الصفحة حسب الحجم والاتجاه
    const pageWidthMm =
      settings.pageSize === "A3"
        ? settings.orientation === "landscape"
          ? 420
          : 297
        : settings.orientation === "landscape"
          ? 297
          : 210;
    const marginMm = settings.margin === "narrow" ? 8 : settings.margin === "wide" ? 26 : 14;
    const usableWidthMm = pageWidthMm - marginMm;
    const widthUnits = cols.reduce((s, c) => s + (c.wide ? 2.4 : 1), 0);
    const unitMm = usableWidthMm / Math.max(1, widthUnits);
    const autoFont = Math.max(5, Math.min(11, unitMm * 1.25));
    const fontSizePx = settings.fontMode === "manual" ? settings.fontSize : autoFont;
    const headerFontSizePx = fontSizePx + 0.4;

    const fitStyle = (text: any, base = fontSizePx) => {
      const len = String(text ?? "").replace(/<[^>]*>/g, "").length;
      const steps = Math.max(0, Math.ceil(Math.max(0, len - 16) / 10));
      const final = Math.max(5, base - Math.min(3.5, steps * 0.7));
      return `font-size:${final.toFixed(2)}px`;
    };

    const colGroup = `<colgroup>${cols
      .map(
        (c) =>
          `<col style="width:${(((c.wide ? 2.4 : 1) / widthUnits) * 100).toFixed(3)}%" />`,
      )
      .join("")}</colgroup>`;

    const thead = `<tr>${cols
      .map((c) => `<th class="c-${c.key.replace(/[^a-zA-Z]/g, "")}">${escapeHtml(c.label)}</th>`)
      .join("")}</tr>`;

    const tbody = (rows || [])
      .map((r: any, i: number) => {
        const tds = cols
          .map((c) => {
            const v = c.cell(r, i);
            const toneClass = c.tone ? ` t-${c.tone}` : "";
            const statusClass =
              c.key === "status" ? (cleanNumber(r.remaining) <= 0 ? " s-ok" : " s-bad") : "";
            return `<td class="${c.wide ? "wrap" : ""}${toneClass}${statusClass}" style="${fitStyle(v)}">${v}</td>`;
          })
          .join("");
        return `<tr>${tds}</tr>`;
      })
      .join("");

    const totalRow = settings.showTotals
      ? `<tr class="total-row">${cols
          .map((c, idx) => {
            if (c.key === "idx") return `<td>—</td>`;
            if (idx === 1) return `<td class="wrap">الإجمالي</td>`;
            return `<td style="${fitStyle("")}">${c.total ? c.total() : ""}</td>`;
          })
          .join("")}</tr>`
      : "";

    const colorTokens = settings.colored
      ? {
          head: "#0f766e",
          headText: "#ffffff",
          zebra: "#f0fdfa",
          totals: "#ccfbf1",
          fees: "#eff6ff",
          paid: "#ecfdf5",
          due: "#fff7ed",
          accent: "#0d9488",
        }
      : {
          head: "#ffffff",
          headText: "#000000",
          zebra: "#ffffff",
          totals: "#f2f2f2",
          fees: "#ffffff",
          paid: "#ffffff",
          due: "#ffffff",
          accent: "#000000",
        };

    const reportCss = `
      html, body { margin: 0 !important; padding: 0 !important; }
      * { box-sizing: border-box; }
      .doc-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        border-bottom: 2pt solid ${colorTokens.accent};
        padding-bottom: 4px;
        margin-bottom: 5px;
      }
      .doc-header .title { text-align: right; }
      .doc-header h1 { font-size: 14px; font-weight: 800; letter-spacing: -0.2px; }
      .doc-header h2 { font-size: 10.5px; font-weight: 700; margin-top: 1px; color: ${colorTokens.accent}; }
      .doc-header .meta { font-size: 8.5px; font-weight: 700; text-align: left; line-height: 1.6; }
      .doc-header .meta span { display: block; }

      table {
        font-size: ${fontSizePx.toFixed(2)}px;
        table-layout: fixed !important;
        width: 100% !important;
        min-width: 100% !important;
        border-collapse: collapse;
        border: 0.75pt solid #000;
      }
      th, td {
        border: 0.4pt solid #000;
        padding: 0 !important;
        text-align: center;
        vertical-align: middle;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        font-size: clamp(7px, 1.2vw, 14px);
        overflow-wrap: normal;
        word-break: normal;
        line-height: 1.15;
        font-weight: 700;
      }
      td.wrap { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; overflow-wrap: normal; word-break: normal; padding: 0 !important; font-size: clamp(7px, 1.2vw, 14px); }
      th {
        background: ${colorTokens.head} !important;
        color: ${colorTokens.headText} !important;
        font-size: ${headerFontSizePx.toFixed(2)}px;
        font-weight: 800;
        padding: 0 !important;
      }
      tbody tr:nth-child(even) td { background: ${colorTokens.zebra} !important; }
      td.t-fees { background: ${colorTokens.fees} !important; }
      td.t-paid { background: ${colorTokens.paid} !important; font-weight: 800; }
      td.t-due { background: ${colorTokens.due} !important; font-weight: 800; }
      td.s-ok { background: ${settings.colored ? "#d1fae5" : "#ffffff"} !important; }
      td.s-bad { background: ${settings.colored ? "#fee2e2" : "#ffffff"} !important; }
      thead { display: table-header-group; }
      .total-row td {
        background: ${colorTokens.totals} !important;
        font-weight: 900;
        border-top: 1pt solid #111;
      }
      .doc-foot {
        margin-top: 5px;
        display: flex;
        justify-content: space-between;
        font-size: 8.5px;
        font-weight: 700;
        border-top: 0.75pt solid ${colorTokens.accent};
        padding-top: 3px;
      }
      @media print {
        tr { page-break-inside: avoid; }
      }
    `;

    const body = `
      ${
        settings.showHeader
          ? `<div class="doc-header">
        <div class="title">
          <h1>المجلس اليمني للاختصاصات الطبية — صعدة</h1>
          <h2>تقرير الأقساط والمدفوعات للعام ${year}م</h2>
        </div>
        <div class="meta">
          <span>التاريخ: ${escapeHtml(date)}</span>
          <span>عدد السجلات: ${(rows || []).length}</span>
        </div>
      </div>`
          : ""
      }
      <table>
        ${colGroup}
        <thead>${thead}</thead>
        <tbody>${tbody}${totalRow}</tbody>
      </table>
      <div class="doc-foot">
        <span>إعداد: قسم الشؤون المالية</span>
        <span>التوقيع: ________________</span>
      </div>
    `;

    const ok = openPrintDocument({
      title: `تقرير_الأقساط_والمدفوعات_${year}_${reportDate}`,
      body,
      css: reportCss,
      pageSize: settings.pageSize,
      orientation: settings.orientation,
      margin: marginToCss(settings.margin),
    });

    if (ok) {
      toast.success("تم فتح التقرير — اختر «حفظ كـ PDF» للحصول على ملف عالي الجودة");
    } else {
      toast.error("تم منع فتح نافذة الطباعة، يرجى السماح بالنوافذ المنبثقة");
    }
  } catch (error) {
    toast.error("فشل إنشاء التقرير");
  }
};

  
  const saveRowEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editRowModal) return;

    if (editRowModal.year === 2025) {
      const list = [...(installments2025 || [])];
      const updatedRow = {
        ...editRowData,
        remaining: Math.max(0, cleanNumber(editRowData.fees) - cleanNumber(editRowData.totalPaid)),
      };
      list[editRowModal.index] = updatedRow;
      updateInstallments2025(list);
    } else {
      const list = [...(installments || [])];
      const updatedRow = {
        ...editRowData,
        remaining: Math.max(
          0,
          (cleanNumber(editRowData.prevDue) + cleanNumber(editRowData.fees)) - cleanNumber(editRowData.totalPaid),
        ),
      };
      list[editRowModal.index] = updatedRow;
      updateInstallments(list);
    }

    toast.success("تم تحديث البيانات بنجاح");
    setEditRowModal(null);
  };

  const addCustomColumn = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newColName.trim()) return;
    if (extraCols2026.some((c) => c.name === newColName))
      return toast.error("اسم العمود موجود مسبقاً");

    setInstallmentCustomColumns2026([
      ...extraCols2026,
      {
        name: newColName,
        type: newColType,
        options: newColType === "select" ? newColOptions.split(",").map((s) => s.trim()) : [],
        formula: newColType === "formula" ? newColFormula : "",
      },
    ]);

    toast.success(`تم إضافة العمود: ${newColName}`);
    setNewColModal(false);
    setNewColName("");
    setNewColType("text");
    setNewColOptions("");
    setNewColFormula("");
  };

  const saveCustomColumnEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editColModal) return;

    if (
      editColModal.name !== editColModal.oldName &&
      extraCols2026.some((c) => c.name === editColModal.name)
    ) {
      return toast.error("اسم العمود موجود مسبقاً");
    }

    const updatedCols = extraCols2026.map((c) => {
      if (c.name === editColModal.oldName) {
        return {
          name: editColModal.name,
          type: editColModal.type,
          options:
            editColModal.type === "select"
              ? editColModal.options.split(",").map((s) => s.trim())
              : [],
          formula: editColModal.type === "formula" ? editColModal.formula : "",
        };
      }
      return c;
    });

    if (editColModal.oldName !== editColModal.name) {
      const list = [...(installments || [])];
      list.forEach((row) => {
        if (row.customData && row.customData[editColModal.oldName] !== undefined) {
          row.customData[editColModal.name] = row.customData[editColModal.oldName];
          delete row.customData[editColModal.oldName];
        }
      });
      updateInstallments(list);
    }

    setInstallmentCustomColumns2026(updatedCols);
    setEditColModal(null);
    toast.success("تم تعديل العمود بنجاح");
  };

  const deleteCustomColumn = (colName: string) => {
    if (!confirm(`هل أنت متأكد من حذف العمود "${colName}"؟`)) return;
    setInstallmentCustomColumns2026(extraCols2026.filter((c) => c.name !== colName));
    setEditColModal(null);
    toast.success("تم حذف العمود");
  };

  const recalculate2026Row = (row: any) => {
    const payments = { ...(row.payments || {}) };
    const totalPaid = MONTHS_2026.reduce((sum, m) => sum + (Number(payments[m]) || 0), 0);
    return {
      ...row,
      payments,
      totalPaid,
      remaining: Math.max(0, (cleanNumber(row.prevDue) + cleanNumber(row.fees)) - totalPaid),
    };
  };

  const update2026CellValue = (rowIndex: number, key: string, value: string) => {
    if (rowIndex < 0) return;
    const list = [...(installments || [])];
    const current = { ...list[rowIndex] };
    const numericKeys = ["prevDue", "fees", "totalPaid", "remaining"];
    const nextValue: any = numericKeys.includes(key) ? cleanNumber(value) : value;
    list[rowIndex] =
      (key === "prevDue" || key === "fees")
        ? recalculate2026Row({ ...current, [key]: nextValue })
        : { ...current, [key]: nextValue };
    updateInstallments(list);
  };

  const update2026PaymentValue = (rowIndex: number, month: string, value: string) => {
    if (rowIndex < 0) return;
    const list = [...(installments || [])];
    const row = { ...list[rowIndex], payments: { ...(list[rowIndex]?.payments || {}) } };
    row.payments[month] = cleanNumber(value);
    list[rowIndex] = recalculate2026Row(row);
    updateInstallments(list);
  };

  const updateCustomColValue = (rowIndex: number, colName: string, value: string) => {
    const list = [...(installments || [])];
    const row = { ...list[rowIndex], customData: { ...(list[rowIndex]?.customData || {}) } };
    row.customData[colName] = value;
    list[rowIndex] = row;
    updateInstallments(list);
  };

  const deleteRow2026 = (rowIndex: number, name: string) => {
    if (rowIndex < 0) return;
    if (!confirm(`هل أنت متأكد من حذف صف المتدرب "${name}" من جدول 2026؟`)) return;
    updateInstallments((installments || []).filter((_: any, i: number) => i !== rowIndex));
    toast.success("تم حذف الصف");
  };

  const addNewRow2026 = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRowData2026.name) return toast.error("يرجى إدخال اسم المتدرب");

    const payments = MONTHS_2026.reduce((acc, m) => ({ ...acc, [m]: 0 }), {} as any);
    const newRec = {
      name: newRowData2026.name,
      batch: newRowData2026.batch,
      specialty: newRowData2026.specialty,
      fees: Number(newRowData2026.fees) || 0,
      prevDue: Number(newRowData2026.prevDue) || 0,
      totalPaid: 0,
      remaining: Number(newRowData2026.prevDue) || 0,
      notes: "",
      phone: "",
      payments,
      customData: {},
    };

    updateInstallments([...(installments || []), newRec]);
    toast.success("تم إضافة الصف بنجاح");
    setNewRowModal2026(false);
    setNewRowData2026({ name: "", batch: "", specialty: "", prevDue: 0, fees: 0 });
  };

  const addPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentModal || !payAmount) return toast.error("يرجى إدخال المبلغ");
    const amount = Number(payAmount) || 0;
    if (amount <= 0) return toast.error("مبلغ غير صحيح");
    const list = [...(installments || [])];
    const updated = list.map((s) => {
      if (s.name !== paymentModal.row.name) return s;
      const payments = {
        ...s.payments,
        [paymentModal.month]: (Number(s.payments[paymentModal.month]) || 0) + amount,
      };
      const totalPaid = MONTHS_2026.reduce((sum, m) => sum + (Number(payments[m]) || 0), 0);
      return {
        ...s,
        payments,
        totalPaid,
        remaining: Math.max(0, (cleanNumber(s.prevDue) + cleanNumber(s.fees)) - totalPaid),
      };
    });
    updateInstallments(updated);
    toast.success(`تم تسجيل دفعة ${fmt(amount)}`);
    setPaymentModal(null);
    setPayAmount("");
  };

  const addNewPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStudentName || !newStudentAmount || !newStudentMonth)
      return toast.error("يرجى إدخال جميع البيانات");
    const amount = Number(newStudentAmount) || 0;
    if (amount <= 0) return toast.error("مبلغ غير صحيح");
    const list = [...(installments || [])];
    const exist = list.find((s) => s.name === newStudentName);
    if (exist) {
      const updated = list.map((s) => {
        if (s.name !== newStudentName) return s;
        const payments = {
          ...s.payments,
          [newStudentMonth]: (Number(s.payments[newStudentMonth]) || 0) + amount,
        };
        const totalPaid = MONTHS_2026.reduce((sum, m) => sum + (Number(payments[m]) || 0), 0);
        return {
          ...s,
          payments,
          totalPaid,
          remaining: Math.max(0, (cleanNumber(s.prevDue) + cleanNumber(s.fees)) - totalPaid),
        };
      });
      updateInstallments(updated);
    } else {
      const payments = MONTHS_2026.reduce(
        (acc, m) => ({ ...acc, [m]: m === newStudentMonth ? amount : 0 }),
        {} as any,
      );
      const newRec = {
        name: newStudentName,
        batch: "",
        specialty: "",
        fees: 0,
        prevDue: 0,
        totalPaid: amount,
        remaining: Math.max(0, 0 - amount),
        notes: "",
        phone: "",
        payments,
      };
      updateInstallments([...list, newRec]);
    }
    toast.success(`تم إضافة دفعة ${fmt(amount)}`);
    setNewPaymentModal(false);
    setNewStudentName("");
    setNewStudentAmount("");
    setNewStudentMonth("");
  };

  const editPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editPaymentModal || !editAmount) return;
    const newAmount = Number(editAmount) || 0;
    const list = [...(installments || [])];
    const updated = list.map((s) => {
      if (s.name !== editPaymentModal.row.name) return s;
      const payments = { ...s.payments, [editPaymentModal.month]: newAmount };
      const totalPaid = MONTHS_2026.reduce((sum, m) => sum + (Number(payments[m]) || 0), 0);
      return {
        ...s,
        payments,
        totalPaid,
        remaining: Math.max(0, (cleanNumber(s.prevDue) + cleanNumber(s.fees)) - totalPaid),
      };
    });
    updateInstallments(updated);
    toast.success("تم تعديل القسط");
    setEditPaymentModal(null);
    setEditAmount("");
  };

  const deletePayment = (row: any, month: string) => {
    if (!confirm(`حذف قسط شهر ${month}؟`)) return;
    const list = [...(installments || [])];
    const updated = list.map((s) => {
      if (s.name !== row.name) return s;
      const payments = { ...s.payments, [month]: 0 };
      const totalPaid = MONTHS_2026.reduce((sum, m) => sum + (Number(payments[m]) || 0), 0);
      return {
        ...s,
        payments,
        totalPaid,
        remaining: Math.max(0, (cleanNumber(s.prevDue) + cleanNumber(s.fees)) - totalPaid),
      };
    });
    updateInstallments(updated);
    toast.success(`تم حذف قسط شهر ${month}`);
    if (editPaymentModal) setEditPaymentModal(null);
  };

  const importFile = (e: React.ChangeEvent<HTMLInputElement>, year: 2025 | 2026) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json(worksheet) as any[];

        const formattedData = json.map((row: any) => {
          const monthsList = year === 2025 ? MONTHS_2025 : MONTHS_2026;
          const payments: any = {};
          let totalPaid = 0;

          monthsList.forEach((m) => {
            const cleanTarget = m.trim();
            const foundKey = Object.keys(row).find((k) => k.trim() === cleanTarget || k === m);
            const amount = foundKey ? cleanNumber(row[foundKey]) : 0;
            payments[m] = amount;
            totalPaid += amount;
          });

          const nameKey = Object.keys(row).find((k) => k.includes("اسم المتدرب")) || "name";
          const batchKey = Object.keys(row).find((k) => k.includes("رقم الدفعة")) || "batch";
          const specialtyKey = Object.keys(row).find((k) => k.includes("المساق")) || "specialty";
          const feesKey = Object.keys(row).find((k) => k.includes("مبلغ الرسوم")) || "fees";
          const prevDueKey =
            Object.keys(row).find((k) => k.includes("المتبقي عليهم من العام 2025")) || "prevDue";
          const remainingKey = Object.keys(row).find((k) => k.trim() === "المتبقي") || "remaining";
          const notesKey = Object.keys(row).find((k) => k.includes("ملاحظات")) || "notes";
          const phoneKey = Object.keys(row).find((k) => k.includes("رقم الهاتف")) || "phone";

          return {
            name: row[nameKey] || "بدون اسم",
            batch: row[batchKey] || "",
            specialty: row[specialtyKey] || "",
            fees: cleanNumber(row[feesKey]),
            prevDue: cleanNumber(row[prevDueKey]),
            totalPaid: row["الإجمالي"] ? cleanNumber(row["الإجمالي"]) : totalPaid,
            remaining: cleanNumber(row[remainingKey]),
            notes: row[notesKey] || "",
            phone: row[phoneKey] || "",
            payments,
            customData: {},
          };
        });

        if (year === 2025) {
          useStore.setState({ installments2025: formattedData });
        } else {
          useStore.setState({ installments: formattedData });
        }

        toast.success(`تم استيراد بيانات العام ${year} بنجاح!`);
        setImportError(null);
      } catch (error) {
        setImportError("حدث خطأ في قراءة الملف.");
        toast.error("فشل استيراد الملف");
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const getStatusText = (rem: number) =>
    rem <= 0
      ? { text: "له", color: "text-emerald-800", bg: "bg-emerald-50" }
      : { text: "عليه", color: "text-rose-800", bg: "bg-rose-50" };

    // تم تعديل هذه الدالة لتتوافق بشكل أفضل مع صيغة حفظ PDF واللغة العربية
  const generateAccountStatement = (row: any, year: number) => {
    // 1. تحديد قائمة الأشهر بناءً على السنة المختارة
    const monthsList = year === 2025 ? MONTHS_2025 : MONTHS_2026;

    // 2. تنظيف وتحويل الرسوم والمستحقات السابقة إلى أرقام صحيحة
    const fees = cleanNumber(row?.fees);
    const prevDue = cleanNumber(row?.prevDue);

    // 3. حساب إجمالي المدفوعات عبر المرور على قائمة الأشهر
    const totalPaid = monthsList.reduce((sum, month) => {
      const payment = Number(row?.payments?.[month]) || 0;
      return sum + payment;
    }, 0);

    // 4. حساب إجمالي المستحق:
    // إذا كانت السنة 2026 يتم إضافة المتبقي السابق إلى الرسوم الحالية، وإلا تُحسب الرسوم فقط.
    const dueTotal = year === 2026 ? prevDue + 0 : fees;

    // 5. حساب المبلغ المتبقي
    const remaining = dueTotal - totalPaid;

    // ✅ تمت إزالة الـ return المبكر الذي كان يقطع تنفيذ باقي الدالة
    // (كان يُرجع {fees, prevDue, totalPaid, dueTotal, remaining} بدل {title, body, css})

    // استخراج اسم آمن ليستخدمه المتصفح كاسم افتراضي عند الحفظ PDF
    const safeName = safePdfFileName(row.name);

    const paidRows = monthsList
      .map((m) => {
        const amount = Number(row.payments?.[m]) || 0;
        if (amount <= 0) return "";
        return `
          <tr>
            <td class="lbl">سداد شهر ${escapeHtml(m)}</td>
            <td class="num">${escapeHtml(fmt(amount))}</td>
          </tr>`;
      })
      .join("");

    const infoCard = (label: string, value: string) =>
      `<div class="info-box">
        <div class="info-lbl">${escapeHtml(label)}</div>
        <div class="info-val">${escapeHtml(value || "—")}</div>
      </div>`;

    const prevRow =
      year === 2026
        ? `<tr class="row-due-old">
          <td class="lbl">متبقي من العام 2025 (مدور)</td>
          <td class="num">${escapeHtml(fmt(prevDue))}</td>
        </tr>`
        : "";

    const remainingLabel =
      remaining > 0
        ? "الرصيد المتبقي (عليه)"
        : remaining < 0
          ? "الرصيد الإضافي (له)"
          : "الحالة: تم السداد بالكامل";

    const statementCss = `
      @page { size: A4 portrait; margin: 8mm; }
      html, body { width: 100%; min-height: 0; }
      body {
        box-sizing: border-box;
        padding: 4mm;
        font-size: 13px;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      .container {
        width: 100%;
        max-width: 190mm;
        margin: 0 auto;
        box-sizing: border-box;
      }
      * { box-sizing: border-box; }
      .header {
        background: #0f766e;
        color: #fff;
        padding: 12px;
        border-radius: 6px;
        text-align: center;
        margin-bottom: 12px;
      }
      .header h1 { font-size: 20px; font-weight: 800; color: #fff; }
      .header p { margin: 4px 0 0; font-size: 14px; font-weight: 600; color: #fff; }
      .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 12px; }
      .info-box { border: 0.5pt solid #94a3b8; background: #f8fafc; padding: 8px; border-radius: 6px; text-align: center; }
      .info-lbl { font-size: 14px; font-weight: 600; color: #475569; text-align:center}
      .info-val { font-size: 14px; font-weight: 700; margin-top: 2px; }
      table {
        table-layout: fixed;
        width: 100%;
        min-width: 100%;
        border-collapse: collapse;
        margin-top: 4px;
        page-break-inside: avoid;
        break-inside: avoid;
      }
      th {
        border: 1px solid #000;
        background: #0f766e;
        color: #fff;
        padding: 0 !important;
        font-size: clamp(7px, 1.2vw, 14px);
        font-weight: 700;
      }
      td { border: 1px solid #000; padding: 0 !important; font-size: clamp(7px, 1.2vw, 16.5px); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; word-wrap: normal; overflow-wrap: normal; word-break: normal; }
      .lbl { text-align: center; font-weight: 1000; }
      .num { font-weight: 700; font-size: 15px; font-variant-numeric: tabular-nums; }
      .row-fees td { background: #eff6ff; }
      .row-due-old td { background: #fef3c7; color: #b91c1c; }
      .row-total-due td { background: #fee2e2; font-weight: 700; }
      .row-paid td { color: #1d4ed8; }
      .row-total-paid td { background: #d1fae5; font-weight: 700; }
      .row-final td { background: #fee2e2; font-size: 16px; font-weight: 800; color: #b91c1c; border-top: 1pt solid #b91c1c; }
      .foot {
        margin-top: 14px;
        display: flex;
        justify-content: space-between;
        gap: 12px;
        font-size: 11.5px;
        font-weight: 600;
        page-break-inside: avoid;
        break-inside: avoid;
      }
      .header, .info-grid { page-break-inside: avoid; break-inside: avoid; }
      @media print {
        body { margin: 0; }
        .header, .info-box, th, td {
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
      }
    `;

    const body = `
      <div class="container">
        <div class="header">
          <h1>المجلس اليمني للاختصاصات الطبية</h1>
          <p>كشف حساب متدرب - للعام ${year}م</p>
        </div>
        <div class="info-grid">
          ${infoCard("اسم المتدرب", row.name)}
          ${infoCard("الدفعة", row.batch)}
          ${infoCard("المساق", row.specialty)}
          ${infoCard("رقم الهاتف", row.phone)}
        </div>
        <table>
          <thead>
            <tr>
              <th style="width: 60%">البيان</th>
              <th style="width: 40%">المبلغ</th>
            </tr>
          </thead>
          <tbody>
            <tr class="row-fees"><td class="lbl">إجمالي الرسوم المستحقة</td><td class="num">${escapeHtml(fmt(fees))}</td></tr>
            ${prevRow}
            <tr class="row-total-due"><td class="lbl">إجمالي المبلغ المطلوب</td><td class="num">${escapeHtml(fmt(dueTotal))}</td></tr>
            ${paidRows}
            <tr class="row-total-paid"><td class="lbl">إجمالي المسدد (له)</td><td class="num">${escapeHtml(fmt(totalPaid))}</td></tr>
            <tr class="row-final"><td class="lbl">${escapeHtml(remainingLabel)}</td><td class="num">${escapeHtml(fmt(Math.abs(remaining)))}</td></tr>
          </tbody>
        </table>
        <div class="foot">
          <span>تاريخ التقرير: ${escapeHtml(reportDateLabel)}</span>
          <span>التوقيع: ________________</span>
        </div>
      </div>
    `;

    return {
      title: `كشف_حساب_${safeName}_${year}_${reportDate}`,
      body,
      css: statementCss,
    };
  };



  // فتح كشف الحساب في نافذة طباعة عالية الجودة (يمكن حفظه كـ PDF)
  const handleExportPdf = async (row: any, year: number) => {
    const { title, body, css } = generateAccountStatement(row, year);
    const ok = openPrintDocument({
      title,
      body,
      css,
      pageSize: "A4",
      orientation: "portrait",
      margin: "8mm",
    });
    if (ok) {
      toast.success("اختر «حفظ كـ PDF» من نافذة الطباعة للحصول على ملف واضح");
    } else {
      toast.error("تم منع فتح نافذة الطباعة، يرجى السماح بالنوافذ المنبثقة");
    }
  };

  // وظيفة الطباعة
  const printStatement = (row: any, year: number) => {
    void handleExportPdf(row, year);
  };


  const stats2025 = [
    {
      label: "إجمالي الرسوم التقديرية",
      value: fmt(totals2025.fees),
      bgClass: "bg-white",
      borderClass: "border-teal-100",
      accentClass: "bg-teal-500",
    },
    {
      label: "إجمالي الأقساط المسددة",
      value: fmt(totals2025.paid),
      bgClass: "bg-emerald-50/70",
      borderClass: "border-emerald-100",
      accentClass: "bg-emerald-500",
    },
    {
      label: "إجمالي المتبقي والأرشيف",
      value: fmt(totals2025.remaining),
      bgClass: "bg-orange-50/70",
      borderClass: "border-orange-100",
      accentClass: "bg-orange-500",
    },
  ];

  const stats2026 = [
    {
      label: "المدور (متبقي 2025)",
      value: fmt(totals2026.prevDue),
      bgClass: "bg-white",
      borderClass: "border-teal-100",
      accentClass: "bg-teal-600",
    },
    {
      label: "إجمالي مسدد 2026",
      value: fmt(totals2026.paid),
      bgClass: "bg-emerald-50/70",
      borderClass: "border-emerald-100",
      accentClass: "bg-emerald-500",
    },
    {
      label: "صافي رصيد المتبقي",
      value: fmt(totals2026.remaining),
      bgClass: "bg-orange-50/70",
      borderClass: "border-orange-100",
      accentClass: "bg-orange-500",
    },
  ];

  return (
    <div className="w-full space-y-4 sm:space-y-6 p-0" dir="rtl">
      {/* ========== واجهة جدول 2025 ========== */}
      <div className="w-full bg-gradient-to-b from-teal-50/60 to-white shadow-lg border border-teal-100 rounded-2xl overflow-hidden">
        <div className="bg-gradient-to-l from-teal-800 via-teal-600 to-emerald-600 px-3 sm:px-6 py-3 sm:py-4 flex justify-between items-center flex-wrap gap-2">
          <div>
            <h2 className="text-sm sm:text-lg font-bold text-white">
              📊 أقساط ومستندات العام 2025
            </h2>
            <p className="text-xs text-teal-100">يشمل جميع الدفعات لعامي 2024 و 2025</p>
          </div>
          <div className="flex gap-2 flex-wrap items-center">
            <div className="relative">
              <Search className="w-4 h-4 absolute right-2.5 top-2 text-teal-500" />
              <input
                type="text"
                placeholder="بحث (الاسم، الدفعة، المساق)..."
                value={search2025}
                onChange={(e) => setSearch2025(e.target.value)}
                className="pl-3 pr-8 py-1.5 rounded-lg text-xs border border-teal-300 outline-none focus:ring-2 focus:ring-teal-300 w-48 text-slate-800 shadow-sm"
              />
            </div>

            <label className="px-3 py-1.5 bg-white text-teal-700 rounded-lg text-xs font-bold cursor-pointer hover:bg-teal-50 shadow">
              📥 استيراد الملف{" "}
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={(e) => importFile(e, 2025)}
                className="hidden"
              />
            </label>

            <div className="flex gap-1">
              <button
                onClick={() => exportToExcel(2025)}
                className="px-3 py-1.5 bg-green-100 text-green-700 rounded-lg text-xs font-bold shadow hover:bg-green-200 transition-colors flex items-center gap-1"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" /> Excel
              </button>
              <button
                onClick={() => setPrintSettingsYear(2025)}
                className="px-3 py-1.5 bg-white/95 text-teal-800 rounded-lg text-xs font-bold shadow hover:bg-white transition-colors flex items-center gap-1"
              >
                <Printer className="w-3.5 h-3.5" /> طباعة تفصيلية
              </button>
            </div>

            <TabActions
              title="أقساط العام 2025"
              rows={installments2025 || []}
              columns={[
                { key: "name", label: "اسم المتدرب" },
                { key: "batch", label: "الدفعة" },
                { key: "specialty", label: "المساق" },
                { key: "fees", label: "الرسوم" },
                { key: "totalPaid", label: "المسدد" },
                { key: "remaining", label: "المتبقي" },
              ]}
              fileName="اقساط-2025"
              numericKeys={["fees", "totalPaid", "remaining"]}
              onClear={() => clearInstallments("2025")}
              printLabel="الأقساط/إجمالي"
            />
          </div>
        </div>

        {importError && (
          <div className="bg-red-50 border-b border-red-200 p-3 flex gap-2">
            <AlertCircle className="w-5 h-5 text-red-600" />
            <p className="text-sm text-red-700">{importError}</p>
          </div>
        )}

        <div className="p-3 sm:p-4">
          <StatsGrid stats={stats2025} columns={3} />
          <div className="overflow-auto max-h-[65vh] rounded-lg border border-slate-200 shadow-sm relative">
            <table className="w-full text-xs sm:text-sm">
              <thead className="bg-gradient-to-b from-teal-700 to-teal-800 font-bold border-b-2 border-emerald-900 text-white sticky top-0 z-20 shadow-md">
                <tr>
                  <th className="p-2 text-center whitespace-nowrap">#</th>
                  <th
                    className="p-2 text-center whitespace-nowrap cursor-pointer hover:bg-white/10 transition-colors"
                    onClick={() => handleSort2025("name")}
                  >
                    <div className="flex items-center justify-center gap-1">
                      اسم المتدرب <SortIcon sortConfig={sortConfig2025} columnKey="name" />
                    </div>
                  </th>
                  <th
                    className="p-2 text-center whitespace-nowrap cursor-pointer hover:bg-white/10 transition-colors"
                    onClick={() => handleSort2025("batch")}
                  >
                    <div className="flex items-center justify-center gap-1">
                      الدفعة <SortIcon sortConfig={sortConfig2025} columnKey="batch" />
                    </div>
                  </th>
                  <th
                    className="p-2 text-center whitespace-nowrap cursor-pointer hover:bg-white/10 transition-colors"
                    onClick={() => handleSort2025("specialty")}
                  >
                    <div className="flex items-center justify-center gap-1">
                      المساق <SortIcon sortConfig={sortConfig2025} columnKey="specialty" />
                    </div>
                  </th>
                  <th
                    className="p-2 text-center whitespace-nowrap cursor-pointer hover:bg-white/10 transition-colors"
                    onClick={() => handleSort2025("fees")}
                  >
                    <div className="flex items-center justify-center gap-1">
                      الرسوم <SortIcon sortConfig={sortConfig2025} columnKey="fees" />
                    </div>
                  </th>
                  {MONTHS_2025.map((m) => (
                    <th
                      key={m}
                      className="p-1 text-center text-[11px] border-l border-white/25 whitespace-nowrap"
                    >
                      {m}
                    </th>
                  ))}
                  <th
                    className="p-2 text-center whitespace-nowrap cursor-pointer hover:bg-white/10 transition-colors"
                    onClick={() => handleSort2025("totalPaid")}
                  >
                    <div className="flex items-center justify-center gap-1">
                      المسدد <SortIcon sortConfig={sortConfig2025} columnKey="totalPaid" />
                    </div>
                  </th>
                  <th
                    className="p-2 text-center whitespace-nowrap cursor-pointer hover:bg-white/10 transition-colors"
                    onClick={() => handleSort2025("remaining")}
                  >
                    <div className="flex items-center justify-center gap-1">
                      المتبقي <SortIcon sortConfig={sortConfig2025} columnKey="remaining" />
                    </div>
                  </th>
                  <th className="p-2 text-center whitespace-nowrap">إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows2025.length === 0 ? (
                  <tr>
                    <td colSpan={8 + MONTHS_2025.length} className="p-6 text-center text-slate-400">
                      لا توجد بيانات (يرجى التأكد من استيراد الملف أو تعديل البحث)
                    </td>
                  </tr>
                ) : (
                  <>
                    {filteredRows2025.map((r: any, i: number) => {
                      const originalIndex = (installments2025 || []).findIndex(
                        (orig: any) => orig.name === r.name,
                      );
                      return (
                        <tr
                          key={i}
                          className="border-t border-slate-200 hover:bg-slate-50/80 transition-colors"
                        >
                          <td className="p-2 text-center text-black whitespace-nowrap">
                            {i + 1}
                          </td>
                          <td className="p-2 text-center font-semibold text-black whitespace-nowrap text-[11px] sm:text-xs bg-teal-50/70">
                            {r.name}
                          </td>
                          <td className="p-2 text-center text-black whitespace-nowrap text-[11px] sm:text-xs bg-cyan-50/70">
                            {r.batch || "—"}
                          </td>
                          <td className="p-2 text-center text-black whitespace-nowrap text-[11px] sm:text-xs bg-sky-50/70">
                            {r.specialty || "—"}
                          </td>
                          <td className="p-2 text-center font-mono font-semibold text-black whitespace-nowrap text-[11px] sm:text-xs bg-blue-50/70">
                            {fmt(r.fees)}
                          </td>
                          {MONTHS_2025.map((m) => {
                            const paid = Number(r.payments?.[m]) || 0;
                            return (
                              <td
                                key={m}
                                className="p-1 text-center bg-slate-50/50 border-l border-slate-200 whitespace-nowrap"
                              >
                                {paid > 0 ? (
                                  <span className="text-black font-bold font-mono">
                                    {fmt(paid)}
                                  </span>
                                ) : (
                                  <span className="text-slate-300">—</span>
                                )}
                              </td>
                            );
                          })}
                          <td className="p-2 text-center font-mono text-black font-bold bg-emerald-50/30 whitespace-nowrap">
                            {fmt(r.totalPaid)}
                          </td>
                          <td className="p-2 text-center font-mono text-black font-bold bg-rose-50/30 whitespace-nowrap">
                            {fmt(r.remaining)}
                          </td>
                          <td className="p-2 text-center whitespace-nowrap flex justify-center gap-1">
                            <button
                              onClick={() => {
                                setEditRowData(r);
                                setEditRowModal({ year: 2025, row: r, index: originalIndex });
                              }}
                              className="p-1 bg-amber-50 text-amber-600 rounded border border-amber-200 hover:bg-amber-500 hover:text-white transition-colors"
                              title="تعديل الصف"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => printStatement(r, 2025)}
                              className="p-1 bg-blue-50 text-blue-600 rounded border border-blue-200 hover:bg-blue-500 hover:text-white transition-colors"
                              title="طباعة الكشف"
                            >
                              <Printer className="w-3.5 h-3.5" />
                            </button>
                                <button
                                  onClick={() => handleExportPdf(r, 2025)}
                                  className="p-1 bg-emerald-50 text-emerald-600 rounded border border-emerald-200 hover:bg-emerald-500 hover:text-white transition-colors"
                                  title="تنزيل PDF (متوافق مع شاومي)"
                                >
                                  <FileText className="w-3.5 h-3.5" />
                                </button>
                          </td>
                        </tr>
                      );
                    })}
                    <tr className="border-t-2 border-teal-800 bg-teal-100/80 font-extrabold">
                      <td className="p-2 text-center text-black whitespace-nowrap" colSpan={4}>
                        الإجماليات
                      </td>
                      <td className="p-2 text-center font-mono text-black whitespace-nowrap">
                        {fmt(totals2025.fees)}
                      </td>
                      {MONTHS_2025.map((m) => (
                        <td
                          key={m}
                          className="p-1 text-center font-mono text-black border-l border-slate-200 whitespace-nowrap"
                        >
                          {totals2025.months[m] > 0 ? fmt(totals2025.months[m]) : "—"}
                        </td>
                      ))}
                      <td className="p-2 text-center font-mono text-black whitespace-nowrap">
                        {fmt(totals2025.paid)}
                      </td>
                      <td className="p-2 text-center font-mono text-black whitespace-nowrap">
                        {fmt(totals2025.remaining)}
                      </td>
                      <td className="p-2 text-center whitespace-nowrap"></td>
                    </tr>
                  </>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ========== واجهة جدول 2026 ========== */}
      <div className="w-full bg-gradient-to-b from-teal-50/60 to-white shadow-lg border border-teal-100 rounded-2xl overflow-hidden">
        <div className="bg-gradient-to-l from-teal-800 via-teal-600 to-emerald-600 px-3 sm:px-6 py-3 sm:py-4 flex justify-between items-center flex-wrap gap-2">
          <div>
            <h2 className="text-sm sm:text-lg font-bold text-white">
              📊 سجل أقساط العام الحالي 2026
            </h2>
            <p className="text-xs text-teal-100">بيانات المسدد والرصيد المدور لعام 2026</p>
          </div>
          <div className="flex gap-2 flex-wrap items-center">
            <button
              onClick={() => setCondFormatModal(true)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold shadow transition-colors flex items-center gap-1 ${
                condFormatRules.length
                  ? "bg-yellow-400 text-yellow-900 animate-pulse"
                  : "bg-white/20 text-white hover:bg-white/30"
              }`}
              title="تلوين الصفوف حسب نص معين"
            >
              <Palette className="w-4 h-4" />
              {condFormatRules.length ? `تنسيق نشط (${condFormatRules.length})` : "تنسيق شرطي"}
            </button>

            <div className="relative">
              <Search className="w-4 h-4 absolute right-2.5 top-2 text-teal-500" />
              <input
                type="text"
                placeholder="بحث (الاسم، الدفعة، المساق)..."
                value={search2026}
                onChange={(e) => setSearch2026(e.target.value)}
                className="pl-3 pr-8 py-1.5 rounded-lg text-xs border border-teal-300 outline-none focus:ring-2 focus:ring-teal-300 w-48 text-slate-800 shadow-sm"
              />
            </div>

            <button
              onClick={() => setNewRowModal2026(true)}
              className="px-3 py-1.5 bg-blue-100 text-blue-800 rounded-lg text-xs font-bold shadow hover:bg-blue-200 transition-colors flex items-center gap-1"
            >
              <Plus className="w-3 h-3" /> طالب جديد
            </button>

            <button
              onClick={() => setNewColModal(true)}
              className="px-3 py-1.5 bg-amber-100 text-amber-800 rounded-lg text-xs font-bold shadow hover:bg-amber-200 transition-colors flex items-center gap-1"
            >
              <Plus className="w-3 h-3" /> عمود جديد
            </button>

            <button
              onClick={() => setNewPaymentModal(true)}
              className="px-3 py-1.5 bg-white/20 text-white rounded-lg text-xs font-bold shadow hover:bg-white/30 transition-colors"
            >
              ➕ إضافة قسط
            </button>
            <label className="px-3 py-1.5 bg-white text-teal-700 rounded-lg text-xs font-bold cursor-pointer shadow hover:bg-teal-50 transition-colors">
              📥 استيراد{" "}
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={(e) => importFile(e, 2026)}
                className="hidden"
              />
            </label>

            <div className="flex gap-1">
              <button
                onClick={() => exportToExcel(2026)}
                className="px-3 py-1.5 bg-green-100 text-green-700 rounded-lg text-xs font-bold shadow hover:bg-green-200 transition-colors flex items-center gap-1"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" /> Excel
              </button>
              <button
                onClick={() => setPrintSettingsYear(2026)}
                className="px-3 py-1.5 bg-white/95 text-teal-800 rounded-lg text-xs font-bold shadow hover:bg-white transition-colors flex items-center gap-1"
              >
                <Printer className="w-3.5 h-3.5" /> طباعة تفصيلية
              </button>
            </div>

            <TabActions
              title="أقساط العام 2026"
              rows={(installments || []).map((r: any) => {
                const customValues: any = { ...r.customData };
                extraCols2026.forEach((col) => {
                  if (col.type === "formula")
                    customValues[col.name] = evaluateFormula(col.formula || "", r);
                });
                return { ...r, ...customValues };
              })}
              columns={[
                { key: "name", label: "اسم المتدرب" },
                { key: "batch", label: "الدفعة" },
                { key: "specialty", label: "المساق" },
                { key: "prevDue", label: "المتبقي من 2025" },
                { key: "fees", label: "الرسوم" },
                { key: "totalPaid", label: "المسدد" },
                { key: "remaining", label: "المتبقي" },
                ...extraCols2026.map((c) => ({ key: c.name, label: c.name })),
              ]}
              fileName="اقساط-2026"
              numericKeys={["prevDue", "fees", "totalPaid", "remaining"]}
              onClear={() => clearInstallments()}
              printLabel="الأقساط/إجمالي"
            />
          </div>
        </div>

        <div className="p-3 sm:p-4">
          <StatsGrid stats={stats2026} columns={3} />
          <div className="overflow-auto max-h-[65vh] rounded-lg border border-slate-200 shadow-sm relative">
            <table className="w-full text-xs sm:text-sm">
              <thead className="bg-gradient-to-b from-teal-700 to-teal-800 font-bold border-b-2 border-emerald-900 text-white sticky top-0 z-20 shadow-md">
                <tr>
                  <th className="p-2 text-center whitespace-nowrap">#</th>
                  <th
                    className="p-2 text-center whitespace-nowrap cursor-pointer hover:bg-white/10 transition-colors"
                    onClick={() => handleSort2026("name")}
                  >
                    <div className="flex items-center justify-center gap-1">
                      اسم المتدرب <SortIcon sortConfig={sortConfig2026} columnKey="name" />
                    </div>
                  </th>
                  <th
                    className="p-2 text-center cursor-pointer hover:bg-white/10 transition-colors"
                    onClick={() => handleSort2026("batch")}
                  >
                    <div className="flex items-center justify-center gap-1">
                      دفعة <SortIcon sortConfig={sortConfig2026} columnKey="batch" />
                    </div>
                  </th>
                  <th
                    className="p-2 text-center whitespace-nowrap cursor-pointer hover:bg-white/10 transition-colors"
                    onClick={() => handleSort2026("specialty")}
                  >
                    <div className="flex items-center justify-center gap-1">
                      المساق <SortIcon sortConfig={sortConfig2026} columnKey="specialty" />
                    </div>
                  </th>
                  <th
                    className="p-2 text-center whitespace-nowrap cursor-pointer hover:bg-white/10 transition-colors border-x border-white/25"
                    onClick={() => handleSort2026("prevDue")}
                  >
                    <div className="flex items-center justify-center gap-1">
                      المتبقي من 2025 <SortIcon sortConfig={sortConfig2026} columnKey="prevDue" />
                    </div>
                  </th>
                  <th
                    className="p-2 text-center whitespace-nowrap cursor-pointer hover:bg-white/10 transition-colors"
                    onClick={() => handleSort2026("fees")}
                  >
                    <div className="flex items-center justify-center gap-1">
                      الرسوم <SortIcon sortConfig={sortConfig2026} columnKey="fees" />
                    </div>
                  </th>
                  {MONTHS_2026.map((m) => (
                    <th
                      key={m}
                      className="p-1 text-center text-xs border-l border-white/25 whitespace-nowrap"
                    >
                      {m.trim()}
                    </th>
                  ))}
                  {extraCols2026.map((col) => (
                    <th
                      key={col.name}
                      className="p-2 text-center text-xs border-l border-white/25 whitespace-nowrap text-black"
                    >
                      <div className="flex items-center justify-center gap-1">
                        {col.name}
                        <button
                          onClick={() =>
                            setEditColModal({
                              oldName: col.name,
                              name: col.name,
                              type: col.type,
                              options: col.options?.join(",") || "",
                              formula: col.formula || "",
                            })
                          }
                          className="p-0.5 bg-black/10 hover:bg-black/20 rounded transition-all"
                          title="تعديل أو حذف العمود"
                        >
                          <Settings className="w-3 h-3" />
                        </button>
                      </div>
                    </th>
                  ))}
                  <th
                    className="p-2 text-center whitespace-nowrap cursor-pointer hover:bg-white/10 transition-colors"
                    onClick={() => handleSort2026("totalPaid")}
                  >
                    <div className="flex items-center justify-center gap-1">
                      مسدد 2026 <SortIcon sortConfig={sortConfig2026} columnKey="totalPaid" />
                    </div>
                  </th>
                  <th
                    className="p-2 text-center whitespace-nowrap cursor-pointer hover:bg-white/10 transition-colors"
                    onClick={() => handleSort2026("remaining")}
                  >
                    <div className="flex items-center justify-center gap-1">
                      الرصيد المتبقي <SortIcon sortConfig={sortConfig2026} columnKey="remaining" />
                    </div>
                  </th>
                  <th className="p-2 text-center whitespace-nowrap">حالة</th>
                  <th className="p-2 text-center whitespace-nowrap">إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows2026.length === 0 ? (
                  <tr>
                    <td
                      colSpan={10 + MONTHS_2026.length + extraCols2026.length}
                      className="p-6 text-center text-slate-400"
                    >
                      لا توجد بيانات (يرجى التأكد من استيراد الملف أو تعديل البحث)
                    </td>
                  </tr>
                ) : (
                  <>
                    {filteredRows2026.map((r: any, i: number) => {
                      const status = getStatusText(r.remaining);
                      const originalIndex = (installments || []).findIndex(
                        (orig: any) => orig.name === r.name,
                      );
                      const rowBgClass = getConditionalRowClass(r);

                      return (
                        <tr
                          key={i}
                          className={`border-t border-slate-200 transition-colors ${rowBgClass}`}
                        >
                          <td className="p-2 text-center text-black whitespace-nowrap">
                            {i + 1}
                          </td>
                          <td className="p-1 text-center font-bold text-black whitespace-nowrap bg-fuchsia-50/70">
                            <input
                              value={r.name || ""}
                              onChange={(e) =>
                                update2026CellValue(originalIndex, "name", e.target.value)
                              }
                              className="w-full min-w-32 bg-transparent text-center text-black text-[11px] sm:text-xs outline-none focus:bg-white focus:ring-1 ring-teal-300 rounded px-1 py-1"
                            />
                          </td>
                          <td className="p-1 text-center text-black whitespace-nowrap bg-violet-50/70">
                            <input
                              value={r.batch || ""}
                              onChange={(e) =>
                                update2026CellValue(originalIndex, "batch", e.target.value)
                              }
                              className="w-full min-w-20 bg-transparent text-center text-black text-[11px] sm:text-xs outline-none focus:bg-white focus:ring-1 ring-teal-300 rounded px-1 py-1"
                              placeholder="—"
                            />
                          </td>
                          <td className="p-1 text-center text-black whitespace-nowrap bg-teal-50/60">
                            <input
                              value={r.specialty || ""}
                              onChange={(e) =>
                                update2026CellValue(originalIndex, "specialty", e.target.value)
                              }
                              className="w-full min-w-24 bg-transparent text-center text-black text-[11px] sm:text-xs outline-none focus:bg-white focus:ring-1 ring-teal-300 rounded px-1 py-1"
                              placeholder="—"
                            />
                          </td>
                          <td className="p-1 text-center font-mono text-black font-bold bg-amber-50/20 whitespace-nowrap">
                            <input
                              type="number"
                              value={r.prevDue || 0}
                              onChange={(e) =>
                                update2026CellValue(originalIndex, "prevDue", e.target.value)
                              }
                              className="w-full min-w-20 bg-transparent text-center text-black text-[11px] sm:text-xs outline-none focus:bg-white focus:ring-1 ring-teal-300 rounded px-1 py-1"
                            />
                          </td>
                          <td className="p-1 text-center font-mono text-black font-bold whitespace-nowrap bg-indigo-50/70">
                            <input
                              type="number"
                              value={r.fees || 0}
                              onChange={(e) =>
                                update2026CellValue(originalIndex, "fees", e.target.value)
                              }
                              className="w-full min-w-20 bg-transparent text-center text-black text-[11px] sm:text-xs outline-none focus:bg-white focus:ring-1 ring-teal-300 rounded px-1 py-1"
                            />
                          </td>
                          {MONTHS_2026.map((m) => {
                            const paid = Number(r.payments?.[m]) || 0;
                            const cellId = `${r.name}-${m}`;
                            return (
                              <td
                                key={m}
                                className="p-1 text-center relative bg-white/40 border-l border-slate-200 hover:bg-slate-100 cursor-pointer group transition-colors whitespace-nowrap"
                                onMouseEnter={() => setHoveredCell(cellId)}
                                onMouseLeave={() => setHoveredCell(null)}
                              >
                                <input
                                  type="number"
                                  value={paid || ""}
                                  onChange={(e) =>
                                    update2026PaymentValue(originalIndex, m, e.target.value)
                                  }
                                  className="w-20 bg-transparent text-center font-mono text-black font-bold outline-none focus:bg-white focus:ring-1 ring-emerald-300 rounded px-1 py-1"
                                  placeholder="—"
                                  min="0"
                                  step="0.01"
                                />
                              </td>
                            );
                          })}

                          {extraCols2026.map((col) => (
                            <td key={col.name} className="p-1 border-l border-slate-200">
                              {col.type === "select" ? (
                                <select
                                  className="w-full text-center text-black bg-transparent outline-none focus:bg-white focus:ring-1 ring-blue-300 rounded px-1 py-1 text-xs"
                                  value={r.customData?.[col.name] || ""}
                                  onChange={(e) =>
                                    updateCustomColValue(originalIndex, col.name, e.target.value)
                                  }
                                >
                                  <option value="">- اختر -</option>
                                  {col.options?.map((opt, idx) => (
                                    <option key={idx} value={opt}>
                                      {opt}
                                    </option>
                                  ))}
                                </select>
                              ) : col.type === "formula" ? (
                                <div className="text-center font-mono text-xs font-bold text-black bg-white/50 py-1.5 rounded">
                                  {evaluateFormula(col.formula || "", r)}
                                </div>
                              ) : (
                                <input
                                  type="text"
                                  className="w-full text-center text-black bg-transparent outline-none focus:bg-white focus:ring-1 ring-blue-300 rounded px-1 py-1 text-xs"
                                  value={r.customData?.[col.name] || ""}
                                  onChange={(e) =>
                                    updateCustomColValue(originalIndex, col.name, e.target.value)
                                  }
                                  placeholder="—"
                                />
                              )}
                            </td>
                          ))}

                          <td className="p-2 text-center font-mono text-black font-bold bg-emerald-50/30 whitespace-nowrap">
                            {fmt(r.totalPaid)}
                          </td>
                          <td className="p-2 text-center font-mono text-black font-bold bg-rose-50/30 whitespace-nowrap">
                            {fmt(r.remaining)}
                          </td>
                          <td className="p-2 text-center whitespace-nowrap">
                            <span
                              className={`px-1.5 py-0.5 rounded-full text-xs font-bold ${status.bg} ${status.color}`}
                            >
                              {status.text}
                            </span>
                          </td>
                          <td className="p-2 text-center whitespace-nowrap flex justify-center gap-1">
                            <button
                              onClick={() => {
                                setEditRowData(r);
                                setEditRowModal({ year: 2026, row: r, index: originalIndex });
                              }}
                              className="p-1 bg-amber-50 text-amber-600 rounded border border-amber-200 hover:bg-amber-500 hover:text-white transition-colors"
                              title="تعديل الصف"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => printStatement(r, 2026)}
                              className="p-1 bg-blue-50 text-blue-600 rounded border border-blue-200 hover:bg-blue-500 hover:text-white transition-colors"
                              title="طباعة الكشف"
                            >
                              <Printer className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleExportPdf(r, 2026)}
                              className="p-1 bg-emerald-50 text-emerald-600 rounded border border-emerald-200 hover:bg-emerald-500 hover:text-white transition-colors"
                              title="تنزيل PDF (متوافق مع شاومي)"
                            >
                              <FileText className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => deleteRow2026(originalIndex, r.name)}
                              className="p-1 bg-red-50 text-red-600 rounded border border-red-200 hover:bg-red-500 hover:text-white transition-colors"
                              title="حذف الصف"
                            >
                              <Trash className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                    <tr className="border-t-2 border-teal-800 bg-teal-100/80 font-extrabold">
                      <td className="p-2 text-center text-black whitespace-nowrap" colSpan={4}>
                        الإجماليات
                      </td>
                      <td className="p-2 text-center font-mono text-black whitespace-nowrap">
                        {fmt(totals2026.prevDue)}
                      </td>
                      <td className="p-2 text-center font-mono text-black whitespace-nowrap">
                        {fmt(totals2026.fees)}
                      </td>

                      {MONTHS_2026.map((m) => (
                        <td
                          key={m}
                          className="p-1 text-center font-mono text-black border-l border-slate-200 whitespace-nowrap"
                        >
                          {totals2026.months[m] > 0 ? fmt(totals2026.months[m]) : "—"}
                        </td>
                      ))}
                      {extraCols2026.map((col) => (
                        <td
                          key={col.name}
                          className="p-1 text-center text-black border-l border-slate-200 whitespace-nowrap"
                        >
                          —
                        </td>
                      ))}
                      <td className="p-2 text-center font-mono text-black whitespace-nowrap">
                        {fmt(totals2026.paid)}
                      </td>
                      <td className="p-2 text-center font-mono text-black whitespace-nowrap">
                        {fmt(totals2026.remaining)}
                      </td>
                      <td className="p-2 text-center whitespace-nowrap"></td>
                      <td className="p-2 text-center whitespace-nowrap"></td>
                    </tr>
                  </>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ========== النوافذ المنبثقة ========== */}

      <Modal
        title="🎨 التنسيق الشرطي للصفوف"
        isOpen={condFormatModal}
        onClose={() => setCondFormatModal(false)}
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-500">
            سيتم تلوين الصف بالكامل إذا كان يحتوي على النص الذي تدخله أدناه في أي عمود.
          </p>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              النص المطلوب البحث عنه (الشرط)
            </label>
            <input
              type="text"
              value={condFormatParams.text}
              onChange={(e) => setCondFormatParams({ ...condFormatParams, text: e.target.value })}
              className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-teal-300 outline-none"
              placeholder="مثال: معتمد, منسحب, مجاني..."
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-2">
              اختر لون تمييز الصف
            </label>
            <div className="flex gap-2">
              {[
                { name: "أصفر", class: "bg-yellow-100 hover:bg-yellow-100" },
                { name: "أخضر", class: "bg-green-100 hover:bg-green-100" },
                { name: "أحمر", class: "bg-red-100 hover:bg-red-100" },
                { name: "أزرق", class: "bg-blue-100 hover:bg-blue-100" },
                { name: "بنفسجي", class: "bg-purple-100 hover:bg-purple-100" },
              ].map((color) => (
                <button
                  key={color.class}
                  onClick={() => setCondFormatParams({ ...condFormatParams, color: color.class })}
                  className={`w-8 h-8 rounded-full border-2 ${
                    condFormatParams.color === color.class
                      ? "border-slate-800 scale-110"
                      : "border-transparent"
                  } ${color.class}`}
                  title={color.name}
                />
              ))}
            </div>
          </div>

          {condFormatRules.length > 0 && (
            <div className="space-y-2 border-t pt-3">
              <div className="text-xs font-bold text-slate-700">القواعد الحالية</div>
              {condFormatRules.map((rule, idx) => (
                <div
                  key={`${rule.text}-${idx}`}
                  className="flex items-center justify-between gap-2 bg-slate-50 border rounded-lg p-2"
                >
                  <span className={`px-2 py-1 rounded text-xs ${rule.color}`}>{rule.text}</span>
                  <button
                    onClick={() => deleteConditionalRule(idx)}
                    className="text-red-600 hover:text-red-800 text-xs font-bold"
                  >
                    حذف
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex justify-between items-center pt-3 border-t mt-4">
            <button
              onClick={() => {
                setCondFormatParams({ text: "", color: "bg-yellow-100" });
                setInstallmentConditionalRules2026([]);
                setCondFormatModal(false);
              }}
              className="px-4 py-2 bg-red-50 text-red-600 rounded-lg text-xs font-bold hover:bg-red-100"
            >
              إلغاء التنسيق تماماً
            </button>
            <div className="flex gap-2">
              <button
                onClick={addConditionalRule}
                className="px-4 py-2 bg-amber-500 text-white rounded-lg font-bold"
              >
                إضافة قاعدة
              </button>
              <button
                onClick={() => setCondFormatModal(false)}
                className="px-4 py-2 bg-teal-700 text-white rounded-lg font-bold"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      </Modal>

      <Modal
        title={`⚙️ تعديل العمود: ${editColModal?.oldName}`}
        isOpen={!!editColModal}
        onClose={() => setEditColModal(null)}
      >
        {editColModal && (
          <form onSubmit={saveCustomColumnEdit} className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">اسم العمود</label>
              <input
                type="text"
                required
                value={editColModal.name}
                onChange={(e) => setEditColModal({ ...editColModal, name: e.target.value })}
                className="w-full p-2 border rounded-lg"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">نوع العمود</label>
              <select
                value={editColModal.type}
                onChange={(e: any) => setEditColModal({ ...editColModal, type: e.target.value })}
                className="w-full p-2 border rounded-lg"
              >
                <option value="text">نص أو رقم حر (إدخال يدوي)</option>
                <option value="select">قائمة منسدلة (خيارات محددة)</option>
                <option value="formula">معادلة رياضية دالة (حساب تلقائي)</option>
              </select>
            </div>

            {editColModal.type === "select" && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  الخيارات (افصل بينها بفاصلة)
                </label>
                <input
                  type="text"
                  required
                  value={editColModal.options}
                  onChange={(e) => setEditColModal({ ...editColModal, options: e.target.value })}
                  className="w-full p-2 border rounded-lg"
                  placeholder="مثال: معتمد, غير معتمد"
                />
              </div>
            )}

            {editColModal.type === "formula" && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  المعادلة (استخدم المتغيرات الإنجليزية)
                </label>
                <input
                  type="text"
                  required
                  value={editColModal.formula}
                  onChange={(e) => setEditColModal({ ...editColModal, formula: e.target.value })}
                  className="w-full p-2 border rounded-lg text-left"
                  dir="ltr"
                />
              </div>
            )}

            <div className="flex justify-between items-center pt-3 border-t mt-4">
              <button
                type="button"
                onClick={() => deleteCustomColumn(editColModal.oldName)}
                className="px-4 py-2 bg-red-100 text-red-700 rounded-lg flex items-center gap-1 font-bold"
              >
                <Trash className="w-4 h-4" /> حذف العمود
              </button>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setEditColModal(null)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg font-bold"
                >
                  حفظ التعديل
                </button>
              </div>
            </div>
          </form>
        )}
      </Modal>

      <Modal
        title={`✏️ تعديل بيانات المتدرب (${editRowModal?.year})`}
        isOpen={!!editRowModal}
        onClose={() => setEditRowModal(null)}
      >
        <form onSubmit={saveRowEdit} className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">اسم المتدرب</label>
            <input
              type="text"
              required
              value={editRowData?.name || ""}
              onChange={(e) => setEditRowData({ ...editRowData, name: e.target.value })}
              className="w-full p-2 border rounded-lg"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">الدفعة</label>
              <input
                type="text"
                value={editRowData?.batch || ""}
                onChange={(e) => setEditRowData({ ...editRowData, batch: e.target.value })}
                className="w-full p-2 border rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">المساق</label>
              <input
                type="text"
                value={editRowData?.specialty || ""}
                onChange={(e) => setEditRowData({ ...editRowData, specialty: e.target.value })}
                className="w-full p-2 border rounded-lg"
              />
            </div>
          </div>
          {editRowModal?.year === 2025 && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                الرسوم الكلية
              </label>
              <input
                type="number"
                value={editRowData?.fees || 0}
                onChange={(e) => setEditRowData({ ...editRowData, fees: e.target.value })}
                className="w-full p-2 border rounded-lg"
              />
            </div>
          )}
          {editRowModal?.year === 2026 && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                المتبقي من 2025 (المدور)
              </label>
              <input
                type="number"
                value={editRowData?.prevDue || 0}
                onChange={(e) => setEditRowData({ ...editRowData, prevDue: e.target.value })}
                className="w-full p-2 border rounded-lg"
              />
            </div>
          )}
          <div className="flex justify-end gap-2 pt-3 border-t mt-4">
            <button
              type="button"
              onClick={() => setEditRowModal(null)}
              className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg"
            >
              إلغاء
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-amber-600 text-white rounded-lg font-bold"
            >
              حفظ التعديلات
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        title="➕ إضافة عمود جديد (2026)"
        isOpen={newColModal}
        onClose={() => setNewColModal(false)}
      >
        <form onSubmit={addCustomColumn} className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">اسم العمود</label>
            <input
              type="text"
              required
              value={newColName}
              onChange={(e) => setNewColName(e.target.value)}
              className="w-full p-2 border rounded-lg"
              autoFocus
              placeholder="مثل: حالة الاعتماد، الخصم..."
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">نوع العمود</label>
            <select
              value={newColType}
              onChange={(e: any) => setNewColType(e.target.value)}
              className="w-full p-2 border rounded-lg"
            >
              <option value="text">نص أو رقم حر (إدخال يدوي)</option>
              <option value="select">قائمة منسدلة (خيارات محددة)</option>
              <option value="formula">معادلة رياضية دالة (حساب تلقائي)</option>
            </select>
          </div>

          {newColType === "select" && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                الخيارات (افصل بينها بفاصلة)
              </label>
              <input
                type="text"
                required
                value={newColOptions}
                onChange={(e) => setNewColOptions(e.target.value)}
                className="w-full p-2 border rounded-lg"
                placeholder="مثال: معتمد, غير معتمد, قيد المراجعة"
              />
            </div>
          )}

          {newColType === "formula" && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                المعادلة (استخدم المتغيرات الإنجليزية)
              </label>
              <input
                type="text"
                required
                value={newColFormula}
                onChange={(e) => setNewColFormula(e.target.value)}
                className="w-full p-2 border rounded-lg text-left"
                dir="ltr"
                placeholder="مثال: fees - totalPaid"
              />
            </div>
          )}

          <div className="flex justify-end gap-2 pt-3 border-t mt-4">
            <button
              type="button"
              onClick={() => setNewColModal(false)}
              className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg"
            >
              إلغاء
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-amber-600 text-white rounded-lg font-bold"
            >
              إضافة العمود
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        title="➕ إضافة طالب جديد لعام 2026"
        isOpen={newRowModal2026}
        onClose={() => setNewRowModal2026(false)}
      >
        <form onSubmit={addNewRow2026} className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">اسم المتدرب *</label>
            <input
              type="text"
              required
              value={newRowData2026.name}
              onChange={(e) => setNewRowData2026({ ...newRowData2026, name: e.target.value })}
              className="w-full p-2 border rounded-lg"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">الدفعة</label>
              <input
                type="text"
                value={newRowData2026.batch}
                onChange={(e) => setNewRowData2026({ ...newRowData2026, batch: e.target.value })}
                className="w-full p-2 border rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">المساق</label>
              <input
                type="text"
                value={newRowData2026.specialty}
                onChange={(e) =>
                  setNewRowData2026({ ...newRowData2026, specialty: e.target.value })
                }
                className="w-full p-2 border rounded-lg"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                الرسوم الكلية
              </label>
              <input
                type="number"
                value={newRowData2026.fees}
                onChange={(e) =>
                  setNewRowData2026({ ...newRowData2026, fees: Number(e.target.value) })
                }
                className="w-full p-2 border rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                المتبقي من 2025
              </label>
              <input
                type="number"
                value={newRowData2026.prevDue}
                onChange={(e) =>
                  setNewRowData2026({ ...newRowData2026, prevDue: Number(e.target.value) })
                }
                className="w-full p-2 border rounded-lg"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-3 border-t mt-4">
            <button
              type="button"
              onClick={() => setNewRowModal2026(false)}
              className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg"
            >
              إلغاء
            </button>
            <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg font-bold">
              إضافة المتدرب
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        title="➕ إضافة قسط جديد - 2026"
        isOpen={newPaymentModal}
        onClose={() => setNewPaymentModal(false)}
      >
        <form onSubmit={addNewPayment} className="space-y-3">
          <div className="relative">
            <label className="block text-xs font-semibold text-slate-700 mb-1">اسم المتدرب *</label>
            <input
              type="text"
              required
              placeholder="ابحث عن الاسم"
              value={newStudentName}
              onChange={(e) => handleNameChange(e.target.value)}
              onFocus={() => newStudentName.length > 0 && setShowSuggestions(true)}
              className="w-full p-2 border rounded-lg outline-none"
            />
            {showSuggestions && nameSuggestions.length > 0 && (
              <div className="absolute top-full right-0 left-0 bg-white border rounded-b-lg shadow-xl z-50 max-h-32 overflow-y-auto">
                {nameSuggestions.map((n, idx) => (
                  <div
                    key={idx}
                    onClick={() => {
                      setNewStudentName(n);
                      setShowSuggestions(false);
                    }}
                    className="p-2 text-sm hover:bg-teal-50 cursor-pointer text-slate-800"
                  >
                    {n}
                  </div>
                ))}
              </div>
            )}
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              المبلغ المالي *
            </label>
            <input
              type="number"
              required
              value={newStudentAmount}
              onChange={(e) => setNewStudentAmount(e.target.value)}
              className="w-full p-2 border rounded-lg"
              min="0"
              step="0.01"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              الشهر المستهدف *
            </label>
            <select
              required
              value={newStudentMonth}
              onChange={(e) => setNewStudentMonth(e.target.value)}
              className="w-full p-2 border rounded-lg"
            >
              <option value="">-- اختر الشهر --</option>
              {MONTHS_2026.map((m) => (
                <option key={m} value={m}>
                  {m.trim()}
                </option>
              ))}
            </select>
          </div>
          <div className="flex justify-end gap-2 pt-3 border-t mt-4">
            <button
              type="button"
              onClick={() => setNewPaymentModal(false)}
              className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg"
            >
              إلغاء
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-teal-700 text-white rounded-lg font-bold"
            >
              حفظ
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        title="💵 تسجيل دفعة مالية"
        isOpen={!!paymentModal}
        onClose={() => setPaymentModal(null)}
      >
        {paymentModal && (
          <>
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-slate-800">
              <p>
                <b>المتدرب:</b> {paymentModal.row.name}
              </p>
              <p>
                <b>شهر:</b> {paymentModal.month}
              </p>
            </div>
            <form onSubmit={addPayment} className="space-y-3 mt-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  المبلغ المدفوع *
                </label>
                <input
                  type="number"
                  required
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  className="w-full p-2 border rounded-lg"
                  autoFocus
                  min="0"
                  step="0.01"
                />
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t mt-4">
                <button
                  type="button"
                  onClick={() => setPaymentModal(null)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 text-white rounded-lg font-bold"
                >
                  تأكيد التوريد
                </button>
              </div>
            </form>
          </>
        )}
      </Modal>

      <Modal
        title="✏️ مراجعة وتعديل القسط"
        isOpen={!!editPaymentModal}
        onClose={() => setEditPaymentModal(null)}
      >
        {editPaymentModal && (
          <>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-slate-800">
              <p className="font-bold">{editPaymentModal.row.name}</p>
              <p>بيان شهر: {editPaymentModal.month}</p>
            </div>
            <form onSubmit={editPayment} className="space-y-3 mt-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  المبلغ المعدل *
                </label>
                <input
                  type="number"
                  required
                  value={editAmount}
                  onChange={(e) => setEditAmount(e.target.value)}
                  className="w-full p-2 border rounded-lg"
                  min="0"
                  step="0.01"
                />
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t mt-4">
                <button
                  type="button"
                  onClick={() => setEditPaymentModal(null)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg"
                >
                  إلغاء
                </button>
                <button
                  type="button"
                  onClick={() => deletePayment(editPaymentModal.row, editPaymentModal.month)}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg"
                >
                  🗑️ حذف القسط
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg font-bold"
                >
                  حفظ التعديل
                </button>
              </div>
            </form>
          </>
        )}
      </Modal>

      <PrintSettingsModal
        open={printSettingsYear !== null}
        year={printSettingsYear ?? 2026}
        columnOptions={printColumnOptions(printSettingsYear ?? 2026)}
        onClose={() => setPrintSettingsYear(null)}
        onPrint={(s) => exportToPDF(printSettingsYear ?? 2026, s)}
      />
    </div>
  );
}
