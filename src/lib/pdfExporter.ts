import { fmt } from './format';
import {
  buildTableHtml,
  escapeHtml,
  reportLetterheadHtml,
  tablePrintStyles,
} from './printTableHtml';
import { registerReportWindow } from "./capacitorNavigation";

function downloadPdfBlob(pdf: any, fileName: string): void {
  const blob = pdf.output('blob') as Blob;
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * مصدر وحيد وموحّد لقواعد احتواء/التفاف الخلايا داخل ".pdf-page".
 */
function pdfPageCellCss(opts: { padding?: string; fontSize?: string } = {}): string {
  const padding = opts.padding ?? '4px 5px';
  const fontSize = opts.fontSize ?? 'clamp(14px, 1.15vw, 14px)';
  return `
  .pdf-page table { 
    table-layout: auto !important; 
    width: 100% !important; 
    max-width: 100% !important;
    border-collapse: collapse !important;
  }

  /* تنسيق خلايا الجدول بالكامل للتمركز والتمدد التلقائي */
  .pdf-page th, .pdf-page td {
    border: 1px solid #000 !important;
    padding: ${padding} !important;
    text-align: center !important;
    vertical-align: middle !important;
    font-size: ${fontSize} !important;
    white-space: nowrap !important; 
    width: 1% !important; 
    word-break: keep-all !important;
    overflow-wrap: normal !important;
    hyphens: none !important;
  }

  .pdf-page .pdf-cell-text {
    display: flex !important;
    align-items: center !important;     
    justify-content: center !important; 
    width: 100% !important;
    height: 100% !important;
    text-align: center !important;
    color: #000000 !important;
    font-weight: 800 !important;
    white-space: nowrap !important;
  }

  .pdf-page td.num, .pdf-page td.idx, .pdf-page td.numeric-cell, .pdf-page td.date-cell,
  .pdf-page td.num .pdf-cell-text, .pdf-page td.idx .pdf-cell-text, 
  .pdf-page td.numeric-cell .pdf-cell-text, .pdf-page td.date-cell .pdf-cell-text {
    white-space: nowrap !important;
    word-break: keep-all !important;
    overflow-wrap: normal !important;
    direction: ltr !important; 
  }

  .pdf-page tbody td *, .pdf-page tfoot td *, .pdf-page .num *, .pdf-page .idx * {
    color: #000000 !important;
    -webkit-text-fill-color: #000000 !important;
    text-shadow: none !important;
    font-weight: 800 !important;
  }
  .pdf-page tbody td, .pdf-page tfoot td, .pdf-page .num, .pdf-page .idx {
    color: #000 !important;
    -webkit-text-fill-color: #000 !important;
    text-shadow: none !important;
    font-weight: 800 !important;
  }
  .pdf-page .num { font-family: 'Times New Roman', Times, serif !important; font-weight: 900 !important; }
  .pdf-page .sub { border-bottom-width: 2px !important; padding-bottom: 6px !important; margin-bottom: 8px !important; }
  .pdf-page .total-row td { border-top: 2px solid #92400e !important; white-space: nowrap !important; }
  `;
} 
    
function forcePdfDataCellTextColor(doc: Document): void {
  doc.querySelectorAll<HTMLElement>('.pdf-page tbody td, .pdf-page tfoot td, .pdf-page .num, .pdf-page .idx').forEach((cell) => {
    cell.style.setProperty('color', '#000000', 'important');
    cell.style.setProperty('-webkit-text-fill-color', '#000000', 'important');
    cell.style.setProperty('text-shadow', 'none', 'important');
    cell.style.setProperty('font-weight', '800', 'important');
    cell.querySelectorAll<HTMLElement>('*').forEach((textNode) => {
      textNode.style.setProperty('color', '#000000', 'important');
      textNode.style.setProperty('-webkit-text-fill-color', '#000000', 'important');
      textNode.style.setProperty('text-shadow', 'none', 'important');
      textNode.style.setProperty('font-weight', '800', 'important');
    });
  });
}

function blackenGreenDataPixels(canvas: HTMLCanvasElement, root: HTMLElement): void {
  const rootRect = root.getBoundingClientRect();
  const scaleX = canvas.width / Math.max(rootRect.width, 1);
  const scaleY = canvas.height / Math.max(rootRect.height, 1);
  const regions = root.querySelectorAll<HTMLElement>('tbody td, tfoot td');
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  regions.forEach((region) => {
    const rect = region.getBoundingClientRect();
    const left = Math.max(0, Math.floor((rect.left - rootRect.left) * scaleX));
    const top = Math.max(0, Math.floor((rect.top - rootRect.top) * scaleY));
    const right = Math.min(canvas.width, Math.ceil((rect.right - rootRect.left) * scaleX));
    const bottom = Math.min(canvas.height, Math.ceil((rect.bottom - rootRect.top) * scaleY));
    if (right <= left || bottom <= top) return;

    const image = ctx.getImageData(left, top, right - left, bottom - top);
    for (let i = 0; i < image.data.length; i += 4) {
      const r = image.data[i];
      const g = image.data[i + 1];
      const b = image.data[i + 2];
      if (g > r + 18 && g > b + 8 && r < 210 && g < 245) {
        image.data[i] = 0;
        image.data[i + 1] = 0;
        image.data[i + 2] = 0;
      }
    }
    ctx.putImageData(image, left, top);
  });
}

async function htmlToPdf(opts: {
  html: string;
  css: string;
  fileName: string;
  orientation?: 'portrait' | 'landscape';
  pageWidthPx?: number;
}): Promise<void> {
  const { html, css, fileName, orientation = 'landscape' } = opts;
  const pageWidthPx = opts.pageWidthPx ?? (orientation === 'landscape' ? 1123 : 794);

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
      <style>${pdfPageCellCss()}</style></head>
      <body style="margin:0; padding:0;"><div class="pdf-page">${reportLetterheadHtml()}${html}</div></body></html>`);
    fdoc.close();

    if ((fdoc as any).fonts?.ready) {
      await Promise.race([
        (fdoc as any).fonts.ready,
        new Promise((res) => setTimeout(res, 3000)),
      ]);
    }
    await new Promise((res) => setTimeout(res, 120));

    const page = fdoc.querySelector('.pdf-page') as HTMLElement;
    forcePdfDataCellTextColor(fdoc);
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
      onclone: (clonedDoc) => forcePdfDataCellTextColor(clonedDoc),
    });

    blackenGreenDataPixels(canvas, page);

    const pdf = new JsPDF({ unit: 'mm', format: 'a4', orientation, compress: true });
    const pw = pdf.internal.pageSize.getWidth();
    const ph = pdf.internal.pageSize.getHeight();
    const margin = 3; // تصغير الهوامش لأقصى درجة
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

    downloadPdfBlob(pdf, fileName);
  } finally {
    frame.remove();
  }
}

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
  pdfLayout?: 'default' | 'wide-centered';
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
    pdfLayout = 'default',
  } = opts;
  const isWideCentered = pdfLayout === 'wide-centered';
  const pageWidthPx = opts.pageWidthPx ?? (isWideCentered ? 1600 : (orientation === 'landscape' ? 1123 : 794));
  const cellPadding = isWideCentered ? '3px 4px' : '3px 4px';
  const cellFontSize = isWideCentered ? 'clamp(10px, 0.9vw, 14px)' : 'clamp(9px, 1.05vw, 13px)';
  const layoutCss = isWideCentered ? `
    .pdf-page { width: 100% !important; max-width: none !important; margin: 0 !important; padding: 0 !important; }
    .pdf-page table { width: 100% !important; max-width: none !important; margin-left: 0 !important; margin-right: 0 !important; }
  ` : '';
  const pageHeightPx = Math.round(
    pageWidthPx * (orientation === 'landscape' ? 210 / 297 : 297 / 210)
  );

  const [{ default: html2canvas }, { default: JsPDF }] = await Promise.all([
    import('html2canvas'),
    import('jspdf'),
  ]);

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
      <style>${pdfPageCellCss({ padding: cellPadding, fontSize: cellFontSize })}</style>
      <style>${layoutCss}</style>
      </head><body style="margin:0; padding:0;"><div class="pdf-page">${fullHtml}</div></body></html>`);
    mdoc.close();
    forcePdfDataCellTextColor(mdoc);

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
    const totalRowH = bodyRows.length ? bodyRows[bodyRows.length - 1].offsetHeight : 0;
    const dataRows = bodyRows.slice(0, -1);
    const rowHeights = dataRows.map((r) => r.offsetHeight);

    const margin = 3; // تصغير الهوامش لأقصى درجة
    const DPI = 96;
    const pxPerMm = DPI / 25.4;
    const pdf = new JsPDF({ unit: 'mm', format: 'a4', orientation, compress: true });
    const pw = pdf.internal.pageSize.getWidth();
    const ph = pdf.internal.pageSize.getHeight();
    const usableHeightPx = (ph - margin * 2) * pxPerMm;
    const usableWidthMm = pw - margin * 2;

    const pages: number[][] = [];
    let current: number[] = [];
    let currentH = topBlockH + theadH;
    for (let i = 0; i < rowHeights.length; i++) {
      const rh = rowHeights[i];
      const isLast = i === rowHeights.length - 1;
      const neededExtra = isLast ? totalRowH : 0;
      if (current.length > 0 && currentH + rh + neededExtra > usableHeightPx) {
        pages.push(current);
        current = [];
        currentH = theadH;
      }
      current.push(i);
      currentH += rh;
    }
    if (current.length > 0) pages.push(current);
    if (pages.length === 0) pages.push([]);

    for (let p = 0; p < pages.length - 1; p++) {
      const currentPage = pages[p];
      const nextPage = pages[p + 1];
      let nextRowsH = nextPage.reduce((sum, idx) => sum + rowHeights[idx], 0);
      const nextBaseH = theadH + (p + 1 === pages.length - 1 ? totalRowH : 0);

      while (currentPage.length > nextPage.length + 1 && currentPage.length > 1) {
        const candidate = currentPage[currentPage.length - 1];
        const candidateH = rowHeights[candidate];
        if (nextBaseH + nextRowsH + candidateH > usableHeightPx) break;
        currentPage.pop();
        nextPage.unshift(candidate);
        nextRowsH += candidateH;
      }
    }

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
          <style>${pdfPageCellCss({ padding: cellPadding, fontSize: cellFontSize })}</style>
          <style>${layoutCss}</style></head>
          <body style="margin:0; padding:0;"><div class="pdf-page">${pageHtml}</div></body></html>`);
        fdoc.close();
        forcePdfDataCellTextColor(fdoc);

        if ((fdoc as any).fonts?.ready) {
          await Promise.race([(fdoc as any).fonts.ready, new Promise((res) => setTimeout(res, 2000))]);
        }
        await new Promise((res) => setTimeout(res, 60));

        const pageEl = fdoc.querySelector('.pdf-page') as HTMLElement;
        const canvas = await html2canvas(pageEl, {
          scale: isWideCentered ? 3 : (rows.length > 500 ? 1.6 : 2),
          useCORS: true,
          backgroundColor: '#ffffff',
          width: pageWidthPx,
          windowWidth: pageWidthPx,
          onclone: (clonedDoc) => forcePdfDataCellTextColor(clonedDoc),
        });

        blackenGreenDataPixels(canvas, pageEl);

        if (p > 0) pdf.addPage();
        const imgW = usableWidthMm;
        const imgH = (canvas.height * imgW) / canvas.width;
        pdf.addImage(
          canvas.toDataURL('image/jpeg', 0.88),
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

    downloadPdfBlob(pdf, fileName);
  } finally {
    measureFrame.remove();
  }
}

const statementCss = `
  ${tablePrintStyles}
  body, .pdf-page { font-size: 12px; margin: 0; padding: 0; }
  table { width: 100% !important; max-width: 100%; table-layout: auto !important; }
  .info { width: 100%; border-collapse: collapse; margin: 6px 0 10px; table-layout: auto !important; }
  .info td { border: 0.75pt solid #000; padding: 6px 8px; text-align: right; font-weight: 700; }
  .info td.lbl { background: #f1f5f9 !important; width: 22%; white-space: nowrap !important; }
  .sign { margin-top: 18px; font-weight: 700; font-size: 11px; }
`;

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

export function printHtmlContent(htmlContent: string): void {
  const w = registerReportWindow(window.open('', '_blank'));
  if (!w) return;
  
  const styledContent = `
    <!DOCTYPE html>
    <html lang="ar" dir="rtl">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>طباعة</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        /* تصغير الهوامش لأقصى درجة في صفحة الطباعة المباشرة */
        @page { size: A4; margin: 5mm; }
        body {
          font-family: 'Cairo', 'Tajawal', 'Segoe UI', Tahoma, Arial, sans-serif;
          direction: rtl;
          color: #000 !important;
          background: white;
          line-height: 1.5;
          font-size: 12px;
          font-weight: 900 !important;
          width: 100%;
          margin: 0;
          padding: 0;
        }
        h1, h2, h3, h4, h5, h6 {
          font-weight: 800;
          letter-spacing: -0.01em;
          margin: 8px 0;
          color: #000 !important;
        }
        table {
          width: 100% !important;
          max-width: 100% !important;
          border-collapse: collapse;
          table-layout: auto !important;
          margin: 10px 0;
        }
        th, td {
          border: 1px solid #000;
          padding: 3px 5px !important;
          text-align: center;
          vertical-align: middle;
          font-size: clamp(7px, 1.2vw, 12px);
          color: #000 !important;
          font-weight: 900 !important;
        }
        th, td {
          white-space: nowrap;
          width: 1%;
        }
        td:not(.num):not(.idx):not(.numeric-cell) {
          white-space: normal !important;
          overflow-wrap: break-word !important;
          word-break: normal !important;
          overflow: visible;
          width: auto !important;
        }
        td.num, td.idx, td.numeric-cell {
          white-space: nowrap !important;
          word-break: keep-all !important;
          overflow-wrap: normal !important;
          hyphens: none !important;
          width: 1% !important;
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
          white-space: nowrap !important;
        }
        tr:nth-child(even) td {
          background: #f8fafc;
        }
        @media print {
          * { margin: 0; padding: 0; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          body { background: white; color: #000 !important; font-weight: 900 !important; width: 100%; margin: 0; padding: 0; }
          table { width: 100% !important; max-width: 100% !important; }
          th, td { color: #000 !important; font-weight: 900 !important; }
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

export async function exportTablePdf(opts: {
  title: string;
  columns: { key: string; label: string }[];
  rows: Record<string, any>[];
  numericKeys?: string[];
  fileName: string;
  reportDate?: string;
  pdfLayout?: 'default' | 'wide-centered';
}): Promise<void> {
  const { title, columns, rows, numericKeys = [], fileName, reportDate, pdfLayout = 'default' } = opts;
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
    pdfLayout,
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

  const w = registerReportWindow(window.open("", "_blank", "width=1100,height=800"));
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
    /* تصغير الهوامش لأقصى درجة في صفحة التقرير المالي الأفقي */
    @page { size: A4 landscape; margin: 5mm; padding: 0; }
    @page :first { margin-top: 5mm; }
    html { margin: 0; padding: 0; }
    body { 
      font-family: 'Cairo','Tajawal','Segoe UI',Tahoma,Arial,sans-serif; 
      direction: rtl; 
      color: #000 !important; 
      margin: 0; 
      padding: 0; 
      width: 100%; 
      background: white;
      line-height: 1.3;
      font-weight: 900 !important;
    }
    h1 { 
      text-align: center; 
      font-size: 18px; 
      font-weight: 900;
      margin: 4px 0; 
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
      margin: 2px 0;
      font-size: 13px;
    }
    table { 
      width: 100% !important;
      max-width: 100% !important;
      border-collapse: collapse; 
      font-size: 10px; 
      table-layout: auto !important;
      margin-top: 8px;
    }
    th, td { 
      border: 1.5px solid #000; 
      padding: 3px 5px !important;
      text-align: center;
      vertical-align: middle;
      font-size: clamp(7px, 1.2vw, 12px);
      font-weight: 900 !important;
      color: #000 !important;
    }
    th, td {
      white-space: nowrap;
      width: 1%;
    }
    td:not(.num):not(.idx) {
      white-space: normal !important;
      overflow-wrap: break-word !important;
      word-break: normal !important;
      overflow: visible;
      width: auto !important;
    }
    td.num, td.idx {
      white-space: nowrap !important;
      word-break: keep-all !important;
      overflow-wrap: normal !important;
      hyphens: none !important;
      width: 1% !important;
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
      white-space: nowrap !important;
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
      white-space: nowrap !important;
    }
    @media print { 
      * { margin: 0; padding: 0; } 
      body { margin: 0; padding: 0; width: 100%; background: white; }
      table { width: 100% !important; max-width: 100% !important; }
      @page { margin: 5mm; }
    }
  </style>`;
  w.document.write(
    `<!doctype html><html lang="ar" dir="rtl"><head>${head}</head><body>${body}<script>window.onload=()=>{setTimeout(()=>window.print(),500)}</script></body></html>`,
  );
  w.document.close();
}
