import type { Account, Hafiza, Journal } from "./store";
import { fmt } from "./format";
import { buildMonthlyStatementRows } from "./exportImport";
import { formatReportDate } from "@/lib/reportDate";
import {
  getReportMovementLabel,
  getReportPeriodLabel,
  type ReportPeriodMode,
} from "./reportPeriods";
import { REPORT_LETTERHEAD_SRC } from "@/lib/printTableHtml";
import revSchema from "@/data/revenueTemplate.json";

const reportLetterheadRow = (columnCount: number) => `
  <tr class="report-letterhead-row">
    <th class="report-letterhead-cell" colspan="${Math.max(1, Math.floor(columnCount))}">
      <img class="report-letterhead-image" src="${REPORT_LETTERHEAD_SRC}" alt="ترويسة المجلس اليمني للااختصاصات الطبية" />
    </th>
  </tr>`;

const reportLetterheadStyles = `
    thead { display: table-header-group; }
    .report-letterhead-row { break-inside: avoid; page-break-inside: avoid; }
    .report-letterhead-cell {
      border: 0 !important;
      background: #fff !important;
      padding: 0 0 2mm !important;
      height: auto !important;
    }
    .report-letterhead-image {
      display: block;
      width: 100%;
      max-height: 20mm;
      height: auto;
      object-fit: contain;
      margin: 0 auto;
    }
    tbody tr { break-inside: avoid; page-break-inside: avoid; }
`;

const norm = (s: string) => (s || "").replace(/\s+/g, " ").trim();

export function exportToPdf(opts: {
  title: string;
  columns: string[];
  rows: (string | number)[][];
  orientation?: "portrait" | "landscape";
  reportDate?: string;
}) {
  const reportDateLabel =
    formatReportDate(opts.reportDate) || new Date().toLocaleDateString("ar-EG-u-nu-latn");
  const w = window.open("", "_blank", "width=900,height=700");
  if (!w) return;
  const orient = opts.orientation || (opts.columns.length > 6 ? "landscape" : "portrait");
  const fontSize = opts.columns.length > 12 ? 9 : opts.columns.length > 8 ? 10 : 11;
  const numericColumnHints = ["رقم", "الباب", "الفصل", "البند", "النوع", "مبلغ", "مدين", "دائن", "الرصيد", "الجملة", "الإجمالي", "المتبقي", "المدفوع", "الأشهر", "الشهر"];
  const dateColumnHints = ["التاريخ", "تاريخ"];
  const isNumericColumn = (column: string) => column.trim() === "م" || numericColumnHints.some((hint) => column.includes(hint));
  const isDateColumn = (column: string) => dateColumnHints.some((hint) => column.includes(hint));

  const head = `<meta charset="utf-8"><title>${opts.title} - ${reportDateLabel}</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
${reportLetterheadStyles}
    @page { size: A4 ${orient}; margin: 8mm; padding: 0; }
    @page :first { margin-top: 8mm; }
    html { margin: 0; padding: 0; }
    body { 
      font-family: 'Cairo','Tajawal','Segoe UI',Tahoma,Arial,sans-serif; 
      direction: rtl; 
      color: #000 !important; 
      margin: 0; 
      padding: 6px; 
      width: 100%; 
      background: white;
      line-height: 1.3;
      font-weight: 700 !important;
    }
    h1 { 
      text-align: center; 
      font-size: 15px; 
      font-weight: 900;
      margin: 0 0 4px; 
      color: #000 !important;
    }
    table { 
      width: 100%;
      border-collapse: collapse; 
      font-size: ${fontSize}px; 
      table-layout: auto;
      margin-top: 6px;
    }
    th, td { 
      border: 1px solid #000; 
      padding: 2px 4px !important;
      text-align: center; 
      vertical-align: middle;
      font-size: clamp(8px, 1.05vw, 14px);
      word-wrap: break-word;
      overflow-wrap: break-word;
      font-weight: 700 !important;
      color: #000 !important;
      line-height: 1.25;
    }
    .num, .numeric-cell, .date-cell {
      font-family: 'Times New Roman', Times, serif !important;
      font-size: clamp(12px, 1vw, 14px) !important;
      color: #000 !important;
      font-weight: 700 !important;
      direction: ltr;
      unicode-bidi: embed;
    }
    th { 
      background: #1f7fb8 !important;
      color: #000 !important;
      font-weight: 900 !important;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    tr:nth-child(even) td { background: #f8fafc; }
    tr:nth-child(odd) td { background: #ffffff; }
    .meta { 
      font-size: 11px; 
      color: #000 !important; 
      margin: 2px 0;
      text-align: center;
      font-weight: 700 !important;
    }
    .total-row td { background: #1f7fb8 !important; font-weight: 900 !important; }
    .subtotal-row td { background: #cbd5e1 !important; font-weight: 800 !important; }
    .group-row td { background: #fef3c7 !important; font-weight: 900 !important; }
    @media print { 
      body { padding: 4px; }
      @page { margin: 8mm; }
    }
  </style>`;

  const body = `<h1>${opts.title}</h1>
  <div class="meta">المجلس اليمني للاختصاصات الطبية — تاريخ التقرير: ${reportDateLabel}</div>
  <table>
    <thead>${reportLetterheadRow(opts.columns.length)}<tr>${opts.columns.map((c) => `<th>${c}</th>`).join("")}</tr></thead>
    <tbody>${opts.rows
      .map(
        (r) =>
          `<tr>${r
            .map((c, index) => {
              const column = opts.columns[index] || "";
              const classes = [
                typeof c === "number" || isNumericColumn(column) ? "num numeric-cell" : "",
                isDateColumn(column) ? "date-cell" : "",
              ].filter(Boolean).join(" ");
              return `<td${classes ? ` class="${classes}"` : ""}>${c === undefined || c === null ? "" : c}</td>`;
            })
            .join("")}</tr>`,
      )
      .join("")}</tbody>
  </table>
  <script>window.onload=()=>{setTimeout(()=>window.print(),400)}</script>`;

  w.document.write(`<!doctype html><html lang="ar" dir="rtl"><head>${head}</head><body>${body}</body></html>`);
  w.document.close();
}

export const hafizaPdf = (h: Hafiza[], reportDate?: string) =>
  exportToPdf({
    title: "حوافظ التوريد واشعارات التوريد",
    columns: [
      "م", "الاسم", "الدفعة", "التخصص", "التاريخ", "رقم الحافظة", "البيان", "مبلغ الحافظة", "تاريخ التوريد", "رقم الاشعار", "مبلغ التوريد"
    ],
    rows: h.map((x, i) => [
      i + 1, x.name, x.batch, x.specialty, x.date, x.hafizaNo, x.description, fmt(x.hafizaAmount), x.notifyDate || "", x.notifyNo || "", fmt(x.notifyAmount)
    ]),
    reportDate,
  });

export const accountsPdf = (a: Account[], opening: number, reportDate?: string) => {
  let bal = opening;
  const rows: (string | number)[][] = [
    [1, "", "", "", "", "", "", "رصيد افتتاحي", "", "", "", fmt(opening), "", fmt(bal)],
  ];
  a.forEach((x, i) => {
    bal = bal + (x.income || 0) - (x.expense || 0);
    rows.push([
      i + 2, x.date, x.hafizaNo, x.notifyNo, x.notifyDate, x.checkNo, x.checkDate, x.description, x.specialty, x.name, fmt(x.hafizaAmount), fmt(x.income), fmt(x.expense), fmt(bal)
    ]);
  });
  exportToPdf({
    title: "حساب المجلس اليمني للاختصاصات الطبية - صعدة",
    columns: [
      "م", "التاريخ", "رقم الحافظة", "رقم الاشعار", "تاريخ التوريد", "رقم الشيك", "تاريخه", "البيان", "التخصص", "الاسم", "مبلغ الحافظة", "الإيرادات", "المصروفات", "الرصيد"
    ],
    rows,
    reportDate,
  });
};

export const journalPdf = (j: Journal[], reportDate?: string) =>
  exportToPdf({
    title: "دفتر اليومية العامة",
    columns: [
      "م", "رقم الاستمارة", "كشف التسوية", "التاريخ", "البيان", "ح/ مدين", "ح/ دائن", "مدين", "دائن"
    ],
    rows: j.map((x, i) => [
      i + 1, x.formNo, x.settlement || "", x.date, x.description, x.debitAccount || x.account, x.creditAccount || "", fmt(x.debit), fmt(x.credit)
    ]),
    reportDate,
  });

export function monthlyStatementPdf(opts: {
  journal: Journal[];
  year: number;
  startMonth: number;
  endMonth: number;
  mode: ReportPeriodMode;
  month?: number;
  quarter?: number;
  halfYear?: number;
  reportDate?: string;
}) {
  const { journal, year, startMonth, endMonth, mode, month, quarter, halfYear, reportDate } = opts;
  const reportDateLabel = formatReportDate(reportDate) || new Date().toLocaleDateString("ar-EG-u-nu-latn");
  const { map, groups, title, office, gov } = buildMonthlyStatementRows(journal, year, startMonth, endMonth);
  const lastDay = new Date(year, endMonth, 0).getDate();
  const periodSelection = { mode, year, month, quarter, halfYear };
  const periodLabel = getReportPeriodLabel(periodSelection);
  const colCurLabel = getReportMovementLabel(periodSelection);

  const w = window.open("", "_blank", "width=1100,height=800");
  if (!w) return;

  const fmtCell = (n: number) => (n ? fmt(n) : "-");

  let body = "";
  body += `<h1>${title}</h1>`;
  body += `<div class="meta">${office} — ${gov}</div>`;
  body += `<div class="meta">تاريخ التقرير: ${reportDateLabel} | الفترة: ${periodLabel}</div>`;
  body += `<table><thead>
    ${reportLetterheadRow(9)}
    <tr>
      <th rowspan="2">بيان أنواع الحسابات الوسيطة</th>
      <th colspan="2">الرصيد في ${year}/${startMonth}/1</th>
      <th colspan="2">${colCurLabel}</th>
      <th colspan="2">الجملــة</th>
      <th colspan="2">الرصيد في ${year}/${endMonth}/${lastDay}</th>
    </tr>
    <tr>
      <th>مدين</th><th>دائن</th>
      <th>مدين</th><th>دائن</th>
      <th>مدين</th><th>دائن</th>
      <th>مدين</th><th>دائن</th>
    </tr>
  </thead><tbody>`;

  let GPD = 0, GPC = 0, GCD = 0, GCC = 0;
  for (const g of groups) {
    body += `<tr class="group-row"><td colspan="9">${g.title}</td></tr>`;
    let gPD = 0, gPC = 0, gCD = 0, gCC = 0;
    for (const a of g.accounts) {
      const r = map[norm(a)] || { prevD: 0, prevC: 0, curD: 0, curC: 0 };
      const totD = r.prevD + r.curD, totC = r.prevC + r.curC;
      const balD = Math.max(0, totD - totC), balC = Math.max(0, totC - totD);
      gPD += r.prevD; gPC += r.prevC; gCD += r.curD; gCC += r.curC;
      body += `<tr><td class="acc">${a}</td><td class="num">${fmtCell(r.prevD)}</td><td class="num">${fmtCell(r.prevC)}</td><td class="num">${fmtCell(r.curD)}</td><td class="num">${fmtCell(r.curC)}</td><td class="num">${fmtCell(totD)}</td><td class="num">${fmtCell(totC)}</td><td class="num">${fmtCell(balD)}</td><td class="num">${fmtCell(balC)}</td></tr>`;
    }
    GPD += gPD; GPC += gPC; GCD += gCD; GCC += gCC;
    body += `<tr class="subtotal-row"><td>جملة ${g.title}</td><td class="num">${fmt(gPD)}</td><td class="num">${fmt(gPC)}</td><td class="num">${fmt(gCD)}</td><td class="num">${fmt(gCC)}</td><td class="num">${fmt(gPD + gCD)}</td><td class="num">${fmt(gPC + gCC)}</td><td class="num">${fmt(Math.max(0, gPD + gCD - gPC - gCC))}</td><td class="num">${fmt(Math.max(0, gPC + gCC - gPD - gCD))}</td></tr>`;
  }
  body += `<tr class="total-row"><td>الإجمالي العام</td><td class="num">${fmt(GPD)}</td><td class="num">${fmt(GPC)}</td><td class="num">${fmt(GCD)}</td><td class="num">${fmt(GCC)}</td><td class="num">${fmt(GPD + GCD)}</td><td class="num">${fmt(GPC + GCC)}</td><td class="num">${fmt(Math.max(0, GPD + GCD - GPC - GCC))}</td><td class="num">${fmt(Math.max(0, GPC + GCC - GPD - GCD))}</td></tr>`;
  body += `</tbody></table>`;

  const head = `<meta charset="utf-8"><title>${title} - ${periodLabel}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
${reportLetterheadStyles}
    @page { size: A4 landscape; margin: 8mm; padding: 0; }
    body { 
      font-family: 'Cairo','Tajawal',sans-serif; 
      direction: rtl; 
      color: #000 !important; 
      padding: 6px; 
      background: white;
      font-weight: 700 !important;
    }
    h1 { text-align: center; font-size: 16px; font-weight: 900; margin: 0 0 4px; }
    .meta { text-align: center; font-size: 12px; font-weight: 700; margin: 2px 0; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; table-layout: fixed; margin-top: 6px; }
    th:first-child, td:first-child { width: 28%; }
    th:not(:first-child), td:not(:first-child) { width: 9%; }
    th, td { 
      border: 1px solid #000; 
      padding: 3px 2px !important;
      text-align: center;
      vertical-align: middle;
      font-weight: 700 !important;
      line-height: 1.2;
    }
    .num {
      font-family: 'Times New Roman', Times, serif !important;
      font-size: 11px !important;
      direction: ltr;
      unicode-bidi: embed;
    }
    td.acc { text-align: right; padding-right: 6px !important; font-weight: 800 !important; }
    th { background: #1f7fb8 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    tr.group-row td { background: #fef3c7 !important; font-weight: 900 !important; }
    tr.subtotal-row td { background: #cbd5e1 !important; font-weight: 800 !important; }
    tr.total-row td { background: #1f7fb8 !important; font-weight: 900 !important; }
    @media print { body { padding: 4px; } @page { margin: 8mm; } }
  </style>`;

  w.document.write(`<!doctype html><html lang="ar" dir="rtl"><head>${head}</head><body>${body}<script>window.onload=()=>{setTimeout(()=>window.print(),400)}</script></body></html>`);
  w.document.close();
}

type RType = { no: number; title: string };
type RItem = { no: number; title: string; types: RType[] };
type RSection = { no: number; title: string; items: RItem[] };
type RChapter = { no: number; title: string; longTitle?: string; sections: RSection[] };
const REV_SCHEMA = revSchema as { title: string; office: string; chapters: RChapter[] };
const MONTHS_PDF = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];

export function revenuePdf(
  revenue: Record<string, number>,
  year: number,
  month: number,
  reportDate?: string,
) {
  const reportDateLabel = formatReportDate(reportDate) || new Date().toLocaleDateString("ar-EG-u-nu-latn");
  const get = (m: number, key: string) => revenue[`${year}-${m}-${key}`] || 0;
  const sumPrev = (key: string) => {
    let s = 0;
    for (let m = 1; m < month; m++) s += get(m, key);
    return s;
  };

  const types: Record<string, { cur: number; prev: number }> = {};
  const itemsAgg: Record<string, { cur: number; prev: number }> = {};
  const sectionsAgg: Record<string, { cur: number; prev: number }> = {};
  const chaptersAgg: Record<string, { cur: number; prev: number }> = {};
  let gCur = 0, gPrev = 0;

  REV_SCHEMA.chapters.forEach((ch) => {
    let cCur = 0, cPrev = 0;
    ch.sections.forEach((sec) => {
      let sCur = 0, sPrev = 0;
      sec.items.forEach((it) => {
        let iCur = 0, iPrev = 0;
        it.types.forEach((t) => {
          const k = `${ch.no}-${sec.no}-${it.no}-${t.no}`;
          const cur = get(month, k), prev = sumPrev(k);
          types[k] = { cur, prev };
          iCur += cur; iPrev += prev;
        });
        itemsAgg[`${ch.no}-${sec.no}-${it.no}`] = { cur: iCur, prev: iPrev };
        sCur += iCur; sPrev += iPrev;
      });
      sectionsAgg[`${ch.no}-${sec.no}`] = { cur: sCur, prev: sPrev };
      cCur += sCur; cPrev += sPrev;
    });
    chaptersAgg[`${ch.no}`] = { cur: cCur, prev: cPrev };
    gCur += cCur; gPrev += cPrev;
  });

  const w = window.open("", "_blank", "width=1100,height=800");
  if (!w) return;
  const fc = (n: number) => (n ? fmt(n) : "-");

  let body = `<h1>${REV_SCHEMA.title}</h1>`;
  body += `<div class="meta">${REV_SCHEMA.office} — تاريخ التقرير: ${reportDateLabel}</div>`;
  body += `<div class="meta">عن شهر ${MONTHS_PDF[month - 1]} من العام المالي ${year}م</div>`;
  body += `<table><thead>
    ${reportLetterheadRow(8)}
    <tr>
      <th rowspan="2">بيان مفردات الموارد</th>
      <th rowspan="2">الباب</th><th rowspan="2">الفصل</th><th rowspan="2">البند</th><th rowspan="2">النوع</th>
      <th>الشهر الجاري</th><th>الأشهر السابقة</th><th>الجملة</th>
    </tr>
    <tr><th>ريال</th><th>ريال</th><th>ريال</th></tr>
  </thead><tbody>`;

  body += `<tr class="total-row"><td class="acc">إجمالي الموارد</td><td colspan="4"></td><td class="num">${fc(gCur)}</td><td class="num">${fc(gPrev)}</td><td class="num">${fc(gCur + gPrev)}</td></tr>`;

  REV_SCHEMA.chapters.forEach((ch) => {
    if (ch.sections.length === 0) return;
    const a = chaptersAgg[ch.no];
    body += `<tr class="group-row"><td class="acc">${ch.longTitle || ch.title}</td><td class="num">${ch.no}</td><td colspan="3"></td><td class="num">${fc(a.cur)}</td><td class="num">${fc(a.prev)}</td><td class="num">${fc(a.cur + a.prev)}</td></tr>`;
    ch.sections.forEach((sec) => {
      const sa = sectionsAgg[`${ch.no}-${sec.no}`];
      body += `<tr class="subtotal-row"><td class="acc" style="padding-right: 12px !important;">${sec.title}</td><td></td><td class="num">${sec.no}</td><td colspan="2"></td><td class="num">${fc(sa.cur)}</td><td class="num">${fc(sa.prev)}</td><td class="num">${fc(sa.cur + sa.prev)}</td></tr>`;
      sec.items.forEach((it) => {
        const ia = itemsAgg[`${ch.no}-${sec.no}-${it.no}`];
        body += `<tr class="subtotal-row"><td class="acc" style="padding-right: 22px !important;">${it.title}</td><td colspan="2"></td><td class="num">${it.no}</td><td></td><td class="num">${fc(ia.cur)}</td><td class="num">${fc(ia.prev)}</td><td class="num">${fc(ia.cur + ia.prev)}</td></tr>`;
        it.types.forEach((t) => {
          const v = types[`${ch.no}-${sec.no}-${it.no}-${t.no}`];
          body += `<tr><td class="acc" style="padding-right: 32px !important;">${t.title}</td><td colspan="3"></td><td class="num">${t.no}</td><td class="num">${fc(v.cur)}</td><td class="num">${fc(v.prev)}</td><td class="num">${fc(v.cur + v.prev)}</td></tr>`;
        });
      });
    });
  });

  REV_SCHEMA.chapters.forEach((ch) => {
    const a = chaptersAgg[ch.no];
    body += `<tr class="group-row"><td class="acc">إجمالي ${ch.title}</td><td class="num">${ch.no}</td><td colspan="3"></td><td class="num">${fc(a.cur)}</td><td class="num">${fc(a.prev)}</td><td class="num">${fc(a.cur + a.prev)}</td></tr>`;
  });

  const head = `<meta charset="utf-8"><title>${REV_SCHEMA.title} - ${MONTHS_PDF[month - 1]} ${year}م</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
${reportLetterheadStyles}
    @page { size: A4 landscape; margin: 8mm; padding: 0; }
    body { 
      font-family: 'Cairo','Tajawal',sans-serif; 
      direction: rtl; 
      color: #000 !important; 
      padding: 6px; 
      background: white;
      font-weight: 700 !important;
    }
    h1 { text-align: center; font-size: 16px; font-weight: 900; margin: 0 0 4px; }
    .meta { text-align: center; font-size: 12px; font-weight: 700; margin: 2px 0; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; table-layout: auto; margin-top: 6px; }
    
    th:nth-child(1), td:nth-child(1) { width: 44%; }
    th:nth-child(2), td:nth-child(2),
    th:nth-child(3), td:nth-child(3),
    th:nth-child(4), td:nth-child(4),
    th:nth-child(5), td:nth-child(5) { width: 4%; }
    th:nth-child(6), td:nth-child(6),
    th:nth-child(7), td:nth-child(7),
    th:nth-child(8), td:nth-child(8) { width: 13%; }
    
    th, td { 
      border: 1px solid #000; 
      padding: 3px 2px !important;
      text-align: center;
      vertical-align: middle;
      font-weight: 700 !important;
      line-height: 1.25;
      word-wrap: break-word;
      overflow-wrap: break-word;
    }
    .num {
      font-family: 'Times New Roman', Times, serif !important;
      font-size: 14px !important;
      direction: ltr;
      unicode-bidi: embed;
    }
    td.acc { text-align: right; font-weight: 800 !important; }
    th { background: #1f7fb8 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    tr.group-row td { background: #fef3c7 !important; font-weight: 900 !important; }
    tr.subtotal-row td { background: #cbd5e1 !important; font-weight: 800 !important; }
    tr.total-row td { background: #1f7fb8 !important; font-weight: 900 !important; }
    @media print { body { padding: 4px; } @page { margin: 8mm; } }
  </style>`;

  w.document.write(`<!doctype html><html lang="ar" dir="rtl"><head>${head}</head><body>${body}<script>window.onload=()=>{setTimeout(()=>window.print(),400)}</script></body></html>`);
  w.document.close();
}
