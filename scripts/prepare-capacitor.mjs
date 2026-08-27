import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";

const projectRoot = process.cwd();
const sourceDir = join(projectRoot, ".capacitor-web");
const targetDir = join(projectRoot, "dist");
const sourceHtmlPath = join(sourceDir, "capacitor.html");
const builtHtml = await readFile(sourceHtmlPath, "utf8");

await rm(targetDir, { recursive: true, force: true });
await mkdir(targetDir, { recursive: true });
await cp(sourceDir, targetDir, { recursive: true });
await rm(join(targetDir, "capacitor.html"), { force: true });
await writeFile(join(targetDir, "index.html"), builtHtml, "utf8");

console.log("Capacitor static SPA build prepared in dist/");
