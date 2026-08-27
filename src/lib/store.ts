import { create } from "zustand";
import { persist } from "zustand/middleware";
import seedTrainees from "@/data/trainees.json";
import seedInstallments from "@/data/installments.json";

// ==========================================
// 1. تعريف الأنواع (Types)
// ==========================================

export type Trainee = { name: string; batch: string; specialty: string };

export const INSTALLMENT_MONTHS = [
  "يناير",
  "فبراير",
  "مارس",
  "ابريل",
  "مايو",
  "يونيو",
  "يوليو",
  "اغسطس",
  "سبتمبر",
  "اكتوبر",
  "نوفمبر",
  "ديسمبر",
] as const;

export type InstallmentCustomColumn = {
  name: string;
  type: "text" | "select" | "formula";
  options?: string[];
  formula?: string;
};

export type InstallmentConditionalRule = { text: string; color: string };

export type Installment = {
  no?: number | null;
  name: string;
  batch: string;
  specialty: string;
  fees: number;
  prevDue: number;
  payments: Record<string, number>;
  totalPaid: number;
  remaining: number;
  notes: string;
  phone: string;
  customData?: Record<string, string | number>;
};

export type Hafiza = {
  id: string;
  name: string;
  batch: string;
  specialty: string;
  date: string;
  hafizaNo: string;
  description: string;
  hafizaAmount: number;
  notifyDate?: string;
  notifyNo?: string;
  notifyAmount?: number;
  income?: number;
};

export type Account = {
  id: string;
  date: string;
  hafizaNo: string;
  notifyNo: string;
  notifyDate: string;
  checkNo: string;
  checkDate: string;
  description: string;
  specialty: string;
  name: string;
  hafizaAmount: number;
  income: number;
  expense: number;
  sourceHafizaId?: string;
  revenueKey?: string;
};

export type Journal = {
  id: string;
  transactionId?: string;
  date: string;
  formNo: string;
  settlement?: string;
  description: string;
  debit: number;
  credit: number;
  account: string;
  debitAccount?: string;
  creditAccount?: string;
  debitCol?: string;
  creditCol?: string;
};

export type RevenueMap = Record<string, number>;

export type CustomTab = {
  id: string;
  name: string;
  columns: string[];
  rows: Record<string, string | number>[];
};

// ==========================================
// 2. واجهة حالة المتجر (State Interface)
// ==========================================
type State = {
  trainees: Trainee[];
  hafiza: Hafiza[];
  hafizas: Hafiza[];
  accounts: Account[];
  journal: Journal[];
  installments: Installment[];
  installments2025: Installment[];
  openingBalance: number;
  revenue: RevenueMap;
  customTabs: CustomTab[];
  installmentCustomColumns2026: InstallmentCustomColumn[];
  installmentConditionalRules2026: InstallmentConditionalRule[];

  addTrainee: (t: Trainee) => void;
  updateTrainee: (index: number, t: Trainee) => void;
  deleteTrainee: (index: number) => void;
  importTrainees: (trainees: Trainee[]) => void;

  addHafiza: (h: Omit<Hafiza, "id">) => Hafiza;
  updateHafiza: (id: string, h: Partial<Hafiza>) => void;
  deleteHafiza: (id: string) => void;
  clearHafiza: () => void;

  addAccount: (a: Omit<Account, "id">) => Account;
  updateAccount: (id: string, a: Partial<Account>) => void;
  deleteAccount: (id: string) => void;
  clearAccounts: () => void;

  addJournal: (j: Omit<Journal, "id">) => Journal;
  updateJournal: (id: string, j: Partial<Journal>) => void;
  deleteJournal: (id: string) => void;
  clearJournal: () => void;

  addInstallment: (i: Omit<Installment, "totalPaid" | "remaining">, year?: "2025") => void;
  updateInstallment: (index: number, i: Partial<Installment>, year?: "2025") => void;
  updateInstallmentPayment: (index: number, month: string, amount: number, year?: "2025") => void;
  deleteInstallment: (index: number, year?: "2025") => void;
  clearInstallments: (year?: "2025") => void;
  recalcAllInstallments: () => void;
  setInstallmentCustomColumns2026: (columns: InstallmentCustomColumn[]) => void;
  setInstallmentConditionalRules2026: (rules: InstallmentConditionalRule[]) => void;

  setOpeningBalance: (n: number) => void;
  setRevenue: (year: number, month: number, itemKey: string, amount: number) => void;

  importData: (d: any) => void;
  exportAllData: () => any;
  clearAll: () => void;
  clearTab: (tab: string) => void;

  addCustomTab: (name: string) => CustomTab;
  renameCustomTab: (id: string, name: string) => void;
  deleteCustomTab: (id: string) => void;
  addCustomColumn: (id: string, col: string) => void;
  removeCustomColumn: (id: string, col: string) => void;
  addCustomRow: (id: string, row: Record<string, string | number>) => void;
  updateCustomRow: (id: string, index: number, row: Record<string, string | number>) => void;
  deleteCustomRow: (id: string, index: number) => void;

  getHafizaById: (id: string) => Hafiza | undefined;
  getAccountById: (id: string) => Account | undefined;
  getTotalIncome: () => number;
  getTotalExpenses: () => number;
  getOverdueInstallments: (year?: "2025") => Installment[];
  getInstallmentByIndex: (index: number, year?: "2025") => Installment | undefined;

  syncHafizaToAccount: (hafiza: Hafiza) => void;
};

// ==========================================
// 3. دوال مساعدة محلية (Local Helpers)
// ==========================================
const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
const getToday = () => new Date().toISOString().split("T")[0];

const recalcInstallment = (i: Installment): Installment => {
  const totalPaid = Object.values(i.payments || {}).reduce((s, v) => s + (Number(v) || 0), 0);
  const fees = Number(i.fees) || 0;
  const prevDue = Number(i.prevDue) || 0;
  return { ...i, fees, prevDue, totalPaid, remaining: prevDue - totalPaid };
};

const recalculateRevenueMap = (accounts: Account[]): RevenueMap => {
  const newRevenue: RevenueMap = {};
  accounts.forEach((acc) => {
    if (acc.revenueKey && acc.income > 0) {
      const dateStr = acc.notifyDate || acc.date;
      const d = new Date(dateStr);
      const year = isNaN(d.getFullYear()) ? 2026 : d.getFullYear();
      const month = isNaN(d.getMonth()) ? 1 : d.getMonth() + 1;
      const compositeKey = `${year}-${month}-${acc.revenueKey}`;
      newRevenue[compositeKey] = (newRevenue[compositeKey] || 0) + acc.income;
    }
  });
  return newRevenue;
};

// ==========================================
// 4. إنشاء المتجر (Store Creation)
// ==========================================
export const useStore = create<State>()(
  persist(
    (set, get) => ({
      trainees: seedTrainees as Trainee[],
      hafiza: [],
      hafizas: [],
      accounts: [],
      journal: [],
      installments: (seedInstallments as Installment[]).map(recalcInstallment),
      installments2025: [],
      openingBalance: 811664,
      revenue: {},
      customTabs: [],
      installmentCustomColumns2026: [],
      installmentConditionalRules2026: [],

      syncHafizaToAccount: (hafiza: Hafiza) => {
        const year = hafiza.date?.split("-")[0];
        if (year !== "2026") return;

        let existingAccount = get().accounts.find((acc) => acc.sourceHafizaId === hafiza.id);
        if (!existingAccount && hafiza.hafizaNo) {
          existingAccount = get().accounts.find((acc) => acc.hafizaNo === hafiza.hafizaNo);
          if (existingAccount) {
            set((state) => ({
              accounts: state.accounts.map((acc) =>
                acc.id === existingAccount!.id ? { ...acc, sourceHafizaId: hafiza.id } : acc,
              ),
            }));
          }
        }

        const getNotifyAmount = (h: any): number => {
          const val = h.notifyAmount ?? h.supplyAmount ?? h.tawreedAmount ?? 0;
          const num = Number(val);
          return isNaN(num) ? 0 : num;
        };

        const mappedData = {
          date: hafiza.date,
          hafizaNo: hafiza.hafizaNo || "",
          notifyNo: hafiza.notifyNo || "",
          notifyDate: hafiza.notifyDate || "",
          description: hafiza.description,
          specialty: hafiza.specialty,
          name: hafiza.name,
          hafizaAmount: Number(hafiza.hafizaAmount) || 0,
          income: getNotifyAmount(hafiza),
          sourceHafizaId: hafiza.id,
        };

        if (!existingAccount) {
          const newAccount: Account = {
            id: uid(),
            ...mappedData,
            checkNo: "",
            checkDate: "",
            expense: 0,
            revenueKey: undefined,
          };
          set((state) => {
            const updatedAccounts = [...state.accounts, newAccount];
            return { accounts: updatedAccounts, revenue: recalculateRevenueMap(updatedAccounts) };
          });
        } else {
          const hasDiff =
            existingAccount.date !== mappedData.date ||
            existingAccount.hafizaNo !== mappedData.hafizaNo ||
            existingAccount.notifyNo !== mappedData.notifyNo ||
            existingAccount.notifyDate !== mappedData.notifyDate ||
            existingAccount.description !== mappedData.description ||
            existingAccount.specialty !== mappedData.specialty ||
            existingAccount.name !== mappedData.name ||
            existingAccount.hafizaAmount !== mappedData.hafizaAmount ||
            existingAccount.income !== mappedData.income;
          if (hasDiff) {
            set((state) => {
              const updatedAccounts = state.accounts.map((acc) =>
                acc.id === existingAccount!.id
                  ? {
                      ...acc,
                      ...mappedData,
                      revenueKey: acc.revenueKey,
                      expense: acc.expense,
                      checkNo: acc.checkNo,
                      checkDate: acc.checkDate,
                    }
                  : acc,
              );
              return { accounts: updatedAccounts, revenue: recalculateRevenueMap(updatedAccounts) };
            });
          }
        }
      },

      addTrainee: (t) => set((s) => ({ trainees: [...s.trainees, t] })),
      updateTrainee: (index, t) =>
        set((s) => ({ trainees: s.trainees.map((tr, i) => (i === index ? t : tr)) })),
      deleteTrainee: (index) =>
        set((s) => ({ trainees: s.trainees.filter((_, i) => i !== index) })),
      importTrainees: (trainees) => set((s) => ({ trainees: [...s.trainees, ...trainees] })),

      addHafiza: (h) => {
        const item: Hafiza = {
          ...h,
          id: uid(),
          date: h.date || getToday(),
          hafizaAmount: Number(h.hafizaAmount) || 0,
          notifyAmount: Number(h.notifyAmount) || 0,
        };
        set((s) => {
          const updated = [...s.hafiza, item];
          return { hafiza: updated, hafizas: updated };
        });
        get().syncHafizaToAccount(item);
        return item;
      },
      updateHafiza: (id, h) =>
        set((s) => {
          const updated = s.hafiza.map((x) => (x.id === id ? { ...x, ...h } : x));
          const updatedHafiza = updated.find((x) => x.id === id);
          if (updatedHafiza) {
            setTimeout(() => get().syncHafizaToAccount(updatedHafiza), 0);
          }
          return { hafiza: updated, hafizas: updated };
        }),
      deleteHafiza: (id) => {
        set((state) => {
          const updatedHafiza = state.hafiza.filter((x) => x.id !== id);
          const linkedAccount = state.accounts.find((acc) => acc.sourceHafizaId === id);
          if (linkedAccount) {
            const updatedAccounts = state.accounts.filter((acc) => acc.id !== linkedAccount.id);
            return {
              hafiza: updatedHafiza,
              hafizas: updatedHafiza,
              accounts: updatedAccounts,
              revenue: recalculateRevenueMap(updatedAccounts),
            };
          }
          return { hafiza: updatedHafiza, hafizas: updatedHafiza };
        });
      },
      clearHafiza: () => {
        set((state) => {
          const hafizaIds = state.hafiza.map((h) => h.id);
          const updatedAccounts = state.accounts.filter(
            (acc) => !acc.sourceHafizaId || !hafizaIds.includes(acc.sourceHafizaId),
          );
          return {
            hafiza: [],
            hafizas: [],
            accounts: updatedAccounts,
            revenue: recalculateRevenueMap(updatedAccounts),
          };
        });
      },

      addAccount: (a) => {
        const item: Account = {
          ...a,
          id: uid(),
          date: a.date || getToday(),
          hafizaAmount: Number(a.hafizaAmount) || 0,
          income: Number(a.income) || 0,
          expense: Number(a.expense) || 0,
        };
        set((s) => {
          const newAccounts = [...s.accounts, item];
          return { accounts: newAccounts, revenue: recalculateRevenueMap(newAccounts) };
        });
        return item;
      },
      updateAccount: (id, a) =>
        set((s) => {
          const newAccounts = s.accounts.map((x) => (x.id === id ? { ...x, ...a } : x));
          return { accounts: newAccounts, revenue: recalculateRevenueMap(newAccounts) };
        }),
      deleteAccount: (id) =>
        set((s) => {
          const newAccounts = s.accounts.filter((x) => x.id !== id);
          return { accounts: newAccounts, revenue: recalculateRevenueMap(newAccounts) };
        }),
      clearAccounts: () => set({ accounts: [], revenue: {} }),

      addJournal: (j) => {
        const item: Journal = {
          ...j,
          id: uid(),
          transactionId: j.transactionId || uid(),
          date: j.date || getToday(),
          debit: Number(j.debit) || 0,
          credit: Number(j.credit) || 0,
        };
        set((s) => ({ journal: [...s.journal, item] }));
        return item;
      },
      updateJournal: (id, j) =>
        set((s) => ({
          journal: s.journal.map((x) => (x.id === id ? { ...x, ...j } : x)),
        })),
      deleteJournal: (id) =>
        set((s) => {
          const target = s.journal.find((x) => x.id === id);
          if (target && target.transactionId) {
            return { journal: s.journal.filter((x) => x.transactionId !== target.transactionId) };
          }
          return { journal: s.journal.filter((x) => x.id !== id) };
        }),
      clearJournal: () => set({ journal: [] }),

      addInstallment: (i, year) => {
        const newInst = recalcInstallment({
          ...i,
          payments: {},
          totalPaid: 0,
          remaining: Number(i.prevDue) || 0,
        } as Installment);
        set((s) => {
          const key = year === "2025" ? "installments2025" : "installments";
          return { [key]: [...s[key], newInst] };
        });
      },
      updateInstallment: (index, i, year) =>
        set((s) => {
          const key = year === "2025" ? "installments2025" : "installments";
          return {
            [key]: s[key].map((inst, idx) =>
              idx === index ? recalcInstallment({ ...inst, ...i }) : inst,
            ),
          };
        }),
      updateInstallmentPayment: (index, month, amount, year) =>
        set((s) => {
          const key = year === "2025" ? "installments2025" : "installments";
          return {
            [key]: s[key].map((inst, idx) =>
              idx === index
                ? recalcInstallment({ ...inst, payments: { ...inst.payments, [month]: amount } })
                : inst,
            ),
          };
        }),
      deleteInstallment: (index, year) =>
        set((s) => {
          const key = year === "2025" ? "installments2025" : "installments";
          return { [key]: s[key].filter((_, i) => i !== index) };
        }),
      clearInstallments: (year) => {
        if (year === "2025") set({ installments2025: [] });
        else set({ installments: [], installments2025: [] });
      },
      recalcAllInstallments: () =>
        set((s) => ({
          installments: s.installments.map(recalcInstallment),
          installments2025: s.installments2025.map(recalcInstallment),
        })),
      setInstallmentCustomColumns2026: (columns) => set({ installmentCustomColumns2026: columns }),
      setInstallmentConditionalRules2026: (rules) =>
        set({ installmentConditionalRules2026: rules }),

      setOpeningBalance: (n) => set({ openingBalance: n }),
      setRevenue: (year, month, itemKey, amount) =>
        set((s) => ({ revenue: { ...s.revenue, [`${year}-${month}-${itemKey}`]: amount } })),

      importData: (d) =>
        set((s) => {
          const importedAccounts = d.accounts
            ? [
                ...s.accounts,
                ...d.accounts.map((a: any) => ({
                  ...a,
                  id: a.id || uid(),
                  hafizaAmount: Number(a.hafizaAmount) || 0,
                  income: Number(a.income) || 0,
                  expense: Number(a.expense) || 0,
                })),
              ]
            : s.accounts;

          const rawHafiza = d.hafiza || d.hafizas || [];
          const importedHafiza = [
            ...s.hafiza,
            ...rawHafiza.map((h: any) => ({
              ...h,
              id: h.id || uid(),
              hafizaAmount: Number(h.hafizaAmount) || 0,
              notifyAmount: Number(h.notifyAmount) || 0,
            })),
          ];

          return {
            trainees: d.trainees ? [...s.trainees, ...d.trainees] : s.trainees,
            journal: d.journal
              ? [
                  ...s.journal,
                  ...d.journal.map((j: any) => ({
                    ...j,
                    id: j.id || uid(),
                    transactionId: j.transactionId || uid(),
                    debit: Number(j.debit) || 0,
                    credit: Number(j.credit) || 0,
                  })),
                ]
              : s.journal,
            hafiza: importedHafiza,
            hafizas: importedHafiza,
            accounts: importedAccounts,
            revenue: d.accounts
              ? recalculateRevenueMap(importedAccounts)
              : d.revenue
                ? { ...s.revenue, ...d.revenue }
                : s.revenue,
            installments: d.installments
              ? [...s.installments, ...d.installments.map(recalcInstallment)]
              : s.installments,
            installments2025: d.installments2025
              ? [...s.installments2025, ...d.installments2025.map(recalcInstallment)]
              : s.installments2025,
            openingBalance: d.openingBalance ?? s.openingBalance,
            installmentCustomColumns2026:
              d.installmentCustomColumns2026 ?? s.installmentCustomColumns2026,
            installmentConditionalRules2026:
              d.installmentConditionalRules2026 ?? s.installmentConditionalRules2026,
          };
        }),

      exportAllData: () => ({
        trainees: get().trainees,
        hafiza: get().hafiza,
        hafizas: get().hafizas,
        accounts: get().accounts,
        journal: get().journal,
        installments: get().installments,
        installments2025: get().installments2025,
        openingBalance: get().openingBalance,
        revenue: get().revenue,
        customTabs: get().customTabs,
        installmentCustomColumns2026: get().installmentCustomColumns2026,
        installmentConditionalRules2026: get().installmentConditionalRules2026,
      }),
      clearAll: () =>
        set({
          hafiza: [],
          hafizas: [],
          accounts: [],
          journal: [],
          installments: [],
          installments2025: [],
          revenue: {},
        }),
      clearTab: (tab) =>
        set((s) => {
          if (tab === "hafiza" || tab === "hafizas") return { ...s, hafiza: [], hafizas: [] };
          return { ...s, [tab]: [] };
        }),

      addCustomTab: (name) => {
        const tab: CustomTab = { id: uid(), name, columns: [], rows: [] };
        set((s) => ({ customTabs: [...s.customTabs, tab] }));
        return tab;
      },
      renameCustomTab: (id, name) =>
        set((s) => ({ customTabs: s.customTabs.map((t) => (t.id === id ? { ...t, name } : t)) })),
      deleteCustomTab: (id) =>
        set((s) => ({ customTabs: s.customTabs.filter((t) => t.id !== id) })),
      addCustomColumn: (id, col) =>
        set((s) => ({
          customTabs: s.customTabs.map((t) =>
            t.id === id && !t.columns.includes(col) ? { ...t, columns: [...t.columns, col] } : t,
          ),
        })),
      removeCustomColumn: (id, col) =>
        set((s) => ({
          customTabs: s.customTabs.map((t) =>
            t.id === id ? { ...t, columns: t.columns.filter((c) => c !== col) } : t,
          ),
        })),
      addCustomRow: (id, row) =>
        set((s) => ({
          customTabs: s.customTabs.map((t) => (t.id === id ? { ...t, rows: [...t.rows, row] } : t)),
        })),
      updateCustomRow: (id, index, row) =>
        set((s) => ({
          customTabs: s.customTabs.map((t) =>
            t.id === id ? { ...t, rows: t.rows.map((r, i) => (i === index ? row : r)) } : t,
          ),
        })),
      deleteCustomRow: (id, index) =>
        set((s) => ({
          customTabs: s.customTabs.map((t) =>
            t.id === id ? { ...t, rows: t.rows.filter((_, i) => i !== index) } : t,
          ),
        })),

      getHafizaById: (id) => get().hafiza.find((h) => h.id === id),
      getAccountById: (id) => get().accounts.find((a) => a.id === id),
      getTotalIncome: () => get().journal.reduce((sum, j) => sum + (j.credit || 0), 0),
      getTotalExpenses: () => get().journal.reduce((sum, j) => sum + (j.debit || 0), 0),
      getOverdueInstallments: (year) => {
        const key = year === "2025" ? "installments2025" : "installments";
        return get()[key].filter((i: Installment) => i.remaining > 0);
      },
      getInstallmentByIndex: (index, year) => {
        const key = year === "2025" ? "installments2025" : "installments";
        return get()[key][index];
      },
    }),
    {
      name: "majlis-yemen-v1",
      version: 2,
      partialize: (state) => ({
        trainees: state.trainees,
        hafiza: state.hafiza,
        hafizas: state.hafizas,
        accounts: state.accounts,
        journal: state.journal,
        installments: state.installments,
        installments2025: state.installments2025,
        openingBalance: state.openingBalance,
        revenue: state.revenue,
        customTabs: state.customTabs,
        installmentCustomColumns2026: state.installmentCustomColumns2026,
        installmentConditionalRules2026: state.installmentConditionalRules2026,
      }),
    },
  ),
);

// تصدير الـ Hooks المخصصة
export const useTrainees = () => useStore((s) => s.trainees);
export const useHafiza = () => useStore((s) => s.hafiza);
export const useHafizas = () => useStore((s) => s.hafizas);
export const useAccounts = () => useStore((s) => s.accounts);
export const useJournal = () => useStore((s) => s.journal);
export const useInstallments = () => useStore((s) => s.installments);
export const useInstallments2025 = () => useStore((s) => s.installments2025);
export const useCustomTabs = () => useStore((s) => s.customTabs);
export const useRevenue = () => useStore((s) => s.revenue);
export const useOpeningBalance = () => useStore((s) => s.openingBalance);
