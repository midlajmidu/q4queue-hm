"use client";
import { BarChart3 } from "lucide-react";

export default function BranchFuturePlaceholders() {
    return (
        <div className="bg-slate-50 rounded-xl border border-dashed border-slate-200 p-8 flex flex-col items-center justify-center text-center relative overflow-hidden">
            <div className="w-10 h-10 rounded-full bg-white border border-slate-100 flex items-center justify-center mb-3 shadow-sm">
                <BarChart3 size={20} strokeWidth={1.5} className="text-slate-400" />
            </div>
            <h3 className="font-semibold text-slate-900 text-[15px] mb-1">Advanced Analytics</h3>
            <p className="text-sm text-slate-500 max-w-[250px] mx-auto mb-4 leading-relaxed">
                Historical trends, peak hour predictions, and detailed staff performance reports.
            </p>
            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold tracking-widest uppercase bg-slate-100 text-slate-500">
                Coming Soon
            </span>
        </div>
    );
}
