export type ReportPeriodMode = "month" | "quarter" | "halfYear" | "year";

export type ReportPeriodSelection = {
  mode: ReportPeriodMode;
  year: number;
  month?: number;
  quarter?: number;
  halfYear?: number;
};

export const REPORT_MONTH_NAMES = [
  "يناير",
  "فبراير",
  "مارس",
  "أبريل",
  "مايو",
  "يونيو",
  "يوليو",
  "أغسطس",
  "سبتمبر",
  "أكتوبر",
  "نوفمبر",
  "ديسمبر",
] as const;

export const REPORT_QUARTER_NAMES = ["الأول", "الثاني", "الثالث", "الرابع"] as const;
export const REPORT_HALF_YEAR_NAMES = ["الأول", "الثاني"] as const;

export function getPeriodRange(selection: ReportPeriodSelection) {
  const month = Math.min(12, Math.max(1, selection.month || 1));
  const quarter = Math.min(4, Math.max(1, selection.quarter || 1));
  const halfYear = Math.min(2, Math.max(1, selection.halfYear || 1));

  switch (selection.mode) {
    case "month":
      return { startMonth: month, endMonth: month };
    case "quarter":
      return { startMonth: (quarter - 1) * 3 + 1, endMonth: quarter * 3 };
    case "halfYear":
      return { startMonth: (halfYear - 1) * 6 + 1, endMonth: halfYear * 6 };
    case "year":
      return { startMonth: 1, endMonth: 12 };
  }
}

export function getReportPeriodLabel(selection: ReportPeriodSelection) {
  const { startMonth, endMonth } = getPeriodRange(selection);
  const year = selection.year;

  switch (selection.mode) {
    case "month":
      return `شهر ${REPORT_MONTH_NAMES[startMonth - 1]} ${year}م`;
    case "quarter":
      return `الربع ${REPORT_QUARTER_NAMES[(selection.quarter || 1) - 1]} (${REPORT_MONTH_NAMES[startMonth - 1]} - ${REPORT_MONTH_NAMES[endMonth - 1]}) ${year}م`;
    case "halfYear":
      return `النصف ${REPORT_HALF_YEAR_NAMES[(selection.halfYear || 1) - 1]} (${REPORT_MONTH_NAMES[startMonth - 1]} - ${REPORT_MONTH_NAMES[endMonth - 1]}) ${year}م`;
    case "year":
      return `السنة المالية ${year}م (يناير - ديسمبر)`;
  }
}

export function getReportMovementLabel(selection: ReportPeriodSelection) {
  switch (selection.mode) {
    case "month":
      return `حركة شهر ${REPORT_MONTH_NAMES[(selection.month || 1) - 1]}`;
    case "quarter":
      return `حركة الربع ${REPORT_QUARTER_NAMES[(selection.quarter || 1) - 1]}`;
    case "halfYear":
      return `حركة النصف ${REPORT_HALF_YEAR_NAMES[(selection.halfYear || 1) - 1]}`;
    case "year":
      return `حركة السنة المالية ${selection.year}`;
  }
}
