"use client";

import React, { use, useState, useEffect, useCallback, useRef } from "react";
import { useQueueSocket } from "@/hooks/useQueueSocket";
import { NowServingHero } from "@/components/display/NowServingHero";
import { WaitingCountCard } from "@/components/display/WaitingCountCard";
import { UpcomingQueueCard } from "@/components/display/UpcomingQueueCard";
import { FooterTicker } from "@/components/display/FooterTicker";
import { useTheme } from "next-themes";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Logo } from "@/components/ui/Logo";
import { ServingToken } from "@/types/api";
import type { DisplayTheme } from "@/components/display/displayTheme";
import { Sun, Moon, Volume2, VolumeX, Maximize, ExternalLink } from "lucide-react";

interface PageProps {
    params: Promise<{ queueId: string }>;
}

export default function DisplayQueuePage({ params }: PageProps) {
    const rawQueueId = use(params).queueId;
    const queueId = rawQueueId.length >= 36 ? rawQueueId.slice(-36) : rawQueueId;
    const { state, status } = useQueueSocket(queueId);

    // Audio State
    const [soundEnabled, setSoundEnabled] = useState(false);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const [isMounted, setIsMounted] = useState(false);
    const [timeString, setTimeString] = useState("");
    const [dateString, setDateString] = useState("");
    const { theme: nextTheme, resolvedTheme } = useTheme();
    const isDark = nextTheme === "dark" || resolvedTheme === "dark";
    const theme: DisplayTheme = isDark ? "dark" : "light";

    useEffect(() => { setIsMounted(true); }, []);

    useEffect(() => {
        const update = () => {
            const now = new Date();
            setTimeString(now.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true }));
            setDateString(now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" }));
        };
        update();
        const id = setInterval(update, 1000);
        return () => clearInterval(id);
    }, []);

    // Track all serving tokens (all counters) for sound trigger
    const previousServingTokensRef = useRef<string>("");

    useEffect(() => {
        if (!isMounted) return;
        const enabled = localStorage.getItem("display_sound_enabled");
        // Default to true on first load (TV display should have sound on by default)
        setSoundEnabled(enabled === null ? true : enabled === "true");
        if (enabled === null) localStorage.setItem("display_sound_enabled", "true");
        const audio = new Audio("/sounds/airport-ding-dong.wav");
        audio.preload = "auto";
        audio.volume = 1.0;
        audioRef.current = audio;
    }, [isMounted]);

    const handleToggleSound = () => {
        setSoundEnabled(!soundEnabled);
    };

    // Fire sound whenever the set of currently-serving tokens changes
    // This works for both single-counter and multi-counter queues
    useEffect(() => {
        if (!state) return;
        const allTokens = state.all_serving_tokens || [];
        // Build a stable key from all serving token numbers + assigned lines
        const currentKey = allTokens
            .map((t: any) => `${t.assigned_line ?? 0}:${t.token_number}`)
            .sort()
            .join(",");
        // Also include the single current_serving for queues without multi-line
        const singleKey = String(state.current_serving ?? 0);
        const fullKey = currentKey || singleKey;

        if (fullKey && fullKey !== "0" && previousServingTokensRef.current !== "" && fullKey !== previousServingTokensRef.current) {
            if (soundEnabled && audioRef.current) {
                audioRef.current.currentTime = 0;
                audioRef.current.play().catch(() => { });
            }
        }
        if (fullKey && fullKey !== "0") {
            previousServingTokensRef.current = fullKey;
        }
    }, [state, soundEnabled]);

    if (!isMounted) return null;

    const prefix = state?.prefix || "";
    const serving = state?.current_serving || 0;
    const queueName = state?.queue_name || "Loading…";
    const waiting = state?.waiting_count ?? 0;
    const recentTokens = state?.recent_tokens || [];
    const waitingTokens = state?.waiting_tokens || [];
    const serviceLines = state?.service_lines ?? 0;
    const assignedLine = state?.serving_details?.assigned_line;
    const customerName = state?.serving_details?.customer_name;
    const allServingTokens = state?.all_serving_tokens || [];
    const rawLogoUrl = state?.org_logo_url;
    const logoUrl = rawLogoUrl ? (rawLogoUrl.startsWith('http') ? rawLogoUrl : `${(process.env.NEXT_PUBLIC_API_URL || 'https://amoebaq.com/api/v1').replace('/api/v1', '')}${rawLogoUrl}`) : null;
    const isConnected = status === "connected";

    return (
        <>
            <style>{`
                * { font-family: 'Inter', system-ui, -apple-system, sans-serif; }
                .hide-scrollbar::-webkit-scrollbar { display: none; }
                .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
            `}</style>

            {/* ═══════════════════════════════════════════════════════════
                MOBILE LAYOUT  (hidden on lg+)
            ═══════════════════════════════════════════════════════════ */}
            <div className={`lg:hidden min-h-screen flex flex-col transition-colors duration-500 ${isDark ? "bg-slate-950 text-slate-100" : "bg-[#f5f6f8] text-slate-900"}`}>
                {/* Mobile Header */}
                <header className={`${isDark ? "bg-white/[0.02] border-white/[0.06]" : "bg-white border-slate-200 shadow-sm"} border-b px-4 py-3 flex items-center justify-end shrink-0 sticky top-0 z-20`}>
                    <div className="flex items-center gap-2">
                        {/* Live badge */}
                        <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold border ${isConnected ? (isDark ? "bg-white/[0.06] text-slate-300 border-white/[0.08]" : "bg-emerald-50 text-emerald-700 border-emerald-200") : "bg-red-500/10 text-red-400 border-red-500/20"}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${isConnected ? "bg-emerald-400" : "bg-red-500"} ${isConnected ? "animate-pulse" : ""}`} />
                            {isConnected ? "LIVE" : "OFFLINE"}
                        </div>
                        {/* Theme toggle */}
                        <ThemeToggle />
                    </div>
                </header>

                {/* Scrollable body */}
                <div className="flex-1 overflow-y-auto hide-scrollbar">
                    <div className="p-3 space-y-3 pb-6">
                        {/* Info bar: Time + Waiting */}
                        <div className="flex gap-3">
                            <div className={`flex-1 rounded-xl border p-3 flex items-center gap-3 ${isDark ? "bg-white/[0.04] border-white/[0.06]" : "bg-white border-slate-200 shadow-sm"}`}>
                                <div className={`w-8 h-8 rounded-lg border flex items-center justify-center shrink-0 ${isDark ? "bg-white/[0.06] border-white/[0.06]" : "bg-slate-50 border-slate-200"}`}>
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
                                    </svg>
                                </div>
                                <div>
                                    <p className={`text-sm font-bold leading-none tracking-tight tabular-nums ${isDark ? "text-white" : "text-slate-900"}`}>{timeString || "--:--"}</p>
                                    <p className={`text-[10px] mt-0.5 ${isDark ? "text-slate-500" : "text-slate-500"}`}>{dateString || "---"}</p>
                                </div>
                            </div>
                            <div className={`flex-1 rounded-xl border p-3 flex items-center gap-3 ${isDark ? "bg-white/[0.04] border-white/[0.06]" : "bg-white border-slate-200 shadow-sm"}`}>
                                <div className={`w-8 h-8 rounded-lg border flex items-center justify-center shrink-0 ${isDark ? "bg-white/[0.06] border-white/[0.06]" : "bg-slate-50 border-slate-200"}`}>
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
                                        <path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
                                    </svg>
                                </div>
                                <div>
                                    <p className="text-[10px] font-semibold tracking-widest text-slate-500 uppercase">Waiting</p>
                                    <p className={`text-xl font-bold leading-none tabular-nums mt-0.5 ${isDark ? "text-white" : "text-slate-900"}`}>{waiting}</p>
                                </div>
                            </div>
                        </div>

                        {/* Now Serving — mobile counter grid */}
                        <MobileNowServing
                            serving={serving}
                            prefix={prefix}
                            serviceLines={serviceLines}
                            allServingTokens={allServingTokens}
                            queueName={queueName}
                            isActive={state?.is_active ?? false}
                            isDark={isDark}
                        />

                        {/* Upcoming */}
                        <MobileUpcoming waitingTokens={waitingTokens} prefix={prefix} isDark={isDark} />
                    </div>
                </div>

                <div className={`py-5 flex items-center justify-center shrink-0 border-t ${isDark ? "bg-white/[0.02] border-white/[0.06]" : "bg-white border-slate-200"}`}>
                    <span className={`text-[10px] font-semibold tracking-[0.2em] uppercase flex items-center`}>
                        <div className="flex items-center gap-4">
                            <Logo size="sm" className="hidden sm:flex" />
                        </div>
                    </span>
                </div>
            </div>

            {/* ═══════════════════════════════════════════════════════════
                DESKTOP LAYOUT  (hidden below lg)
            ═══════════════════════════════════════════════════════════ */}
            <main className={`hidden lg:flex h-[100dvh] w-full flex-col select-none overflow-hidden font-sans relative transition-colors duration-500 ${isDark ? "text-slate-100 bg-slate-950" : "text-slate-900 bg-[#f5f6f8]"}`}>
                {/* Background */}
                <div className={`absolute inset-0 z-0 transition-colors duration-500 ${isDark ? "bg-[#0a0e1a]" : "bg-[#f5f6f8]"}`}></div>

                {/* Desktop Header */}
                <DesktopHeader logoUrl={logoUrl} status={status} isActive={state?.is_active ?? false} timeString={timeString} dateString={dateString} isDark={isDark} soundEnabled={soundEnabled} onToggleSound={handleToggleSound} />

                {/* 70 / 30 split */}
                <div className="flex-1 flex gap-5 p-5 overflow-hidden min-h-0 relative z-10">
                    <div className="w-[68%] flex flex-col min-h-0">
                        <NowServingHero
                            serving={serving}
                            prefix={prefix}
                            assignedLine={assignedLine}
                            serviceLines={serviceLines}
                            customerName={customerName}
                            allServingTokens={allServingTokens}
                            queueName={queueName}
                            isActive={state?.is_active ?? false}
                            theme={theme}
                        />
                    </div>
                    <div className="w-[32%] flex flex-col gap-4 min-h-0">
                        <WaitingCountCard count={waiting} theme={theme} />
                        <UpcomingQueueCard waitingTokens={waitingTokens} prefix={prefix} theme={theme} />
                    </div>
                </div>

                <FooterTicker announcement={state?.announcement || null} theme={theme} />
            </main>
        </>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Desktop Header (extracted to keep main component lean)
// ─────────────────────────────────────────────────────────────────────────────
function DesktopHeader({ logoUrl, status, isActive, timeString, dateString, isDark, soundEnabled, onToggleSound }: {
    logoUrl?: string | null;
    status: string;
    isActive: boolean;
    timeString: string;
    dateString: string;
    isDark: boolean;
    soundEnabled: boolean;
    onToggleSound: () => void;
}) {
    const isConnected = status === "connected";
    return (
        <header className={`h-16 ${isDark ? "bg-white/[0.02] border-white/[0.06]" : "bg-white border-slate-200"} border-b px-8 flex items-center justify-end shrink-0 z-10 relative transition-colors duration-500`}>
            <div className="flex items-center gap-4">
                {/* Theme toggle */}
                <ThemeToggle />

                {/* LIVE badge */}
                <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-semibold border ${isConnected
                        ? isDark ? "bg-white/[0.06] text-slate-300 border-white/[0.08]" : "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : "bg-red-500/10 text-red-400 border-red-500/20"
                    }`}>
                    <span className={`w-2 h-2 rounded-full ${isConnected ? "bg-emerald-400 animate-pulse" : "bg-red-500"}`} />
                    {isConnected ? "LIVE" : "OFFLINE"}
                </div>

                {/* Time */}
                <div className={`flex flex-col items-end leading-none ${isDark ? "border-white/[0.08]" : "border-slate-200"} border-l pl-5`}>
                    <span className={`text-lg font-bold ${isDark ? "text-white" : "text-slate-900"} tracking-tight tabular-nums`}>{timeString || "--:--"}</span>
                    <span className={`text-[10px] font-medium ${isDark ? "text-slate-500" : "text-slate-400"} uppercase tracking-widest mt-1`}>{dateString || "---"}</span>
                </div>
            </div>
        </header>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Mobile: Now Serving grid
// ─────────────────────────────────────────────────────────────────────────────
function MobileNowServing({ serving, prefix, serviceLines, allServingTokens, queueName, isActive, isDark }: {
    serving: number;
    prefix: string;
    serviceLines: number;
    allServingTokens: ServingToken[];
    queueName: string;
    isActive: boolean;
    isDark: boolean;
}) {
    const activeTokens = allServingTokens.length > 0
        ? allServingTokens
        : serving !== 0 ? [{ id: "single", token_number: serving, assigned_line: null } as any] : [];

    const isMulti = serviceLines > 1;
    const counters = isMulti ? Array.from({ length: serviceLines }, (_, i) => i + 1) : [];

    return (
        <div className={`rounded-xl border overflow-hidden ${isDark ? "bg-white/[0.04] border-white/[0.06]" : "bg-white border-slate-200 shadow-sm"}`}>
            {/* Section header */}
            <div className={`flex items-center gap-2.5 px-4 pt-4 pb-3 border-b ${isDark ? "border-white/[0.04]" : "border-slate-100"}`}>
                <div className={`w-7 h-7 rounded-lg border flex items-center justify-center ${isDark ? "bg-white/[0.06] border-white/[0.06]" : "bg-slate-50 border-slate-200"}`}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
                        <path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
                    </svg>
                </div>
                <h2 className="text-xs font-semibold tracking-[0.15em] text-slate-500 uppercase">Now Serving</h2>
                {!isActive && (
                    <span className="ml-auto text-[10px] font-semibold tracking-widest uppercase text-red-400 bg-red-500/10 px-2 py-0.5 rounded-full border border-red-500/20">Closed</span>
                )}
            </div>

            {/* Counter grid */}
            {isMulti ? (
                <div className="px-3 pb-4 pt-2 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
                    {counters.map(counterNum => {
                        const activeToken = activeTokens.find((t: any) => t.assigned_line === counterNum || t.shared_lines?.includes(counterNum));
                        const hasToken = !!activeToken;
                        return (
                            <div
                                key={counterNum}
                                className={`flex flex-col items-center justify-center py-3 px-2 rounded-lg border overflow-hidden ${hasToken ? (isDark ? "bg-white/[0.08] border-white/[0.12]" : "bg-slate-50 border-slate-200") : (isDark ? "bg-white/[0.02] border-white/[0.04] opacity-40" : "bg-slate-50/50 border-slate-100 opacity-40")}`}
                            >
                                <span className={`text-[9px] font-semibold tracking-wider mb-1 ${hasToken ? (isDark ? "text-slate-400" : "text-slate-500") : "text-slate-400"}`}>
                                    {String(counterNum).padStart(2, "0")}
                                </span>
                                <span className={`text-sm md:text-base font-medium tracking-tight leading-none tabular-nums whitespace-nowrap w-full text-center ${hasToken ? (isDark ? "text-white" : "text-slate-900") : "text-slate-400"}`}>
                                    {hasToken ? `${prefix}${activeToken.token_number}` : "—"}
                                </span>
                            </div>
                        );
                    })}
                </div>
            ) : (
                <div className="p-6 flex flex-col items-center justify-center text-center">
                    <div className="text-[10px] font-semibold tracking-widest text-slate-500 uppercase mb-2">Token</div>
                    {activeTokens.length > 0 ? (
                        <div className={`text-5xl font-bold tracking-tight ${isDark ? "text-white" : "text-slate-900"}`}>
                            {prefix}{activeTokens[0].token_number}
                        </div>
                    ) : (
                        <div className={`text-2xl font-light ${isDark ? "text-slate-600" : "text-slate-400"}`}>--</div>
                    )}
                </div>
            )}
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Mobile: Recently Called
// ─────────────────────────────────────────────────────────────────────────────
function MobileRecentCalls({ recentTokens, prefix }: { recentTokens: any[]; prefix: string }) {
    const [showAll, setShowAll] = useState(false);
    const calls = recentTokens.filter(t => t.status === "serving" || t.status === "done");
    const visible = showAll ? calls : calls.slice(0, 3);

    return (
        <div className="bg-white/[0.04] rounded-xl border border-white/[0.06] overflow-hidden">
            <div className="flex items-center gap-2.5 px-4 pt-4 pb-2 border-b border-white/[0.04]">
                <div className="w-7 h-7 rounded-lg bg-white/[0.06] border border-white/[0.06] flex items-center justify-center">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
                    </svg>
                </div>
                <h2 className="text-xs font-semibold tracking-[0.15em] text-slate-500 uppercase">Recently Called</h2>
                {calls.length > 3 && (
                    <button onClick={() => setShowAll(v => !v)} className="ml-auto text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                        {showAll ? "Show less" : "View all"}
                    </button>
                )}
            </div>
            <div className="divide-y divide-white/[0.04]">
                {visible.length > 0 ? visible.map((token, i) => {
                    const timeStr = token.served_at
                        ? new Date(token.served_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                        : "--:--";
                    return (
                        <div key={`${token.token_number}-${i}`} className="flex items-center px-4 py-3">
                            <span className="text-base font-bold text-white tabular-nums w-14">{prefix}{token.token_number}</span>
                            <span className="flex-1 text-[11px] text-slate-500 font-medium">
                                {token.assigned_line ? `Counter ${String(token.assigned_line).padStart(2, "0")}` : ""}
                            </span>
                            <span className="text-[11px] text-slate-500 font-medium tabular-nums">{timeStr}</span>
                        </div>
                    );
                }) : (
                    <div className="px-4 py-6 text-center text-slate-600 text-xs">No tokens called yet</div>
                )}
            </div>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Mobile: Upcoming
// ─────────────────────────────────────────────────────────────────────────────
function MobileUpcoming({ waitingTokens, prefix, isDark }: { waitingTokens: any[]; prefix: string; isDark: boolean }) {
    const [showAll, setShowAll] = useState(false);
    const visible = showAll ? waitingTokens : waitingTokens.slice(0, 3);

    return (
        <div className={`rounded-xl border overflow-hidden ${isDark ? "bg-white/[0.04] border-white/[0.06]" : "bg-white border-slate-200 shadow-sm"}`}>
            <div className={`flex items-center gap-2.5 px-4 pt-4 pb-2 border-b ${isDark ? "border-white/[0.04]" : "border-slate-100"}`}>
                <div className={`w-7 h-7 rounded-lg border flex items-center justify-center ${isDark ? "bg-white/[0.06] border-white/[0.06]" : "bg-slate-50 border-slate-200"}`}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" />
                        <line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
                        <path d="M8 14h.01" /><path d="M12 14h.01" /><path d="M16 14h.01" /><path d="M8 18h.01" /><path d="M12 18h.01" />
                    </svg>
                </div>
                <h2 className="text-xs font-semibold tracking-[0.15em] text-slate-500 uppercase">Upcoming</h2>
                {waitingTokens.length > 3 && (
                    <button onClick={() => setShowAll(v => !v)} className="ml-auto text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                        {showAll ? "Show less" : "View all"}
                    </button>
                )}
            </div>
            <div className={`divide-y ${isDark ? "divide-white/[0.04]" : "divide-slate-100"}`}>
                {visible.length > 0 ? visible.map((token, i) => {
                    const joinTime = token.created_at
                        ? new Date(token.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                        : "--:--";
                    return (
                        <div key={`${token.token_number}-${i}`} className="flex items-center px-4 py-3">
                            <span className={`text-base font-bold tabular-nums w-14 ${isDark ? "text-white" : "text-slate-900"}`}>{prefix}{token.token_number}</span>
                            <span className="flex-1 text-[11px] text-slate-500 font-medium">
                                {token.assigned_line ? `Counter ${String(token.assigned_line).padStart(2, "0")}` : ""}
                            </span>
                            <span className="text-[11px] text-slate-500 font-medium tabular-nums">{joinTime}</span>
                        </div>
                    );
                }) : (
                    <div className="px-4 py-6 text-center text-slate-600 text-xs">Queue is empty</div>
                )}
            </div>
        </div>
    );
}
