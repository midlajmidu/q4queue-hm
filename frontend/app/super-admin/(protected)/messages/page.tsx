"use client";

import { useState } from "react";

type DummyMessageLog = {
    id: string;
    organization: string;
    customer: string;
    phone: string;
    messageType: string;
    status: "Sent" | "Failed" | "Delivered" | "Pending";
    time: string;
};

const DUMMY_DATA: DummyMessageLog[] = [
    { id: "1", organization: "TechCorp Inc", customer: "John Doe", phone: "+1 (555) 123-4567", messageType: "Queue Joined", status: "Delivered", time: "2 mins ago" },
    { id: "2", organization: "HealthPlus Clinic", customer: "Sarah Smith", phone: "+1 (555) 987-6543", messageType: "Turn Approaching", status: "Sent", time: "5 mins ago" },
    { id: "3", organization: "City Bank", customer: "Michael Brown", phone: "+1 (555) 456-7890", messageType: "Turn Ready", status: "Failed", time: "12 mins ago" },
    { id: "4", organization: "TechCorp Inc", customer: "Emily White", phone: "+1 (555) 222-3333", messageType: "Queue Joined", status: "Delivered", time: "1 hour ago" },
    { id: "5", organization: "Fresh Market", customer: "David Green", phone: "+1 (555) 444-5555", messageType: "Turn Ready", status: "Pending", time: "2 hours ago" },
];

export default function MessageLogsPage() {
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("All");
    const [typeFilter, setTypeFilter] = useState("All");

    const handleExport = () => {
        alert("Exporting CSV... (Dummy Action)");
    };

    const filteredData = DUMMY_DATA.filter(msg => {
        const matchesSearch = msg.customer.toLowerCase().includes(search.toLowerCase()) || 
                              msg.phone.includes(search) || 
                              msg.organization.toLowerCase().includes(search.toLowerCase());
        const matchesStatus = statusFilter === "All" || msg.status === statusFilter;
        const matchesType = typeFilter === "All" || msg.messageType === typeFilter;
        return matchesSearch && matchesStatus && matchesType;
    });

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                        <svg className="w-6 h-6 text-violet-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
                        Global Message Logs
                    </h1>
                    <p className="text-sm text-slate-400 mt-1">View and filter WhatsApp notifications sent across all organizations.</p>
                </div>
                <button 
                    onClick={handleExport}
                    className="flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 py-2.5 px-5 rounded-xl transition-colors border border-slate-700 text-sm font-medium shadow-sm"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                    Export CSV
                </button>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
                {/* Toolbar */}
                <div className="p-5 border-b border-slate-800 bg-slate-900/50 flex flex-col md:flex-row gap-4">
                    <div className="relative flex-1">
                        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                        <input
                            type="search"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search by customer, phone, or org..."
                            className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:border-violet-500 focus:ring-1 focus:ring-violet-500 focus:outline-none transition-colors"
                        />
                    </div>
                    <div className="flex gap-4">
                        <select 
                            value={typeFilter}
                            onChange={(e) => setTypeFilter(e.target.value)}
                            className="bg-slate-950 border border-slate-700 rounded-xl text-sm text-slate-300 px-4 py-2 focus:border-violet-500 focus:outline-none"
                        >
                            <option value="All">All Types</option>
                            <option value="Queue Joined">Queue Joined</option>
                            <option value="Turn Approaching">Turn Approaching</option>
                            <option value="Turn Ready">Turn Ready</option>
                        </select>
                        <select 
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="bg-slate-950 border border-slate-700 rounded-xl text-sm text-slate-300 px-4 py-2 focus:border-violet-500 focus:outline-none"
                        >
                            <option value="All">All Statuses</option>
                            <option value="Delivered">Delivered</option>
                            <option value="Sent">Sent</option>
                            <option value="Pending">Pending</option>
                            <option value="Failed">Failed</option>
                        </select>
                    </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-800/50 text-xs text-slate-400 font-semibold uppercase tracking-wider">
                            <tr>
                                <th className="px-6 py-4">Organization</th>
                                <th className="px-6 py-4">Customer</th>
                                <th className="px-6 py-4">Phone</th>
                                <th className="px-6 py-4">Message Type</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4">Time</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/40">
                            {filteredData.length > 0 ? (
                                filteredData.map(log => (
                                    <tr key={log.id} className="hover:bg-slate-800/30 transition-colors">
                                        <td className="px-6 py-4 text-slate-200 font-medium">{log.organization}</td>
                                        <td className="px-6 py-4 text-slate-300">{log.customer}</td>
                                        <td className="px-6 py-4 text-slate-400 font-mono text-xs">{log.phone}</td>
                                        <td className="px-6 py-4 text-slate-300">
                                            <span className="inline-flex items-center px-2 py-1 rounded bg-slate-800 text-xs font-medium text-slate-300">
                                                {log.messageType}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
                                                log.status === "Delivered" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" :
                                                log.status === "Sent" ? "bg-blue-500/10 text-blue-400 border-blue-500/20" :
                                                log.status === "Pending" ? "bg-amber-500/10 text-amber-400 border-amber-500/20" :
                                                "bg-red-500/10 text-red-400 border-red-500/20"
                                            }`}>
                                                <span className={`w-1.5 h-1.5 rounded-full ${
                                                    log.status === "Delivered" ? "bg-emerald-400" :
                                                    log.status === "Sent" ? "bg-blue-400" :
                                                    log.status === "Pending" ? "bg-amber-400" :
                                                    "bg-red-400"
                                                }`} />
                                                {log.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-slate-400 text-xs whitespace-nowrap">{log.time}</td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                                        No messages found matching your criteria.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
                
                {/* Dummy Pagination */}
                <div className="px-6 py-4 border-t border-slate-800/50 flex items-center justify-between text-sm">
                    <span className="text-slate-500">Showing {filteredData.length} entries</span>
                    <div className="flex gap-1">
                        <button disabled className="px-3 py-1 text-slate-500 bg-slate-800/30 rounded disabled:opacity-50">Prev</button>
                        <button disabled className="px-3 py-1 text-slate-500 bg-slate-800/30 rounded disabled:opacity-50">Next</button>
                    </div>
                </div>
            </div>
        </div>
    );
}
