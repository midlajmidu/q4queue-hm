const fs = require('fs');
const filePath = '/Users/muzammil/Documents/q4queue/qrq/frontend/app/[orgSlug]/dashboard/queues/[queueId]/page.tsx';
let content = fs.readFileSync(filePath, 'utf8');

// fix double comma
content = content.replace(/800,, fontVariantNumeric/g, '800, fontVariantNumeric');
content = content.replace(/11\.5,, paddingLeft/g, '11.5, paddingLeft');

// fix double className
content = content.replace(/className="group dark:border-white\/10" (.*?) className="group"/g, 'className="group dark:border-white/10" $1');

// fix the RecentToken component double comma again just in case
content = content.replace(/11\.5,, fontVariantNumeric/g, '11.5, fontVariantNumeric');

// fix RecentActivity card having double className if any
content = content.replace(/className="qd-card bg-white dark:bg-slate-900 dark:border-white\/10"/g, 'className="qd-card bg-white dark:bg-slate-900 dark:border-white/10"'); // No double class here

fs.writeFileSync(filePath, content, 'utf8');
