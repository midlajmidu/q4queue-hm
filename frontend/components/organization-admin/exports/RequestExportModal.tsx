import React, { useState, useEffect } from 'react';
import { X, FileText, Calendar, Filter, Building, List, Info } from 'lucide-react';
import { requestExport, api, getDistinctQueues } from '@/lib/api';
import { getToken } from '@/lib/auth';

interface RequestExportModalProps {
    isOpen: boolean;
    onClose: () => void;
    onExportRequested: () => void;
}

const REPORT_TYPES = [
    {
        value: "Executive Summary",
        description: "High-level KPIs across all branches: total branches, total customers, waiting times, and service completion rates."
    },
    {
        value: "Branch Performance Report",
        description: "Per-branch metrics: branch name, active queues, staff counts, served customers, and performance scores."
    },
    {
        value: "Staff Performance Report",
        description: "All staff details: full name, role, branch, online status, tokens served, service times, and completion rates."
    },
    {
        value: "Waiting Time Analysis",
        description: "Detailed waiting time metrics: average/max/min wait times, waiting time distribution, and peak hour analysis."
    },
    {
        value: "Customer Detailed Report",
        description: "Full customer-level data: token number, name, phone, queue, session date, wait time, service time, served by, and final status (served/skipped/removed)."
    }
];

const DATE_RANGES = [
    "Today",
    "Yesterday",
    "Last 7 Days",
    "Last 30 Days",
    "This Month",
    "Last Month",
    "Custom Date Range"
];

export default function RequestExportModal({ isOpen, onClose, onExportRequested }: RequestExportModalProps) {
    const token = getToken();
    const [reportType, setReportType] = useState(REPORT_TYPES[0].value);
    const [format, setFormat] = useState('EXCEL');
    const [dateRange, setDateRange] = useState('Last 7 Days');
    const [customStartDate, setCustomStartDate] = useState('');
    const [customEndDate, setCustomEndDate] = useState('');

    // Customer Detailed Report Specific State
    const [branchSelection, setBranchSelection] = useState<'ALL' | 'SPECIFIC'>('ALL');
    const [selectedBranchId, setSelectedBranchId] = useState('');
    const [branches, setBranches] = useState<any[]>([]);

    const [queueSelection, setQueueSelection] = useState<'ALL' | 'SPECIFIC'>('ALL');
    const [selectedQueueName, setSelectedQueueName] = useState('');
    const [queues, setQueues] = useState<string[]>([]);

    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const selectedReportMeta = REPORT_TYPES.find(r => r.value === reportType);

    // Fetch branches when Customer Detailed Report is selected
    useEffect(() => {
        if (reportType === "Customer Detailed Report") {
            setFormat("EXCEL");
            if (branches.length === 0) {
                api.listBranches()
                    .then(data => {
                        setBranches(data);
                        if (data.length > 0) setSelectedBranchId(data[0].id);
                    })
                    .catch(err => console.error("Failed to load branches", err));
            }
        }
    }, [reportType, branches.length]);

    // Fetch queues when specific branch is selected
    useEffect(() => {
        if (reportType === "Customer Detailed Report" && branchSelection === "SPECIFIC" && selectedBranchId && token) {
            getDistinctQueues(selectedBranchId, token)
                .then(data => {
                    setQueues(data);
                    if (data.length > 0) setSelectedQueueName(data[0]);
                })
                .catch(err => console.error("Failed to load queues", err));
        }
    }, [branchSelection, selectedBranchId, reportType, token]);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setIsLoading(true);

        try {
            if (!token) throw new Error('Not authenticated');

            const payload: any = {
                report_type: reportType,
                format,
                date_range: dateRange
            };

            if (dateRange === "Custom Date Range") {
                if (!customStartDate || !customEndDate) {
                    throw new Error("Please select both start and end dates for Custom Date Range.");
                }
                payload.custom_start_date = customStartDate;
                payload.custom_end_date = customEndDate;
            }

            if (reportType === "Customer Detailed Report") {
                if (branchSelection === "SPECIFIC" && selectedBranchId) {
                    payload.branch_ids = [selectedBranchId];
                    if (queueSelection === "SPECIFIC" && selectedQueueName) {
                        payload.queue_names = [selectedQueueName];
                    }
                }
            }

            await requestExport(payload, token);
            onExportRequested();
            onClose();
        } catch (err: any) {
            setError(err.message || 'Failed to request export');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-slate-100">
                    <div>
                        <h2 className="text-xl font-semibold text-slate-900">Request Data Export</h2>
                        <p className="text-sm text-slate-500 mt-1">Generate a report to download</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6 overflow-y-auto flex-1">
                    {error && (
                        <div className="mb-6 p-4 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100">
                            {error}
                        </div>
                    )}

                    <form id="export-form" onSubmit={handleSubmit} className="space-y-5">
                        {/* Report Type */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
                                <FileText size={16} className="text-slate-400" />
                                Report Type
                            </label>
                            <select
                                value={reportType}
                                onChange={(e) => setReportType(e.target.value)}
                                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                            >
                                {REPORT_TYPES.map(rt => (
                                    <option key={rt.value} value={rt.value}>{rt.value}</option>
                                ))}
                            </select>

                            {/* Report description card */}
                            {selectedReportMeta && (
                                <div className="mt-2.5 flex items-start gap-2.5 p-3 bg-indigo-50 border border-indigo-100 rounded-xl">
                                    <Info size={14} className="text-indigo-500 shrink-0 mt-0.5" />
                                    <p className="text-xs text-indigo-700 leading-relaxed">{selectedReportMeta.description}</p>
                                </div>
                            )}
                        </div>

                        {/* Conditional Branch/Queue Selection for Customer Detailed Report */}
                        {reportType === "Customer Detailed Report" && (
                            <div className="space-y-4 p-4 bg-slate-50 rounded-xl border border-slate-100">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
                                        <Building size={16} className="text-slate-400" />
                                        Branch Selection
                                    </label>
                                    <div className="grid grid-cols-2 gap-3 mb-3">
                                        <button
                                            type="button"
                                            onClick={() => setBranchSelection('ALL')}
                                            className={`px-4 py-2 rounded-lg text-sm transition-colors ${branchSelection === 'ALL' ? 'bg-indigo-100 text-indigo-700 font-medium' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                                        >
                                            All Branches
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setBranchSelection('SPECIFIC')}
                                            className={`px-4 py-2 rounded-lg text-sm transition-colors ${branchSelection === 'SPECIFIC' ? 'bg-indigo-100 text-indigo-700 font-medium' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                                        >
                                            Specific Branch
                                        </button>
                                    </div>

                                    {branchSelection === 'SPECIFIC' && (
                                        <select
                                            value={selectedBranchId}
                                            onChange={(e) => setSelectedBranchId(e.target.value)}
                                            className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:border-indigo-500"
                                        >
                                            {branches.map(b => (
                                                <option key={b.id} value={b.id}>{b.name}</option>
                                            ))}
                                        </select>
                                    )}
                                </div>

                                {branchSelection === 'SPECIFIC' && selectedBranchId && (
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-2 mt-2">
                                            <List size={16} className="text-slate-400" />
                                            Queue Filter
                                        </label>
                                        <div className="grid grid-cols-2 gap-3 mb-3">
                                            <button
                                                type="button"
                                                onClick={() => setQueueSelection('ALL')}
                                                className={`px-4 py-2 rounded-lg text-sm transition-colors ${queueSelection === 'ALL' ? 'bg-indigo-100 text-indigo-700 font-medium' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                                            >
                                                All Queues
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setQueueSelection('SPECIFIC')}
                                                className={`px-4 py-2 rounded-lg text-sm transition-colors ${queueSelection === 'SPECIFIC' ? 'bg-indigo-100 text-indigo-700 font-medium' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                                            >
                                                Specific Queue
                                            </button>
                                        </div>

                                        {queueSelection === 'SPECIFIC' && (
                                            <select
                                                value={selectedQueueName}
                                                onChange={(e) => setSelectedQueueName(e.target.value)}
                                                className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:border-indigo-500"
                                            >
                                                {queues.length === 0 && <option value="">No queues found</option>}
                                                {queues.map(q => (
                                                    <option key={q} value={q}>{q}</option>
                                                ))}
                                            </select>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Date Range */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
                                <Calendar size={16} className="text-slate-400" />
                                Date Range
                            </label>
                            <select
                                value={dateRange}
                                onChange={(e) => setDateRange(e.target.value)}
                                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                            >
                                {DATE_RANGES.map(dr => (
                                    <option key={dr} value={dr}>{dr}</option>
                                ))}
                            </select>

                            {dateRange === "Custom Date Range" && (
                                <div className="mt-3 grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                                    <div>
                                        <label className="block text-xs font-medium text-slate-500 mb-1">Start Date</label>
                                        <input
                                            type="date"
                                            value={customStartDate}
                                            onChange={(e) => setCustomStartDate(e.target.value)}
                                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:border-indigo-500 transition-colors"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-slate-500 mb-1">End Date</label>
                                        <input
                                            type="date"
                                            value={customEndDate}
                                            onChange={(e) => setCustomEndDate(e.target.value)}
                                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:border-indigo-500 transition-colors"
                                            required
                                        />
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Format */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
                                <Filter size={16} className="text-slate-400" />
                                Format
                            </label>
                            <div className="grid grid-cols-3 gap-3">
                                {['CSV', 'EXCEL', 'PDF'].map(fmt => (
                                    <button
                                        type="button"
                                        key={fmt}
                                        onClick={() => setFormat(fmt)}
                                        disabled={reportType === "Customer Detailed Report" && fmt !== "EXCEL"}
                                        className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                                            format === fmt
                                                ? 'bg-indigo-50 text-indigo-700 border-2 border-indigo-200'
                                                : (reportType === "Customer Detailed Report" && fmt !== "EXCEL")
                                                    ? 'bg-slate-50 text-slate-400 border border-slate-200 cursor-not-allowed opacity-50'
                                                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                                        }`}
                                    >
                                        {fmt}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </form>
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-5 py-2.5 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
                        disabled={isLoading}
                    >
                        Cancel
                    </button>
                    <button
                        form="export-form"
                        type="submit"
                        disabled={isLoading}
                        className="px-5 py-2.5 text-sm font-medium text-white rounded-xl transition-colors flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isLoading ? (
                            <>
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                Processing...
                            </>
                        ) : 'Request Export'}
                    </button>
                </div>
            </div>
        </div>
    );
}
