const fs = require('fs');

const topBarPath = '/Users/muzammil/Documents/q4queue/qrq/frontend/components/TopBar.tsx';
let topBarContent = fs.readFileSync(topBarPath, 'utf8');

const searchBlock = `                {/* Global Search */}
                <div className="relative hidden md:block w-64">
                    <Icons.Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input 
                        type="text" 
                        placeholder="Search..." 
                        className="w-full h-9 pl-9 pr-3 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-md text-[13px] text-gray-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder:text-gray-400"
                    />
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                        <kbd className="px-1.5 py-0.5 text-[10px] font-semibold text-gray-400 dark:text-gray-500 bg-white dark:bg-white/10 border border-gray-200 dark:border-white/5 rounded shadow-sm">⌘K</kbd>
                    </div>
                </div>

                <div className="w-px h-6 bg-gray-200 dark:bg-white/10 hidden sm:block" />

`;

topBarContent = topBarContent.replace(searchBlock, '');

fs.writeFileSync(topBarPath, topBarContent, 'utf8');
