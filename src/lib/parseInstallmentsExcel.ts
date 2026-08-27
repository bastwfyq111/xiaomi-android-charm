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

const findKey = (keys: string[], predicate: (key: string) => boolean, fallback: string) =>
  keys.find(predicate) ?? fallback;

export function parseInstallmentsExcel(buffer: ArrayBuffer, year: 2025 | 2026): Installment[] {
  const workbook = XLSX.read(new Uint8Array(buffer), { type: "array" });
  const worksheet = workbook.Sheets[workbook.SheetNames[0]];
  if (!worksheet) return [];

  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, {
    defval: "",
  });
  const months = year === 2025 ? MONTHS_2025 : MONTHS_2026;
  const keys = rows.length ? Object.keys(rows[0]) : [];
  const monthKeys = months.map((month) => {
    const cleanTarget = month.trim();
    return findKey(keys, (key) => key.trim() === cleanTarget || key === month, month);
  });
  const nameKey = findKey(keys, (key) => key.includes("اسم المتدرب"), "name");
  const batchKey = findKey(keys, (key) => key.includes("رقم الدفعة"), "batch");
  const specialtyKey = findKey(keys, (key) => key.includes("المساق"), "specialty");
  const feesKey = findKey(keys, (key) => key.includes("مبلغ الرسوم"), "fees");
  const prevDueKey = findKey(
    keys,
    (key) => key.includes("المتبقي عليهم من العام 2025"),
    "prevDue",
  );
  const remainingKey = findKey(keys, (key) => key.trim() === "المتبقي", "remaining");
  const notesKey = findKey(keys, (key) => key.includes("ملاحظات"), "notes");
  const phoneKey = findKey(keys, (key) => key.includes("رقم الهاتف"), "phone");

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
