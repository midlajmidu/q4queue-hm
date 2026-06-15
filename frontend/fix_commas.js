const fs = require('fs');
const qPath = '/Users/muzammil/Documents/q4queue/qrq/frontend/app/[orgSlug]/dashboard/queues/[queueId]/page.tsx';
let content = fs.readFileSync(qPath, 'utf8');

// The issue is `/* color removed */,` or `, /* color removed */` which causes invalid JSON/object literal syntax.
// E.g., `style={{ fontSize: 13, /* color removed */, margin: 0 }}` -> `style={{ fontSize: 13, margin: 0 }}`
// Let's just remove the `/* color removed */` entirely and then fix multiple commas or leading commas.

content = content.replace(/\/\* color removed \*\//g, '');
// fix multiple commas
content = content.replace(/,\s*,/g, ',');
// fix leading comma after {
content = content.replace(/\{\s*,/g, '{');

fs.writeFileSync(qPath, content, 'utf8');
