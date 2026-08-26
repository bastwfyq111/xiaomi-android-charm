/**
 * مسار طباعة موحّد وعالي الجودة (يُستخدم أيضاً لحفظ الملف كـ PDF من المتصفح)
 * - يحمّل خط عربي (Cairo) وينتظر جهوزيته قبل فتح نافذة الطباعة
 * - يضبط @page بالحجم والاتجاه المطلوبين
 * - يضبط عنوان المستند ليصبح اسم ملف PDF الافتراضي
 */

import {
  REPORT_LETTERHEAD_SRC,
  reportLetterheadHtml,
} from "@/lib/printTableHtml";

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
    font-family: 'Cairo', 'Tajawal', 'Segoe UI', Tahoma, Arial, sans-serif;
    direction: rtl;
    color: #000;
    font-weight: 500;
    font-size: 12px;
    line-height: 1.45;
    -webkit-font-smoothing: antialiased;
    text-rendering: geometricPrecision;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  h1, h2, h3 { font-weight: 700; margin: 0; }

  /* جداول: احتواء تلقائي حقيقي للأعمدة بحسب محتواها.
     table-layout: auto إلزامي هنا — fixed كان بيمنع الأعمدة من أخذ
     عرضها الفعلي ويوزّع المساحة بالتساوي متجاهلاً المحتوى. */
  table { 
    width: auto; 
    max-width: 100%; 
    border-collapse: collapse; 
    table-layout: auto !important; 
    font-size: clamp(8px, 1.05vw, 12px); 
  }
  thead { display: table-header-group; }
  tfoot { display: table-footer-group; }
  tr { break-inside: avoid; page-break-inside: avoid; page-break-after: auto; }
  
  th, td { 
    border: 0.5pt solid #000; 
    text-align: center !important; 
    vertical-align: middle !important; 
    padding: 4px 6px !important; 
    line-height: 1.3; 
    font-size: clamp(8px, 1.05vw, 12px); 
    color: #000 !important; 
    font-weight: 700 !important; 
  }

  /* افتراضي لكل خلية عادية: تحتوي محتواها بأصغر عرض ممكن بدون التفاف،
     إلا لو حُدّدت صراحة كـ long-text-cell / text-cell */
  th, td {
    white-space: nowrap;
    width: 1%;
  }

  /* منع التفاف النصوص نهائياً في الخلايا الرقمية والتواريخ والأكواد */
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
    width: 1% !important; /* إجبار الخلية على أخذ أصغر مساحة تتسع لمحتواها بدون التفاف */
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

  /* السماح بالالتفاف فقط في النصوص والأسماء الطويلة (عكس كل الخلايا الأخرى) */
  .long-text-cell,
  .text-cell {
    white-space: normal !important;
    overflow-wrap: break-word !important;
    word-break: normal !important;
    width: auto !important;
  }
  .long-text-cell .pdf-cell-text,
  .text-cell .pdf-cell-text {
    white-space: normal !important;
    overflow-wrap: break-word !important;
  }

  th { font-weight: 800; white-space: nowrap; }
  img { max-width: 100%; height: auto; display: block; }

  /* ترويسة التقرير داخل thead تتكرر مع رؤوس الأعمدة في كل صفحة */
  .report-letterhead-row { page-break-after: avoid; break-after: avoid; }
  .report-letterhead-cell {
    height: 30mm !important;
    min-height: 30mm !important;
    padding: 0 !important;
    border: 0 !important;
    background: #fff !important;
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

  /* تحسينات خاصة بالـ print */
  @media print {
    html, body { width: 100%; }
    body { margin: 0; padding: 0; font-size: 10px; line-height: 1.3; }
    thead { display: table-header-group; }
    tfoot { display: table-footer-group; }
    .page-break { page-break-after: always; }
    th, td { 
      padding: 3px 5px !important; 
      font-size: clamp(8px, 1.0vw, 11px); 
      color: #000 !important; 
      font-weight: 700 !important; 
    }
    .num, .numeric-cell, .date-cell, .compact-cell, .idx {
      white-space: nowrap !important;
      word-break: keep-all !important;
      overflow-wrap: normal !important;
    }
    .long-text-cell, .text-cell {
      white-space: normal !important;
      overflow-wrap: break-word !important;
    }
  }
`;

export function openPrintDocument(options: PrintDocumentOptions): boolean {
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

  const w = window.open("", "_blank", "width=1280,height=900");
  if (!w) return false;

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

  w.document.open();
  w.document.write(html);
  w.document.close();
  return true;
}
