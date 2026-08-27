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
  ArrowRight,
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
      { rel: "icon", href: "/favicon.ico" },
      { rel: "apple-touch-icon", href: "/icon-192.png" },
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

type TabItem = {
  value: Tab;
  label: string;
  shortLabel: string;
  icon: React.ReactNode;
  activeClass: string;
};

// تعريف قائمة التبويبات مع بياناتها وألوانها
const tabs: TabItem[] = [
  {
    value: "installments",
    label: "كشف الأقساط",
    shortLabel: "أقساط",
    icon: <WalletCards className="w-5 h-5" />,
    activeClass: "bg-teal-700",
  },
  {
    value: "hafiza",
    label: "حوافظ التوريد",
    shortLabel: "حوافظ",
    icon: <FileBox className="w-5 h-5" />,
    activeClass: "bg-amber-600",
  },
  {
    value: "account",
    label: "الحساب الجاري",
    shortLabel: "حساب",
    icon: <FileSpreadsheet className="w-5 h-5" />,
    activeClass: "bg-stone-600",
  },
  {
    value: "journal",
    label: "القيود اليومية",
    shortLabel: "قيود",
    icon: <BookOpenText className="w-5 h-5" />,
    activeClass: "bg-[#0e2b40]",
  },
  {
    value: "monthly",
    label: "كشف شهري",
    shortLabel: "شهري",
    icon: <PieChart className="w-5 h-5" />,
    activeClass: "bg-slate-700",
  },
  {
    value: "revenue",
    label: "الإيرادات",
    shortLabel: "إيرادات",
    icon: <TrendingUp className="w-5 h-5" />,
    activeClass: "bg-emerald-700",
  },
  {
    value: "expenses-table",
    label: "المصروفات",
    shortLabel: "مصروفات",
    icon: <ReceiptText className="w-5 h-5" />,
    activeClass: "bg-indigo-700",
  },
  {
    value: "general-expenses-ledger",
    label: "سجل النفقات",
    shortLabel: "السجل",
    icon: <FileSpreadsheet className="w-5 h-5" />,
    activeClass: "bg-rose-700",
  },
];

const isTabValue = (value: string | null): value is Tab =>
  value !== null && tabs.some((tab) => tab.value === value);

const getInitialTab = (): Tab => {
  if (typeof window === "undefined") return "installments";
  const tab = new URLSearchParams(window.location.search).get("tab");
  return isTabValue(tab) ? tab : "installments";
};

function Index() {
  const [activeTab, setActiveTab] = useState<Tab>(() => getInitialTab());
  const [pwaInstallable, setPwaInstallable] = useState<boolean>(false);

  useEffect(() => {
    const handlePopState = () => {
      const tab = new URLSearchParams(window.location.search).get("tab");
      setActiveTab(isTabValue(tab) ? tab : "installments");
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  useEffect(() => {
    setPwaInstallable(canInstall());
    const unsubscribe = onInstallAvailability((available) => {
      setPwaInstallable(available);
    });
    return () => unsubscribe();
  }, []);

  const handleTabChange = (tab: Tab) => {
    if (tab === activeTab) return;

    setActiveTab(tab);
    const url = new URL(window.location.href);
    if (tab === "installments") url.searchParams.delete("tab");
    else url.searchParams.set("tab", tab);

    window.history.pushState({ tab }, "", `${url.pathname}${url.search}${url.hash}`);
  };

  const handleBack = () => {
    if (window.history.length > 1) {
      window.history.back();
      return;
    }

    setActiveTab("installments");
    window.history.replaceState({}, "", window.location.pathname);
  };

  const handlePWAInstall = async () => {
    const success = await promptInstall();
    if (success) {
      toast.success("يتم الآن تثبيت النظام على جهازك.");
      setPwaInstallable(false);
    }
  };

  return (
    // الحاوية الرئيسية مع قائمة تبويبات جانبية تظهر فوق المحتوى عند فتحها
    <div
      className="w-full min-h-screen bg-[#f5f2ea] font-tajawal selection:bg-[#1a3a52]/20 text-sm sm:text-base"
      dir="rtl"
    >
      {/* قسم الهيدر العلوي — هوية كحلية مؤسسية بلمسة ختم برونزي */}
      <div className="relative flex flex-col landscape:flex-row landscape:items-center lg:flex-row lg:items-center lg:justify-between gap-2 sm:gap-3 bg-gradient-to-l from-[#0e2b40] via-[#153a54] to-[#0e2b40] px-3 py-2.5 sm:p-5 border-b-2 border-[#c99a4e]/60 shadow-md text-white overflow-hidden">
        {/* خيط دفتري زخرفي أعلى الهيدر */}
        <div className="absolute inset-x-0 top-0 h-[3px] bg-[repeating-linear-gradient(90deg,#c99a4e_0_10px,transparent_10px_20px)] opacity-70" />

        {/* الجزء الأيمن: شعار الختم، العنوان، والوصف */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <div className="relative shrink-0 p-2 sm:p-2.5 bg-white/[0.06] border border-[#c99a4e]/40 rounded-full text-[#e3c281] hidden sm:flex items-center justify-center">
            <FileSpreadsheet className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div className="ledger-seam self-stretch hidden sm:block rounded-full shrink-0" />
          <div className="flex flex-col gap-0.5 sm:gap-1 min-w-0">
            <h1 className="text-[clamp(0.85rem,3.2vw,1.5rem)] font-bold tracking-wide font-cairo text-white leading-tight truncate sm:whitespace-normal">
              المجلس اليمني للاختصاصات الطبية
            </h1>
            <p className="text-[clamp(0.6rem,2vw,0.875rem)] text-[#cfe0ec] font-medium flex items-center gap-1.5 leading-snug">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#e3c281] shrink-0"></span>
              <span className="truncate sm:whitespace-normal">
                نظام الإدارة المالية وحوافظ التوريد — صعدة، 2026م
              </span>
            </p>
          </div>
        </div>

        {/* الجزء الأيسر: زر الرجوع والتثبيت PWA */}
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 shrink-0">
          <button
            type="button"
            onClick={handleBack}
            className="inline-flex items-center gap-1.5 rounded-md border border-white/25 bg-white/[0.08] px-2.5 py-1.5 text-[10px] font-bold text-white transition-colors hover:bg-white/[0.16] focus:outline-none focus:ring-2 focus:ring-[#e3c281] sm:px-3 sm:py-2 sm:text-xs"
            aria-label="الرجوع إلى الصفحة السابقة"
          >
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            <span>رجوع</span>
          </button>
          {pwaInstallable && (
            <button
              onClick={handlePWAInstall}
              className="flex items-center gap-1.5 bg-[#c99a4e] hover:bg-[#d9ac63] text-[#1a1206] font-bold text-[10px] sm:text-xs px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-md transition-all shadow-sm whitespace-nowrap"
            >
              <DownloadCloud className="w-3.5 h-3.5 shrink-0" />
              <span>تثبيت التطبيق</span>
            </button>
          )}
        </div>
      </div>

      {/* محتوى التبويب النشط */}
      <div className="w-full bg-[#faf8f3] p-2 pb-24 sm:p-4 sm:pb-20 md:p-6 min-h-[calc(100vh-140px)]">
        {activeTab === "installments" && <InstallmentsTab />}
        {activeTab === "hafiza" && <HafizaTab />}
        {activeTab === "account" && <AccountTab />}
        {activeTab === "journal" && <JournalTab />}
        {activeTab === "monthly" && <MonthlyStatementTab />}
        {activeTab === "revenue" && <RevenueTab />}
        {activeTab === "expenses-table" && <ExpensesTab />}
        {activeTab === "general-expenses-ledger" && <AppTabs />}
      </div>

      {/* شريط التبويبات السفلي */}
      <nav
        className="fixed inset-x-0 bottom-0 z-[60] border-t-2 border-[#c99a4e]/60 bg-[#0e2b40]/[0.98] pb-[env(safe-area-inset-bottom)] shadow-[0_-6px_24px_rgba(0,0,0,0.2)] backdrop-blur-md"
        dir="rtl"
        aria-label="التنقل الرئيسي"
      >
        <div className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-1 py-1.5 sm:gap-2 sm:px-2 sm:py-2">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.value;
            return (
              <button
                key={tab.value}
                type="button"
                onClick={() => handleTabChange(tab.value)}
                aria-current={isActive ? "page" : undefined}
                className={`flex min-w-[74px] shrink-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-lg px-1.5 py-1.5 text-center transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#e3c281] sm:min-w-[92px] sm:gap-1 sm:px-2 sm:py-2 ${
                  isActive
                    ? `${tab.activeClass} text-white shadow-md`
                    : "text-white/70 hover:bg-white/[0.1] hover:text-white"
                }`}
              >
                <span className={isActive ? "scale-110" : "scale-100"}>{tab.icon}</span>
                <span className="text-[10px] font-bold leading-tight whitespace-nowrap sm:hidden">
                  {tab.shortLabel}
                </span>
                <span className="hidden text-xs font-bold leading-tight whitespace-nowrap sm:inline">
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>

      <Toaster position="top-center" richColors />
    </div>
  );
}

export default Index;
