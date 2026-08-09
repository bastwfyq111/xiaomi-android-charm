import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { fmt } from './format';
import { CAIRO_FONT_BASE64 } from './cairo-font';

/**
 * تصدير كشف حساب المتدرب كملف PDF متوافق تماماً مع هواتف شاومي وأندرويد
 * يستخدم التوليد البرمجي المباشر لضمان السرعة وعدم تعليق الجهاز
 */
export async function exportStudentStatementPdf(row: any, year: number): Promise<void> {
  const safeName = (row.name || 'متدرب').replace(/[^\u0600-\u06FFa-zA-Z0-9._-]/g, '_');
  const fileName = `كشف_حساب_${safeName}_${year}.pdf`;

  // إنشاء مستند PDF جديد
  const doc = new jsPDF({
    orientation: 'p',
    unit: 'mm',
    format: 'a4',
    putOnlyUsedFonts: true,
    compress: true
  });

  // إعدادات الخطوط العربية (استخدام الخط الافتراضي مع دعم RTL)
  doc.setR2L(true);
  
  // العنوان الرئيسي
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text("المجلس اليمني للاختصاصات الطبية", 105, 15, { align: 'center' });
  
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(`كشف حساب رسمي - للعام ${year}م`, 105, 22, { align: 'center' });

  // خط فاصل
  doc.setDrawColor(31, 127, 184);
  doc.setLineWidth(0.5);
  doc.line(10, 26, 200, 26);

  // معلومات المتدرب
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  
  // إطار معلومات المتدرب
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(1);
  doc.rect(10, 30, 190, 28);
  
  // إضافة خطوط داخلية للإطار
  doc.line(105, 30, 105, 58);
  doc.line(10, 39, 200, 39);
  doc.line(10, 48, 200, 48);
  
  const infoY = 34;
  doc.setFont('helvetica', 'bold');
  doc.text("اسم المتدرب:", 15, infoY);
  doc.setFont('helvetica', 'normal');
  doc.text(row.name || '—', 50, infoY);
  
  doc.setFont('helvetica', 'bold');
  doc.text("الدفعة:", 110, infoY);
  doc.setFont('helvetica', 'normal');
  doc.text(row.batch || '—', 145, infoY);
  
  doc.setFont('helvetica', 'bold');
  doc.text("المساق:", 15, infoY + 9);
  doc.setFont('helvetica', 'normal');
  doc.text(row.specialty || '—', 50, infoY + 9);
  
  doc.setFont('helvetica', 'bold');
  doc.text("رقم الهاتف:", 110, infoY + 9);
  doc.setFont('helvetica', 'normal');
  doc.text(row.phone || '—', 145, infoY + 9);

  // البيانات المالية
  const monthsList = year === 2025 ? 
    ["يونيو 2024", "يوليو 2024", "أغسطس 2024", "مارس 2025", "ابريل 2025", "مايو 2025", "يونيو 2025", "يوليو 2025", "أغسطس 2025", "سبتمبر 2025", "أكتوبر 2025", "نوفمبر2025", "ديسمبر2025"] : 
    ["يناير", "فبراير", "مارس", "ابريل", "مايو", "يونيو", "يوليو", "اغسطس", "سبتمبر", "اكتوبر ", "نوفمبر", "ديسمبر"];

  const fees = Number(String(row.fees || 0).replace(/[^0-9.-]/g, "")) || 0;
  const prevDue = Number(String(row.prevDue || 0).replace(/[^0-9.-]/g, "")) || 0;
  const totalPaid = monthsList.reduce((s, m) => s + (Number(row.payments?.[m]) || 0), 0);
  const dueTotal = year === 2026 ? prevDue || fees : fees;
  const remaining = dueTotal - totalPaid;

  const tableRows = [];
  tableRows.push(["إجمالي الرسوم المستحقة", fmt(fees)]);
  if (year === 2026) {
    tableRows.push(["متبقي من العام 2025 (مدور)", fmt(prevDue)]);
  }
  tableRows.push(["إجمالي المبلغ المطلوب", fmt(dueTotal)]);
  
  // تفاصيل السداد
  monthsList.forEach(m => {
    const val = Number(row.payments?.[m]) || 0;
    if (val > 0) {
      tableRows.push([`سداد شهر ${m}`, fmt(val)]);
    }
  });

  tableRows.push(["إجمالي المسدد (له)", fmt(totalPaid)]);
  tableRows.push([remaining > 0 ? "الرصيد المتبقي (عليه)" : "الرصيد الإضافي (له)", fmt(Math.abs(remaining))]);

  // إنشاء الجدول برمجياً (سريع جداً)
  // ألوان الخلفية المميزة لكل صف
  const rowColors: [number, number, number][] = [];
  const totalRows = tableRows.length;
  tableRows.forEach((row, i) => {
    const label = row[0] as string;
    if (label === 'إجمالي الرسوم المستحقة') {
      rowColors[i] = [219, 234, 254]; // أزرق فاتح #dbeafe
    } else if (label.includes('مدور') || label.includes('2025')) {
      rowColors[i] = [253, 230, 138]; // أصفر #fde68a
    } else if (label === 'إجمالي المبلغ المطلوب') {
      rowColors[i] = [252, 165, 165]; // أحمر فاتح #fca5a5
    } else if (label.includes('المسدد')) {
      rowColors[i] = [167, 243, 208]; // أخضر فاتح #a7f3d0
    } else if (label.includes('المتبقي') || label.includes('الإضافي') || label.includes('تم السداد')) {
      rowColors[i] = [254, 202, 202]; // أحمر أفتح #fecaca
    } else {
      rowColors[i] = [255, 255, 255]; // أبيض
    }
  });

  autoTable(doc, {
    startY: 62,
    head: [['البيان', 'المبلغ']],
    body: tableRows,
    styles: { 
      font: 'helvetica', 
      halign: 'center', 
      fontSize: 11,
      cellPadding: 5,
      lineColor: [0, 0, 0],
      lineWidth: 1
    },
    headStyles: { 
      fillColor: [31, 127, 184], 
      textColor: [255, 255, 255], 
      halign: 'center',
      fontStyle: 'bold',
      fontSize: 12
    },
    bodyStyles: {
      lineColor: [0, 0, 0],
      lineWidth: 1
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252]
    },
    columnStyles: {
      0: { cellWidth: 130, halign: 'right' },
      1: { cellWidth: 60, halign: 'center', fontStyle: 'bold' }
    },
    theme: 'grid',
    margin: { top: 62, right: 10, bottom: 20, left: 10 },
    didParseCell: function(data: any) {
      if (data.section === 'body' && data.row.index !== undefined) {
        data.cell.styles.fillColor = rowColors[data.row.index] || [255, 255, 255];
      }
    }
  });

  // إضافة توقيع وتاريخ في الأسفل
  const finalY = (doc as any).lastAutoTable?.finalY ?? 150;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`تاريخ الإصدار: ${new Date().toLocaleDateString('ar-EG-u-nu-latn')}`, 15, finalY + 15);
  doc.setFont('helvetica', 'bold');
  doc.text("التوقيع: _______________", 15, finalY + 25);

  // الحل السحري لشاومي: استخدام Data URI بدلاً من Blob
  // هذا يفتح الملف مباشرة أو يبدأ تنزيله دون تعليق
  const pdfData = doc.output('datauristring');
  
  // إنشاء رابط مخفي والنقر عليه
  const link = document.createElement('a');
  link.href = pdfData;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// دالة محسّنة للطباعة من HTML
export function printHtmlContent(htmlContent: string): void {
  const w = window.open('', '_blank');
  if (!w) return;
  
  // إضافة أنماط CSS محسّنة للطباعة
  const styledContent = `
    <!DOCTYPE html>
    <html lang="ar" dir="rtl">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>طباعة</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        @page { size: A4; margin: 10mm; }
        body {
          font-family: 'Cairo', 'Tajawal', 'Segoe UI', Tahoma, Arial, sans-serif;
          direction: rtl;
          color: #000 !important;
          background: white;
          line-height: 1.5;
          font-size: 12px;
          font-weight: 900 !important;
        }
        h1, h2, h3, h4, h5, h6 {
          font-weight: 800;
          letter-spacing: -0.01em;
          margin: 8px 0;
          color: #000 !important;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin: 10px 0;
        }
        th, td {
          border: 1px solid #000;
          padding: 6px;
          text-align: center;
          vertical-align: middle;
          color: #000 !important;
          font-weight: 900 !important;
        }
        th {
          background: #1f7fb8;
          color: #000 !important;
          font-weight: 900 !important;
        }
        tr:nth-child(even) td {
          background: #f8fafc;
        }
        @media print {
          * { margin: 0; padding: 0; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          body { background: white; color: #000 !important; font-weight: 900 !important; }
          th, td { color: #000 !important; font-weight: 900 !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          .no-print { display: none !important; }
        }
      </style>
    </head>
    <body>
      ${htmlContent}
      <script>
        window.onload = () => {
          setTimeout(() => {
            window.print();
          }, 500);
        };
      </script>
    </body>
    </html>
  `;
  
  w.document.write(styledContent);
  w.document.close();
}

// دالة إضافية لطباعة جدول بتنسيق احترافي
export function printTable(title: string, columns: string[], rows: (string | number)[][]): void {
  const tableHtml = `
    <h1>${title}</h1>
    <div style="text-align: center; color: #000 !important; margin-bottom: 15px; font-weight: 700;">
      ${new Date().toLocaleDateString('ar-EG-u-nu-latn')}
    </div>
    <table>
      <thead>
        <tr>
          ${columns.map(col => `<th>${col}</th>`).join('')}
        </tr>
      </thead>
      <tbody>
        ${rows.map(row => `
          <tr>
            ${row.map(cell => `<td>${cell === undefined || cell === null ? '' : cell}</td>`).join('')}
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
  
  printHtmlContent(tableHtml);
}

// ============================================================
// تصدير أي جدول (كشف/تبويب) إلى PDF مطابق لتنسيق الطباعة الحالي
// باستخدام بناء برمجي مباشر (بدون التقاط صور) — أسرع وأكثر استقراراً
// خط Cairo مضمّن داخل الملف نفسه (من cairo-font.ts) لضمان ظهور
// العربي بشكل صحيح دائماً بغض النظر عن حالة الاتصال أو المتصفح
// ============================================================

let fontRegistered = false;

function registerCairoFont(doc: any) {
  if (fontRegistered) return;
  doc.addFileToVFS("Cairo-Regular.ttf", CAIRO_FONT_BASE64);
  doc.addFont("Cairo-Regular.ttf", "Cairo", "normal");
  doc.addFont("Cairo-Regular.ttf", "Cairo", "bold"); // نفس الملف، jsPDF يحتاج تسجيل الاسم فقط
  fontRegistered = true;
}

export function exportTablePdf(opts: {
  title: string;
  columns: { key: string; label: string }[];
  rows: Record<string, any>[];
  numericKeys?: string[];
  fileName: string;
}) {
  const { title, columns, rows, numericKeys = [], fileName } = opts;

  const doc = new jsPDF({
    orientation: "l", // landscape — نفس اتجاه الطباعة الحالي
    unit: "mm",
    format: "a4",
    putOnlyUsedFonts: true,
    compress: true,
  });

  registerCairoFont(doc);
  doc.setFont("Cairo", "normal");
  doc.setR2L(true);

  // العنوان
  doc.setFontSize(15);
  doc.text(title, doc.internal.pageSize.getWidth() / 2, 12, { align: "center" });

  // السطر الفرعي (نفس نص .sub في الطباعة)
  const today = new Date().toLocaleDateString("ar-EG-u-nu-latn");
  doc.setFontSize(9.5);
  doc.text(
    `المجلس اليمني للاختصاصات الطبية - صعدة • ${today} • عدد السجلات: ${rows.length}`,
    doc.internal.pageSize.getWidth() / 2,
    18,
    { align: "center" }
  );

  // حساب الإجماليات (نفس منطق صف total-row في الطباعة)
  const totals: Record<string, number> = {};
  columns.forEach((c) => {
    if (numericKeys.includes(c.key)) {
      totals[c.key] = rows.reduce((sum, r) => sum + (Number(r[c.key]) || 0), 0);
    }
  });

  const head = [["م", ...columns.map((c) => c.label)]];
  const body = rows.map((r, i) => [
    String(i + 1),
    ...columns.map((c) => {
      const v = r[c.key];
      const isNum = numericKeys.includes(c.key) || typeof v === "number";
      return isNum ? fmt(Number(v) || 0) : String(v ?? "");
    }),
  ]);
  const totalRowData = [
    "",
    ...columns.map((c) => (numericKeys.includes(c.key) ? fmt(totals[c.key] || 0) : "")),
  ];
  body.push(totalRowData);
  const totalRowIndex = body.length - 1;

  autoTable(doc, {
    head,
    body,
    startY: 22,
    styles: {
      font: "Cairo",
      fontStyle: "normal",
      halign: "center",
      valign: "middle",
      fontSize: 8.5,
      cellPadding: 1.5,
      lineColor: [0, 0, 0],
      lineWidth: 0.2,
      textColor: [0, 0, 0],
    },
    headStyles: {
      fillColor: [245, 222, 179], // نفس لون #f5deb3 في الطباعة
      textColor: [0, 0, 0],
      fontStyle: "normal",
      fontSize: 9,
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252], // نفس #f8fafc
    },
    didParseCell: (data: any) => {
      // تلوين صف الإجمالي بنفس لون الطباعة (#fef3c7)
      if (data.row.index === totalRowIndex && data.section === "body") {
        data.cell.styles.fillColor = [254, 243, 199];
        data.cell.styles.fontStyle = "bold";
      }
    },
    margin: { left: 6, right: 6 },
    theme: "grid",
  });

  const safeDate = new Date().toISOString().slice(0, 10);
  const finalFileName = `${fileName}-${safeDate}.pdf`;

  // نفس الحل المستخدم في exportStudentStatementPdf: Data URI بدلاً من Blob
  // (doc.save() الافتراضية تعتمد على Blob، وهذا يُعلّق أو يفشل بصمت
  // على متصفحات أندرويد/شاومي — استخدام Data URI + رابط مخفي يحل المشكلة)
  const pdfData = doc.output("datauristring");
  const link = document.createElement("a");
  link.href = pdfData;
  link.download = finalFileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
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

export function revenuePdf(revenue: Record<string, number>, year: number, month: number) {
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
  body += `<div class="meta period">عن شهر ${MONTHS_PDF[month - 1]} من العام المالي ${year}م</div>`;
  body += `<table><thead>
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

  const head = `<meta charset="utf-8"><title>${REV_SCHEMA.title} - ${MONTHS_PDF[month - 1]} ${year}م</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cairo:wght@600;700;800;900&family=Tajawal:wght@400;500;700;900&display=swap">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    @page { size: A4 landscape; margin: 10mm; padding: 0; }
    @page :first { margin-top: 10mm; }
    html { margin: 0; padding: 0; }
        body { 
      font-family: 'Cairo','Tajawal','Segoe UI',Tahoma,Arial,sans-serif; 
      direction: rtl; 
      color: #000 !important; 
      margin: 0; 
      padding: 8px; 
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
      margin: 1px 0 1px;
      font-size: 13px;
    }
    table { 
      width: 100%; 
      border-collapse: collapse; 
      font-size: 10px; 
      table-layout: fixed;
      margin-top: 8px;
    }
    th, td { 
      border: 1.5px solid #000; 
      padding: 1px 1px; 
      text-align: center;
      vertical-align: middle;
      white-space: normal;
      word-wrap: break-word; 
      overflow-wrap: break-word; 
      word-break: break-word;
      font-weight: 900 !important;
      color: #000 !important;
    }
    th { 
      background: #1f7fb8;
      color: #000 !important;
      font-weight: 900 !important;
      padding: 1px 1px;
    }
    td.acc { 
      text-align: center; 
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
      body { margin: 0; padding: 8px; background: white; }
      @page { margin: 10mm; }
    }
  </style>`;
  w.document.write(
    `<!doctype html><html lang="ar" dir="rtl"><head>${head}</head><body>${body}<script>window.onload=()=>{setTimeout(()=>window.print(),500)}</script></body></html>`,
  );
  w.document.close();
}
