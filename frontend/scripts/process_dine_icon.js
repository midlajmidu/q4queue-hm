const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

async function run() {
    const inputPath = path.join(__dirname, '../public/hotel/dine-icon.jpg');
    const outDir = path.join(__dirname, '../public/hotel');

    const image = sharp(inputPath);
    const { data, info } = await image.raw().toBuffer({ resolveWithObject: true });

    const width = info.width;
    const height = info.height;
    const channels = info.channels;

    // Detect exact bounding box of the icon
    let minX = width, maxX = 0, minY = height, maxY = 0;
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const idx = (y * width + x) * channels;
            const r = data[idx];
            const g = data[idx + 1];
            const b = data[idx + 2];
            const lum = (r * 299 + g * 587 + b * 114) / 1000;
            if (lum < 220) {
                if (x < minX) minX = x;
                if (x > maxX) maxX = x;
                if (y < minY) minY = y;
                if (y > maxY) maxY = y;
            }
        }
    }

    console.log('Icon bounding box:', { minX, maxX, minY, maxY, w: maxX - minX, h: maxY - minY });

    // Buffers:
    // 1. Indigo (Brand color #4338ca / #4f46e5 for light mode)
    // 2. Indigo-Light (Soft luminous periwinkle #818cf8 / #a5b4fc for dark mode)
    // 3. Dark Slate (#0f172a for neutral light mode)
    // 4. Pure White (#ffffff for neutral dark mode)
    const rgbaIndigo = Buffer.alloc(width * height * 4);
    const rgbaIndigoLight = Buffer.alloc(width * height * 4);
    const rgbaDark = Buffer.alloc(width * height * 4);
    const rgbaLight = Buffer.alloc(width * height * 4);

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const srcIdx = (y * width + x) * channels;
            const dstIdx = (y * width + x) * 4;
            const r = data[srcIdx];
            const g = data[srcIdx + 1];
            const b = data[srcIdx + 2];
            const lum = (r * 299 + g * 587 + b * 114) / 1000;

            let alpha = 0;
            if (lum < 245) {
                alpha = Math.round(Math.min(255, Math.max(0, (245 - lum) / 245 * 255)));
            }

            // Indigo (#4338ca)
            rgbaIndigo[dstIdx] = 67;
            rgbaIndigo[dstIdx + 1] = 56;
            rgbaIndigo[dstIdx + 2] = 202;
            rgbaIndigo[dstIdx + 3] = alpha;

            // Indigo-Light (#818cf8)
            rgbaIndigoLight[dstIdx] = 129;
            rgbaIndigoLight[dstIdx + 1] = 140;
            rgbaIndigoLight[dstIdx + 2] = 248;
            rgbaIndigoLight[dstIdx + 3] = alpha;

            // Dark Slate (#0f172a)
            rgbaDark[dstIdx] = 15;
            rgbaDark[dstIdx + 1] = 23;
            rgbaDark[dstIdx + 2] = 42;
            rgbaDark[dstIdx + 3] = alpha;

            // Pure White (#ffffff)
            rgbaLight[dstIdx] = 255;
            rgbaLight[dstIdx + 1] = 255;
            rgbaLight[dstIdx + 2] = 255;
            rgbaLight[dstIdx + 3] = alpha;
        }
    }

    // TIGHT CROP with minimal padding (just 20px)
    const pad = 24;
    const cropLeft = Math.max(0, minX - pad);
    const cropTop = Math.max(0, minY - pad);
    const cropW = Math.min(width - cropLeft, (maxX - minX) + pad * 2);
    const cropH = Math.min(height - cropTop, (maxY - minY) + pad * 2);

    console.log('Tight crop dimensions:', { cropLeft, cropTop, cropW, cropH });

    // Target height: 256px, calculate proportionate width
    const targetH = 256;
    const targetW = Math.round(cropW * (targetH / cropH));

    console.log('Target output size:', { targetW, targetH });

    const renderOpts = { kernel: sharp.kernel.lanczos3 };

    // 1. Indigo variants (Tight crop)
    await sharp(rgbaIndigo, { raw: { width, height, channels: 4 } })
        .extract({ left: cropLeft, top: cropTop, width: cropW, height: cropH })
        .resize(targetW, targetH, renderOpts)
        .png({ quality: 100 })
        .toFile(path.join(outDir, 'dine-icon-indigo.png'));

    await sharp(rgbaIndigoLight, { raw: { width, height, channels: 4 } })
        .extract({ left: cropLeft, top: cropTop, width: cropW, height: cropH })
        .resize(targetW, targetH, renderOpts)
        .png({ quality: 100 })
        .toFile(path.join(outDir, 'dine-icon-indigo-light.png'));

    // 2. Slate / White variants (Tight crop)
    await sharp(rgbaDark, { raw: { width, height, channels: 4 } })
        .extract({ left: cropLeft, top: cropTop, width: cropW, height: cropH })
        .resize(targetW, targetH, renderOpts)
        .png({ quality: 100 })
        .toFile(path.join(outDir, 'dine-icon-dark.png'));

    await sharp(rgbaLight, { raw: { width, height, channels: 4 } })
        .extract({ left: cropLeft, top: cropTop, width: cropW, height: cropH })
        .resize(targetW, targetH, renderOpts)
        .png({ quality: 100 })
        .toFile(path.join(outDir, 'dine-icon-light.png'));

    // 3. Square-fitted version with 6% padding (for standard icon containers)
    const squarePad = Math.round((maxY - minY) * 0.06);
    const sqSize = (maxY - minY) + squarePad * 2;
    const sqLeft = Math.max(0, Math.round((minX + maxX) / 2 - sqSize / 2));
    const sqTop = Math.max(0, Math.round((minY + maxY) / 2 - sqSize / 2));

    await sharp(rgbaDark, { raw: { width, height, channels: 4 } })
        .extract({ left: sqLeft, top: sqTop, width: sqSize, height: sqSize })
        .resize(256, 256, renderOpts)
        .png({ quality: 100 })
        .toFile(path.join(outDir, 'dine-icon.png'));

    console.log('Successfully generated tightly cropped and brand-colored icons in public/hotel/');
}

run().catch(console.error);
