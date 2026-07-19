"use client";
import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { MapPin, Phone, Mail, User, Pencil } from "lucide-react";
import { toast } from "sonner";

export default function BranchContactCard({ branchId, data, onUpdate }: { branchId: string, data: any, onUpdate?: () => void }) {
    const [isEditing, setIsEditing] = useState(false);
    const [editData, setEditData] = useState({ address: "", contact_phone: "" });

    useEffect(() => {
        if (data) {
            setEditData({ address: data.address || "", contact_phone: data.contact_phone || "" });
        }
    }, [data]);

    const handleSave = async () => {
        try {
            await api.updateBranchContactDetails(branchId, editData);
            toast.success("Contact details updated successfully");
            setIsEditing(false);
            if (onUpdate) onUpdate();
        } catch (error: any) {
            toast.error(error.message || "Failed to update contact details");
        }
    };

    if (!data) return <div className="h-40 bg-slate-100 animate-pulse rounded-2xl"></div>;

    return (
        <div className="bg-white rounded-xl border border-slate-200 shadow-[0_1px_2px_rgba(0,0,0,0.04)] p-6 flex flex-col justify-between group hover:border-slate-300 hover:shadow-[0_4px_12px_rgba(0,0,0,0.05)] transition-all">
            <div className="flex justify-between items-start mb-6">
                <div className="text-sm font-medium text-slate-500">Contact Details</div>
                <div className="flex items-center gap-2">
                    {!isEditing && (
                        <button onClick={() => setIsEditing(true)} className="p-2 bg-white rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-200">
                            <Pencil size={14} strokeWidth={2} />
                        </button>
                    )}
                    <div className="p-2 bg-slate-50 rounded-md text-slate-400 border border-slate-100 group-hover:bg-slate-100 group-hover:text-slate-600 transition-colors">
                        <MapPin size={16} strokeWidth={2} />
                    </div>
                </div>
            </div>
            
            <div className="flex flex-col mt-2">
                {isEditing ? (
                    <div className="space-y-3">
                        <input 
                            type="text"
                            className="w-full px-3 py-2 text-[13px] font-medium text-slate-900 bg-white rounded-md border border-slate-200 focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400 transition-shadow placeholder:text-slate-400"
                            placeholder="Phone number"
                            value={editData.contact_phone}
                            onChange={(e) => setEditData({...editData, contact_phone: e.target.value})}
                        />
                        <textarea 
                            className="w-full px-3 py-2 text-[13px] font-medium text-slate-900 bg-white rounded-md border border-slate-200 focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400 transition-shadow resize-none h-20 placeholder:text-slate-400"
                            placeholder="Full address"
                            value={editData.address}
                            onChange={(e) => setEditData({...editData, address: e.target.value})}
                        />
                        <div className="flex justify-end gap-2 pt-1">
                            <button onClick={() => { setIsEditing(false); setEditData({ address: data.address || "", contact_phone: data.contact_phone || "" }); }} className="px-3 py-1.5 text-[12px] font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-md transition-colors">Cancel</button>
                            <button onClick={handleSave} className="px-3 py-1.5 text-[12px] font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-md shadow-sm transition-colors">Save</button>
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col gap-5">
                        <div className="flex flex-col gap-1.5">
                            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Phone</span>
                            <span className="text-[14px] font-semibold text-slate-900">
                                {data.contact_phone || <span className="text-slate-400 italic font-medium">Not provided</span>}
                            </span>
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Address</span>
                            <span className="text-[14px] font-semibold text-slate-900 leading-snug">
                                {data.address || <span className="text-slate-400 italic font-medium">Not provided</span>}
                            </span>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
