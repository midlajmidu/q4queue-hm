const fs = require('fs');

const cardPath = '/Users/muzammil/Documents/q4queue/qrq/frontend/components/QueueCard.tsx';
let card = fs.readFileSync(cardPath, 'utf8');

// 1. Manage Button
card = card.replace(
    'className="flex-1 text-center text-sm font-medium text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 py-1.5 rounded-lg transition-colors"',
    'className="flex-1 text-center text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/50 py-1.5 rounded-lg transition-colors"'
);

// 2. Toggle Button
card = card.replace(
    'className={`flex-1 text-center text-sm font-medium py-1.5 rounded-lg transition-colors disabled:opacity-50 ${isActive ? "text-amber-700 bg-amber-50 hover:bg-amber-100" : "text-emerald-700 bg-emerald-50 hover:bg-emerald-100"}`}',
    'className={`flex-1 text-center text-sm font-medium py-1.5 rounded-lg transition-colors disabled:opacity-50 ${isActive ? "text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30 hover:bg-amber-100 dark:hover:bg-amber-900/50" : "text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 hover:bg-emerald-100 dark:hover:bg-emerald-900/50"}`}'
);

// 3. Delete Button
card = card.replace(
    'className="flex text-center justify-center items-center text-sm font-medium px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50 text-red-700 bg-red-50 hover:bg-red-100"',
    'className="flex text-center justify-center items-center text-sm font-medium px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50 text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/30 hover:bg-red-100 dark:hover:bg-red-900/50"'
);

// 4. Status Badge
card = card.replace(
    'className={`shrink-0 ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${isActive ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-500"}`}',
    'className={`shrink-0 ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${isActive ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400" : "bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-slate-400"}`}'
);

// 5. Serving Color
card = card.replace(
    'className="text-lg font-bold text-blue-600"',
    'className="text-lg font-bold text-blue-600 dark:text-blue-400"'
);

// 6. Status Boxes background
card = card.replace(
    /className="bg-gray-50 dark:bg-slate-800 rounded-lg py-2"/g,
    'className="bg-gray-50 dark:bg-slate-800/50 rounded-lg py-2"'
);

fs.writeFileSync(cardPath, card, 'utf8');

const pagePath = '/Users/muzammil/Documents/q4queue/qrq/frontend/app/[orgSlug]/dashboard/sessions/[sessionId]/queues/page.tsx';
let page = fs.readFileSync(pagePath, 'utf8');

// 1. Search Input Wrapper
page = page.replace(
    'className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 focus-within:border-blue-400 focus-within:ring-4 focus-within:ring-blue-50 transition-all w-full sm:w-56"',
    'className="flex items-center gap-2 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-white/10 rounded-xl px-3.5 py-2.5 focus-within:border-blue-400 focus-within:ring-4 focus-within:ring-blue-50 transition-all w-full sm:w-56"'
);

// 2. Search Input Text
page = page.replace(
    'className="text-sm text-gray-900 font-medium focus:outline-none bg-transparent w-full placeholder:text-gray-400"',
    'className="text-sm text-gray-900 dark:text-white font-medium focus:outline-none bg-transparent w-full placeholder:text-gray-400 dark:placeholder:text-slate-500"'
);

// 3. Search Icon
page = page.replace(
    'className="w-4 h-4 text-gray-400 flex-shrink-0"',
    'className="w-4 h-4 text-gray-400 dark:text-slate-500 flex-shrink-0"'
);

// 4. Today Badge
page = page.replace(
    'className="ml-2.5 text-[10px] font-black uppercase tracking-widest text-blue-600 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-md align-middle"',
    'className="ml-2.5 text-[10px] font-black uppercase tracking-widest text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-900/50 px-2 py-0.5 rounded-md align-middle"'
);

// 5. Active Queue Pill (Top)
page = page.replace(
    'className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md"',
    'className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-900/50 px-2 py-0.5 rounded-md"'
);

// 6. Inactive Queue Pill (Top)
page = page.replace(
    'className="text-[10px] font-black uppercase tracking-widest text-gray-400 bg-gray-100 border border-gray-200 px-2 py-0.5 rounded-md"',
    'className="text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-slate-400 bg-gray-100 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 px-2 py-0.5 rounded-md"'
);

// 7. Active Queues Section Header
page = page.replace(
    'className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center"',
    'className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center"'
);
page = page.replace(
    'className="text-sm font-black text-gray-900 uppercase tracking-wider"',
    'className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-wider"'
);
page = page.replace(
    'className="text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full"',
    'className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-900/50 px-2 py-0.5 rounded-full"'
);

// 8. Inactive Queues Section Header
page = page.replace(
    'className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center"',
    'className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-slate-800 flex items-center justify-center"'
);
page = page.replace(
    'className="text-sm font-black text-gray-400 uppercase tracking-wider flex-1 text-left"',
    'className="text-sm font-black text-gray-400 dark:text-slate-400 uppercase tracking-wider flex-1 text-left"'
);
page = page.replace(
    'className="text-[11px] font-bold text-gray-400 bg-gray-100 border border-gray-200 px-2 py-0.5 rounded-full mr-1"',
    'className="text-[11px] font-bold text-gray-400 dark:text-slate-400 bg-gray-100 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 px-2 py-0.5 rounded-full mr-1"'
);

fs.writeFileSync(pagePath, page, 'utf8');
