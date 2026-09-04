import * as XLSX from "xlsx";

const mainHeaders = ["رقم الاستمارة", "كشف التسوية", "التاريخ", "البيان"];
const dataColumnsOrder = [
  "اجمالي عام الاستخدامات",
  "اجمالي الباب الاول",
  "الفصل الاول_باب1",
  "المرتبات الاساسية",
  "اجور تعاقدية",
  "اجور عمل اضافي",
  "مكافات",
  "طبيعة عمل",
  "بدل ريف",
  "بدل سكن",
  "بدل تحديث",
  "الفصل الثاني_باب1",
  "ح/حكومة",
  "اصابة عمل",
  "اجمالي الباب الثاني",
  "الفصل الاول_باب2",
  "مياه",
  "انارة",
  "ادوات كتابية",
  "نشر واعلان",
  "اتصالات",
  "مؤتمرات واحتفالات",
  "نفقات النظافة",
  "اخرى",
  "نقل مهام",
  "انتقالات داخلية",
  "ايجار مباني",
  "ادوية ومستلزمات طبية",
  "اغذية وملبوسات",
  "اخرى_2",
  "الفصل الثاني_باب2",
  "صيانة مباني",
  "وقود وزيوت",
  "قطع غيار وصيانة وسائل النقل",
  "قطع غيار وصيانة الالات والمعدات والاثاث",
  "اجمالي الباب الرابع",
  "مركز صحي قحزة",
  "وحدة الغسيل الكلوي",
  "مشروع دعم الكلى",
  "الصالة والمطبخ",
  "مركز صحي",
  "الامانات",
];
const allCols = [...mainHeaders, ...dataColumnsOrder];
const numericColumns = new Set(dataColumnsOrder);

const MONTH_ALIASES = [
  ["يناير", "jan", "january"],
  ["فبراير", "فبر", "feb", "february"],
  ["مارس", "mar", "march"],
  ["أبريل", "ابريل", "apr", "april"],
  ["مايو", "may"],
  ["يونيو", "يونية", "jun", "june"],
  ["يوليو", "july", "jul"],
  ["أغسطس", "اغسطس", "aug", "august"],
  ["سبتمبر", "sep", "september"],
  ["أكتوبر", "اكتوبر", "oct", "october"],
  ["نوفمبر", "nov", "november"],
  ["ديسمبر", "dec", "december"],
];
const IMPORT_MONTH_KEYS = [
  "monthid",
  "month id",
  "month_id",
  "month",
  "monthname",
  "الشهر",
  "شهر",
  "اسم الشهر",
  "رقم الشهر",
  "الفترة",
];
const IMPORT_DATE_KEYS = ["التاريخ", "date", "تاريخ"];

const norm = (value: unknown) =>
  String(value ?? "")
    .replace(/\s+/g, " ")
    .trim();
const normalizeDigits = (value: string) =>
  value
    .replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)))
    .replace(/[۰-۹]/g, (digit) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit)));

/**
 * Excel files produced by different versions of the application may contain
 * harmless differences in Arabic hamzas, separators, or hidden characters.
 * Keeping one canonical form lets the importer accept those files without
 * changing the names used by the table itself.
 */
const headerKey = (value: unknown) =>
  normalizeDigits(norm(value))
    .toLowerCase()
    .replace(/[\u064B-\u065F\u0670]/g, "")
    .replace(/[إأآٱ]/g, "ا")
    .replace(/[ى]/g, "ي")
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .replace(/[\s_\-./\\:()]+/g, "");

const emptyCell = (value: unknown) => {
  const text = norm(value);
  return !text || ["-", "—", "–"].includes(text);
};

const parseNumber = (value: unknown): number | null => {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value !== "string") return null;

  let text = normalizeDigits(value).trim();
  if (!text || ["-", "—", "–"].includes(text)) return null;
  const isNegative = text.startsWith("(") && text.endsWith(")");
  text = text
    .replace(/[٬،,\s]/g, "")
    .replace(/٫/g, ".")
    .replace(/^\((.*)\)$/, "$1");
  if (!/^[+-]?\d+(?:\.\d+)?$/.test(text)) return null;
  const number = Number(text);
  return Number.isFinite(number) ? (isNegative ? -number : number) : null;
};

const isoDate = (year: number, month: number, day: number) => {
  if (year < 1 || month < 1 || month > 12 || day < 1 || day > 31) return null;
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }
  return `${year.toString().padStart(4, "0")}-${month.toString().padStart(2, "0")}-${day
    .toString()
    .padStart(2, "0")}`;
};

const dateToInputValue = (value: unknown): string => {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return isoDate(value.getFullYear(), value.getMonth() + 1, value.getDate()) || "";
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (parsed) return isoDate(parsed.y, parsed.m, parsed.d) || "";
  }

  const text = normalizeDigits(norm(value));
  if (!text) return "";

  const normalized = text.replace(/[/.]/g, "-");
  let match = normalized.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:[T\s].*)?$/);
  if (match) return isoDate(Number(match[1]), Number(match[2]), Number(match[3])) || text;

  match = normalized.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  if (match) {
    const first = Number(match[1]);
    const second = Number(match[2]);
    const year = Number(match[3]);
    // Prefer day/month, while still accepting the unambiguous US month/day form.
    return isoDate(year, second, first) || isoDate(year, first, second) || text;
  }

  return text;
};

const parseMonthId = (value: unknown): number | null => {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value.getMonth() + 1;
  const text = normalizeDigits(norm(value)).toLowerCase();
  if (!text) return null;

  const aliasIndex = MONTH_ALIASES.findIndex((aliases) =>
    aliases.some(
      (alias) =>
        text === alias ||
        text.startsWith(`${alias} `) ||
        text.includes(`شهر ${alias}`) ||
        text.includes(`month ${alias}`),
    ),
  );
  if (aliasIndex >= 0) return aliasIndex + 1;

  const monthLabel = text.match(/(?:شهر|month)\s*([0-9]{1,2})/);
  if (monthLabel) {
    const month = Number(monthLabel[1]);
    if (month >= 1 && month <= 12) return month;
  }

  const yearFirst = text.match(
    /(?:^|[^0-9])20[0-9]{2}[-./]([0-9]{1,2})(?:[-./][0-9]{1,2})?(?:$|[^0-9])/,
  );
  if (yearFirst) {
    const month = Number(yearFirst[1]);
    if (month >= 1 && month <= 12) return month;
  }

  const dayFirst = text.match(/^(\d{1,2})[-./](\d{1,2})[-./]20\d{2}(?:\s|$)/);
  if (dayFirst) {
    const first = Number(dayFirst[1]);
    const second = Number(dayFirst[2]);
    if (second >= 1 && second <= 12) return second;
    if (first >= 1 && first <= 12) return first;
  }

  const numeric = Number(text.replace(/,/g, ""));
  return Number.isInteger(numeric) && numeric >= 1 && numeric <= 12 ? numeric : null;
};

const hasNamedMonth = (value: unknown) => {
  const text = normalizeDigits(norm(value)).toLowerCase();
  return MONTH_ALIASES.some((aliases) =>
    aliases.some(
      (alias) =>
        text === alias ||
        text.startsWith(`${alias} `) ||
        text.includes(`شهر ${alias}`) ||
        text.includes(`month ${alias}`),
    ),
  );
};

const monthIdFromLookup = (lookup: Record<string, unknown>) => {
  for (const key of [...IMPORT_MONTH_KEYS, ...IMPORT_DATE_KEYS]) {
    const monthId = parseMonthId(lookup[headerKey(key)]);
    if (monthId) return monthId;
  }
  return null;
};

const sumColumns = (row: Record<string, unknown>, columns: string[]) =>
  columns.reduce((total, column) => total + (parseNumber(row[column]) || 0), 0);

const recomputeRow = (row: Record<string, unknown>) => {
  const nextRow = { ...row };
  const fasl1Bab1 = sumColumns(nextRow, [
    "المرتبات الاساسية",
    "اجور تعاقدية",
    "اجور عمل اضافي",
    "مكافات",
    "طبيعة عمل",
    "بدل ريف",
    "بدل سكن",
    "بدل تحديث",
  ]);
  const fasl2Bab1 = sumColumns(nextRow, ["ح/حكومة", "اصابة عمل"]);
  nextRow["الفصل الاول_باب1"] = fasl1Bab1;
  nextRow["الفصل الثاني_باب1"] = fasl2Bab1;
  nextRow["اجمالي الباب الاول"] = fasl1Bab1 + fasl2Bab1;

  const fasl1Bab2 = sumColumns(nextRow, [
    "مياه",
    "انارة",
    "ادوات كتابية",
    "نشر واعلان",
    "اتصالات",
    "مؤتمرات واحتفالات",
    "نفقات النظافة",
    "اخرى",
    "نقل مهام",
    "انتقالات داخلية",
    "ايجار مباني",
    "ادوية ومستلزمات طبية",
    "اغذية وملبوسات",
    "اخرى_2",
  ]);
  const fasl2Bab2 = sumColumns(nextRow, [
    "صيانة مباني",
    "وقود وزيوت",
    "قطع غيار وصيانة وسائل النقل",
    "قطع غيار وصيانة الالات والمعدات والاثاث",
  ]);
  nextRow["الفصل الاول_باب2"] = fasl1Bab2;
  nextRow["الفصل الثاني_باب2"] = fasl2Bab2;
  nextRow["اجمالي الباب الثاني"] = fasl1Bab2 + fasl2Bab2;
  nextRow["اجمالي الباب الرابع"] = sumColumns(nextRow, [
    "مركز صحي قحزة",
    "وحدة الغسيل الكلوي",
    "مشروع دعم الكلى",
    "الصالة والمطبخ",
    "مركز صحي",
    "الامانات",
  ]);
  nextRow["اجمالي عام الاستخدامات"] =
    Number(nextRow["اجمالي الباب الاول"] || 0) +
    Number(nextRow["اجمالي الباب الثاني"] || 0) +
    Number(nextRow["اجمالي الباب الرابع"] || 0);
  return nextRow;
};

const headerTargets = new Map<string, string>();
allCols.forEach((column) => headerTargets.set(headerKey(column), column));
[
  ["formno", "رقم الاستمارة"],
  ["formnumber", "رقم الاستمارة"],
  ["رقم الاستماره", "رقم الاستمارة"],
  ["الاستمارة", "رقم الاستمارة"],
  ["settlement", "كشف التسوية"],
  ["التسوية", "كشف التسوية"],
  ["description", "البيان"],
  ["statement", "البيان"],
  ["الوصف", "البيان"],
  ["date", "التاريخ"],
  ["monthid", "monthId"],
  ["monthname", "monthId"],
  ["month", "monthId"],
  ["الشهر", "monthId"],
  ["شهر", "monthId"],
  ["اسم الشهر", "monthId"],
  ["رقم الشهر", "monthId"],
  ["الفترة", "monthId"],
  ["الرواتب", "المرتبات الاساسية"],
  ["المرتبات", "المرتبات الاساسية"],
  ["الاجور التعاقدية", "اجور تعاقدية"],
  ["العمل الاضافي", "اجور عمل اضافي"],
  ["المكافات", "مكافات"],
  ["الماء", "مياه"],
  ["الكهرباء", "انارة"],
  ["الانارة", "انارة"],
  ["القرطاسية", "ادوات كتابية"],
  ["الاتصالات", "اتصالات"],
  ["النظافة", "نفقات النظافة"],
  ["الايجار", "ايجار مباني"],
  ["الادوية", "ادوية ومستلزمات طبية"],
  ["الاغذية", "اغذية وملبوسات"],
  ["الوقود", "وقود وزيوت"],
  ["الامانات", "الامانات"],
].forEach(([alias, target]) => headerTargets.set(headerKey(alias), target));

/**
 * Column names differ between the many spreadsheets the office produces.
 * A hint is enough: exact key, containment, or a high bigram similarity all
 * resolve to the canonical column used by the table.
 */
const bigrams = (value: string) => {
  const set = new Set<string>();
  for (let index = 0; index < value.length - 1; index += 1) set.add(value.slice(index, index + 2));
  return set;
};

const similarity = (a: string, b: string) => {
  if (!a || !b) return 0;
  if (a === b) return 1;
  const first = bigrams(a);
  const second = bigrams(b);
  if (!first.size || !second.size) return 0;
  let shared = 0;
  first.forEach((gram) => {
    if (second.has(gram)) shared += 1;
  });
  return (2 * shared) / (first.size + second.size);
};

const targetKeys = Array.from(headerTargets.entries());

const resolveHeader = (rawHeader: unknown): string | null => {
  const key = headerKey(rawHeader);
  if (!key) return null;
  const exact = headerTargets.get(key);
  if (exact) return exact;

  let best: { target: string; score: number } | null = null;
  for (const [candidateKey, target] of targetKeys) {
    let score = 0;
    if (candidateKey.length >= 3 && key.includes(candidateKey)) {
      score = 0.9 + candidateKey.length / (key.length * 100);
    } else if (key.length >= 3 && candidateKey.includes(key)) {
      score = 0.85 + key.length / (candidateKey.length * 100);
    } else {
      score = similarity(key, candidateKey);
    }
    if (score >= 0.62 && (!best || score > best.score)) best = { target, score };
  }
  return best ? best.target : null;
};

const importedValue = (column: string, value: unknown) => {
  if (emptyCell(value)) return "";
  if (column === "التاريخ") return dateToInputValue(value);
  if (numericColumns.has(column)) return parseNumber(value) ?? norm(value);
  return typeof value === "string" ? norm(value) : value;
};

const headerMapFromRows = (rows: unknown[][], index: number) => {
  const map = new Map<number, string>();
  const used = new Set<string>();
  const width = Math.max(...[index - 1, index, index + 1].map((i) => rows[i]?.length ?? 0), 0);
  for (let column = 0; column < width; column += 1) {
    const candidates = [rows[index]?.[column], rows[index + 1]?.[column], rows[index - 1]?.[column]];
    for (const candidate of candidates) {
      const target = resolveHeader(candidate);
      if (target && !used.has(target)) {
        used.add(target);
        map.set(column, target);
        break;
      }
    }
  }
  return map;
};

export function parseUsageExcel(buffer: ArrayBuffer, importMonthId: number) {
  const workbook = XLSX.read(new Uint8Array(buffer), { type: "array", cellDates: true });
  const sheetName = workbook.SheetNames.includes("بيانات") ? "بيانات" : workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  if (!worksheet) return [];

  const matrix = XLSX.utils.sheet_to_json<unknown[]>(worksheet, {
    header: 1,
    defval: "",
    blankrows: false,
  });

  let headerRowIndex = -1;
  let headerMap = new Map<number, string>();
  for (let index = 0; index < Math.min(matrix.length, 30); index += 1) {
    const map = headerMapFromRows(matrix, index);
    if (map.size > headerMap.size) {
      headerMap = map;
      headerRowIndex = index;
    }
  }
  if (headerRowIndex < 0 || headerMap.size < 2) return [];

  let activeMonthId =
    Number.isInteger(importMonthId) && importMonthId >= 1 && importMonthId <= 12
      ? importMonthId
      : 1;
  const imported: Record<string, unknown>[] = [];

  for (let index = headerRowIndex + 1; index < matrix.length; index += 1) {
    const cells = matrix[index] ?? [];
    const lookup: Record<string, unknown> = {};
    headerMap.forEach((target, column) => {
      lookup[headerKey(target)] = cells[column];
    });

    const filled = cells.filter((cell) => !emptyCell(cell));
    if (!filled.length) continue;

    // A lone month name ("نوفمبر 2025") introduces the block of rows below it.
    const namedMonths = filled.filter(hasNamedMonth);
    if (filled.length <= 2 && namedMonths.length === filled.length) {
      const sectionMonthId = parseMonthId(namedMonths[0]);
      if (sectionMonthId) {
        activeMonthId = sectionMonthId;
        continue;
      }
    }

    const firstText = headerKey(filled[0]);
    if (
      firstText.startsWith("اجمالي") ||
      firstText.startsWith("الاجمالي") ||
      firstText.startsWith("total")
    ) {
      continue;
    }
    // Repeated header rows inside the sheet.
    if (filled.filter((cell) => resolveHeader(cell)).length >= 3) continue;

    const hasData = allCols.some((column) => !emptyCell(lookup[headerKey(column)]));
    if (!hasData) continue;

    const rowMonthId = monthIdFromLookup(lookup) ?? activeMonthId;
    const row: Record<string, unknown> = {
      id: `${Date.now()}-${index}-${Math.random().toString(36).slice(2, 8)}`,
      monthId: rowMonthId,
    };
    allCols.forEach((column) => {
      row[column] = importedValue(column, lookup[headerKey(column)]);
    });
    imported.push(recomputeRow(row));
  }

  return imported;
}
