"use client";

import React, { use, useState, useEffect, useCallback, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import { useQueueSocket } from "@/hooks/useQueueSocket";
import { Clock } from "lucide-react";
import ConnectionBadge from "@/components/ConnectionBadge";
import type { JoinResponse, TokenStatus } from "@/types/api";

interface PageProps {
    params: Promise<{ queueId: string }>;
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

// ── WhatsApp Consent Modal ────────────────────────────────────────────────────
interface WhatsAppConsentModalProps {
    brandColor: string;
    onConfirm: (sendWhatsApp: boolean) => void;
    onClose: () => void;
}

function WhatsAppConsentModal({ brandColor, onConfirm, onClose }: WhatsAppConsentModalProps) {
    return (
        <>
            {/* Backdrop */}
            <div
                onClick={onClose}
                style={{
                    position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)",
                    zIndex: 40, backdropFilter: "blur(2px)",
                    animation: "fadeIn 0.15s ease"
                }}
            />
            {/* Bottom sheet */}
            <div style={{
                position: "fixed", bottom: 0, left: 0, right: 0,
                background: "#fff", borderRadius: "24px 24px 0 0",
                padding: "28px 24px 36px",
                zIndex: 50, maxWidth: 480, margin: "0 auto",
                animation: "slideUp 0.25s cubic-bezier(0.32, 0.72, 0, 1)"
            }}>
                {/* Handle bar */}
                <div style={{
                    width: 40, height: 4, background: "#e2e8f0",
                    borderRadius: 4, margin: "0 auto 24px"
                }} />

                {/* WhatsApp icon + heading */}
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, marginBottom: 20 }}>
                    <div style={{
                        width: 56, height: 56, borderRadius: "50%",
                        background: "linear-gradient(135deg, #25D366 0%, #128C7E 100%)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        boxShadow: "0 4px 16px rgba(37,211,102,0.35)"
                    }}>
                        <svg width={28} height={28} viewBox="0 0 24 24" fill="#fff">
                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
                            <path d="M12 0C5.373 0 0 5.373 0 12c0 2.127.558 4.126 1.528 5.855L0 24l6.334-1.506A11.94 11.94 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.818 9.818 0 01-5.015-1.374l-.36-.214-3.729.887.916-3.629-.236-.374A9.818 9.818 0 1112 21.818z" />
                        </svg>
                    </div>
                    <div style={{ textAlign: "center" }}>
                        <h3 style={{ fontSize: 18, fontWeight: 700, color: "#0f172a", margin: 0 }}>
                            Get WhatsApp Updates?
                        </h3>
                        <p style={{ fontSize: 13.5, color: "#64748b", marginTop: 6, lineHeight: 1.5 }}>
                            We'll send your token details and queue status updates to your WhatsApp number.
                        </p>
                    </div>
                </div>

                {/* Buttons */}
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    <button
                        onClick={() => onConfirm(true)}
                        style={{
                            width: "100%", padding: "14px 0",
                            background: "linear-gradient(135deg, #25D366 0%, #128C7E 100%)",
                            color: "#fff", fontWeight: 700, fontSize: 15,
                            border: "none", borderRadius: 14, cursor: "pointer",
                            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                            boxShadow: "0 4px 14px rgba(37,211,102,0.35)",
                            transition: "transform 0.1s, box-shadow 0.1s"
                        }}
                    >
                        <svg width={18} height={18} viewBox="0 0 24 24" fill="#fff">
                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
                            <path d="M12 0C5.373 0 0 5.373 0 12c0 2.127.558 4.126 1.528 5.855L0 24l6.334-1.506A11.94 11.94 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.818 9.818 0 01-5.015-1.374l-.36-.214-3.729.887.916-3.629-.236-.374A9.818 9.818 0 1112 21.818z" />
                        </svg>
                        Yes, send me updates
                    </button>

                    <button
                        onClick={() => onConfirm(false)}
                        style={{
                            width: "100%", padding: "14px 0",
                            background: "#f8fafc", color: "#475569",
                            fontWeight: 600, fontSize: 15,
                            border: "1.5px solid #e2e8f0", borderRadius: 14,
                            cursor: "pointer", transition: "background 0.15s"
                        }}
                    >
                        No thanks, skip
                    </button>
                </div>
            </div>

            <style>{`
                @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
                @keyframes slideUp { from { transform: translateY(100%) } to { transform: translateY(0) } }
            `}</style>
        </>
    );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function JoinQueuePage({ params }: PageProps) {
    const rawQueueId = use(params).queueId;
    const queueId = rawQueueId.length >= 36 ? rawQueueId.slice(-36) : rawQueueId;
    const router = useRouter();
    const searchParams = useSearchParams();
    const [qrToken, setQrToken] = useState<string | null>(null);

    useEffect(() => {
        const errorParam = searchParams.get("error");
        if (errorParam === "expired_qr") {
            setError("This QR code has expired or is no longer valid. Please scan the current active QR code on the display screen.");
        } else if (errorParam === "inactive") {
            setError("This queue is currently inactive or closed. Please ask staff for assistance.");
        }

        const token = searchParams.get("qrToken");
        if (token) {
            setQrToken(token);
            sessionStorage.setItem(`qr_token_${queueId}`, token);
            // Hide token from URL bar for visual security
            window.history.replaceState({}, "", window.location.pathname);
        } else {
            // Check if it was saved in this tab's session (survives refreshes, but not link sharing)
            const savedToken = sessionStorage.getItem(`qr_token_${queueId}`);
            if (savedToken) {
                setQrToken(savedToken);
            }
        }
    }, [searchParams, queueId]);


    const { state: live, status: wsStatus } = useQueueSocket(queueId);

    const [joinData, setJoinData] = useState<JoinResponse | null>(null);
    const [isJoining, setIsJoining] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);

    // ── Customer form state ──────────────────────────────────────
    const [customerName, setCustomerName] = useState("");
    const [debouncedCustomerName, setDebouncedCustomerName] = useState("");
    useEffect(() => {
        const t = setTimeout(() => setDebouncedCustomerName(customerName), 800);
        return () => clearTimeout(t);
    }, [customerName]);
    const [countryCode, setCountryCode] = useState("+91");
    const [customerPhone, setCustomerPhone] = useState("");
    const [showCompanions, setShowCompanions] = useState<boolean>(false);
    const [companionInput, setCompanionInput] = useState<string>("1");
    const paxCount = parseInt(companionInput) || 0;
    const [customData, setCustomData] = useState<Record<string, any>>({});

    // Derived values
    const isNameValid = /^[A-Za-z\s'-]{2,50}$/.test(customerName.trim());
    const isPhoneValid = /^\d{10}$/.test(customerPhone);
    const isLegacyFormValid = isNameValid && isPhoneValid && companionInput.trim() !== "";
    const hasCustomFieldsConfigured = Array.isArray(live?.custom_fields);
    const customFieldsList = live?.custom_fields || [];
    const isFormValid = hasCustomFieldsConfigured
        ? (customFieldsList.length > 0 && !customFieldsList.some(f => f.required && !customData[f.key]))
        : isLegacyFormValid;

    // Called after WhatsApp consent answer
    const doJoin = useCallback(async (sendWhatsApp: boolean) => {
        setShowWhatsAppModal(false);
        setIsJoining(true);
        setError(null);

        try {
            const resolvedName = customData['name'] || customData['full_name'] || customerName.trim() || 'Walk-in Customer';
            const rawPhone = customData['phone'] || customData['phone_number'] || customerPhone;
            const resolvedPhone = rawPhone ? `${countryCode}${rawPhone.replace(/\D/g, "")}` : '+910000000000';
            const resolvedPax = parseInt(customData['pax'] || customData['group_size'] || String(paxCount)) || 1;

            const payload = {
                name: resolvedName,
                phone: resolvedPhone,
                pax_count: resolvedPax,
                send_whatsapp: sendWhatsApp,
                qr_token: qrToken || undefined,
                custom_data: hasCustomFieldsConfigured ? customData : undefined
            };

            const data = await api.joinQueue(queueId, payload);

            if (data.is_existing && data.tracking_id) {
                router.push(`/track/${data.tracking_id}`);
                return;
            }

            saveTokenToStorage(queueId, data.id);
            if (data.tracking_id) {
                router.push(`/track/${data.tracking_id}`);
            } else {
                setJoinData(data);
            }
        } catch (err: unknown) {
            setError(err instanceof ApiError ? err.detail : "Failed to join queue. Please try again.");
            setIsJoining(false);
        }
    }, [isLegacyFormValid, isJoining, customerName, customerPhone, paxCount, queueId, router, customData, hasCustomFieldsConfigured]);

    // Clicking the button → show modal first
    const handleJoin = useCallback(() => {
        if (isJoining) return;
        if (live?.is_past_session === true) {
            setError("This QR code is expired. The session is closed. Please scan today's active QR code.");
            return;
        }
        if (hasCustomFieldsConfigured) {
            if (customFieldsList.length === 0) {
                setError("Queue registration is currently unavailable because no input fields are configured.");
                return;
            }
            for (const field of customFieldsList) {
                if (field.required && !customData[field.key]) {
                    setError(`Please fill out the required field: ${field.label}`);
                    return;
                }
            }
        } else {
            if (!isLegacyFormValid) return;
        }
        setError(null);
        setShowWhatsAppModal(true);
    }, [isLegacyFormValid, isJoining, live, hasCustomFieldsConfigured, customFieldsList, customData]);


    // ── Restore from localStorage on mount ────────────────────────
    useEffect(() => {
        const tokenId = getTokenFromStorage(queueId);
        if (!tokenId) return;

        let mounted = true;
        const attemptRestore = async () => {
            try {
                const restored = await api.restoreToken(tokenId);

                // If it belongs to a different queue, ignore it
                if (restored.queue_id !== queueId) {
                    clearTokenFromStorage(queueId);
                    return;
                }

                if (restored.status === "waiting" || restored.status === "serving") {
                    if (restored.tracking_id) {
                        router.push(`/track/${restored.tracking_id}`);
                        return;
                    }
                } else {
                    // Token finished or skipped — clear it
                    clearTokenFromStorage(queueId);
                }
            } catch (err) {
                // If 404, the token is gone
                if (err instanceof ApiError && err.status === 404) {
                    clearTokenFromStorage(queueId);
                }
            }
        };

        attemptRestore();
        return () => { mounted = false; };
    }, [queueId]);

    const isPastSession = live?.is_past_session === true;
    const queueClosed = live?.is_active === false || isPastSession;
    const queuePaused = live?.is_paused === true;
    const queueName = live?.queue_name || "Queue";
    const prefix = live?.prefix || joinData?.queue_prefix || "";
    const serving = live?.current_serving ?? 0;
    const activeServingTokens = live?.all_serving_tokens ?? [];


    const brandColor = live?.org_brand_color || '#2563eb';
    const logoUrl = live?.org_logo_url;
    const fullLogoUrl = logoUrl ? (logoUrl.startsWith('http') ? logoUrl : process.env.NEXT_PUBLIC_API_URL ? `${process.env.NEXT_PUBLIC_API_URL}${logoUrl}` : `https://amoebaq.com/api/v1${logoUrl}`) : null;

    // ── Marquee auto-scroll logic ────────────────────────────────────────────────
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const [isInteracting, setIsInteracting] = useState(false);
    const isDragging = useRef(false);
    const startX = useRef(0);
    const scrollLeft = useRef(0);

    const handleInteraction = useCallback(() => {
        setIsInteracting(true);
    }, []);

    const handleMouseDown = (e: React.MouseEvent) => {
        isDragging.current = true;
        startX.current = e.pageX - (scrollContainerRef.current?.offsetLeft || 0);
        scrollLeft.current = scrollContainerRef.current?.scrollLeft || 0;
        handleInteraction();
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isDragging.current || !scrollContainerRef.current) return;
        e.preventDefault();
        const x = e.pageX - scrollContainerRef.current.offsetLeft;
        const walk = (x - startX.current) * 2;
        scrollContainerRef.current.scrollLeft = scrollLeft.current - walk;
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

    return (
        <>
            {/* WhatsApp Consent Modal */}
            {showWhatsAppModal && (
                <WhatsAppConsentModal
                    brandColor={brandColor}
                    onConfirm={doJoin}
                    onClose={() => setShowWhatsAppModal(false)}
                />
            )}

            <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center p-4">
                <div className="bg-white max-w-md w-full rounded-2xl shadow-xl overflow-hidden">
                    {/* Header */}
                    <div
                        className="px-4 sm:px-6 py-6 sm:py-8 text-center text-white relative overflow-hidden transition-colors duration-500"
                        style={{ backgroundColor: brandColor }}
                    >
                        {/* Decorative subtle lighting effect */}
                        <div className="absolute inset-0 opacity-30" style={{ backgroundImage: 'radial-gradient(circle at top right, rgba(255,255,255,0.4), transparent 60%)' }}></div>

                        <div className="relative z-10">
                            <div className="absolute top-0 right-0">
                                <ConnectionBadge status={queueClosed ? "disconnected" : wsStatus} />
                            </div>

                            {fullLogoUrl && (
                                <div className="flex justify-center mb-3 mt-1">
                                    <div className="bg-white/10 backdrop-blur-md border border-white/20 p-2 rounded-2xl shadow-xl">
                                        <img src={fullLogoUrl} alt="Organization Logo" className="h-10 object-contain" />
                                    </div>
                                </div>
                            )}

                            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white mb-1 drop-shadow-md">{queueName}</h1>
                            <p className="text-[10px] sm:text-xs font-semibold tracking-[0.25em] uppercase text-white/70 mb-4">
                                {queueClosed ? "Currently Closed" : "Now Serving"}
                            </p>

                            <div className="relative mx-auto w-full">
                                {activeServingTokens.length === 0 ? (
                                    <div className="relative mx-auto w-full max-w-[200px]">
                                        <div className="absolute -inset-1 bg-white/10 blur-xl rounded-2xl opacity-50"></div>
                                        <div className="relative text-5xl sm:text-6xl font-black tabular-nums tracking-tighter py-3 sm:py-4 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 shadow-2xl flex items-center justify-center min-h-[80px] sm:min-h-[100px]">
                                            —
                                        </div>
                                    </div>
                                ) : activeServingTokens.length === 1 ? (
                                    <div className="relative mx-auto w-full max-w-[200px]">
                                        <div className="absolute -inset-1 bg-white/10 blur-xl rounded-2xl opacity-50"></div>
                                        <div className="relative text-4xl sm:text-5xl font-black tabular-nums tracking-tighter py-3 sm:py-4 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 shadow-2xl flex items-center justify-center min-h-[80px] sm:min-h-[100px] px-4 text-center break-words break-all" aria-live="polite" aria-atomic="true" aria-label={`Currently serving token ${prefix}${activeServingTokens[0].token_number}`}>
                                            {prefix}{activeServingTokens[0].token_number}
                                        </div>
                                    </div>
                                ) : activeServingTokens.length <= 3 ? (
                                    <div className="mt-2 py-3 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 shadow-2xl px-4 relative">
                                        <div className="absolute -inset-1 bg-white/10 blur-xl rounded-2xl opacity-50"></div>
                                        <div className="relative flex flex-wrap items-center justify-center gap-3 sm:gap-4">
                                            {activeServingTokens.map((t: any) => (
                                                <div key={t.id || t.token_number} className="bg-white/10 backdrop-blur-sm rounded-lg px-3 py-2 sm:px-4 flex flex-col items-center min-w-[80px] shrink-0 border border-white/5 max-w-full">
                                                    <span className="text-2xl sm:text-3xl font-black tabular-nums tracking-tight leading-none text-white break-words break-all text-center">{prefix}{t.token_number}</span>
                                                    {t.assigned_line !== null && (
                                                        <span className="text-[10px] font-bold text-white/90 mt-1 uppercase tracking-wider bg-black/30 px-2 py-0.5 rounded-full whitespace-nowrap">Lane {t.assigned_line}</span>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="mt-2 overflow-hidden w-full relative py-3 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 shadow-2xl" aria-live="polite" aria-atomic="true" aria-label={`Currently serving tokens: ${activeServingTokens.map((t: any) => `${prefix}${t.token_number}`).join(', ')}`}>
                                        <style>{`
                                            .hide-scroll::-webkit-scrollbar { display: none; }
                                        `}</style>
                                        <div className="absolute -inset-1 bg-white/10 blur-xl rounded-2xl opacity-50"></div>
                                        <div
                                            ref={scrollContainerRef}
                                            className="relative flex flex-nowrap items-center gap-4 px-4 overflow-x-auto whitespace-nowrap hide-scroll cursor-grab active:cursor-grabbing select-none"
                                            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                                            onMouseDown={handleMouseDown}
                                            onMouseUp={handleMouseUpOrLeave}
                                            onMouseLeave={handleMouseUpOrLeave}
                                            onMouseMove={handleMouseMove}
                                            onTouchStart={handleInteraction}
                                        >
                                            {(activeServingTokens.length > 3 ? [...activeServingTokens, ...activeServingTokens] : activeServingTokens).map((t: any, i: number) => (
                                                <div key={`${t.id || t.token_number}-${i}`} className="bg-white/10 backdrop-blur-sm rounded-lg px-3 py-2 sm:px-4 flex flex-col items-center min-w-[80px] shrink-0 mx-2 border border-white/5">
                                                    <span className="text-xl sm:text-2xl font-black tabular-nums tracking-tight leading-none text-white">{prefix}{t.token_number}</span>
                                                    {t.assigned_line !== null && (
                                                        <span className="text-[10px] font-bold text-white/90 mt-1 uppercase tracking-wider bg-black/30 px-2 py-0.5 rounded-full whitespace-nowrap">Lane {t.assigned_line}</span>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="mt-4 flex justify-center">
                                <div className="px-4 py-1.5 bg-white/10 backdrop-blur-md rounded-full border border-white/20 text-xs font-medium text-white shadow-sm flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-white/50 animate-pulse"></span>
                                    Waiting: <strong className="text-white ml-0.5">{live?.waiting_count ?? "—"}</strong>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Body */}
                    <div className="p-4 sm:p-6 space-y-4">
                        {/* Service Hours Badge */}
                        {live?.open_time && live?.close_time && (
                            <div className="flex justify-center -mt-2 mb-1 relative z-10">
                                <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/90 backdrop-blur-sm shadow-sm border border-slate-200/60 rounded-full text-[11px] font-semibold text-slate-600 tracking-wide">
                                    <Clock className="w-3 h-3 text-blue-500" />
                                    <span>{formatTime12(live.open_time)} - {formatTime12(live.close_time)}</span>
                                </div>
                            </div>
                        )}
                        {error && (
                            <div role="alert" className="bg-red-50 text-red-700 text-xs font-medium p-3 rounded-lg border border-red-100">
                                {error}
                            </div>
                        )}

                        {/* ── Past Session Closed State Card or Customer Form ── */}
                        {isPastSession ? (
                            <div className="bg-rose-50/90 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 rounded-3xl p-6 sm:p-7 text-center my-2 shadow-sm">
                                <div className="w-14 h-14 bg-rose-100 dark:bg-rose-900/60 text-rose-600 dark:text-rose-400 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-rose-200/80">
                                    <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                                </div>
                                <h3 className="text-base sm:text-lg font-bold text-rose-900 dark:text-rose-200 mb-2">QR Code Invalid / Expired</h3>
                                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed max-w-sm mx-auto mb-4">
                                    This QR code is no longer valid because it belongs to a past queue session {live?.session_date ? `(${live.session_date})` : ""}. Registration for this session has been strictly disabled.
                                </p>
                                <div className="bg-white/80 dark:bg-slate-900/60 rounded-2xl p-4 border border-rose-200/60 text-xs text-slate-600 dark:text-slate-400 font-medium text-left leading-relaxed">
                                    <strong className="text-rose-900 dark:text-rose-300 block mb-1">⚠️ Action Required:</strong>
                                    Please scan today's active QR code on the branch/clinic display screen or ask staff for assistance to join today's active queue.
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {/* Info text */}
                                <div className="text-center px-2">
                                    <h2 className="text-lg font-black text-slate-900 tracking-tight mb-1">Welcome</h2>
                                    <p className="text-slate-500 text-xs leading-relaxed">
                                        Please enter your details below to secure your position.
                                    </p>
                                </div>

                            {/* Customer info form */}
                            <div className="space-y-3.5">
                                {hasCustomFieldsConfigured ? (
                                    customFieldsList.length === 0 ? (
                                        <div className="bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/60 rounded-2xl p-5 text-center my-2">
                                            <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900/50 text-amber-600 dark:text-amber-400 rounded-full flex items-center justify-center mx-auto mb-3">
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                                            </div>
                                            <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-1">Registration Unavailable</h4>
                                            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                                                No registration fields have been configured for this queue by the branch administrator. Please contact staff for assistance.
                                            </p>
                                        </div>
                                    ) : (
                                        customFieldsList.slice().sort((a, b) => a.order - b.order).map((field) => (
                                            <div key={field.id}>
                                                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 ml-1">
                                                    {field.label} {field.required && <span className="text-emerald-500 ml-0.5">*</span>}
                                                </label>

                                                {field.type === 'textarea' ? (
                                                    <textarea
                                                        value={customData[field.key] || ""}
                                                        onChange={e => setCustomData({ ...customData, [field.key]: e.target.value })}
                                                        disabled={isJoining || queueClosed}
                                                        className="w-full px-4 sm:px-5 py-3 sm:py-3.5 bg-white text-slate-900 placeholder-slate-400 text-sm sm:text-[15px] font-medium rounded-xl sm:rounded-2xl border border-slate-200/80 focus:border-slate-800 focus:ring-slate-100 focus:ring-4 transition-all duration-300 shadow-[0_2px_10px_rgb(0,0,0,0.02)] outline-none resize-none h-24 disabled:opacity-50"
                                                        placeholder={`Enter ${field.label}`}
                                                    />
                                                ) : field.type === 'select' ? (
                                                    <div className="relative">
                                                        <select
                                                            value={customData[field.key] || ""}
                                                            onChange={e => setCustomData({ ...customData, [field.key]: e.target.value })}
                                                            disabled={isJoining || queueClosed}
                                                            className="w-full px-4 sm:px-5 py-3 sm:py-3.5 bg-white text-slate-900 text-sm sm:text-[15px] font-medium rounded-xl sm:rounded-2xl border border-slate-200/80 focus:border-slate-800 focus:ring-slate-100 focus:ring-4 transition-all duration-300 shadow-[0_2px_10px_rgb(0,0,0,0.02)] outline-none appearance-none disabled:opacity-50"
                                                        >
                                                            <option value="" disabled>Select {field.label}</option>
                                                            {field.options?.map(opt => (
                                                                <option key={opt} value={opt}>{opt}</option>
                                                            ))}
                                                        </select>
                                                        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                                                        </div>
                                                    </div>
                                                ) : field.type === 'phone' ? (
                                                    <div className="flex bg-white rounded-xl sm:rounded-2xl shadow-[0_2px_10px_rgb(0,0,0,0.02)] border border-slate-200/80 focus-within:border-slate-800 focus-within:ring-slate-100 focus-within:ring-4 transition-all duration-300 overflow-hidden">
                                                        <div className="relative flex items-center border-r border-slate-100 bg-transparent">
                                                            <select
                                                                value={countryCode}
                                                                onChange={(e) => setCountryCode(e.target.value)}
                                                                disabled={isJoining || queueClosed}
                                                                className="appearance-none bg-transparent pl-4 sm:pl-5 pr-8 py-3 sm:py-3.5 text-sm sm:text-[15px] font-medium text-slate-600 focus:outline-none cursor-pointer disabled:opacity-50"
                                                            >
                                                                {COUNTRY_CODES.map((c) => (
                                                                    <option key={c.code} value={c.code}>
                                                                        {c.flag} {c.code}
                                                                    </option>
                                                                ))}
                                                            </select>
                                                            <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                                                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                                                            </div>
                                                        </div>
                                                        <input
                                                            type="tel"
                                                            value={customData[field.key] || ""}
                                                            onChange={e => setCustomData({ ...customData, [field.key]: e.target.value.replace(/\D/g, "").slice(0, 10) })}
                                                            disabled={isJoining || queueClosed}
                                                            placeholder="e.g. 1234567890"
                                                            maxLength={10}
                                                            className="w-full px-4 sm:px-5 py-3 sm:py-3.5 bg-transparent text-slate-900 placeholder-slate-400 text-sm sm:text-[15px] font-medium focus:outline-none disabled:opacity-50"
                                                        />
                                                    </div>
                                                ) : (
                                                    <input
                                                        type={field.type === 'number' ? 'number' : field.type === 'email' ? 'email' : field.type === 'date' ? 'date' : 'text'}
                                                        min={field.type === 'number' ? 1 : undefined}
                                                        max={field.type === 'number' ? 999 : undefined}
                                                        value={customData[field.key] || ""}
                                                        onChange={e => {
                                                            let val = e.target.value;
                                                            if (field.type === 'number' && val.length > 3) {
                                                                val = val.slice(0, 3);
                                                            }
                                                            setCustomData({ ...customData, [field.key]: val });
                                                        }}
                                                        disabled={isJoining || queueClosed}
                                                        placeholder={`Enter ${field.label}`}
                                                        className="w-full px-4 sm:px-5 py-3 sm:py-3.5 bg-white text-slate-900 placeholder-slate-400 text-sm sm:text-[15px] font-medium rounded-xl sm:rounded-2xl border border-slate-200/80 focus:border-slate-800 focus:ring-slate-100 focus:ring-4 transition-all duration-300 shadow-[0_2px_10px_rgb(0,0,0,0.02)] outline-none disabled:opacity-50"
                                                    />
                                                )}
                                            </div>
                                        ))
                                    )
                                ) : (
                                    <>
                                        {/* Default Fields: Name, Phone, Pax */}
                                        <div>
                                            <label htmlFor="customer-name" className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 ml-1">
                                                Full Name <span className="text-emerald-500 ml-0.5">*</span>
                                            </label>
                                            <input
                                                id="customer-name"
                                                type="text"
                                                value={customerName}
                                                onChange={(e) => setCustomerName(e.target.value)}
                                                placeholder="Enter your name"
                                                required
                                                maxLength={50}
                                                autoComplete="name"
                                                disabled={isJoining || queueClosed}
                                                className="w-full px-4 sm:px-5 py-3 sm:py-3.5 bg-white border border-slate-200/80 focus:border-slate-800 focus:ring-slate-100 rounded-xl sm:rounded-2xl text-slate-900 placeholder-slate-400 text-sm sm:text-[15px] font-medium shadow-[0_2px_10px_rgb(0,0,0,0.02)] focus:outline-none focus:ring-4 transition-all duration-300 disabled:opacity-50"
                                            />
                                            {debouncedCustomerName.length > 0 && !/^[A-Za-z\s'-]{2,50}$/.test(debouncedCustomerName.trim()) && (
                                                <p className="mt-1.5 text-xs text-red-500 flex items-center gap-1.5 font-medium ml-1" role="alert">
                                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01" /></svg>
                                                    Please enter a valid name.
                                                </p>
                                            )}
                                        </div>

                                        <div>
                                            <label htmlFor="customer-phone" className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 ml-1">
                                                Phone Number <span className="text-emerald-500 ml-0.5">*</span>
                                            </label>
                                            <div className="flex bg-white rounded-xl sm:rounded-2xl shadow-[0_2px_10px_rgb(0,0,0,0.02)] border border-slate-200/80 focus-within:border-slate-800 focus-within:ring-slate-100 focus-within:ring-4 transition-all duration-300 overflow-hidden">
                                                <div className="relative flex items-center border-r border-slate-100 bg-transparent">
                                                    <select
                                                        value={countryCode}
                                                        onChange={(e) => setCountryCode(e.target.value)}
                                                        disabled={isJoining || queueClosed}
                                                        className="appearance-none bg-transparent pl-4 sm:pl-5 pr-8 py-3 sm:py-3.5 text-sm sm:text-[15px] font-medium text-slate-600 focus:outline-none cursor-pointer disabled:opacity-50"
                                                    >
                                                        {COUNTRY_CODES.map((c) => (
                                                            <option key={c.code} value={c.code}>
                                                                {c.flag} {c.code}
                                                            </option>
                                                        ))}
                                                    </select>
                                                    <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                                                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                                                    </div>
                                                </div>
                                                <input
                                                    id="customer-phone"
                                                    type="tel"
                                                    value={customerPhone}
                                                    onChange={(e) => setCustomerPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                                                    placeholder="e.g. 1234567890"
                                                    required
                                                    maxLength={10}
                                                    disabled={isJoining || queueClosed}
                                                    className="w-full px-4 sm:px-5 py-3 sm:py-3.5 bg-transparent text-slate-900 placeholder-slate-400 text-sm sm:text-[15px] font-medium focus:outline-none disabled:opacity-50"
                                                />
                                            </div>
                                            {customerPhone.length > 0 && !isPhoneValid && (
                                                <p className="mt-1.5 text-xs text-red-500 flex items-center gap-1.5 font-medium ml-1" role="alert">
                                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01" /></svg>
                                                    Please enter a valid 10-digit number.
                                                </p>
                                            )}
                                        </div>

                                        <div>
                                            <label htmlFor="customer-pax" className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 ml-1">
                                                No of Pax <span className="text-emerald-500 ml-0.5">*</span>
                                            </label>
                                            <div className="relative">
                                                <input
                                                    id="customer-pax"
                                                    type="number"
                                                    min="1"
                                                    max="999"
                                                    value={companionInput}
                                                    onChange={(e) => {
                                                        let val = e.target.value;
                                                        if (val.length > 3) {
                                                            val = val.slice(0, 3);
                                                        }
                                                        setCompanionInput(val);
                                                    }}
                                                    placeholder="0"
                                                    required
                                                    disabled={isJoining || queueClosed}
                                                    className="w-full px-4 sm:px-5 py-3 sm:py-3.5 bg-white text-slate-900 placeholder-slate-400 text-sm sm:text-[15px] font-medium rounded-xl sm:rounded-2xl border border-slate-200/80 focus:border-slate-800 focus:ring-slate-100 focus:ring-4 transition-all duration-300 shadow-[0_2px_10px_rgb(0,0,0,0.02)] outline-none disabled:opacity-50"
                                                />
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>

                            {/* Take Token button */}
                            <div className="pt-3">
                                <button
                                    onClick={handleJoin}
                                    disabled={isJoining || queueClosed || queuePaused || !isFormValid}
                                    aria-label={queueClosed ? "Queue is closed" : queuePaused ? "Operator on break" : "Take a token"}
                                    className="group relative w-full py-4 text-white font-black uppercase tracking-widest text-[13px] sm:text-sm rounded-2xl shadow-xl border border-white/20 overflow-hidden hover:-translate-y-1 hover:shadow-2xl focus:outline-none focus-visible:ring-4 focus-visible:ring-slate-500/30 transition-all duration-500 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:-translate-y-0 disabled:hover:shadow-xl"
                                    style={{
                                        backgroundColor: brandColor,
                                        backgroundImage: 'linear-gradient(135deg, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0) 50%, rgba(0,0,0,0.1) 100%)'
                                    }}
                                >
                                    {/* Animated Shimmer */}
                                    <div className="absolute inset-0 -translate-x-[150%] bg-gradient-to-r from-transparent via-white/40 to-transparent group-hover:translate-x-[150%] transition-transform duration-1000 ease-in-out pointer-events-none skew-x-12" />

                                    <span className="relative flex items-center justify-center gap-2.5">
                                        {isJoining ? (
                                            <>
                                                <span className="w-4 h-4 sm:w-5 sm:h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" aria-hidden="true" />
                                                Getting Ticket...
                                            </>
                                        ) : isPastSession ? (
                                            "QR Code Expired / Invalid"
                                        ) : queueClosed ? (
                                            "Queue is Closed"
                                        ) : queuePaused ? (
                                            "Operator on Break"
                                        ) : (
                                            <>
                                                Take a Token
                                                <svg className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                                </svg>
                                            </>
                                        )}
                                    </span>
                                </button>
                            </div>

                            {queueClosed && (
                                <p className="text-sm text-amber-600 font-medium text-center">
                                    This queue is currently not accepting new customers.
                                </p>
                            )}

                            {queuePaused && !queueClosed && (
                                <div className="text-amber-600 text-center flex flex-col items-center justify-center py-2 space-y-2">
                                    <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center shadow-sm">
                                        <span className="text-2xl" role="img" aria-label="Coffee">☕</span>
                                    </div>
                                    <p className="text-sm font-bold uppercase tracking-wider">Taking a short break</p>
                                    <p className="text-xs">We will resume accepting new walk-ins shortly.</p>
                                </div>
                            )}

                            {!isFormValid && !queueClosed && !queuePaused && (
                                <p className="text-xs text-gray-400 text-center">
                                    Please fill in your name and phone number to continue.
                                </p>
                            )}
                        </div>
                        )}

                    </div>
                </div>
            </main>
        </>
    );
}
