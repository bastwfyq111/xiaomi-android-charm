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
      { name: "theme-color", content: "#10528e" },
    ],
    links: [
      { rel: "manifest", href: "/manifest.json" },
      { rel: "icon", href: "/icon.svg" },
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
      className="w-full min-h-screen bg-[#f5f2ea] font-tajawal selection:bg-[#1a3a52]/20 text-sm sm:text-base pb-[72px]"
      dir="rtl"
    >
      {/* قسم الهيدر العلوي — هوية كحلية مؤسسية بلمسة ختم برونزي */}
      <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 bg-gradient-to-l from-[#0e2b40] via-[#153a54] to-[#0e2b40] p-3 sm:p-5 border-b-2 border-[#c99a4e]/60 shadow-md text-white overflow-hidden">
        {/* خيط دفتري زخرفي أعلى الهيدر */}
        <div className="absolute inset-x-0 top-0 h-[3px] bg-[repeating-linear-gradient(90deg,#c99a4e_0_10px,transparent_10px_20px)] opacity-70" />

        {/* الجزء الأيمن: شعار الختم، العنوان، والوصف */}
        <div className="flex items-center gap-3">
          <div className="relative p-2.5 bg-white/[0.06] border border-[#c99a4e]/40 rounded-full text-[#e3c281] hidden sm:flex items-center justify-center">
            <FileSpreadsheet className="w-5 h-5" />
          </div>
          <div className="ledger-seam self-stretch hidden sm:block rounded-full" />
          <div className="flex flex-col gap-1">
            <h1 className="text-base sm:text-lg md:text-2xl font-bold tracking-wide font-cairo text-white">
              المجلس اليمني للاختصاصات الطبية
            </h1>
            <p className="text-[10px] sm:text-xs md:text-sm text-[#cfe0ec] font-medium flex items-center gap-1.5">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#e3c281]"></span>
              نظام الإدارة المالية وحوافظ التوريد — صعدة، 2026م
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

      {/* شريط التنقل السفلي الثابت */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-50 bg-[#0e2b40] border-t border-[#c99a4e]/25 shadow-[0_-4px_20px_rgba(0,0,0,0.3)]"
        dir="rtl"
      >
        {/* شريط التمرير الأفقي للتبويبات */}
        <div className="overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div className="flex w-max min-w-full">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.value;
              return (
                <button
                  key={tab.value}
                  onClick={() => setActiveTab(tab.value)}
                  className={`
                    flex flex-col items-center justify-center gap-1 px-3 py-2 flex-1 min-w-[64px] min-h-[52px] transition-all duration-200 active:bg-white/10
                    ${isActive
                      ? "text-[#e3c281] bg-white/[0.07] border-t-2 border-[#c99a4e]"
                      : "text-white/55 hover:text-white hover:bg-white/5 border-t-2 border-transparent"
                    }
                  `}
                >
                  <span className={`transition-transform duration-200 ${isActive ? "scale-110" : "scale-100"}`}>
                    {tab.icon}
                  </span>
                  <span className="text-[10px] font-bold leading-tight whitespace-nowrap">
                    {tab.shortLabel}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* مساحة آمنة للأجهزة ذات الشريط السفلي (iPhone X وما بعده) */}
        <div className="bg-[#0e2b40]" style={{ height: "env(safe-area-inset-bottom)" }} />
      </nav>

      <Toaster position="top-center" richColors />
    </div>
  );
}

export default Index;
