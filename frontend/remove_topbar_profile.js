const fs = require('fs');

const p = '/Users/muzammil/Documents/q4queue/qrq/frontend/components/TopBar.tsx';
let content = fs.readFileSync(p, 'utf8');

const profileBlock = `
                <div className="flex items-center gap-2.5 p-1 pr-2.5 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-full hover:border-gray-300 dark:hover:border-white/20 transition-colors cursor-pointer">
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center text-white font-bold text-[11px] shadow-sm">
                        {user?.email?.[0]?.toUpperCase() || "A"}
                    </div>
                    <span className="hidden sm:block text-[12px] font-semibold text-gray-700 dark:text-gray-200 tracking-tight">
                        {user?.email?.split("@")[0] || "Admin"}
                    </span>
                </div>`;

content = content.replace(profileBlock, '');
fs.writeFileSync(p, content, 'utf8');
