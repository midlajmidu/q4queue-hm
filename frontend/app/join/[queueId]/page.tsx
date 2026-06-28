"use client";

import React, { use, useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
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
                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                            <path d="M12 0C5.373 0 0 5.373 0 12c0 2.127.558 4.126 1.528 5.855L0 24l6.334-1.506A11.94 11.94 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.818 9.818 0 01-5.015-1.374l-.36-.214-3.729.887.916-3.629-.236-.374A9.818 9.818 0 1112 21.818z"/>
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
                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                            <path d="M12 0C5.373 0 0 5.373 0 12c0 2.127.558 4.126 1.528 5.855L0 24l6.334-1.506A11.94 11.94 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.818 9.818 0 01-5.015-1.374l-.36-.214-3.729.887.916-3.629-.236-.374A9.818 9.818 0 1112 21.818z"/>
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
    const [customerAge, setCustomerAge] = useState("");
    const [countryCode, setCountryCode] = useState("+91");
    const [customerPhone, setCustomerPhone] = useState("");
    const [companionNames, setCompanionNames] = useState<string[]>([]);

    // Derived values
    const isNameValid = /^[A-Za-z\s'-]{2,50}$/.test(customerName.trim());
    const isPhoneValid = /^\d{10}$/.test(customerPhone);
    const isFormValid = isNameValid && isPhoneValid;

    // Called after WhatsApp consent answer
    const doJoin = useCallback(async (sendWhatsApp: boolean) => {
        setShowWhatsAppModal(false);
        setIsJoining(true);
        setError(null);

        try {
            const payload = {
                name: customerName.trim(),
                age: customerAge ? parseInt(customerAge, 10) : undefined,
                phone: `${countryCode}${customerPhone}`,
                companion_names: companionNames.filter(n => n.trim() !== ""),
                send_whatsapp: sendWhatsApp,
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
    }, [isFormValid, isJoining, customerName, customerAge, customerPhone, companionNames, queueId, router]);

    // Clicking the button → show modal first
    const handleJoin = useCallback(() => {
        if (!isFormValid || isJoining) return;
        setShowWhatsAppModal(true);
    }, [isFormValid, isJoining]);


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

    const queueClosed = live?.is_active === false;
    const queuePaused = live?.is_paused === true;
    const queueName = live?.queue_name || "Queue";
    const prefix = live?.prefix || joinData?.queue_prefix || "";
    const serving = live?.current_serving ?? 0;


    const brandColor = live?.org_brand_color || '#2563eb';
    const logoUrl = live?.org_logo_url;
    const fullLogoUrl = logoUrl ? (logoUrl.startsWith('http') ? logoUrl : process.env.NEXT_PUBLIC_API_URL ? `${process.env.NEXT_PUBLIC_API_URL}${logoUrl}` : `http://localhost:8000${logoUrl}`) : null;

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
                    <div className="px-6 py-7 text-center text-white relative transition-colors duration-500" style={{ backgroundColor: brandColor }}>
                        <div className="absolute top-3 right-3">
                            <ConnectionBadge status={queueClosed ? "disconnected" : wsStatus} />
                        </div>

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

                        <div className="mt-4 text-6xl font-black tabular-nums tracking-tight py-4 bg-white/10 rounded-xl border border-white/20" aria-live="polite" aria-atomic="true" aria-label={`Currently serving token ${prefix}${serving}`}>
                            {!live?.serving_details ? "—" : `${prefix}${serving}`}
                        </div>

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
                        {error && (
                            <div role="alert" className="bg-red-50 text-red-700 text-sm font-medium p-3 rounded-lg border border-red-100">
                                {error}
                            </div>
                        )}

                            {/* ── Customer Form + Join Button ── */}
                            <div className="space-y-5">
                                {/* Info text */}
                                <p className="text-gray-500 text-sm leading-relaxed text-center">
                                    Fill in your details below to get your ticket number and track your position in real-time.
                                </p>

                                {/* Customer info form */}
                                <div className="space-y-3">
                                    {/* Name */}
                                    <div>
                                        <label htmlFor="customer-name" className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                                            Full Name <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            id="customer-name"
                                            type="text"
                                            value={customerName}
                                            onChange={(e) => setCustomerName(e.target.value)}
                                            placeholder="John Doe"
                                            required
                                            maxLength={50}
                                            autoComplete="name"
                                            disabled={isJoining || queueClosed}
                                            className={`w-full px-4 py-3 bg-gray-50 border ${debouncedCustomerName.length > 0 && !/^[A-Za-z\s'-]{2,50}$/.test(debouncedCustomerName.trim()) ? 'border-red-300 focus:ring-red-500' : 'border-gray-200 focus:ring-blue-500'} rounded-xl text-gray-900 placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:border-transparent transition-all disabled:opacity-50`}
                                        />
                                        {debouncedCustomerName.length > 0 && !/^[A-Za-z\s'-]{2,50}$/.test(debouncedCustomerName.trim()) && (
                                            <p className="mt-1.5 text-xs text-red-500 flex items-center gap-1 font-medium" role="alert">
                                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01"/></svg>
                                                Please enter a valid name (letters only, min 2 chars).
                                            </p>
                                        )}
                                    </div>

                                    {/* Age */}
                                    <div>
                                        <label htmlFor="customer-age" className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                                            Age <span className="text-gray-400 font-normal normal-case">(optional)</span>
                                        </label>
                                        <input
                                            id="customer-age"
                                            type="number"
                                            min="0"
                                            max="150"
                                            value={customerAge}
                                            onChange={(e) => setCustomerAge(e.target.value)}
                                            placeholder="32"
                                            autoComplete="off"
                                            disabled={isJoining || queueClosed}
                                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all disabled:opacity-50"
                                        />
                                    </div>

                                    <div>
                                        <label htmlFor="customer-phone" className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                                            Phone Number <span className="text-red-500">*</span>
                                        </label>
                                        <div className="flex gap-2">
                                            <div className="relative">
                                                <select
                                                    id="country-code"
                                                    value={countryCode}
                                                    onChange={(e) => setCountryCode(e.target.value)}
                                                    disabled={isJoining || queueClosed}
                                                    className="h-full pl-3 pr-8 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none cursor-pointer disabled:opacity-50"
                                                >
                                                    {COUNTRY_CODES.map((c) => (
                                                        <option key={c.code} value={c.code}>
                                                            {c.flag} {c.code}
                                                        </option>
                                                    ))}
                                                </select>
                                                <div className="absolute inset-y-0 right-2 flex items-center pointer-events-none text-gray-400">
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                                                </div>
                                            </div>
                                            <input
                                                id="customer-phone"
                                                type="tel"
                                                value={customerPhone}
                                                maxLength={10}
                                                onChange={(e) => {
                                                    const val = e.target.value.replace(/\D/g, "").slice(0, 10);
                                                    setCustomerPhone(val);
                                                }}
                                                placeholder="Enter phone number"
                                                required
                                                autoComplete="tel"
                                                disabled={isJoining || queueClosed}
                                                className="flex-1 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all disabled:opacity-50"
                                            />
                                        </div>
                                    </div>

                                    {/* Companion Names */}
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                                            Are you joining with others?
                                        </label>
                                        <div className="space-y-3">
                                            {companionNames.map((name, idx) => (
                                                <div key={idx} className="flex items-center gap-2">
                                                    <input
                                                        type="text"
                                                        value={name}
                                                        onChange={(e) => {
                                                            const newNames = [...companionNames];
                                                            newNames[idx] = e.target.value;
                                                            setCompanionNames(newNames);
                                                        }}
                                                        placeholder="Companion's Name"
                                                        disabled={isJoining || queueClosed}
                                                        className="flex-1 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all disabled:opacity-50"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            const newNames = companionNames.filter((_, i) => i !== idx);
                                                            setCompanionNames(newNames);
                                                        }}
                                                        disabled={isJoining || queueClosed}
                                                        className="w-12 h-12 flex items-center justify-center rounded-xl bg-red-50 text-red-500 hover:bg-red-100 disabled:opacity-50 transition-colors shrink-0"
                                                    >
                                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                        </svg>
                                                    </button>
                                                </div>
                                            ))}
                                            {companionNames.length < 9 && (
                                                <button
                                                    type="button"
                                                    onClick={() => setCompanionNames([...companionNames, ""])}
                                                    disabled={isJoining || queueClosed}
                                                    className="flex items-center gap-2 text-sm font-semibold text-blue-600 hover:text-blue-700 disabled:opacity-50 transition-colors"
                                                >
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                                    </svg>
                                                    Add Person
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Take Token button */}
                                <button
                                    onClick={handleJoin}
                                    disabled={isJoining || queueClosed || queuePaused || !isFormValid}
                                    aria-label={queueClosed ? "Queue is closed" : queuePaused ? "Operator on break" : "Take a token"}
                                    className="w-full py-4 text-white font-bold rounded-xl text-lg shadow-lg hover:shadow-xl hover:-translate-y-0.5 focus:outline-none focus-visible:ring-4 focus-visible:ring-black/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-lg"
                                    style={{ backgroundColor: brandColor }}
                                >
                                    {isJoining ? (
                                        <span className="flex items-center justify-center gap-2">
                                            <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" aria-hidden="true" />
                                            Getting Ticket...
                                        </span>
                                    ) : queueClosed ? (
                                        "Queue is Closed"
                                    ) : queuePaused ? (
                                        "Operator on Break"
                                    ) : (
                                        "Take a Token"
                                    )}
                                </button>

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

                    </div>
                </div>
            </main>
        </>
    );
}
