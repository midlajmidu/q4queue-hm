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

    if (loading) return <div className="h-40 bg-slate-100 animate-pulse rounded-xl"></div>;
    if (!data) return null;

    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                <h2 className="font-semibold text-slate-900">Branch Contact Information</h2>
                {isEditing ? (
                    <div className="space-x-2">
                        <button onClick={() => {setIsEditing(false); loadData();}} className="text-xs px-2 py-1 bg-slate-200 rounded">Cancel</button>
                        <button onClick={handleSave} className="text-xs px-2 py-1 bg-indigo-600 text-white rounded">Save</button>
                    </div>
                ) : (
                    <button onClick={() => setIsEditing(true)} className="text-xs px-2 py-1 bg-slate-200 rounded">Edit</button>
                )}
            </div>
            <div className="p-4 space-y-4 text-sm">
                <div className="flex gap-2">
                    <MapPin size={16} className="text-slate-400 mt-1" />
                    {isEditing ? <textarea value={data.address || ''} onChange={e => setData({...data, address: e.target.value})} className="border rounded px-2 w-full" rows={2}/> : <span>{data.address || 'No address set'}</span>}
                </div>
                <div className="flex gap-2">
                    <Phone size={16} className="text-slate-400" />
                    {isEditing ? <input value={data.contact_phone || ''} onChange={e => setData({...data, contact_phone: e.target.value})} className="border rounded px-2 w-full" /> : <span>{data.contact_phone || 'No phone set'}</span>}
                </div>
            </div>
        </div>
    );
}
