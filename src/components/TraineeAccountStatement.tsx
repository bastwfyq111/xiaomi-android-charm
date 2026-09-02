import React, { useState } from "react";
import { ChevronDown, ChevronUp, Printer, Download, FileText } from "lucide-react";
import { fmt } from "@/lib/format";

interface TraineeAccountStatementProps {
  trainee?: {
    name: string;
    batch: string;
    specialty: string;
    phone: string;
  };
  year?: number;
  onPrint?: (trainee: any) => void;
  onDownloadPdf?: (trainee: any) => void;
}

export default function TraineeAccountStatement({
  trainee = {
    name: "اسم المتدرب",
    batch: "الدفعة",
    specialty: "المساق",
    phone: "رقم الهاتف",
  },
  year = 2026,
  onPrint,
  onDownloadPdf,
}: TraineeAccountStatementProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  // البيانات المالية (يمكن تعديلها حسب الحاجة)
  const financialData = [
    {
      label: "إجمالي الرسوم المستحقة",
      amount: 300000,
      bgColor: "bg-blue-50",
      accentColor: "border-l-4 border-blue-500",
    },
    {
      label: "متبقي من العام 2025 (مدور)",
      amount: 300000,
      bgColor: "bg-yellow-50",
      accentColor: "border-l-4 border-yellow-500",
    },
    {
      label: "إجمالي المبلغ المطلوب",
      amount: 300000,
      bgColor: "bg-red-50",
      accentColor: "border-l-4 border-red-500",
    },
    {
      label: "إجمالي المسدد (له)",
      amount: 0,
      bgColor: "bg-green-50",
      accentColor: "border-l-4 border-green-500",
    },
    {
      label: "الرصيد المتبقي (عليه)",
      amount: 300000,
      bgColor: "bg-red-50",
      accentColor: "border-l-4 border-red-600",
    },
  ];

  return (
    <div className="w-full bg-gradient-to-b from-slate-50/80 to-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden mb-6">
      {/* الرأس مع زر التوسع */}
      <div className="bg-gradient-to-l from-teal-600 via-teal-500 to-cyan-600 px-4 sm:px-6 py-3 sm:py-4 flex justify-between items-center cursor-pointer hover:shadow-md transition-shadow"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-3">
          <h3 className="text-lg sm:text-xl font-bold text-white">
            📋 كشف حساب متدرب للعام {year}م
          </h3>
        </div>
        <button className="p-1 hover:bg-white/20 rounded-lg transition-colors">
          {isExpanded ? (
            <ChevronUp className="w-5 h-5 text-white" />
          ) : (
            <ChevronDown className="w-5 h-5 text-white" />
          )}
        </button>
      </div>

      {/* المحتوى القابل للتوسع */}
      {isExpanded && (
        <div className="p-4 sm:p-6 space-y-5">
          {/* ========== بيانات المتدرب (الكروت الأربعة) ========== */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
            {/* كرت اسم المتدرب */}
            <div className="bg-gradient-to-br from-blue-50 to-sky-50 border border-blue-200 rounded-xl p-3 sm:p-4 shadow-sm hover:shadow-md transition-shadow">
              <div className="text-xs sm:text-sm font-bold text-blue-600 mb-2 text-center">
                اسم المتدرب
              </div>
              <div className="text-sm sm:text-base font-extrabold text-blue-900 text-center line-clamp-2">
                {trainee.name}
              </div>
            </div>

            {/* كرت الدفعة */}
            <div className="bg-gradient-to-br from-purple-50 to-indigo-50 border border-purple-200 rounded-xl p-3 sm:p-4 shadow-sm hover:shadow-md transition-shadow">
              <div className="text-xs sm:text-sm font-bold text-purple-600 mb-2 text-center">
                الدفعة
              </div>
              <div className="text-sm sm:text-base font-extrabold text-purple-900 text-center line-clamp-2">
                {trainee.batch}
              </div>
            </div>

            {/* كرت المساق */}
            <div className="bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200 rounded-xl p-3 sm:p-4 shadow-sm hover:shadow-md transition-shadow">
              <div className="text-xs sm:text-sm font-bold text-emerald-600 mb-2 text-center">
                المساق
              </div>
              <div className="text-sm sm:text-base font-extrabold text-emerald-900 text-center line-clamp-2">
                {trainee.specialty}
              </div>
            </div>

            {/* كرت رقم الهاتف */}
            <div className="bg-gradient-to-br from-orange-50 to-rose-50 border border-orange-200 rounded-xl p-3 sm:p-4 shadow-sm hover:shadow-md transition-shadow">
              <div className="text-xs sm:text-sm font-bold text-orange-600 mb-2 text-center">
                رقم الهاتف
              </div>
              <div className="text-sm sm:text-base font-extrabold text-orange-900 text-center line-clamp-2">
                {trainee.phone}
              </div>
            </div>
          </div>

          {/* خط فاصل */}
          <div className="h-1 bg-gradient-to-r from-teal-600 via-cyan-500 to-teal-600 rounded-full opacity-60"></div>

          {/* ========== الجدول المالي ========== */}
          <div className="overflow-x-auto rounded-lg border border-slate-200 shadow-sm">
            <table className="w-full border-collapse text-sm sm:text-base">
              {/* رأس الجدول */}
              <thead>
                <tr className="bg-gradient-to-r from-teal-600 via-teal-500 to-cyan-600 border-b-2 border-teal-700">
                  <th className="px-3 sm:px-4 py-3 sm:py-4 text-right font-bold text-white">
                    البيان
                  </th>
                  <th className="px-3 sm:px-4 py-3 sm:py-4 text-center font-bold text-white">
                    المبلغ
                  </th>
                </tr>
              </thead>

              {/* جسم الجدول */}
              <tbody>
                {financialData.map((row, idx) => (
                  <tr
                    key={idx}
                    className={`border-b border-slate-200 hover:bg-slate-50/50 transition-colors ${row.bgColor}`}
                  >
                    <td className={`px-3 sm:px-4 py-2.5 sm:py-3 font-bold text-slate-800 ${row.accentColor}`}>
                      {row.label}
                    </td>
                    <td className="px-3 sm:px-4 py-2.5 sm:py-3 text-center font-mono font-extrabold text-slate-900 numeric-cell">
                      {fmt(row.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* ========== التذييل مع التاريخ والتوقيع ========== */}
          <div className="grid grid-cols-2 gap-4 pt-2 border-t-2 border-slate-200">
            <div className="text-center">
              <p className="text-xs sm:text-sm font-semibold text-slate-600 mb-2">
                تاريخ التقرير
              </p>
              <p className="text-sm sm:text-base font-bold text-slate-900">
                {new Date().toLocaleDateString("ar-EG")}
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs sm:text-sm font-semibold text-slate-600 mb-2">
                التوقيع
              </p>
              <p className="text-sm sm:text-base font-bold text-slate-900">
                ________________
              </p>
            </div>
          </div>

          {/* ========== الأزرار (طباعة وتنزيل) ========== */}
          <div className="flex gap-2 sm:gap-3 pt-2">
            <button
              onClick={() => onPrint?.(trainee)}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 sm:py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors shadow-sm"
            >
              <Printer className="w-4 h-4" />
              <span className="hidden sm:inline">طباعة</span>
              <span className="sm:hidden">🖨️</span>
            </button>
            <button
              onClick={() => onDownloadPdf?.(trainee)}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 sm:py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition-colors shadow-sm"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">تنزيل PDF</span>
              <span className="sm:hidden">📥</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
