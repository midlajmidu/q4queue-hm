'use client';

import React, { useEffect, useState } from 'react';
import { DownloadCloud, Plus, FileText, CheckCircle2, Clock, AlertCircle, Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { getExports, downloadExport } from '@/lib/api';
import RequestExportModal from '@/components/organization-admin/exports/RequestExportModal';
import { getToken } from '@/lib/auth';

export default function ExportsPage() {
    const token = getToken();
    const [jobs, setJobs] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [downloadingId, setDownloadingId] = useState<string | null>(null);

    const fetchJobs = async () => {
        try {
            if (!token) return;
            const data = await getExports(token);
            setJobs(data);
        } catch (err) {
            console.error('Failed to fetch exports', err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchJobs();
        // Poll every 10 seconds to update statuses
        const interval = setInterval(fetchJobs, 10000);
        return () => clearInterval(interval);
    }, [token]);

    const handleDownload = async (job: any) => {
        setDownloadingId(job.id);
        try {
            await downloadExport(job.id, job.file_path ? job.file_path.split('/').pop() : 'export', token!);
        } catch (error) {
            alert('Failed to download file.');
        } finally {
            setDownloadingId(null);
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'completed': return <CheckCircle2 size={16} className="text-emerald-500" />;
            case 'processing': return <Loader2 size={16} className="text-blue-500 animate-spin" />;
            case 'failed': return <AlertCircle size={16} className="text-red-500" />;
            default: return <Clock size={16} className="text-amber-500" />;
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'completed': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
            case 'processing': return 'bg-blue-50 text-blue-700 border-blue-200';
            case 'failed': return 'bg-red-50 text-red-700 border-red-200';
            default: return 'bg-amber-50 text-amber-700 border-amber-200';
        }
    };

    return (
        <div className="p-8 max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                        <DownloadCloud className="text-indigo-600" />
                        Download Center
                    </h1>
                    <p className="text-slate-500 mt-1">Request and download enterprise data reports.</p>
                </div>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-xl hover:bg-indigo-700 transition-all shadow-sm shadow-indigo-200"
                >
                    <Plus size={18} />
                    New Export Request
                </button>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[800px]">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase text-slate-500 font-semibold">
                                <th className="p-4">Report Details</th>
                                <th className="p-4">Filters</th>
                                <th className="p-4">Format</th>
                                <th className="p-4">Status</th>
                                <th className="p-4">Requested At</th>
                                <th className="p-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {isLoading ? (
                                <tr>
                                    <td colSpan={6} className="p-8 text-center text-slate-500">
                                        Loading exports...
                                    </td>
                                </tr>
                            ) : jobs.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="p-12 text-center">
                                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-50 text-slate-400 mb-4">
                                            <FileText size={32} />
                                        </div>
                                        <h3 className="text-base font-medium text-slate-900 mb-1">No export history</h3>
                                        <p className="text-sm text-slate-500">Request your first data export to see it here.</p>
                                    </td>
                                </tr>
                            ) : (
                                jobs.map((job) => (
                                    <tr key={job.id} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="p-4">
                                            <div className="font-medium text-slate-900 flex items-center gap-2">
                                                <FileText size={16} className="text-slate-400" />
                                                {job.report_type}
                                            </div>
                                            <div className="text-xs text-slate-500 mt-1 font-mono">{job.id.split('-')[0]}...</div>
                                        </td>
                                        <td className="p-4">
                                            <div className="text-sm text-slate-600">
                                                {job.filters?.date_range || 'All Time'}
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <span className="inline-flex px-2 py-1 bg-slate-100 text-slate-700 text-xs font-medium rounded-lg">
                                                {job.format}
                                            </span>
                                        </td>
                                        <td className="p-4">
                                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium border rounded-full ${getStatusBadge(job.status)}`}>
                                                {getStatusIcon(job.status)}
                                                <span className="capitalize">{job.status}</span>
                                            </span>
                                            {job.status === 'failed' && job.error_message && (
                                                <div className="text-[10px] text-red-500 mt-1 max-w-xs truncate" title={job.error_message}>
                                                    {job.error_message}
                                                </div>
                                            )}
                                        </td>
                                        <td className="p-4 text-sm text-slate-500">
                                            {new Date(job.created_at).toLocaleString()}
                                        </td>
                                        <td className="p-4 text-right">
                                            <button
                                                onClick={() => handleDownload(job)}
                                                disabled={job.status !== 'completed' || downloadingId === job.id}
                                                className={`inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                                                    job.status === 'completed'
                                                        ? 'text-indigo-600 bg-indigo-50 hover:bg-indigo-100'
                                                        : 'text-slate-400 bg-slate-50 cursor-not-allowed'
                                                }`}
                                            >
                                                {downloadingId === job.id ? (
                                                    <Loader2 size={16} className="animate-spin" />
                                                ) : (
                                                    <DownloadCloud size={16} />
                                                )}
                                                Download
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <RequestExportModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onExportRequested={fetchJobs}
            />
        </div>
    );
}
