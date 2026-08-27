import { createRoot } from "react-dom/client";
import { RouterProvider } from "@tanstack/react-router";
import { getRouter } from "./router";
import "./styles.css";

// يفعّل نمطاً مدمجاً خفيفاً داخل APK فقط، مع إبقاء نسخة الويب كما هي.
document.documentElement.classList.add("apk-compact");
document.body?.classList.add("apk-compact");

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Capacitor root element was not found");
}

const router = getRouter();

createRoot(rootElement).render(<RouterProvider router={router} />);
