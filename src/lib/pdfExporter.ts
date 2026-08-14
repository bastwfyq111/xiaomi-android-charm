import { fmt } from './format';
import {
  buildTableHtml,
  escapeHtml,
  reportLetterheadHtml,
  tablePrintStyles,
} from './printTableHtml';

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
        .pdf-page th, .pdf-page td { border: 1px solid #000 !important; padding: 7px 8px 9px !important; line-height: 1.25 !important; vertical-align: middle !important; }
        .pdf-page .num { font-family: 'Cairo', Tahoma, Arial, sans-serif !important; font-weight: 700 !important; letter-spacing: 0.3px; }
        .pdf-page .sub { border-bottom-width: 2px !important; padding-bottom: 6px !important; margin-bottom: 8px !important; }
        .pdf-page .total-row td { border-top: 2px solid #92400e !important; }
      </style></head>

      <body><div class="pdf-page">${reportLetterheadHtml()}${html}</div></body></html>`);
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

/**
 * توليد PDF لجدول طويل مع تكرار رأس الأعمدة فعلياً في كل صفحة.
 * بخلاف htmlToPdf (التي تصوّر المحتوى كصورة طويلة وتقصّه عشوائياً)،
 * هذه الدالة تحسب عدد الصفوف التي تتسع في صفحة واحدة، ثم تبني
 * "صفحة HTML" مستقلة لكل مجموعة صفوف — كل صفحة فيها <thead> خاص بها،
 * فيُصوَّر كل جدول-صفحة على حدة ويُضاف كصفحة PDF منفصلة تحتوي رأساً كاملاً.
 */
async function htmlTableToPdfPaginated(opts: {
  title: string;
  columns: { key: string; label: string }[];
  rows: Record<string, any>[];
  numericKeys?: string[];
  css: string;
  fileName: string;
  orientation?: 'portrait' | 'landscape';
  pageWidthPx?: number;
  reportDate?: string;
}): Promise<void> {
  const {
    title,
    columns,
    rows,
    numericKeys = [],
    css,
    fileName,
    orientation = 'landscape',
    reportDate,
  } = opts;
  const pageWidthPx = opts.pageWidthPx ?? (orientation === 'landscape' ? 1123 : 794);
  // ارتفاع صفحة A4 في نفس مقياس البكسل المستخدم للعرض
  const pageHeightPx = Math.round(
    pageWidthPx * (orientation === 'landscape' ? 210 / 297 : 297 / 210)
  );

  const [{ default: html2canvas }, { default: JsPDF }] = await Promise.all([
    import('html2canvas'),
    import('jspdf'),
  ]);

  // إطار قياس مخفي: نستخدمه لمعرفة ارتفاع رأس الجدول وارتفاع صف واحد فعلياً
  // (يعتمد على طول النص الفعلي والالتفاف، فلا يمكن تخمينه رياضياً بدقة)
  const measureFrame = document.createElement('iframe');
  measureFrame.setAttribute('aria-hidden', 'true');
  measureFrame.style.position = 'fixed';
  measureFrame.style.top = '0';
  measureFrame.style.left = '-10000px';
  measureFrame.style.width = `${pageWidthPx}px`;
  measureFrame.style.height = '4000px';
  measureFrame.style.border = '0';
  measureFrame.style.opacity = '0';
  measureFrame.style.pointerEvents = 'none';
  document.body.appendChild(measureFrame);

  const fullHtml = buildTableHtml({ title, columns, rows, numericKeys, reportDate });

  try {
    const mdoc = measureFrame.contentDocument!;
    mdoc.open();
    mdoc.write(`<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8" />
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
      <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      <style>${css}</style>
      <style>.pdf-page th, .pdf-page td { border: 1px solid #000 !important; padding: 7px 8px 9px !important; line-height: 1.25 !important; vertical-align: middle !important; }</style>
      </head><body><div class="pdf-page">${fullHtml}</div></body></html>`);
    mdoc.close();

    if ((mdoc as any).fonts?.ready) {
      await Promise.race([(mdoc as any).fonts.ready, new Promise((res) => setTimeout(res, 3000))]);
    }
    await new Promise((res) => setTimeout(res, 120));

    const headerEl = mdoc.querySelector('.pdf-page h1') as HTMLElement;
    const subEl = mdoc.querySelector('.pdf-page .sub') as HTMLElement;
    const theadEl = mdoc.querySelector('.pdf-page thead') as HTMLElement;
    const bodyRows = Array.from(mdoc.querySelectorAll('.pdf-page tbody tr')) as HTMLElement[];

    const topBlockH = (headerEl?.offsetHeight || 0) + (subEl?.offsetHeight || 0) + 16;
    const theadH = theadEl?.offsetHeight || 0;
    // آخر صف هو صف الإجمالي؛ يجب أن يبقى مرتبطاً بآخر صفحة دائماً
    const totalRowH = bodyRows.length ? bodyRows[bodyRows.length - 1].offsetHeight : 0;
    const dataRows = bodyRows.slice(0, -1);
    const rowHeights = dataRows.map((r) => r.offsetHeight);

    // هامش فعلي واحد صغير (يُستخدم بنفس القيمة في التوزيع والرسم لاحقاً)
    const margin = 3; // مم
    // دقة العرض الفعلية (96 نقطة/بوصة قياسي للمتصفح) — نفس الوحدة المستخدمة
    // لقياس العناصر بالـ iframe (offsetHeight بالبكسل) ولرسم الصورة النهائية،
    // فيتطابق حساب "كم صف يتسع بصفحة" مع "كم صف نرسمه فعلياً" بدقة
    const DPI = 96;
    const pxPerMm = DPI / 25.4;
    const pdf = new JsPDF({ unit: 'mm', format: 'a4', orientation, compress: true });
    const pw = pdf.internal.pageSize.getWidth();
    const ph = pdf.internal.pageSize.getHeight();
    const usableHeightPx = (ph - margin * 2) * pxPerMm;
    const usableWidthMm = pw - margin * 2;

    // توزيع الصفوف على صفحات: الصفحة الأولى تتضمن العنوان، البقية لا
    const pages: number[][] = [];
    let current: number[] = [];
    let currentH = topBlockH + theadH;
    for (let i = 0; i < rowHeights.length; i++) {
      const rh = rowHeights[i];
      // نحجز مسبقاً مساحة صف الإجمالي في آخر صفحة محتملة فقط عند آخر صف فعلي
      const isLast = i === rowHeights.length - 1;
      const neededExtra = isLast ? totalRowH : 0;
      if (current.length > 0 && currentH + rh + neededExtra > usableHeightPx) {
        pages.push(current);
        current = [];
        currentH = theadH; // الصفحات التالية تبدأ برأس الجدول فقط (بدون العنوان)
      }
      current.push(i);
      currentH += rh;
    }
    if (current.length > 0) pages.push(current);
    if (pages.length === 0) pages.push([]);

    for (let p = 0; p < pages.length; p++) {
      const isFirstPage = p === 0;
      const isLastPage = p === pages.length - 1;
      const rowIdxs = pages[p];

      const rowsHtml = rowIdxs
        .map((i) => dataRows[i].outerHTML)
        .join('');
      const totalHtml = isLastPage ? bodyRows[bodyRows.length - 1].outerHTML : '';

      const pageHtml = `
        ${isFirstPage ? `<h1>${escapeHtml(title)}</h1><div class="sub">${subEl?.innerHTML || ''}</div>` : ''}
        <table><thead>${theadEl?.innerHTML || ''}</thead><tbody>${rowsHtml}${totalHtml}</tbody></table>
      `;

      const frame = document.createElement('iframe');
      frame.setAttribute('aria-hidden', 'true');
      frame.style.position = 'fixed';
      frame.style.top = '0';
      frame.style.left = '-10000px';
      frame.style.width = `${pageWidthPx}px`;
      frame.style.height = `${pageHeightPx}px`;
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
            .pdf-page th, .pdf-page td { border: 1px solid #000 !important; padding: 7px 8px 9px !important; line-height: 1.25 !important; vertical-align: middle !important; }
            .pdf-page .num { font-family: 'Cairo', Tahoma, Arial, sans-serif !important; font-weight: 700 !important; letter-spacing: 0.3px; }
            .pdf-page .sub { border-bottom-width: 2px !important; padding-bottom: 6px !important; margin-bottom: 8px !important; }
            .pdf-page .total-row td { border-top: 2px solid #92400e !important; }
          </style></head>
          <body><div class="pdf-page">${pageHtml}</div></body></html>`);
        fdoc.close();

        if ((fdoc as any).fonts?.ready) {
          await Promise.race([(fdoc as any).fonts.ready, new Promise((res) => setTimeout(res, 2000))]);
        }
        await new Promise((res) => setTimeout(res, 60));

        const pageEl = fdoc.querySelector('.pdf-page') as HTMLElement;
        const canvas = await html2canvas(pageEl, {
          scale: 2,
          useCORS: true,
          backgroundColor: '#ffffff',
          width: pageWidthPx,
          windowWidth: pageWidthPx,
        });

        if (p > 0) pdf.addPage();
        const imgW = usableWidthMm;
        const imgH = (canvas.height * imgW) / canvas.width;
        pdf.addImage(
          canvas.toDataURL('image/jpeg', 0.95),
          'JPEG',
          margin,
          margin,
          imgW,
          Math.min(imgH, ph - margin * 2)
        );
      } finally {
        frame.remove();
      }
    }

    const dataUri = pdf.output('datauristring');
    const link = document.createElement('a');
    link.href = dataUri;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } finally {
    measureFrame.remove();
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
          table-layout: fixed;
          overflow-wrap: anywhere;
          word-break: break-word;
          margin: 10px 0;
        }
        th, td {
          border: 1px solid #000;
          padding: 6px;
          text-align: center;
          vertical-align: middle;
          white-space: normal;
          overflow-wrap: anywhere;
          word-break: break-word;
          overflow: visible;
          color: #000 !important;
          font-weight: 900 !important;
        }
        .num {
          font-family: 'Times New Roman', Times, serif !important;
          color: #000 !important;
          font-weight: 900 !important;
          direction: ltr;
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
            ${row.map(cell => `<td${typeof cell === 'number' ? ' class="num"' : ''}>${cell === undefined || cell === null ? '' : cell}</td>`).join('')}
          </tr>
        `).join('')}

      </tbody>
    </table>
  `;
  
  printHtmlContent(tableHtml);
}

// ============================================================
// تصدير أي جدول (كشف/تبويب) إلى PDF مطابق تماماً لتنسيق الطباعة
// يستخدم التقسيم الفعلي بالصفوف (htmlTableToPdfPaginated) بدل
// تصوير المحتوى دفعة واحدة وتقطيعه، حتى يظهر رأس الجدول في
// أعلى كل صفحة فعلياً وليس فقط الصفحة الأولى.
// ============================================================

export async function exportTablePdf(opts: {
  title: string;
  columns: { key: string; label: string }[];
  rows: Record<string, any>[];
  numericKeys?: string[];
  fileName: string;
  reportDate?: string;
}): Promise<void> {
  const { title, columns, rows, numericKeys = [], fileName, reportDate } = opts;
  const safeDate = reportDate || new Date().toISOString().slice(0, 10);

  await htmlTableToPdfPaginated({
    title,
    columns,
    rows,
    numericKeys,
    css: tablePrintStyles,
    fileName: `${fileName}-${safeDate}.pdf`,
    orientation: 'landscape',
    reportDate,
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
  const fc = (n: number) =>
    `<span class="num">${escapeHtml(n ? fmt(n) : "-")}</span>`;

  let body = `${reportLetterheadHtml()}<h1>${REV_SCHEMA.title}</h1>`;
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
      overflow-wrap: anywhere;
      word-break: break-word;
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
      overflow-wrap: anywhere;
      white-space: normal;
      overflow: visible;
      font-weight: 900 !important;
      color: #000 !important;
    }
    .num {
      font-family: 'Times New Roman', Times, serif !important;
      color: #000 !important;
      font-weight: 900 !important;
      direction: ltr;
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
