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

const norm = (value: unknown) => String(value ?? "").replace(/\s+/g, " ").trim();
const normalizeDigits = (value: string) =>
  value.replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)));

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
    /(?:^|[^0-9])20[0-9]{2}[\/\-.]([0-9]{1,2})(?:[\/\-.][0-9]{1,2})?(?:$|[^0-9])/,
  );
  if (yearFirst) {
    const month = Number(yearFirst[1]);
    if (month >= 1 && month <= 12) return month;
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
    const monthId = parseMonthId(lookup[norm(key).toLowerCase()]);
    if (monthId) return monthId;
  }
  return null;
};

const sumColumns = (row: Record<string, unknown>, columns: string[]) =>
  columns.reduce((total, column) => {
    const number = Number(row[column]);
    return total + (Number.isNaN(number) ? 0 : number);
  }, 0);

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

export function parseUsageExcel(buffer: ArrayBuffer, importMonthId: number) {
  const workbook = XLSX.read(new Uint8Array(buffer), { type: "array", cellDates: true });
  const sheetName = workbook.SheetNames.includes("بيانات")
    ? "بيانات"
    : workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  if (!worksheet) return [];

  const matrix = XLSX.utils.sheet_to_json<unknown[]>(worksheet, {
    header: 1,
    defval: "",
    blankrows: false,
  });
  const headerRowIndex = matrix.findIndex((cells) => {
    const normalizedCells = cells.map((cell) => norm(cell).toLowerCase());
    const knownHeaders = normalizedCells.filter(
      (cell) => cell === "monthid" || allCols.some((column) => norm(column).toLowerCase() === cell),
    );
    return knownHeaders.length >= 2;
  });
  const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, {
    defval: "",
    blankrows: false,
    ...(headerRowIndex >= 0 ? { range: headerRowIndex } : {}),
  });
  let activeMonthId = importMonthId;
  const imported: Record<string, unknown>[] = [];

  json.forEach((record) => {
    const lookup: Record<string, unknown> = {};
    Object.keys(record).forEach((key) => {
      lookup[norm(key).toLowerCase()] = record[key];
    });

    const values = Object.values(lookup).filter((value) => norm(value) !== "");
    const firstText = norm(values[0]).toLowerCase();
    const namedMonthValues = values.filter(hasNamedMonth);
    const sectionMonthId =
      values.length <= 2 && namedMonthValues.length > 0 && namedMonthValues.length === values.length
        ? parseMonthId(namedMonthValues[0])
        : null;
    if (sectionMonthId) {
      activeMonthId = sectionMonthId;
      return;
    }

    const isSummaryRow =
      firstText.startsWith("إجمالي") ||
      firstText.startsWith("الاجمالي") ||
      firstText.startsWith("total");
    const headerMatches = values.filter((value) =>
      allCols.some((column) => norm(column) === norm(value)),
    ).length;
    if (isSummaryRow || headerMatches >= 2) return;

    const hasData = allCols.some((column) => norm(lookup[norm(column).toLowerCase()]) !== "");
    if (!hasData) return;

    const row: Record<string, unknown> = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      monthId: monthIdFromLookup(lookup) ?? activeMonthId,
    };
    allCols.forEach((column) => {
      const value = lookup[norm(column).toLowerCase()];
      row[column] =
        value === "" || value === undefined || value === null
          ? ""
          : Number.isNaN(Number(value))
            ? value
            : Number(value);
    });
    imported.push(recomputeRow(row));
  });

  return imported;
}
