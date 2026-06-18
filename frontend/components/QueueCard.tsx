"use client";

import React from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { api, ApiError } from "@/lib/api";
import type { QueueResponse } from "@/types/api";
import ConfirmModal from "@/components/ConfirmModal";

interface Props {
    queue: QueueResponse;
    onToggled: () => void;
}

const QueueCard = React.memo(function QueueCard({ queue, onToggled }: Props) {
    const { user } = useAuth();
    const isStaff = user?.role === "staff";
    const dashBase = user?.org_slug ? `/${user.org_slug}/dashboard` : "/dashboard";

    const [isActive, setIsActive] = React.useState(queue.is_active);
    const [toggling, setToggling] = React.useState(false);
    const [deleting, setDeleting] = React.useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = React.useState(false);
    const [showToggleConfirm, setShowToggleConfirm] = React.useState(false);
    const [err, setErr] = React.useState<string | null>(null);

    // Sync local state with prop when it changes (e.g. from parent re-fetch)
    React.useEffect(() => {
        setIsActive(queue.is_active);
    }, [queue.is_active]);

    const handleToggle = async () => {
        if (isActive && !showToggleConfirm) {
            setShowToggleConfirm(true);
            return;
        }

        const nextState = !isActive;
        setIsActive(nextState); // Optimistic Update
        setToggling(true);
        setErr(null);
        try {
            await api.toggleQueue(queue.id, nextState);
            onToggled();
            setShowToggleConfirm(false);
        } catch (e: unknown) {
            setIsActive(!nextState); // Rollback
            if (e instanceof ApiError) setErr(e.detail);
            else setErr("Failed to toggle queue");
        } finally {
            setToggling(false);
        }
    };

    const handleDelete = async () => {
        setDeleting(true);
        setErr(null);
        try {
            await api.deleteQueue(queue.id);
            onToggled(); // Refresh the list
        } catch (e: unknown) {
            if (e instanceof ApiError) setErr(e.detail);
            else setErr("Failed to delete queue");
            setShowDeleteConfirm(false);
        } finally {
            setDeleting(false);
        }
    };

    return (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-100 shadow-sm ring-1 ring-slate-900/5 dark:border-white/10 hover:shadow-md transition-shadow overflow-hidden w-full max-w-[400px]">
            <div className="p-5">
                <div className="flex items-start justify-between mb-3">
                    <h3 className="text-base font-semibold text-slate-900 dark:text-white truncate capitalize">{queue.name}</h3>
                    <span className={`shrink-0 ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full font-medium ${isActive ? "bg-emerald-50 text-emerald-700 border border-emerald-100/80" : "bg-slate-50 text-slate-500 border border-slate-200/60"}`}>
                        {isActive ? "Active" : "Inactive"}
                    </span>
                </div>

                <div className="grid grid-cols-3 text-center mt-3 mb-1 bg-transparent">
                    <div className="flex flex-col items-center justify-center py-1">
                        <p className="text-[10px] font-semibold text-slate-400 tracking-wider uppercase mb-1">Prefix</p>
                        <p className="text-xl font-bold text-slate-900 dark:text-white">{queue.prefix}</p>
                    </div>
                    <div className="flex flex-col items-center justify-center py-1">
                        <p className="text-[10px] font-semibold text-slate-400 tracking-wider uppercase mb-1">Serving</p>
                        <p className="text-xl font-bold text-slate-900 dark:text-white">{queue.current_token_number}</p>
                    </div>
                    <div className="flex flex-col items-center justify-center py-1">
                        <p className="text-[10px] font-semibold text-slate-400 tracking-wider uppercase mb-1">Status</p>
                        <p className="text-xl font-bold text-slate-900 dark:text-white">{isActive ? "Open" : "Closed"}</p>
                    </div>
                </div>

                {err && <p className="mt-2 text-xs text-red-600">{err}</p>}
            </div>

            <div className="border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 px-5 py-3 flex items-center justify-between gap-2">
                <Link
                    href={`${dashBase}/queues/${queue.id}`}
                    className="flex-1 flex justify-center items-center border border-slate-100 shadow-sm ring-1 ring-slate-900/5 bg-white hover:bg-slate-50 text-slate-700 font-medium text-sm rounded-lg py-1.5 px-4 transition-all"
                >
                    Manage
                </Link>
                {!isStaff && (
                    <>
                        <button
                            onClick={handleToggle}
                            disabled={toggling || deleting}
                            className="flex-1 flex justify-center items-center text-slate-500 hover:text-slate-800 text-sm font-medium transition-colors px-2 disabled:opacity-50"
                        >
                            {toggling ? "..." : isActive ? "End Queue" : "Start Queue"}
                        </button>
                        <button
                            onClick={() => setShowDeleteConfirm(true)}
                            disabled={toggling || deleting}
                            className="shrink-0 flex items-center justify-center text-slate-400 hover:text-red-600 hover:bg-red-50 p-2 rounded-md transition-colors disabled:opacity-50"
                            aria-label="Delete Queue"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                        </button>
                    </>
                )}
            </div>

            <ConfirmModal
                isOpen={showToggleConfirm}
                title="End Queue Session?"
                message={`Are you sure you want to end the session for "${queue.name}"? New customers won't be able to join until you start it again.`}
                confirmLabel="End Queue"
                confirmVariant="warning"
                onConfirm={handleToggle}
                onCancel={() => setShowToggleConfirm(false)}
                isLoading={toggling}
            />

            <ConfirmModal
                isOpen={showDeleteConfirm}
                title="Delete Queue"
                message={`Are you sure you want to permanently delete the queue "${queue.name}"? All associated tokens and data will be lost forever.`}
                confirmLabel="Delete"
                confirmVariant="danger"
                onConfirm={handleDelete}
                onCancel={() => setShowDeleteConfirm(false)}
                isLoading={deleting}
            />
        </div>
    );
});

export default QueueCard;
