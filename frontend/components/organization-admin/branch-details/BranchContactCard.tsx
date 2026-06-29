"use client";
import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { MapPin, Phone, Mail, User } from "lucide-react";
import { toast } from "sonner";

export default function BranchContactCard({ branchId }: { branchId: string }) {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);

    const loadData = () => {
        setLoading(true);
        api.getBranchContactDetails(branchId).then(setData).finally(() => setLoading(false));
    };

    useEffect(() => { loadData(); }, [branchId]);

    const handleSave = async () => {
        try {
            await api.updateBranchContactDetails(branchId, data);
            toast.success("Contact details updated");
            setIsEditing(false);
        } catch (e: any) {
            toast.error(e.message || "Failed to update");
        }
    };

    if (loading) return <div className="h-40 bg-slate-100 animate-pulse rounded-2xl"></div>;
    if (!data) return null;

    return (
        <div className="bg-white rounded-2xl shadow-sm shadow-slate-200/50 border border-slate-200 overflow-hidden">
            <div className="p-5 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                <div className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                    <span className="font-semibold text-lg tracking-tight text-slate-900">Contact Information</span>
                </div>
                {isEditing ? (
                    <div className="space-x-2">
                        <button onClick={() => {setIsEditing(false); loadData();}} className="text-xs px-3 py-1.5 font-medium hover:bg-slate-200 bg-slate-100 text-slate-700 rounded-md transition-colors">Cancel</button>
                        <button onClick={handleSave} className="text-xs px-3 py-1.5 font-medium bg-indigo-600 hover:bg-indigo-700 text-white rounded-md shadow-sm shadow-indigo-200 transition-colors">Save</button>
                    </div>
                ) : (
                    <button onClick={() => setIsEditing(true)} className="p-1.5 hover:bg-slate-200 bg-slate-100 text-slate-500 rounded-md transition-colors" title="Edit Contact Info">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                    </button>
                )}
            </div>
            <div className="p-5 space-y-5 text-sm">
                <div className="flex gap-3">
                    <MapPin size={18} strokeWidth={1.5} className="text-slate-400 mt-0.5 shrink-0" />
                    {isEditing ? <textarea value={data.address || ''} onChange={e => setData({...data, address: e.target.value})} className="border border-slate-200 rounded-lg px-3 py-2 w-full outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all text-slate-900" rows={2}/> : <span className="text-slate-900 mt-0.5 leading-relaxed">{data.address || 'No address set'}</span>}
                </div>
                <div className="flex gap-3 items-center">
                    <Phone size={18} strokeWidth={1.5} className="text-slate-400 shrink-0" />
                    {isEditing ? <input value={data.contact_phone || ''} onChange={e => setData({...data, contact_phone: e.target.value})} className="border border-slate-200 rounded-lg px-3 py-2 w-full outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all text-slate-900" /> : <span className="text-slate-900">{data.contact_phone || 'No phone set'}</span>}
                </div>
            </div>
        </div>
    );
}
