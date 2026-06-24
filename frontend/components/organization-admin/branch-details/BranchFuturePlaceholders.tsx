"use client";
export default function BranchFuturePlaceholders() {
    return (
        <div className="bg-slate-50 border border-dashed border-slate-300 rounded-xl p-6 text-center text-slate-500">
            <h3 className="font-semibold text-slate-700 mb-2">Future Enterprise Additions</h3>
            <p className="text-sm mb-4">Space reserved for Announcements, Data Exports, Backup Status, Branch Notes, Documents, and Attachments.</p>
            <div className="flex flex-wrap justify-center gap-2">
                <span className="bg-white border border-slate-200 px-3 py-1 rounded text-xs">Announcements</span>
                <span className="bg-white border border-slate-200 px-3 py-1 rounded text-xs">Exports</span>
                <span className="bg-white border border-slate-200 px-3 py-1 rounded text-xs">Backups</span>
            </div>
        </div>
    );
}
