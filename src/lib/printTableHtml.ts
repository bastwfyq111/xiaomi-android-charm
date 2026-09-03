import { fmt } from "./format";
import { formatReportDate } from "@/lib/reportDate";
import { noteRowClass, noteRowCss } from "@/lib/notesColors";
import reportLetterheadUrl from "@/assets/report-letterhead.png";

export type TableCol = { key: string; label: string };

export const REPORT_LETTERHEAD_SRC = reportLetterheadUrl;

export const reportLetterheadHtml = () => `
  <div class="report-letterhead-block" style="display:flex;position:relative;top:0;width:100%;height:34mm;min-height:34mm;max-height:34mm;overflow:hidden;align-items:stretch;justify-content:center;margin:0 auto 5mm;page-break-before:avoid;page-break-after:avoid;break-before:avoid;break-after:avoid;">
    <img class="report-letterhead-image" style="display:block;width:100%;max-width:100%;height:100%;max-height:100%;object-fit:fill;object-position:top;margin:0;" src="${REPORT_LETTERHEAD_SRC}" alt="ترويسة المجلس اليمني للاختصاصات الطبية" />
  </div>
`;

export const reportLetterheadRowHtml = (columnCount: number) => `
  <tr class="report-letterhead-row">
    <th class="report-letterhead-cell" colspan="${Math.max(1, Math.floor(columnCount))}">
      <img class="report-letterhead-image" style="display:block;width:100%;max-width:100%;height:30mm;max-height:30mm;object-fit:fill;object-position:top;margin:0;" src="${REPORT_LETTERHEAD_SRC}" alt="ترويسة المجلس اليمني للاختصاصات الطبية" />
    </th>
  </tr>
`;

export const escapeHtml = (s: any) =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

/**
 * أنماط موحّدة تُستخدم في الطباعة وفي تنزيل PDF وفي واجهة التبويبات
 * تضمن الاحتواء التلقائي وعدم التفاف النصوص وتوسيطها بالكامل (أفقياً وعمودياً).
 */
export const tablePrintStyles = `
  @page {
    size: A4 landscape;
    margin: 6mm;
  }
  
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html { margin: 0; padding: 0; }
  body {
    font-family: 'Cairo', 'Tajawal', Tahoma, Arial, sans-serif;
    padding: 3mm 4mm;
    color: #000 !important;
    direction: rtl;
    margin: 0;
    width: 100%;
    box-sizing: border-box;
    font-weight: 1000;
    font-size: 16px;
    line-height: 1.5;
    background: #fff;
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }
  h1 {
    text-align: center;
    color: #000 !important;
    margin: 0 0 3px;
    font-size: 19px;
    font-weight: 1000;
  }
  .sub {
    text-align: center;
    color: #000 !important;
    margin-bottom: 5px;
    font-size: 14.5px;
    font-weight: 800;
    border-bottom:1px solid #b8860b;
    padding-bottom: 4px;
  }
  
  /* احتواء تلقائي كامل للجدول وتوسيط تام للمحتوى */
  table {
    width: 100%;
    max-width: 100%;
    border-collapse: collapse;
    table-layout: auto !important;
    font-size: clamp(13px, 1.05vw, 13px);
  }
  
  th, td {
    border: 1px solid #000;
    padding: 6px 8px !important;
    text-align: center !important;
    vertical-align: middle !important; /* التوسيط العمودي تماماً بين الجزئين العلوي والسفلي */
    color: #000 !important;
    font-weight: 800 !important;
  line-height: 1.5!important;
    height: auto !important;
    min-height: 50px;
    font-size: clamp(14px, 1.15vw, 14px) !important;
    white-space: nowrap !important; /* منع التفاف النصوص نهائياً في كافة الخلايا */
    width: max-content !important;
    word-break: keep-all !important;
    overflow-wrap: normal !important;
  }

  /* منع التفاف النصوص وتوسيط خلايا الأرقام والتواريخ والأكواد */
  .num,
  .numeric-cell,
  .date-cell,
  .compact-cell,
  .idx {
    white-space: nowrap !important;
    word-break: keep-all !important;
    overflow-wrap: normal !important;
    hyphens: none !important;
    font-family: 'Times New Roman', Times, serif !important;
    text-align: center !important;
    vertical-align: middle !important;
    direction: ltr;
    color: #000 !important;
    -webkit-text-fill-color: #000 !important;
    text-shadow: none !important;
    font-weight: 900 !important;
    line-height: 1.15 !important;
    font-size: clamp(14px, 1.9vw, 14px) !important;
    width: max-content !important;
  }

  .pdf-cell-text {
    display: flex !important;
align-items: center !important;     /* توسيط عمودي للعنصر الداخلي */
    justify-content: center !important; /* توسيط أفقـي للعنصر الداخلي */
    width: 100% !important;
    height: 100% !important;
    text-align: center !important;
    white-space: normal!important;
    word-break: keep-all !important;
    overflow-wrap: normal !important;
  }

  /* ضمان منع التفاف النصوص الطويلة وإبقائها في سطر واحد داخل المساحة المتاحة */
  .text-cell,
  .long-text-cell {
    white-space: normal!important;
    overflow-wrap: normal !important;
    word-break: keep-all !important;
    width: max-content !important;
    text-align: center !important;
    vertical-align: middle !important;
  }
  .long-text-cell .pdf-cell-text,
  .text-cell .pdf-cell-text {
    white-space: normal!important;
    overflow-wrap: normal !important;
    word-break: keep-all !important;
  }
  
  tbody td,
  tfoot td,
  tbody td *,
  tfoot td * {
    color: #000 !important;
    -webkit-text-fill-color: #000 !important;
    text-shadow: none !important;
    font-weight: 800 !important;
    white-space: nowrap !important;
    vertical-align: middle !important;
  }
  thead th {
    background: #f5deb3 !important;
    color: #171412 !important;
    font-weight: 900 !important;
    font-size: 14px;
    white-space: nowrap !important;
    vertical-align: middle !important;
  }
  tbody tr:nth-child(even) td { background: #f8fafc !important; }

  .idx { 
    text-align: center !important; 
    vertical-align: middle !important;
    color: #000 !important; 
    font-weight: 900; 
  }
  
  .total-row td {
    background: #fef3c7 !important;
    font-weight: 800;
    border-top: 1.5pt solid #92400e;
    white-space: nowrap !important;
    vertical-align: middle !important;
  }
  
  .report-letterhead-block {
    display: flex;
    position: relative;
    top: 0;
    width: 100%;
    height: 34mm;
    min-height: 34mm;
    max-height: 34mm;
    align-items: stretch;
    justify-content: center;
    margin: 0 auto 5mm;
    page-break-before: avoid;
    page-break-after: avoid;
    break-before: avoid;
    break-after: avoid;
  }
  .report-letterhead-image {
    display: block;
    width: 100%;
    max-width: 100%;
    height: 100%;
    max-height: 100%;
    object-fit: fill;
    object-position: top;
    image-rendering: auto;
    margin: 0;
  }
  @media print and (orientation: portrait) {
    .report-letterhead-block { height: 28mm; min-height: 28mm; max-height: 28mm; }
  }
  @media print and (orientation: landscape) {
    .report-letterhead-block { height: 34mm; min-height: 34mm; max-height: 34mm; }
  }
  .report-letterhead-row { page-break-after: avoid; break-after: avoid; }
  .doc-title-row { page-break-after: avoid; break-after: avoid; }
  .doc-title-row td.doc-title-cell {
    border: none !important;
    background: #fff !important;
    padding: 2px 0 6px !important;
  }
  .report-letterhead-row .report-letterhead-cell {
    height: 30mm !important;
    min-height: 30mm !important;
    padding: 0 !important;
    border: 0 !important;
    background: #fff !important;
  }
  .report-letterhead-row .report-letterhead-image {
    display: block !important;
    width: 100% !important;
    max-width: 100% !important;
    height: 30mm !important;
    max-height: 30mm !important;
    object-fit: fill !important;
    object-position:top!important;
    margin: 0 !important;
  }
  .pdf-page .report-letterhead-cell {
    height: 30mm !important;
    min-height: 30mm !important;
    padding: 0 !important;
    border: 0 !important;
    background: #fff !important;
  }

  thead { display: table-header-group; }
  tfoot { display: table-footer-group; }
  tr { page-break-inside: avoid; }

  ${noteRowCss}
`;

/** يبني ترويسة + جدول التبويب (نفس المستخدم في الطباعة وتنزيل PDF) */
export function buildTableHtml(opts: {
  title: string;
  columns: TableCol[];
  rows: Record<string, any>[];
  numericKeys?: string[];
  subtitle?: string;
  reportDate?: string;
}) {
  const { title, columns, rows, numericKeys = [], subtitle, reportDate } = opts;
  
  const isDateColumn = (c: TableCol) =>
    /date|تاريخ|اليوم|الشهر|السنة|year|month|day/i.test(`${c.key} ${c.label}`);
  const isCompactColumn = (c: TableCol) =>
    /(^|[-_ ])(no|number|code|key|id)([-_ ]|$)|رقم|رمز|كود|الباب|الفصل|البند|النوع|الشهر|السنة/i.test(`${c.key} ${c.label}`);

  const getCellClass = (c: TableCol, val?: any) => {
    const isNumeric = numericKeys.includes(c.key) || typeof val === "number";
    const isDate = isDateColumn(c);
    const isCompact = isCompactColumn(c);
    const isNoWrap = isNumeric || isDate || isCompact;

    return [
      isNoWrap ? "num numeric-cell" : "text-cell",
      isDate ? "date-cell" : "",
      isCompact ? "compact-cell" : "",
    ].filter(Boolean).join(" ");
  };

  const reportDateLabel =
    formatReportDate(reportDate) || new Date().toLocaleDateString("ar-EG-u-nu-latn");
  const sub =
    subtitle ??
    `المجلس اليمني للاختصاصات الطبية - صعدة • تاريخ التقرير: ${reportDateLabel} • عدد السجلات: ${rows.length}`;

  const titleRow = `<tr class="doc-title-row"><td colspan="${columns.length + 1}" class="doc-title-cell">
    <h1>${escapeHtml(title)}</h1>
    <div class="sub">${escapeHtml(sub)}</div>
  </td></tr>`;

  const head = `${reportLetterheadRowHtml(columns.length + 1)}${titleRow}<tr><th class="idx numeric-cell">م</th>${columns
    .map((c) => `<th class="${getCellClass(c)}"><span class="pdf-cell-text">${escapeHtml(c.label)}</span></th>`)
    .join("")}</tr>`;

  const totals: Record<string, number> = {};
  columns.forEach((c) => {
    if (numericKeys.includes(c.key)) {
      totals[c.key] = rows.reduce((sum, r) => sum + (Number(r[c.key]) || 0), 0);
    }
  });

  const totalRow = `<tr class="total-row"><td class="idx numeric-cell" style="font-size:14px;"><span class="pdf-cell-text">الإجمالي</span></td>${columns
    .map((c) =>
      numericKeys.includes(c.key)
        ? `<td class="num numeric-cell"><span class="pdf-cell-text" style="color:#000 !important;font-weight:1000 !important;">${escapeHtml(fmt(totals[c.key] || 0))}</span></td>`
        : `<td class="${isDateColumn(c) ? "date-cell" : ""}"><span class="pdf-cell-text" style="color:#000 !important;font-weight:1000 !important;"></span></td>`
    )
    .join("")}</tr>`;

  const body = rows
    .map(
      (r, i) =>
        `<tr><td class="idx numeric-cell"><span class="pdf-cell-text">${i + 1}</span></td>${columns
          .map((c) => {
            const v = r[c.key];
            const isNum = numericKeys.includes(c.key) || typeof v === "number";
            const classes = getCellClass(c, v);
            
            return `<td class="${classes}"><span class="pdf-cell-text" style="color:#000 !important;font-weight:1000 !important;">${
              isNum ? escapeHtml(fmt(Number(v) || 0)) : escapeHtml(v)
            }</span></td>`;
          })
          .join("")}</tr>`
    )
    .join("");

  return `
    <table><thead>${head}</thead><tbody>${body}${totalRow}</tbody></table>
  `;
}