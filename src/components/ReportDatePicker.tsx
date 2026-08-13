import { CalendarDays } from "lucide-react";
import { useReportDate } from "@/lib/reportDate";

export default function ReportDatePicker() {
  const { reportDate, setReportDate } = useReportDate();

  return (
    <label
      className="flex items-center gap-2 rounded-lg border border-white/20 bg-white/10 px-2.5 py-1.5 text-white shadow-sm backdrop-blur-sm"
      dir="rtl"
    >
      <CalendarDays className="h-4 w-4 shrink-0 text-[#e3c281]" />
      <span className="whitespace-nowrap text-[10px] font-bold sm:text-xs">تاريخ التقرير</span>
      <input
        type="date"
        value={reportDate}
        onChange={(event) => setReportDate(event.target.value)}
        className="min-w-0 rounded border border-white/30 bg-white px-1.5 py-1 text-xs font-bold text-[#0e2b40] outline-none focus:ring-2 focus:ring-[#e3c281]"
        aria-label="تاريخ التقرير"
      />
    </label>
  );
}
