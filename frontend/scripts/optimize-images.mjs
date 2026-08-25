// Image optimization script using sharp
// Run: node optimize-images.mjs

import sharp from 'sharp';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const IMG_DIR = path.join(__dirname, '..', 'public', 'images');

const conversions = [
  { src: 'home-background.jpg', out: 'home-background.webp', width: 1400, quality: 80 },
  { src: 'home-about.jpg',      out: 'home-about.webp',      width: 800,  quality: 80 },
  { src: 'services-1.jpg',      out: 'services-1.webp',      width: 600,  quality: 80 },
  { src: 'services-2.jpg',      out: 'services-2.webp',      width: 600,  quality: 80 },
  { src: 'services-3.jpg',      out: 'services-3.webp',      width: 600,  quality: 80 },
];

for (const { src, out, width, quality } of conversions) {
  const inPath  = path.join(IMG_DIR, src);
  const outPath = path.join(IMG_DIR, out);
  try {
    const info = await sharp(inPath)
      .resize({ width, withoutEnlargement: true })
      .webp({ quality })
      .toFile(outPath);
    console.log(`✅ ${src} → ${out}  (${(info.size / 1024).toFixed(0)} KB, ${info.width}x${info.height})`);
  } catch (err) {
    console.error(`❌ ${src}: ${err.message}`);
  }
}

console.log('\nDone! You can now delete the original .jpg files if desired.');
