const sharp = require('sharp');
const path = require('path');

const inputPath = path.resolve(__dirname, 'public/logo-main.png');

async function analyze() {
  const metadata = await sharp(inputPath).metadata();
  console.log('Image metadata:', JSON.stringify(metadata, null, 2));
  
  // Trim transparent/white borders and save
  const trimmedPath = path.resolve(__dirname, 'public/logo-main-trimmed.png');
  
  // First, remove near-white pixels by making them transparent
  const { data, info } = await sharp(inputPath)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  for (let i = 0; i < data.length; i += info.channels) {
    const r = data[i], g = data[i + 1], b = data[i + 2];
    if (r > 240 && g > 240 && b > 240) {
      data[i + 3] = 0; // transparent
    }
  }

  // Reconstruct and trim
  await sharp(data, { raw: { width: info.width, height: info.height, channels: info.channels } })
    .trim()
    .png()
    .toFile(trimmedPath);

  const trimmedMeta = await sharp(trimmedPath).metadata();
  console.log('Trimmed metadata:', JSON.stringify(trimmedMeta, null, 2));
  console.log('Done! Saved to public/logo-main-trimmed.png');
}

analyze().catch(console.error);
