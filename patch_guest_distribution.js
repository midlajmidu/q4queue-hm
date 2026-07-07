const fs = require('fs');
const path = '/Users/muzammil/Documents/q4queue/q4queue-hm/frontend/app/organization-admin/analytics/page.tsx';

let content = fs.readFileSync(path, 'utf8');

// 1. Insert helper variables right after `const [queuePage, setQueuePage] = useState(1);`
const helperCode = `
    // Extract Guest Distribution Helpers
    const sizeColors: Record<string, string> = {
        '1': '#818cf8', // indigo-400
        '2': '#34d399', // emerald-400
        '3': '#fbbf24', // amber-400
        '4': '#f472b6', // pink-400
        '5+': '#f87171' // red-400
    };

    const sizeLabel = (size: string) => {
        if (size === '1') return "Solo Guests";
        if (size === '2') return "Couples / Pairs";
        if (size === '3') return "Small Groups (3)";
        if (size === '4') return "Medium Groups (4)";
        return "Large Groups (5+)";
    };

    const renderSizeIcon = (size: string) => {
        if (size === '1') return <User size={14} className="text-indigo-500" />;
        if (size === '2') return <Users size={14} className="text-emerald-500" />;
        if (size === '3') return <Users size={14} className="text-amber-500" />;
        if (size === '4') return <UsersRound size={14} className="text-pink-500" />;
        return <UsersRound size={14} className="text-red-500" />;
    };

    const humanTime = (timeStr: string | null) => {
        if (!timeStr || timeStr === "0m") return "—";
        return timeStr; 
    };

    let paddedPax: any[] = [];
    let totalTokens = 0;
    if (data && data.pax_analytics) {
        const paxData = data.pax_analytics;
        ['1', '2', '3', '4', '5+'].forEach(size => {
            const existing = paxData.find((p: any) => p.group_size === size);
            if (existing) {
                paddedPax.push(existing);
                totalTokens += existing.token_count;
            } else {
                paddedPax.push({
                    group_size: size,
                    token_count: 0,
                    total_pax: 0,
                    avg_wait_time: null,
                    avg_service_time: null
                });
            }
        });
    }
`;

if (!content.includes('const sizeColors: Record<string, string> = {')) {
    content = content.replace('const [queuePage, setQueuePage] = useState(1);', 'const [queuePage, setQueuePage] = useState(1);\n' + helperCode);
}

// 2. Insert the UI block right before `{/* Queue Analytics */}`
const uiBlock = `
                {/* Guest Distribution */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                    <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                        <div className="flex flex-col gap-1">
                            <h2 className="font-bold text-slate-900 flex items-center gap-2">
                                <UsersRound size={18} className="text-indigo-500" />
                                Guest Distribution by Group Size
                            </h2>
                            <p className="text-[12px] font-medium text-slate-500">Breakdown of tokens by number of guests</p>
                        </div>
                    </div>
                    <div className="p-6 pb-2">
                        {/* Visual Bar Chart showing distribution */}
                        <div className="w-full flex items-end gap-3 h-28">
                            {paddedPax.map((item: any, idx: number) => {
                                const pct = totalTokens > 0 ? Math.round((item.token_count / totalTokens) * 100) : 0;
                                const barHeight = pct > 0 ? Math.max(15, pct) : 5;
                                return (
                                    <div key={\`bar-\${idx}\`} className="flex flex-col items-center flex-1 gap-2 group">
                                        <div className="relative w-full flex justify-center">
                                            {/* Tooltip on hover */}
                                            <div className="absolute bottom-full mb-2 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-800 text-white text-[10px] py-1 px-2 rounded font-bold whitespace-nowrap pointer-events-none z-10">
                                                {pct}% ({item.token_count})
                                            </div>
                                            {/* The Bar */}
                                            <div 
                                                className={\`w-full max-w-[40px] rounded-t-md transition-all duration-500 \${item.token_count === 0 ? 'bg-slate-100' : ''}\`}
                                                style={{ 
                                                    height: \`\${barHeight}%\`, 
                                                    backgroundColor: item.token_count > 0 ? sizeColors[item.group_size] : undefined
                                                }}
                                            ></div>
                                        </div>
                                        <div className="text-[10px] font-bold text-slate-400">{item.group_size}</div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-[13px]">
                            <thead>
                                <tr className="bg-slate-50/80 border-b border-slate-200">
                                    <th className="py-3 px-6 text-[10px] uppercase text-slate-400 font-bold tracking-widest">Group Type</th>
                                    <th className="py-3 px-6 text-right text-[10px] uppercase text-slate-400 font-bold tracking-widest">Tokens</th>
                                    <th className="py-3 px-6 text-right text-[10px] uppercase text-slate-400 font-bold tracking-widest">Guests</th>
                                    <th className="py-3 px-6 text-right text-[10px] uppercase text-slate-400 font-bold tracking-widest">Avg Wait</th>
                                    <th className="py-3 px-6 text-right text-[10px] uppercase text-slate-400 font-bold tracking-widest">Avg Play Time</th>
                                </tr>
                            </thead>
                            <tbody>
                                {paddedPax.map((item: any, idx: number) => (
                                    <tr key={idx} className={\`border-b border-slate-50 last:border-0 transition-colors \${item.token_count === 0 ? 'opacity-30' : 'hover:bg-violet-50/20'}\`}>
                                        <td className="py-3.5 px-6">
                                            <span className="inline-flex items-center gap-2.5">
                                                <div className="w-7 h-7 rounded-lg border flex items-center justify-center text-[11px] font-extrabold" style={{ backgroundColor: \`\${sizeColors[item.group_size]}10\`, borderColor: \`\${sizeColors[item.group_size]}30\` }}>
                                                    {renderSizeIcon(item.group_size)}
                                                </div>
                                                <span className="font-semibold text-slate-900">{sizeLabel(item.group_size)}</span>
                                            </span>
                                        </td>
                                        <td className="py-3.5 px-6 text-right">
                                            <span className="font-bold text-slate-800">{item.token_count}</span>
                                            {totalTokens > 0 && item.token_count > 0 && (
                                                <span className="ml-1.5 text-[11px] font-semibold text-slate-400">({Math.round((item.token_count / totalTokens) * 100)}%)</span>
                                            )}
                                        </td>
                                        <td className="py-3.5 px-6 text-right font-bold text-violet-600">{item.total_pax || '—'}</td>
                                        <td className="py-3.5 px-6 text-right font-medium text-slate-500">{humanTime(item.avg_wait_time)}</td>
                                        <td className="py-3.5 px-6 text-right font-medium text-slate-500">{humanTime(item.avg_service_time)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

`;

if (!content.includes('Guest Distribution by Group Size')) {
    content = content.replace('{/* Queue Analytics */}', uiBlock + '                {/* Queue Analytics */}');
}

fs.writeFileSync(path, content, 'utf8');
console.log("Restored Guest Distribution!");
