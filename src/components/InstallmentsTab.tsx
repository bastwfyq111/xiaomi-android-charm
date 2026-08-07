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
import { openPrintDocument } from "@/lib/printDocument";

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

// شبكة إحصائيات علوية - نسخة محدثة بتصميم عصري
const StatsGrid = ({ stats, columns = 3 }: { stats: any[]; columns?: number }) => {
  const colClass = columns === 4 ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-1 sm:grid-cols-3";
  return (
    <div className={`grid ${colClass} gap-3 mb-5`}>
      {stats.map((stat, idx) => (
        <div
          key={idx}
          className={`${stat.bgClass} p-3 sm:p-4 rounded-xl border ${stat.borderClass} shadow-md hover:shadow-lg transition-all duration-200 backdrop-blur-sm`}
        >
          <div className="flex items-center justify-between">
            <div className="text-xs sm:text-sm font-medium text-slate-600">{stat.label}</div>
            {stat.icon && <div className="text-slate-400">{stat.icon}</div>}
          </div>
          <div className="text-base sm:text-xl font-mono font-bold mt-1.5 text-slate-900 truncate">
            {stat.value}
          </div>
        </div>
      ))}
    </div>
  );
};

// مكوّن النافذة المنبثقة العامة - نسخة محدثة بتصميم عصري
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
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-2 sm:p-4">
      <div
        className="bg-white rounded-2xl sm:rounded-2xl w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto animate-in slide-in-from-bottom-4 duration-300"
        dir="rtl"
      >
        <div className="flex justify-between items-center p-4 border-b bg-gradient-to-r from-indigo-50 via-purple-50 to-pink-50 sticky top-0 z-10 rounded-t-2xl">
          <h3 className="font-bold text-base sm:text-lg text-slate-900">{title}</h3>
          <button 
            onClick={onClose} 
            className="p-1.5 hover:bg-white/80 rounded-xl transition-all hover:scale-110"
          >
            <X className="w-5 h-5 text-slate-600" />
          </button>
        </div>
        <div className="p-5 space-y-4">{children}</div>
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
    return <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600 transition-colors" />;
  return sortConfig.direction === "asc" ? (
    <ArrowUp className="w-3.5 h-3.5 text-indigo-600" />
  ) : (
    <ArrowDown className="w-3.5 h-3.5 text-indigo-600" />
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
  const [condFormatParams, setCondFormatParams] = useState({ text: "", color: "bg-yellow-100/60" });
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

    return matchedRule?.color || "hover:bg-indigo-50/30";
  };

  const addConditionalRule = () => {
    if (!condFormatParams.text.trim()) return toast.error("يرجى إدخال نص الشرط");
    setInstallmentConditionalRules2026([
      ...condFormatRules,
      { ...condFormatParams, text: condFormatParams.text.trim() },
    ]);
    setCondFormatParams({ text: "", color: "bg-yellow-100/60" });
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
      XLSX.writeFile(workbook, `جدول_أقساط_${year}.xlsx`);
      toast.success("تم تصدير ملف Excel بنجاح");
    } catch (error) {
      toast.error("حدث خطأ أثناء تصدير ملف Excel");
    }
  };


const exportToPDF = (year: number) => {
  try {
    const monthsList = year === 2025 ? MONTHS_2025 : MONTHS_2026;
    const rows = year === 2025 ? filteredRows2025 : filteredRows2026;
    const extraCols = year === 2026 ? extraCols2026 : [];
    const date = new Date().toLocaleDateString("ar-SA");

    // تجهيز عناوين الأعمدة (نستخدمها لاحقاً للتأكد من توافق صف الإجمالي)
    const headers =
      year === 2025
        ? ["م", "الاسم", "الدفعة", "المساق", "الرسوم", ...monthsList, "المسدد", "المتبقي"]
        : [
            "م",
            "الاسم",
            "الدفعة",
            "المساق",
            "مدور 2025",
            "الرسوم",
            ...monthsList,
            ...extraCols.map((c) => c.name),
            "المسدد",
            "المتبقي",
            "حالة",
          ];

    // 1. حساب عدد الأعمدة الإجمالي لتحديد حجم الخط المناسب بدقة
    const fixedColsCount = year === 2025 ? 4 : 5; // عدد الأعمدة الثابتة قبل عمود الرسوم
    const totalDataCols = headers.length; // استخدمنا الهيدر الفعلي ليعكس أي أعمدة إضافية

    // عرض الصفحة الأفقي الفعّال بعد الهوامش (A4 = 297mm × 210mm)، نترك هامش صغير للأمان
    const usablePageWidthMm = 287;
    const minColWidthMm = totalDataCols > 30 ? 6.5 : totalDataCols > 22 ? 7.5 : 9;
    const nameColWidthMm = Math.max(minColWidthMm * 2.2, 18);
    const avgColWidthMm = (usablePageWidthMm - nameColWidthMm) / Math.max(1, totalDataCols - 1);
    const effectiveColWidthMm = Math.min(avgColWidthMm, minColWidthMm * 1.6);

    const fontSizePx = Math.max(5.5, Math.min(10, effectiveColWidthMm * 1.15));
    const headerFontSizePx = fontSizePx + 0.5;

    const computeCellFontSizeStyle = (text: any, baseFont = fontSizePx) => {
      const s = String(text ?? "");
      const len = s.length;
      const reduceSteps = Math.max(0, Math.ceil(Math.max(0, len - 18) / 12));
      const reducePx = Math.min(4, reduceSteps * 0.8);
      const final = Math.max(6, baseFont - reducePx);
      return `font-size:${final.toFixed(2)}px;line-height:1.05;`;
    };

    // دالة توليد صفوف البيانات (مع تطبيق لف خفيف أو تصغير الخط للخلايا الطويلة)
    const generateTableRows = () => {
      return rows
        .map((row: any, i: number) => {
          if (year === 2025) {
            const nameStyle = computeCellFontSizeStyle(row.name);
            return `
              <tr>
                <td>${i + 1}</td>
                <td class="name-cell wrap" style="${nameStyle}">${escapeHtml(row.name || "")}</td>
                <td class="wrap" style="${computeCellFontSizeStyle(row.batch)}">${escapeHtml(row.batch || "")}</td>
                <td class="wrap" style="${computeCellFontSizeStyle(row.specialty)}">${escapeHtml(row.specialty || "")}</td>
                <td style="${computeCellFontSizeStyle(row.fees, fontSizePx - 1)}">${fmt(row.fees)}</td>
                ${monthsList
                  .map(
                    (m) =>
                      `<td style="${computeCellFontSizeStyle(row.payments?.[m] ?? "", fontSizePx - 1)}">${row.payments?.[m] ? fmt(row.payments[m]) : "—"}</td>`
                  )
                  .join("")}
                <td style="${computeCellFontSizeStyle(row.totalPaid, fontSizePx - 1)}">${fmt(row.totalPaid)}</td>
                <td style="${computeCellFontSizeStyle(row.remaining, fontSizePx - 1)}">${fmt(row.remaining)}</td>
              </tr>
            `;
          } else {
            const status = row.remaining <= 0 ? "له" : "عليه";
            const nameStyle = computeCellFontSizeStyle(row.name);
            return `
              <tr>
                <td>${i + 1}</td>
                <td class="name-cell wrap" style="${nameStyle}">${escapeHtml(row.name || "")}</td>
                <td class="wrap" style="${computeCellFontSizeStyle(row.batch)}">${escapeHtml(row.batch || "")}</td>
                <td class="wrap" style="${computeCellFontSizeStyle(row.specialty)}">${escapeHtml(row.specialty || "")}</td>
                <td style="${computeCellFontSizeStyle(row.prevDue, fontSizePx - 1)}">${fmt(row.prevDue)}</td>
                <td style="${computeCellFontSizeStyle(row.fees, fontSizePx - 1)}">${fmt(row.fees)}</td>
                ${monthsList
                  .map(
                    (m) =>
                      `<td style="${computeCellFontSizeStyle(row.payments?.[m] ?? "", fontSizePx - 1)}">${row.payments?.[m] ? fmt(row.payments[m]) : "—"}</td>`
                  )
                  .join("")}
                ${extraCols
                  .map((col) => {
                    if (col.type === "formula")
                      return `<td style="${computeCellFontSizeStyle(evaluateFormula(col.formula || "", row), fontSizePx - 1)}">${evaluateFormula(col.formula || "", row)}</td>`;
                    return `<td style="${computeCellFontSizeStyle(row.customData?.[col.name] || "", fontSizePx - 1)}">${escapeHtml(row.customData?.[col.name] || "—")}</td>`;
                  })
                  .join("")}
                <td style="${computeCellFontSizeStyle(row.totalPaid, fontSizePx - 1)}">${fmt(row.totalPaid)}</td>
                <td style="${computeCellFontSizeStyle(row.remaining, fontSizePx - 1)}">${fmt(row.remaining)}</td>
                <td style="background-color: ${status === "عليه" ? "#fecaca" : "#a7f3d0"};">${status}</td>
              </tr>
            `;
          }
        })
        .join("");
    };

    // دالة توليد صف الإجمالي المتوافق تماماً مع headers (يشمل الأشهر والأعمدة المضافة)
    const generateTotalRow = () => {
      // تُحسب الإجماليات من نفس الصفوف المطبوعة لضمان التطابق
      const sum = (fn: (r: any) => any) =>
        (rows || []).reduce((s: number, r: any) => s + cleanNumber(fn(r)), 0);
      const monthTotal = (m: string) => sum((r) => r.payments?.[m]);

      const leftColSpan = year === 2025 ? 4 : 5; // للـ 2026 لدينا عمود إضافي (مدور/المتبقي من 2025)
      const cellsArr: string[] = [];
      const push = (v: any, extra = "") =>
        cellsArr.push(`<td${extra ? ` style="${extra}"` : ""}>${v}</td>`);

      if (year === 2025) {
        push(fmt(sum((r) => r.fees)));
        monthsList.forEach((m) => {
          const t = monthTotal(m);
          push(t > 0 ? fmt(t) : "—");
        });
        push(fmt(sum((r) => r.totalPaid)));
        push(fmt(sum((r) => r.remaining)));
      } else {
        push(fmt(sum((r) => r.prevDue)));
        push(fmt(sum((r) => r.fees)));
        monthsList.forEach((m) => {
          const t = monthTotal(m);
          push(t > 0 ? fmt(t) : "—");
        });
        extraCols.forEach((col) => {
          if (col.type === "formula") {
            const t = (rows || []).reduce(
              (s: number, r: any) => s + cleanNumber(evaluateFormula(col.formula || "", r)),
              0,
            );
            push(t !== 0 ? fmt(t) : "—");
          } else {
            push("—");
          }
        });
        push(fmt(sum((r) => r.totalPaid)));
        push(fmt(sum((r) => r.remaining)));
        push(""); // عمود الحالة
      }

      // ضبط عدد الخلايا بدقة ليطابق عدد الرؤوس (يمنع أي انزياح)
      const needed = headers.length - leftColSpan;
      while (cellsArr.length < needed) cellsArr.push("<td></td>");
      if (cellsArr.length > needed) cellsArr.length = needed;

      return `<tr class="total-row"><td colspan="${leftColSpan}">الإجمالي</td>${cellsArr.join("")}</tr>`;
    };



    const reportCss = `
      @page { size: A4 landscape; margin: 8mm 6mm; }
      html, body {
        width: 100%;
        margin: 0 !important;
        padding: 0 !important;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      * { box-sizing: border-box; }
      .doc-header {
        text-align: center;
        margin-bottom: 4px;
        border-bottom: 1.5pt solid #b8860b;
        padding-bottom: 4px;
      }
      .doc-header h1 { font-size: 15px; font-weight: 800; margin: 0; }
      .doc-header p { margin: 2px 0 0; font-size: 9.5px; font-weight: 600; }

      table {
        font-size: ${fontSizePx.toFixed(2)}px;
        table-layout: fixed !important;
        width: 100% !important;
        border-collapse: collapse;
        border: 1pt solid #000;
      }
      th, td {
        padding: 0 !important;
        border: 0.5pt solid #000;
        white-space: normal;
        overflow: hidden;
        text-overflow: ellipsis;
        text-align: center;
        line-height: 1;
      }
      .wrap {
        white-space:normal !important;
        padding: 0px 0px !important;
      }
      td { font-weight: 1000; }
      th {
        background: #f5deb3 !important;
        font-size: ${headerFontSizePx.toFixed(2)}px;
        font-weight: 800;
      }
      .name-cell { text-align: center; }
      thead { display: table-header-group; }
      tfoot { display: table-footer-group; }
      .total-row td {
        background: #fde68a !important;
        font-weight: 1000;
        white-space: normal !important;
        border-top: 1.2pt solid #000;
      }

      @media print {
        th, td { white-space:normal; padding: 0 !important; }
        tr { page-break-inside: avoid; }
        .wrap { white-space: normal!important; }
      }
    `;

    const body = `
      <div class="doc-header">
        <h1>المجلس اليمني للاختصاصات الطبية</h1>
        <p>تقرير الأقساط والمدفوعات - العام ${year}م</p>
        <p>تاريخ التقرير: ${date}</p>
      </div>
      <table>
        <thead>
          <tr>
            ${headers.map((h) => `<th>${escapeHtml(h)}</th>`).join("")}
          </tr>
        </thead>
        <tbody>
          ${generateTableRows()}
          ${generateTotalRow()}
        </tbody>
      </table>
    `;

    const ok = openPrintDocument({
      title: `تقرير_الأقساط_والمدفوعات_${year}`,
      body,
      css: reportCss,
      pageSize: "A4",
      orientation: "landscape",
      margin: "2mm 2mm",
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
      ? { text: "له", color: "text-emerald-700", bg: "bg-emerald-100/80" }
      : { text: "عليه", color: "text-rose-700", bg: "bg-rose-100/80" };

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
      body { padding: 4mm; font-size: 13px; }
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
      table { table-layout: fixed; margin-top: 4px; }
      th {
        background: #0f766e;
        color: #fff;
        padding: 7px 4px;
        font-size: 14px;
        font-weight: 700;
      }
      td { padding: 0px 0px; font-size: 16.5px; word-wrap: break-word; }
      .lbl { text-align: center; font-weight: 1000; }
      .num { font-weight: 700; font-size: 15px; font-variant-numeric: tabular-nums; }
      .row-fees td { background: #eff6ff; }
      .row-due-old td { background: #fef3c7; color: #b91c1c; }
      .row-total-due td { background: #fee2e2; font-weight: 700; }
      .row-paid td { color: #1d4ed8; }
      .row-total-paid td { background: #d1fae5; font-weight: 700; }
      .row-final td { background: #fee2e2; font-size: 16px; font-weight: 800; color: #b91c1c; border-top: 1pt solid #b91c1c; }
      .foot { margin-top: 14px; display: flex; justify-content: space-between; font-size: 11.5px; font-weight: 600; }
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
          <span>تاريخ الإصدار: ${escapeHtml(new Date().toLocaleDateString("ar-EG-u-nu-latn"))}</span>
          <span>التوقيع: ________________</span>
        </div>
      </div>
    `;

    return {
      title: `كشف_حساب_${safeName}_${year}`,
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
      bgClass: "bg-gradient-to-br from-slate-50 to-slate-100/50",
      borderClass: "border-slate-200",
      icon: "💰",
    },
    {
      label: "إجمالي الأقساط المسددة",
      value: fmt(totals2025.paid),
      bgClass: "bg-gradient-to-br from-emerald-50 to-emerald-100/50",
      borderClass: "border-emerald-200",
      icon: "✅",
    },
    {
      label: "إجمالي المتبقي والأرشيف",
      value: fmt(totals2025.remaining),
      bgClass: "bg-gradient-to-br from-rose-50 to-rose-100/50",
      borderClass: "border-rose-200",
      icon: "📋",
    },
  ];

  const stats2026 = [
    {
      label: "المدور (متبقي 2025)",
      value: fmt(totals2026.prevDue),
      bgClass: "bg-gradient-to-br from-amber-50 to-amber-100/50",
      borderClass: "border-amber-200",
      icon: "🔄",
    },
    {
      label: "إجمالي مسدد 2026",
      value: fmt(totals2026.paid),
      bgClass: "bg-gradient-to-br from-emerald-50 to-emerald-100/50",
      borderClass: "border-emerald-200",
      icon: "💳",
    },
    {
      label: "صافي رصيد المتبقي",
      value: fmt(totals2026.remaining),
      bgClass: "bg-gradient-to-br from-rose-50 to-rose-100/50",
      borderClass: "border-rose-200",
      icon: "📊",
    },
  ];

  return (
    <div className="w-full space-y-6 p-0" dir="rtl">
      {/* ========== واجهة جدول 2025 ========== */}
      <div className="w-full bg-white/80 backdrop-blur-sm shadow-xl border border-indigo-100 rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-2xl">
        <div className="bg-gradient-to-l from-indigo-600 via-indigo-700 to-indigo-800 px-4 sm:px-6 py-4 sm:py-5 flex justify-between items-center flex-wrap gap-3">
          <div>
            <h2 className="text-sm sm:text-lg font-bold text-white flex items-center gap-2">
              <span className="bg-white/20 p-1.5 rounded-lg">📊</span>
              أقساط ومستندات العام 2025
            </h2>
            <p className="text-xs text-indigo-200/80 mt-0.5">يشمل جميع الدفعات لعامي 2024 و 2025</p>
          </div>
          <div className="flex gap-2 flex-wrap items-center">
            <div className="relative">
              <Search className="w-4 h-4 absolute right-3 top-2.5 text-indigo-400" />
              <input
                type="text"
                placeholder="بحث..."
                value={search2025}
                onChange={(e) => setSearch2025(e.target.value)}
                className="pl-3 pr-9 py-2 rounded-xl text-xs border-0 bg-white/90 backdrop-blur-sm outline-none focus:ring-2 focus:ring-indigo-300 w-44 text-slate-800 shadow-md focus:shadow-lg transition-all"
              />
            </div>

            <label className="px-3 py-2 bg-white/90 text-indigo-700 rounded-xl text-xs font-bold cursor-pointer hover:bg-white shadow-md transition-all flex items-center gap-1.5">
              <FileSpreadsheet className="w-3.5 h-3.5" />
              استيراد
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={(e) => importFile(e, 2025)}
                className="hidden"
              />
            </label>

            <div className="flex gap-1.5">
              <button
                onClick={() => exportToExcel(2025)}
                className="px-3 py-2 bg-emerald-100/90 text-emerald-700 rounded-xl text-xs font-bold shadow-md hover:bg-emerald-200 transition-all flex items-center gap-1.5 hover:scale-105"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" /> Excel
              </button>
              <button
                onClick={() => exportToPDF(2025)}
                className="px-3 py-2 bg-rose-100/90 text-rose-700 rounded-xl text-xs font-bold shadow-md hover:bg-rose-200 transition-all flex items-center gap-1.5 hover:scale-105"
              >
                <FileText className="w-3.5 h-3.5" /> الأقساط/تفصيلي
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
          <div className="bg-rose-50/80 border-b border-rose-200 p-3 flex gap-2 backdrop-blur-sm">
            <AlertCircle className="w-5 h-5 text-rose-600" />
            <p className="text-sm text-rose-700">{importError}</p>
          </div>
        )}

        <div className="p-4 sm:p-5">
          <StatsGrid stats={stats2025} columns={3} />
          <div className="overflow-auto max-h-[65vh] rounded-xl border border-slate-200/80 shadow-lg relative">
            <table className="w-full text-xs sm:text-sm">
              <thead className="bg-gradient-to-b from-indigo-100 via-indigo-200 to-indigo-300 font-bold border-b-2 border-indigo-400 text-indigo-900 sticky top-0 z-20 shadow-md">
                <tr>
                  <th className="p-2.5 text-center whitespace-nowrap">#</th>
                  <th
                    className="p-2.5 text-center whitespace-nowrap cursor-pointer hover:bg-indigo-400/30 transition-colors group"
                    onClick={() => handleSort2025("name")}
                  >
                    <div className="flex items-center justify-center gap-1.5">
                      اسم المتدرب <SortIcon sortConfig={sortConfig2025} columnKey="name" />
                    </div>
                  </th>
                  <th
                    className="p-2.5 text-center whitespace-nowrap cursor-pointer hover:bg-indigo-400/30 transition-colors group"
                    onClick={() => handleSort2025("batch")}
                  >
                    <div className="flex items-center justify-center gap-1.5">
                      الدفعة <SortIcon sortConfig={sortConfig2025} columnKey="batch" />
                    </div>
                  </th>
                  <th
                    className="p-2.5 text-center whitespace-nowrap cursor-pointer hover:bg-indigo-400/30 transition-colors group"
                    onClick={() => handleSort2025("specialty")}
                  >
                    <div className="flex items-center justify-center gap-1.5">
                      المساق <SortIcon sortConfig={sortConfig2025} columnKey="specialty" />
                    </div>
                  </th>
                  <th
                    className="p-2.5 text-center whitespace-nowrap cursor-pointer hover:bg-indigo-400/30 transition-colors group"
                    onClick={() => handleSort2025("fees")}
                  >
                    <div className="flex items-center justify-center gap-1.5">
                      الرسوم <SortIcon sortConfig={sortConfig2025} columnKey="fees" />
                    </div>
                  </th>
                  {MONTHS_2025.map((m) => (
                    <th
                      key={m}
                      className="p-1.5 text-center text-[10px] sm:text-[11px] border-l border-indigo-400/30 whitespace-nowrap"
                    >
                      {m}
                    </th>
                  ))}
                  <th
                    className="p-2.5 text-center whitespace-nowrap cursor-pointer hover:bg-indigo-400/30 transition-colors group"
                    onClick={() => handleSort2025("totalPaid")}
                  >
                    <div className="flex items-center justify-center gap-1.5">
                      المسدد <SortIcon sortConfig={sortConfig2025} columnKey="totalPaid" />
                    </div>
                  </th>
                  <th
                    className="p-2.5 text-center whitespace-nowrap cursor-pointer hover:bg-indigo-400/30 transition-colors group"
                    onClick={() => handleSort2025("remaining")}
                  >
                    <div className="flex items-center justify-center gap-1.5">
                      المتبقي <SortIcon sortConfig={sortConfig2025} columnKey="remaining" />
                    </div>
                  </th>
                  <th className="p-2.5 text-center whitespace-nowrap">إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows2025.length === 0 ? (
                  <tr>
                    <td colSpan={8 + MONTHS_2025.length} className="p-8 text-center text-slate-400">
                      <div className="flex flex-col items-center gap-2">
                        <Search className="w-8 h-8 text-slate-300" />
                        <span>لا توجد بيانات</span>
                      </div>
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
                          className="border-t border-slate-100 hover:bg-indigo-50/50 transition-all duration-150 even:bg-slate-50/50"
                        >
                          <td className="p-2.5 text-center text-slate-500 whitespace-nowrap">
                            {i + 1}
                          </td>
                          <td className="p-2.5 text-center font-semibold text-indigo-900 whitespace-nowrap text-[11px] sm:text-xs bg-indigo-50/60">
                            {r.name}
                          </td>
                          <td className="p-2.5 text-center text-slate-700 whitespace-nowrap text-[11px] sm:text-xs bg-cyan-50/60">
                            {r.batch || "—"}
                          </td>
                          <td className="p-2.5 text-center text-slate-700 whitespace-nowrap text-[11px] sm:text-xs bg-sky-50/60">
                            {r.specialty || "—"}
                          </td>
                          <td className="p-2.5 text-center font-mono font-semibold text-indigo-700 whitespace-nowrap text-[11px] sm:text-xs bg-blue-50/60">
                            {fmt(r.fees)}
                          </td>
                          {MONTHS_2025.map((m) => {
                            const paid = Number(r.payments?.[m]) || 0;
                            return (
                              <td
                                key={m}
                                className="p-1.5 text-center bg-white/40 border-l border-slate-100 whitespace-nowrap"
                              >
                                {paid > 0 ? (
                                  <span className="text-emerald-700 font-bold font-mono">
                                    {fmt(paid)}
                                  </span>
                                ) : (
                                  <span className="text-slate-300">—</span>
                                )}
                              </td>
                            );
                          })}
                          <td className="p-2.5 text-center font-mono text-emerald-700 font-bold bg-emerald-50/40 whitespace-nowrap">
                            {fmt(r.totalPaid)}
                          </td>
                          <td className="p-2.5 text-center font-mono text-rose-700 font-bold bg-rose-50/40 whitespace-nowrap">
                            {fmt(r.remaining)}
                          </td>
                          <td className="p-2.5 text-center whitespace-nowrap">
                            <div className="flex justify-center gap-1.5">
                              <button
                                onClick={() => {
                                  setEditRowData(r);
                                  setEditRowModal({ year: 2025, row: r, index: originalIndex });
                                }}
                                className="p-1.5 bg-amber-50/80 text-amber-600 rounded-lg border border-amber-200/50 hover:bg-amber-500 hover:text-white transition-all hover:scale-110"
                                title="تعديل الصف"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => printStatement(r, 2025)}
                                className="p-1.5 bg-blue-50/80 text-blue-600 rounded-lg border border-blue-200/50 hover:bg-blue-500 hover:text-white transition-all hover:scale-110"
                                title="طباعة الكشف"
                              >
                                <Printer className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleExportPdf(r, 2025)}
                                className="p-1.5 bg-emerald-50/80 text-emerald-600 rounded-lg border border-emerald-200/50 hover:bg-emerald-500 hover:text-white transition-all hover:scale-110"
                                title="تنزيل PDF"
                              >
                                <FileText className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    <tr className="border-t-2 border-indigo-600 bg-gradient-to-r from-amber-200 via-amber-300 to-amber-400 font-extrabold">
                      <td className="p-2.5 text-center text-indigo-900 whitespace-nowrap" colSpan={4}>
                        الإجماليات
                      </td>
                      <td className="p-2.5 text-center font-mono text-indigo-900 whitespace-nowrap">
                        {fmt(totals2025.fees)}
                      </td>
                      {MONTHS_2025.map((m) => (
                        <td
                          key={m}
                          className="p-1.5 text-center font-mono text-indigo-900 border-l border-indigo-400/30 whitespace-nowrap"
                        >
                          {totals2025.months[m] > 0 ? fmt(totals2025.months[m]) : "—"}
                        </td>
                      ))}
                      <td className="p-2.5 text-center font-mono text-indigo-900 whitespace-nowrap">
                        {fmt(totals2025.paid)}
                      </td>
                      <td className="p-2.5 text-center font-mono text-indigo-900 whitespace-nowrap">
                        {fmt(totals2025.remaining)}
                      </td>
                      <td className="p-2.5 text-center whitespace-nowrap"></td>
                    </tr>
                  </>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ========== واجهة جدول 2026 ========== */}
      <div className="w-full bg-white/80 backdrop-blur-sm shadow-xl border border-purple-100 rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-2xl">
        <div className="bg-gradient-to-l from-purple-600 via-purple-700 to-purple-800 px-4 sm:px-6 py-4 sm:py-5 flex justify-between items-center flex-wrap gap-3">
          <div>
            <h2 className="text-sm sm:text-lg font-bold text-white flex items-center gap-2">
              <span className="bg-white/20 p-1.5 rounded-lg">📈</span>
              سجل أقساط العام الحالي 2026
            </h2>
            <p className="text-xs text-purple-200/80 mt-0.5">بيانات المسدد والرصيد المدور لعام 2026</p>
          </div>
          <div className="flex gap-2 flex-wrap items-center">
            <button
              onClick={() => setCondFormatModal(true)}
              className={`px-3 py-2 rounded-xl text-xs font-bold shadow-md transition-all flex items-center gap-1.5 ${
                condFormatRules.length
                  ? "bg-gradient-to-r from-yellow-400 to-amber-400 text-amber-900 animate-pulse"
                  : "bg-white/20 text-white hover:bg-white/30"
              }`}
              title="تلوين الصفوف حسب نص معين"
            >
              <Palette className="w-4 h-4" />
              {condFormatRules.length ? `تنسيق نشط (${condFormatRules.length})` : "تنسيق شرطي"}
            </button>

            <div className="relative">
              <Search className="w-4 h-4 absolute right-3 top-2.5 text-purple-400" />
              <input
                type="text"
                placeholder="بحث..."
                value={search2026}
                onChange={(e) => setSearch2026(e.target.value)}
                className="pl-3 pr-9 py-2 rounded-xl text-xs border-0 bg-white/90 backdrop-blur-sm outline-none focus:ring-2 focus:ring-purple-300 w-44 text-slate-800 shadow-md focus:shadow-lg transition-all"
              />
            </div>

            <button
              onClick={() => setNewRowModal2026(true)}
              className="px-3 py-2 bg-blue-100/90 text-blue-700 rounded-xl text-xs font-bold shadow-md hover:bg-blue-200 transition-all flex items-center gap-1.5 hover:scale-105"
            >
              <Plus className="w-3.5 h-3.5" /> طالب جديد
            </button>

            <button
              onClick={() => setNewColModal(true)}
              className="px-3 py-2 bg-amber-100/90 text-amber-700 rounded-xl text-xs font-bold shadow-md hover:bg-amber-200 transition-all flex items-center gap-1.5 hover:scale-105"
            >
              <Plus className="w-3.5 h-3.5" /> عمود جديد
            </button>

            <button
              onClick={() => setNewPaymentModal(true)}
              className="px-3 py-2 bg-purple-100/90 text-purple-700 rounded-xl text-xs font-bold shadow-md hover:bg-purple-200 transition-all hover:scale-105"
            >
              ➕ إضافة قسط
            </button>
            <label className="px-3 py-2 bg-white/90 text-purple-700 rounded-xl text-xs font-bold cursor-pointer shadow-md hover:bg-white transition-all flex items-center gap-1.5">
              <FileSpreadsheet className="w-3.5 h-3.5" />
              استيراد
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={(e) => importFile(e, 2026)}
                className="hidden"
              />
            </label>

            <div className="flex gap-1.5">
              <button
                onClick={() => exportToExcel(2026)}
                className="px-3 py-2 bg-emerald-100/90 text-emerald-700 rounded-xl text-xs font-bold shadow-md hover:bg-emerald-200 transition-all flex items-center gap-1.5 hover:scale-105"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" /> Excel
              </button>
              <button
                onClick={() => exportToPDF(2026)}
                className="px-3 py-2 bg-rose-100/90 text-rose-700 rounded-xl text-xs font-bold shadow-md hover:bg-rose-200 transition-all flex items-center gap-1.5 hover:scale-105"
              >
                <FileText className="w-3.5 h-3.5" /> الأقساط/تفصيلي
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

        <div className="p-4 sm:p-5">
          <StatsGrid stats={stats2026} columns={3} />
          <div className="overflow-auto max-h-[65vh] rounded-xl border border-slate-200/80 shadow-lg relative">
            <table className="w-full text-xs sm:text-sm">
              <thead className="bg-gradient-to-b from-purple-100 via-purple-200 to-purple-300 font-bold border-b-2 border-purple-400 text-purple-900 sticky top-0 z-20 shadow-md">
                <tr>
                  <th className="p-2.5 text-center whitespace-nowrap">#</th>
                  <th
                    className="p-2.5 text-center whitespace-nowrap cursor-pointer hover:bg-purple-400/30 transition-colors group"
                    onClick={() => handleSort2026("name")}
                  >
                    <div className="flex items-center justify-center gap-1.5">
                      اسم المتدرب <SortIcon sortConfig={sortConfig2026} columnKey="name" />
                    </div>
                  </th>
                  <th
                    className="p-2.5 text-center cursor-pointer hover:bg-purple-400/30 transition-colors group"
                    onClick={() => handleSort2026("batch")}
                  >
                    <div className="flex items-center justify-center gap-1.5">
                      دفعة <SortIcon sortConfig={sortConfig2026} columnKey="batch" />
                    </div>
                  </th>
                  <th
                    className="p-2.5 text-center whitespace-nowrap cursor-pointer hover:bg-purple-400/30 transition-colors group"
                    onClick={() => handleSort2026("specialty")}
                  >
                    <div className="flex items-center justify-center gap-1.5">
                      المساق <SortIcon sortConfig={sortConfig2026} columnKey="specialty" />
                    </div>
                  </th>
                  <th
                    className="p-2.5 text-center whitespace-nowrap cursor-pointer hover:bg-purple-400/30 transition-colors group border-x border-purple-400/30"
                    onClick={() => handleSort2026("prevDue")}
                  >
                    <div className="flex items-center justify-center gap-1.5">
                      المتبقي من 2025 <SortIcon sortConfig={sortConfig2026} columnKey="prevDue" />
                    </div>
                  </th>
                  <th
                    className="p-2.5 text-center whitespace-nowrap cursor-pointer hover:bg-purple-400/30 transition-colors group"
                    onClick={() => handleSort2026("fees")}
                  >
                    <div className="flex items-center justify-center gap-1.5">
                      الرسوم <SortIcon sortConfig={sortConfig2026} columnKey="fees" />
                    </div>
                  </th>
                  {MONTHS_2026.map((m) => (
                    <th
                      key={m}
                      className="p-1.5 text-center text-[10px] sm:text-[11px] border-l border-purple-400/30 whitespace-nowrap"
                    >
                      {m.trim()}
                    </th>
                  ))}
                  {extraCols2026.map((col) => (
                    <th
                      key={col.name}
                      className="p-2.5 text-center text-[10px] sm:text-[11px] border-l border-purple-400/30 whitespace-nowrap text-purple-900"
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
                          className="p-0.5 bg-purple-200/50 hover:bg-purple-300/70 rounded-lg transition-all"
                          title="تعديل أو حذف العمود"
                        >
                          <Settings className="w-3 h-3" />
                        </button>
                      </div>
                    </th>
                  ))}
                  <th
                    className="p-2.5 text-center whitespace-nowrap cursor-pointer hover:bg-purple-400/30 transition-colors group"
                    onClick={() => handleSort2026("totalPaid")}
                  >
                    <div className="flex items-center justify-center gap-1.5">
                      مسدد 2026 <SortIcon sortConfig={sortConfig2026} columnKey="totalPaid" />
                    </div>
                  </th>
                  <th
                    className="p-2.5 text-center whitespace-nowrap cursor-pointer hover:bg-purple-400/30 transition-colors group"
                    onClick={() => handleSort2026("remaining")}
                  >
                    <div className="flex items-center justify-center gap-1.5">
                      الرصيد المتبقي <SortIcon sortConfig={sortConfig2026} columnKey="remaining" />
                    </div>
                  </th>
                  <th className="p-2.5 text-center whitespace-nowrap">حالة</th>
                  <th className="p-2.5 text-center whitespace-nowrap">إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows2026.length === 0 ? (
                  <tr>
                    <td
                      colSpan={10 + MONTHS_2026.length + extraCols2026.length}
                      className="p-8 text-center text-slate-400"
                    >
                      <div className="flex flex-col items-center gap-2">
                        <Search className="w-8 h-8 text-slate-300" />
                        <span>لا توجد بيانات</span>
                      </div>
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
                          className={`border-t border-slate-100 transition-all duration-150 even:bg-slate-50/50 ${rowBgClass}`}
                        >
                          <td className="p-2.5 text-center text-slate-500 whitespace-nowrap">
                            {i + 1}
                          </td>
                          <td className="p-1.5 text-center font-bold text-purple-900 whitespace-nowrap bg-fuchsia-50/60">
                            <input
                              value={r.name || ""}
                              onChange={(e) =>
                                update2026CellValue(originalIndex, "name", e.target.value)
                              }
                              className="w-full min-w-32 bg-transparent text-center text-purple-900 text-[11px] sm:text-xs outline-none focus:bg-white/80 focus:ring-2 ring-purple-300 rounded-lg px-2 py-1.5 transition-all"
                            />
                          </td>
                          <td className="p-1.5 text-center text-slate-700 whitespace-nowrap bg-violet-50/60">
                            <input
                              value={r.batch || ""}
                              onChange={(e) =>
                                update2026CellValue(originalIndex, "batch", e.target.value)
                              }
                              className="w-full min-w-20 bg-transparent text-center text-slate-700 text-[11px] sm:text-xs outline-none focus:bg-white/80 focus:ring-2 ring-purple-300 rounded-lg px-2 py-1.5 transition-all"
                              placeholder="—"
                            />
                          </td>
                          <td className="p-1.5 text-center text-slate-700 whitespace-nowrap bg-purple-50/60">
                            <input
                              value={r.specialty || ""}
                              onChange={(e) =>
                                update2026CellValue(originalIndex, "specialty", e.target.value)
                              }
                              className="w-full min-w-24 bg-transparent text-center text-slate-700 text-[11px] sm:text-xs outline-none focus:bg-white/80 focus:ring-2 ring-purple-300 rounded-lg px-2 py-1.5 transition-all"
                              placeholder="—"
                            />
                          </td>
                          <td className="p-1.5 text-center font-mono text-amber-700 font-bold bg-amber-50/40 whitespace-nowrap">
                            <input
                              type="number"
                              value={r.prevDue || 0}
                              onChange={(e) =>
                                update2026CellValue(originalIndex, "prevDue", e.target.value)
                              }
                              className="w-full min-w-20 bg-transparent text-center text-amber-700 text-[11px] sm:text-xs outline-none focus:bg-white/80 focus:ring-2 ring-purple-300 rounded-lg px-2 py-1.5 transition-all"
                            />
                          </td>
                          <td className="p-1.5 text-center font-mono text-indigo-700 font-bold whitespace-nowrap bg-indigo-50/60">
                            <input
                              type="number"
                              value={r.fees || 0}
                              onChange={(e) =>
                                update2026CellValue(originalIndex, "fees", e.target.value)
                              }
                              className="w-full min-w-20 bg-transparent text-center text-indigo-700 text-[11px] sm:text-xs outline-none focus:bg-white/80 focus:ring-2 ring-purple-300 rounded-lg px-2 py-1.5 transition-all"
                            />
                          </td>
                          {MONTHS_2026.map((m) => {
                            const paid = Number(r.payments?.[m]) || 0;
                            const cellId = `${r.name}-${m}`;
                            return (
                              <td
                                key={m}
                                className="p-1.5 text-center relative bg-white/40 border-l border-slate-100 hover:bg-purple-50/60 cursor-pointer group transition-all whitespace-nowrap"
                                onMouseEnter={() => setHoveredCell(cellId)}
                                onMouseLeave={() => setHoveredCell(null)}
                              >
                                <input
                                  type="number"
                                  value={paid || ""}
                                  onChange={(e) =>
                                    update2026PaymentValue(originalIndex, m, e.target.value)
                                  }
                                  className="w-20 bg-transparent text-center font-mono text-purple-700 font-bold outline-none focus:bg-white/80 focus:ring-2 ring-emerald-300 rounded-lg px-2 py-1.5 transition-all"
                                  placeholder="—"
                                  min="0"
                                  step="0.01"
                                />
                              </td>
                            );
                          })}

                          {extraCols2026.map((col) => (
                            <td key={col.name} className="p-1.5 border-l border-slate-100">
                              {col.type === "select" ? (
                                <select
                                  className="w-full text-center text-slate-700 bg-transparent outline-none focus:bg-white/80 focus:ring-2 ring-blue-300 rounded-lg px-2 py-1.5 text-xs transition-all"
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
                                <div className="text-center font-mono text-xs font-bold text-purple-700 bg-white/50 py-2 rounded-lg">
                                  {evaluateFormula(col.formula || "", r)}
                                </div>
                              ) : (
                                <input
                                  type="text"
                                  className="w-full text-center text-slate-700 bg-transparent outline-none focus:bg-white/80 focus:ring-2 ring-blue-300 rounded-lg px-2 py-1.5 text-xs transition-all"
                                  value={r.customData?.[col.name] || ""}
                                  onChange={(e) =>
                                    updateCustomColValue(originalIndex, col.name, e.target.value)
                                  }
                                  placeholder="—"
                                />
                              )}
                            </td>
                          ))}

                          <td className="p-2.5 text-center font-mono text-emerald-700 font-bold bg-emerald-50/40 whitespace-nowrap">
                            {fmt(r.totalPaid)}
                          </td>
                          <td className="p-2.5 text-center font-mono text-rose-700 font-bold bg-rose-50/40 whitespace-nowrap">
                            {fmt(r.remaining)}
                          </td>
                          <td className="p-2.5 text-center whitespace-nowrap">
                            <span
                              className={`px-2.5 py-1 rounded-full text-xs font-bold ${status.bg} ${status.color} backdrop-blur-sm border border-white/20 shadow-sm`}
                            >
                              {status.text}
                            </span>
                          </td>
                          <td className="p-2.5 text-center whitespace-nowrap">
                            <div className="flex justify-center gap-1.5">
                              <button
                                onClick={() => {
                                  setEditRowData(r);
                                  setEditRowModal({ year: 2026, row: r, index: originalIndex });
                                }}
                                className="p-1.5 bg-amber-50/80 text-amber-600 rounded-lg border border-amber-200/50 hover:bg-amber-500 hover:text-white transition-all hover:scale-110"
                                title="تعديل الصف"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => printStatement(r, 2026)}
                                className="p-1.5 bg-blue-50/80 text-blue-600 rounded-lg border border-blue-200/50 hover:bg-blue-500 hover:text-white transition-all hover:scale-110"
                                title="طباعة الكشف"
                              >
                                <Printer className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleExportPdf(r, 2026)}
                                className="p-1.5 bg-emerald-50/80 text-emerald-600 rounded-lg border border-emerald-200/50 hover:bg-emerald-500 hover:text-white transition-all hover:scale-110"
                                title="تنزيل PDF"
                              >
                                <FileText className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => deleteRow2026(originalIndex, r.name)}
                                className="p-1.5 bg-rose-50/80 text-rose-600 rounded-lg border border-rose-200/50 hover:bg-rose-500 hover:text-white transition-all hover:scale-110"
                                title="حذف الصف"
                              >
                                <Trash className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    <tr className="border-t-2 border-purple-600 bg-gradient-to-r from-amber-200 via-amber-300 to-amber-400 font-extrabold">
                      <td className="p-2.5 text-center text-purple-900 whitespace-nowrap" colSpan={4}>
                        الإجماليات
                      </td>
                      <td className="p-2.5 text-center font-mono text-purple-900 whitespace-nowrap">
                        {fmt(totals2026.prevDue)}
                      </td>
                      <td className="p-2.5 text-center font-mono text-purple-900 whitespace-nowrap">
                        {fmt(totals2026.fees)}
                      </td>

                      {MONTHS_2026.map((m) => (
                        <td
                          key={m}
                          className="p-1.5 text-center font-mono text-purple-900 border-l border-purple-400/30 whitespace-nowrap"
                        >
                          {totals2026.months[m] > 0 ? fmt(totals2026.months[m]) : "—"}
                        </td>
                      ))}
                      {extraCols2026.map((col) => (
                        <td
                          key={col.name}
                          className="p-1.5 text-center text-purple-900 border-l border-purple-400/30 whitespace-nowrap"
                        >
                          —
                        </td>
                      ))}
                      <td className="p-2.5 text-center font-mono text-purple-900 whitespace-nowrap">
                        {fmt(totals2026.paid)}
                      </td>
                      <td className="p-2.5 text-center font-mono text-purple-900 whitespace-nowrap">
                        {fmt(totals2026.remaining)}
                      </td>
                      <td className="p-2.5 text-center whitespace-nowrap"></td>
                      <td className="p-2.5 text-center whitespace-nowrap"></td>
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
          <p className="text-xs text-slate-500 leading-relaxed">
            سيتم تلوين الصف بالكامل إذا كان يحتوي على النص الذي تدخله أدناه في أي عمود.
          </p>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              النص المطلوب البحث عنه (الشرط)
            </label>
            <input
              type="text"
              value={condFormatParams.text}
              onChange={(e) => setCondFormatParams({ ...condFormatParams, text: e.target.value })}
              className="w-full p-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-300 outline-none transition-all"
              placeholder="مثال: معتمد, منسحب, مجاني..."
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-2">
              اختر لون تمييز الصف
            </label>
            <div className="flex gap-2.5">
              {[
                { name: "أصفر", class: "bg-yellow-100/80 hover:bg-yellow-100" },
                { name: "أخضر", class: "bg-green-100/80 hover:bg-green-100" },
                { name: "أحمر", class: "bg-red-100/80 hover:bg-red-100" },
                { name: "أزرق", class: "bg-blue-100/80 hover:bg-blue-100" },
                { name: "بنفسجي", class: "bg-purple-100/80 hover:bg-purple-100" },
              ].map((color) => (
                <button
                  key={color.class}
                  onClick={() => setCondFormatParams({ ...condFormatParams, color: color.class })}
                  className={`w-10 h-10 rounded-xl border-2 transition-all ${
                    condFormatParams.color === color.class
                      ? "border-indigo-600 scale-110 shadow-md"
                      : "border-transparent hover:scale-105"
                  } ${color.class}`}
                  title={color.name}
                />
              ))}
            </div>
          </div>

          {condFormatRules.length > 0 && (
            <div className="space-y-2 border-t border-slate-200 pt-3">
              <div className="text-xs font-bold text-slate-700">القواعد الحالية</div>
              {condFormatRules.map((rule, idx) => (
                <div
                  key={`${rule.text}-${idx}`}
                  className="flex items-center justify-between gap-2 bg-slate-50/80 border border-slate-200 rounded-xl p-2.5 backdrop-blur-sm"
                >
                  <span className={`px-3 py-1 rounded-lg text-xs ${rule.color}`}>{rule.text}</span>
                  <button
                    onClick={() => deleteConditionalRule(idx)}
                    className="text-rose-600 hover:text-rose-800 text-xs font-bold transition-colors"
                  >
                    حذف
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex justify-between items-center pt-3 border-t border-slate-200 mt-4">
            <button
              onClick={() => {
                setCondFormatParams({ text: "", color: "bg-yellow-100/60" });
                setInstallmentConditionalRules2026([]);
                setCondFormatModal(false);
              }}
              className="px-4 py-2.5 bg-rose-50/80 text-rose-600 rounded-xl text-xs font-bold hover:bg-rose-100 transition-all"
            >
              إلغاء التنسيق تماماً
            </button>
            <div className="flex gap-2">
              <button
                onClick={addConditionalRule}
                className="px-4 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 text-white rounded-xl font-bold hover:scale-105 transition-all shadow-md"
              >
                إضافة قاعدة
              </button>
              <button
                onClick={() => setCondFormatModal(false)}
                className="px-4 py-2.5 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-xl font-bold hover:scale-105 transition-all shadow-md"
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
          <form onSubmit={saveCustomColumnEdit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">اسم العمود</label>
              <input
                type="text"
                required
                value={editColModal.name}
                onChange={(e) => setEditColModal({ ...editColModal, name: e.target.value })}
                className="w-full p-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-300 outline-none transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">نوع العمود</label>
              <select
                value={editColModal.type}
                onChange={(e: any) => setEditColModal({ ...editColModal, type: e.target.value })}
                className="w-full p-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-300 outline-none transition-all"
              >
                <option value="text">نص أو رقم حر (إدخال يدوي)</option>
                <option value="select">قائمة منسدلة (خيارات محددة)</option>
                <option value="formula">معادلة رياضية دالة (حساب تلقائي)</option>
              </select>
            </div>

            {editColModal.type === "select" && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  الخيارات (افصل بينها بفاصلة)
                </label>
                <input
                  type="text"
                  required
                  value={editColModal.options}
                  onChange={(e) => setEditColModal({ ...editColModal, options: e.target.value })}
                  className="w-full p-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-300 outline-none transition-all"
                  placeholder="مثال: معتمد, غير معتمد"
                />
              </div>
            )}

            {editColModal.type === "formula" && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  المعادلة (استخدم المتغيرات الإنجليزية)
                </label>
                <input
                  type="text"
                  required
                  value={editColModal.formula}
                  onChange={(e) => setEditColModal({ ...editColModal, formula: e.target.value })}
                  className="w-full p-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-300 outline-none transition-all text-left"
                  dir="ltr"
                />
              </div>
            )}

            <div className="flex justify-between items-center pt-3 border-t border-slate-200 mt-4">
              <button
                type="button"
                onClick={() => deleteCustomColumn(editColModal.oldName)}
                className="px-4 py-2.5 bg-rose-50/80 text-rose-600 rounded-xl flex items-center gap-1.5 font-bold hover:bg-rose-100 transition-all"
              >
                <Trash className="w-4 h-4" /> حذف العمود
              </button>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setEditColModal(null)}
                  className="px-4 py-2.5 bg-slate-100/80 text-slate-700 rounded-xl hover:bg-slate-200 transition-all"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-4 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl font-bold hover:scale-105 transition-all shadow-md"
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
        <form onSubmit={saveRowEdit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">اسم المتدرب</label>
            <input
              type="text"
              required
              value={editRowData?.name || ""}
              onChange={(e) => setEditRowData({ ...editRowData, name: e.target.value })}
              className="w-full p-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-300 outline-none transition-all"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">الدفعة</label>
              <input
                type="text"
                value={editRowData?.batch || ""}
                onChange={(e) => setEditRowData({ ...editRowData, batch: e.target.value })}
                className="w-full p-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-300 outline-none transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">المساق</label>
              <input
                type="text"
                value={editRowData?.specialty || ""}
                onChange={(e) => setEditRowData({ ...editRowData, specialty: e.target.value })}
                className="w-full p-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-300 outline-none transition-all"
              />
            </div>
          </div>
          {editRowModal?.year === 2025 && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                الرسوم الكلية
              </label>
              <input
                type="number"
                value={editRowData?.fees || 0}
                onChange={(e) => setEditRowData({ ...editRowData, fees: e.target.value })}
                className="w-full p-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-300 outline-none transition-all"
              />
            </div>
          )}
          {editRowModal?.year === 2026 && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                المتبقي من 2025 (المدور)
              </label>
              <input
                type="number"
                value={editRowData?.prevDue || 0}
                onChange={(e) => setEditRowData({ ...editRowData, prevDue: e.target.value })}
                className="w-full p-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-300 outline-none transition-all"
              />
            </div>
          )}
          <div className="flex justify-end gap-3 pt-3 border-t border-slate-200 mt-4">
            <button
              type="button"
              onClick={() => setEditRowModal(null)}
              className="px-4 py-2.5 bg-slate-100/80 text-slate-700 rounded-xl hover:bg-slate-200 transition-all"
            >
              إلغاء
            </button>
            <button
              type="submit"
              className="px-4 py-2.5 bg-gradient-to-r from-amber-600 to-amber-700 text-white rounded-xl font-bold hover:scale-105 transition-all shadow-md"
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
        <form onSubmit={addCustomColumn} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">اسم العمود</label>
            <input
              type="text"
              required
              value={newColName}
              onChange={(e) => setNewColName(e.target.value)}
              className="w-full p-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-300 outline-none transition-all"
              autoFocus
              placeholder="مثل: حالة الاعتماد، الخصم..."
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">نوع العمود</label>
            <select
              value={newColType}
              onChange={(e: any) => setNewColType(e.target.value)}
              className="w-full p-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-300 outline-none transition-all"
            >
              <option value="text">نص أو رقم حر (إدخال يدوي)</option>
              <option value="select">قائمة منسدلة (خيارات محددة)</option>
              <option value="formula">معادلة رياضية دالة (حساب تلقائي)</option>
            </select>
          </div>

          {newColType === "select" && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                الخيارات (افصل بينها بفاصلة)
              </label>
              <input
                type="text"
                required
                value={newColOptions}
                onChange={(e) => setNewColOptions(e.target.value)}
                className="w-full p-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-300 outline-none transition-all"
                placeholder="مثال: معتمد, غير معتمد, قيد المراجعة"
              />
            </div>
          )}

          {newColType === "formula" && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                المعادلة (استخدم المتغيرات الإنجليزية)
              </label>
              <input
                type="text"
                required
                value={newColFormula}
                onChange={(e) => setNewColFormula(e.target.value)}
                className="w-full p-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-300 outline-none transition-all text-left"
                dir="ltr"
                placeholder="مثال: fees - totalPaid"
              />
            </div>
          )}

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-200 mt-4">
            <button
              type="button"
              onClick={() => setNewColModal(false)}
              className="px-4 py-2.5 bg-slate-100/80 text-slate-700 rounded-xl hover:bg-slate-200 transition-all"
            >
              إلغاء
            </button>
            <button
              type="submit"
              className="px-4 py-2.5 bg-gradient-to-r from-amber-600 to-amber-700 text-white rounded-xl font-bold hover:scale-105 transition-all shadow-md"
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
        <form onSubmit={addNewRow2026} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">اسم المتدرب *</label>
            <input
              type="text"
              required
              value={newRowData2026.name}
              onChange={(e) => setNewRowData2026({ ...newRowData2026, name: e.target.value })}
              className="w-full p-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-300 outline-none transition-all"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">الدفعة</label>
              <input
                type="text"
                value={newRowData2026.batch}
                onChange={(e) => setNewRowData2026({ ...newRowData2026, batch: e.target.value })}
                className="w-full p-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-300 outline-none transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">المساق</label>
              <input
                type="text"
                value={newRowData2026.specialty}
                onChange={(e) =>
                  setNewRowData2026({ ...newRowData2026, specialty: e.target.value })
                }
                className="w-full p-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-300 outline-none transition-all"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                الرسوم الكلية
              </label>
              <input
                type="number"
                value={newRowData2026.fees}
                onChange={(e) =>
                  setNewRowData2026({ ...newRowData2026, fees: Number(e.target.value) })
                }
                className="w-full p-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-300 outline-none transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                المتبقي من 2025
              </label>
              <input
                type="number"
                value={newRowData2026.prevDue}
                onChange={(e) =>
                  setNewRowData2026({ ...newRowData2026, prevDue: Number(e.target.value) })
                }
                className="w-full p-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-300 outline-none transition-all"
              />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-3 border-t border-slate-200 mt-4">
            <button
              type="button"
              onClick={() => setNewRowModal2026(false)}
              className="px-4 py-2.5 bg-slate-100/80 text-slate-700 rounded-xl hover:bg-slate-200 transition-all"
            >
              إلغاء
            </button>
            <button
              type="submit"
              className="px-4 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl font-bold hover:scale-105 transition-all shadow-md"
            >
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
        <form onSubmit={addNewPayment} className="space-y-4">
          <div className="relative">
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">اسم المتدرب *</label>
            <input
              type="text"
              required
              placeholder="ابحث عن الاسم"
              value={newStudentName}
              onChange={(e) => handleNameChange(e.target.value)}
              onFocus={() => newStudentName.length > 0 && setShowSuggestions(true)}
              className="w-full p-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-300 outline-none transition-all"
            />
            {showSuggestions && nameSuggestions.length > 0 && (
              <div className="absolute top-full right-0 left-0 bg-white/95 backdrop-blur-sm border border-slate-200 rounded-xl shadow-xl z-50 max-h-40 overflow-y-auto mt-1">
                {nameSuggestions.map((n, idx) => (
                  <div
                    key={idx}
                    onClick={() => {
                      setNewStudentName(n);
                      setShowSuggestions(false);
                    }}
                    className="p-2.5 text-sm hover:bg-purple-100/60 cursor-pointer text-slate-800 transition-colors"
                  >
                    {n}
                  </div>
                ))}
              </div>
            )}
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              المبلغ المالي *
            </label>
            <input
              type="number"
              required
              value={newStudentAmount}
              onChange={(e) => setNewStudentAmount(e.target.value)}
              className="w-full p-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-300 outline-none transition-all"
              min="0"
              step="0.01"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              الشهر المستهدف *
            </label>
            <select
              required
              value={newStudentMonth}
              onChange={(e) => setNewStudentMonth(e.target.value)}
              className="w-full p-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-300 outline-none transition-all"
            >
              <option value="">-- اختر الشهر --</option>
              {MONTHS_2026.map((m) => (
                <option key={m} value={m}>
                  {m.trim()}
                </option>
              ))}
            </select>
          </div>
          <div className="flex justify-end gap-3 pt-3 border-t border-slate-200 mt-4">
            <button
              type="button"
              onClick={() => setNewPaymentModal(false)}
              className="px-4 py-2.5 bg-slate-100/80 text-slate-700 rounded-xl hover:bg-slate-200 transition-all"
            >
              إلغاء
            </button>
            <button
              type="submit"
              className="px-4 py-2.5 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-xl font-bold hover:scale-105 transition-all shadow-md"
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
            <div className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 border border-emerald-200 rounded-xl p-4 text-slate-800">
              <p className="flex items-center gap-2">
                <span className="font-bold">المتدرب:</span>
                <span className="text-emerald-800">{paymentModal.row.name}</span>
              </p>
              <p className="flex items-center gap-2 mt-1">
                <span className="font-bold">شهر:</span>
                <span className="text-amber-700">{paymentModal.month}</span>
              </p>
            </div>
            <form onSubmit={addPayment} className="space-y-4 mt-2">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  المبلغ المدفوع *
                </label>
                <input
                  type="number"
                  required
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  className="w-full p-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-300 outline-none transition-all"
                  autoFocus
                  min="0"
                  step="0.01"
                />
              </div>
              <div className="flex justify-end gap-3 pt-3 border-t border-slate-200 mt-4">
                <button
                  type="button"
                  onClick={() => setPaymentModal(null)}
                  className="px-4 py-2.5 bg-slate-100/80 text-slate-700 rounded-xl hover:bg-slate-200 transition-all"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white rounded-xl font-bold hover:scale-105 transition-all shadow-md"
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
            <div className="bg-gradient-to-br from-blue-50 to-blue-100/50 border border-blue-200 rounded-xl p-4 text-slate-800">
              <p className="font-bold text-blue-800">{editPaymentModal.row.name}</p>
              <p className="text-sm text-slate-600 mt-1">بيان شهر: {editPaymentModal.month}</p>
            </div>
            <form onSubmit={editPayment} className="space-y-4 mt-2">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  المبلغ المعدل *
                </label>
                <input
                  type="number"
                  required
                  value={editAmount}
                  onChange={(e) => setEditAmount(e.target.value)}
                  className="w-full p-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-300 outline-none transition-all"
                  min="0"
                  step="0.01"
                />
              </div>
              <div className="flex justify-end gap-3 pt-3 border-t border-slate-200 mt-4">
                <button
                  type="button"
                  onClick={() => setEditPaymentModal(null)}
                  className="px-4 py-2.5 bg-slate-100/80 text-slate-700 rounded-xl hover:bg-slate-200 transition-all"
                >
                  إلغاء
                </button>
                <button
                  type="button"
                  onClick={() => deletePayment(editPaymentModal.row, editPaymentModal.month)}
                  className="px-4 py-2.5 bg-rose-50/80 text-rose-600 rounded-xl hover:bg-rose-100 transition-all flex items-center gap-1.5"
                >
                  <Trash className="w-4 h-4" /> حذف القسط
                </button>
                <button
                  type="submit"
                  className="px-4 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl font-bold hover:scale-105 transition-all shadow-md"
                >
                  حفظ التعديل
                </button>
              </div>
            </form>
          </>
        )}
      </Modal>
    </div>
  );
}
