import { useState } from "react";
import { useStore } from "@/lib/store";
import { toast } from "sonner";

export default function CustomTab({ tabId }: { tabId: string }) {
  const tab = useStore((s) => s.customTabs.find((t) => t.id === tabId));
  const {
    addCustomColumn,
    removeCustomColumn,
    addCustomRow,
    updateCustomRow,
    deleteCustomRow,
    renameCustomTab,
    deleteCustomTab,
  } = useStore();
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [newCol, setNewCol] = useState("");

  if (!tab) return <p className="text-muted-foreground text-center py-6">التبويب غير موجود</p>;

  const submit = () => {
    const row: Record<string, string | number> = {};
    tab.columns.forEach((c) => {
      const v = draft[c] ?? "";
      // try numeric for amount-like columns
      if (/مبلغ|amount|قيمة/i.test(c) && v !== "") {
        const n = Number(v);
        row[c] = isNaN(n) ? v : n;
      } else row[c] = v;
    });
    addCustomRow(tab.id, row);
    setDraft({});
    toast.success("تم الحفظ ورُحّل إلى الحوافظ والحساب واليومية");
  };

  return (
    <div className="space-y-4">
      <div className="bg-card rounded-xl border p-4 flex flex-wrap gap-2 items-center justify-between">
        <input
          value={tab.name}
          onChange={(e) => renameCustomTab(tab.id, e.target.value)}
          className="px-3 py-2 border rounded-lg font-bold text-primary bg-input/30"
        />
        <div className="flex gap-2">
          <input
            placeholder="اسم عمود جديد"
            value={newCol}
            onChange={(e) => setNewCol(e.target.value)}
            className="px-3 py-2 border rounded-lg bg-input/30 text-sm"
          />
          <button
            onClick={() => {
              if (newCol) {
                addCustomColumn(tab.id, newCol);
                setNewCol("");
              }
            }}
            className="px-3 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-semibold"
          >
            + عمود
          </button>
          <button
            onClick={() => {
              if (confirm("حذف هذا التبويب؟")) deleteCustomTab(tab.id);
            }}
            className="px-3 py-2 border border-destructive text-destructive rounded-lg text-sm"
          >
            حذف التبويب
          </button>
        </div>
      </div>

      <div className="bg-card rounded-xl border p-4">
        <h3 className="font-bold mb-3 text-primary">إضافة صف جديد</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          {tab.columns.map((c) => (
            <div key={c}>
              <label className="text-xs text-muted-foreground flex justify-between">
                <span>{c}</span>
                <button
                  onClick={() => removeCustomColumn(tab.id, c)}
                  className="text-destructive text-xs"
                >
                  ×
                </button>
              </label>
              <input
                value={draft[c] ?? ""}
                onChange={(e) => setDraft({ ...draft, [c]: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg bg-input/30"
              />
            </div>
          ))}
        </div>
        <button
          onClick={submit}
          className="mt-3 px-5 py-2 bg-primary text-primary-foreground rounded-lg font-semibold"
        >
          حفظ
        </button>
      </div>

      <div className="bg-card rounded-xl border p-4 overflow-x-auto">
        <table className="w-max w-max table-auto text-sm sm:text-base">
          <thead className="bg-secondary text-secondary-foreground">
            <tr>
              <th className="text-right !px-0.5 !py-1 sm:!px-1 sm:!py-1 !text-[10px] sm:!text-xs whitespace-nowrap">م</th>
              {tab.columns.map((c) => (
                <th key={c} className="text-right whitespace-nowrap !px-0.5 !py-1 sm:!px-1 sm:!py-1 !text-[10px] sm:!text-xs">
                  {c}
                </th>
              ))}
              <th className="text-right !px-0.5 !py-1 sm:!px-1 sm:!py-1 !text-[10px] sm:!text-xs whitespace-nowrap">إجراءات</th>
            </tr>
          </thead>
          <tbody>
            {tab.rows.map((r, i) => (
              <tr key={i} className="border-t hover:bg-muted/40">
                <td className="!px-0.5 !py-1 sm:!px-1 sm:!py-1 !text-[10px] sm:!text-xs whitespace-nowrap">{i + 1}</td>
                {tab.columns.map((c) => (
                  <td key={c} className="!px-0.5 !py-1 sm:!px-1 sm:!py-1 !text-[10px] sm:!text-xs whitespace-nowrap">
                    <input
                      value={String(r[c] ?? "")}
                      onChange={(e) => updateCustomRow(tab.id, i, { ...r, [c]: e.target.value })}
                      className="w-full px-2 py-1 border-0 bg-transparent focus:bg-input/30 rounded"
                    />
                  </td>
                ))}
                <td className="!px-0.5 !py-1 sm:!px-1 sm:!py-1 !text-[10px] sm:!text-xs whitespace-nowrap">
                  <button
                    onClick={() => deleteCustomRow(tab.id, i)}
                    className="text-destructive text-xs"
                  >
                    حذف
                  </button>
                </td>
              </tr>
            ))}
            {tab.rows.length === 0 && (
              <tr>
                <td
                  colSpan={tab.columns.length + 2}
                  className="text-center text-muted-foreground !px-0.5 !py-1 sm:!px-1 sm:!py-1 !text-[10px] sm:!text-xs whitespace-nowrap"
                >
                  لا توجد بيانات
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
