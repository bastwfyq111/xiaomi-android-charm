/**
 * مسار طباعة موحّد وعالي الجودة (يُستخدم أيضاً لحفظ الملف كـ PDF من المتصفح)
 * - يحمّل خط عربي (Cairo) وينتظر جهوزيته قبل فتح نافذة الطباعة
 * - يضبط @page بالحجم والاتجاه المطلوبين
 * - يضبط عنوان المستند ليصبح اسم ملف PDF الافتراضي
 */

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
  table { width: 100%; border-collapse: collapse; table-layout: fixed; word-break: break-word; }
  thead { display: table-header-group; }
  tfoot { display: table-footer-group; }
  tr { break-inside: avoid; page-break-inside: avoid; page-break-after: auto; }
  th, td { border: 0.5pt solid #000; text-align: center; vertical-align: middle; word-break: break-word; white-space: normal; padding: 4px; }
  th { font-weight: 700; }
  img { max-width: 100%; height: auto; display: block; }

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
    th, td { padding: 3px; }
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
  } = options;

  const w = window.open("", "_blank", "width=1280,height=900");
  if (!w) return false;

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
  <style>
    .print-toolbar {
      position: sticky; top: 0; z-index: 9999;
      display: flex; gap: 8px; justify-content: flex-start; align-items: center;
      padding: 8px; margin-bottom: 8px;
      background: #0f766e; color: #fff;
      font-family: 'Cairo', Tahoma, Arial, sans-serif;
    }
    .print-toolbar button {
      font-family: inherit; font-size: 14px; font-weight: 700;
      padding: 8px 14px; border-radius: 8px; border: 0; cursor: pointer;
      background: #fff; color: #0f766e;
    }
    .print-toolbar button.ghost { background: rgba(255,255,255,.15); color: #fff; }
    @media print { .print-toolbar { display: none !important; } }
  </style>
</head>
<body>
<div class="print-toolbar no-print-block">
  <button type="button" id="btnBack">◀ رجوع للتطبيق</button>
  <button type="button" class="ghost" id="btnPrint">🖨️ طباعة / حفظ PDF</button>
</div>
${body}
<script>
  (function () {
    var done = false;
    function go() {
      if (done) return;
      done = true;
      try { window.focus(); } catch (e) {}
      setTimeout(function () { window.print(); }, 150);
    }
    function back() {
      try { window.close(); } catch (e) {}
      // إن لم يُسمح بالإغلاق (بعض المتصفحات/الجوال) نعود للتطبيق
      setTimeout(function () {
        if (!window.closed) {
          if (window.history.length > 1) window.history.back();
          else if (window.opener) { try { window.opener.focus(); } catch (e) {} }
          else window.location.replace(${JSON.stringify(typeof window !== "undefined" ? window.location.origin + window.location.pathname : "/")});
        }
      }, 120);
    }
    var b = document.getElementById('btnBack');
    if (b) b.addEventListener('click', back);
    var p = document.getElementById('btnPrint');
    if (p) p.addEventListener('click', function () { window.print(); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') back(); });
    // انتظار جهوزية الخطوط مع مهلة أمان
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(go).catch(go);
      setTimeout(go, 2500);
    } else {
      window.onload = go;
      setTimeout(go, 1500);
    }
  })();
</script>

</body>
</html>`;

  w.document.open();
  w.document.write(html);
  w.document.close();
  return true;
}
