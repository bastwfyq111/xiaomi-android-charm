import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

const REPORT_DATE_STORAGE_KEY = "app-report-date-v1";

type ReportDateContextValue = {
  reportDate: string;
  reportDateLabel: string;
  setReportDate: (value: string) => void;
};

const getInitialReportDate = (): string => {
  if (typeof window !== "undefined") {
    const stored = window.localStorage.getItem(REPORT_DATE_STORAGE_KEY);
    if (stored && /^\d{4}-\d{2}-\d{2}$/.test(stored)) return stored;
  }
  return new Date().toISOString().slice(0, 10);
};

export const formatReportDate = (value?: string): string => {
  if (!value) return "";
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, (month || 1) - 1, day || 1);
  if (!year || !month || !day || Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("ar-EG-u-nu-latn", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
};

const ReportDateContext = createContext<ReportDateContextValue | null>(null);

export function ReportDateProvider({ children }: { children: ReactNode }) {
  const [reportDate, setReportDateState] = useState(getInitialReportDate);

  const setReportDate = useCallback((value: string) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return;
    setReportDateState(value);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(REPORT_DATE_STORAGE_KEY, value);
    }
  }, []);

  const value = useMemo(
    () => ({
      reportDate,
      reportDateLabel: formatReportDate(reportDate),
      setReportDate,
    }),
    [reportDate, setReportDate],
  );

  return <ReportDateContext.Provider value={value}>{children}</ReportDateContext.Provider>;
}

export const useReportDate = (): ReportDateContextValue => {
  const context = useContext(ReportDateContext);
  if (!context) throw new Error("useReportDate must be used within ReportDateProvider");
  return context;
};
