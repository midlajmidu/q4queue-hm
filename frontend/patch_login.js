const fs = require('fs');

const files = [
  '/Users/muzammil/Documents/q4queue/qrq/frontend/app/login/page.tsx',
  '/Users/muzammil/Documents/q4queue/qrq/frontend/app/super-admin/login/page.tsx'
];

for (const file of files) {
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');
    content = content.replace('<main className="min-h-screen', '<main className="force-light min-h-screen');
    // For super-admin it might have different className
    content = content.replace(/<main className="([^"]*min-h-screen[^"]*)"/, '<main className="force-light $1"');
    fs.writeFileSync(file, content, 'utf8');
  }
}
