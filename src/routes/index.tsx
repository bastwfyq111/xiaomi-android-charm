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
  Menu,
  X,
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
  const [navOpen, setNavOpen] = useState(false);

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
              <span className="truncate sm:whitespace-normal">نظام الإدارة المالية وحوافظ التوريد — صعدة، 2026م</span>
            </p>
          </div>
        </div>

        {/* الجزء الأيسر: زر التثبيت PWA */}
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 shrink-0">
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

      {/* زر القائمة الثلاثي في أعلى الركن الأيمن */}
      <button
        type="button"
        onClick={() => setNavOpen((open) => !open)}
        className="fixed top-2 right-2 z-[60] flex h-11 w-11 items-center justify-center rounded-lg bg-[#0e2b40] text-[#e3c281] shadow-lg ring-1 ring-[#c99a4e]/50 transition-all duration-200 hover:bg-[#153a54] focus:outline-none focus:ring-2 focus:ring-[#e3c281] active:scale-95 sm:top-4 sm:right-4 sm:h-12 sm:w-12"
        aria-label={navOpen ? "إغلاق قائمة التبويبات" : "فتح قائمة التبويبات"}
        aria-expanded={navOpen}
        title={navOpen ? "إغلاق قائمة التبويبات" : "فتح قائمة التبويبات"}
      >
        {navOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {/* قائمة التبويبات الجانبية المخفية حتى الضغط على الزر */}
      <nav
        className={`fixed top-16 right-2 z-50 w-[calc(100vw-1rem)] max-w-xs rounded-xl bg-[#0e2b40] border border-[#c99a4e]/35 shadow-[-8px_0_28px_rgba(0,0,0,0.28)] transition-all duration-200 ease-out sm:top-20 sm:right-4 sm:w-64 sm:rounded-2xl ${
          navOpen
            ? "translate-y-0 opacity-100"
            : "pointer-events-none -translate-y-2 opacity-0"
        }`}
        dir="rtl"
        aria-label="التنقل الرئيسي"
      >
        <div className="flex max-h-[min(76vh,38rem)] flex-col gap-1 overflow-y-auto p-2 sm:max-h-[min(80vh,38rem)] sm:p-3">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.value;
            return (
              <button
                key={tab.value}
                type="button"
                onClick={() => {
                  setActiveTab(tab.value);
                  setNavOpen(false);
                }}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-right transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#e3c281] ${
                  isActive
                    ? "bg-white/[0.12] text-[#e3c281] shadow-sm"
                    : "text-white/65 hover:bg-white/[0.07] hover:text-white"
                }`}
              >
                <span className={isActive ? "scale-110" : "scale-100"}>{tab.icon}</span>
                <span className="text-[11px] font-bold leading-tight whitespace-nowrap sm:text-xs">{tab.label}</span>
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
