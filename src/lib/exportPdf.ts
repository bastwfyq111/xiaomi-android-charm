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

const reportLetterheadRow = (columnCount: number) => `
  <tr class="report-letterhead-row">
    <th class="report-letterhead-cell" colspan="${Math.max(1, Math.floor(columnCount))}">
      <img class="report-letterhead-image" src="${REPORT_LETTERHEAD_SRC}" alt="ترويسة المجلس اليمني للاختصاصات الطبية" />
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
      max-height: 18mm;
      height: auto;
      object-fit: contain;
      margin: 0 auto;
    }
    tbody tr { break-inside: avoid; page-break-inside: avoid; }
`;

const norm = (s: string) => (s || "").replace(/\s+/g, " ").trim();

// Build a printable HTML window — simplest reliable Arabic PDF route.
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
    @page { size: A4 ${orient}; margin: 10mm; padding: 0; }
    @page :first { margin-top: 10mm; }
    html { margin: 0; padding: 0; }
    body { 
      font-family: 'Cairo','Tajawal','Segoe UI',Tahoma,Arial,sans-serif; 
      direction: rtl; 
      color: #000 !important; 
      margin: 0; 
      padding: 8px; 
      width: auto; 
      background: white;
      line-height: 1.4;
      font-weight: 900 !important;
    }
    h1 { 
      text-align: center; 
      font-size: 14px; 
      font-weight: 900;
      margin: 0 0 4px; 
      color: #000 !important;
      letter-spacing: -0.01em;
    }
    table { 
      width: 100%;
      min-width: 100%;
      border-collapse: collapse; 
      font-size: ${fontSize}px; 
      table-layout: fixed;
      margin-top: 8px;
      overflow-wrap: anywhere;
      word-break: break-word;
    }
    th, td { 
      border: 1px solid #000; 
      padding: 0 !important;
      text-align: center; 
      vertical-align: middle;
      white-space: normal;
      overflow: hidden;
      text-overflow: clip;
      font-size: clamp(7px, 1.05vw, 13px);
      word-wrap: anywhere;
      overflow-wrap: anywhere;
      word-break: break-word;
      hyphens: auto;
      line-height: 1.1;
      max-height: 2.2em;
      font-weight: 900 !important;
      color: #000 !important;
    }
    .num, .numeric-cell, .date-cell {
      font-family: 'Times New Roman', Times, serif !important;
      font-size: clamp(7px, 0.95vw, 11px) !important;
      color: #000 !important;
      font-weight: 900 !important;
      direction: ltr;
      white-space: nowrap !important;
      overflow-wrap: normal !important;
      word-break: keep-all !important;
      hyphens: none !important;
      line-height: 1.05 !important;
    }
    .num *, .numeric-cell *, .date-cell * {
      font-size: inherit !important;
      white-space: nowrap !important;
      overflow-wrap: normal !important;
      word-break: keep-all !important;
    }
    th { 
      background: #1f7fb8;
      color: #000 !important;
      font-weight: 900;
      padding: 0 !important;
    }
    tr:nth-child(even) td { background: #f8fafc; }
    tr:nth-child(odd) td { background: #ffffff; }
    .meta { 
      font-size: 11px; 
      color: #000 !important; 
      margin: 4px 0 2px;
      text-align: center;
      font-weight: 900 !important;
    }
    .period {
      font-size: 11px;
      color: #000 !important;
      font-weight: 900 !important;
      margin: 2px 0 2px;
    }
    .total-row td {
      background: #1f7fb8 !important;
      color: #000 !important;
      font-weight: 900 !important;
    }
    .subtotal-row td {
      background: #cbd5e1;
      font-weight: 900 !important;
      color: #000 !important;
    }
    .group-row td {
      background: #fef3c7;
      font-weight: 900 !important;
      color: #000 !important;
    }
    @media print { 
      * { margin: 0; padding: 0; } 
      body { margin: 0; padding: 8px; background: white; }
      @page { margin: 10mm; }
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
  <script>window.onload=()=>{setTimeout(()=>window.print(),500)}</script>`;
  w.document.write(
    `<!doctype html><html lang="ar" dir="rtl"><head>${head}</head><body>${body}</body></html>`,
  );
  w.document.close();
}

export const hafizaPdf = (h: Hafiza[], reportDate?: string) =>
  exportToPdf({
    title: "حوافظ التوريد واشعارات التوريد",
    columns: [
      "م",
      "الاسم",
      "الدفعة",
      "التخصص",
      "التاريخ",
      "رقم الحافظة",
      "البيان",
      "مبلغ الحافظة",
      "تاريخ التوريد",
      "رقم الاشعار",
      "مبلغ التوريد",
    ],
    rows: h.map((x, i) => [
      i + 1,
      x.name,
      x.batch,
      x.specialty,
      x.date,
      x.hafizaNo,
      x.description,
      fmt(x.hafizaAmount),
      x.notifyDate || "",
      x.notifyNo || "",
      fmt(x.notifyAmount),
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
      i + 2,
      x.date,
      x.hafizaNo,
      x.notifyNo,
      x.notifyDate,
      x.checkNo,
      x.checkDate,
      x.description,
      x.specialty,
      x.name,
      fmt(x.hafizaAmount),
      fmt(x.income),
      fmt(x.expense),
      fmt(bal),
    ]);
  });
  exportToPdf({
    title: "حساب المجلس اليمني للاختصاصات الطبية - صعدة",
    columns: [
      "م",
      "التاريخ",
      "رقم الحافظة",
      "رقم الاشعار",
      "تاريخ التوريد",
      "رقم الشيك",
      "تاريخه",
      "البيان",
      "التخصص",
      "الاسم",
      "مبلغ الحافظة",
      "الإيرادات",
      "المصروفات",
      "الرصيد",
    ],
    rows,
    reportDate,
  });
};

export const journalPdf = (j: Journal[], reportDate?: string) =>
  exportToPdf({
    title: "دفتر اليومية العامة",
    columns: [
      "م",
      "رقم الاستمارة",
      "كشف التسوية",
      "التاريخ",
      "البيان",
      "ح/ مدين",
      "ح/ دائن",
      "مدين",
      "دائن",
    ],
    rows: j.map((x, i) => [
      i + 1,
      x.formNo,
      x.settlement || "",
      x.date,
      x.description,
      x.debitAccount || x.account,
      x.creditAccount || "",
      fmt(x.debit),
      fmt(x.credit),
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
  const reportDateLabel =
    formatReportDate(reportDate) || new Date().toLocaleDateString("ar-EG-u-nu-latn");
  const { map, groups, title, office, gov } = buildMonthlyStatementRows(
    journal,
    year,
    startMonth,
    endMonth,
  );
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
  body += `<div class="meta">تاريخ التقرير: ${reportDateLabel}</div>`;
  body += `<div class="meta period">${periodLabel}</div>`;
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

  let GPD = 0,
    GPC = 0,
    GCD = 0,
    GCC = 0;
  for (const g of groups) {
    body += `<tr class="group-row"><td colspan="9">${g.title}</td></tr>`;
    let gPD = 0,
      gPC = 0,
      gCD = 0,
      gCC = 0;
    for (const a of g.accounts) {
      const r = map[norm(a)] || { prevD: 0, prevC: 0, curD: 0, curC: 0 };
      const totD = r.prevD + r.curD,
        totC = r.prevC + r.curC;
      const balD = Math.max(0, totD - totC),
        balC = Math.max(0, totC - totD);
      gPD += r.prevD;
      gPC += r.prevC;
      gCD += r.curD;
      gCC += r.curC;
      body += `<tr><td class="acc">${a}</td><td>${fmtCell(r.prevD)}</td><td>${fmtCell(r.prevC)}</td><td>${fmtCell(r.curD)}</td><td>${fmtCell(r.curC)}</td><td>${fmtCell(totD)}</td><td>${fmtCell(totC)}</td><td>${fmtCell(balD)}</td><td>${fmtCell(balC)}</td></tr>`;
    }
    GPD += gPD;
    GPC += gPC;
    GCD += gCD;
    GCC += gCC;
    body += `<tr class="subtotal-row"><td>جملة ${g.title}</td><td>${fmt(gPD)}</td><td>${fmt(gPC)}</td><td>${fmt(gCD)}</td><td>${fmt(gCC)}</td><td>${fmt(gPD + gCD)}</td><td>${fmt(gPC + gCC)}</td><td>${fmt(Math.max(0, gPD + gCD - gPC - gCC))}</td><td>${fmt(Math.max(0, gPC + gCC - gPD - gCD))}</td></tr>`;
  }
  body += `<tr class="total-row"><td>الإجمالي العام</td><td>${fmt(GPD)}</td><td>${fmt(GPC)}</td><td>${fmt(GCD)}</td><td>${fmt(GCC)}</td><td>${fmt(GPD + GCD)}</td><td>${fmt(GPC + GCC)}</td><td>${fmt(Math.max(0, GPD + GCD - GPC - GCC))}</td><td>${fmt(Math.max(0, GPC + GCC - GPD - GCD))}</td></tr>`;
  body += `</tbody></table>`;

  const head = `<meta charset="utf-8"><title>${title} - ${periodLabel} - ${reportDateLabel}</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cairo:wght@600;700;800;900&family=Tajawal:wght@400;500;700;900&display=swap">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
${reportLetterheadStyles}
    @page { size: A4 landscape; margin: 8mm; padding: 0; }
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
      line-height: 1.35;
      font-weight: 900 !important;
    }
    h1 { 
      text-align: center; 
      font-size: 16px; 
      font-weight: 900;
      margin: 0 0 4px; 
      color: #000 !important;
      letter-spacing: -0.01em;
    }
    .meta { 
      text-align: center; 
      font-size: 13px; 
      color: #000 !important;
      font-weight: 900 !important;
    }
    .period { 
      font-weight: 900 !important; 
      color: #000 !important; 
      margin: 2px 0 4px;
      font-size: 12.5px;
    }
    /* table-layout: fixed + width: 100% يجبران الجدول على ملء عرض
       الصفحة الأفقية بالكامل بأعمدة متساوية العرض النسبي، بدل ترك
       العرض يتحدد حسب محتوى كل خلية (سبب عدم الملاءمة سابقاً) */
    table { 
      width: 100%;
      min-width: 100%;
      border-collapse: collapse; 
      font-size: 13.5px; 
      table-layout: fixed;
      margin-top: 6px;
    }
    /* عمود البيان (الأول) أعرض من أعمدة الأرقام الثمانية المتبقية،
       فيُعطى نسبة أكبر ليتسع لأسماء الحسابات الطويلة */
    th:first-child, td:first-child { width: 24%; }
    th:not(:first-child), td:not(:first-child) { width: calc(76% / 8); }
    th, td { 
      border: 1px solid #000; 
      padding: 0 !important;
      text-align: center;
      vertical-align: middle;
      white-space: normal;
      overflow: hidden;
      text-overflow: clip;
      font-size: clamp(7px, 1.2vw, 14px);
      word-wrap: anywhere;
      overflow-wrap: anywhere;
      word-break: break-word;
      font-weight: 900 !important;
      color: #000 !important;
      line-height: 1.1;
      max-height: 2.2em;
    }
    th { 
      background: #1f7fb8;
      color: #000 !important;
      font-weight: 900 !important;
      padding: 0 !important;
      font-size: 13px;
    }
    th:not(:first-child), td:not(:first-child) {
      font-family: 'Times New Roman', Times, serif !important;
      font-size: clamp(7px, 0.95vw, 11px) !important;
      white-space: nowrap !important;
      overflow-wrap: normal !important;
      word-break: keep-all !important;
      hyphens: none !important;
      line-height: 1.05 !important;
    }
    td.acc { 
      text-align: right; 
      padding-right: 0 !important;
      font-weight: 900 !important; 
      color: #000 !important;
    }
    tr.group-row td { 
      background: #fef3c7; 
      color: #000 !important; 
      font-weight: 900 !important; 
      text-align: center; 
    }
    tr.subtotal-row td { 
      background: #cbd5e1; 
      font-weight: 900 !important;
      color: #000 !important;
    }
    tr.total-row td { 
      background: #1f7fb8; 
      color: #000 !important; 
      font-weight: 900 !important; 
    }
    @media print { 
      * { margin: 0; padding: 0; } 
      body { margin: 0; padding: 6px; background: white; }
      @page { margin: 8mm; }
    }
  </style>`;
  w.document.write(
    `<!doctype html><html lang="ar" dir="rtl"><head>${head}</head><body>${body}<script>window.onload=()=>{setTimeout(()=>window.print(),500)}</script></body></html>`,
  );
  w.document.close();
}

import revSchema from "@/data/revenueTemplate.json";

type RType = { no: number; title: string };
type RItem = { no: number; title: string; types: RType[] };
type RSection = { no: number; title: string; items: RItem[] };
type RChapter = { no: number; title: string; longTitle?: string; sections: RSection[] };
const REV_SCHEMA = revSchema as { title: string; office: string; chapters: RChapter[] };
const MONTHS_PDF = [
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
];
const ORDER_AR = ["اﻷول", "الثاني", "الثالث", "الرابع", "الخامس"];

export function revenuePdf(
  revenue: Record<string, number>,
  year: number,
  month: number,
  reportDate?: string,
) {
  const reportDateLabel =
    formatReportDate(reportDate) || new Date().toLocaleDateString("ar-EG-u-nu-latn");
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
  let gCur = 0,
    gPrev = 0;
  REV_SCHEMA.chapters.forEach((ch) => {
    let cCur = 0,
      cPrev = 0;
    ch.sections.forEach((sec) => {
      let sCur = 0,
        sPrev = 0;
      sec.items.forEach((it) => {
        let iCur = 0,
          iPrev = 0;
        it.types.forEach((t) => {
          const k = `${ch.no}-${sec.no}-${it.no}-${t.no}`;
          const cur = get(month, k),
            prev = sumPrev(k);
          types[k] = { cur, prev };
          iCur += cur;
          iPrev += prev;
        });
        itemsAgg[`${ch.no}-${sec.no}-${it.no}`] = { cur: iCur, prev: iPrev };
        sCur += iCur;
        sPrev += iPrev;
      });
      sectionsAgg[`${ch.no}-${sec.no}`] = { cur: sCur, prev: sPrev };
      cCur += sCur;
      cPrev += sPrev;
    });
    chaptersAgg[`${ch.no}`] = { cur: cCur, prev: cPrev };
    gCur += cCur;
    gPrev += cPrev;
  });

  const w = window.open("", "_blank", "width=1100,height=800");
  if (!w) return;
  const fc = (n: number) => (n ? fmt(n) : "-");

  let body = `<h1>${REV_SCHEMA.title}</h1>`;
  body += `<div class="meta">${REV_SCHEMA.office}</div>`;
  body += `<div class="meta">تاريخ التقرير: ${reportDateLabel}</div>`;
  body += `<div class="meta period">عن شهر ${MONTHS_PDF[month - 1]} من العام المالي ${year}م</div>`;
  body += `<table><thead>
    ${reportLetterheadRow(8)}
    <tr>
      <th rowspan="2">بيان مفردات الموارد</th>
      <th rowspan="2">الباب</th><th rowspan="2">الفصل</th><th rowspan="2">البند</th><th rowspan="2">النوع</th>
      <th>الشهر الجاري</th><th>الأشهر السابقة</th><th>الجملة</th>
    </tr>
    <tr><th>ريال</th><th>ريال</th><th>ريال</th></tr>
  </thead><tbody>`;

  body += `<tr class="total-row"><td class="acc">إجمالي الموارد</td><td colspan="4"></td><td>${fc(gCur)}</td><td>${fc(gPrev)}</td><td>${fc(gCur + gPrev)}</td></tr>`;

  REV_SCHEMA.chapters.forEach((ch) => {
    if (ch.sections.length === 0) return;
    const a = chaptersAgg[ch.no];
    body += `<tr class="group-row"><td class="acc">${ch.longTitle || ch.title}</td><td>${ch.no}</td><td colspan="3"></td><td>${fc(a.cur)}</td><td>${fc(a.prev)}</td><td>${fc(a.cur + a.prev)}</td></tr>`;
    ch.sections.forEach((sec) => {
      const sa = sectionsAgg[`${ch.no}-${sec.no}`];
      body += `<tr class="subtotal-row"><td class="acc">&nbsp;&nbsp;${sec.title}</td><td></td><td>${sec.no}</td><td colspan="2"></td><td>${fc(sa.cur)}</td><td>${fc(sa.prev)}</td><td>${fc(sa.cur + sa.prev)}</td></tr>`;
      sec.items.forEach((it) => {
        const ia = itemsAgg[`${ch.no}-${sec.no}-${it.no}`];
        body += `<tr class="subtotal-row"><td class="acc">&nbsp;&nbsp;&nbsp;&nbsp;${it.title}</td><td colspan="2"></td><td>${it.no}</td><td></td><td>${fc(ia.cur)}</td><td>${fc(ia.prev)}</td><td>${fc(ia.cur + ia.prev)}</td></tr>`;
        it.types.forEach((t) => {
          const v = types[`${ch.no}-${sec.no}-${it.no}-${t.no}`];
          body += `<tr><td class="acc">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;${t.title}</td><td colspan="3"></td><td>${t.no}</td><td>${fc(v.cur)}</td><td>${fc(v.prev)}</td><td>${fc(v.cur + v.prev)}</td></tr>`;
        });
      });
    });
  });

  REV_SCHEMA.chapters.forEach((ch) => {
    const a = chaptersAgg[ch.no];
    body += `<tr class="group-row"><td class="acc">إجمالي ${ch.title}</td><td>${ch.no}</td><td colspan="3"></td><td>${fc(a.cur)}</td><td>${fc(a.prev)}</td><td>${fc(a.cur + a.prev)}</td></tr>`;
  });

  const head = `<meta charset="utf-8"><title>${REV_SCHEMA.title} - ${MONTHS_PDF[month - 1]} ${year}م - ${reportDateLabel}</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cairo:wght@600;700;800;900&family=Tajawal:wght@400;500;700;900&display=swap">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
${reportLetterheadStyles}
    @page { size: A4 landscape; margin: 8mm; padding: 0; }
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
      font-weight: 900 !important;
    }
    h1 { 
      text-align: center; 
      font-size: 18px; 
      font-weight: 900;
      margin: 0 0 4px; 
      color: #000 !important;
      letter-spacing: -0.01em;
    }
    .meta { 
      text-align: center; 
      font-size: 12px; 
      color: #000 !important;
      font-weight: 900 !important;
    }
    .period { 
      font-weight: 900 !important; 
      color: #000 !important; 
      margin: 1px 0 4px;
      font-size: 13px;
    }
    /* table-layout: fixed + width: 100% لملء عرض الصفحة الأفقية كاملة،
       مع عرض نسبي مخصص لكل عمود (بدل التوزيع المتساوي الافتراضي) */
    table { 
      width: 100%;
      min-width: 100%;
      border-collapse: collapse; 
      font-size: 12.5px; 
      table-layout: fixed;
      margin-top: 6px;
    }
    /* عمود "بيان مفردات الموارد" (الأول) أعرض بكثير من البقية لأنه
       يحتوي نصوصاً طويلة مع مسافات بادئة هرمية (باب/فصل/بند/نوع) */
    th:nth-child(1), td:nth-child(1) { width: 38%; }
    th:nth-child(2), td:nth-child(2),
    th:nth-child(3), td:nth-child(3),
    th:nth-child(4), td:nth-child(4),
    th:nth-child(5), td:nth-child(5) { width: 5.5%; }
    th:nth-child(6), td:nth-child(6),
    th:nth-child(7), td:nth-child(7),
    th:nth-child(8), td:nth-child(8) { width: 13%; }
    th, td { 
      border: 1px solid #000; 
      padding: 0 !important;
      text-align: center;
      vertical-align: middle;
      white-space: normal;
      overflow: hidden;
      text-overflow: clip;
      font-size: clamp(7px, 1.2vw, 14px);
      word-wrap: anywhere;
      overflow-wrap: anywhere;
      word-break: break-word;
      font-weight: 900 !important;
      color: #000 !important;
      line-height: 1.1;
      max-height: 2.2em;
    }
    th { 
      background: #1f7fb8;
      color: #000 !important;
      font-weight: 900 !important;
      padding: 0 !important;
      font-size: 12px;
    }
    th:not(:first-child), td:not(:first-child) {
      font-family: 'Times New Roman', Times, serif !important;
      font-size: clamp(7px, 0.95vw, 11px) !important;
      white-space: nowrap !important;
      overflow-wrap: normal !important;
      word-break: keep-all !important;
      hyphens: none !important;
      line-height: 1.05 !important;
    }
    td.acc { 
      text-align: right; 
      padding-right: 0 !important;
      font-weight: 900 !important; 
      color: #000 !important;
    }
    tr.group-row td { 
      background: #fef3c7; 
      color: #000 !important; 
      font-weight: 900 !important; 
      text-align: center; 
    }
    tr.subtotal-row td { 
      background: #cbd5e1; 
      font-weight: 900 !important;
      color: #000 !important;
    }
    tr.total-row td { 
      background: #1f7fb8; 
      color: #000 !important; 
      font-weight: 900 !important; 
    }
    @media print { 
      * { margin: 0; padding: 0; } 
      body { margin: 0; padding: 6px; background: white; }
      @page { margin: 8mm; }
    }
  </style>`;
  w.document.write(
    `<!doctype html><html lang="ar" dir="rtl"><head>${head}</head><body>${body}<script>window.onload=()=>{setTimeout(()=>window.print(),500)}</script></body></html>`,
  );
  w.document.close();
}
