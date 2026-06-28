"use client";

import React from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { api, ApiError } from "@/lib/api";
import { useDashBase } from "@/hooks/useDashBase";
import type { QueueResponse } from "@/types/api";
import ConfirmModal from "@/components/ConfirmModal";
import EditQueueModal from "@/components/EditQueueModal";
import { Hash, UserCheck, Activity, Trash2, Square, Clock, CalendarDays, Ticket, TicketSlash, Pause, Play, Pencil } from "lucide-react";
import { toast } from "sonner";

interface Props {
    queue: QueueResponse;
    onToggled: () => void;
}

const QueueCard = React.memo(function QueueCard({ queue, onToggled }: Props) {
    const { user } = useAuth();
    const dashBase = useDashBase();
    const isStaff = user?.role === "staff";
    const isGlobalOrOrgAdmin = user?.role === "super_admin" || user?.role === "organization_admin";

    const [isActive, setIsActive] = React.useState(queue.is_active);
    const [toggling, setToggling] = React.useState(false);
    const [pausing, setPausing] = React.useState(false);
    const [deleting, setDeleting] = React.useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = React.useState(false);
    const [showToggleConfirm, setShowToggleConfirm] = React.useState(false);
    const [showEdit, setShowEdit] = React.useState(false);
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

    const handlePauseToggle = async () => {
        const nextState = !queue.is_paused;
        setPausing(true);
        setErr(null);
        try {
            await api.toggleQueuePaused(queue.id, nextState);
            onToggled(); // Refresh data to get new is_paused state
            toast.warning(nextState ? `Queue "${queue.name}" is now paused` : `Queue "${queue.name}" is resumed`);
        } catch (e: unknown) {
            if (e instanceof ApiError) setErr(e.detail);
            else setErr("Failed to pause queue");
        } finally {
            setPausing(false);
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

    // Compute elapsed time for active queues (updates every minute)
    const [, setTick] = React.useState(0);
    React.useEffect(() => {
        if (!isActive) return;
        const interval = setInterval(() => setTick(t => t + 1), 60_000);
        return () => clearInterval(interval);
    }, [isActive]);

    const formatTime = (iso: string) => {
        const d = new Date(iso);
        return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    };

    const getElapsed = (iso: string) => {
        const diffMs = Date.now() - new Date(iso).getTime();
        const mins = Math.floor(diffMs / 60_000);
        const days = Math.floor(mins / (60 * 24));
        const hrs = Math.floor((mins % (60 * 24)) / 60);
        const remainMins = mins % 60;
        
        if (days > 0) return `${days}d ${hrs}h ${remainMins}m elapsed`;
        if (hrs > 0) return `${hrs}h ${remainMins}m elapsed`;
        return `${mins}m elapsed`;
    };

    return (
        <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-sm ring-1 ring-slate-900/5 flex flex-col justify-between w-full transition-all duration-200 hover:shadow-md relative overflow-hidden group">
            {/* Slanted Ticket Watermark */}
            {isActive ? (
                <Ticket className="absolute -bottom-10 -right-6 w-56 h-56 text-slate-900 opacity-[0.06] -rotate-45 pointer-events-none select-none z-0 transition-all duration-500 group-hover:scale-110 group-hover:-rotate-[40deg]" />
            ) : (
                <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="absolute -bottom-10 -right-6 w-56 h-56 text-slate-900 opacity-[0.08] -rotate-45 pointer-events-none select-none z-0 transition-all duration-500 group-hover:scale-110 group-hover:-rotate-[40deg]"
                >
                    {/* Left piece (clean lightning bolt tear) */}
                    <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h6 L12 14 L8 9 L12 5 H4a2 2 0 0 0-2 2Z" />
                    {/* Right piece (matching tear, detached by 3 units) */}
                    <path d="M22 9a3 3 0 0 0 0 6v2a2 2 0 0 1-2 2h-7 L15 14 L11 9 L15 5 h5a2 2 0 0 1 2 2Z" />
                </svg>
            )}

            {/* Foreground Content */}
            <div className="relative z-10 flex flex-col flex-1">
                <div className="flex items-start justify-between mb-1 gap-2">
                    <h3 className="text-sm font-bold text-slate-900 truncate capitalize flex-1">{queue.name}</h3>
                    <div className="flex items-center gap-1 shrink-0">
                        {!isGlobalOrOrgAdmin && (
                            <button
                                onClick={() => setShowEdit(true)}
                                className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                                aria-label="Edit Settings"
                            >
                                <Pencil className="w-3.5 h-3.5" />
                            </button>
                        )}
                        <span className={`ml-1 inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            queue.is_paused
                                ? "bg-amber-100 text-amber-800 border-amber-200/60"
                                : isActive
                                    ? "bg-sky-50 text-sky-700 border border-sky-200/60"
                                    : "bg-slate-50 text-slate-500 border border-slate-200/60"
                        }`}>
                            {queue.is_paused ? (
                                <>⏸ PAUSED</>
                            ) : isActive ? (
                                <><span className="w-1.5 h-1.5 rounded-full bg-sky-500 animate-pulse" />Active</>
                            ) : (
                                <>Inactive</>
                            )}
                        </span>
                    </div>
                </div>

                {/* Temporal Telemetry */}
                <div className="flex items-center gap-1.5 mt-1 mb-4 text-[10px] font-semibold text-slate-600 tracking-wide">
                    {isActive ? (
                        <>
                            <Clock className="w-3 h-3 text-indigo-500" />
                            <span>Started {formatTime(queue.created_at)}</span>
                            <span className="text-slate-400">•</span>
                            <span>{getElapsed(queue.created_at)}</span>
                        </>
                    ) : (
                        <>
                            <CalendarDays className="w-3 h-3 text-slate-500" />
                            <span>Closed at {formatTime(queue.created_at)}</span>
                        </>
                    )}
                </div>

                <div className="flex items-center justify-center">
                    <div className="flex flex-col items-center justify-center group">
                        <div className="w-24 h-24 rounded-full bg-slate-50/50 border border-slate-100 flex flex-col items-center justify-center relative shadow-inner ring-4 ring-indigo-50/40 mx-auto my-3 transition-transform duration-300 group-hover:scale-105">
                            {/* Prefix badge — top-center */}
                            <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 bg-white border border-slate-200 text-slate-800 font-bold text-[10px] px-1.5 py-0.5 rounded-full shadow-sm z-10">
                                {queue.prefix}
                            </div>
                            <span className="text-2xl font-black text-slate-900 tracking-tight">
                                {queue.total_served}
                            </span>
                        </div>
                        <div className="flex items-center gap-1.5 text-slate-600 mb-1">
                            <UserCheck className="w-3 h-3" />
                            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Served</p>
                        </div>
                    </div>
                </div>

                {err && <p className="mt-2 text-xs text-red-600">{err}</p>}
            </div>

            <div className="relative z-10 mt-3 border-t border-slate-100 pt-3 flex flex-col gap-0 w-full">
                <Link
                    href={`${dashBase}/queues/${queue.id}`}
                    className="w-full h-9 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-lg shadow-sm transition-all flex items-center justify-center gap-2"
                >
                    {isGlobalOrOrgAdmin ? "View Queue" : "Manage Queue"}
                </Link>
                {!isGlobalOrOrgAdmin && (
                    isActive ? (
                        <div className="mt-3 pt-3 border-t border-slate-100 flex items-center gap-2 w-full">
                            <button
                                onClick={handleToggle}
                                disabled={toggling || deleting || pausing}
                                className="h-9 flex-1 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 hover:border-slate-300 rounded-lg text-[11px] sm:text-xs font-semibold transition-all duration-150 flex items-center justify-center gap-1.5 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                            >
                                <Square className="w-3 h-3 fill-slate-400 text-slate-400 shrink-0" />
                                {toggling ? "..." : "End Queue"}
                            </button>
                            <button
                                onClick={handlePauseToggle}
                                disabled={toggling || deleting || pausing}
                                className={`h-9 flex-1 ${queue.is_paused ? 'bg-amber-50 hover:bg-amber-100 text-amber-700 border-amber-200' : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200 hover:border-slate-300'} border rounded-lg text-[11px] sm:text-xs font-semibold transition-all duration-150 flex items-center justify-center gap-1.5 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap`}
                            >
                                {queue.is_paused ? (
                                    <><Play className="w-3.5 h-3.5 shrink-0" /> Resume</>
                                ) : (
                                    <><Pause className="w-3.5 h-3.5 shrink-0" /> Take a Break</>
                                )}
                            </button>
                            {!isStaff && (
                                <button
                                    onClick={() => setShowDeleteConfirm(true)}
                                    disabled={toggling || deleting}
                                    className="h-9 w-9 shrink-0 flex items-center justify-center bg-white hover:bg-red-50 text-slate-400 hover:text-red-600 border border-slate-200 hover:border-red-200 rounded-lg transition-all duration-150 shadow-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                                    aria-label="Delete Queue"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            )}
                        </div>
                    ) : (
                        <div className="mt-3 pt-3 border-t border-slate-100 flex items-center gap-2 w-full">
                            <button
                                onClick={handleToggle}
                                disabled={toggling || deleting || pausing}
                                className="h-9 flex-1 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 hover:border-slate-300 rounded-lg text-xs font-semibold transition-all duration-150 flex items-center justify-center gap-1.5 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <Play className="w-3.5 h-3.5 shrink-0" />
                                {toggling ? "Starting..." : "Start Queue"}
                            </button>
                            {!isStaff && (
                                <button
                                    onClick={() => setShowDeleteConfirm(true)}
                                    disabled={toggling || deleting}
                                    className="h-9 w-9 shrink-0 flex items-center justify-center bg-white hover:bg-red-50 text-slate-400 hover:text-red-600 border border-slate-200 hover:border-red-200 rounded-lg transition-all duration-150 shadow-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                                    aria-label="Delete Queue"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            )}
                        </div>
                    )
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

            <EditQueueModal
                isOpen={showEdit}
                onClose={() => setShowEdit(false)}
                queue={queue}
                onUpdated={onToggled}
            />
        </div>
    );
});

export default QueueCard;
