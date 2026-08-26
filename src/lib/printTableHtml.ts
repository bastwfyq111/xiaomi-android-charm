import { fmt } from "./format";
import { formatReportDate } from "@/lib/reportDate";
import reportLetterheadUrl from "@/assets/report-letterhead.png";

export type TableCol = { key: string; label: string };

export const REPORT_LETTERHEAD_SRC = reportLetterheadUrl;

export const reportLetterheadHtml = () => `
  <div class="report-letterhead-block" style="display:flex;position:relative;top:0;width:100%;height:34mm;min-height:34mm;max-height:34mm;overflow:hidden;align-items:stretch;justify-content:center;margin:0 auto 5mm;page-break-before:avoid;page-break-after:avoid;break-before:avoid;break-after:avoid;">
    <img class="report-letterhead-image" style="display:block;width:100%;max-width:100%;height:100%;max-height:100%;object-fit:fill;object-position:center;margin:0;" src="${REPORT_LETTERHEAD_SRC}" alt="ترويسة المجلس اليمني للاختصاصات الطبية" />
  </div>
`;

export const reportLetterheadRowHtml = (columnCount: number) => `
  <tr class="report-letterhead-row">
    <th class="report-letterhead-cell" colspan="${Math.max(1, Math.floor(columnCount))}">
      <img class="report-letterhead-image" style="display:block;width:100%;max-width:100%;height:30mm;max-height:30mm;object-fit:fill;object-position:center;margin:0;" src="${REPORT_LETTERHEAD_SRC}" alt="ترويسة المجلس اليمني للاختصاصات الطبية" />
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
 * أنماط موحّدة تُستخدم في الطباعة وفي تنزيل PDF
 * تضمن الاحتواء التلقائي للنصوص بدون التفاف للأرقام
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
    font-size: 12px;
    line-height: 1.3;
    background: #fff;
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }
  h1 {
    text-align: center;
    color: #000 !important;
    margin: 0 0 3px;
    font-size: 15px;
    font-weight: 800;
  }
  .sub {
    text-align: center;
    color: #000 !important;
    margin-bottom: 5px;
    font-size: 13.5px;
    font-weight: 1000;
    border-bottom: 1.5pt solid #b8860b;
    padding-bottom: 4px;
  }
  
  /* جعل عرض الجدول يتكيف تلقائياً بحسب محتوى الخلايا */
  table {
    width: 100%;
    max-width: 100%;
    border-collapse: collapse;
    table-layout: auto !important;
    font-size: clamp(9px, 1.05vw, 13px);
  }
  
  th, td {
    border: 0.75pt solid #000;
    padding: 5px 6px !important;
    text-align: center !important;
    vertical-align: middle !important;
    color: #000 !important;
    font-weight: 800 !important;
    line-height: 1.4 !important;
    height: auto !important;
    min-height: 28px;
    font-size: clamp(10px, 1.15vw, 14px) !important;
    width: max-content;
  }

  /* منع التفاف النصوص نهائياً في خلايا الأرقام والتواريخ والأكواد */
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
    direction: ltr;
    color: #000 !important;
    -webkit-text-fill-color: #000 !important;
    text-shadow: none !important;
    font-weight: 900 !important;
    line-height: 1.15 !important;
    font-size: clamp(9px, 1.9vw, 12px) !important;
    width: 1%; /* يضمن إعطاء الخلية دائمًا أصغر عرض يتسع للمحتوى بدون التفاف */
  }

  .pdf-cell-text {
    display: inline-block;
    width: 100%;
    text-align: center;
    vertical-align: middle;
  }

  .num .pdf-cell-text,
  .numeric-cell .pdf-cell-text,
  .date-cell .pdf-cell-text,
  .compact-cell .pdf-cell-text,
  .idx .pdf-cell-text {
    white-space: nowrap !important;
    word-break: keep-all !important;
    overflow-wrap: normal !important;
  }

  /* السماح بالتفاف النصوص فقط في الأوصاف والأسماء الطويلة */
  .long-text-cell,
  .long-text-cell .pdf-cell-text {
    white-space: normal !important;
    overflow-wrap: break-word !important;
    word-break: normal !important;
    hyphens: auto !important;
    width: auto;
  }
  
  tbody td,
  tfoot td,
  tbody td *,
  tfoot td * {
    color: #000 !important;
    -webkit-text-fill-color: #000 !important;
    text-shadow: none !important;
    font-weight: 800 !important;
  }
  thead th {
    background: #f5deb3 !important;
    color: #171412 !important;
    font-weight: 900 !important;
    font-size: 14px;
    white-space: nowrap !important;
  }
  tbody tr:nth-child(even) td { background: #f8fafc !important; }

  .idx { 
    text-align: center !important; 
    color: #000 !important; 
    font-weight: 900; 
  }
  
  .total-row td {
    background: #fef3c7 !important;
    font-weight: 800;
    border-top: 1.5pt solid #92400e;
    white-space: nowrap !important;
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
    object-position: center;
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
    object-position: center !important;
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
  const hasMoreThanFourWords = (value: any) =>
    String(value ?? "").trim().split(/\s+/).filter(Boolean).length > 4;

  const getCellClass = (c: TableCol, val?: any) => {
    const isNumeric = numericKeys.includes(c.key) || typeof val === "number";
    const isDate = isDateColumn(c);
    const isCompact = isCompactColumn(c);
    const isNoWrap = isNumeric || isDate || isCompact;

    // الخلية الرقمية أو القصيرة لا تأخذ أبداً long-text-cell لمنع أي التفاف
    return [
      isNoWrap ? "num numeric-cell" : "text-cell",
      isDate ? "date-cell" : "",
      isCompact ? "compact-cell" : "",
      !isNoWrap && hasMoreThanFourWords(val ?? c.label) ? "long-text-cell" : "",
    ].filter(Boolean).join(" ");
  };

  const head = `${reportLetterheadRowHtml(columns.length + 1)}<tr><th class="idx numeric-cell">م</th>${columns
    .map((c) => `<th class="${getCellClass(c)}">${escapeHtml(c.label)}</th>`)
    .join("")}</tr>`;

  const totals: Record<string, number> = {};
  columns.forEach((c) => {
    if (numericKeys.includes(c.key)) {
      totals[c.key] = rows.reduce((sum, r) => sum + (Number(r[c.key]) || 0), 0);
    }
  });

  const totalRow = `<tr class="total-row"><td class="idx numeric-cell" style="font-size:12px;">الإجمالي</td>${columns
    .map((c) =>
      numericKeys.includes(c.key)
        ? `<td class="num numeric-cell"><span class="pdf-cell-text" style="color:#000000 !important;font-weight:800 !important;">${escapeHtml(fmt(totals[c.key] || 0))}</span></td>`
        : `<td class="${isDateColumn(c) ? "date-cell" : ""}"><span class="pdf-cell-text" style="color:#000000 !important;font-weight:800 !important;"></span></td>`
    )
    .join("")}</tr>`;

  const body = rows
    .map(
      (r, i) =>
        `<tr><td class="idx numeric-cell">${i + 1}</td>${columns
          .map((c) => {
            const v = r[c.key];
            const isNum = numericKeys.includes(c.key) || typeof v === "number";
            const classes = getCellClass(c, v);
            
            return `<td class="${classes}"><span class="pdf-cell-text" style="color:#000000 !important;font-weight:800 !important;">${
              isNum ? escapeHtml(fmt(Number(v) || 0)) : escapeHtml(v)
            }</span></td>`;
          })
          .join("")}</tr>`
    )
    .join("");

  const reportDateLabel =
    formatReportDate(reportDate) || new Date().toLocaleDateString("ar-EG-u-nu-latn");
  const sub =
    subtitle ??
    `المجلس اليمني للاختصاصات الطبية - صعدة • تاريخ التقرير: ${reportDateLabel} • عدد السجلات: ${rows.length}`;

  return `
    <h1>${escapeHtml(title)}</h1>
    <div class="sub">${escapeHtml(sub)}</div>
    <table><thead>${head}</thead><tbody>${body}${totalRow}</tbody></table>
  `;
}
