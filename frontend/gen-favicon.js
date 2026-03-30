const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const inputPath = path.resolve(__dirname, 'public/final.png');

async function generateFavicons() {
  // Generate 32x32 favicon PNG
  await sharp(inputPath)
    .resize(32, 32, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile(path.resolve(__dirname, 'app/favicon.png'));

  // Generate 180x180 apple-touch-icon
  await sharp(inputPath)
    .resize(180, 180, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile(path.resolve(__dirname, 'app/apple-icon.png'));

  // Generate 192x192 icon for manifest
  await sharp(inputPath)
    .resize(192, 192, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile(path.resolve(__dirname, 'app/icon.png'));

  // Remove old SVG icon if it exists
  const oldSvg = path.resolve(__dirname, 'app/icon.svg');
  if (fs.existsSync(oldSvg)) fs.unlinkSync(oldSvg);

  console.log('✅ Generated favicon.png (32x32), icon.png (192x192), apple-icon.png (180x180)');
  console.log('✅ Removed old icon.svg');
}

generateFavicons().catch(console.error);
