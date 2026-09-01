"use client";

import React, { use, useState, useEffect, useCallback, useRef } from "react";
import { CheckCircle2, Clock, Share2 } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { useQueueSocket } from "@/hooks/useQueueSocket";
import {
    getSoundsEnabled,
    setSoundsEnabled,
    checkAndNotifyMilestone,
    freshMilestoneState,
    type MilestoneState,
} from "@/utils/queueNotifications";
import ConnectionBadge from "@/components/ConnectionBadge";
import ConfirmModal from "@/components/ConfirmModal";
import type { JoinResponse, TokenStatus } from "@/types/api";

interface PageProps {
    params: Promise<{ trackingId: string }>;
}

const STORAGE_KEY = (queueId: string) => `queue_token_${queueId}`;

const COUNTRY_CODES = [
    { code: "+91", country: "India", flag: "🇮🇳" },
    { code: "+1", country: "USA/Canada", flag: "🇺🇸" },
    { code: "+44", country: "UK", flag: "🇬🇧" },
    { code: "+971", country: "UAE", flag: "🇦🇪" },
    { code: "+966", country: "Saudi Arabia", flag: "🇸🇦" },
    { code: "+61", country: "Australia", flag: "🇦🇺" },
    { code: "+49", country: "Germany", flag: "🇩🇪" },
    { code: "+33", country: "France", flag: "🇫🇷" },
    { code: "+81", country: "Japan", flag: "🇯🇵" },
    { code: "+86", country: "China", flag: "🇨🇳" },
    { code: "+65", country: "Singapore", flag: "🇸🇬" },
];

function saveTokenToStorage(queueId: string, tokenId: string) {
    try {
        localStorage.setItem(STORAGE_KEY(queueId), tokenId);
    } catch { /* SSR or storage unavailable */ }
}

function getTokenFromStorage(queueId: string): string | null {
    try {
        return localStorage.getItem(STORAGE_KEY(queueId));
    } catch { return null; }
}

function clearTokenFromStorage(queueId: string) {
    try {
        localStorage.removeItem(STORAGE_KEY(queueId));
    } catch { /* ignore */ }
}

const formatTime12 = (time24?: string | null) => {
    if (!time24) return "";
    const [h, m] = time24.split(":");
    let hours = parseInt(h, 10);
    const ampm = hours >= 12 ? "PM" : "AM";
    hours = hours % 12 || 12;
    return `${hours.toString().padStart(2, "0")}:${m} ${ampm}`;
};

export default function TrackingPage({ params }: PageProps) {
    const { trackingId } = use(params);
    const [queueId, setQueueId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const { state: live, status: wsStatus, refresh } = useQueueSocket(queueId || '');

    const [joinData, setJoinData] = useState<JoinResponse | null>(null);
    const [isJoining, setIsJoining] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [soundEnabled, setSoundEnabled] = useState(false);


    const audioRef = useRef<HTMLAudioElement | null>(null);

    // Tracks which milestone alerts have already fired to prevent repeats
    const triggeredRef = useRef<MilestoneState>(freshMilestoneState());
    // Whether user has interacted (unlocks autoplay)
    const interactedRef = useRef(false);

    // Init Audio + read stored preferences on mount
    useEffect(() => {
        if (typeof window !== "undefined") {
            const enabled = getSoundsEnabled();
            setSoundEnabled(enabled);

            const audio = new Audio("/sounds/warm-marimba.wav");
            audio.preload = "auto";
            audio.volume = 1.0;
            audioRef.current = audio;
        }
    }, []);

    const handleEnableSound = useCallback(() => {
        if (audioRef.current) {
            audioRef.current.play().then(() => {
                if (audioRef.current) {
                    audioRef.current.pause();
                    audioRef.current.currentTime = 0;
                }
            }).catch(() => { /* ignore */ });
        }
        setSoundsEnabled(true);
        setSoundEnabled(true);
        interactedRef.current = true; // unlock autoplay milestone alerts
    }, []);

    const handleToggleSound = useCallback(() => {
        const next = !soundEnabled;
        setSoundsEnabled(next);
        setSoundEnabled(next);
        if (next) interactedRef.current = true;
    }, [soundEnabled]);


    const [tokenStatus, setTokenStatus] = useState<TokenStatus | null>(null);
    const [isPastSession, setIsPastSession] = useState(false);
    const [sessionDate, setSessionDate] = useState<string | null>(null);
    const [isCopied, setIsCopied] = useState(false);

    // ── Fetch Tracking Info on Mount ────────────────────────
    useEffect(() => {
        let mounted = true;
        const fetchTracking = async () => {
            try {
                const info = await api.getTrackingInfo(trackingId);
                if (mounted) {
                    setQueueId(info.queue_id);
                    setIsPastSession(info.is_past_session === true);
                    setSessionDate(info.session_date || null);
                    setJoinData({
                        id: info.token_id,
                        token_number: info.token_number,
                        position: info.position,
                        current_serving: 0, // will be updated by websocket
                        queue_prefix: info.token_prefix,
                        session_id: info.session_id || "",
                        tracking_id: info.tracking_id,
                        removed_by: info.removed_by
                    });
                    setTokenStatus(info.status as TokenStatus);
                    setIsLoading(false);
                }
            } catch (err: unknown) {
                if (mounted) {
                    if (err instanceof Error && 'status' in err && (err as any).status === 404) {
                        setError("This queue session has ended. Your token is no longer valid.");
                    } else {
                        setError("Tracking link is invalid or expired.");
                    }
                    setIsLoading(false);
                }
            }
        };
        fetchTracking();
        return () => { mounted = false; };
    }, [trackingId]);


    // Fetch exact status on live update or when joinData changes
    useEffect(() => {
        let mounted = true;
        const processStatus = () => {
            if (!joinData?.token_number) return;

            let newStatus: TokenStatus | null = null;

            if (live) {
                // 1. Is it currently serving?
                if (live.all_serving_tokens?.some((t: any) => t.token_number === joinData.token_number)) {
                    newStatus = "serving";
                }
                // 2. Is it in recent tokens? (this covers done, skipped, deleted, serving)
                else if (live.recent_tokens) {
                    const recent = live.recent_tokens.find(
                        (t: any) => t.token_number === joinData.token_number
                    );
                    if (recent) newStatus = recent.status;
                }
                // 3. Is it waiting?
                else if (live.waiting_tokens?.some((t: any) => t.token_number === joinData.token_number)) {
                    newStatus = "waiting";
                }
            }

            if (newStatus && mounted) {
                setTokenStatus(newStatus);

                // Auto-clear storage if token reaches end state
                if (newStatus === "done" || newStatus === "skipped" || newStatus === "deleted") {

                }

                if (typeof window !== "undefined") {
                    const storageKey = `fc_audio_stage_${queueId}`;
                    const lastStage = sessionStorage.getItem(storageKey);

                    if (newStatus !== lastStage) {
                        sessionStorage.setItem(storageKey, newStatus);
                        if (newStatus === "serving" && lastStage !== "serving" && soundEnabled && audioRef.current) {
                            audioRef.current.currentTime = 0;
                            audioRef.current.play().catch(() => { /* block */ });
                        }
                    }
                }
            }
        };

        processStatus();
        return () => { mounted = false; };
    }, [queueId, joinData?.token_number, joinData?.session_id, live, soundEnabled]);

    const [isCancelling, setIsCancelling] = useState(false);
    const [showCancelConfirm, setShowCancelConfirm] = useState(false);
    const [isSharing, setIsSharing] = useState(false);

    const handleConfirmCancel = useCallback(async () => {
        if (!joinData || isCancelling) return;
        setIsCancelling(true);
        try {
            await api.leaveQueue(trackingId);

            // Keep joinData to show the ticket card in "deleted" state
            setTokenStatus("deleted");
            setError(null);
            setShowCancelConfirm(false);
        } catch (err: unknown) {
            setError(err instanceof ApiError ? err.detail : "Failed to cancel token");
            setShowCancelConfirm(false);
        } finally {
            setIsCancelling(false);
        }
    }, [joinData, queueId, isCancelling, trackingId]);

    const handleCancelRequest = () => setShowCancelConfirm(true);

    const handleShare = async () => {
        if (isSharing) return;
        const url = window.location.href;
        const tokenLabel = myNumber ? `${prefix || ''}${myNumber}` : 'ticket';
        const queueTitle = live?.queue_name || 'the queue';
        const shareMessage = `Track my live queue position for Token ${tokenLabel} at ${queueTitle}:\n${url}`;

        // Auto-copy to clipboard as background assurance
        try {
            await navigator.clipboard.writeText(url);
        } catch {
            // Ignore background copy fail
        }

        if (typeof navigator !== 'undefined' && navigator.share) {
            setIsSharing(true);
            try {
                await navigator.share({
                    title: `Queue Ticket ${tokenLabel} - ${queueTitle}`,
                    text: shareMessage,
                    url: url,
                });
                setIsCopied(true);
                setTimeout(() => setIsCopied(false), 2500);
            } catch (err) {
                if ((err as Error).name !== 'AbortError') {
                    console.error("Native share error, copied to clipboard", err);
                    setIsCopied(true);
                    setTimeout(() => setIsCopied(false), 2500);
                }
            } finally {
                setIsSharing(false);
            }
        } else {
            setIsCopied(true);
            setTimeout(() => setIsCopied(false), 2500);
        }
    };

    // Derived: compute live position
    const myNumber = joinData?.token_number ?? null;
    const serving = live?.current_serving ?? 0;

    const actualStatus = tokenStatus || "waiting";
    const isMyTurn = actualStatus === "serving";
    const isDone = actualStatus === "done";
    const isSkipped = actualStatus === "skipped";
    const isDeleted = actualStatus === "deleted";

    const alreadyServed = isDone || isSkipped || isDeleted || (myNumber !== null && myNumber < serving && actualStatus !== "waiting");
    let peopleAhead = 0;
    if (myNumber !== null && actualStatus === "waiting") {
        if (live?.waiting_tokens) {
            const idx = live.waiting_tokens.findIndex((t) => t.token_number === myNumber);
            if (idx !== -1) {
                peopleAhead = idx;
            } else {
                peopleAhead = myNumber > serving ? myNumber - serving - 1 : 0;
            }
        } else {
            peopleAhead = joinData?.position ?? (myNumber > serving ? myNumber - serving - 1 : 0);
        }
    }

    const isNext = peopleAhead === 0 && actualStatus === "waiting" && myNumber !== null;

    // ── Remaining-count milestone: sound via utility ────
    useEffect(() => {
        if (!joinData?.token_number || !live?.current_serving || !joinData?.session_id) return;
        if (!interactedRef.current) return; // needs prior user interaction

        // Session isolation check: Do not fire alerts for old sessions
        if (live?.session_id && live.session_id !== joinData.session_id) return;

        // Sound utility (handles its own enabled check)
        checkAndNotifyMilestone(joinData.token_number, live.current_serving, triggeredRef.current);

    }, [joinData?.token_number, joinData?.session_id, live?.current_serving, live?.session_id, soundEnabled]);

    const queueClosed = live?.is_active === false;
    const queuePaused = live?.is_paused === true;
    const queueName = live?.queue_name || "Queue";
    const prefix = live?.prefix || joinData?.queue_prefix || "";

    const activeServingTokens = live?.all_serving_tokens ?? [];

    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const [isInteracting, setIsInteracting] = useState(false);
    const interactTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const handleInteraction = useCallback(() => {
        setIsInteracting(true);
        if (interactTimeoutRef.current) clearTimeout(interactTimeoutRef.current);
        interactTimeoutRef.current = setTimeout(() => {
            setIsInteracting(false);
        }, 1500);
    }, []);

    const isDragging = useRef(false);
    const startX = useRef(0);
    const initialScrollLeft = useRef(0);

    const handleMouseDown = (e: React.MouseEvent) => {
        isDragging.current = true;
        if (scrollContainerRef.current) {
            startX.current = e.pageX - scrollContainerRef.current.offsetLeft;
            initialScrollLeft.current = scrollContainerRef.current.scrollLeft;
        }
        handleInteraction();
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isDragging.current || !scrollContainerRef.current) return;
        e.preventDefault();
        const x = e.pageX - scrollContainerRef.current.offsetLeft;
        const walk = (x - startX.current) * 2;
        scrollContainerRef.current.scrollLeft = initialScrollLeft.current - walk;
        handleInteraction();
    };

    const handleMouseUpOrLeave = () => {
        isDragging.current = false;
    };

    useEffect(() => {
        const el = scrollContainerRef.current;
        if (!el || isInteracting || activeServingTokens.length <= 3) return;

        let animationFrameId: number;
        const speed = 0.5; // pixels per frame
        let currentScroll = el.scrollLeft;

        const scroll = () => {
            currentScroll += speed;
            if (currentScroll >= el.scrollWidth / 2) {
                currentScroll -= (el.scrollWidth / 2);
            }
            if (el) {
                el.scrollLeft = currentScroll;
            }
            animationFrameId = requestAnimationFrame(scroll);
        };
        animationFrameId = requestAnimationFrame(scroll);

        return () => cancelAnimationFrame(animationFrameId);
    }, [isInteracting, activeServingTokens.length]);

    let positionMessage = "";
    if (myNumber !== null) {
        if (isMyTurn) positionMessage = "It’s your turn! Please proceed.";
        else if (isDeleted) positionMessage = joinData?.removed_by === "session_end" ? "Queue session ended." : "Your token was removed.";
        else if (isSkipped) positionMessage = "Your token was skipped.";
        else if (alreadyServed) positionMessage = "Your token has been served.";
        else if (isNext) positionMessage = "You are next!";
        else if (peopleAhead === 1) positionMessage = "1 person ahead of you";
        else positionMessage = `${peopleAhead} people ahead of you`;
    }

    // Derive the assigned service line for this customer (multi-lane queues)
    const myAssignedLine = React.useMemo(() => {
        if (!myNumber || !isMyTurn) return null;
        const allServing = (live?.all_serving_tokens ?? []) as { token_number: number; assigned_line: number | null }[];
        const mine = allServing.find(t => t.token_number === myNumber);
        return mine?.assigned_line ?? null;
    }, [myNumber, isMyTurn, live?.all_serving_tokens]);

    const brandColor = live?.org_brand_color || '#2563eb';
    const logoUrl = live?.org_logo_url;
    const fullLogoUrl = logoUrl ? (logoUrl.startsWith('http') ? logoUrl : process.env.NEXT_PUBLIC_API_URL ? `${process.env.NEXT_PUBLIC_API_URL}${logoUrl}` : `https://amoebaq.com/api/v1${logoUrl}`) : null;

    return (
        <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex flex-col items-center justify-center p-4">
            <div className="bg-white max-w-md w-full rounded-2xl shadow-xl overflow-hidden">
                {/* Header */}
                {/* Header */}
                <div
                    className="px-5 sm:px-6 py-6 sm:py-8 text-center text-white relative overflow-hidden transition-colors duration-500"
                    style={{
                        backgroundColor: brandColor
                    }}
                >
                    {/* Decorative subtle lighting effect */}
                    <div className="absolute inset-0 opacity-30" style={{ backgroundImage: 'radial-gradient(circle at top right, rgba(255,255,255,0.4), transparent 60%)' }}></div>

                    <div className="relative z-10">
                        <div className="absolute top-0 right-0">
                            <ConnectionBadge status={queueClosed ? "disconnected" : wsStatus} />
                        </div>

                        {/* Sound toggle — small speaker icon top-left */}
                        <button
                            onClick={soundEnabled ? handleToggleSound : handleEnableSound}
                            aria-label={soundEnabled ? "Mute sound alerts" : "Enable sound alerts"}
                            title={soundEnabled ? "Sound ON — tap to mute" : "Sound OFF — tap to enable"}
                            className="absolute top-0 left-0 w-8 h-8 rounded-full flex items-center justify-center transition-all bg-black/10 hover:bg-black/20 backdrop-blur-sm border border-white/20 shadow-sm"
                        >
                            {soundEnabled ? (
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                                    <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
                                    <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                                </svg>
                            ) : (
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                                    <line x1="23" y1="9" x2="17" y2="15" />
                                    <line x1="17" y1="9" x2="23" y2="15" />
                                </svg>
                            )}
                        </button>


                        <h1 className="text-xl sm:text-2xl font-bold tracking-tight mb-1 text-white/95 px-10 leading-tight" style={{ textShadow: '0 2px 10px rgba(0,0,0,0.3)' }}>{queueName}</h1>
                        <p className="text-white/60 text-[10px] font-bold uppercase tracking-[0.25em] mb-4">
                            {queueClosed ? "Currently Closed" : "Now Serving"}
                        </p>

                        <div className="relative mx-auto w-full mt-3">
                            {activeServingTokens.length === 0 ? (
                                <div className="text-5xl sm:text-6xl font-black tabular-nums tracking-tighter py-4 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 shadow-lg flex items-center justify-center min-h-[90px] text-white/60">
                                    —
                                </div>
                            ) : activeServingTokens.length === 1 ? (
                                <div className="max-w-[200px] mx-auto py-3.5 bg-white/15 backdrop-blur-md rounded-2xl border border-white/25 shadow-lg flex flex-col items-center justify-center" aria-live="polite" aria-atomic="true">
                                    <span className="text-4xl sm:text-5xl font-black tabular-nums tracking-tight text-white leading-none">
                                        {prefix}{activeServingTokens[0].token_number}
                                    </span>
                                    {activeServingTokens[0].assigned_line !== null && (
                                        <span className="text-[10px] font-bold text-white/90 mt-2 uppercase tracking-wider bg-white/20 border border-white/15 px-2.5 py-0.5 rounded-full">
                                            Lane {activeServingTokens[0].assigned_line}
                                        </span>
                                    )}
                                </div>
                            ) : activeServingTokens.length <= 3 ? (
                                <div className="py-2" aria-live="polite" aria-atomic="true">
                                    <div className="flex flex-wrap items-center justify-center gap-3">
                                        {activeServingTokens.map((t: any) => (
                                            <div key={t.id || t.token_number} className="bg-white/15 hover:bg-white/20 backdrop-blur-md rounded-2xl px-4 py-2.5 sm:py-3 flex flex-col items-center min-w-[88px] shrink-0 border border-white/20 shadow-sm transition-all">
                                                <span className="text-2xl sm:text-[26px] font-black tabular-nums tracking-tight leading-none text-white">{prefix}{t.token_number}</span>
                                                {t.assigned_line !== null && (
                                                    <span className="text-[9.5px] font-bold text-white/90 mt-1.5 uppercase tracking-wider bg-white/20 border border-white/15 px-2.5 py-0.5 rounded-full whitespace-nowrap">Lane {t.assigned_line}</span>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <div className="overflow-hidden w-full relative py-1" aria-live="polite" aria-atomic="true">
                                    <style>{`
                                        .hide-scroll::-webkit-scrollbar { display: none; }
                                    `}</style>
                                    {/* Soft edge fade masks */}
                                    <div className="pointer-events-none absolute left-0 inset-y-0 w-6 bg-gradient-to-r from-blue-600/80 to-transparent z-10"></div>
                                    <div className="pointer-events-none absolute right-0 inset-y-0 w-6 bg-gradient-to-l from-blue-600/80 to-transparent z-10"></div>
                                    <div
                                        ref={scrollContainerRef}
                                        className="flex flex-nowrap items-center gap-3 px-3 overflow-x-auto whitespace-nowrap hide-scroll cursor-grab active:cursor-grabbing select-none"
                                        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                                        onTouchStart={handleInteraction}
                                        onTouchMove={handleInteraction}
                                        onWheel={handleInteraction}
                                        onMouseDown={handleMouseDown}
                                        onMouseMove={handleMouseMove}
                                        onMouseUp={handleMouseUpOrLeave}
                                        onMouseLeave={handleMouseUpOrLeave}
                                    >
                                        {(activeServingTokens.length > 3 ? [...activeServingTokens, ...activeServingTokens] : activeServingTokens).map((t: any, i: number) => (
                                            <div key={`${t.id || t.token_number}-${i}`} className="bg-white/15 hover:bg-white/20 backdrop-blur-md rounded-2xl px-4 py-2.5 sm:py-3 flex flex-col items-center min-w-[88px] shrink-0 border border-white/20 shadow-sm transition-all">
                                                <span className="text-2xl sm:text-[26px] font-black tabular-nums tracking-tight leading-none text-white">{prefix}{t.token_number}</span>
                                                {t.assigned_line !== null && (
                                                    <span className="text-[9.5px] font-bold text-white/90 mt-1.5 uppercase tracking-wider bg-white/20 border border-white/15 px-2.5 py-0.5 rounded-full whitespace-nowrap">Lane {t.assigned_line}</span>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Body */}
                <div className="p-6 space-y-5">
                    {/* Service Hours Badge */}
                    {live?.open_time && live?.close_time && (
                        <div className="flex justify-center -mt-2 mb-2 relative z-10">
                            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/90 backdrop-blur-sm shadow-sm border border-slate-200/60 rounded-full text-xs font-semibold text-slate-600 tracking-wide">
                                <Clock className="w-3.5 h-3.5 text-blue-500" />
                                <span>{formatTime12(live.open_time)} - {formatTime12(live.close_time)}</span>
                            </div>
                        </div>
                    )}

                    {live?.is_paused && (
                        <div role="alert" className="bg-amber-50 text-amber-800 text-sm font-bold p-4 rounded-xl border border-amber-200 shadow-sm animate-pulse flex items-center gap-3">
                            <span className="text-xl">⏸️</span>
                            <div>
                                <p className="mb-0.5 uppercase tracking-wide text-xs text-amber-600">Paused</p>
                                <p>The queue is currently on a break. Service will resume shortly.</p>
                            </div>
                        </div>
                    )}

                    {error && (
                        <div role="alert" className="bg-red-50 text-red-700 text-sm font-medium p-3 rounded-lg border border-red-100">
                            {error}
                        </div>
                    )}

                    {joinData && (
                        /* ── Ticket Card ── */
                        <div className="space-y-4">


                            {/* Announcement */}
                            {live?.announcement && (
                                <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-500">
                                    <div className="flex items-center gap-2 mb-2 text-indigo-800">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z"></path></svg>
                                        <span className="text-xs font-bold uppercase tracking-widest text-indigo-900">Announcement</span>
                                    </div>
                                    <p className="text-sm text-indigo-900 whitespace-pre-wrap">{live.announcement}</p>
                                </div>
                            )}



                            {isNext && !isMyTurn && (
                                <div className="mx-auto w-full max-w-sm mt-4 mb-8 flex flex-col items-center text-center">
                                    {/* Pill Shaped Badge */}
                                    <div className="relative inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-50 border border-emerald-100/80 rounded-full shadow-[0_4px_20px_rgb(16,185,129,0.15)] mb-4">
                                        <div className="absolute inset-0 bg-emerald-400/20 rounded-full animate-pulse"></div>

                                        <style>{`
                                            @keyframes smooth-slide-arrow {
                                                0%, 100% { transform: translateY(-1.5px); }
                                                50% { transform: translateY(2.5px); }
                                            }
                                            .animate-smooth-slide {
                                                animation: smooth-slide-arrow 1.8s ease-in-out infinite;
                                            }
                                        `}</style>

                                        <div className="relative flex items-center justify-center w-6 h-6 rounded-full bg-emerald-500 text-white shadow-sm shrink-0">
                                            <svg className="w-3.5 h-3.5 animate-smooth-slide" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                                            </svg>
                                        </div>

                                        <span className="relative text-[14px] font-black text-emerald-700 tracking-[0.15em] uppercase">You Are Next</span>
                                    </div>

                                    <p className="text-[13px] font-medium text-slate-500 leading-relaxed px-6">
                                        Please come to the counter area right now so you are ready when called.
                                    </p>
                                </div>
                            )}
                            {isSkipped && !isDone && !isMyTurn && !isDeleted && (
                                <div className="mx-auto w-full max-w-sm mt-4 mb-6 text-center">
                                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-amber-50 mb-3 shadow-sm border border-amber-100/50">
                                        <svg className="w-6 h-6 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                    </div>
                                    <h4 className="text-[15px] font-bold text-slate-800 tracking-tight mb-1">Turn Skipped</h4>
                                    <p className="text-[13px] font-medium text-slate-500 leading-relaxed px-4">
                                        Your token was skipped because the queue session has ended. Please see the receptionist or register for a new session.
                                    </p>
                                </div>
                            )}

                            {isDeleted && !isDone && !isMyTurn && (
                                <div className="mx-auto w-full max-w-sm mt-4 mb-6 text-center">
                                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-rose-50 mb-3 shadow-sm border border-rose-100/50">
                                        <svg className="w-6 h-6 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                                        </svg>
                                    </div>
                                    <h4 className="text-[15px] font-bold text-slate-800 tracking-tight mb-1">Ticket Cancelled</h4>
                                    <p className="text-[13px] font-medium text-slate-500 leading-relaxed px-4">
                                        {error ? error :
                                            joinData?.removed_by === "session_end" ? "This queue session has ended. Your token is no longer valid." :
                                                joinData?.removed_by === "staff" ? "Your token has been removed by the staff." :
                                                    "You have successfully cancelled your token."}
                                    </p>
                                </div>
                            )}

                            {/* Premium Ticket Card */}
                            <div className={`bg-white border rounded-3xl text-center shadow-[0_8px_30px_rgb(0,0,0,0.06)] relative transition-all duration-300 ${
                                alreadyServed 
                                    ? "border-slate-200/60 bg-slate-50/30" 
                                    : isSkipped
                                    ? "border-amber-100/80 bg-amber-50/10"
                                    : "border-slate-200/80"
                            }`} aria-label="Your ticket information">
                                <div className="p-6 pb-5 relative">
                                    {/* Ticket decorative notch - left */}
                                    <div className="absolute top-1/2 -left-3 w-6 h-6 bg-white rounded-full border-r border-r-slate-200/80 shadow-inner -translate-y-1/2 z-20"></div>
                                    {/* Ticket decorative notch - right */}
                                    <div className="absolute top-1/2 -right-3 w-6 h-6 bg-white rounded-full border-l border-l-slate-200/80 shadow-inner -translate-y-1/2 z-20"></div>

                                    {alreadyServed ? (
                                        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 border border-emerald-200/70 rounded-full mb-3 shadow-xs">
                                            <svg className="w-3.5 h-3.5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                                            </svg>
                                            <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">Completed • Served</span>
                                        </div>
                                    ) : isMyTurn ? (
                                        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-emerald-50/90 border border-emerald-200/60 rounded-full mb-3 shadow-xs animate-in fade-in zoom-in-95 duration-200">
                                            <span className="relative flex h-2 w-2">
                                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                                            </span>
                                            <span className="text-[11px] font-extrabold text-emerald-700 uppercase tracking-wider">
                                                {myAssignedLine != null ? `It’s Your Turn • Lane ${myAssignedLine}` : "It’s Your Turn • Ready"}
                                            </span>
                                        </div>
                                    ) : isSkipped ? (
                                        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 border border-amber-200/70 rounded-full mb-3 shadow-xs">
                                            <svg className="w-3.5 h-3.5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                            <span className="text-[11px] font-bold text-amber-700 uppercase tracking-wider">Turn Skipped</span>
                                        </div>
                                    ) : (
                                        <div className="flex items-center justify-center gap-2 mb-3">
                                            <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" /></svg>
                                            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Your Ticket</span>
                                        </div>
                                    )}

                                    <div className={`text-[5rem] sm:text-[5.5rem] leading-none font-black tabular-nums tracking-tighter mb-2 ${isMyTurn ? "text-emerald-600" : alreadyServed ? "text-slate-300" : isSkipped ? "text-amber-500/80" : ""}`} style={(!isMyTurn && !alreadyServed && !isSkipped) ? { color: brandColor } : {}}>
                                        {prefix}{myNumber}
                                    </div>

                                    <p aria-live="polite" className={`text-xs sm:text-sm font-semibold tracking-wide ${isMyTurn ? "text-emerald-700" : alreadyServed ? "text-slate-500" : isSkipped ? "text-amber-700" : (!isNext ? "text-slate-500" : "")}`} style={(!isMyTurn && !alreadyServed && !isSkipped && isNext) ? { color: brandColor } : {}}>
                                        {alreadyServed 
                                            ? "Thank you for visiting! Your consultation is complete."
                                            : isSkipped
                                            ? "Your token was skipped because the queue session closed."
                                            : isMyTurn 
                                            ? (myAssignedLine != null ? `Please proceed to Lane ${myAssignedLine} now` : "Please proceed to the counter now") 
                                            : positionMessage}
                                    </p>
                                </div>

                                {/* Dashed divider line for ticket aesthetic */}
                                <div className="mx-6 border-t-2 border-dashed border-slate-100"></div>

                                <div className="p-4 pt-5">
                                    <div className="flex bg-slate-50/50 rounded-2xl border border-slate-100 divide-x divide-slate-100 overflow-hidden text-sm">
                                        <div className="flex-1 py-3.5 flex flex-col items-center justify-center">
                                            <p className="text-slate-400 font-semibold text-[10px] uppercase tracking-wider mb-1.5">Ahead</p>
                                            <p className="text-xl sm:text-2xl font-black text-slate-800 tabular-nums leading-none">
                                                {alreadyServed ? "—" : isMyTurn ? "0" : peopleAhead}
                                            </p>
                                        </div>
                                        <div className="flex-1 py-3.5 flex flex-col items-center justify-center">
                                            <p className="text-slate-400 font-semibold text-[10px] uppercase tracking-wider mb-1.5">Status</p>
                                            <p className={`text-[17px] sm:text-[19px] font-extrabold tracking-tight leading-none ${isMyTurn ? "text-slate-900" : isSkipped ? "text-amber-500" : alreadyServed ? "text-slate-400" : (!isNext ? "text-slate-800" : "")}`} style={isNext ? { color: brandColor } : {}}>
                                                {isMyTurn ? "Serving" : isSkipped ? "Skipped" : alreadyServed ? "Served" : isNext ? "Next" : "Waiting"}
                                            </p>
                                        </div>
                                        {(!isMyTurn && !alreadyServed) ? (
                                            <div className="flex-1 py-3.5 flex flex-col items-center justify-center">
                                                <p className="text-slate-400 font-semibold text-[10px] uppercase tracking-wider mb-1.5">Serving</p>
                                                <p className="text-xl sm:text-2xl font-black text-slate-800 tabular-nums leading-none">
                                                    {activeServingTokens.length > 0
                                                        ? `${prefix}${activeServingTokens[0].token_number}`
                                                        : serving > 0
                                                        ? `${prefix}${serving}`
                                                        : "—"}
                                                </p>
                                            </div>
                                        ) : (isMyTurn && myAssignedLine != null) ? (
                                            <div className="flex-1 py-3.5 flex flex-col items-center justify-center">
                                                <p className="text-slate-400 font-semibold text-[10px] uppercase tracking-wider mb-1.5">Assigned</p>
                                                <p className="text-[17px] sm:text-[19px] font-extrabold text-emerald-600 tracking-tight leading-none">Lane {myAssignedLine}</p>
                                            </div>
                                        ) : null}
                                    </div>
                                </div>


                            </div>

                            <div className="flex justify-center my-4">
                                <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-slate-50/80 border border-slate-200/50 rounded-full shadow-[0_1px_2px_rgb(0,0,0,0.02)]">
                                    {wsStatus === "reconnecting" ? (
                                        <>
                                            <span className="w-3 h-3 border-2 border-amber-300 border-t-amber-600 rounded-full animate-spin" aria-hidden="true" />
                                            <span className="text-[10px] font-bold text-amber-600 uppercase tracking-widest">Reconnecting...</span>
                                        </>
                                    ) : (
                                        <>
                                            <span className="relative flex h-2 w-2">
                                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                                            </span>
                                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Live Updates Active</span>
                                        </>
                                    )}
                                </div>
                            </div>

                            {/* Actions */}
                            {!alreadyServed && !isDeleted && !isSkipped && (
                                <div className="pt-5 border-t border-slate-200/80 space-y-3">
                                    {/* Share Action Button */}
                                    <button
                                        onClick={handleShare}
                                        disabled={isSharing}
                                        className={`group relative w-full flex items-center justify-center gap-2.5 py-3.5 text-white font-bold uppercase tracking-wider text-[12px] rounded-xl shadow-md active:opacity-80 transition-all duration-200 disabled:opacity-50 ${
                                            isCopied ? "bg-emerald-600 shadow-emerald-600/20" : ""
                                        }`}
                                        style={!isCopied ? { backgroundColor: `color-mix(in srgb, ${brandColor}, black 20%)` } : {}}
                                    >
                                        {isCopied ? (
                                            <>
                                                <svg className="w-4 h-4 animate-in zoom-in-75 duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" /></svg>
                                                <span>Tracking Link Copied!</span>
                                            </>
                                        ) : (
                                            <>
                                                <Share2 className="w-4 h-4" />
                                                <span>Share Tracking Link</span>
                                            </>
                                        )}
                                    </button>

                                    {/* Leave Queue Action Button */}
                                    {!isMyTurn && (
                                        <button
                                            onClick={handleCancelRequest}
                                            disabled={isCancelling}
                                            className="w-full flex items-center justify-center gap-2 py-3 bg-transparent text-rose-400 active:opacity-60 font-bold uppercase tracking-wider text-[11px] rounded-xl transition-all duration-200 disabled:opacity-50 mt-1"
                                        >
                                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"></path></svg>
                                            <span>Cancel Ticket</span>
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>

                    )}
                </div>
            </div>

            {/* Footer Branding */}
            <div className="mt-10 mb-6 flex items-center justify-center">
                <div className="flex items-center gap-1.5 opacity-60 hover:opacity-100 transition-opacity cursor-default">
                    <span className="text-[11px] font-medium text-slate-500">Powered by</span>
                    <span className="font-bold text-slate-800 text-[11px] tracking-wide">Q4QUEUE</span>
                </div>
            </div>

            <ConfirmModal
                isOpen={showCancelConfirm}
                title="Leave Queue?"
                message="Are you sure you want to leave the queue? Your ticket will be cancelled and you will lose your position."
                confirmLabel="Yes, Leave Queue"
                confirmVariant="danger"
                onConfirm={handleConfirmCancel}
                onCancel={() => setShowCancelConfirm(false)}
                isLoading={isCancelling}
            />
        </main>
    );
}
