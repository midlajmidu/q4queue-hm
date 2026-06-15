const fs = require('fs');

const p = '/Users/muzammil/Documents/q4queue/qrq/frontend/app/[orgSlug]/dashboard/sessions/page.tsx';
let content = fs.readFileSync(p, 'utf8');

const oldMeta = `    const labelMeta: Record<TimelineLabel, { color: string; dotColor: string; icon: string }> = {
        Today:     { color: "text-indigo-700 bg-indigo-50 border-indigo-200", dotColor: "bg-indigo-500", icon: "⚡" },
        Tomorrow:  { color: "text-sky-700 bg-sky-50 border-sky-200",         dotColor: "bg-sky-400",    icon: "📅" },
        Yesterday: { color: "text-amber-700 bg-amber-50 border-amber-200",   dotColor: "bg-amber-400",  icon: "↩" },
        "This Week": { color: "text-emerald-700 bg-emerald-50 border-emerald-200", dotColor: "bg-emerald-400", icon: "📆" },
        Earlier:   { color: "text-slate-600 bg-slate-50 border-slate-200",    dotColor: "bg-slate-300",  icon: "🗂" },
    };`;

const newMeta = `    const labelMeta: Record<TimelineLabel, { color: string; dotColor: string; icon: string }> = {
        Today:     { color: "text-indigo-700 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 border-indigo-200 dark:border-indigo-900/50", dotColor: "bg-indigo-500", icon: "⚡" },
        Tomorrow:  { color: "text-sky-700 dark:text-sky-400 bg-sky-50 dark:bg-sky-900/30 border-sky-200 dark:border-sky-900/50",         dotColor: "bg-sky-400",    icon: "📅" },
        Yesterday: { color: "text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30 border-amber-200 dark:border-amber-900/50",   dotColor: "bg-amber-400",  icon: "↩" },
        "This Week": { color: "text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 border-emerald-200 dark:border-emerald-900/50", dotColor: "bg-emerald-400", icon: "📆" },
        Earlier:   { color: "text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700",    dotColor: "bg-slate-300",  icon: "🗂" },
    };`;

content = content.replace(oldMeta, newMeta);

// Group label text color:
// text-[#0f172a] -> text-slate-900 dark:text-white
content = content.replace(
    'className="text-[18px] font-bold text-[#0f172a] tracking-tight"',
    'className="text-[18px] font-bold text-slate-900 dark:text-white tracking-tight"'
);

// Group count badge:
// bg-slate-100 -> bg-slate-100 dark:bg-slate-800
content = content.replace(
    'className="tabular-nums text-[12px] font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full"',
    'className="tabular-nums text-[12px] font-semibold text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full"'
);

fs.writeFileSync(p, content, 'utf8');
