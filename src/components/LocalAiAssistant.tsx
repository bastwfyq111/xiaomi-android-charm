import { useCallback, useRef, useState } from "react";
import type { MLCEngine } from "@mlc-ai/web-llm";
import {
  Bot,
  CheckCircle2,
  Cpu,
  Loader2,
  RotateCcw,
  Send,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

const MODEL_ID = "Qwen2.5-0.5B-Instruct-q4f16_1-MLC";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

type AssistantStatus = "idle" | "loading" | "ready" | "generating" | "error";

const starterPrompts = [
  "اقترح تنسيقًا أوضح لجداول الهاتف",
  "كيف أجعل شاشة الحوافظ أسهل في الاستخدام؟",
  "اقترح ألوانًا رسمية متناسقة للتطبيق",
];

export default function LocalAiAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<AssistantStatus>("idle");
  const [error, setError] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content:
        "مرحبًا، أنا مساعد التصميم المحلي. أستطيع اقتراح أفكار لتنسيق الواجهات والجداول والألوان وتجربة الهاتف، دون إرسال بيانات التطبيق إلى أي خدمة خارجية.",
    },
  ]);
  const engineRef = useRef<MLCEngine | null>(null);
  const enginePromiseRef = useRef<Promise<MLCEngine> | null>(null);

  const ensureEngine = useCallback(async () => {
    if (engineRef.current) return engineRef.current;
    if (typeof navigator === "undefined" || !("gpu" in navigator)) {
      throw new Error("هذا المتصفح أو الجهاز لا يدعم WebGPU المطلوب لتشغيل المساعد المحلي.");
    }

    if (!enginePromiseRef.current) {
      setStatus("loading");
      setError("");
      enginePromiseRef.current = import("@mlc-ai/web-llm")
        .then(({ CreateMLCEngine }) =>
          CreateMLCEngine(MODEL_ID, {
            initProgressCallback: (report) => {
              setProgress(Math.max(0, Math.min(100, Math.round(report.progress * 100))));
            },
          }),
        )
        .then((engine) => {
          engineRef.current = engine;
          setStatus("ready");
          return engine;
        })
        .catch((loadError) => {
          enginePromiseRef.current = null;
          setStatus("error");
          throw loadError;
        });
    }

    return enginePromiseRef.current;
  }, []);

  const sendMessage = useCallback(
    async (messageText: string) => {
      const trimmedMessage = messageText.trim();
      if (!trimmedMessage || status === "generating" || status === "loading") return;

      const userMessage: ChatMessage = { role: "user", content: trimmedMessage };
      setInput("");
      setMessages((current) => [...current, userMessage]);
      setStatus("generating");
      setError("");

      try {
        const engine = await ensureEngine();
        const conversation = [...messages, userMessage].slice(-8);
        const response = await engine.chat.completions.create({
          messages: [
            {
              role: "system",
              content:
                "أنت مساعد تصميم عربي داخل تطبيق إدارة مالية. أجب باختصار ووضوح. اقترح تعديلات على الواجهة والتنسيق وCSS وTailwind فقط، ولا تقترح تعديل منطق البيانات أو حذف بيانات. اشرح السبب، وقدّم خطوات عملية أو أصناف Tailwind عند الحاجة. لا تدّعِ أنك طبقت التعديل؛ أنت تقدّم اقتراحًا يحتاج موافقة المستخدم.",
            },
            ...conversation,
          ],
          temperature: 0.55,
          max_tokens: 240,
        });
        const assistantText = response.choices[0]?.message?.content?.trim();
        setMessages((current) => [
          ...current,
          {
            role: "assistant",
            content:
              assistantText || "لم أتمكن من تكوين اقتراح الآن. جرّب صياغة الطلب بطريقة أخرى.",
          },
        ]);
        setStatus("ready");
      } catch (generationError) {
        setStatus("error");
        setError(
          generationError instanceof Error
            ? generationError.message
            : "تعذر تشغيل المساعد المحلي على هذا الجهاز.",
        );
      }
    },
    [ensureEngine, messages, status],
  );

  const resetConversation = () => {
    setMessages([
      {
        role: "assistant",
        content:
          "تمت إعادة المحادثة. اكتب ما تريد تحسينه في الواجهة أو الجداول أو الألوان.",
      },
    ]);
    setInput("");
    setError("");
  };

  const statusText =
    status === "loading"
      ? `يتم تجهيز النموذج المحلي ${progress}% — قد يستغرق التنزيل الأول وقتًا`
      : status === "generating"
        ? "يكتب المساعد اقتراحه محليًا..."
        : status === "error"
          ? "تعذر تشغيل النموذج المحلي"
          : "يعمل داخل المتصفح دون مفتاح API";

  return (
    <>
      {!isOpen && (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="fixed bottom-[88px] left-3 z-40 inline-flex items-center gap-2 rounded-full border border-[#d9b56f]/60 bg-[#12364d] px-3 py-2 text-xs font-bold text-white shadow-lg transition hover:bg-[#194b68] sm:bottom-[92px] sm:left-6 sm:px-4 sm:py-2.5 sm:text-sm"
          aria-label="فتح مساعد التصميم المحلي"
        >
          <Sparkles className="h-4 w-4 text-[#e6c989]" />
          <span>مساعد التصميم</span>
        </button>
      )}

      {isOpen && (
        <section
          className="fixed bottom-[78px] left-2 z-50 flex max-h-[calc(100vh-100px)] w-[min(94vw,430px)] flex-col overflow-hidden rounded-2xl border border-[#c99a4e]/45 bg-[#fbfaf6] text-right shadow-2xl sm:bottom-[88px] sm:left-6"
          dir="rtl"
          aria-label="مساعد التصميم المحلي"
        >
          <header className="flex items-center justify-between gap-3 bg-[#12364d] px-4 py-3 text-white">
            <div className="flex min-w-0 items-center gap-2">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#e3c281]/15 text-[#e3c281]">
                <Bot className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <h2 className="truncate text-sm font-bold sm:text-base">مساعد التصميم المحلي</h2>
                <p className="mt-0.5 flex items-center gap-1 text-[10px] text-[#d8e8f1] sm:text-xs">
                  <ShieldCheck className="h-3 w-3 shrink-0 text-[#b9dfc7]" />
                  بدون مفتاح وبدون إرسال بيانات
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={resetConversation}
                className="h-8 w-8 text-white hover:bg-white/10 hover:text-white"
                aria-label="إعادة المحادثة"
              >
                <RotateCcw className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setIsOpen(false)}
                className="h-8 w-8 text-white hover:bg-white/10 hover:text-white"
                aria-label="إغلاق المساعد"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </header>

          <div className="flex items-center gap-2 border-b border-[#d8d2c3] bg-[#f3efe5] px-3 py-2 text-[10px] text-[#52616b] sm:text-xs">
            {status === "ready" ? (
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
            ) : status === "loading" || status === "generating" ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin text-[#a9782d]" />
            ) : (
              <Cpu className="h-3.5 w-3.5 text-[#a9782d]" />
            )}
            <span>{statusText}</span>
          </div>

          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3 sm:p-4">
            {messages.map((message, index) => (
              <div
                key={`${message.role}-${index}`}
                className={`flex ${message.role === "user" ? "justify-start" : "justify-end"}`}
              >
                <div
                  className={`max-w-[88%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-xs leading-6 sm:text-sm ${
                    message.role === "user"
                      ? "rounded-bl-md bg-[#dbeaf2] text-[#16384d]"
                      : "rounded-br-md bg-white text-[#263944] shadow-sm ring-1 ring-[#e1dbcf]"
                  }`}
                >
                  {message.content}
                </div>
              </div>
            ))}

            {messages.length === 1 && (
              <div className="space-y-2 pt-1">
                <p className="text-[10px] font-bold text-[#6b6a63] sm:text-xs">أفكار سريعة:</p>
                <div className="flex flex-wrap gap-2">
                  {starterPrompts.map((prompt) => (
                    <button
                      key={prompt}
                      type="button"
                      onClick={() => void sendMessage(prompt)}
                      className="rounded-full border border-[#c99a4e]/45 bg-white px-2.5 py-1.5 text-[10px] text-[#36566a] transition hover:bg-[#f5ecd9] sm:text-xs"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs leading-5 text-red-700">
                {error}
                <p className="mt-1 text-[10px] text-red-600/80">
                  يحتاج المساعد إلى متصفح يدعم WebGPU، مثل إصدار حديث من Chrome.
                </p>
              </div>
            )}
          </div>

          <form
            className="border-t border-[#d8d2c3] bg-white p-3"
            onSubmit={(event) => {
              event.preventDefault();
              void sendMessage(input);
            }}
          >
            <div className="flex items-end gap-2">
              <Textarea
                value={input}
                onChange={(event) => setInput(event.target.value)}
                placeholder="اكتب ما تريد تحسينه في التصميم..."
                className="min-h-[48px] resize-none border-[#d5cdbd] bg-[#fbfaf6] px-3 py-2 text-xs leading-5 focus-visible:ring-[#c99a4e] sm:text-sm"
                disabled={status === "loading" || status === "generating"}
                rows={2}
              />
              <Button
                type="submit"
                size="icon"
                className="h-10 w-10 shrink-0 bg-[#12364d] hover:bg-[#194b68]"
                disabled={!input.trim() || status === "loading" || status === "generating"}
                aria-label="إرسال الطلب"
              >
                {status === "generating" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
            <p className="mt-2 text-center text-[9px] text-[#7c7b73] sm:text-[10px]">
              الاقتراحات للمعاينة فقط؛ لا يتم تعديل ملفات أو بيانات التطبيق تلقائيًا.
            </p>
          </form>
        </section>
      )}
    </>
  );
}
