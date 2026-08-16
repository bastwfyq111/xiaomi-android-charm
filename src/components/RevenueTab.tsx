import { Fragment, useCallback, useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import { fmt } from "@/lib/format";
import schema from "@/data/revenueTemplate.json";
import { exportRevenueStatement } from "@/lib/exportImport";
import { revenuePdf } from "@/lib/exportPdf";
import { useReportDate } from "@/lib/reportDate";

// استيراد الأيقونات لإضفاء لمسة بصرية حديثة متناسقة مع الهوية الجديدة
import { Calendar, FileSpreadsheet, FileText, LayoutGrid, DollarSign } from "lucide-react";

const MONTH_NAMES = [
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

type Type = { no: number; title: string };
type Item = { no: number; title: string; types: Type[] };
type Section = { no: number; title: string; items: Item[] };
type Chapter = { no: number; title: string; longTitle?: string; sections: Section[] };

const SCHEMA = schema as { title: string; office: string; chapters: Chapter[] };

// توليد مفتاح التخزين المركب: ch{c}-sec{s}-it{i}-typ{t}
export function typeKey(c: number, s: number, i: number, t: number) {
  return `${c}-${s}-${i}-${t}`;
}

export default function RevenueTab() {
  // 1. استخراج حالة الإيرادات ودالة التحديث من مخزن زوستاند (Zustand Store)
  const { revenue, setRevenue, clearTab } = useStore() as any;
  const { reportDate } = useReportDate();

  // 2. إدارة حالة التاريخ المحاسبي الحالي
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);

  // دالة مساعدة لجلب المبالغ بأمان من المخزن وتفادي القيم غير المعرفة (Undefined)
  const get = useCallback(
    (y: number, m: number, key: string) => revenue[`${y}-${m}-${key}`] || 0,
    [revenue],
  );

  // 3. عمليات الحسابات التجميعية الفورية (Aggregations) المحسنة بالأداء عبر useMemo
  const data = useMemo(() => {
    // حساب مبالغ الأشهر السابقة التراكمية
    const sumPrev = (key: string) => {
      let s = 0;
      for (let m = 1; m < month; m++) s += get(year, m, key);
      return s;
    };

    const types: Record<string, { cur: number; prev: number; tot: number }> = {};
    SCHEMA.chapters.forEach((ch) =>
      ch.sections.forEach((sec) =>
        sec.items.forEach((it) =>
          it.types.forEach((t) => {
            const k = typeKey(ch.no, sec.no, it.no, t.no);
            const cur = get(year, month, k);
            const prev = sumPrev(k);
            types[k] = { cur, prev, tot: cur + prev };
          }),
        ),
      ),
    );

    const itemsAgg: Record<string, { cur: number; prev: number; tot: number }> = {};
    const sectionsAgg: Record<string, { cur: number; prev: number; tot: number }> = {};
    const chaptersAgg: Record<string, { cur: number; prev: number; tot: number }> = {};
    let grandCur = 0,
      grandPrev = 0;

    SCHEMA.chapters.forEach((ch) => {
      let cCur = 0,
        cPrev = 0;
      ch.sections.forEach((sec) => {
        let sCur = 0,
          sPrev = 0;
        sec.items.forEach((it) => {
          let iCur = 0,
            iPrev = 0;
          it.types.forEach((t) => {
            const v = types[typeKey(ch.no, sec.no, it.no, t.no)];
            iCur += v.cur;
            iPrev += v.prev;
          });
          itemsAgg[`${ch.no}-${sec.no}-${it.no}`] = { cur: iCur, prev: iPrev, tot: iCur + iPrev };
          sCur += iCur;
          sPrev += iPrev;
        });
        sectionsAgg[`${ch.no}-${sec.no}`] = { cur: sCur, prev: sPrev, tot: sCur + sPrev };
        cCur += sCur;
        cPrev += sPrev;
      });
      chaptersAgg[`${ch.no}`] = { cur: cCur, prev: cPrev, tot: cCur + cPrev };
      grandCur += cCur;
      grandPrev += cPrev;
    });

    return { types, itemsAgg, sectionsAgg, chaptersAgg, grandCur, grandPrev };
  }, [get, year, month]);

  // دالة تنسيق عرض الأرقام المالية مع استبدال الصفر بشرطة مقروءة محاسبياً
  const cellNum = (n: number) => (n ? fmt(n) : "-");

  return (
    // الحاوية الخارجية: فرض الاتجاه العربي العام وضمان التباعد العمودي
    <div className="w-full space-y-3 p-1.5 text-right sm:space-y-5 sm:p-3" dir="rtl">
      {/* لوحة التحكم والتحقق: تم تغيير لون الحدود هنا أيضاً إلى أسود متناسق */}
      <div className="grid grid-cols-2 items-end gap-1.5 rounded-xl border border-black bg-white p-1.5 shadow-sm sm:flex sm:flex-wrap sm:gap-3 sm:p-4">
        {/* اختيار الشهر */}
        <div className="flex flex-col gap-2 flex-1 min-w-[140px]">
          <label className="text-sm font-bold text-slate-600 flex items-center gap-1.5">
            <Calendar className="w-4 h-4 text-teal-600" />
            <span>الشهر المحاسبي</span>
          </label>
          <select
            value={month}
            onChange={(e) => setMonth(Number(e.target.value))}
            className="w-full px-3 py-2.5 text-sm font-semibold bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-teal-500 focus:bg-white transition-all"
          >
            {MONTH_NAMES.map((n, i) => (
              <option key={i} value={i + 1}>
                {n}
              </option>
            ))}
          </select>
        </div>

        {/* اختيار السنة */}
        <div className="flex flex-col gap-2 flex-1 min-w-[140px]">
          <label className="text-sm font-bold text-slate-600 flex items-center gap-1.5">
            <Calendar className="w-4 h-4 text-teal-600" />
            <span>السنة المالية</span>
          </label>
          <input
            type="number"
            value={year}
            onChange={(e) => setYear(Number(e.target.value) || year)}
            className="w-full px-3 py-2.5 text-sm font-bold bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-teal-500 focus:bg-white transition-all text-right"
          />
        </div>

        {/* مساحة مرنة دافعة للأزرار للشاشات الكبيرة */}
        <div className="hidden lg:block lg:flex-1" />

        {/* أزرار الإجراءات والتقارير */}
        <div className="col-span-2 grid w-full grid-cols-2 gap-1.5 sm:flex sm:w-auto sm:gap-2 lg:col-span-1">
          <button
            onClick={() => exportRevenueStatement(revenue, year, reportDate)}
            className="min-w-0 flex flex-1 items-center justify-center gap-1 px-1.5 py-1 text-sm sm:flex-initial sm:gap-1.5 sm:px-2 sm:py-1 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-bold rounded-lg transition-all shadow-sm hover:border-teal-500/30 hover:text-teal-700 active:scale-[0.98]"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>تصدير Excel السنوي</span>
          </button>

          <button
            onClick={() => revenuePdf(revenue, year, month, reportDate)}
            className="min-w-0 flex flex-1 items-center justify-center gap-1 px-1.5 py-1 text-sm sm:flex-initial sm:gap-1.5 sm:px-2 sm:py-1 bg-gradient-to-r from-teal-700 to-teal-800 hover:from-teal-800 hover:to-teal-900 text-white font-bold rounded-lg transition-all shadow-md shadow-teal-700/10 active:scale-[0.98]"
          >
            <FileText className="w-4 h-4" />
            <span>طباعة / PDF</span>
          </button>

          <button
            onClick={() => {
              if (!confirm("هل أنت متأكد من مسح جميع بيانات الإيرادات؟ لا يمكن التراجع.")) return;
              useStore.setState({ revenue: {} });
            }}
            className="min-w-0 flex flex-1 items-center justify-center gap-1 px-1.5 py-1 text-sm sm:flex-initial sm:gap-1.5 sm:px-2 sm:py-1 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg transition-all shadow-md active:scale-[0.98]"
          >
            🗑️ <span>مسح بيانات الإيرادات</span>
          </button>
        </div>
      </div>

      {/* لوحة وعاء الجدول الكبيرة الزجاجية بحدود سوداء */}
      <div className="bg-white rounded-2xl shadow-xl shadow-slate-100/50 border-2 border-black overflow-hidden">
        {/* الترويسة العلوية للجدول المالي للمجلس */}
        <div className="bg-gradient-to-r from-teal-700 to-teal-800 text-white p-3 sm:p-6 text-center space-y-1.5 border-b-2 border-black">
          <h2 className="font-extrabold text-lg sm:text-xl font-cairo tracking-wide">
            {SCHEMA.title}
          </h2>
          <p className="text-sm opacity-90 font-medium">{SCHEMA.office}</p>
          <div className="inline-flex items-center gap-1.5 bg-white/10 px-3 py-1 rounded-full text-sm font-semibold backdrop-blur-sm mt-2">
            <LayoutGrid className="w-4 h-4" />
            <span>
              عن شهر {MONTH_NAMES[month - 1]} من العام المالي {year}م
            </span>
          </div>
        </div>

        {/* صندوق الحماية من الضيق: الجدول والحدود كلها سوداء واحتواء الخلايا تلقائي */}
        <div className="w-full overflow-auto max-h-[72vh] [-ms-overflow-style:none] [scrollbar-width:thin] relative">
          <table className="min-w-max table-auto text-right border-collapse text-sm sm:text-base font-semibold border border-black">
            <thead className="sticky top-0 z-20 shadow-sm">
              <tr className="bg-slate-100 text-slate-700 font-bold border-b-2 border-black">
                <th rowSpan={2} className="border border-black text-right whitespace-nowrap !px-1 !py-1.5 sm:!px-2 sm:!py-2 !text-sm sm:!text-base">
                  بيان مفردات الموارد المعتمدة
                </th>
                <th rowSpan={2} className="border border-black text-center whitespace-nowrap !px-1 !py-1.5 sm:!px-2 sm:!py-2 !text-sm sm:!text-base">
                  الباب
                </th>
                <th rowSpan={2} className="border border-black text-center whitespace-nowrap !px-1 !py-1.5 sm:!px-2 sm:!py-2 !text-sm sm:!text-base">
                  الفصل
                </th>
                <th rowSpan={2} className="border border-black text-center whitespace-nowrap !px-1 !py-1.5 sm:!px-2 sm:!py-2 !text-sm sm:!text-base">
                  البند
                </th>
                <th rowSpan={2} className="border border-black text-center whitespace-nowrap !px-1 !py-1.5 sm:!px-2 sm:!py-2 !text-sm sm:!text-base">
                  النوع
                </th>
                <th
                  colSpan={2}
                  className="border border-black text-center bg-teal-50/50 text-teal-900 whitespace-nowrap !px-1 !py-1.5 sm:!px-2 sm:!py-2 !text-sm sm:!text-base"
                >
                  الشهر الجاري
                </th>
                <th
                  colSpan={2}
                  className="border border-black text-center bg-slate-50 text-slate-800 whitespace-nowrap !px-1 !py-1.5 sm:!px-2 sm:!py-2 !text-sm sm:!text-base"
                >
                  الأشهر السابقة
                </th>
                <th
                  colSpan={2}
                  className="border border-black text-center bg-emerald-50/50 text-emerald-900 whitespace-nowrap !px-1 !py-1.5 sm:!px-2 sm:!py-2 !text-sm sm:!text-base"
                >
                  الجملــة والتراكمي
                </th>
              </tr>
              <tr className="bg-slate-50 text-slate-500 font-bold border-b-2 border-black">
                <th className="border border-black text-center whitespace-nowrap !px-1 !py-1.5 sm:!px-2 sm:!py-2 !text-sm sm:!text-base">ف</th>
                <th className="border border-black text-center whitespace-nowrap !px-1 !py-1.5 sm:!px-2 sm:!py-2 !text-sm sm:!text-base">ريال</th>
                <th className="border border-black text-center whitespace-nowrap !px-1 !py-1.5 sm:!px-2 sm:!py-2 !text-sm sm:!text-base">ف</th>
                <th className="border border-black text-center whitespace-nowrap !px-1 !py-1.5 sm:!px-2 sm:!py-2 !text-sm sm:!text-base">ريال</th>
                <th className="border border-black text-center whitespace-nowrap !px-1 !py-1.5 sm:!px-2 sm:!py-2 !text-sm sm:!text-base">ف</th>
                <th className="border border-black text-center whitespace-nowrap !px-1 !py-1.5 sm:!px-2 sm:!py-2 !text-sm sm:!text-base">ريال</th>
              </tr>
            </thead>
            <tbody className="font-medium">
              {/* السطر الإجمالي العلوي السريع */}
              <tr className="bg-teal-700/[0.04] font-bold text-teal-950 border-b-2 border-black">
                <td className="border border-black text-right font-cairo whitespace-nowrap !px-1 !py-1.5 sm:!px-2 sm:!py-2 !text-sm sm:!text-base">
                  إجمالي الموارد العامة للوحدة
                </td>
                <td colSpan={4} className="border border-black !px-1 !py-1.5 sm:!px-2 sm:!py-2 !text-sm sm:!text-base whitespace-nowrap"></td>
                <td className="border border-black !px-1 !py-1.5 sm:!px-2 sm:!py-2 !text-sm sm:!text-base whitespace-nowrap"></td>
                <td className="border border-black font-mono text-left text-teal-700 whitespace-nowrap !px-1 !py-1.5 sm:!px-2 sm:!py-2 !text-sm sm:!text-base">
                  {cellNum(data.grandCur)}
                </td>
                <td className="border border-black !px-1 !py-1.5 sm:!px-2 sm:!py-2 !text-sm sm:!text-base whitespace-nowrap"></td>
                <td className="border border-black font-mono text-left text-slate-600 whitespace-nowrap !px-1 !py-1.5 sm:!px-2 sm:!py-2 !text-sm sm:!text-base">
                  {cellNum(data.grandPrev)}
                </td>
                <td className="border border-black !px-1 !py-1.5 sm:!px-2 sm:!py-2 !text-sm sm:!text-base whitespace-nowrap"></td>
                <td className="font-mono text-left text-emerald-700 bg-emerald-50/30 border border-black whitespace-nowrap !px-1 !py-1.5 sm:!px-2 sm:!py-2 !text-sm sm:!text-base">
                  {cellNum(data.grandCur + data.grandPrev)}
                </td>
              </tr>

              {SCHEMA.chapters.map((ch) =>
                ch.sections.length === 0 ? null : (
                  <Fragment key={`ch-${ch.no}`}>
                    {/* مستوى الأبواب الرئيسية */}
                    <tr className="bg-slate-100/80 font-bold text-slate-900 border-b border-black">
                      <td className="border border-black text-right text-teal-900 font-cairo whitespace-nowrap !px-1 !py-1.5 sm:!px-2 sm:!py-2 !text-sm sm:!text-base">
                        {ch.longTitle || ch.title}
                      </td>
                      <td className="border border-black text-center font-bold text-teal-800 bg-teal-50/20 whitespace-nowrap !px-1 !py-1.5 sm:!px-2 sm:!py-2 !text-sm sm:!text-base">
                        {ch.no}
                      </td>
                      <td colSpan={3} className="border border-black !px-1 !py-1.5 sm:!px-2 sm:!py-2 !text-sm sm:!text-base whitespace-nowrap"></td>
                      <td className="border border-black !px-1 !py-1.5 sm:!px-2 sm:!py-2 !text-sm sm:!text-base whitespace-nowrap"></td>
                      <td className="border border-black font-mono text-left whitespace-nowrap !px-1 !py-1.5 sm:!px-2 sm:!py-2 !text-sm sm:!text-base">
                        {cellNum(data.chaptersAgg[ch.no].cur)}
                      </td>
                      <td className="border border-black !px-1 !py-1.5 sm:!px-2 sm:!py-2 !text-sm sm:!text-base whitespace-nowrap"></td>
                      <td className="border border-black font-mono text-left whitespace-nowrap !px-1 !py-1.5 sm:!px-2 sm:!py-2 !text-sm sm:!text-base">
                        {cellNum(data.chaptersAgg[ch.no].prev)}
                      </td>
                      <td className="border border-black !px-1 !py-1.5 sm:!px-2 sm:!py-2 !text-sm sm:!text-base whitespace-nowrap"></td>
                      <td className="font-mono text-left bg-slate-200/40 border border-black whitespace-nowrap !px-1 !py-1.5 sm:!px-2 sm:!py-2 !text-sm sm:!text-base">
                        {cellNum(data.chaptersAgg[ch.no].tot)}
                      </td>
                    </tr>

                    {ch.sections.map((sec) => (
                      <Fragment key={`sec-${ch.no}-${sec.no}`}>
                        {/* مستوى الفصول الفرعية */}
                        <tr className="bg-slate-50 font-semibold text-slate-800 border-b border-black">
                          <td className="border border-black text-right text-slate-700 whitespace-nowrap !px-1 !py-1.5 sm:!px-2 sm:!py-2 !text-sm sm:!text-base">
                            {sec.title}
                          </td>
                          <td className="border border-black !px-1 !py-1.5 sm:!px-2 sm:!py-2 !text-sm sm:!text-base whitespace-nowrap"></td>
                          <td className="border border-black text-center text-slate-600 whitespace-nowrap !px-1 !py-1.5 sm:!px-2 sm:!py-2 !text-sm sm:!text-base">
                            {sec.no}
                          </td>
                          <td colSpan={2} className="border border-black !px-1 !py-1.5 sm:!px-2 sm:!py-2 !text-sm sm:!text-base whitespace-nowrap"></td>
                          <td className="border border-black !px-1 !py-1.5 sm:!px-2 sm:!py-2 !text-sm sm:!text-base whitespace-nowrap"></td>
                          <td className="border border-black font-mono text-left text-slate-600 whitespace-nowrap !px-1 !py-1.5 sm:!px-2 sm:!py-2 !text-sm sm:!text-base">
                            {cellNum(data.sectionsAgg[`${ch.no}-${sec.no}`].cur)}
                          </td>
                          <td className="border border-black !px-1 !py-1.5 sm:!px-2 sm:!py-2 !text-sm sm:!text-base whitespace-nowrap"></td>
                          <td className="border border-black font-mono text-left text-slate-500 whitespace-nowrap !px-1 !py-1.5 sm:!px-2 sm:!py-2 !text-sm sm:!text-base">
                            {cellNum(data.sectionsAgg[`${ch.no}-${sec.no}`].prev)}
                          </td>
                          <td className="border border-black !px-1 !py-1.5 sm:!px-2 sm:!py-2 !text-sm sm:!text-base whitespace-nowrap"></td>
                          <td className="font-mono text-left text-slate-700 border border-black whitespace-nowrap !px-1 !py-1.5 sm:!px-2 sm:!py-2 !text-sm sm:!text-base">
                            {cellNum(data.sectionsAgg[`${ch.no}-${sec.no}`].tot)}
                          </td>
                        </tr>

                        {sec.items.map((it) => (
                          <Fragment key={`it-${ch.no}-${sec.no}-${it.no}`}>
                            {/* مستوى البنود */}
                            <tr className="bg-white text-slate-700 border-b border-black">
                              <td className="border border-black text-right text-slate-600 whitespace-nowrap !px-1 !py-1.5 sm:!px-2 sm:!py-2 !text-sm sm:!text-base">
                                {it.title}
                              </td>
                              <td colSpan={2} className="border border-black !px-1 !py-1.5 sm:!px-2 sm:!py-2 !text-sm sm:!text-base whitespace-nowrap"></td>
                              <td className="border border-black text-center text-slate-500 whitespace-nowrap !px-1 !py-1.5 sm:!px-2 sm:!py-2 !text-sm sm:!text-base">
                                {it.no}
                              </td>
                              <td className="border border-black !px-1 !py-1.5 sm:!px-2 sm:!py-2 !text-sm sm:!text-base whitespace-nowrap"></td>
                              <td className="border border-black !px-1 !py-1.5 sm:!px-2 sm:!py-2 !text-sm sm:!text-base whitespace-nowrap"></td>
                              <td className="border border-black font-mono text-left text-slate-600 whitespace-nowrap !px-1 !py-1.5 sm:!px-2 sm:!py-2 !text-sm sm:!text-base">
                                {cellNum(data.itemsAgg[`${ch.no}-${sec.no}-${it.no}`].cur)}
                              </td>
                              <td className="border border-black !px-1 !py-1.5 sm:!px-2 sm:!py-2 !text-sm sm:!text-base whitespace-nowrap"></td>
                              <td className="border border-black font-mono text-left text-slate-500 whitespace-nowrap !px-1 !py-1.5 sm:!px-2 sm:!py-2 !text-sm sm:!text-base">
                                {cellNum(data.itemsAgg[`${ch.no}-${sec.no}-${it.no}`].prev)}
                              </td>
                              <td className="border border-black !px-1 !py-1.5 sm:!px-2 sm:!py-2 !text-sm sm:!text-base whitespace-nowrap"></td>
                              <td className="font-mono text-left text-slate-700 border border-black whitespace-nowrap !px-1 !py-1.5 sm:!px-2 sm:!py-2 !text-sm sm:!text-base">
                                {cellNum(data.itemsAgg[`${ch.no}-${sec.no}-${it.no}`].tot)}
                              </td>
                            </tr>

                            {it.types.map((t) => {
                              const k = typeKey(ch.no, sec.no, it.no, t.no);
                              const v = data.types[k];
                              return (
                                /* مستوى الأنواع القابلة للتعديل والمدخلات */
                                <tr
                                  key={k}
                                  className="bg-white hover:bg-teal-50/40 transition-colors text-slate-600 border-b border-black"
                                >
                                  <td className="border border-black text-right text-slate-500 whitespace-nowrap !px-1 !py-1.5 sm:!px-2 sm:!py-2 !text-sm sm:!text-base">
                                    {t.title}
                                  </td>
                                  <td colSpan={3} className="border border-black !px-1 !py-1.5 sm:!px-2 sm:!py-2 !text-sm sm:!text-base whitespace-nowrap"></td>
                                  <td className="border border-black text-center text-slate-400 whitespace-nowrap !px-1 !py-1.5 sm:!px-2 sm:!py-2 !text-sm sm:!text-base">
                                    {t.no}
                                  </td>
                                  <td className="border border-black !px-1 !py-1.5 sm:!px-2 sm:!py-2 !text-sm sm:!text-base whitespace-nowrap"></td>

                                  {/* خانة إدخال المبلغ للشهر الجاري المعدلة بصرياً بالكامل */}
                                  <td className="border border-black bg-teal-50/10 whitespace-nowrap !px-1 !py-1.5 sm:!px-2 sm:!py-2 !text-sm sm:!text-base">
                                    <div className="relative flex items-center min-w-[100px]">
                                      <input
                                        type="number"
                                        value={v.cur || ""}
                                        onChange={(e) =>
                                          setRevenue(year, month, k, Number(e.target.value) || 0)
                                        }
                                        className="w-full pl-6 pr-2 py-1 bg-white border border-slate-200 rounded-lg font-mono text-left font-bold text-teal-950 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 shadow-sm transition-all"
                                        placeholder="0"
                                      />
                                      <DollarSign className="w-3 h-3 text-slate-300 absolute left-2" />
                                    </div>
                                  </td>

                                  <td className="border border-black !px-1 !py-1.5 sm:!px-2 sm:!py-2 !text-sm sm:!text-base whitespace-nowrap"></td>
                                  <td className="border border-black font-mono text-left text-slate-500 whitespace-nowrap !px-1 !py-1.5 sm:!px-2 sm:!py-2 !text-sm sm:!text-base">
                                    {cellNum(v.prev)}
                                  </td>
                                  <td className="border border-black !px-1 !py-1.5 sm:!px-2 sm:!py-2 !text-sm sm:!text-base whitespace-nowrap"></td>
                                  <td className="font-mono text-left text-slate-800 font-semibold border border-black whitespace-nowrap !px-1 !py-1.5 sm:!px-2 sm:!py-2 !text-sm sm:!text-base">
                                    {cellNum(v.tot)}
                                  </td>
                                </tr>
                              );
                            })}
                          </Fragment>
                        ))}
                      </Fragment>
                    ))}
                  </Fragment>
                ),
              )}

              {/* مجاميع الأبواب النهائية الثابتة (Subtotals) */}
              <tr className="bg-slate-100 font-bold text-slate-800 border-t-2 border-black border-b border-black">
                <td
                  colSpan={5}
                  className="text-center font-cairo bg-slate-200/50 text-slate-900 border-l border-black whitespace-nowrap !px-1 !py-1.5 sm:!px-2 sm:!py-2 !text-sm sm:!text-base"
                >
                  ملخص وعصارة مجاميع الحسابات والأبواب
                </td>
                <td colSpan={6} className="border border-black px-0.5 py-1 sm:px-1 sm:py-1 !text-[10px] sm:!text-xs !whitespace-nowrap"></td>
              </tr>
              {SCHEMA.chapters.map((ch) => {
                const agg = data.chaptersAgg[ch.no] || { cur: 0, prev: 0, tot: 0 };
                const order = ["اﻷول", "الثاني", "الثالث", "الرابع", "الخامس"];
                return (
                  <tr
                    key={`subt-${ch.no}`}
                    className="bg-slate-50/80 font-bold text-slate-700 border-b border-black"
                  >
                    <td
                      colSpan={5}
                      className="border border-black text-right whitespace-nowrap !px-1 !py-1.5 sm:!px-2 sm:!py-2 !text-sm sm:!text-base"
                    >
                      جملة ميرادات الباب {order[ch.no - 1]} : {ch.title}
                    </td>
                    <td className="border border-black !px-1 !py-1.5 sm:!px-2 sm:!py-2 !text-sm sm:!text-base whitespace-nowrap"></td>
                    <td className="border border-black font-mono text-left text-teal-700 whitespace-nowrap !px-1 !py-1.5 sm:!px-2 sm:!py-2 !text-sm sm:!text-base">
                      {cellNum(agg.cur)}
                    </td>
                    <td className="border border-black !px-1 !py-1.5 sm:!px-2 sm:!py-2 !text-sm sm:!text-base whitespace-nowrap"></td>
                    <td className="border border-black font-mono text-left text-slate-500 whitespace-nowrap !px-1 !py-1.5 sm:!px-2 sm:!py-2 !text-sm sm:!text-base">
                      {cellNum(agg.prev)}
                    </td>
                    <td className="border border-black !px-1 !py-1.5 sm:!px-2 sm:!py-2 !text-sm sm:!text-base whitespace-nowrap"></td>
                    <td className="font-mono text-left text-slate-900 bg-slate-200/30 border border-black whitespace-nowrap !px-1 !py-1.5 sm:!px-2 sm:!py-2 !text-sm sm:!text-base">
                      {cellNum(agg.tot)}
                    </td>
                  </tr>
                );
              })}

              {/* السطر الختامي: المجموع العام للموارد */}
              <tr className="bg-gradient-to-r from-teal-50 to-emerald-50 font-black text-teal-950 border-t-4 border-black">
                <td
                  colSpan={5}
                  className="border border-black text-right font-cairo tracking-wide text-teal-900 whitespace-nowrap !px-1 !py-1.5 sm:!px-2 sm:!py-2 !text-sm sm:!text-base"
                >
                  الإجمالي العام والنهائي لجميع موارد المجلس
                </td>
                <td className="border border-black !px-1 !py-1.5 sm:!px-2 sm:!py-2 !text-sm sm:!text-base whitespace-nowrap"></td>
                <td className="border border-black font-mono text-left text-teal-700 whitespace-nowrap !px-1 !py-1.5 sm:!px-2 sm:!py-2 !text-sm sm:!text-base">
                  {cellNum(data.grandCur)}
                </td>
                <td className="border border-black !px-1 !py-1.5 sm:!px-2 sm:!py-2 !text-sm sm:!text-base whitespace-nowrap"></td>
                <td className="border border-black font-mono text-left text-slate-600 whitespace-nowrap !px-1 !py-1.5 sm:!px-2 sm:!py-2 !text-sm sm:!text-base">
                  {cellNum(data.grandPrev)}
                </td>
                <td className="border border-black !px-1 !py-1.5 sm:!px-2 sm:!py-2 !text-sm sm:!text-base whitespace-nowrap"></td>
                <td className="font-mono text-left text-emerald-800 bg-emerald-50 border border-black whitespace-nowrap !px-1 !py-1.5 sm:!px-2 sm:!py-2 !text-sm sm:!text-base">
                  {cellNum(data.grandCur + data.grandPrev)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
