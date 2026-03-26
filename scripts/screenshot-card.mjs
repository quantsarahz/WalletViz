import puppeteer from "puppeteer-core";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Usage: node screenshot-card.mjs [input.html] [output.png]
const htmlFile = process.argv[2] || "lorenz-card.html";
const outFile = process.argv[3] || htmlFile.replace(/\.html$/, ".png");

const htmlPath = path.resolve(__dirname, htmlFile);
const outPath = path.resolve(__dirname, "..", outFile);

const browser = await puppeteer.launch({
  executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  headless: true,
  args: ["--no-sandbox"],
});

const page = await browser.newPage();
await page.setViewport({ width: 1200, height: 675, deviceScaleFactor: 2 });
await page.goto(`file://${htmlPath}`, { waitUntil: "networkidle0" });
await page.screenshot({ path: outPath, type: "png" });
await browser.close();

console.log(`Saved: ${outPath}`);
