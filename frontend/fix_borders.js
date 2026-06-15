const fs = require('fs');

const cssPath = '/Users/muzammil/Documents/q4queue/qrq/frontend/app/globals.css';
let css = fs.readFileSync(cssPath, 'utf8');
css = css.replace('--q-border: rgba(255, 255, 255, 0.08);', '--q-border: rgba(255, 255, 255, 0.1);');
css = css.replace('--q-border-light: rgba(255, 255, 255, 0.04);', '--q-border-light: rgba(255, 255, 255, 0.05);');
fs.writeFileSync(cssPath, css, 'utf8');

const filesToPatch = [
  '/Users/muzammil/Documents/q4queue/qrq/frontend/app/[orgSlug]/dashboard/notifications/page.tsx',
  '/Users/muzammil/Documents/q4queue/qrq/frontend/app/[orgSlug]/dashboard/staff/page.tsx',
  '/Users/muzammil/Documents/q4queue/qrq/frontend/app/[orgSlug]/dashboard/page.tsx',
  '/Users/muzammil/Documents/q4queue/qrq/frontend/app/[orgSlug]/dashboard/history/page.tsx',
  '/Users/muzammil/Documents/q4queue/qrq/frontend/app/[orgSlug]/dashboard/insights/page.tsx'
];

for (const p of filesToPatch) {
  if (fs.existsSync(p)) {
    let content = fs.readFileSync(p, 'utf8');
    // Replace hardcoded rgba borders with css variable
    content = content.replace(/rgba\(255,\s*255,\s*255,\s*0\.05\)/g, 'var(--q-border-light)');
    // Just to be safe, if there's any 0.1 or 0.08 replace with --q-border
    content = content.replace(/rgba\(255,\s*255,\s*255,\s*0\.08\)/g, 'var(--q-border)');
    content = content.replace(/rgba\(255,\s*255,\s*255,\s*0\.1\)/g, 'var(--q-border)');
    
    // Some lines might use `border: "1px solid var(--q-border-light)"` instead of template literals, which is fine since var() works in CSS strings.
    // Wait, in React style={}, `border: "1px solid var(--q-border-light)"` is perfectly valid.
    
    // Let's also check for any 2px borders
    content = content.replace(/borderWidth:\s*2/g, 'borderWidth: 1');
    content = content.replace(/border:\s*["']2px\s/g, 'border: "1px ');
    content = content.replace(/borderBottom:\s*["']2px\s/g, 'borderBottom: "1px ');
    content = content.replace(/borderTop:\s*["']2px\s/g, 'borderTop: "1px ');

    fs.writeFileSync(p, content, 'utf8');
  }
}
