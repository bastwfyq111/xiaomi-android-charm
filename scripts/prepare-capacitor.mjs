import { cp, mkdir, readdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";

const projectRoot = process.cwd();
const sourceDir = join(projectRoot, ".output", "public");
const targetDir = join(projectRoot, "dist");
const assetsDir = join(sourceDir, "assets");

const sourceEntries = await readdir(assetsDir);
const entryScript = sourceEntries.find(
  (file) => /^index-[^/]+\.js$/.test(file) && !file.includes("virtual"),
);
const stylesheet = sourceEntries.find((file) => /^styles-[^/]+\.css$/.test(file));

if (!entryScript || !stylesheet) {
  throw new Error("لم يتم العثور على ملف دخول العميل أو ملف الأنماط في .output/public/assets");
}

await rm(targetDir, { recursive: true, force: true });
await mkdir(targetDir, { recursive: true });
await cp(sourceDir, targetDir, { recursive: true });

const html = `<!doctype html>
<html lang="ar" dir="rtl">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
    <meta name="theme-color" content="#0f766e" />
    <meta name="mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <title>النظام المالي للمجلس الطبي</title>
    <link rel="icon" href="/favicon.ico" />
    <link rel="manifest" href="/manifest.json" />
    <link rel="stylesheet" href="/assets/${stylesheet}" />
  </head>
  <body>
    <noscript>يجب تفعيل JavaScript لتشغيل النظام المالي.</noscript>
    <script type="module" src="/assets/${entryScript}"></script>
  </body>
</html>
`;

await writeFile(join(targetDir, "index.html"), html, "utf8");
console.log(`Capacitor static web build prepared in dist/ using ${entryScript}`);
