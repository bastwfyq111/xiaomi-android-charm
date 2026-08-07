export const fmt = (n: number | undefined | null) => {
  if (n === undefined || n === null || isNaN(Number(n))) return "";
  return Number(n).toLocaleString("en-US");
};

export const today = () => new Date().toISOString().slice(0, 10);

export const arDate = (s?: string) => {
  if (!s) return "";
  try {
    const d = new Date(s);
    if (isNaN(d.getTime())) return s;
    return d.toLocaleDateString("ar-EG-u-nu-latn", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  } catch {
    return s;
  }
};
