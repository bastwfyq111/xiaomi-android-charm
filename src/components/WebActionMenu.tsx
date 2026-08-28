import { useEffect, useRef, useState, type ReactNode } from "react";
import { ChevronDown, type LucideIcon } from "lucide-react";

export type WebActionItem = {
  label: string;
  onSelect: () => void | Promise<void>;
  icon?: LucideIcon;
  disabled?: boolean;
  destructive?: boolean;
  content?: ReactNode;
};

type Props = {
  label?: string;
  actions: WebActionItem[];
  className?: string;
};

export default function WebActionMenu({
  label = "إجراءات التبويب",
  actions,
  className = "",
}: Props) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const closeOnOutsidePointer = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("pointerdown", closeOnOutsidePointer);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsidePointer);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  return (
    <div ref={menuRef} className={`relative inline-flex ${className}`} dir="rtl">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="inline-flex items-center justify-center gap-2 rounded-lg border border-[#10528e]/25 bg-white px-3 py-2 text-sm font-bold text-[#10528e] shadow-sm transition-colors hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-[#10528e]/30 active:scale-[0.98]"
      >
        <ChevronDown className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} />
        <span>{label}</span>
      </button>

      {open && (
        <div
          role="menu"
          aria-label={label}
          className="absolute right-0 top-full z-50 mt-1 min-w-52 overflow-hidden rounded-xl border border-slate-200 bg-white p-1.5 text-right shadow-xl"
        >
          {actions.map((action) => {
            const Icon = action.icon;
            if (action.content) {
              return (
                <div
                  key={action.label}
                  role="menuitem"
                  aria-label={action.label}
                  aria-disabled={action.disabled}
                  onClick={() => {
                    if (action.disabled) return;
                    // تأخير الإغلاق يسمح للـ label وinput المخفي في ImportButton بتنفيذ نقرتهما الأصلية.
                    window.setTimeout(() => setOpen(false), 0);
                  }}
                  className={`w-full rounded-lg text-right ${
                    action.disabled ? "pointer-events-none opacity-50" : ""
                  }`}
                >
                  {action.content}
                </div>
              );
            }
            return (
              <button
                key={action.label}
                type="button"
                role="menuitem"
                disabled={action.disabled}
                onClick={() => {
                  setOpen(false);
                  void action.onSelect();
                }}
                className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                  action.destructive
                    ? "text-rose-700 hover:bg-rose-50"
                    : "text-slate-700 hover:bg-slate-100"
                }`}
              >
                {Icon ? <Icon className="h-4 w-4 shrink-0" /> : null}
                <span>{action.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export type { Props as WebActionMenuProps };
