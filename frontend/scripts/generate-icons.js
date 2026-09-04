/**
 * Script untuk generate PWA icons dari gambar sumber.
 * Jalankan: node scripts/generate-icons.js
 * Requirement: npm install sharp (hanya untuk script ini)
 */

const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const SOURCE = path.resolve(__dirname, '../src/assets/icon-source.jpg');
const OUTPUT_DIR = path.resolve(__dirname, '../public/icons');

const SIZES = [72, 96, 128, 144, 152, 192, 384, 512];

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

async function generateIcons() {
  console.log('Generating PWA icons...');

  for (const size of SIZES) {
    const outputPath = path.join(OUTPUT_DIR, `icon-${size}.png`);
    await sharp(SOURCE)
      .resize(size, size, { fit: 'cover', position: 'center' })
      .png({ quality: 90 })
      .toFile(outputPath);
    console.log(`  ✅ icon-${size}.png`);
  }

  // Favicon 32x32
  await sharp(SOURCE)
    .resize(32, 32, { fit: 'cover' })
    .png()
    .toFile(path.resolve(__dirname, '../public/favicon-32.png'));
  console.log('  ✅ favicon-32.png');

  // Maskable: full-bleed (no padding), untuk Android adaptive icons
  for (const size of [192, 512]) {
    const outputPath = path.join(OUTPUT_DIR, `icon-${size}-maskable.png`);
    await sharp(SOURCE)
      .resize(size, size, { fit: 'fill' })
      .png({ quality: 90 })
      .toFile(outputPath);
    console.log(`  ✅ icon-${size}-maskable.png`);
  }

  console.log('\nDone! All icons generated.');
}

generateIcons().catch(console.error);
