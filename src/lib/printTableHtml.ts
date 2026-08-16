import { fmt } from "./format";

import { formatReportDate } from "@/lib/reportDate";

export type TableCol = { key: string; label: string };

export const REPORT_LETTERHEAD_SRC = "/report-letterhead.png";

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
 * حتى يبقى الشكل مطابقاً 100% بين الخيارين
 */
export const tablePrintStyles = `
  /* إضافة إعداد جعل الصفحة أفقية */
  @page {
    size: landscape;
  }
  
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html { margin: 0; padding: 0; }
  body {
    font-family: 'Cairo', 'Tajawal', Tahoma, Arial, sans-serif;
    padding: 4mm 6mm;
    color: #000 !important;
    direction: rtl;
    margin: 0;
    width: auto;
    box-sizing: border-box;
    font-weight: 1000;
    font-size: 14px;
    line-height: 1.35;
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
  table {
    width: 100%;
    min-width: 100%;
    border-collapse: collapse;
    table-layout: fixed;
    font-size: clamp(7px, 1.05vw, 13px);
  }
  th, td {
    border: 0.75pt solid #000;
    padding: 0 !important;
    text-align: center;
    white-space: normal;
    overflow: hidden;
    text-overflow: clip;
    overflow-wrap: anywhere;
    word-break: break-word;
    hyphens: auto;
    max-height: 2.2em;
    color: #000 !important;
    font-weight: 700;
    line-height: 1.1;
    font-size: clamp(7px, 1.2vw, 14px);
  }
  thead th {
    background: #f5deb3 !important;
    color: #000 !important;
    font-weight: 800;
    font-size: 14px;
  }
  tbody tr:nth-child(even) td { background: #f8fafc !important; }
  .num {
    font-family: 'Times New Roman', Times, serif !important;
    text-align: center;
    direction: ltr;
    color: #000 !important;
    font-weight: 900 !important;
    overflow-wrap: anywhere;
    word-break: break-word;
    font-size: inherit;
  }
  
  /* تم تعديل العرض قليلاً لتتسع لكلمة الإجمالي */
  .idx { width: 50px; text-align: center; color: #000 !important; font-weight: 700; } 
  
  .total-row td {
    background: #fef3c7 !important;
    font-weight: 800;
    border-top: 1.5pt solid #92400e;
  }
  
  .report-letterhead-block {
    display: flex;
    position: relative;
    top: 0;
    width: 100%;
    height: 34mm;
    min-height: 34mm;
    max-height: 34mm;
    overflow: hidden;
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
  .pdf-page .report-letterhead-cell {
    height: 30mm !important;
    min-height: 30mm !important;
    padding: 0 !important;
    border: 0 !important;
    background: #fff !important;
  }

  /* هذه الإعدادات تضمن تكرار الترويسة في كل صفحة مطبوعة */
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

  const head = `${reportLetterheadRowHtml(columns.length + 1)}<tr><th class="idx">م</th>${columns
    .map((c) => `<th>${escapeHtml(c.label)}</th>`)
    .join("")}</tr>`;

  const totals: Record<string, number> = {};
  columns.forEach((c) => {
    if (numericKeys.includes(c.key)) {
      totals[c.key] = rows.reduce((sum, r) => sum + (Number(r[c.key]) || 0), 0);
    }
  });

  // إضافة كلمة "الإجمالي" هنا، وبقاؤها داخل tbody يضمن عدم تكرارها في كل صفحة
  const totalRow = `<tr class="total-row"><td class="idx" style="font-size:12px;">الإجمالي</td>${columns
    .map((c) =>
      numericKeys.includes(c.key)
        ? `<td class="num">${escapeHtml(fmt(totals[c.key] || 0))}</td>`
        : `<td></td>`
    )
    .join("")}</tr>`;

  const body = rows
    .map(
      (r, i) =>
        `<tr><td class="idx">${i + 1}</td>${columns
          .map((c) => {
            const v = r[c.key];
            const isNum = numericKeys.includes(c.key) || typeof v === "number";
            return `<td class="${isNum ? "num" : ""}">${
              isNum ? escapeHtml(fmt(Number(v) || 0)) : escapeHtml(v)
            }</td>`;
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
