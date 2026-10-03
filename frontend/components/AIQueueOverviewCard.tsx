"use client";

import React, { useEffect, useState, useRef } from "react";
import { Sparkles, Clock, AlertCircle, Coffee, Compass, CheckCircle2 } from "lucide-react";
import { api } from "@/lib/api";
import type { AIOverviewData } from "@/types/api";

interface AIQueueOverviewCardProps {
    trackingId: string;
    peopleAhead: number;
    isWaiting: boolean;
    brandColor?: string;
}

export default function AIQueueOverviewCard({
    trackingId,
    peopleAhead,
    isWaiting,
    brandColor = "#4f46e5",
}: AIQueueOverviewCardProps) {
    const [overview, setOverview] = useState<AIOverviewData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const lastFetchAheadRef = useRef<number | null>(null);

    useEffect(() => {
        // Only fetch when the customer is actually waiting
        if (!trackingId || !isWaiting) {
            setIsLoading(false);
            return;
        }

        let isMounted = true;

        async function fetchOverview() {
            try {
                const data = await api.getAIOverview(trackingId);
                if (isMounted) {
                    setOverview(data);
                    setIsLoading(false);
                    lastFetchAheadRef.current = peopleAhead;
                }
            } catch (err) {
                // Failure isolation: log silently, avoid crashing UI
                console.debug("[AIQueueOverviewCard] Fetch bypassed or failed:", err);
                if (isMounted) {
                    setIsLoading(false);
                }
            }
        }

        fetchOverview();

        // Refresh periodically (every 50s) to keep pace calibrated
        const interval = setInterval(fetchOverview, 50000);
        return () => {
            isMounted = false;
            clearInterval(interval);
        };
    }, [trackingId, isWaiting, peopleAhead]);

    // If not waiting (served, cancelled, etc.) or failed completely with no data, don't show
    if (!isWaiting || (!isLoading && !overview)) {
        return null;
    }

    if (isLoading && !overview) {
        return (
            <div className="w-full bg-white/80 backdrop-blur-md border border-slate-200/80 rounded-2xl p-4 shadow-sm animate-pulse mb-3.5">
                <div className="flex items-center justify-between mb-2">
                    <div className="h-4 bg-slate-200 rounded w-28"></div>
                    <div className="h-5 bg-slate-200 rounded-full w-20"></div>
                </div>
                <div className="h-6 bg-slate-200 rounded w-44 mb-2"></div>
                <div className="h-3 bg-slate-100 rounded w-3/4"></div>
            </div>
        );
    }

    if (!overview) return null;

    const isPaused = overview.is_paused || overview.badge_type === "paused" || overview.active_counters === 0;
    const isClosed = !overview.is_active || overview.badge_type === "closed";
    const isAlmostTurn = overview.badge_type === "almost_turn" || peopleAhead === 0;
    const isFast = overview.badge_type === "fast";
    const isSlow = overview.badge_type === "slow";

    // Dynamic badge styles
    const getBadgeConfig = () => {
        if (isClosed) {
            return {
                label: "Queue Closed",
                className: "bg-slate-100 text-slate-700 border-slate-200",
                icon: AlertCircle,
            };
        }
        if (isPaused) {
            return {
                label: "Counters on Pause",
                className: "bg-amber-50 text-amber-800 border-amber-200",
                icon: AlertCircle,
            };
        }
        if (isAlmostTurn) {
            return {
                label: "Turn Approaching",
                className: "bg-indigo-50 text-indigo-700 border-indigo-200",
                icon: CheckCircle2,
            };
        }
        if (isFast) {
            return {
                label: "Moving Fast",
                className: "bg-emerald-50 text-emerald-700 border-emerald-200",
                icon: Sparkles,
            };
        }
        if (isSlow) {
            return {
                label: "Peak Traffic",
                className: "bg-orange-50 text-orange-700 border-orange-200",
                icon: Clock,
            };
        }
        return {
            label: "Steady Pace",
            className: "bg-blue-50 text-blue-700 border-blue-200",
            icon: Compass,
        };
    };

    const badge = getBadgeConfig();
    const BadgeIcon = badge.icon;

    return (
        <div 
            className="w-full bg-linear-to-b from-white to-slate-50/60 border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-[0_4px_20px_rgb(0,0,0,0.03)] text-left mb-3.5 relative overflow-hidden transition-all duration-300"
            role="region"
            aria-label="AI Queue Overview"
        >
            {/* Ambient subtle top edge accent */}
            <div 
                className="absolute top-0 left-0 right-0 h-1 opacity-80"
                style={{
                    background: isPaused 
                        ? "#f59e0b" 
                        : isAlmostTurn 
                        ? "#6366f1" 
                        : isFast 
                        ? "#10b981" 
                        : brandColor
                }}
            />

            {/* Header: Title + Badge */}
            <div className="flex items-center justify-between gap-2 mb-2">
                <div className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-800 tracking-wide uppercase">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-600 animate-pulse" />
                    <span>AI Overview</span>
                </div>

                <div className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full border text-[11px] font-semibold tracking-tight ${badge.className}`}>
                    <BadgeIcon className="w-3 h-3" />
                    <span>{badge.label}</span>
                </div>
            </div>

            {/* Main Wait Estimate or Status */}
            {overview.estimated_min_minutes !== null && overview.estimated_max_minutes !== null ? (
                <div className="mb-2">
                    <div className="flex items-baseline gap-1.5">
                        <span className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                            ~{overview.estimated_min_minutes}–{overview.estimated_max_minutes}
                        </span>
                        <span className="text-sm font-semibold text-slate-500">mins estimated wait</span>
                    </div>
                    <p className="text-xs font-medium text-slate-600 mt-0.5">
                        {overview.trend_title}
                    </p>
                </div>
            ) : (
                <div className="mb-2">
                    <h2 className="text-base font-bold text-slate-900 leading-snug">
                        {overview.trend_title}
                    </h2>
                    <p className="text-xs text-slate-600 mt-0.5">
                        {overview.summary_message}
                    </p>
                </div>
            )}

            {/* Actionable Advice Card */}
            <div className="mt-2.5 pt-2.5 border-t border-slate-100 flex items-start gap-2">
                {isPaused ? (
                    <Clock className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                ) : isAlmostTurn ? (
                    <Compass className="w-3.5 h-3.5 text-indigo-500 shrink-0 mt-0.5" />
                ) : (
                    <Coffee className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                )}
                <p className="text-xs font-normal text-slate-600 leading-relaxed">
                    {overview.action_advice}
                </p>
            </div>
        </div>
    );
}
