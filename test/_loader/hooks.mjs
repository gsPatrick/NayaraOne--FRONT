import { readFile } from "node:fs/promises";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";
import { existsSync } from "node:fs";
import ts from "typescript";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const EXTENSIONS = ["", ".js", ".mjs", "/index.js"];

export async function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith("@/")) {
    const base = path.join(ROOT, specifier.slice(2));
    const found = EXTENSIONS.map((ext) => base + ext).find((candidate) => existsSync(candidate) && !candidate.endsWith("/"));
    if (found && /\.[a-z]+$/.test(found)) return { url: pathToFileURL(found).href, shortCircuit: true };
  }
  if (specifier === "next/navigation") return { url: new URL("./nextNavigationStub.mjs", import.meta.url).href, shortCircuit: true };
  if (specifier === "next/link") return { url: new URL("./nextLinkStub.mjs", import.meta.url).href, shortCircuit: true };
  if ((specifier.startsWith("./") || specifier.startsWith("../")) && context.parentURL && context.parentURL.startsWith("file:")) {
    const base = path.resolve(path.dirname(fileURLToPath(context.parentURL)), specifier);
    if (!path.extname(base) && existsSync(`${base}.js`)) return { url: pathToFileURL(`${base}.js`).href, shortCircuit: true };
  }
  return nextResolve(specifier, context);
}

export async function load(url, context, nextLoad) {
  if (url.endsWith(".module.css")) {
    return { format: "module", shortCircuit: true, source: "export default new Proxy({}, { get: (_t, name) => String(name) });" };
  }
  if (url.startsWith("file:") && url.endsWith(".js") && !url.includes("/node_modules/")) {
    const source = await readFile(fileURLToPath(url), "utf8");
    const out = ts.transpileModule(source, {
      compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022, allowJs: true },
      fileName: fileURLToPath(url),
    });
    return { format: "module", shortCircuit: true, source: out.outputText };
  }
  return nextLoad(url, context);
}
