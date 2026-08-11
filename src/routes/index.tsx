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
        </div>
      </div>

      {/* محتوى التبويب النشط */}
      <div className="w-full bg-[#faf8f3] p-2 sm:p-4 md:p-6 min-h-[calc(100vh-140px)]">
        {activeTab === "installments" && <InstallmentsTab />}
        {activeTab === "hafiza" && <HafizaTab />}
        {activeTab === "account" && <AccountTab />}
        {activeTab === "journal" && <JournalTab />}
        {activeTab === "monthly" && <MonthlyStatementTab />}
        {activeTab === "revenue" && <RevenueTab />}
        {activeTab === "expenses-table" && <ExpensesTab />}
        {activeTab === "general-expenses-ledger" && <AppTabs />}
      </div>

      {/* شريط التنقل السفلي — تصميم عائم زجاجي عصري */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-50 px-2 pb-[calc(8px+env(safe-area-inset-bottom))] pt-1 pointer-events-none"
        dir="rtl"
      >
        <div className="pointer-events-auto mx-auto max-w-3xl rounded-2xl border border-[#c99a4e]/30 bg-[#0e2b40]/85 backdrop-blur-xl shadow-[0_10px_30px_-8px_rgba(0,0,0,0.55)] overflow-hidden">
          {/* خيط برونزي زخرفي */}
          <div className="h-[2px] w-full bg-[linear-gradient(90deg,transparent,#c99a4e,transparent)] opacity-70" />

          <div className="overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <div className="flex w-max min-w-full gap-1 p-1.5">
              {tabs.map((tab) => {
                const isActive = activeTab === tab.value;
                return (
                  <button
                    key={tab.value}
                    onClick={() => setActiveTab(tab.value)}
                    aria-current={isActive ? "page" : undefined}
                    className={`
                      group relative flex flex-1 min-w-[62px] min-h-[54px] flex-col items-center justify-center gap-1 rounded-xl px-2.5 py-1.5
                      transition-all duration-300 ease-out active:scale-[0.94]
                      ${isActive
                        ? "text-[#0e2b40] bg-gradient-to-b from-[#e9cd92] to-[#c99a4e] shadow-[0_6px_16px_-6px_rgba(201,154,78,0.9)]"
                        : "text-white/60 hover:text-white hover:bg-white/[0.08]"
                      }
                    `}
                  >
                    <span
                      className={`transition-transform duration-300 ${isActive ? "-translate-y-[1px] scale-110" : "scale-100 group-hover:scale-105"}`}
                    >
                      {tab.icon}
                    </span>
                    <span
                      className={`text-[10px] leading-tight whitespace-nowrap ${isActive ? "font-extrabold" : "font-bold"}`}
                    >
                      {tab.shortLabel}
                    </span>
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
