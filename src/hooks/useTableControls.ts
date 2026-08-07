import { useMemo, useState } from "react";

export type SortDir = "asc" | "desc" | null;

export function useTableControls<T extends Record<string, any>>(rows: T[], keys: string[]) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>(null);
  const [filters, setFilters] = useState<Record<string, string>>({});

  const toggleSort = (k: string) => {
    if (sortKey !== k) {
      setSortKey(k);
      setSortDir("asc");
      return;
    }
    if (sortDir === "asc") {
      setSortDir("desc");
      return;
    }
    if (sortDir === "desc") {
      setSortKey(null);
      setSortDir(null);
      return;
    }
    setSortDir("asc");
  };

  const setFilter = (k: string, v: string) => setFilters((f) => ({ ...f, [k]: v }));
  const clearFilters = () => setFilters({});

  const processed = useMemo(() => {
    let out = rows;
    // per-column filter
    const active = Object.entries(filters).filter(([, v]) => v.trim() !== "");
    if (active.length) {
      out = out.filter((r) =>
        active.every(([k, v]) =>
          String(r[k] ?? "")
            .toLowerCase()
            .includes(v.trim().toLowerCase()),
        ),
      );
    }
    if (sortKey && sortDir) {
      const dir = sortDir === "asc" ? 1 : -1;
      out = [...out].sort((a, b) => {
        const av = a[sortKey];
        const bv = b[sortKey];
        if (av == null && bv == null) return 0;
        if (av == null) return -1 * dir;
        if (bv == null) return 1 * dir;
        if (typeof av === "number" && typeof bv === "number") return (av - bv) * dir;
        return String(av).localeCompare(String(bv), "ar") * dir;
      });
    }
    return out;
  }, [rows, sortKey, sortDir, filters]);

  return { rows: processed, sortKey, sortDir, toggleSort, filters, setFilter, clearFilters };
}

export function sortIndicator(active: boolean, dir: SortDir) {
  if (!active || !dir) return "↕";
  return dir === "asc" ? "▲" : "▼";
}
