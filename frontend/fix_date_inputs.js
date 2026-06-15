const fs = require('fs');
const p = '/Users/muzammil/Documents/q4queue/qrq/frontend/app/[orgSlug]/dashboard/insights/page.tsx';
let content = fs.readFileSync(p, 'utf8');

content = content.replace(/style=\{\{ colorScheme: "dark" \}\}/g, 'style={{ colorScheme: "light dark" }}');

fs.writeFileSync(p, content, 'utf8');
