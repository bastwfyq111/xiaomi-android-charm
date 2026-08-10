import { fmt } from './format';
import { buildTableHtml, escapeHtml, tablePrintStyles } from './printTableHtml';

/**
 * توليد PDF من HTML حقيقي (يعرضه المتصفح) بدل الرسم البرمجي
 * السبب: jsPDF لا يدعم تشكيل الحروف العربية ولا اتجاه الأرقام،
 * فكانت الملفات تخرج بدون نص عربي وبأرقام مقلوبة.
 */
async function htmlToPdf(opts: {
  html: string;
  css: string;
  fileName: string;
  orientation?: 'portrait' | 'landscape';
  /** عرض ورقة العمل بالبكسل (A4 عرضي ≈ 1123، طولي ≈ 794) */
  pageWidthPx?: number;
}): Promise<void> {
  const { html, css, fileName, orientation = 'landscape' } = opts;
  const pageWidthPx = opts.pageWidthPx ?? (orientation === 'landscape' ? 1123 : 794);

  // نعرض المحتوى داخل iframe معزول تماماً حتى لا يرث أنماط التطبيق
  // (أنماط Tailwind تستخدم oklch وهي غير مدعومة في محرك التصوير)
  const frame = document.createElement('iframe');
  frame.setAttribute('aria-hidden', 'true');
  frame.style.position = 'fixed';
  frame.style.top = '0';
  frame.style.left = '-10000px';
  frame.style.width = `${pageWidthPx}px`;
  frame.style.height = '600px';
  frame.style.border = '0';
  frame.style.opacity = '0';
  frame.style.pointerEvents = 'none';
  document.body.appendChild(frame);

  try {
    const fdoc = frame.contentDocument!;
    fdoc.open();
    fdoc.write(`<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8" />
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
      <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      <style>${css}</style>
      <style>
        /* تحسينات خاصة بالتصوير: حدود واضحة ومسافات لا تقطع الأرقام */
        .pdf-page th, .pdf-page td { border: 1px solid #000 !important; padding: 6px 7px !important; line-height: 1.6 !important; }
        .pdf-page .num { font-family: 'Cairo', Tahoma, Arial, sans-serif !important; font-weight: 700 !important; letter-spacing: 0.3px; }
        .pdf-page .sub { border-bottom-width: 2px !important; padding-bottom: 6px !important; margin-bottom: 8px !important; }
        .pdf-page .total-row td { border-top: 2px solid #92400e !important; }
      </style></head>

      <body><div class="pdf-page">${html}</div></body></html>`);
    fdoc.close();

    
    if ((fdoc as any).fonts?.ready) {
      await Promise.race([
        (fdoc as any).fonts.ready,
        new Promise((res) => setTimeout(res, 3000)),
      ]);
    }
    await new Promise((res) => setTimeout(res, 120));

    const page = fdoc.querySelector('.pdf-page') as HTMLElement;
    const contentH = Math.max(page.scrollHeight, 400);
    frame.style.height = `${contentH + 40}px`;
    await new Promise((res) => setTimeout(res, 80));

    const [{ default: html2canvas }, { default: JsPDF }] = await Promise.all([
      import('html2canvas'),
      import('jspdf'),
    ]);

    const scale = 2;
    const canvas = await html2canvas(page, {
      scale,
      useCORS: true,
      backgroundColor: '#ffffff',
      width: pageWidthPx,
      height: contentH,
      windowWidth: pageWidthPx,
      windowHeight: contentH + 40,
      scrollX: 0,
      scrollY: 0,
    });

    const pdf = new JsPDF({ unit: 'mm', format: 'a4', orientation, compress: true });
    const pw = pdf.internal.pageSize.getWidth();
    const ph = pdf.internal.pageSize.getHeight();
    const margin = 5;
    const imgW = pw - margin * 2;
    const pxPerMm = canvas.width / imgW;
    const pageContentPx = Math.floor((ph - margin * 2) * pxPerMm);

    let offset = 0;
    let first = true;
    while (offset < canvas.height) {
      const sliceH = Math.min(pageContentPx, canvas.height - offset);
      const slice = document.createElement('canvas');
      slice.width = canvas.width;
      slice.height = sliceH;
      const ctx = slice.getContext('2d')!;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, slice.width, slice.height);
      ctx.drawImage(canvas, 0, offset, canvas.width, sliceH, 0, 0, canvas.width, sliceH);

      if (!first) pdf.addPage();
      first = false;
      pdf.addImage(
        slice.toDataURL('image/jpeg', 0.95),
        'JPEG',
        margin,
        margin,
        imgW,
        sliceH / pxPerMm
      );
      offset += sliceH;
    }

    // Data URI بدلاً من Blob لتوافق أندرويد/شاومي
    const dataUri = pdf.output('datauristring');
    const link = document.createElement('a');
    link.href = dataUri;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } finally {
    frame.remove();
  }

}


const statementCss = `
  ${tablePrintStyles}
  body, .pdf-page { font-size: 12px; }
  .info { width: 100%; border-collapse: collapse; margin: 6px 0 10px; }
  .info td { border: 0.75pt solid #000; padding: 6px 8px; text-align: right; font-weight: 700; }
  .info td.lbl { background: #f1f5f9 !important; width: 22%; }
  .sign { margin-top: 18px; font-weight: 700; font-size: 11px; }
`;

/**
 * تصدير كشف حساب المتدرب كملف PDF (عربي صحيح، أرقام غير مقلوبة)
 */
export async function exportStudentStatementPdf(row: any, year: number): Promise<void> {
  const safeName = (row.name || 'متدرب').replace(/[^\u0600-\u06FFa-zA-Z0-9._-]/g, '_');
  const fileName = `كشف_حساب_${safeName}_${year}.pdf`;

  const monthsList =
    year === 2025
      ? ["يونيو 2024", "يوليو 2024", "أغسطس 2024", "مارس 2025", "ابريل 2025", "مايو 2025", "يونيو 2025", "يوليو 2025", "أغسطس 2025", "سبتمبر 2025", "أكتوبر 2025", "نوفمبر2025", "ديسمبر2025"]
      : ["يناير", "فبراير", "مارس", "ابريل", "مايو", "يونيو", "يوليو", "اغسطس", "سبتمبر", "اكتوبر ", "نوفمبر", "ديسمبر"];

  const fees = Number(String(row.fees || 0).replace(/[^0-9.-]/g, "")) || 0;
  const prevDue = Number(String(row.prevDue || 0).replace(/[^0-9.-]/g, "")) || 0;
  const totalPaid = monthsList.reduce((s, m) => s + (Number(row.payments?.[m]) || 0), 0);
  const dueTotal = year === 2026 ? prevDue || fees : fees;
  const remaining = dueTotal - totalPaid;

  const lines: { label: string; value: number; color?: string }[] = [];
  lines.push({ label: 'إجمالي الرسوم المستحقة', value: fees, color: '#dbeafe' });
  if (year === 2026) {
    lines.push({ label: 'متبقي من العام 2025 (مدور)', value: prevDue, color: '#fde68a' });
  }
  lines.push({ label: 'إجمالي المبلغ المطلوب', value: dueTotal, color: '#fca5a5' });
  monthsList.forEach((m) => {
    const val = Number(row.payments?.[m]) || 0;
    if (val > 0) lines.push({ label: `سداد شهر ${m}`, value: val });
  });
  lines.push({ label: 'إجمالي المسدد (له)', value: totalPaid, color: '#a7f3d0' });
  lines.push({
    label: remaining > 0 ? 'الرصيد المتبقي (عليه)' : 'الرصيد الإضافي (له)',
    value: Math.abs(remaining),
    color: '#fecaca',
  });

  const today = new Date().toLocaleDateString('ar-EG-u-nu-latn');

  const html = `
    <h1>المجلس اليمني للاختصاصات الطبية</h1>
    <div class="sub">كشف حساب رسمي - للعام ${year}م • ${today}</div>
    <table class="info">
      <tr>
        <td class="lbl">اسم المتدرب</td><td>${escapeHtml(row.name || '—')}</td>
        <td class="lbl">الدفعة</td><td>${escapeHtml(row.batch || '—')}</td>
      </tr>
      <tr>
        <td class="lbl">المساق</td><td>${escapeHtml(row.specialty || '—')}</td>
        <td class="lbl">رقم الهاتف</td><td>${escapeHtml(row.phone || '—')}</td>
      </tr>
    </table>
    <table>
      <thead><tr><th>البيان</th><th>المبلغ</th></tr></thead>
      <tbody>
        ${lines
          .map(
            (l) =>
              `<tr><td style="text-align:right;${l.color ? `background:${l.color} !important;` : ''}">${escapeHtml(
                l.label
              )}</td><td class="num"${l.color ? ` style="background:${l.color} !important;"` : ''}>${escapeHtml(
                fmt(l.value)
              )}</td></tr>`
          )
          .join('')}
      </tbody>
    </table>
    <div class="sign">تاريخ الإصدار: ${today}</div>
    <div class="sign">التوقيع: _______________</div>
  `;

  await htmlToPdf({ html, css: statementCss, fileName, orientation: 'portrait' });
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
// تصدير أي جدول (كشف/تبويب) إلى PDF مطابق تماماً لتنسيق الطباعة
// عبر رسم نفس HTML الطباعة ثم تحويله إلى PDF (عربي صحيح + أرقام سليمة)
// ============================================================

export async function exportTablePdf(opts: {
  title: string;
  columns: { key: string; label: string }[];
  rows: Record<string, any>[];
  numericKeys?: string[];
  fileName: string;
}): Promise<void> {
  const { title, columns, rows, numericKeys = [], fileName } = opts;

  const html = buildTableHtml({ title, columns, rows, numericKeys });
  const safeDate = new Date().toISOString().slice(0, 10);

  await htmlToPdf({
    html,
    css: tablePrintStyles,
    fileName: `${fileName}-${safeDate}.pdf`,
    orientation: 'landscape',
  });
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
