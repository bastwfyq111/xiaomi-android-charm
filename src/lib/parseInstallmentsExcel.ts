import * as XLSX from "xlsx";
import type { Installment } from "./store";

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

const cleanNumber = (value: unknown): number => {
  const normalized = String(value ?? "").replace(/[^0-9.-]/g, "");
  return normalized && Number.isFinite(Number(normalized)) ? Number(normalized) : 0;
};

// تطبيع النص العربي: توحيد أشكال الألف والتاء المربوطة/الياء، وإزالة كل المسافات،
// وتوحيد حالة الأحرف — لضمان مطابقة أسماء الأعمدة حتى مع اختلافات الكتابة الشائعة.
const normalizeArabic = (value: unknown): string =>
  String(value ?? "")
    .replace(/[أإآا]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/\s+/g, "")
    .toLowerCase()
    .trim();

// إزالة الأرقام (السنة) من اسم الشهر لمطابقة مثل «نوفمبر2025» مع «نوفمبر»
const monthCore = (value: unknown): string =>
  normalizeArabic(value).replace(/[0-9\u0660-\u0669]/g, "");

// مطابقة أسماء الأشهر: تامة أولاً، ثم بتجاهل السنة الملحقة
const findKeyExact = (keys: string[], target: string, fallback: string): string => {
  const normTarget = normalizeArabic(target);
  const exact = keys.find((key) => normalizeArabic(key) === normTarget);
  if (exact) return exact;
  const core = monthCore(target);
  return (core && keys.find((key) => monthCore(key) === core)) || fallback;
};

// مطابقة جزئية (بعد التطبيع) — تُستخدم للحقول الوصفية مثل "اسم المتدرب"
const findKeyContains = (
  keys: string[],
  part: string,
  fallback: string,
): string => {
  const normPart = normalizeArabic(part);
  return keys.find((key) => normalizeArabic(key).includes(normPart)) ?? fallback;
};

// أول مطابقة ناجحة من عدة بدائل
const findKeyAny = (keys: string[], parts: string[], fallback: string): string => {
  for (const part of parts) {
    const found = findKeyContains(keys, part, "");
    if (found) return found;
  }
  return fallback;
};

export function parseInstallmentsExcel(buffer: ArrayBuffer, year: 2025 | 2026): Installment[] {
  const workbook = XLSX.read(new Uint8Array(buffer), { type: "array" });
  const worksheet = workbook.Sheets[workbook.SheetNames[0]];
  if (!worksheet) return [];

  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, {
    defval: "",
  });
  const months = year === 2025 ? MONTHS_2025 : MONTHS_2026;
  const keys = rows.length ? Object.keys(rows[0]) : [];

  const monthKeys = months.map((month) => findKeyExact(keys, month, month));

  const nameKey = findKeyAny(keys, ["اسم المتدرب", "اسم الطالب", "الاسم", "اسم"], "name");
  const batchKey = findKeyAny(keys, ["رقم الدفعة", "الدفعة"], "batch");
  const specialtyKey = findKeyAny(keys, ["المساق", "التخصص"], "specialty");
  const feesKey = findKeyAny(keys, ["مبلغ الرسوم", "الرسوم"], "fees");
  const prevDueKey = findKeyAny(
    keys,
    ["المتبقي عليهم من العام 2025", "المتبقي من العام", "متبقي سابق"],
    "prevDue",
  );
  const remainingKey = findKeyExact(keys, "المتبقي", "remaining");
  const notesKey = findKeyContains(keys, "ملاحظات", "notes");
  const phoneKey = findKeyAny(keys, ["رقم الهاتف", "الهاتف", "الجوال"], "phone");


  return rows.flatMap((row) => {
    const name = String(row[nameKey] ?? "").trim();
    if (!name) return [];

    const payments: Record<string, number> = {};
    let totalPaid = 0;
    months.forEach((month, index) => {
      const amount = cleanNumber(row[monthKeys[index]]);
      payments[month] = amount;
      totalPaid += amount;
    });

    const fees = cleanNumber(row[feesKey]);
    const prevDue = cleanNumber(row[prevDueKey]);
    const importedTotal = row["الإجمالي"] ? cleanNumber(row["الإجمالي"]) : totalPaid;

    return [
      {
        name,
        batch: String(row[batchKey] ?? "").trim(),
        specialty: String(row[specialtyKey] ?? "").trim(),
        fees,
        prevDue,
        totalPaid: importedTotal,
        remaining: cleanNumber(row[remainingKey]),
        notes: String(row[notesKey] ?? "").trim(),
        phone: String(row[phoneKey] ?? "").trim(),
        payments,
        customData: {},
      },
    ];
  });
}