"use client";

import React, { useState, useEffect, useMemo } from "react";
import { api, ApiError } from "@/lib/api";
import type { ServingToken, WaitingToken } from "@/types/api";
import {
    Users,
    Clock,
    AlertCircle,
    UserPlus,
    X,
    LogOut,
    Check,
    Phone,
    Timer,
    LayoutGrid,
} from "lucide-react";
import { toast } from "sonner";

interface Props {
    queueId: string;
    maxCapacity: number;
    zoneDurationMins?: number | null;
    allServingTokens: ServingToken[];
    prefix: string;
    onUpdate: () => void;
    isPaused?: boolean;
    isReadOnly?: boolean;
    waitingTokens?: WaitingToken[];
}

function getElapsedMinutes(isoString?: string | null): number {
    if (!isoString) return 0;
    const diffMs = Date.now() - new Date(isoString).getTime();
    return Math.max(0, Math.floor(diffMs / 60000));
}

export default function ZoneArenaGrid({
    queueId,
    maxCapacity = 15,
    zoneDurationMins = null,
    allServingTokens = [],
    prefix = "Z",
    onUpdate,
    isPaused = false,
    isReadOnly = false,
    waitingTokens = [],
}: Props) {
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [showBatchModal, setShowBatchModal] = useState(false);
    const [selectedTokens, setSelectedTokens] = useState<number[]>([]);
    const [, setTick] = useState(0);

    // Update timers every 30 seconds
    useEffect(() => {
        const timer = setInterval(() => setTick((t) => t + 1), 30000);
        return () => clearInterval(timer);
    }, []);

    const effectiveMax = maxCapacity > 0 ? maxCapacity : 15;
    const currentPax = useMemo(() => {
        return allServingTokens.reduce((sum, t) => sum + (Number(t.pax_count) || 1), 0);
    }, [allServingTokens]);
    const currentTokenCount = allServingTokens.length;
    const availableSlots = Math.max(0, effectiveMax - currentPax);
    const occupancyPercent = Math.min(100, Math.round((currentPax / effectiveMax) * 100));

    const nextWaitingToken = waitingTokens[0];
    const nextWaitingPax = Number(nextWaitingToken?.pax_count) || 1;
    const nextExceedsCapacity = Boolean(nextWaitingToken && nextWaitingPax > availableSlots);

    const selectedPaxCount = useMemo(() => {
        return selectedTokens.reduce((sum, tokenNum) => {
            const wt = waitingTokens.find((w) => w.token_number === tokenNum);
            return sum + (Number(wt?.pax_count) || 1);
        }, 0);
    }, [selectedTokens, waitingTokens]);

    // Handle single token exit / complete
    const handleExit = async (token: ServingToken) => {
        setActionLoading(`exit_${token.id}`);
        const pax = Number(token.pax_count) || 1;
        try {
            await api.completeToken(token.id);
            toast.success(`Token ${prefix}${token.token_number} (${token.customer_name || "Customer"}) exited. ${pax} ${pax === 1 ? "slot" : "slots"} freed!`);
            onUpdate();
        } catch (err: unknown) {
            const msg = err instanceof ApiError ? err.detail : "Failed to exit customer.";
            toast.error(msg);
        } finally {
            setActionLoading(null);
        }
    };

    // Handle admit next waiting customer
    const handleAdmitNext = async () => {
        if (!nextWaitingToken) {
            toast.info("No waiting customers in the queue to admit.");
            return;
        }
        if (availableSlots <= 0) {
            toast.error("Zone is currently at maximum capacity. Please exit an active customer first.");
            return;
        }
        if (nextWaitingPax > availableSlots) {
            toast.error(`Cannot admit #${prefix}${nextWaitingToken.token_number}: Party has ${nextWaitingPax} players, but only ${availableSlots} slots are available.`);
            return;
        }

        setActionLoading("admit_next");
        try {
            await api.callNext(queueId, "done");
            toast.success(`Next party (${nextWaitingPax} ${nextWaitingPax === 1 ? "player" : "players"}) admitted into the zone!`);
            onUpdate();
        } catch (err: unknown) {
            const msg = err instanceof ApiError ? err.detail : "Failed to admit next customer.";
            toast.error(msg);
        } finally {
            setActionLoading(null);
        }
    };

    // Handle batch admit
    const handleBatchAdmit = async () => {
        if (selectedTokens.length === 0) return;
        if (selectedPaxCount > availableSlots) {
            toast.error(`Cannot admit selected tokens: Total ${selectedPaxCount} players exceeds ${availableSlots} available slots.`);
            return;
        }

        setActionLoading("batch_admit");
        try {
            await api.admitBatch(queueId, selectedTokens);
            toast.success(`Successfully admitted ${selectedPaxCount} players across ${selectedTokens.length} tokens into the zone!`);
            setSelectedTokens([]);
            setShowBatchModal(false);
            onUpdate();
        } catch (err: unknown) {
            const msg = err instanceof ApiError ? err.detail : "Failed to admit selected customers.";
            toast.error(msg);
        } finally {
            setActionLoading(null);
        }
    };

    const toggleTokenSelection = (num: number) => {
        setSelectedTokens((prev) =>
            prev.includes(num) ? prev.filter((n) => n !== num) : [...prev, num]
        );
    };

    return (
        <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6">
            {/* ── Zone Header & Live Capacity Gauge ── */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-white/10 rounded-2xl p-5 sm:p-6 shadow-xs">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
                    {/* Title & Occupancy Info */}
                    <div className="flex items-start gap-3.5">
                        <div className="w-11 h-11 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 border border-indigo-200/60 dark:border-indigo-800/40">
                            <LayoutGrid className="w-5 h-5" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2.5 flex-wrap">
                                <h2 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">
                                    Zone Occupancy
                                </h2>
                                <span
                                    className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold tracking-wide ${
                                        currentPax >= effectiveMax
                                            ? "bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800"
                                            : currentPax > 0
                                            ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                                            : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-white/10"
                                    }`}
                                >
                                    <span
                                        className={`w-1.5 h-1.5 rounded-full ${
                                            currentPax >= effectiveMax
                                                ? "bg-rose-500 animate-ping"
                                                : currentPax > 0
                                                ? "bg-emerald-500 animate-pulse"
                                                : "bg-slate-400"
                                        }`}
                                    />
                                    {currentPax >= effectiveMax
                                        ? "Full Capacity"
                                        : `${availableSlots} ${availableSlots === 1 ? "Slot" : "Slots"} Available`}
                                </span>
                            </div>

                            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-1">
                                {zoneDurationMins
                                    ? `Session Duration: ${zoneDurationMins} mins per round • Max Capacity: ${effectiveMax} players`
                                    : `Open Drop-in Zone • Max Capacity: ${effectiveMax} players inside simultaneously`}
                            </p>
                        </div>
                    </div>

                    {/* Quick Admit Actions */}
                    {!isReadOnly && !isPaused && (
                        <div className="flex items-center gap-2.5 shrink-0">
                            {waitingTokens.length > 0 && availableSlots > 1 && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setSelectedTokens([]);
                                        setShowBatchModal(true);
                                    }}
                                    className="px-3.5 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/60 transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer"
                                >
                                    <Users className="w-3.5 h-3.5 text-slate-500" />
                                    <span>Admit Group</span>
                                </button>
                            )}

                            <button
                                type="button"
                                onClick={handleAdmitNext}
                                disabled={actionLoading === "admit_next" || availableSlots <= 0 || waitingTokens.length === 0 || nextExceedsCapacity}
                                title={nextExceedsCapacity ? `Next party has ${nextWaitingPax} players, but only ${availableSlots} slots are free` : undefined}
                                className="px-4 py-2 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                            >
                                <UserPlus className="w-4 h-4" />
                                <span>
                                    {actionLoading === "admit_next"
                                        ? "Admitting..."
                                        : nextExceedsCapacity
                                        ? `Admit Next (${nextWaitingPax}p - Exceeds)`
                                        : nextWaitingToken && nextWaitingPax > 1
                                        ? `Admit Next (${nextWaitingPax}p)`
                                        : "Admit Next"}
                                </span>
                            </button>
                        </div>
                    )}
                </div>

                {/* Progress Bar & Counters */}
                <div className="mt-5 pt-4 border-t border-slate-100 dark:border-white/5 space-y-2">
                    <div className="flex items-center justify-between text-xs font-semibold">
                        <span className="text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                            <Users className="w-3.5 h-3.5 text-indigo-500" />
                            <span>Currently Inside:</span>
                            <span className="text-indigo-600 dark:text-indigo-400 font-bold text-sm">
                                {currentPax}
                            </span>
                            <span className="text-slate-400 font-normal">/ {effectiveMax} players</span>
                            {currentTokenCount > 0 && (
                                <span className="text-[11px] text-slate-400 font-normal">
                                    ({currentTokenCount} {currentTokenCount === 1 ? "group" : "groups"})
                                </span>
                            )}
                        </span>
                        <span className="text-slate-500 dark:text-slate-400 font-mono text-[11px]">
                            {occupancyPercent}% Occupancy
                        </span>
                    </div>

                    <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden p-0.5 border border-slate-200/50 dark:border-white/5">
                        <div
                            className={`h-full rounded-full transition-all duration-500 ${
                                occupancyPercent >= 100
                                    ? "bg-rose-500"
                                    : occupancyPercent >= 80
                                    ? "bg-amber-500"
                                    : "bg-indigo-600"
                            }`}
                            style={{ width: `${occupancyPercent}%` }}
                        />
                    </div>
                </div>
            </div>

            {/* ── Active Players / Tokens Inside Zone ── */}
            <div>
                <div className="flex items-center justify-between mb-3 px-1">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                        <span>Active Inside ({currentPax} Players{currentTokenCount > 0 ? ` • ${currentTokenCount} Groups` : ""})</span>
                    </h3>
                    <span className="text-[11px] font-medium text-slate-400">
                        Click &ldquo;Exit&rdquo; to complete session and free capacity
                    </span>
                </div>

                {currentTokenCount === 0 ? (
                    <div className="bg-white dark:bg-slate-900 border border-dashed border-slate-200 dark:border-white/10 rounded-2xl p-12 text-center flex flex-col items-center justify-center">
                        <div className="w-14 h-14 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-3.5">
                            <Users className="w-7 h-7 opacity-80" />
                        </div>
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white">Zone is Currently Empty</h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mt-1 mb-4">
                            All {effectiveMax} slots are open. Admit customers waiting in line to begin their session.
                        </p>
                        {!isReadOnly && !isPaused && waitingTokens.length > 0 && (
                            <button
                                type="button"
                                onClick={handleAdmitNext}
                                disabled={actionLoading === "admit_next" || nextExceedsCapacity}
                                className="px-4 py-2 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <UserPlus className="w-4 h-4" />
                                <span>
                                    {nextExceedsCapacity
                                        ? `Cannot Admit #${prefix}${waitingTokens[0]?.token_number} (${nextWaitingPax}p exceeds capacity)`
                                        : nextWaitingPax > 1
                                        ? `Admit First Group (#${prefix}${waitingTokens[0]?.token_number} • ${nextWaitingPax} players)`
                                        : `Admit First Player (#${prefix}${waitingTokens[0]?.token_number})`}
                                </span>
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                        {allServingTokens.map((token) => {
                            const elapsed = getElapsedMinutes(token.served_at || (token as any).created_at);
                            const hasDuration = !!zoneDurationMins && zoneDurationMins > 0;
                            const remaining = hasDuration ? zoneDurationMins - elapsed : null;
                            const isTimeUp = remaining !== null && remaining <= 0;

                            return (
                                <div
                                    key={token.id}
                                    className={`bg-white dark:bg-slate-900 rounded-xl border transition-all p-4 flex flex-col justify-between shadow-2xs relative overflow-hidden group ${
                                        isTimeUp
                                            ? "border-rose-300 dark:border-rose-800/80 bg-rose-50/20 dark:bg-rose-950/10 ring-1 ring-rose-500/20"
                                            : "border-slate-200/80 dark:border-white/10 hover:border-slate-300 dark:hover:border-slate-700"
                                    }`}
                                >
                                    {/* Top row: Token badge + Status */}
                                    <div>
                                        <div className="flex items-start justify-between gap-2 mb-3">
                                            <div className="flex items-center gap-2">
                                                <span className="px-2.5 py-1 rounded-lg bg-indigo-600 text-white font-bold text-xs tracking-tight">
                                                    {prefix}{token.token_number}
                                                </span>
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                                                    <Users className="w-3 h-3 text-slate-400" />
                                                    {token.pax_count && token.pax_count > 1
                                                        ? `${token.pax_count} Players`
                                                        : "1 Player"}
                                                </span>
                                            </div>

                                            {/* Time Status Tag */}
                                            {hasDuration && (
                                                <span
                                                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold ${
                                                        isTimeUp
                                                            ? "bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 border border-rose-300 animate-pulse"
                                                            : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-white/10"
                                                    }`}
                                                >
                                                    <Timer className="w-3 h-3 text-slate-500" />
                                                    {isTimeUp
                                                        ? `Overdue by ${Math.abs(remaining!)}m`
                                                        : `${remaining}m left`}
                                                </span>
                                            )}
                                        </div>

                                        {/* Customer Details */}
                                        <div className="space-y-0.5">
                                            <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                                                {token.customer_name || `Customer #${prefix}${token.token_number}`}
                                            </h4>
                                            {token.customer_phone && (
                                                <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1 font-mono">
                                                    <Phone className="w-2.5 h-2.5 text-slate-400" />
                                                    <span>{token.customer_phone}</span>
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    {/* Bottom row: Elapsed timer + Exit Button */}
                                    <div className="pt-3 mt-3 border-t border-slate-100 dark:border-white/5 flex items-center justify-between gap-2">
                                        <div className="flex items-center gap-1 text-[11px] font-medium text-slate-500 dark:text-slate-400">
                                            <Clock className="w-3 h-3 text-slate-400" />
                                            <span>Active: {elapsed}m</span>
                                        </div>

                                        {!isReadOnly && !isPaused && (
                                            <button
                                                type="button"
                                                onClick={() => handleExit(token)}
                                                disabled={actionLoading === `exit_${token.id}`}
                                                className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                                                    isTimeUp
                                                        ? "bg-rose-600 hover:bg-rose-700 text-white shadow-2xs"
                                                        : "bg-slate-100 hover:bg-rose-50 hover:text-rose-700 dark:bg-slate-800 dark:hover:bg-rose-950/40 dark:hover:text-rose-300 text-slate-700 dark:text-slate-300"
                                                }`}
                                            >
                                                <LogOut className="w-3 h-3" />
                                                <span>
                                                    {actionLoading === `exit_${token.id}` ? "Exiting..." : "Exit"}
                                                </span>
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* ── Batch Admit Modal ── */}
            {showBatchModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in">
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-2xl max-w-lg w-full p-6 shadow-xl space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                                <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-800/40">
                                    <Users className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                                        Admit Group to Zone
                                    </h3>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">
                                        {availableSlots} available {availableSlots === 1 ? "slot" : "slots"} in the zone
                                    </p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowBatchModal(false)}
                                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg cursor-pointer"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="max-h-64 overflow-y-auto space-y-2 pr-1 divide-y divide-slate-100 dark:divide-slate-800">
                            {waitingTokens.map((wt) => {
                                const isSelected = selectedTokens.includes(wt.token_number);
                                return (
                                    <div
                                        key={wt.id}
                                        onClick={() => toggleTokenSelection(wt.token_number)}
                                        className={`flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all border ${
                                            isSelected
                                                ? "bg-indigo-50/70 dark:bg-indigo-950/30 border-indigo-200 dark:border-indigo-800"
                                                : "bg-white dark:bg-slate-800/50 border-slate-200/80 dark:border-white/5 hover:bg-slate-50 dark:hover:bg-slate-800"
                                        }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div
                                                className={`w-5 h-5 rounded-md flex items-center justify-center border transition-all ${
                                                    isSelected
                                                        ? "bg-indigo-600 border-indigo-600 text-white"
                                                        : "border-slate-300 dark:border-slate-600"
                                                }`}
                                            >
                                                {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <span className="font-mono font-bold text-xs text-slate-900 dark:text-white">
                                                        #{prefix}{wt.token_number}
                                                    </span>
                                                    <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                                                        {wt.customer_name || "Customer"}
                                                    </span>
                                                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                                                        <Users className="w-2.5 h-2.5 text-slate-400" />
                                                        {wt.pax_count && wt.pax_count > 1 ? `${wt.pax_count} players` : "1 player"}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Capacity warning if selected pax exceeds available slots */}
                        {selectedPaxCount > availableSlots && (
                            <div className="px-3.5 py-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/80 text-rose-700 dark:text-rose-300 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
                                <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                                <span>
                                    Selected <strong>{selectedPaxCount} players</strong> exceeds <strong>{availableSlots} available {availableSlots === 1 ? "slot" : "slots"}</strong>. Uncheck some groups to continue.
                                </span>
                            </div>
                        )}

                        <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div className="text-xs font-medium text-slate-600 dark:text-slate-300 space-y-0.5">
                                <div>
                                    Selected: <span className="text-indigo-600 dark:text-indigo-400 font-bold">{selectedPaxCount}</span> {selectedPaxCount === 1 ? "player" : "players"} ({selectedTokens.length} {selectedTokens.length === 1 ? "group" : "groups"})
                                </div>
                                <div className="text-[11px] text-slate-400">
                                    {availableSlots} {availableSlots === 1 ? "slot" : "slots"} available inside zone
                                </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                                <button
                                    type="button"
                                    onClick={() => setShowBatchModal(false)}
                                    className="px-3.5 py-2 text-xs font-semibold rounded-xl text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={handleBatchAdmit}
                                    disabled={selectedTokens.length === 0 || selectedPaxCount > availableSlots || actionLoading === "batch_admit"}
                                    className="px-4 py-2 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-xs"
                                >
                                    {actionLoading === "batch_admit"
                                        ? "Admitting..."
                                        : selectedTokens.length > 0
                                        ? `Admit (${selectedPaxCount} ${selectedPaxCount === 1 ? "Player" : "Players"})`
                                        : "Admit"}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
