const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'frontend/app/organization-admin/monitoring/sessions/page.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// Imports
content = content.replace(
    'import { useState, useEffect } from "react";\nimport { api } from "@/lib/api";\nimport { Users, ExternalLink } from "lucide-react";',
    'import { useState, useEffect, useMemo } from "react";\nimport { api } from "@/lib/api";\nimport { Users, ExternalLink, ArrowUp, ArrowDown } from "lucide-react";'
);

// State
content = content.replace(
    '    const [sessions, setSessions] = useState<any[]>([]);\n    const [loading, setLoading] = useState(true);',
    '    const [sessions, setSessions] = useState<any[]>([]);\n    const [loading, setLoading] = useState(true);\n    const [sortField, setSortField] = useState<string | null>(null);\n    const [sortDirection, setSortDirection] = useState<\'asc\' | \'desc\'>(\'asc\');'
);

// Sorting Logic
const sortingLogic = `
    const processedSessions = useMemo(() => {
        return sessions.map((s, idx) => ({
            ...s,
            originalIdx: idx,
            loadStatus: s.load_status || (idx % 3 === 0 ? "Heavy" : idx % 5 === 0 ? "Critical" : "Normal"),
            staffPresentNum: parseInt(s.active_staff_present || (idx % 3 === 0 ? "2" : "5"), 10),
            staffTotalNum: parseInt(s.active_staff_total || "5", 10),
            lastSyncVal: idx % 4 === 0 ? 120 : 0 // 2m vs Just now for sorting
        }));
    }, [sessions]);

    const sortedSessions = useMemo(() => {
        if (!sortField) return processedSessions;

        return [...processedSessions].sort((a, b) => {
            let aVal, bVal;

            switch (sortField) {
                case 'branch':
                    aVal = a.branch?.toLowerCase() || '';
                    bVal = b.branch?.toLowerCase() || '';
                    break;
                case 'session_name':
                    aVal = a.session_name?.toLowerCase() || '';
                    bVal = b.session_name?.toLowerCase() || '';
                    break;
                case 'load_status':
                    const loadOrder = { 'Normal': 1, 'Heavy': 2, 'Critical': 3 };
                    aVal = loadOrder[a.loadStatus as keyof typeof loadOrder] || 0;
                    bVal = loadOrder[b.loadStatus as keyof typeof loadOrder] || 0;
                    break;
                case 'staff_present':
                    aVal = a.staffPresentNum;
                    bVal = b.staffPresentNum;
                    break;
                case 'status':
                    aVal = a.status?.toLowerCase() || '';
                    bVal = b.status?.toLowerCase() || '';
                    break;
                case 'last_sync':
                    aVal = a.lastSyncVal;
                    bVal = b.lastSyncVal;
                    break;
                default:
                    return 0;
            }

            if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
            if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
            return 0;
        });
    }, [processedSessions, sortField, sortDirection]);

    const handleSort = (field: string) => {
        if (sortField === field) {
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortDirection('asc');
        }
    };

    const SortHeader = ({ field, label, align = 'left' }: { field: string, label: string, align?: 'left' | 'center' | 'right' }) => (
        <th 
            className={\`px-4 py-3 cursor-pointer hover:bg-slate-100 transition-colors group select-none \${align === 'center' ? 'text-center' : align === 'right' ? 'text-right' : 'text-left'}\`}
            onClick={() => handleSort(field)}
        >
            <div className={\`flex items-center gap-1 \${align === 'center' ? 'justify-center' : align === 'right' ? 'justify-end' : 'justify-start'}\`}>
                <span className="group-hover:text-indigo-600 transition-colors">{label}</span>
                <div className="flex flex-col -space-y-1">
                    <ArrowUp size={10} className={\`\${sortField === field && sortDirection === 'asc' ? 'text-indigo-600' : 'text-slate-300 group-hover:text-indigo-300'}\`} />
                    <ArrowDown size={10} className={\`\${sortField === field && sortDirection === 'desc' ? 'text-indigo-600' : 'text-slate-300 group-hover:text-indigo-300'}\`} />
                </div>
            </div>
        </th>
    );

    if (loading) {`;
content = content.replace('    if (loading) {', sortingLogic);

// Headers
const headers = `                            <tr className="bg-slate-50 border-b border-slate-200 text-[11px] uppercase tracking-wider text-slate-500 font-semibold">
                                <SortHeader field="branch" label="Branch" />
                                <SortHeader field="session_name" label="Session Name" />
                                <SortHeader field="load_status" label="Branch Load" />
                                <SortHeader field="staff_present" label="Staff Present" align="center" />
                                <SortHeader field="status" label="Status" />
                                <SortHeader field="last_sync" label="Last Sync" />
                                <th className="px-4 py-3 text-right">Actions</th>
                            </tr>`;
content = content.replace(
    /<tr className="bg-slate-50 border-b border-slate-200 text-\[11px\] uppercase tracking-wider text-slate-500 font-semibold">[\s\S]*?<\/tr>/m,
    headers
);

// Map
content = content.replace(
    'sessions.map((s: any, idx: number) => {',
    'sortedSessions.map((s: any) => {'
);
content = content.replace(
    'const loadStatus = s.load_status || (idx % 3 === 0 ? "Heavy" : idx % 5 === 0 ? "Critical" : "Normal");',
    'const loadStatus = s.loadStatus;\n                                    const idx = s.originalIdx;'
);

fs.writeFileSync(filePath, content);
console.log('Fixed Sessions Monitoring sorting!');
