import template from "@/data/journalTemplate.json";

export type TemplateCol = { col: string; section: string | null; name: string | null };

const allCols: TemplateCol[] = template.cols as TemplateCol[];

// Helpers
export function colLetterToIndex(letter: string): number {
  let n = 0;
  for (const ch of letter) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n;
}
export function colIndexToLetter(n: number): string {
  let s = "";
  while (n > 0) {
    const r = (n - 1) % 26;
    s = String.fromCharCode(65 + r) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

// Debit side: columns 6..51 (F..AY), Credit side: 53..100 (BA..CV)
const DEBIT_RANGE = { start: 6, end: 51, totalCol: "AZ" };
const CREDIT_RANGE = { start: 53, end: 100, totalCol: "CW" };

export const DEBIT_OPTIONS: TemplateCol[] = allCols.filter((c) => {
  const i = colLetterToIndex(c.col);
  return i >= DEBIT_RANGE.start && i <= DEBIT_RANGE.end && c.name;
});
export const CREDIT_OPTIONS: TemplateCol[] = allCols.filter((c) => {
  const i = colLetterToIndex(c.col);
  return i >= CREDIT_RANGE.start && i <= CREDIT_RANGE.end && c.name;
});

export const DEBIT_TOTAL_COL = DEBIT_RANGE.totalCol;
export const CREDIT_TOTAL_COL = CREDIT_RANGE.totalCol;
export const DEBIT_FIRST = DEBIT_RANGE.start;
export const DEBIT_LAST = DEBIT_RANGE.end;
export const CREDIT_FIRST = CREDIT_RANGE.start;
export const CREDIT_LAST = CREDIT_RANGE.end;

export const TEMPLATE = template as {
  top1: Record<string, string | number>;
  top2: Record<string, string | number>;
  cols: TemplateCol[];
  merges: string[];
  widths: Record<string, number>;
};

export function findColByName(name: string, side: "debit" | "credit"): string | null {
  const list = side === "debit" ? DEBIT_OPTIONS : CREDIT_OPTIONS;
  const t = name.replace(/\s+/g, " ").trim();
  const hit = list.find((o) => (o.name || "").replace(/\s+/g, " ").trim() === t);
  return hit ? hit.col : null;
}

export function optionLabel(o: TemplateCol): string {
  if (!o.name) return o.col;
  if (o.section && o.section !== o.name) return `${o.section} — ${o.name}`;
  return o.name;
}
