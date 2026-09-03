/**
 * تلوين صفوف التقارير حسب محتوى عمود «الملاحظات»
 * (مفصول = أحمر، منسحب = أصفر، متخرج = أخضر ... إلخ)
 */

export type NoteTone = "red" | "amber" | "green" | "blue" | "violet" | "gray";

const RULES: { tone: NoteTone; words: string[] }[] = [
  { tone: "red", words: ["مفصول", "فصل", "ملغي", "ملغى", "مستبعد", "محروم"] },
  { tone: "amber", words: ["منسحب", "انسحاب", "انسحب", "موقوف", "متوقف", "معلق", "مؤجل", "تأجيل"] },
  { tone: "green", words: ["متخرج", "متحرج", "تخرج", "خريج", "مكتمل", "مسدد", "منتهي"] },
  { tone: "blue", words: ["محول", "منقول", "تحويل", "مستمر", "منتظم"] },
  { tone: "violet", words: ["معفى", "إعفاء", "اعفاء", "منحة", "مبتعث"] },
];

/** يعيد نغمة اللون المناسبة لنص الملاحظة أو null إذا كانت فارغة */
export function getNoteTone(notes: any): NoteTone | null {
  const text = String(notes ?? "").trim();
  if (!text) return null;
  for (const rule of RULES) {
    if (rule.words.some((w) => text.includes(w))) return rule.tone;
  }
  return "gray";
}

/** صنف CSS للصف حسب الملاحظة */
export function noteRowClass(notes: any): string {
  const tone = getNoteTone(notes);
  return tone ? `note-row note-${tone}` : "";
}

/** أنماط الطباعة/PDF الخاصة بتلوين الصفوف */
export const noteRowCss = `
  table tbody tr.note-row td { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
  table tbody tr.note-red td { background: #fecaca !important; }
  table tbody tr.note-amber td { background: #fef08a !important; }
  table tbody tr.note-green td { background: #bbf7d0 !important; }
  table tbody tr.note-blue td { background: #bfdbfe !important; }
  table tbody tr.note-violet td { background: #e9d5ff !important; }
  table tbody tr.note-gray td { background: #e5e7eb !important; }
`;
