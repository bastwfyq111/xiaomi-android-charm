import { useState, useEffect } from "react";

export type EditField = {
  key: string;
  label: string;
  type?: "text" | "number" | "date" | "select";
  options?: readonly string[];
  optionLabels?: Record<string, string>;
  colSpan?: 1 | 2 | 3;
};

export default function EditModal({
  title,
  fields,
  values,
  onSave,
  onClose,
}: {
  title: string;
  fields: EditField[];
  values: Record<string, any>;
  onSave: (v: Record<string, any>) => void;
  onClose: () => void;
}) {
  const [data, setData] = useState<Record<string, any>>(values);
  useEffect(() => setData(values), [values]);

  const set = (k: string, v: any) => setData((d) => ({ ...d, [k]: v }));

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center sm:p-3"
      onClick={onClose}
    >
      <div
        className="bg-background shadow-2xl max-w-3xl w-full max-h-[100dvh] sm:max-h-[90vh] overflow-y-auto rounded-t-2xl sm:rounded-xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-gradient-to-l from-primary to-primary/80 text-primary-foreground p-4 rounded-t-2xl sm:rounded-t-xl flex items-center justify-between sticky top-0 z-10">
          <h3 className="font-bold text-lg">{title}</h3>
          <button
            onClick={onClose}
            className="text-3xl leading-none w-10 h-10 flex items-center justify-center -m-2"
          >
            ×
          </button>
        </div>
        <div className="p-4 sm:p-5 grid grid-cols-1 md:grid-cols-3 gap-3 flex-1">
          {fields.map((f) => (
            <div
              key={f.key}
              className={f.colSpan === 3 ? "md:col-span-3" : f.colSpan === 2 ? "md:col-span-2" : ""}
            >
              <label className="text-xs text-muted-foreground">{f.label}</label>
              {f.type === "select" ? (
                <select
                  value={data[f.key] ?? ""}
                  onChange={(e) => set(f.key, e.target.value)}
                  className="w-full px-3 py-3 border rounded-lg bg-input/30 focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="">—</option>
                  {(f.options || []).map((o) => (
                    <option key={o} value={o}>
                      {f.optionLabels?.[o] ?? o}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type={f.type || "text"}
                  value={data[f.key] ?? ""}
                  onChange={(e) =>
                    set(
                      f.key,
                      f.type === "number"
                        ? e.target.value === ""
                          ? ""
                          : Number(e.target.value)
                        : e.target.value,
                    )
                  }
                  inputMode={f.type === "number" ? "decimal" : undefined}
                  className="w-full px-3 py-3 border rounded-lg bg-input/30 focus:outline-none focus:ring-2 focus:ring-ring"
                />
              )}
            </div>
          ))}
        </div>
        <div
          className="p-3 sm:p-4 border-t flex gap-2 justify-end sticky bottom-0 bg-background"
          style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
        >
          <button onClick={onClose} className="flex-1 sm:flex-none px-4 py-3 border rounded-lg">
            إلغاء
          </button>
          <button
            onClick={() => onSave(data)}
            className="flex-1 sm:flex-none px-5 py-3 bg-primary text-primary-foreground rounded-lg font-semibold"
          >
            حفظ
          </button>
        </div>
      </div>
    </div>
  );
}
