import { Capacitor } from "@capacitor/core";
import { Directory, Filesystem } from "@capacitor/filesystem";

const INTERNAL_EXPORTS_DIRECTORY = "exports";

export function isNativeFileStorageAvailable(): boolean {
  return typeof window !== "undefined" && Capacitor.isNativePlatform();
}

function sanitizeFileName(fileName: string): string {
  const normalized = String(fileName || "export")
    .replace(/[\\/:*?"<>|\u0000-\u001f]/g, "-")
    .replace(/\s+/g, "_")
    .trim();
  return normalized || "export";
}

async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : "";
      const commaIndex = result.indexOf(",");
      if (commaIndex < 0) {
        reject(new Error("تعذر تحويل الملف إلى صيغة التخزين الداخلية"));
        return;
      }
      resolve(result.slice(commaIndex + 1));
    };
    reader.onerror = () => reject(reader.error || new Error("تعذر قراءة الملف"));
    reader.readAsDataURL(blob);
  });
}

/**
 * يحفظ ملفاً داخل مساحة التطبيق الخاصة التي تُحذف مع إزالة التطبيق.
 * لا يستخدم Directory.Documents أو ExternalStorage، ولذلك لا يحتاج صلاحية
 * تخزين خارجية في Android الحديث.
 */
export async function saveBlobToInternalStorage(
  blob: Blob,
  fileName: string,
): Promise<string | null> {
  if (!isNativeFileStorageAvailable()) return null;

  const safeFileName = sanitizeFileName(fileName);
  const path = `${INTERNAL_EXPORTS_DIRECTORY}/${safeFileName}`;
  const base64Data = await blobToBase64(blob);

  await Filesystem.writeFile({
    path,
    data: base64Data,
    directory: Directory.Data,
    recursive: true,
  });

  const { uri } = await Filesystem.getUri({
    path,
    directory: Directory.Data,
  });
  console.info("[Storage] File saved inside app storage", { path, uri });
  return uri;
}

export async function getInternalFileUri(fileName: string): Promise<string | null> {
  if (!isNativeFileStorageAvailable()) return null;
  const path = `${INTERNAL_EXPORTS_DIRECTORY}/${sanitizeFileName(fileName)}`;
  const { uri } = await Filesystem.getUri({ path, directory: Directory.Data });
  return uri;
}
