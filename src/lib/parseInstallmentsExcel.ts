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

// مطابقة تامة (بعد التطبيع) — تُستخدم لأسماء الأشهر
const findKeyExact = (keys: string[], target: string, fallback: string): string => {
  const normTarget = normalizeArabic(target);
  return keys.find((key) => normalizeArabic(key) === normTarget) ?? fallback;
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

  const nameKey = findKeyContains(keys, "اسم المتدرب", "name");
  const batchKey = findKeyContains(keys, "رقم الدفعة", "batch");
  const specialtyKey = findKeyContains(keys, "المساق", "specialty");
  const feesKey = findKeyContains(keys, "مبلغ الرسوم", "fees");
  const prevDueKey = findKeyContains(keys, "المتبقي عليهم من العام 2025", "prevDue");
  const remainingKey = findKeyExact(keys, "المتبقي", "remaining");
  const notesKey = findKeyContains(keys, "ملاحظات", "notes");
  const phoneKey = findKeyContains(keys, "رقم الهاتف", "phone");

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