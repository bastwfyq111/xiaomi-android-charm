import { lazy, Suspense, useCallback, useEffect, useRef, useState } from "react";
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

// تحميل ملفات التبويبات عند فتحها فقط لتقليل حجم التشغيل الأول.
const HafizaTab = lazy(() => import("@/components/HafizaTab"));
const AccountTab = lazy(() => import("@/components/AccountTab"));
const JournalTab = lazy(() => import("@/components/JournalTab"));
const InstallmentsTab = lazy(() => import("@/components/InstallmentsTab"));
const MonthlyStatementTab = lazy(() => import("@/components/MonthlyStatementTab"));
const RevenueTab = lazy(() => import("@/components/RevenueTab"));
const ExpensesTab = lazy(() => import("@/components/ExpensesTab"));
const AppTabs = lazy(() => import("@/components/AppTabs"));

// استيراد وظائف الـ PWA
import { canInstall, onInstallAvailability, promptInstall } from "@/lib/pwa";
import { installAndroidBackButton } from "@/lib/capacitorNavigation";

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

// تعريف قائمة التبويبات مع بياناتها (تدرج موحّد لهوية "صقيع قطبي")
const ACTIVE_TAB_CLASS = "bg-gradient-to-b from-[#2e6b8a] to-[#6ba3c8]";

const tabs: TabItem[] = [
  {
    value: "installments",
    label: "كشف الأقساط",
    shortLabel: "أقساط",
    icon: <WalletCards className="w-5 h-5 sm:w-6 sm:h-6" />,
    activeClass: ACTIVE_TAB_CLASS,
  },
  {
    value: "hafiza",
    label: "حوافظ التوريد",
    shortLabel: "حوافظ",
    icon: <FileBox className="w-5 h-5 sm:w-6 sm:h-6" />,
    activeClass: ACTIVE_TAB_CLASS,
  },
  {
    value: "account",
    label: "الحساب الجاري",
    shortLabel: "حساب",
    icon: <FileSpreadsheet className="w-5 h-5 sm:w-6 sm:h-6" />,
    activeClass: ACTIVE_TAB_CLASS,
  },
  {
    value: "journal",
    label: "القيود اليومية",
    shortLabel: "قيود",
    icon: <BookOpenText className="w-5 h-5 sm:w-6 sm:h-6" />,
    activeClass: ACTIVE_TAB_CLASS,
  },
  {
    value: "monthly",
    label: "كشف شهري",
    shortLabel: "شهري",
    icon: <PieChart className="w-5 h-5 sm:w-6 sm:h-6" />,
    activeClass: ACTIVE_TAB_CLASS,
  },
  {
    value: "revenue",
    label: "الإيرادات",
    shortLabel: "إيرادات",
    icon: <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6" />,
    activeClass: ACTIVE_TAB_CLASS,
  },
  {
    value: "expenses-table",
    label: "المصروفات",
    shortLabel: "مصروفات",
    icon: <ReceiptText className="w-5 h-5 sm:w-6 sm:h-6" />,
    activeClass: ACTIVE_TAB_CLASS,
  },
  {
    value: "general-expenses-ledger",
    label: "سجل النفقات",
    shortLabel: "السجل",
    icon: <FileSpreadsheet className="w-5 h-5 sm:w-6 sm:h-6" />,
    activeClass: ACTIVE_TAB_CLASS,
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
  const activeTabRef = useRef(activeTab);
  const tabHistoryRef = useRef<Tab[]>([getInitialTab()]);
  const [pwaInstallable, setPwaInstallable] = useState<boolean>(false);

  useEffect(() => {
    activeTabRef.current = activeTab;
  }, [activeTab]);

  useEffect(() => {
    const handlePopState = () => {
      const nextTab = new URLSearchParams(window.location.search).get("tab");
      const tab = isTabValue(nextTab) ? nextTab : "installments";
      const historyStack = tabHistoryRef.current;

      if (historyStack.length > 1 && historyStack[historyStack.length - 2] === tab) {
        tabHistoryRef.current = historyStack.slice(0, -1);
      } else {
        tabHistoryRef.current = [tab];
      }
      activeTabRef.current = tab;
      setActiveTab(tab);
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const goBackWithinApp = useCallback(() => {
    if (activeTabRef.current === "installments") return false;

    const historyStack = tabHistoryRef.current;
    if (historyStack.length > 1) {
      tabHistoryRef.current = historyStack.slice(0, -1);
      window.history.back();
      return true;
    }

    // عند فتح رابط مباشر على تبويب داخلي لا توجد حالة سابقة في history؛
    // نعيده إلى التبويب الأساسي داخل نفس الصفحة بدلاً من مغادرة التطبيق.
    activeTabRef.current = "installments";
    tabHistoryRef.current = ["installments"];
    setActiveTab("installments");
    const url = new URL(window.location.href);
    url.searchParams.delete("tab");
    window.history.replaceState(
      { tab: "installments" },
      "",
      `${url.pathname}${url.search}${url.hash}`,
    );
    return true;
  }, []);

  useEffect(() => {
    return installAndroidBackButton(() => goBackWithinApp());
  }, [goBackWithinApp]);

  useEffect(() => {
    setPwaInstallable(canInstall());
    const unsubscribe = onInstallAvailability((available) => {
      setPwaInstallable(available);
    });
    return () => unsubscribe();
  }, []);

  const handleTabChange = (tab: Tab) => {
    if (tab === activeTabRef.current) return;

    activeTabRef.current = tab;
    tabHistoryRef.current = [...tabHistoryRef.current, tab];
    setActiveTab(tab);
    const url = new URL(window.location.href);
    if (tab === "installments") url.searchParams.delete("tab");
    else url.searchParams.set("tab", tab);

    window.history.pushState({ tab }, "", `${url.pathname}${url.search}${url.hash}`);
  };

  const handlePWAInstall = async () => {
    const success = await promptInstall();
    if (success) {
      toast.success("يتم الآن تثبيت النظام على جهازك.");
      setPwaInstallable(false);
    }
  };

  return (
    // الحاوية الرئيسية بهوية "صقيع قطبي" الفاتحة
    <div
      className="apk-tabs-ui w-full min-h-screen bg-[#e8f0f8] selection:bg-[#6ba3c8]/30 text-base"
      dir="rtl"
    >
      {/* قسم الهيدر العلوي — أزرق ثلجي عصري */}
      <div className="relative grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 bg-gradient-to-l from-[#2e6b8a] via-[#3d7fa0] to-[#2e6b8a] px-3 py-3 sm:px-5 sm:py-4 border-b border-[#b8d4e8] shadow-sm text-white overflow-hidden">
        {/* خيط زخرفي أعلى الهيدر */}
        <div className="absolute inset-x-0 top-0 h-[3px] bg-[linear-gradient(90deg,#b8d4e8,#e8f0f8,#b8d4e8)] opacity-80" />

        {/* الجزء الأيمن: الشعار والعنوان والوصف */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="relative shrink-0 p-2 sm:p-2.5 bg-white/15 border border-white/30 rounded-2xl text-white hidden sm:flex items-center justify-center">
            <FileSpreadsheet className="w-5 h-5" />
          </div>
          <div className="flex flex-col gap-0.5 min-w-0">
            <h1 className="text-[clamp(1rem,3.4vw,1.35rem)] font-bold tracking-wide text-white leading-tight truncate sm:whitespace-normal">
              المجلس اليمني للاختصاصات الطبية
            </h1>
            <p className="text-[clamp(0.75rem,2.4vw,0.875rem)] text-[#e8f0f8] font-medium flex items-center gap-1.5 leading-snug min-w-0">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#b8d4e8] shrink-0"></span>
              <span className="truncate sm:whitespace-normal">
                نظام الإدارة المالية وحوافظ التوريد — صعدة، 2026م
              </span>
            </p>
          </div>
        </div>

        {/* الجزء الأيسر: زر تثبيت التطبيق */}
        <div className="flex items-center gap-2 shrink-0">
          {pwaInstallable && (
            <button
              onClick={handlePWAInstall}
              className="flex items-center gap-1.5 bg-white text-[#2e6b8a] hover:bg-[#e8f0f8] font-bold text-[13px] px-3 py-2 rounded-xl transition-all shadow-sm whitespace-nowrap active:scale-[0.97]"
            >
              <DownloadCloud className="w-4 h-4 shrink-0" />
              <span>تثبيت التطبيق</span>
            </button>
          )}
        </div>
      </div>

      {/* محتوى التبويب النشط */}
      <div className="w-full bg-[#f4f9fd] p-2.5 pb-28 sm:p-4 sm:pb-24 md:p-6 min-h-[calc(100vh-140px)]">
        <Suspense
          fallback={
            <div
              className="flex min-h-[35vh] items-center justify-center rounded-2xl border border-[#b8d4e8] bg-white/80 p-6 text-sm font-semibold text-[#2e6b8a]"
              role="status"
              aria-live="polite"
            >
              جارٍ فتح التبويب…
            </div>
          }
        >
          {activeTab === "installments" && <InstallmentsTab />}
          {activeTab === "hafiza" && <HafizaTab />}
          {activeTab === "account" && <AccountTab />}
          {activeTab === "journal" && <JournalTab />}
          {activeTab === "monthly" && <MonthlyStatementTab />}
          {activeTab === "revenue" && <RevenueTab />}
          {activeTab === "expenses-table" && <ExpensesTab />}
          {activeTab === "general-expenses-ledger" && <AppTabs />}
        </Suspense>
      </div>

      {/* شريط التبويبات السفلي — عائم زجاجي فاتح */}
      <nav
        className="fixed inset-x-0 bottom-0 z-[60] border-t border-[#b8d4e8] bg-white/90 pb-[env(safe-area-inset-bottom)] shadow-[0_-6px_22px_rgba(46,107,138,0.14)] backdrop-blur-xl"
        dir="rtl"
        aria-label="التنقل الرئيسي"
      >
        <div className="mx-auto flex max-w-7xl gap-1.5 overflow-x-auto px-2 py-2 sm:gap-2 sm:px-3">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.value;
            return (
              <button
                key={tab.value}
                type="button"
                onClick={() => handleTabChange(tab.value)}
                aria-current={isActive ? "page" : undefined}
                className={`flex min-h-[48px] min-w-[76px] shrink-0 flex-1 flex-col items-center justify-center gap-1 rounded-2xl px-2 py-1.5 text-center transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#6ba3c8] active:scale-[0.97] sm:min-w-[104px] sm:px-3 ${
                  isActive
                    ? `${tab.activeClass} text-white shadow-md`
                    : "text-[#4e6b80] hover:bg-[#e8f0f8]"
                }`}
              >
                <span className={isActive ? "scale-105" : "scale-100"}>{tab.icon}</span>
                <span className="text-[11.5px] font-bold leading-tight whitespace-nowrap sm:hidden">
                  {tab.shortLabel}
                </span>
                <span className="hidden text-[13px] font-bold leading-tight whitespace-nowrap sm:inline">
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