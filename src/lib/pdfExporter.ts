import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { fmt } from './format';

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

  (doc as any).autoTable({
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
  const finalY = (doc as any).lastAutoTable?.finalY || 150;
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
