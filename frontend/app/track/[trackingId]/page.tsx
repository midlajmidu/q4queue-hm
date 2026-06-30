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

            const audio = new Audio("/sounds/ringtone-you-would-be-glad-to-know.mp3");
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

    // ── Fetch Tracking Info on Mount ────────────────────────
    useEffect(() => {
        let mounted = true;
        const fetchTracking = async () => {
            try {
                const info = await api.getTrackingInfo(trackingId);
                if (mounted) {
                    setQueueId(info.queue_id);
                    setJoinData({
                        id: info.token_id,
                        token_number: info.token_number,
                        position: info.position,
                        current_serving: 0, // will be updated by websocket
                        queue_prefix: info.token_prefix,
                        session_id: "", // tracking page doesn't strictly need session validation like join did, but we'll adapt
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
        const url = window.location.href;
        if (navigator.share) {
            try {
                await navigator.share({
                    title: 'My Queue Ticket',
                    text: `Track my live queue position at ${live?.queue_name || 'the queue'}:`,
                    url: url,
                });
            } catch (err) {
                // Ignore AbortError if user cancelled share
                if ((err as Error).name !== 'AbortError') {
                    console.error("Error sharing", err);
                }
            }
        } else {
            navigator.clipboard.writeText(url);
            alert("Tracking link copied to clipboard!");
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
                <div className="px-6 py-7 text-center text-white relative transition-colors duration-500" style={{ backgroundColor: brandColor }}>
                        <div className="absolute top-3 right-3">
                        <ConnectionBadge status={queueClosed ? "disconnected" : wsStatus} />
                    </div>

                    {/* Sound toggle — small speaker icon top-left */}
                    <button
                        onClick={soundEnabled ? handleToggleSound : handleEnableSound}
                        aria-label={soundEnabled ? "Mute sound alerts" : "Enable sound alerts"}
                        title={soundEnabled ? "Sound ON — tap to mute" : "Sound OFF — tap to enable"}
                        className="absolute top-3 left-3 w-8 h-8 rounded-full flex items-center justify-center transition-all"
                        style={{ background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.25)" }}
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

                    {fullLogoUrl && (
                        <div className="flex justify-center mb-3">
                            <img 
                                src={fullLogoUrl} 
                                alt="Organization Logo" 
                                className="h-16 object-contain bg-white/10 rounded-lg p-1.5 backdrop-blur-sm border border-white/20 shadow-sm"
                            />
                        </div>
                    )}

                    <h1 className="text-2xl font-extrabold mb-1">{queueName}</h1>
                    <p className="text-white/80 text-xs font-semibold uppercase tracking-widest">
                        {queueClosed ? "Currently Closed" : "Now Serving"}
                    </p>

                    {activeServingTokens.length === 0 ? (
                        <div className="mt-4 text-6xl font-black tabular-nums tracking-tight py-4 bg-white/10 rounded-xl border border-white/20">
                            —
                        </div>
                    ) : activeServingTokens.length === 1 ? (
                        <div className="mt-4 text-6xl font-black tabular-nums tracking-tight py-4 bg-white/10 rounded-xl border border-white/20" aria-live="polite" aria-atomic="true" aria-label={`Currently serving token ${prefix}${activeServingTokens[0].token_number}`}>
                            {prefix}{activeServingTokens[0].token_number}
                        </div>
                    ) : activeServingTokens.length <= 3 ? (
                        <div className="mt-4 py-3 bg-white/10 rounded-xl border border-white/20 px-4" aria-live="polite" aria-atomic="true" aria-label={`Currently serving tokens: ${activeServingTokens.map((t: any) => `${prefix}${t.token_number}`).join(', ')}`}>
                            <div className="flex flex-nowrap items-center justify-center gap-4">
                                {activeServingTokens.map((t: any) => (
                                    <div key={t.id || t.token_number} className="bg-white/25 backdrop-blur-sm rounded-lg px-4 py-2 flex flex-col items-center min-w-[80px] shrink-0">
                                        <span className="text-3xl font-black tabular-nums tracking-tight leading-none text-white">{prefix}{t.token_number}</span>
                                        {t.assigned_line !== null && (
                                            <span className="text-[10px] font-bold text-white/90 mt-1 uppercase tracking-wider bg-black/20 px-2 py-0.5 rounded-full whitespace-nowrap">Line {t.assigned_line}</span>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="mt-4 overflow-hidden w-full relative py-2 bg-white/10 rounded-xl border border-white/20" aria-live="polite" aria-atomic="true" aria-label={`Currently serving tokens: ${activeServingTokens.map((t: any) => `${prefix}${t.token_number}`).join(', ')}`}>
                            <style>{`
                                .hide-scroll::-webkit-scrollbar { display: none; }
                            `}</style>
                            <div 
                                ref={scrollContainerRef}
                                className="flex flex-nowrap items-center gap-4 px-4 overflow-x-auto whitespace-nowrap hide-scroll cursor-grab active:cursor-grabbing select-none"
                                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                                onTouchStart={handleInteraction}
                                onTouchMove={handleInteraction}
                                onWheel={handleInteraction}
                                onMouseDown={handleMouseDown}
                                onMouseMove={handleMouseMove}
                                onMouseUp={handleMouseUpOrLeave}
                                onMouseLeave={handleMouseUpOrLeave}
                            >
                                {(activeServingTokens.length > 3 ? [...activeServingTokens, ...activeServingTokens] : activeServingTokens).map((t: any, idx: number) => (
                                    <div key={`${t.id || t.token_number}-${idx}`} className="bg-white/25 backdrop-blur-sm rounded-lg px-4 py-2 flex flex-col items-center min-w-[80px] shrink-0">
                                        <span className="text-3xl font-black tabular-nums tracking-tight leading-none text-white">{prefix}{t.token_number}</span>
                                        {t.assigned_line !== null && (
                                            <span className="text-[10px] font-bold text-white/90 mt-1 uppercase tracking-wider bg-black/20 px-2 py-0.5 rounded-full whitespace-nowrap">Line {t.assigned_line}</span>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="mt-3 flex justify-center gap-6 text-xs text-blue-200">
                        <span>Waiting: <strong className="text-white">{live?.waiting_count ?? "—"}</strong></span>
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



                            {isMyTurn && (
                                <div role="alert" className="bg-emerald-50 text-emerald-800 p-4 rounded-xl border-2 border-emerald-300 text-center font-bold text-lg animate-pulse">
                                    🎉 It&apos;s your turn!
                                    {myAssignedLine != null ? (
                                        <div className="mt-2 text-2xl font-black text-emerald-700">
                                            Proceed to <span className="bg-emerald-700 text-white px-3 py-1 rounded-lg">Line {myAssignedLine}</span>
                                        </div>
                                    ) : (
                                        <div className="mt-1 text-base font-semibold text-emerald-700">Please proceed to the counter.</div>
                                    )}
                                </div>
                            )}
                            {isNext && !isMyTurn && (
                                <div role="status" className="bg-blue-50 text-blue-800 p-4 rounded-xl border border-blue-200 text-center font-bold text-base">
                                    ⏳ You are next! Get ready.
                                </div>
                            )}
                            {isSkipped && !isDone && !isMyTurn && !isDeleted && (
                                <div className="bg-amber-50 text-amber-600 p-4 rounded-xl border border-amber-200 text-center text-sm">
                                    Your token was skipped. Please see the receptionist.
                                </div>
                            )}
                            {isDeleted && !isDone && !isMyTurn && (
                                <div className="bg-red-50 text-red-600 p-4 rounded-xl border border-red-200 text-center text-sm">
                                    {error ? error : joinData?.removed_by === "session_end" ? "This queue session has ended. Your token is no longer valid." : "Your token has been removed from the waiting list."}
                                </div>
                            )}
                            
                            {alreadyServed && !isSkipped && !isDeleted && (
                                <div className="bg-gray-50 text-gray-600 p-4 rounded-xl border border-gray-200 text-center text-sm">
                                    Your token has already been served. Thank you for visiting!
                                </div>
                            )}

                            <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 text-center shadow-inner" aria-label="Your ticket information">
                                <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2 flex items-center justify-center gap-2">
                                    Your Ticket
                                </p>
                                <div className={`text-7xl font-black tabular-nums mb-2 ${isMyTurn ? "text-emerald-600" : alreadyServed ? "text-gray-400" : ""}`} style={(!isMyTurn && !alreadyServed) ? { color: brandColor } : {}}>
                                    {prefix}{myNumber}
                                </div>

                                <p aria-live="polite" className={`text-sm font-semibold mb-4 ${isMyTurn ? "text-emerald-600" : alreadyServed ? "text-gray-400" : (!isNext ? "text-gray-600" : "")}`} style={isNext ? { color: brandColor } : {}}>
                                    {positionMessage}
                                </p>

                                <div className="flex bg-white rounded-lg border border-gray-100 divide-x divide-gray-100 overflow-hidden text-sm shadow-sm">
                                    <div className="flex-1 py-3">
                                        <p className="text-gray-400 font-semibold text-[10px] uppercase tracking-wider">Ahead</p>
                                        <p className="text-2xl font-bold text-gray-900 mt-0.5 tabular-nums">
                                            {alreadyServed ? "—" : isMyTurn ? "0" : peopleAhead}
                                        </p>
                                    </div>
                                    <div className="flex-1 py-3">
                                        <p className="text-gray-400 font-semibold text-[10px] uppercase tracking-wider">Status</p>
                                        <p className={`text-sm font-bold mt-1 ${isMyTurn ? "text-emerald-600" : isSkipped ? "text-amber-500" : alreadyServed ? "text-gray-400" : (!isNext ? "text-amber-600" : "")}`} style={isNext ? { color: brandColor } : {}}>
                                            {isMyTurn ? "YOUR TURN" : isSkipped ? "Skipped" : alreadyServed ? "Served" : isNext ? "NEXT" : "Waiting"}
                                        </p>
                                    </div>
                                    <div className="flex-1 py-3">
                                        <p className="text-gray-400 font-semibold text-[10px] uppercase tracking-wider">Serving</p>
                                        <p className="text-2xl font-bold text-gray-900 mt-0.5 tabular-nums">{prefix}{serving}</p>
                                    </div>
                                </div>
                            </div>

                            <p className="text-center text-xs text-gray-400 leading-relaxed">
                                    This page updates automatically. No need to refresh.
                                </p>

                            {wsStatus === "reconnecting" && (
                                <div role="status" className="text-center text-xs text-amber-600 flex items-center justify-center gap-1.5 py-2">
                                    <span className="w-3 h-3 border-2 border-amber-300 border-t-amber-600 rounded-full animate-spin" aria-hidden="true" />
                                    Reconnecting to live updates...
                                </div>
                            )}

                            {/* Cancel / Leave Queue */}
                            <div className="pt-4 border-t border-gray-100 flex flex-col gap-3 sm:flex-row justify-center sm:items-center">
                                <button
                                    onClick={handleShare}
                                    className="text-xs font-bold text-blue-600 hover:text-blue-800 hover:bg-blue-50 px-4 py-2 rounded-lg transition-all flex items-center justify-center gap-2"
                                >
                                    <Share2 className="w-3.5 h-3.5" />
                                    Share Tracking Link
                                </button>
                                
                                {!alreadyServed && !isMyTurn && (
                                    <button
                                        onClick={handleCancelRequest}
                                        disabled={isCancelling}
                                        className="text-xs font-bold text-red-500 hover:text-red-700 hover:bg-red-50 px-4 py-2 rounded-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                                    >
                                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                                        {isCancelling ? "Cancelling..." : "Leave Queue / Cancel Ticket"}
                                    </button>
                                )}
                            </div>
                        </div>
                    
                    )}
                </div>
            </div>

            {/* Footer Branding */}
            <div className="mt-6 flex items-center justify-center">
                <span className="text-[10px] font-medium tracking-[0.2em] text-slate-400 uppercase flex items-center gap-1.5">
                    Powered by{" "}
                    <span className="font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-cyan-500 text-xs tracking-widest">Q4QUEUE</span>
                </span>
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
