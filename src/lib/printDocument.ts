import {
  REPORT_LETTERHEAD_SRC,
  reportLetterheadHtml,
} from "@/lib/printTableHtml";
import { printReportHtmlAsync } from "@/lib/nativePrinter";

export type PrintOrientation = "portrait" | "landscape";

export interface PrintDocumentOptions {
  /** اسم الملف/العنوان (يستخدمه المتصفح كاسم افتراضي عند الحفظ كـ PDF) */
  title: string;
  /** محتوى <body> */
  body: string;
  /** أنماط إضافية خاصة بالتقرير */
  css?: string;
  orientation?: PrintOrientation;
  /** حجم الورق */
  pageSize?: "A4" | "A3";
  /** هامش الصفحة */
  margin?: string;
  /** موضع الترويسة: أعلى الصفحة أو داخل رأس الجدول */
  letterheadPlacement?: "top" | "table";
  /** تشغيل نافذة الطباعة تلقائياً بعد تحميل التقرير */
  autoPrint?: boolean;
}

const baseCss = (
  pageSize: string,
  orientation: PrintOrientation,
  margin: string
) => `
  /* وصف الطباعة العام */
  @page { size: ${pageSize} ${orientation}; margin: ${margin}; }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; background: #fff; }
  body {
    font-family: 'Cairo';
    direction: rtl;
    color: #000;
    font-weight: 500;
    font-size: 16px;
    line-height: 1.5;
    -webkit-font-smoothing: antialiased;
    text-rendering: geometricPrecision;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  h1, h2, h3 { font-weight: 700; margin: 0; }

  /* جداول: احتواء تلقائي للأعمدة بحسب محتواها وتوسيط تام */
  table { 
    width: 100%; 
    max-width: 100%; 
    border: solid 1px black; 
    table-layout: auto !important; 
    font-size: clamp(14px, 1.05vw, 16px); 
  }
  thead { display: table-header-group; }
  tfoot { display: table-footer-group; }
  tr { break-inside: avoid; page-break-inside: avoid; page-break-after: auto; }
  
  /* احتواء وتوسيط عمودي وأفقي دقيق تماماً داخل الخلايا بدون أي التفاف */
  th, td { 
    border: 1px solid #000; 
    text-align: center !important; 
    vertical-align: middle !important; 
    padding: 6px 8px !important; 
    line-height: 1.5 !important; 
    font-size: clamp(14px, 1vw, 16px); 
    color: #000 !important; 
    font-weight: 700 !important; 
    white-space: nowrap !important;
    width: max-content !important;
    word-break: keep-all !important;
    overflow-wrap: normal !important;
  }

  /* عنصر داخلي لضمان التوسيط المرن والمثالي أفقياً وعمودياً داخل كل خلية */
  th .pdf-cell-text,
  td .pdf-cell-text {
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
    width: 100% !important;
    height: auto !important;
    text-align: center !important;
    white-space: nowrap !important;
    word-break: keep-all !important;
    overflow-wrap: normal !important;
  }

  /* منع التفاف النصوص نهائياً في الخلايا الرقمية والتواريخ والأكواد وتثبيت خط الأرقام الرسمية */
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
    color: #000 !important; 
    font-weight: 900 !important; 
    direction: ltr; 
    width: max-content !important;
    text-align: center !important;
    vertical-align: middle !important;
  }

  .num .pdf-cell-text,
  .numeric-cell .pdf-cell-text,
  .date-cell .pdf-cell-text,
  .compact-cell .pdf-cell-text,
  .idx .pdf-cell-text {
    white-space: nowrap !important;
    word-break: keep-all !important;
    overflow-wrap: normal !important;
    direction: ltr !important;
  }

  /* إجبار خلايا النصوص الطويلة أيضاً على الامتداد دون التفاف وتوسيطها */
  .long-text-cell,
  .text-cell {
    white-space: nowrap !important;
    overflow-wrap: normal !important;
    word-break: keep-all !important;
    width: max-content !important;
    text-align: center !important;
    vertical-align: middle !important;
  }

  th { font-weight: 800; white-space: nowrap !important; vertical-align: middle !important; }
  img { max-width: 100%; height: auto; display: block; }

  /* ترويسة التقرير داخل thead تتكرر مع رؤوس الأعمدة في كل صفحة */
  .report-letterhead-row { page-break-after: avoid; break-after: avoid; }
  
  .report-letterhead-cell
  {
    height: 30 mm!important;
min - height: 30 mm!important;
padding: 0!important;
border: 0!important;
background: #fff!important;
vertical - align: top;
  }
  .report-letterhead-cell img {
    display: block;
    width: 100%;
    max-width: 100%;
    height: 30mm;
    max-height: 30mm;
    object-fit: fill;
    object-position: center;
    margin: 0;
  }

  /* إخفاء عناصر غير مطبوعة صراحة */
  .no-print { display: none !important; }

  /* تحسينات خاصة بالـ print / PDF */
  @media print {
    html, body { width: 100%; }
    body { margin: 0; padding: 0; font-size: 14px; line-height: 1.3; }
    thead { display: table-header-group; }
    tfoot { display: table-footer-group; }
    .page-break { page-break-after: always; }
    th, td { 
      padding: 5px 6px !important; 
      font-size: clamp(14px, 1vw, 16px); 
      color: #000 !important; 
      font-weight: 700 !important; 
      white-space: nowrap !important;
      word-break: keep-all !important;
      overflow-wrap: normal !important;
      width: max-content !important;
      vertical-align: middle !important;
    }
  }
`;

export async function openPrintDocument(options: PrintDocumentOptions): Promise<boolean> {
  const {
    title,
    body,
    css = "",
    orientation = "portrait",
    pageSize = "A4",
    margin = "8mm",
    letterheadPlacement = "table",
    autoPrint = true,
  } = options;

  const autoPrintScript = autoPrint
    ? `<script>
      (function () {
        var done = false;
        function go() {
          if (done) return;
          done = true;
          try { window.focus(); } catch (e) {}
          setTimeout(function () { window.print(); }, 150);
        }
        if (document.fonts && document.fonts.ready) {
          document.fonts.ready.then(go).catch(go);
          setTimeout(go, 2500);
        } else {
          window.onload = go;
          setTimeout(go, 1500);
        }
      })();
    </script>`
    : "";

  const html = `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
  <style>${baseCss(pageSize, orientation, margin)}${css}</style>
</head>
<body>
${letterheadPlacement === "top" ? reportLetterheadHtml() : ""}
${body}
<script>
  (function () {
    if (${JSON.stringify(letterheadPlacement)} !== "table") return;
    var tables = document.querySelectorAll("table");
    if (!tables.length) return;

    var standalone = document.querySelector(".report-letterhead-block");
    if (standalone) standalone.remove();

    tables.forEach(function (table) {
      var thead = table.tHead || table.querySelector("thead");
      if (!thead) {
        thead = document.createElement("thead");
        table.insertBefore(thead, table.firstChild);
      }
      thead.style.display = "table-header-group";
      if (thead.querySelector(".report-letterhead-row")) return;

      var firstRow = thead.rows[0];
      var columnCount = firstRow
        ? Array.prototype.reduce.call(firstRow.cells, function (sum, cell) {
            return sum + (cell.colSpan || 1);
          }, 0)
        : 1;
      var row = document.createElement("tr");
      row.className = "report-letterhead-row";
      var cell = document.createElement("th");
      cell.className = "report-letterhead-cell";
      cell.colSpan = Math.max(1, columnCount);
      var image = document.createElement("img");
      image.className = "report-letterhead-image";
      image.src = ${JSON.stringify(REPORT_LETTERHEAD_SRC)};
      image.alt = "ترويسة المجلس اليمني للاختصاصات الطبية";
      cell.appendChild(image);
      row.appendChild(cell);
      thead.insertBefore(row, thead.firstChild);
    });
  })();
</script>
${autoPrintScript}
</body>
</html>`;

  const nativeOrPopupResult = await printReportHtmlAsync(html, title);
  return nativeOrPopupResult;
}
