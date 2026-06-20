"use client";

import React, { use, useState, useEffect, useCallback, useRef } from "react";
import { useQueueSocket } from "@/hooks/useQueueSocket";
import type { RecentToken } from "@/types/api";

interface PageProps {
    params: Promise<{ queueId: string }>;
}

export default function DisplayQueuePage({ params }: PageProps) {
    const { queueId } = use(params);
    const { state, status } = useQueueSocket(queueId);

    const prefix = state?.prefix || "";
    const serving = state?.current_serving || 0;
    const queueName = state?.queue_name || "Loading…";
    const waiting = state?.waiting_count ?? 0;
    const recentTokens = state?.recent_tokens || [];

    const recentlyCalled = recentTokens
        .filter((t: RecentToken) => t.status === "serving" || t.status === "done")
        .map((t: RecentToken) => t.token_number)
        .slice(0, 5);

    // ── Audio Alert Logic ──
    const [soundEnabled, setSoundEnabled] = useState(false);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const previousServingRef = useRef<number | null>(null);

    const [isMounted, setIsMounted] = useState(false);
    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setIsMounted(true);
    }, []);

    useEffect(() => {
        if (!isMounted) return;
        const enabled = localStorage.getItem("display_sound_enabled") === "true";
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setSoundEnabled(enabled);

        const audio = new Audio("/sounds/ringtone-you-would-be-glad-to-know.mp3");
        audio.preload = "auto";
        audio.volume = 1.0;
        audioRef.current = audio;
    }, [isMounted]);

    const handleEnableSound = useCallback(() => {
        if (audioRef.current) {
            audioRef.current.play().then(() => {
                if (audioRef.current) {
                    audioRef.current.pause();
                    audioRef.current.currentTime = 0;
                }
            }).catch(() => { /* ignore */ });
        }

        localStorage.setItem("display_sound_enabled", "true");
        setSoundEnabled(true);
    }, []);

    useEffect(() => {
        if (!state) return;

        if (state.current_serving !== 0 && previousServingRef.current !== null && state.current_serving !== previousServingRef.current) {
            if (soundEnabled && audioRef.current) {
                audioRef.current.currentTime = 0;
                audioRef.current.play().catch(() => {/* ignore autoplay block */ });
            }
        }

        if (state.current_serving !== 0) {
            previousServingRef.current = state.current_serving;
        }
    }, [state, soundEnabled]);

    // Token change animation key
    const servingKey = `serving-${serving}`;

    return (
        <>
            {/* Minimal CSS — only for animations, font import, and grid that Tailwind can't do inline */}
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');

                * { font-family: 'Inter', system-ui, -apple-system, sans-serif; }

                @keyframes livePulse {
                    0%, 100% { opacity: 1; transform: scale(1); }
                    50% { opacity: 0.4; transform: scale(1.4); }
                }
                @keyframes concentricBreath {
                    0%, 100% { transform: translate(-50%, -50%) scale(1); opacity: 0.5; }
                    50% { transform: translate(-50%, -50%) scale(1.04); opacity: 0.3; }
                }
                @keyframes tokenSlideIn {
                    from { opacity: 0; transform: translateY(18px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                @keyframes rowFadeIn {
                    from { opacity: 0; transform: translateX(-8px); }
                    to { opacity: 1; transform: translateX(0); }
                }
                @keyframes slideUp {
                    from { opacity: 0; transform: translateY(12px); }
                    to { opacity: 1; transform: translateY(0); }
                }

                .display-grid {
                    display: grid;
                    grid-template-columns: 3fr 2fr;
                    gap: 32px;
                    flex: 1;
                    min-height: 0;
                    align-items: center;
                }
                @media (max-width: 1024px) {
                    .display-grid { grid-template-columns: 1fr; gap: 20px; }
                }

                .token-enter { animation: tokenSlideIn 420ms cubic-bezier(0.16, 1, 0.3, 1); }
                .row-fade-in { animation: rowFadeIn 380ms cubic-bezier(0.16, 1, 0.3, 1) backwards; }
                .row-fade-in:nth-child(1) { animation-delay: 0ms; }
                .row-fade-in:nth-child(2) { animation-delay: 60ms; }
                .row-fade-in:nth-child(3) { animation-delay: 120ms; }
                .row-fade-in:nth-child(4) { animation-delay: 180ms; }
                .row-fade-in:nth-child(5) { animation-delay: 240ms; }
                .announcement-enter { animation: slideUp 500ms ease-out; }
            `}</style>

            <main className="min-h-screen bg-slate-50 flex flex-col select-none overflow-hidden" aria-label="Queue display">

                {/* ── Header ── */}
                <div className="relative flex items-center justify-center shrink-0 pt-7 pb-1 px-10 lg:px-10">
                    {/* Sound Enable — top left */}
                    {!soundEnabled && (
                        <button
                            onClick={handleEnableSound}
                            className="absolute left-10 top-7 flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold tracking-wide border border-indigo-200/60 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 hover:border-indigo-300 transition-all cursor-pointer"
                        >
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                                <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                                <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
                            </svg>
                            Enable Sound
                        </button>
                    )}

                    {/* Queue Name */}
                    <div className="text-center">
                        <h1 className="text-3xl lg:text-[2rem] font-bold text-slate-900 tracking-tight">
                            {queueName}
                        </h1>
                        {state && !state.is_active && (
                            <span className="inline-block mt-1.5 text-xs font-semibold tracking-widest uppercase text-red-600 bg-red-50 border border-red-200/60 rounded-full px-4 py-1">
                                Queue Closed
                            </span>
                        )}
                    </div>

                    {/* LIVE Badge — top right */}
                    <div className={`absolute right-10 top-7 flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold uppercase tracking-wider border transition-colors ${
                        status === "connected"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200/60"
                            : status === "reconnecting"
                                ? "bg-amber-50 text-amber-700 border-amber-200/60"
                                : "bg-red-50 text-red-600 border-red-200/60"
                    }`}>
                        <span
                            className={`w-2 h-2 rounded-full ${
                                status === "connected" ? "bg-emerald-500" :
                                status === "reconnecting" ? "bg-amber-500" : "bg-red-500"
                            }`}
                            style={{
                                animation: status !== "connected" && status !== "reconnecting" ? "none" : "livePulse 2s ease-in-out infinite"
                            }}
                        />
                        {status === "connected" ? "LIVE" : status === "reconnecting" ? "RECONNECTING" : "OFFLINE"}
                    </div>
                </div>

                {/* ── Main Content Grid ── */}
                <div className="display-grid px-10 py-6 lg:px-10 lg:py-6">

                    {/* ════════════════════════════════════════════════ */}
                    {/* LEFT — Now Serving Hero Card                    */}
                    {/* ════════════════════════════════════════════════ */}
                    <div className="relative flex items-center justify-center" key={servingKey}>
                        {/* Subtle radial glow behind the card */}
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none" aria-hidden="true">
                            <div className="w-[600px] h-[600px] rounded-full bg-indigo-100/40 blur-[100px]" />
                        </div>

                        <div className="relative bg-white border border-slate-200/60 rounded-3xl shadow-2xl shadow-slate-200/50 w-full max-w-2xl flex flex-col items-center justify-center py-16 lg:py-20 px-10 overflow-hidden"
                             style={{ minHeight: "420px" }}>

                            {/* Concentric circles — large & faint */}
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none" aria-hidden="true">
                                <div className="absolute w-[320px] h-[320px] lg:w-[440px] lg:h-[440px] rounded-full border border-slate-100"
                                     style={{ left: "50%", top: "50%", animation: "concentricBreath 4s ease-in-out infinite" }} />
                                <div className="absolute w-[440px] h-[440px] lg:w-[580px] lg:h-[580px] rounded-full border border-slate-100/60"
                                     style={{ left: "50%", top: "50%", animation: "concentricBreath 4s ease-in-out infinite 0.5s" }} />
                                <div className="absolute w-[560px] h-[560px] lg:w-[720px] lg:h-[720px] rounded-full border border-slate-100/30"
                                     style={{ left: "50%", top: "50%", animation: "concentricBreath 4s ease-in-out infinite 1s" }} />
                            </div>

                            {/* NOW SERVING eyebrow */}
                            <p className="text-sm font-bold tracking-[0.2em] text-slate-400 uppercase mb-4 relative z-10">
                                Now Serving
                            </p>

                            {/* Token Number */}
                            <div
                                className="token-enter text-9xl lg:text-[11rem] font-extrabold text-slate-900 tracking-tight leading-none tabular-nums relative z-10"
                                aria-live="assertive"
                                aria-atomic="true"
                                aria-label={`Now serving token ${prefix}${serving}`}
                            >
                                {prefix}{serving}
                            </div>
                        </div>
                    </div>

                    {/* ════════════════════════════════════════════════ */}
                    {/* RIGHT COLUMN                                    */}
                    {/* ════════════════════════════════════════════════ */}
                    <div className="flex flex-col gap-6 h-full max-h-[80vh] justify-center">

                        {/* ── Waiting Count Card ── */}
                        <div className="bg-white border border-slate-200 shadow-xl shadow-slate-200/40 rounded-2xl p-7 lg:p-8 text-center shrink-0">
                            {/* Icon */}
                            <div className="inline-flex items-center justify-center w-11 h-11 rounded-full bg-indigo-50 text-indigo-600 mb-3">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                                    <circle cx="9" cy="7" r="4" />
                                    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                                    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                                </svg>
                            </div>
                            <p className="text-xs font-bold tracking-[0.14em] text-slate-400 uppercase mb-1">
                                Waiting
                            </p>
                            <p className="text-6xl font-bold text-slate-900 leading-tight tabular-nums" aria-label={`${waiting} people waiting`}>
                                {waiting}
                            </p>
                        </div>

                        {/* ── Recently Called Card ── */}
                        <div className="bg-white border border-slate-200 shadow-xl shadow-slate-200/40 rounded-2xl p-6 lg:p-7 flex-1 min-h-0 overflow-hidden flex flex-col">
                            <p className="text-xs font-bold tracking-[0.14em] text-slate-400 uppercase mb-5 text-center">
                                Recently Called
                            </p>

                            {recentlyCalled.length > 0 ? (
                                <div className="flex flex-col" key={`recent-${recentlyCalled[0]}`}>
                                    {recentlyCalled.map((num, i) => {
                                        const isActive = i === 0;
                                        const isFaded = i >= 2;

                                        return (
                                            <div
                                                key={`${num}-${i}`}
                                                className={`row-fade-in flex items-center tabular-nums transition-all ${
                                                    isActive
                                                        ? "bg-indigo-50/80 text-indigo-700 font-bold text-2xl border-l-4 border-indigo-600 rounded-r-xl rounded-l-sm px-5 py-4"
                                                        : `bg-white font-semibold px-6 py-3.5 ${
                                                            isFaded ? "text-slate-400 text-lg" : "text-slate-500 text-xl"
                                                          } ${i < recentlyCalled.length - 1 ? "border-b border-slate-100" : ""}`
                                                }`}
                                            >
                                                {prefix}{num}
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <p className="text-center text-slate-400 text-sm py-8 font-medium">
                                    No tokens called yet
                                </p>
                            )}
                        </div>
                    </div>
                </div>

                {/* ── Announcement Banner ── */}
                {state?.announcement && (
                    <div className="announcement-enter mx-10 mb-3 shrink-0">
                        <div className="bg-white border border-slate-200 border-l-4 border-l-indigo-500 rounded-2xl px-6 py-4 flex items-center gap-4 shadow-lg shadow-slate-200/30">
                            <div className="shrink-0 w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
                                </svg>
                            </div>
                            <p className="text-base font-medium text-slate-700 leading-snug">
                                {state.announcement}
                            </p>
                        </div>
                    </div>
                )}

                {/* ── Footer ── */}
                <div className="text-center py-4 text-xs font-medium text-slate-300 tracking-widest shrink-0">
                    q4queue &bull; Queue Management System
                </div>
            </main>
        </>
    );
}
