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

  /* جداول: محاولة الحفاظ على تنسيق واضح عبر الصفحات */
  table { width: 100%; min-width: 100%; border-collapse: collapse; table-layout: fixed; word-break: break-word; overflow-wrap: anywhere; font-size: clamp(7px, 1.05vw, 12px); }
  thead { display: table-header-group; }
  tfoot { display: table-footer-group; }
  tr { break-inside: avoid; page-break-inside: avoid; page-break-after: auto; }
  th, td { border: 0.5pt solid #000; text-align: center; vertical-align: middle; word-break: break-word; overflow-wrap: anywhere; white-space: normal; overflow: hidden; text-overflow: clip; padding: 0 !important; line-height: 1.1; max-height: 2.2em; font-size: clamp(7px, 1.05vw, 12px); color: #000 !important; font-weight: 700 !important; }
  .num { font-family: 'Times New Roman', Times, serif !important; color: #000 !important; font-weight: 900 !important; direction: ltr; }
  th { font-weight: 700; }
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

  /* تحسينات خاصة ��الـ print */
  @media print {
    html, body { width: 100%; }
    body { margin: 0; padding: 0; }
    /* تأكيد تكرار ترويسة الجدول في كل صفحة */
    thead { display: table-header-group; }
    tfoot { display: table-footer-group; }
    /* فواصل صفحات للاستخدام اليدوي داخل القالب */
    .page-break { page-break-after: always; }
    /* تقليل الخط لتحسين تناسق الجدول عبر صفحات متعددة */
    body { font-size: 10px; line-height: 1.3; }
    th, td { padding: 0 !important; white-space: normal; overflow: hidden; text-overflow: clip; overflow-wrap: anywhere; word-break: break-word; line-height: 1.1; max-height: 2.2em; font-size: clamp(7px, 1.0vw, 10px); color: #000 !important; font-weight: 700 !important; }
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
        // انتظار جهوزية الخطوط مع مهلة أمان
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
${reportLetterheadHtml()}
${body}
<script>
  (function () {
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
