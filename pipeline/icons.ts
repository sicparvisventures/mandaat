/** One-off: render PWA icons and the social card from SVG. Run with `tsx pipeline/icons.ts`. */
import { readFileSync } from "node:fs";
import sharp from "sharp";

const svg = readFileSync("public/favicon.svg");
for (const [size, name] of [
  [192, "pwa-192.png"],
  [512, "pwa-512.png"],
  [180, "apple-touch-icon.png"],
] as const) {
  await sharp(svg, { density: 600 }).resize(size, size).png().toFile(`public/${name}`);
}

const rings = Array.from({ length: 70 }, (_, i) => `<circle cx="1330" cy="-120" r="${40 + i * 13}" />`).join("");
const rings2 = Array.from({ length: 60 }, (_, i) => `<circle cx="-140" cy="760" r="${40 + i * 15}" />`).join("");
const og = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <rect width="1200" height="630" fill="#DDEAE3"/>
  <g fill="none" stroke="#9DBDB1" stroke-width="1.2" opacity=".7">${rings}${rings2}</g>
  <text x="80" y="150" font-family="DIN Condensed, Arial Narrow, sans-serif" font-weight="700" font-size="54" fill="#141925" letter-spacing="1">MANDAAT<tspan fill="#4A30C2">.</tspan></text>
  <text x="80" y="330" font-family="DIN Condensed, Arial Narrow, sans-serif" font-weight="700" font-size="150" fill="#141925">Zij werken voor ons.</text>
  <text x="82" y="400" font-family="Helvetica Neue, Arial, sans-serif" font-size="32" fill="#4B5563">Wie ontmoeten ze. Wie lobbyt hen. Hoe stemmen ze.</text>
  <rect x="0" y="520" width="1200" height="110" fill="#F7F9F7" opacity=".85"/>
  <text x="80" y="565" font-family="Menlo, monospace" font-size="26" letter-spacing="6" fill="#141925">IMEU&lt;EP&lt;720&lt;MEPS&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;</text>
  <text x="80" y="603" font-family="Menlo, monospace" font-size="26" letter-spacing="6" fill="#141925">THEY&lt;&lt;WORK&lt;FOR&lt;US&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;</text>
</svg>`;
await sharp(Buffer.from(og)).png().toFile("public/og.png");
console.log("icons written");
