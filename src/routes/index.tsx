import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Toaster, toast } from "sonner";

// استيراد الأيقونات التوضيحية لكل تبويب في النظام المالي
import {
  WalletCards,
  FileBox,
  FileSpreadsheet,
  BookOpenText,
  PieChart,
  TrendingUp,
  ReceiptText,
  DownloadCloud,
} from "lucide-react";

// استيراد ملفات التبويبات الفرعية المكونة للنظام
import HafizaTab from "@/components/HafizaTab";
import AccountTab from "@/components/AccountTab";
import JournalTab from "@/components/JournalTab";
import InstallmentsTab from "@/components/InstallmentsTab";
import MonthlyStatementTab from "@/components/MonthlyStatementTab";
import RevenueTab from "@/components/RevenueTab";
import ExpensesTab from "@/components/ExpensesTab";
import AppTabs from "@/components/AppTabs";
import ReportDatePicker from "@/components/ReportDatePicker";

// استيراد وظائف الـ PWA
import { canInstall, onInstallAvailability, promptInstall } from "@/lib/pwa";

// إعداد مسار التوجيه والبيانات التعريفية للمتصفح
export const Route = createFileRoute("/")({
  component: Index,
  head: () => ({
    meta: [
      { title: "قيادة النظام المالي - المجلس اليمني للاختصاصات الطبية" },
      {
        name: "description",
        content:
          "تطبيق إدارة قيود اليومية وحوافظ التوريد للمجلس اليمني للاختصاصات الطبية - يعمل بدون إنترنت",
      },
      { name: "theme-color", content: "#0e2b40" },
    ],
    links: [
      { rel: "manifest", href: "/manifest.json" },
      { rel: "icon", href: "/icon-192.png", type: "image/png" },
      { rel: "apple-touch-icon", href: "/icon-192.png" },

      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Cairo:wght@600;700;800&family=Tajawal:wght@400;500;700&display=swap",
      },
    ],
  }),
});

type Tab =
  | "installments"
  | "hafiza"
  | "account"
  | "journal"
  | "monthly"
  | "revenue"
  | "expenses-table"
  | "general-expenses-ledger";

// تعريف قائمة التبويبات مع بياناتها
const tabs: { value: Tab; label: string; shortLabel: string; icon: React.ReactNode }[] = [
  {
    value: "installments",
    label: "كشف الأقساط",
    shortLabel: "أقساط",
    icon: <WalletCards className="w-5 h-5" />,
  },
  {
    value: "hafiza",
    label: "حوافظ التوريد",
    shortLabel: "حوافظ",
    icon: <FileBox className="w-5 h-5" />,
  },
  {
    value: "account",
    label: "الحساب الجاري",
    shortLabel: "حساب",
    icon: <FileSpreadsheet className="w-5 h-5" />,
  },
  {
    value: "journal",
    label: "القيود اليومية",
    shortLabel: "قيود",
    icon: <BookOpenText className="w-5 h-5" />,
  },
  {
    value: "monthly",
    label: "كشف شهري",
    shortLabel: "شهري",
    icon: <PieChart className="w-5 h-5" />,
  },
  {
    value: "revenue",
    label: "الإيرادات",
    shortLabel: "إيرادات",
    icon: <TrendingUp className="w-5 h-5" />,
  },
  {
    value: "expenses-table",
    label: "المصروفات",
    shortLabel: "مصروفات",
    icon: <ReceiptText className="w-5 h-5" />,
  },
  {
    value: "general-expenses-ledger",
    label: "سجل النفقات",
    shortLabel: "السجل",
    icon: <FileSpreadsheet className="w-5 h-5" />,
  },
];

function Index() {
  const [activeTab, setActiveTab] = useState<Tab>("installments");
  const [pwaInstallable, setPwaInstallable] = useState<boolean>(false);

  useEffect(() => {
    setPwaInstallable(canInstall());
    const unsubscribe = onInstallAvailability((available) => {
      setPwaInstallable(available);
    });
    return () => unsubscribe();
  }, []);

  const handlePWAInstall = async () => {
    const success = await promptInstall();
    if (success) {
      toast.success("يتم الآن تثبيت النظام على جهازك.");
      setPwaInstallable(false);
    }
  };

  return (
    // الحاوية الرئيسية مع مساحة سفلية لشريط التنقل
    <div
      className="w-full min-h-[100dvh] overflow-x-hidden bg-[#f5f2ea] font-tajawal selection:bg-[#1a3a52]/20 text-sm sm:text-base pb-[calc(76px+env(safe-area-inset-bottom))]"
      dir="rtl"
    >
      {/* قسم الهيدر العلوي — هوية كحلية مؤسسية بلمسة ختم برونزي */}
      <div className="safe-pad-top safe-pad-x relative grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 bg-gradient-to-l from-[#0e2b40] via-[#153a54] to-[#0e2b40] p-3 sm:p-5 lg:flex lg:justify-between border-b-2 border-[#c99a4e]/60 shadow-md text-white overflow-hidden">
        {/* خيط دفتري زخرفي أعلى الهيدر */}
        <div className="absolute inset-x-0 top-0 h-[3px] bg-[repeating-linear-gradient(90deg,#c99a4e_0_10px,transparent_10px_20px)] opacity-70" />

        {/* الجزء الأيمن: شعار الختم، العنوان، والوصف */}
        <div className="flex min-w-0 items-center gap-3">
          <div className="relative shrink-0 p-2.5 bg-white/[0.06] border border-[#c99a4e]/40 rounded-full text-[#e3c281] hidden sm:flex items-center justify-center">
            <FileSpreadsheet className="w-5 h-5" />
          </div>
          <div className="ledger-seam self-stretch hidden sm:block rounded-full shrink-0" />
          <div className="flex min-w-0 flex-col gap-1">
            <h1 className="truncate text-[15px] sm:text-lg md:text-2xl font-bold tracking-wide font-cairo text-white">
              المجلس اليمني للاختصاصات الطبية
            </h1>
            <p className="truncate text-[10px] sm:text-xs md:text-sm text-[#cfe0ec] font-medium flex items-center gap-1.5">
              <span className="inline-block w-1.5 h-1.5 shrink-0 rounded-full bg-[#e3c281]"></span>
              <span className="truncate">نظام الإدارة المالية وحوافظ التوريد — صعدة، 2026م</span>
            </p>
          </div>
        </div>


        {/* الجزء الأيسر: زر التثبيت PWA */}
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 px-1 sm:px-0">
          {pwaInstallable && (
            <button
              onClick={handlePWAInstall}
              className="flex items-center gap-1.5 bg-[#c99a4e] hover:bg-[#d9ac63] text-[#1a1206] font-bold text-[10px] sm:text-xs px-3 py-1.5 sm:py-2 rounded-md transition-all shadow-sm"
            >
              <DownloadCloud className="w-3.5 h-3.5" />
              <span>تثبيت التطبيق</span>
            </button>
          )}
          <ReportDatePicker />
        </div>
      </div>

      {/* محتوى التبويب النشط */}
      <div
        id="active-tab-panel"
        role="tabpanel"
        aria-labelledby={`tab-${activeTab}`}
        className="w-full bg-[#faf8f3] p-2 sm:p-4 md:p-6 min-h-[calc(100vh-140px)]"
      >
        {activeTab === "installments" && <InstallmentsTab />}
        {activeTab === "hafiza" && <HafizaTab />}
        {activeTab === "account" && <AccountTab />}
        {activeTab === "journal" && <JournalTab />}
        {activeTab === "monthly" && <MonthlyStatementTab />}
        {activeTab === "revenue" && <RevenueTab />}
        {activeTab === "expenses-table" && <ExpensesTab />}
        {activeTab === "general-expenses-ledger" && <AppTabs />}
      </div>

      {/* شريط تنقّل سفلي عائم — بطاقات لمس واضحة ومناسبة للشاشات الصغيرة */}
      <nav
        className="pointer-events-none fixed inset-x-0 bottom-0 z-50 px-2 pb-[max(8px,env(safe-area-inset-bottom))] pt-2 sm:px-4"
        dir="rtl"
        aria-label="التنقل الرئيسي"
      >
        <div className="pointer-events-auto relative mx-auto max-w-4xl overflow-hidden rounded-[1.65rem] border border-[#e3c281]/35 bg-gradient-to-b from-[#173e59]/[0.98] to-[#092438]/[0.98] shadow-[0_18px_42px_-14px_rgba(7,25,39,0.78)] ring-1 ring-white/10 backdrop-blur-2xl">
          {/* وهج علوي هادئ يحافظ على الهوية المؤسسية */}
          <div aria-hidden="true" className="absolute inset-x-8 top-0 h-px bg-gradient-to-l from-transparent via-[#f5db9e] to-transparent" />
          <div aria-hidden="true" className="absolute -right-12 -top-16 h-36 w-36 rounded-full bg-[#c99a4e]/10 blur-3xl" />

          <div
            className="overflow-x-auto overscroll-x-contain px-1.5 py-1.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            role="tablist"
            aria-label="أقسام النظام المالي"
          >
            <div className="flex w-max min-w-full snap-x snap-mandatory gap-1">
              {tabs.map((tab) => {
                const isActive = activeTab === tab.value;
                return (
                  <button
                    key={tab.value}
                    id={`tab-${tab.value}`}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    aria-controls="active-tab-panel"
                    tabIndex={isActive ? 0 : -1}
                    onClick={() => setActiveTab(tab.value)}
                    aria-label={tab.label}
                    title={tab.label}
                    className={`group relative isolate flex min-w-[72px] snap-center flex-1 flex-col items-center justify-center gap-1.5 rounded-[1.25rem] px-2 py-2.5 text-[10px] leading-none transition-[transform,background-color,color,box-shadow] duration-300 ease-out active:scale-[0.94] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f5db9e] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0e2b40] sm:min-w-0 sm:px-3 ${
                      isActive
                        ? "-translate-y-0.5 bg-[#faf8f3] text-[#0e2b40] shadow-[0_12px_24px_-14px_rgba(255,255,255,0.98)]"
                        : "text-[#dce8ef]/65 hover:-translate-y-0.5 hover:bg-white/[0.11] hover:text-white"
                    }`}
                  >
                    <span
                      aria-hidden="true"
                      className={`relative flex h-9 w-9 items-center justify-center rounded-[0.95rem] transition-all duration-300 ${
                        isActive
                          ? "bg-gradient-to-br from-[#f5db9e] via-[#e3c281] to-[#bc863e] text-[#0e2b40] shadow-[0_8px_15px_-8px_rgba(144,94,23,0.9)]"
                          : "bg-white/[0.08] text-current group-hover:bg-white/[0.17]"
                      }`}
                    >
                      <span className={`transition-transform duration-300 ${isActive ? "scale-105" : "group-hover:scale-110"}`}>
                        {tab.icon}
                      </span>
                    </span>
                    <span className={`whitespace-nowrap ${isActive ? "font-extrabold" : "font-bold"}`}>
                      {tab.shortLabel}
                    </span>
                    <span
                      aria-hidden="true"
                      className={`absolute bottom-1.5 h-1 rounded-full bg-[#c99a4e] transition-all duration-300 ${
                        isActive ? "w-6 opacity-100" : "w-1 opacity-0 group-hover:opacity-70"
                      }`}
                    />
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </nav>

      <Toaster position="top-center" richColors />
    </div>
  );
}

export default Index;
