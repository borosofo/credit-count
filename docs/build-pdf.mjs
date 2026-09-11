// Renders docs/TDD.md to docs/TDD.pdf: Markdown -> styled HTML -> headless Edge/Chrome print.
//   npm run docs:pdf
// Windows path to Edge is the default; pass BROWSER=/path/to/chrome to override.
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import { resolve, join } from "node:path";
import { marked } from "marked";

const root = resolve(import.meta.dirname, "..");
const mdPath = join(root, "docs", "TDD.md");
const pdfPath = join(root, "docs", "TDD.pdf");
const htmlPath = join(tmpdir(), "credit-count-tdd.html");

const css = `
@page { size: A4; margin: 11mm 12mm 12mm 12mm; }
* { box-sizing: border-box; }
html { font-size: 9.1pt; }
body { font-family: "Segoe UI", Inter, Arial, sans-serif; color: #1a1a1a; line-height: 1.25; margin: 0; }
h1 { font-size: 18pt; margin: 0 0 5pt; letter-spacing: -0.2pt; }
h2 { font-size: 11pt; margin: 7pt 0 2pt; padding-bottom: 1.5pt; border-bottom: 1.5pt solid #f5c400; page-break-after: avoid; }
p { margin: 0 0 4pt; text-align: left; }
ul { margin: 0 0 4pt 14pt; padding: 0; }
li { margin: 0 0 1.5pt; }
table { border-collapse: collapse; width: 100%; margin: 2pt 0 4pt; font-size: 8.1pt; page-break-inside: auto; }
th, td { border: 0.6pt solid #c9c9c9; padding: 2.5pt 4.5pt; vertical-align: top; text-align: left; }
th { background: #2b2b2b; color: #fff; font-weight: 600; }
th code { background: transparent; color: #fff; }
tr { page-break-inside: avoid; }
code { font-family: Consolas, "Courier New", monospace; font-size: 8.8pt; background: #f2f2f2; padding: 0 2pt; border-radius: 2pt; }
strong { font-weight: 650; }
hr { border: 0; border-top: 0.6pt solid #ccc; margin: 8pt 0 4pt; }
em { color: #444; }
body > table:first-of-type { font-size: 8.9pt; }
body > table:first-of-type th { background: #fafafa; color: #1a1a1a; font-weight: 400; border: 0.6pt solid #c9c9c9; }
body > table:first-of-type th:nth-child(odd), body > table:first-of-type td:nth-child(odd) { width: 11%; background: #f3f3f3; font-weight: 600; }
body > table:first-of-type td:nth-child(2) { width: 39%; }
.diagram { margin: 2pt auto 4pt; width: 86%; page-break-inside: avoid; }
.diagram svg { width: 100%; height: auto; display: block; }
`;

// Inline the SVG diagrams so the print HTML is self-contained (GitHub renders the same files as images).
const body = String(marked.parse(readFileSync(mdPath, "utf8"), { gfm: true })).replace(
  /<img src="([^"]+\.svg)"[^>]*>/g,
  (_, src) =>
    `<div class="diagram">${readFileSync(join(root, "docs", src), "utf8").replace(/<\?xml[^>]*>/, "")}</div>`,
);
writeFileSync(
  htmlPath,
  `<!doctype html><html><head><meta charset="utf-8"><title>Credit Count TDD</title><style>${css}</style></head><body>${body}</body></html>`,
);

const browser =
  process.env.BROWSER ??
  ["C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe", "C:/Program Files/Google/Chrome/Application/chrome.exe"].find(existsSync);
if (!browser) throw new Error("No headless browser found; set BROWSER=/path/to/chrome");

execFileSync(
  browser,
  ["--headless=new", "--disable-gpu", "--no-pdf-header-footer", `--print-to-pdf=${pdfPath}`, `file:///${htmlPath.replace(/\\/g, "/")}`],
  { stdio: "ignore", timeout: 60000 },
);
console.log(`PDF written: ${pdfPath}`);
