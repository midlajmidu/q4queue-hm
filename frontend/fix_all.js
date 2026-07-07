const fs = require('fs');
const path = '/Users/muzammil/Documents/q4queue/q4queue-hm/frontend/app/organization-admin/analytics/page.tsx';
let content = fs.readFileSync(path, 'utf8');

// Find sections
const iGrid = content.indexOf('            {/* Complex Tables Grid */}');
const iWait = content.indexOf('                {/* Cross-Branch Wait Time Benchmark */}');
const iQueue = content.indexOf('                {/* Queue Analytics */}');
const iStaff = content.indexOf('                {/* Staff Performance */}');
const iPeak = content.indexOf('                {/* Peak Traffic Analysis */}');

const prefix = content.substring(0, iGrid);

// Order in original file: Wait -> Queue -> Staff -> Peak
const waitContent = content.substring(iWait, iQueue);
const queueContent = content.substring(iQueue, iStaff);
const staffContent = content.substring(iStaff, iPeak);

// Find the end of Peak, which is right before "            </div>\n        </div>\n    );\n}"
const peakEndIndex = content.lastIndexOf('            </div>\n        </div>\n    );\n}');
const peakContent = content.substring(iPeak, peakEndIndex);

const paxContent = `                {/* PAX / Group Size Analysis */}
                {data.pax_analytics && data.pax_analytics.length > 0 && (() => {
                    const allSizes = ['1', '2', '3', '4', '5+'];
                    const paddedPax = allSizes.map(size => {
                        const existing = data.pax_analytics.find((p: any) => p.group_size === size);
                        return existing || { group_size: size, token_count: 0, total_pax: 0, avg_wait_time: '—', avg_service_time: '—' };
                    });
                    const totalTokens = paddedPax.reduce((s: number, p: any) => s + p.token_count, 0);
                    const totalFootfall = paddedPax.reduce((s: number, p: any) => s + (p.total_pax || 0), 0);
                    const activePax = paddedPax.filter((p: any) => p.token_count > 0);
                    const avgGroupSize = totalTokens > 0 ? (totalFootfall / totalTokens).toFixed(1) : "0";
                    const largestGroup = Math.max(...paddedPax.map((p: any) => p.total_pax || 0));

                    const COLORS = ['#6366f1', '#a855f7', '#ec4899', '#f43f5e', '#8b5cf6'];

                    return (
                        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                                <div className="flex items-center gap-3">
                                    <div className="bg-indigo-100 p-2 rounded-lg">
                                        <UsersRound size={18} className="text-indigo-600" />
                                    </div>
                                    <div>
                                        <h2 className="font-bold text-slate-900">Guest Distribution</h2>
                                        <p className="text-[11px] text-slate-500 font-medium">Analyze group sizes to optimize service capacity</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-2xl font-black text-slate-900 leading-none">{totalTokens}</div>
                                    <div className="text-[9px] uppercase font-bold tracking-widest text-slate-400 mt-1">Total Tokens</div>
                                </div>
                            </div>

                            <div className="p-5 grid grid-cols-3 gap-4 border-b border-slate-100 bg-slate-50/30">
                                <div className="flex items-center gap-3 bg-white p-3 rounded-xl border border-slate-100 shadow-sm">
                                    <div className="bg-blue-50 text-blue-500 p-2 rounded-lg"><Users size={16} /></div>
                                    <div>
                                        <div className="text-xl font-bold text-slate-800 leading-none">{totalFootfall}</div>
                                        <div className="text-[9px] uppercase font-bold tracking-widest text-slate-400 mt-1">Total Footfall</div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 bg-white p-3 rounded-xl border border-slate-100 shadow-sm">
                                    <div className="bg-indigo-50 text-indigo-500 p-2 rounded-lg"><BarChart2 size={16} /></div>
                                    <div>
                                        <div className="text-xl font-bold text-slate-800 leading-none">{avgGroupSize}</div>
                                        <div className="text-[9px] uppercase font-bold tracking-widest text-slate-400 mt-1">Avg Group Size</div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 bg-white p-3 rounded-xl border border-slate-100 shadow-sm">
                                    <div className="bg-emerald-50 text-emerald-500 p-2 rounded-lg"><Trophy size={16} /></div>
                                    <div>
                                        <div className="text-xl font-bold text-slate-800 leading-none">{largestGroup}</div>
                                        <div className="text-[9px] uppercase font-bold tracking-widest text-slate-400 mt-1">Largest Group</div>
                                    </div>
                                </div>
                            </div>

                            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8 items-center border-b border-slate-100">
                                {/* Donut Chart */}
                                <div className="h-[220px] relative">
                                    <div className="absolute top-4 left-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Distribution</div>
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={activePax.length > 0 ? activePax : [{ group_size: 'No Data', token_count: 1 }]}
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={60}
                                                outerRadius={85}
                                                paddingAngle={5}
                                                dataKey="token_count"
                                                stroke="none"
                                            >
                                                {activePax.length > 0 ? (
                                                    activePax.map((entry: any, index: number) => (
                                                        <Cell key={\`cell-\${index}\`} fill={COLORS[index % COLORS.length]} />
                                                    ))
                                                ) : (
                                                    <Cell fill="#f1f5f9" />
                                                )}
                                            </Pie>
                                            <RechartsTooltip 
                                                formatter={(value: any, name: any, props: any) => [\`\${value} Tokens\`, \`Size: \${props.payload.group_size}\`]}
                                                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                            />
                                        </PieChart>
                                    </ResponsiveContainer>
                                    {/* Inner Text */}
                                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                        <div className="text-3xl font-black text-slate-800">{activePax.length}</div>
                                        <div className="text-[9px] uppercase font-bold tracking-widest text-slate-400">Group Types</div>
                                    </div>
                                    
                                    {/* Custom Legend */}
                                    <div className="flex justify-center gap-3 mt-2 flex-wrap">
                                        {paddedPax.map((item: any, idx: number) => (
                                            <div key={idx} className={\`flex items-center gap-1.5 text-[10px] font-bold tracking-wider \${item.token_count > 0 ? 'text-slate-500' : 'text-slate-300 opacity-50'}\`}>
                                                <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: item.token_count > 0 ? COLORS[idx % COLORS.length] : '#cbd5e1' }} />
                                                {item.group_size === '1' ? 'Solo' : item.group_size === '2' ? 'Pair' : item.group_size === '3' ? 'Trio' : item.group_size === '4' ? 'Group of 4' : '5+ Group'}
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Progress Bars */}
                                <div className="flex flex-col justify-center space-y-4">
                                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Breakdown by Group Size</div>
                                    {paddedPax.map((item: any, idx: number) => {
                                        const pct = totalTokens > 0 ? Math.round((item.token_count / totalTokens) * 100) : 0;
                                        const hasData = item.token_count > 0;
                                        const label = item.group_size === '1' ? 'Solo' : item.group_size === '2' ? 'Pair' : item.group_size === '3' ? 'Trio' : item.group_size === '4' ? 'Group of 4' : '5+ Group';
                                        const color = COLORS[idx % COLORS.length];

                                        return (
                                            <div key={idx} className={\`flex flex-col gap-1.5 \${!hasData ? 'opacity-40 grayscale' : ''}\`}>
                                                <div className="flex justify-between items-end">
                                                    <div className="flex items-center gap-2">
                                                        <User size={12} className="text-slate-400" />
                                                        <span className="text-[13px] font-bold text-slate-700">{label}</span>
                                                    </div>
                                                    <div className="flex items-baseline gap-2">
                                                        <span className="text-sm font-black text-slate-900">{item.token_count}</span>
                                                        <span className="text-[10px] font-bold text-slate-400 w-6 text-right">{pct}%</span>
                                                    </div>
                                                </div>
                                                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                                                    <div 
                                                        className="h-full rounded-full transition-all duration-1000" 
                                                        style={{ width: \`\${pct}%\`, backgroundColor: color }} 
                                                    />
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            <div className="overflow-x-auto flex-1">
                                <table className="w-full text-left text-[13px] whitespace-nowrap">
                                    <thead className="bg-slate-50/80 border-b border-slate-200">
                                        <tr className="text-[9px] uppercase text-slate-400 font-bold tracking-widest">
                                            <th className="py-3 px-6">Group Type</th>
                                            <th className="py-3 px-6 text-right">Tokens</th>
                                            <th className="py-3 px-6 text-right">Guests</th>
                                            <th className="py-3 px-6 text-right">Avg Wait</th>
                                            <th className="py-3 px-6 text-right">Avg Play Time</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {paddedPax.map((item: any, idx: number) => {
                                            const label = item.group_size === '1' ? 'Solo' : item.group_size === '2' ? 'Pair' : item.group_size === '3' ? 'Trio' : item.group_size === '4' ? 'Group of 4' : '5+ Group';
                                            const humanTime = (t: string) => {
                                                if (!t || t === '—') return '—';
                                                const [h, m, s] = t.split(':').map(Number);
                                                let res = [];
                                                if (h > 0) res.push(\`\${h}h\`);
                                                if (m > 0 || h > 0) res.push(\`\${m}m\`);
                                                res.push(\`\${s}s\`);
                                                return res.join(' ');
                                            };
                                            return (
                                                <tr key={idx} className={\`hover:bg-slate-50/50 transition-colors \${item.token_count === 0 ? 'opacity-50 grayscale' : ''}\`}>
                                                    <td className="py-3.5 px-6">
                                                        <div className="flex items-center gap-2">
                                                            <User size={14} className="text-slate-400" />
                                                            <span className="font-bold text-slate-700">{label}</span>
                                                        </div>
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
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    );
                })()}
`;

const newLayout = `${prefix}            {/* Complex Tables Grid */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                
                {/* Left Column */}
                <div className="flex flex-col gap-6">
${queueContent}${waitContent}${peakContent}                </div>

                {/* Right Column */}
                <div className="flex flex-col gap-6">
${staffContent}${paxContent}                </div>
            </div>
        </div>
    );
}
`;

fs.writeFileSync(path, newLayout, 'utf8');
console.log("Restored layout and PAX correctly!");
