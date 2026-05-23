import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import sharp from "sharp";

const ROOT = process.cwd();
// Sabor financeiro 2.png is the brand mark (circle + flame), not the wordmark.
const SOURCE_PNG = path.join(ROOT, "icons/PNG/Sabor financeiro 2.png");
const PUBLIC_ICONS_DIR = path.join(ROOT, "public/icons");
const APP_DIR = path.join(ROOT, "app");

interface Target {
  outPath: string;
  size: number;
  padding: number;
  // Background applied behind the mark. Null means transparent (PNG).
  background: { r: number; g: number; b: number; alpha: number } | null;
}

const TARGETS: Target[] = [
  // Next.js convention: app/icon.png is the favicon (32x32)
  { outPath: path.join(APP_DIR, "icon.png"), size: 64, padding: 0, background: null },
  // Apple touch icon (180x180) - solid background per Apple guidelines (no alpha)
  {
    outPath: path.join(APP_DIR, "apple-icon.png"),
    size: 180,
    padding: 0,
    background: { r: 0xfd, g: 0xf8, b: 0xf3, alpha: 1 },
  },
  // PWA standard icons (transparent background)
  { outPath: path.join(PUBLIC_ICONS_DIR, "icon-192.png"), size: 192, padding: 0, background: null },
  { outPath: path.join(PUBLIC_ICONS_DIR, "icon-512.png"), size: 512, padding: 0, background: null },
  // Maskable: 20% safe-zone padding + opaque background (Android adaptive icons)
  {
    outPath: path.join(PUBLIC_ICONS_DIR, "icon-maskable-192.png"),
    size: 192,
    padding: 38,
    background: { r: 0xfd, g: 0xf8, b: 0xf3, alpha: 1 },
  },
  {
    outPath: path.join(PUBLIC_ICONS_DIR, "icon-maskable-512.png"),
    size: 512,
    padding: 100,
    background: { r: 0xfd, g: 0xf8, b: 0xf3, alpha: 1 },
  },
];

async function main() {
  await mkdir(PUBLIC_ICONS_DIR, { recursive: true });
  await mkdir(APP_DIR, { recursive: true });
  const source = await readFile(SOURCE_PNG);

  for (const target of TARGETS) {
    const innerSize = target.size - target.padding * 2;
    const inner = await sharp(source)
      .resize(innerSize, innerSize, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toBuffer();

    if (target.background === null) {
      // Transparent background: just write the inner image at the target size with optional padding.
      if (target.padding === 0) {
        await writeFile(target.outPath, inner);
      } else {
        const canvas = await sharp({
          create: {
            width: target.size,
            height: target.size,
            channels: 4,
            background: { r: 0, g: 0, b: 0, alpha: 0 },
          },
        })
          .composite([{ input: inner, top: target.padding, left: target.padding }])
          .png()
          .toBuffer();
        await writeFile(target.outPath, canvas);
      }
    } else {
      const canvas = await sharp({
        create: {
          width: target.size,
          height: target.size,
          channels: 4,
          background: target.background,
        },
      })
        .composite([{ input: inner, top: target.padding, left: target.padding }])
        .png()
        .toBuffer();
      await writeFile(target.outPath, canvas);
    }
    console.warn(`generated ${path.relative(ROOT, target.outPath)}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
