import re

with open('/Users/muzammil/Documents/q4queue/q4queue-hm/frontend/app/organization-admin/analytics/page.tsx', 'r') as f:
    content = f.read()

# The chunk we want to replace starts with:
start_marker = '            {/* Complex Tables Grid */}'
# The chunk ends with the end of the Guest Distribution which is right before Queue Analytics
end_marker_1 = '                {/* Queue Analytics */}'

start_idx = content.find(start_marker)
end_idx = content.find(end_marker_1)

if start_idx == -1 or end_idx == -1:
    print("Could not find markers")
    exit(1)

# Extract the Cross-Branch Wait Benchmark to keep it
benchmark_start = content.find('                {/* Cross-Branch Wait Time Benchmark */}', start_idx)
benchmark_end = content.find('                {/* Guest Distribution */}', benchmark_start)
benchmark_content = content[benchmark_start:benchmark_end].strip()

new_content = r"""            {/* Guest Distribution (Full Width) */}
            <div className="bg-white rounded-[20px] border border-slate-200/80 shadow-sm overflow-hidden flex flex-col mb-6 mt-6">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                    <div className="flex flex-col gap-1">
                        <h2 className="font-bold text-slate-900 flex items-center gap-2">
                            <UsersRound size={20} className="text-indigo-500" />
                            Guest Distribution by Group Size
                        </h2>
                        <p className="text-[13px] font-medium text-slate-500">Comprehensive breakdown of all issued tokens across branches</p>
                    </div>
                </div>
                <div className="flex flex-col lg:flex-row divide-y lg:divide-y-0 lg:divide-x divide-slate-100">
                    {/* Left Side: Visual Pie Chart (Hero) - 35% Width */}
                    <div className="w-full lg:w-[35%] p-8 flex flex-col items-center justify-center bg-slate-50/20">
                        <div className="w-full h-[280px]">
                            {totalTokens === 0 ? (
                                <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 text-sm">
                                    <UsersRound size={32} className="mb-2 opacity-20" />
                                    No guest data available
                                </div>
                            ) : (
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={paddedPax.filter((d: any) => d.token_count > 0)}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={80}
                                            outerRadius={105}
                                            paddingAngle={3}
                                            dataKey="token_count"
                                            cornerRadius={4}
                                            stroke="none"
                                        >
                                            {paddedPax.filter((d: any) => d.token_count > 0).map((entry: any, index: number) => (
                                                <Cell key={`cell-${index}`} fill={sizeColors[entry.group_size] || '#94a3b8'} />
                                            ))}
                                        </Pie>
                                        <text x="50%" y="47%" textAnchor="middle" dominantBaseline="middle" className="text-6xl font-black fill-slate-800" style={{ fontWeight: 800, letterSpacing: '-0.02em' }}>
                                            {totalGuests}
                                        </text>
                                        <text x="50%" y="61%" textAnchor="middle" dominantBaseline="middle" className="text-[12px] font-bold fill-slate-400 uppercase tracking-widest">
                                            Total Guests
                                        </text>
                                        <RechartsTooltip 
                                            cursor={false}
                                            content={({ active, payload }: any) => {
                                                if (active && payload && payload.length) {
                                                    const data = payload[0].payload;
                                                    return (
                                                        <div className="bg-white/95 backdrop-blur-sm p-4 rounded-2xl border border-slate-200/60 shadow-[0_8px_30px_rgb(0,0,0,0.08)] min-w-[220px]">
                                                            <div className="flex items-center gap-3 mb-3 pb-3 border-b border-slate-100/80">
                                                                <div className="w-3.5 h-3.5 rounded-full border shadow-sm" style={{ backgroundColor: sizeColors[data.group_size], borderColor: `${sizeColors[data.group_size]}40` }}></div>
                                                                <span className="font-bold text-slate-900 text-[14px] leading-none">{sizeLabel(data.group_size)}</span>
                                                            </div>
                                                            <div className="flex flex-col gap-2.5">
                                                                <div className="flex items-center justify-between">
                                                                    <span className="text-slate-500 text-[12px] font-medium tracking-wide">Tokens</span>
                                                                    <div className="flex items-baseline gap-1.5">
                                                                        <span className="font-black text-slate-800 text-[14px] leading-none">{data.token_count}</span>
                                                                        <span className="text-slate-400 font-semibold text-[11px]">({Math.round(((data.token_count || 0) / totalTokens) * 100)}%)</span>
                                                                    </div>
                                                                </div>
                                                                <div className="flex items-center justify-between">
                                                                    <span className="text-slate-500 text-[12px] font-medium tracking-wide">Guests</span>
                                                                    <div className="flex items-baseline gap-1.5">
                                                                        <span className="font-black text-slate-800 text-[14px] leading-none">{data.total_pax}</span>
                                                                        <span className="text-slate-400 font-semibold text-[11px]">({Math.round((data.total_pax / totalGuests) * 100)}%)</span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                }
                                                return null;
                                            }}
                                        />
                                    </PieChart>
                                </ResponsiveContainer>
                            )}
                        </div>
                    </div>

                    {/* Right Side: The Metric Grid - 65% Width */}
                    <div className="w-full lg:w-[65%] p-8 bg-white flex items-center justify-center">
                        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6 w-full">
                            {paddedPax.map((item: any, idx: number) => {
                                const guestPct = totalGuests > 0 && item.total_pax > 0 ? Math.round((item.total_pax / totalGuests) * 100) : 0;
                                
                                return (
                                    <div key={idx} className={`flex flex-col p-5 rounded-2xl border ${item.token_count === 0 ? 'opacity-40 grayscale-[0.5] border-slate-100' : 'border-slate-200 shadow-sm hover:border-slate-300 hover:shadow-md transition-all'} bg-white`}>
                                        {/* Header: Icon + Name */}
                                        <div className="flex items-center gap-3.5 mb-5">
                                            <div className="w-10 h-10 rounded-full border flex items-center justify-center shrink-0" style={{ backgroundColor: `${sizeColors[item.group_size]}15`, borderColor: `${sizeColors[item.group_size]}30`, color: sizeColors[item.group_size] }}>
                                                {renderSizeIcon(item.group_size)}
                                            </div>
                                            <span className="text-[14px] font-bold text-slate-900 leading-tight">{sizeLabel(item.group_size)}</span>
                                        </div>

                                        {/* Primary Metric: Tokens & Progress */}
                                        <div className="flex flex-col mb-5">
                                            <div className="flex items-baseline gap-2 mb-2">
                                                <span className="text-[28px] font-black text-slate-800 leading-none tracking-tight">{item.token_count}</span>
                                                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest leading-none">Tokens</span>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden flex justify-start">
                                                    <div className="h-full rounded-full transition-all duration-500" style={{ width: `${guestPct}%`, backgroundColor: sizeColors[item.group_size] }}></div>
                                                </div>
                                                <span className="text-[11px] font-bold text-slate-400 w-8 text-right tabular-nums">{guestPct}%</span>
                                            </div>
                                        </div>

                                        {/* Secondary Metrics: Wait & Play Time */}
                                        <div className="flex flex-col gap-2.5 pt-4 border-t border-slate-100 mt-auto">
                                            <div className="flex items-center justify-between text-[12px]">
                                                <span className="font-medium text-slate-400">Avg Wait</span>
                                                <span className="font-semibold text-slate-700">{humanTime(item.avg_wait_time)}</span>
                                            </div>
                                            <div className="flex items-center justify-between text-[12px]">
                                                <span className="font-medium text-slate-400">Avg Play</span>
                                                <span className="font-semibold text-slate-700">{humanTime(item.avg_service_time)}</span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>

            {/* Complex Tables Grid */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                
"""

final_content = content[:start_idx] + new_content + "                " + benchmark_content + "\n\n" + content[end_idx:]

with open('/Users/muzammil/Documents/q4queue/q4queue-hm/frontend/app/organization-admin/analytics/page.tsx', 'w') as f:
    f.write(final_content)

print("Updated successfully")
