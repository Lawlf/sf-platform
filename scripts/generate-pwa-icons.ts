import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import sharp from "sharp";

const ROOT = process.cwd();
const SOURCE_PNG = path.join(ROOT, "icons/PNG/Sabor financeiro 1.png");
const OUT_DIR = path.join(ROOT, "public/icons");

const TARGETS: { name: string; size: number; padding: number }[] = [
  { name: "icon-192.png", size: 192, padding: 0 },
  { name: "icon-512.png", size: 512, padding: 0 },
  // Maskable icons need ~20% safe-zone padding (PWA spec)
  { name: "icon-maskable-192.png", size: 192, padding: 38 },
  { name: "icon-maskable-512.png", size: 512, padding: 100 },
];

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  const source = await readFile(SOURCE_PNG);

  for (const target of TARGETS) {
    const innerSize = target.size - target.padding * 2;
    const inner = await sharp(source)
      .resize(innerSize, innerSize, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toBuffer();

    const finalImage = await sharp({
      create: {
        width: target.size,
        height: target.size,
        channels: 4,
        background: { r: 0xfd, g: 0xf8, b: 0xf3, alpha: 1 },
      },
    })
      .composite([{ input: inner, top: target.padding, left: target.padding }])
      .png()
      .toBuffer();

    await writeFile(path.join(OUT_DIR, target.name), finalImage);
    console.warn(`generated ${target.name}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
