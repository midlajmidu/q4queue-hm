const fs = require('fs');
const qPath = '/Users/muzammil/Documents/q4queue/qrq/frontend/app/[orgSlug]/dashboard/queues/[queueId]/page.tsx';
let qContent = fs.readFileSync(qPath, 'utf8');

// "Reset", "Display", "Delete" buttons
// Currently: style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", fontSize: 12.5, fontWeight: 600, borderRadius: 8, border: `1.5px solid ${T.amberBorder}`, background: T.amberBg /* removed for dark mode */, color: "#92400e", cursor: "pointer", transition: "all .18s" }}
// I need to add className="dark:bg-slate-800 dark:text-white dark:border-white/10" and remove color: "#92400e" for dark mode text inversion.

qContent = qContent.replace(/<button\s+onClick=\{\(\) => setShowResetConfirm\(true\)\}\s+disabled=\{isDisabled \|\| resetting\}\s+style=\{\{([\s\S]*?)color: "#92400e"([\s\S]*?)\}\}\s+>/, '<button\nonClick={() => setShowResetConfirm(true)}\ndisabled={isDisabled || resetting}\nclassName="dark:bg-slate-800 dark:text-white dark:border-white/10"\nstyle={{$1$2}}>');

qContent = qContent.replace(/<a\s+href=\{`\/display\/\$\{queueId\}`\}\s+target="_blank"\s+rel="noopener noreferrer"\s+style=\{\{([\s\S]*?)color: T.brand([\s\S]*?)\}\}\s+>/, '<a\nhref={`/display/${queueId}`}\ntarget="_blank"\nrel="noopener noreferrer"\nclassName="dark:bg-slate-800 dark:text-white dark:border-white/10"\nstyle={{$1$2}}>');

qContent = qContent.replace(/<button\s+onClick=\{\(\) => setShowDeleteConfirm\(true\)\}\s+style=\{\{([\s\S]*?)color: T.red([\s\S]*?)\}\}\s+>/, '<button\nonClick={() => setShowDeleteConfirm(true)}\nclassName="dark:bg-slate-800 dark:text-white dark:border-white/10"\nstyle={{$1$2}}>');

// And remove `background: ...` from them. I already did it partially. Let's just enforce tailwind.
// Actually `background: T.amberBg` overrides Tailwind's `bg-slate-800` unless I remove it.
qContent = qContent.replace(/background: T\.amberBg \/\* removed for dark mode \*\/,/g, '');
qContent = qContent.replace(/background: T\.brandLight \/\* removed \*\/,/g, '');
qContent = qContent.replace(/background: T\.redBg \/\* removed \*\/,/g, '');

// Fix invisible text in activity feed again because I might have missed Customer names
// `qContent = qContent.replace(/color: "" \/\* T\.text removed \*\/ /g, '');`
qContent = qContent.replace(/color: "" \/\* T\.text removed \*\/,/g, '');

fs.writeFileSync(qPath, qContent, 'utf8');
