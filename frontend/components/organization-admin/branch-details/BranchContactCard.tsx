"use client";
import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { MapPin, Phone, Mail, User, Pencil } from "lucide-react";
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
        <div className="bg-white rounded-xl border border-slate-200 flex flex-col relative overflow-hidden group transition-shadow hover:shadow-md hover:shadow-slate-200/50">
            <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center">
                <div className="flex items-center gap-2">
                    <MapPin size={16} strokeWidth={2} className="text-slate-400" />
                    <h3 className="font-semibold text-slate-900 text-sm">Contact Details</h3>
                </div>
                {!isEditing && (
                    <button 
                        onClick={() => setIsEditing(true)}
                        className="text-slate-400 hover:text-slate-900 transition-colors"
                        title="Edit Contact Details"
                    >
                        <Pencil size={14} strokeWidth={2} />
                    </button>
                )}
            </div>
            <div className="p-5 flex flex-col justify-center">
                {isEditing ? (
                    <div className="space-y-4">
                        <div className="flex gap-3">
                            <input 
                                type="text"
                                className="flex-1 px-3 py-1.5 text-sm rounded border border-slate-200 focus:outline-none focus:border-slate-400"
                                placeholder="Phone"
                                value={data.contact_phone || ''}
                                onChange={(e) => setData({...data, contact_phone: e.target.value})}
                            />
                        </div>
                        <textarea 
                            className="w-full px-3 py-1.5 text-sm rounded border border-slate-200 focus:outline-none focus:border-slate-400 resize-none h-20"
                            placeholder="Address"
                            value={data.address || ''}
                            onChange={(e) => setData({...data, address: e.target.value})}
                        />
                        <div className="flex justify-end gap-2 pt-2">
                            <button onClick={() => { setIsEditing(false); loadData(); }} className="px-3 py-1 text-xs font-medium text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 rounded">Cancel</button>
                            <button onClick={handleSave} className="px-3 py-1 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded">Save</button>
                        </div>
                    </div>
                ) : (
                    <dl className="space-y-4">
                        <div className="flex justify-between items-start gap-4">
                            <dt className="text-[13px] font-medium text-slate-500 w-16 shrink-0">Phone</dt>
                            <dd className="text-[13px] font-medium text-slate-900 text-right truncate">
                                {data.contact_phone || <span className="text-slate-400 italic font-normal">Not provided</span>}
                            </dd>
                        </div>
                        <div className="flex justify-between items-start gap-4">
                            <dt className="text-[13px] font-medium text-slate-500 w-16 shrink-0">Address</dt>
                            <dd className="text-[13px] font-medium text-slate-900 text-right max-h-20 overflow-y-auto">
                                {data.address || <span className="text-slate-400 italic font-normal">Not provided</span>}
                            </dd>
                        </div>
                    </dl>
                )}
            </div>
        </div>
    );
}
