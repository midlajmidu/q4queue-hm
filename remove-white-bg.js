const sharp = require('sharp');
const path = require('path');

const inputPath = path.join(__dirname, 'frontend/public/logo-main.png');
const outputPath = path.join(__dirname, 'frontend/public/logo-main-transparent.png');

async function removeBackground() {
  try {
    const { data, info } = await sharp(inputPath)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    // Iterate over pixels to find white (or near white) and make them transparent
    for (let i = 0; i < data.length; i += info.channels) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      
      // If pixel is very close to white (allow some anti-aliasing tolerance, say > 240)
      if (r > 235 && g > 235 && b > 235) {
        data[i + 3] = 0; // Set alpha to fully transparent
      }
    }

    await sharp(data, {
      raw: {
        width: info.width,
        height: info.height,
        channels: info.channels
      }
    })
    .png()
    .toFile(outputPath);

    console.log('Background removed successfully! Saved to logo-main-transparent.png');
  } catch (error) {
    console.error('Error processing image:', error);
  }
}

removeBackground();
