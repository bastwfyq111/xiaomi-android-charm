import { fmt } from "./format";

export type TableCol = { key: string; label: string };

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
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html { margin: 0; padding: 0; }
  body {
    font-family: 'Cairo', 'Tajawal', Tahoma, Arial, sans-serif;
    padding: 4mm 6mm;
    color: #000 !important;
    direction: rtl;
    margin: 0;
    width: 100%;
    box-sizing: border-box;
    font-weight: 600;
    font-size: 10px;
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
    font-size: 9.5px;
    font-weight: 700;
    border-bottom: 1.5pt solid #b8860b;
    padding-bottom: 4px;
  }
  table {
    width: 100%;
    border-collapse: collapse;
    table-layout: auto;
    font-size: 10px;
  }
  th, td {
    border: 0.75pt solid #000;
    padding: 2.5px 3px;
    text-align: center;
    white-space: nowrap;
    color: #000 !important;
    font-weight: 700;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  thead th {
    background: #f5deb3 !important;
    color: #000 !important;
    font-weight: 800;
    font-size: 10px;
  }
  tbody tr:nth-child(even) td { background: #f8fafc !important; }
  .num {
    font-family: 'Courier New', monospace;
    text-align: center;
    direction: ltr;
    color: #000 !important;
    font-weight: 1000;
  }
  .idx { width: 28px; text-align: center; color: #000 !important; font-weight: 700; }
  .total-row td {
    background: #fef3c7 !important;
    font-weight: 800;
    border-top: 1.5pt solid #92400e;
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
}) {
  const { title, columns, rows, numericKeys = [], subtitle } = opts;

  const head = `<tr><th class="idx">م</th>${columns
    .map((c) => `<th>${escapeHtml(c.label)}</th>`)
    .join("")}</tr>`;

  const totals: Record<string, number> = {};
  columns.forEach((c) => {
    if (numericKeys.includes(c.key)) {
      totals[c.key] = rows.reduce((sum, r) => sum + (Number(r[c.key]) || 0), 0);
    }
  });

  const totalRow = `<tr class="total-row"><td class="idx"></td>${columns
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

  const today = new Date().toLocaleDateString("ar-EG-u-nu-latn");
  const sub =
    subtitle ??
    `المجلس اليمني للاختصاصات الطبية - صعدة • ${today} • عدد السجلات: ${rows.length}`;

  return `
    <h1>${escapeHtml(title)}</h1>
    <div class="sub">${escapeHtml(sub)}</div>
    <table><thead>${head}</thead><tbody>${body}${totalRow}</tbody></table>
  `;
}
