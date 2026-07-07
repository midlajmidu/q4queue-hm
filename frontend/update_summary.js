const fs = require('fs');
const path = '/Users/muzammil/Documents/q4queue/q4queue-hm/frontend/components/organization-admin/branch-details/BranchExecutiveSummary.tsx';
let content = fs.readFileSync(path, 'utf8');

// Replace the grid of cards
const searchStr = `<div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 flex flex-col justify-between">`;
// We will just do a multi_replace manually by completely replacing the render block.
const renderStart = `    return (\n        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">`;
const renderEnd = `        </div>\n    );\n}`;

const iStart = content.indexOf(renderStart);
const iEnd = content.indexOf(renderEnd);

if (iStart !== -1 && iEnd !== -1) {
    const newRender = `    return (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            <div className="bg-white rounded-[20px] border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow p-5 flex flex-col justify-between group">
                <div className="flex justify-between items-start mb-4">
                    <div className="text-[12px] font-bold text-slate-500 tracking-wider uppercase">Total Staff</div>
                    <div className="bg-indigo-50 p-2 rounded-xl text-indigo-500 group-hover:bg-indigo-500 group-hover:text-white transition-colors">
                        <Users size={16} strokeWidth={2.5} />
                    </div>
                </div>
                <div className="text-3xl font-bold tracking-tight text-slate-900 tabular-nums leading-none">{data.total_staff.toLocaleString()}</div>
            </div>
            
            <div className="bg-white rounded-[20px] border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow p-5 flex flex-col justify-between group">
                <div className="flex justify-between items-start mb-4">
                    <div className="text-[12px] font-bold text-slate-500 tracking-wider uppercase">Active Sessions</div>
                    <div className="bg-emerald-50 p-2 rounded-xl text-emerald-500 group-hover:bg-emerald-500 group-hover:text-white transition-colors">
                        <MonitorPlay size={16} strokeWidth={2.5} />
                    </div>
                </div>
                <div className="text-3xl font-bold tracking-tight text-slate-900 tabular-nums leading-none">{data.active_sessions.toLocaleString()}</div>
            </div>
            
            <div className="bg-white rounded-[20px] border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow p-5 flex flex-col justify-between group">
                <div className="flex justify-between items-start mb-4">
                    <div className="text-[12px] font-bold text-slate-500 tracking-wider uppercase">Active Queues</div>
                    <div className="bg-blue-50 p-2 rounded-xl text-blue-500 group-hover:bg-blue-500 group-hover:text-white transition-colors">
                        <Ticket size={16} strokeWidth={2.5} />
                    </div>
                </div>
                <div className="text-3xl font-bold tracking-tight text-slate-900 tabular-nums leading-none">{data.active_queues.toLocaleString()}</div>
            </div>
            
            <div className="bg-white rounded-[20px] border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow p-5 flex flex-col justify-between group">
                <div className="flex justify-between items-start mb-4">
                    <div className="text-[12px] font-bold text-slate-500 tracking-wider uppercase">Served Today</div>
                    <div className="bg-violet-50 p-2 rounded-xl text-violet-500 group-hover:bg-violet-500 group-hover:text-white transition-colors">
                        <Activity size={16} strokeWidth={2.5} />
                    </div>
                </div>
                <div className="text-3xl font-bold tracking-tight text-slate-900 tabular-nums leading-none">{data.customers_served_today.toLocaleString()}</div>
            </div>
        </div>
    );
}`;

    let newContent = content.substring(0, iStart) + newRender;
    
    // Also fix the loading state
    const loadingOld = `                    <div key={i} className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 flex flex-col justify-between h-32 animate-pulse">`;
    const loadingNew = `                    <div key={i} className="bg-white rounded-[20px] border border-slate-200/80 shadow-sm p-5 flex flex-col justify-between h-[120px] animate-pulse">`;
    newContent = newContent.replace(loadingOld, loadingNew);

    fs.writeFileSync(path, newContent, 'utf8');
    console.log("Updated BranchExecutiveSummary");
} else {
    console.error("Could not find render block");
}
