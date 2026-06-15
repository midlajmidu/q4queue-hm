const fs = require('fs');

const p = '/Users/muzammil/Documents/q4queue/qrq/frontend/components/Sidebar.tsx';
let content = fs.readFileSync(p, 'utf8');

// 1. Eradicate Horizontal Menu Dividers
content = content.replace(
    'const divider = <div className={`${c ? "mx-auto w-5" : "mx-3"} my-2 border-t ${isSuperAdmin ? "border-slate-800" : "border-slate-100"}`} />;',
    'const divider = <div className="h-4" />;'
);
content = content.replace(
    'c ? <div className={`mx-auto my-1.5 w-5 h-px ${isSuperAdmin ? "bg-slate-800" : "bg-slate-200"}`} /> : (',
    'c ? <div className="h-4" /> : ('
);

// 2. Mute Main Sidebar Vertical Border
// Ensure border is 1px width explicitly to be safe, and dark:border-white/5
content = content.replace(
    'bg-white dark:bg-[#0b1121] border-gray-200 dark:border-white/5',
    'bg-white dark:bg-transparent border-gray-200 border-r-[1px] dark:border-white/5'
);

// 3. Mute Top Header Border
content = content.replace(
    'const headerClass = `h-14 flex items-center flex-shrink-0 border-b ${c ? "justify-center px-0" : "justify-between px-4"} ${isSuperAdmin ? "border-slate-800/60" : "border-gray-200"}`;',
    '// not exactly this, using regex'
);

content = content.replace(
    /className=\{\`h-14 flex items-center flex-shrink-0 border-b(.*?)(border-gray-200)"\}\}/g,
    'className={`h-14 flex items-center flex-shrink-0 border-b border-b-[1px]$1$2 dark:border-white/5`}}'
);

// 4. Refine Active Link Background
const oldActiveLinkCode = `        if (active) {
            return isSuperAdmin
                ? \`\${base} bg-transparent text-slate-100 font-semibold \${c ? "shadow-[inset_3px_0_0_0_rgba(129,140,248,1)]" : "before:absolute before:left-0 before:top-[10%] before:bottom-[10%] before:w-[2px] before:bg-indigo-400 before:rounded-r-full"} [&>svg]:text-slate-100\`
                : \`\${base} bg-transparent text-slate-900 dark:text-white font-semibold \${c ? "shadow-[inset_3px_0_0_0_rgba(79,70,229,1)] dark:shadow-[inset_3px_0_0_0_rgba(129,140,248,1)]" : "before:absolute before:left-0 before:top-[10%] before:bottom-[10%] before:w-[2px] before:bg-indigo-600 dark:before:bg-indigo-400 before:rounded-r-full"} [&>svg]:text-slate-900 dark:[&>svg]:text-white\`;
        }`;

const newActiveLinkCode = `        if (active) {
            return isSuperAdmin
                ? \`\${base} bg-slate-800/30 text-slate-100 font-semibold rounded-lg \${c ? "shadow-[inset_3px_0_0_0_rgba(129,140,248,1)]" : "before:absolute before:left-0 before:top-[10%] before:bottom-[10%] before:w-[2px] before:bg-indigo-400 before:rounded-r-full"} [&>svg]:text-slate-100\`
                : \`\${base} bg-indigo-50/50 dark:bg-white/5 text-slate-900 dark:text-white font-semibold rounded-lg \${c ? "shadow-[inset_3px_0_0_0_rgba(79,70,229,1)] dark:shadow-[inset_3px_0_0_0_rgba(129,140,248,1)]" : "before:absolute before:left-0 before:top-[10%] before:bottom-[10%] before:w-[2px] before:bg-indigo-600 dark:before:bg-indigo-400 before:rounded-r-full"} [&>svg]:text-slate-900 dark:[&>svg]:text-white\`;
        }`;

content = content.replace(oldActiveLinkCode, newActiveLinkCode);

fs.writeFileSync(p, content, 'utf8');
