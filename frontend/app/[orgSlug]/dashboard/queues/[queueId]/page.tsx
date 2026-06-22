"use client";

import { use, useState, useCallback, useRef, useEffect } from "react";
import React from "react";
import Link from "next/link";
import { api, ApiError } from "@/lib/api";
import { useRouter } from "next/navigation";
import { useQueueSocket } from "@/hooks/useQueueSocket";
import { getToken, getCurrentUser } from "@/lib/auth";
import { useToast } from "@/components/Toast";
import ConnectionBadge from "@/components/ConnectionBadge";
import ConfirmModal from "@/components/ConfirmModal";
import QueueQRCode from "@/components/QueueQRCode";
import TokenDetailModal from "@/components/TokenDetailModal";
import type { TokenDetailData } from "@/components/TokenDetailModal";
import type { RecentToken, WaitingToken, QueueResponse, TokenHistoryItem } from "@/types/api";
import { Pause, Play, Clock, QrCode, UserPlus } from "lucide-react";
import { toast as sonnerToast } from "sonner";

const formatTime12 = (time24?: string | null) => {
    if (!time24) return "";
    const [h, m] = time24.split(":");
    let hours = parseInt(h, 10);
    const ampm = hours >= 12 ? "PM" : "AM";
    hours = hours % 12 || 12;
    return `${hours.toString().padStart(2, "0")}:${m} ${ampm}`;
};

// ─── Design System ────────────────────────────────────────────────
const T = {
    // Sidebar
    sidebarBg: "#ffffff",
    sidebarBorder: "#e4e7ef",
    // Page
    pageBg: "#f9fafb",
    // Cards
    cardBg: "#ffffff",
    cardBorder: "#e4e7ef",
    cardBorderHov: "#c9cfe0",
    cardShadow: "0 1px 3px rgba(0,0,0,.06), 0 4px 16px rgba(0,0,0,.04)",
    cardShadowHov: "0 4px 20px rgba(0,0,0,.10)",
    // Text
    text: "#111827",
    textSub: "#6b7280",
    textMuted: "#9ca3af",
    textInverse: "#ffffff",
    textSidebarMuted: "#6b7280",
    // Brand (electric indigo)
    brand: "#5b5ef4",
    brandDark: "#4a4ce8",
    brandLight: "#eeefff",
    brandBorder: "#c7c9fb",
    brandGlow: "rgba(91,94,244,.15)",
    // Accents
    green: "#16a34a", greenBg: "#f0fdf4", greenBorder: "#bbf7d0",
    amber: "#d97706", amberBg: "#fffbeb", amberBorder: "#fde68a",
    red: "#dc2626", redBg: "#fef2f2", redBorder: "#fecaca",
    blue: "#2563eb", blueBg: "#eff6ff", blueBorder: "#bfdbfe",
    violet: "#7c3aed", violetBg: "#f5f3ff",
    cyan: "#0e7490", cyanBg: "#ecfeff",
    // Sidebar nav
    navActive: "#5b5ef4",
    navHoverBg: "#f8f9fc",
    navText: "#5a6479",
    navActiveText: "#ffffff",
};

const QD_STYLES = `

  .qd-root {
    
        -webkit-font-smoothing: antialiased;
    letter-spacing: -0.01em;
  }

  /* ── Sidebar ── */
  .qd-sidebar {
    display: flex;
    flex-direction: column;
  }

  .qd-nav-item {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 9px 12px;
    border-radius: 8px;
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
    border: none;
    width: 100%;
    text-align: left;
    transition: background .15s ease, color .15s ease;
    background: transparent;
    color: ${T.navText};
    
    letter-spacing: -0.01em;
  }
  .qd-nav-item:hover { background: ${T.navHoverBg}; color: ${T.text}; }
  .qd-nav-item.active {
    background: ${T.navActive};
    color: ${T.navActiveText};
    font-weight: 600;
    box-shadow: 0 2px 8px rgba(91,94,244,.35);
  }

  /* ── Cards ── */
  .qd-card {
    border-radius: 8px;
    box-shadow: ${T.cardShadow};
    transition: box-shadow .25s ease, border-color .25s ease;
  }
  .qd-card:hover {
    box-shadow: ${T.cardShadowHov};
    border-color: ${T.cardBorderHov};
  }

  /* ── Serving Hero ── */
  .serving-card {
    position: relative;
    overflow: hidden;
    border-radius: 20px;
  }
  .serving-num {
    
    font-weight: 800;
    font-variant-numeric: tabular-nums;
    line-height: 1;
    letter-spacing: -0.04em;
  }

  /* ── Buttons ── */
  .qd-btn-primary {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    color: #fff;
    font-weight: 700;
    border: none;
    border-radius: 8px;
    padding: 13px 26px;
    font-size: 14.5px;
    cursor: pointer;
    
    letter-spacing: -0.01em;
    box-shadow: 0 1px 2px rgba(0,0,0,.08), 0 4px 16px rgba(91,94,244,.3);
    transition: all .2s cubic-bezier(.22,1,.36,1);
  }
  .qd-btn-primary:hover:not(:disabled) {
    background: ${T.brandDark};
    box-shadow: 0 2px 4px rgba(0,0,0,.12), 0 8px 24px rgba(91,94,244,.4);
    transform: translateY(-1px);
  }
  .qd-btn-primary:active:not(:disabled) { transform: translateY(0); }
  .qd-btn-primary:disabled { opacity: .35; cursor: not-allowed; transform: none; }

  .qd-btn-secondary {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    background: ${T.cardBg};
    color: ${T.textSub};
    border: 1.5px solid ${T.cardBorder};
    border-radius: 8px;
    padding: 13px 22px;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    
    box-shadow: 0 1px 2px rgba(0,0,0,.04);
    transition: all .2s cubic-bezier(.22,1,.36,1);
  }
  .qd-btn-secondary:hover:not(:disabled) {
    border-color: ${T.cardBorderHov};
    background: #f8f9fc;
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(0,0,0,.07);
  }
  .qd-btn-secondary:active:not(:disabled) { transform: translateY(0); }
  .qd-btn-secondary:disabled { opacity: .35; cursor: not-allowed; }

  .qd-btn-call-next {
    position: relative;
    overflow: hidden;
    background: linear-gradient(135deg, ${T.brand}, ${T.brandDark});
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    background: ${T.brand};
    color: #fff;
    font-weight: 700;
    border: none;
    border-radius: 8px;
    padding: 15px 28px;
    font-size: 15px;
    cursor: pointer;
    
    letter-spacing: -0.01em;
    box-shadow: 0 4px 14px rgba(91,94,244,.25);
    transition: all .2s cubic-bezier(.22,1,.36,1);
  }
  .qd-btn-call-next:hover:not(:disabled) {
    background: ${T.brandDark};
    box-shadow: 0 6px 20px rgba(91,94,244,.4);
    transform: translateY(-1.5px);
  }
  .qd-btn-call-next:active:not(:disabled) { transform: translateY(0); }
  .qd-btn-call-next:disabled { opacity: .35; cursor: not-allowed; transform: none; }

  .qd-btn-done-next {
    position: relative;
    overflow: hidden;
    background: linear-gradient(135deg, ${T.green}, #15803d);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    color: #fff;
    font-weight: 700;
    border: none;
    border-radius: 8px;
    padding: 15px 28px;
    font-size: 15px;
    cursor: pointer;
    
    letter-spacing: -0.01em;
    box-shadow: 0 4px 14px rgba(22,163,74,.25);
    transition: all .2s cubic-bezier(.22,1,.36,1);
  }
  .qd-btn-done-next:hover:not(:disabled) {
    background: #15803d;
    box-shadow: 0 6px 20px rgba(22,163,74,.4);
    transform: translateY(-1.5px);
  }
  .qd-btn-done-next:active:not(:disabled) { transform: translateY(0); }
  .qd-btn-done-next:disabled { opacity: .35; cursor: not-allowed; transform: none; }

  /* ── Inputs ── */
  .qd-input {
    width: 100%;
    padding: 9px 13px;
    font-size: 13.5px;
    font-weight: 400;
    border: 1.5px solid ${T.cardBorder};
    border-radius: 9px;
    
    outline: none;
    transition: border-color .18s, box-shadow .18s;
    letter-spacing: -0.01em;
  }
  .qd-input:focus {
    border-color: ${T.brand};
    box-shadow: 0 0 0 3px rgba(91,94,244,.12);
    background: #fff;
  }
  .qd-input::placeholder { color: ${T.textMuted}; }

  /* ── Labels ── */
  .qd-lbl {
    font-size: 10px;
    font-weight: 700;
    letter-spacing: .1em;
    text-transform: uppercase;
    color: ${T.textMuted};
    
  }

  .mono {  }

  /* ── Animations ── */
  .fade-in { animation: qdfin .3s cubic-bezier(.16,1,.3,1) both; }
  @keyframes qdfin { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:none} }
  @keyframes spin { to { transform: rotate(360deg); } }
  @keyframes pulse-dot { 0%,100%{opacity:1} 50%{opacity:.4} }

  /* ── Empty state ── */
  @keyframes float-gentle {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-6px); }
  }

  /* ── Control Panels ── */
  .qd-control-panel {
    border-radius: 8px;
    padding: 16px 18px;
    transition: border-color .2s;
  }
  .qd-control-panel:hover { border-color: ${T.cardBorderHov}; }

  /* ── Action Grid ── */
  .qd-action-grid { display: grid; gap: 10px; }
  @media (min-width: 640px) { .qd-action-grid { grid-template-columns: 1fr 1fr; } }

  /* ── Stat Chip ── */
  .stat-chip {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    padding: 6px 14px;
    border-radius: 99px;
    font-size: 12.5px;
    font-weight: 600;
    
  }

  /* ── Section heading ── */
  .qd-section-title {
    font-size: clamp(20px,2.5vw,26px);
    font-weight: 800;
    letter-spacing: -0.03em;
    margin: 0;
    
  }
  .qd-section-sub {
    font-size: 13.5px;
    color: ${T.textSub};
    margin-top: 4px;
    font-weight: 400;
  }
`;

interface PageProps {
    params: Promise<{ queueId: string }>;
}

type ActiveSection = "queues" | "waiting_list" | "qrcode" | "announcement" | "history" | "recent_activity";

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

export default function QueueDetailPage({ params }: PageProps) {
    const { queueId } = use(params);
    const token = getToken();
    const user = getCurrentUser();
    const isStaff = user?.role === "staff";
    const dashBase = user?.org_slug ? `/${user.org_slug}/dashboard` : "/dashboard";
    const { toast } = useToast();

    const handleNewCustomer = useCallback((data: any) => {
        sonnerToast.custom((t) => (
            <div className="flex w-[350px] items-start gap-4 rounded-xl bg-indigo-600 p-5 shadow-[0_12px_30px_rgba(79,70,229,0.35)] ring-1 ring-indigo-500 overflow-hidden relative">
                {/* Subtle light burst in the corner */}
                <div className="absolute -top-8 -right-8 h-32 w-32 rounded-full bg-indigo-400 blur-2xl opacity-40 pointer-events-none"></div>

                <div className="relative z-10 mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-indigo-600 shadow-sm">
                    <UserPlus className="h-6 w-6 stroke-[2.5px]" />
                </div>
                <div className="relative z-10 flex flex-col gap-1 w-full">
                    <div className="flex items-center justify-between w-full">
                        <span className="text-sm font-bold tracking-wide text-white">New Customer</span>
                        <span className="rounded-md bg-indigo-900/30 px-2 py-0.5 text-[10px] font-bold tracking-widest text-indigo-100">
                            {data.time}
                        </span>
                    </div>
                    <div className="text-3xl font-black tracking-tight text-white leading-none drop-shadow-sm mt-1">
                        {data.token}
                    </div>
                    {data.name && (
                        <div className="text-sm font-semibold text-indigo-100/90 mt-1">
                            {data.name}
                        </div>
                    )}
                </div>
            </div>
        ), {
            duration: 4000,
            id: `customer-${data.token}`
        });
    }, []);

    const { state, status, refresh } = useQueueSocket(queueId, {
        token: token || undefined,
        onNewCustomer: handleNewCustomer
    });

    const [isMounted, setIsMounted] = useState(false);
    useEffect(() => {
        setIsMounted(true);
    }, []);

    const [activeSection, setActiveSection] = useState<ActiveSection>("queues");
    const [selectedToken, setSelectedToken] = useState<TokenDetailData | null>(null);
    const [manuallyAddedTokens, setManuallyAddedTokens] = useState<Set<number>>(new Set());
    const [queueHistory, setQueueHistory] = useState<TokenHistoryItem[]>([]);
    const [historyTotal, setHistoryTotal] = useState(0);
    const [historyPage, setHistoryPage] = useState(1);
    const [historyLoading, setHistoryLoading] = useState(false);
    const HISTORY_PAGE_SIZE = 15;
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [actionError, setActionError] = useState<string | null>(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [showResetConfirm, setShowResetConfirm] = useState(false);
    const [resetting, setResetting] = useState(false);
    const [inviteNumber, setInviteNumber] = useState("");
    const [removeNumber, setRemoveNumber] = useState("");
    const [tokenToRemove, setTokenToRemove] = useState<{ id: string, number: number } | null>(null);
    const [announcementInput, setAnnouncementInput] = useState("");
    const [isEditingAnnouncement, setIsEditingAnnouncement] = useState(false);
    const [waitingSearch, setWaitingSearch] = useState("");
    const [recentSearch, setRecentSearch] = useState("");
    const [waitingPage, setWaitingPage] = useState(1);
    const [recentPage, setRecentPage] = useState(1);
    const PAGE_SIZE = 10;
    const RECENT_PAGE_SIZE = 20;
    const router = useRouter();

    const [activeListTab, setActiveListTab] = useState<"waiting" | "skipped">("waiting");

    const filteredWaiting = React.useMemo(() => {
        if (!state?.waiting_tokens) return [];
        const filtered = waitingSearch
            ? state.waiting_tokens.filter(t =>
                String(t.token_number).includes(waitingSearch) ||
                t.customer_name?.toLowerCase().includes(waitingSearch.toLowerCase()) ||
                t.customer_phone?.includes(waitingSearch)
            )
            : state.waiting_tokens;
        return filtered;
    }, [state?.waiting_tokens, waitingSearch]);

    const paginatedWaiting = React.useMemo(() => {
        const start = (waitingPage - 1) * PAGE_SIZE;
        return filteredWaiting.slice(start, start + PAGE_SIZE);
    }, [filteredWaiting, waitingPage]);

    const filteredSkipped = React.useMemo(() => {
        if (!state?.skipped_tokens) return [];
        const filtered = waitingSearch
            ? state.skipped_tokens.filter(t =>
                String(t.token_number).includes(waitingSearch) ||
                t.customer_name?.toLowerCase().includes(waitingSearch.toLowerCase()) ||
                t.customer_phone?.includes(waitingSearch)
            )
            : state.skipped_tokens;
        return filtered;
    }, [state?.skipped_tokens, waitingSearch]);

    const paginatedSkipped = React.useMemo(() => {
        const start = (waitingPage - 1) * PAGE_SIZE;
        return filteredSkipped.slice(start, start + PAGE_SIZE);
    }, [filteredSkipped, waitingPage]);

    const filteredRecent = React.useMemo(() => {
        if (!state?.recent_tokens) return [];
        const filtered = recentSearch
            ? state.recent_tokens.filter(t =>
                String(t.token_number).includes(recentSearch) ||
                t.customer_name?.toLowerCase().includes(recentSearch.toLowerCase()) ||
                t.customer_phone?.includes(recentSearch)
            )
            : [...state.recent_tokens];

        // Sort by most recently served (or completed/created) to show latest activity at the top
        return filtered.sort((a, b) => {
            const timeA = new Date(a.served_at || a.completed_at || a.created_at || 0).getTime();
            const timeB = new Date(b.served_at || b.completed_at || b.created_at || 0).getTime();
            return timeB - timeA;
        });
    }, [state?.recent_tokens, recentSearch]);

    const paginatedRecent = React.useMemo(() => {
        const start = (recentPage - 1) * RECENT_PAGE_SIZE;
        return filteredRecent.slice(start, start + RECENT_PAGE_SIZE);
    }, [filteredRecent, recentPage]);

    React.useEffect(() => { setWaitingPage(1); }, [waitingSearch]);
    React.useEffect(() => { setRecentPage(1); }, [recentSearch]);

    const [initialQueue, setInitialQueue] = useState<QueueResponse | null>(null);
    const lastActionRef = useRef(0);
    const errorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        api.getQueue(queueId).then(setInitialQueue).catch(() => { });
    }, [queueId]);

    const isDisabled = actionLoading !== null;
    const queueName = state?.queue_name || initialQueue?.name || "Queue";
    const isActive = state?.is_active ?? initialQueue?.is_active;
    const isPaused = (state?.is_paused ?? initialQueue?.is_paused) === true;

    const setErrorWithTimer = useCallback((msg: string) => {
        setActionError(msg);
        if (errorTimerRef.current) clearTimeout(errorTimerRef.current);
        errorTimerRef.current = setTimeout(() => setActionError(null), 5000);
    }, []);

    const performAction = useCallback(async (
        actionName: string,
        fn: () => Promise<unknown>,
        successMsg?: string
    ) => {
        const now = Date.now();
        if (now - lastActionRef.current < 400) return;
        lastActionRef.current = now;
        setActionLoading(actionName);
        setActionError(null);
        try {
            await fn();
            if (successMsg) toast(successMsg, "success");
        } catch (err: unknown) {
            if (err instanceof ApiError) { setErrorWithTimer(err.detail); toast(err.detail, "error"); }
            else { setErrorWithTimer("Action failed. Please try again."); toast("Action failed. Please try again.", "error"); }
        } finally {
            setActionLoading(null);
        }
    }, [toast, setErrorWithTimer]);

    const handleNext = useCallback(async () => {
        const prefix = state?.prefix ?? "";
        await performAction("next", async () => {
            const res = await api.callNext(queueId, "skipped");
            if ("message" in res) toast(res.message, "info");
            else toast(`${prefix}${res.serving} is now serving`, "success");
        });
    }, [performAction, queueId, state?.prefix, toast]);



    const handleReset = useCallback(async () => {
        setResetting(true);
        setActionError(null);
        try {
            await api.resetQueue(queueId);
            toast("Queue reset successfully", "success");
            setShowResetConfirm(false);
        } catch (err: unknown) {
            if (err instanceof ApiError) setActionError(err.detail);
            else setActionError("Failed to reset queue");
            setShowResetConfirm(false);
        } finally { setResetting(false); }
    }, [queueId, toast]);

    const handleDelete = useCallback(async () => {
        setDeleting(true);
        setActionError(null);
        try {
            await api.deleteQueue(queueId);
            toast("Queue deleted successfully", "success");
            router.push(`${dashBase}/queues`);
        } catch (err: unknown) {
            if (err instanceof ApiError) setActionError(err.detail);
            else setActionError("Failed to delete queue");
            setShowDeleteConfirm(false);
        } finally { setDeleting(false); }
    }, [queueId, router, dashBase, toast]);

    const [pausing, setPausing] = useState(false);
    const handlePauseToggle = useCallback(async () => {
        const currentPaused = state?.is_paused ?? initialQueue?.is_paused ?? false;
        const nextState = !currentPaused;
        setPausing(true);
        setActionError(null);
        try {
            await api.toggleQueuePaused(queueId, nextState);
            toast(nextState ? "Queue paused successfully" : "Queue resumed successfully", nextState ? "warning" : "success");
        } catch (err: unknown) {
            if (err instanceof ApiError) setActionError(err.detail);
            else setActionError("Failed to pause/resume queue");
            toast("Action failed", "error");
        } finally { setPausing(false); }
    }, [queueId, state?.is_paused, initialQueue?.is_paused, toast]);

    const [showAddForm, setShowAddForm] = useState(false);
    const [addName, setAddName] = useState("");
    const [debouncedAddName, setDebouncedAddName] = useState("");
    useEffect(() => {
        const t = setTimeout(() => setDebouncedAddName(addName), 800);
        return () => clearTimeout(t);
    }, [addName]);
    const [addCountryCode, setAddCountryCode] = useState("+91");
    const [addPhone, setAddPhone] = useState("");
    const [addAge, setAddAge] = useState("");
    const [addCompanions, setAddCompanions] = useState("");
    const [showWhatsappConfirm, setShowWhatsappConfirm] = useState(false);
    const isAddNameValid = /^[A-Za-z\s'-]{2,50}$/.test(addName.trim());

    const handlePreAddCustomer = useCallback(async () => {
        const phoneDigits = addPhone.replace(/\D/g, "");
        if (!isAddNameValid || phoneDigits.length !== 10) { toast("Please enter a valid name and 10 digit phone number", "error"); return; }
        setShowWhatsappConfirm(true);
    }, [addPhone, toast, isAddNameValid]);

    const handleConfirmAddCustomer = useCallback(async (sendWhatsapp: boolean) => {
        setShowWhatsappConfirm(false);
        const phoneDigits = addPhone.replace(/\D/g, "");
        setActionLoading("add");
        setActionError(null);
        try {
            const parsedCompanions = addCompanions.split(",").map(n => n.trim()).filter(n => n.length > 0);
            const res = await api.adminJoin(queueId, { 
                name: addName.trim(), 
                phone: `${addCountryCode}${phoneDigits}`, 
                age: addAge ? parseInt(addAge, 10) : undefined, 
                companion_names: parsedCompanions,
                send_whatsapp: sendWhatsapp
            });
            toast(`Token ${state?.prefix || ""}${res.token_number} created`, "success");
            setManuallyAddedTokens(prev => new Set(prev).add(res.token_number));
            setShowAddForm(false);
            setAddName(""); setAddPhone(""); setAddAge(""); setAddCompanions("");
        } catch (err: unknown) {
            if (err instanceof ApiError) setActionError(err.detail);
            else setActionError("Failed to add customer");
        } finally { setActionLoading(null); }
    }, [queueId, addName, addPhone, addAge, addCountryCode, addCompanions, state?.prefix, toast]);

    const handleInvite = useCallback(async (e: React.FormEvent) => {
        e.preventDefault();
        if (!inviteNumber) return;
        const num = parseInt(inviteNumber, 10);
        if (isNaN(num)) return;
        setActionLoading("invite");
        setActionError(null);
        try {
            await api.serveSpecificToken(queueId, num);
            toast(`Token ${state?.prefix || ""}${num} is now serving`, "success");
            setInviteNumber("");
        } catch (err: unknown) {
            if (err instanceof ApiError) setActionError(err.detail);
            else setActionError("Failed to invite token: it might not be waiting or doesn't exist.");
        } finally { setActionLoading(null); }
    }, [queueId, inviteNumber, state?.prefix, toast]);

    const handleRemoveByNumber = useCallback((e: React.FormEvent) => {
        e.preventDefault();
        setActionError(null);
        if (!removeNumber) return;
        const num = parseInt(removeNumber, 10);
        if (isNaN(num)) return;
        const token = state?.waiting_tokens?.find((t) => t.token_number === num);
        if (!token) { setActionError(`Token ${state?.prefix || ""}${num} is not currently waiting.`); return; }
        setTokenToRemove({ id: token.id, number: token.token_number });
        setRemoveNumber("");
    }, [removeNumber, state?.waiting_tokens, state?.prefix]);

    const handleConfirmRemove = useCallback(async () => {
        if (!tokenToRemove) return;
        setActionLoading("remove");
        setActionError(null);
        try {
            await api.removeToken(tokenToRemove.id);
            toast(`Token ${state?.prefix || ""}${tokenToRemove.number} removed`, "success");
        } catch (err: unknown) {
            if (err instanceof ApiError) setActionError(err.detail);
            else setActionError("Failed to remove token");
        } finally { setActionLoading(null); setTokenToRemove(null); }
    }, [tokenToRemove, state?.prefix, toast]);

    useEffect(() => {
        if (!isEditingAnnouncement) {
            setAnnouncementInput(state?.announcement ?? initialQueue?.announcement ?? "");
        }
    }, [state?.announcement, initialQueue?.announcement, isEditingAnnouncement]);

    const handleUpdateAnnouncement = useCallback(async (e: React.FormEvent) => {
        e.preventDefault();
        setActionLoading("announcement");
        setActionError(null);
        try {
            await api.updateQueueAnnouncement(queueId, announcementInput.trim());
            toast("Announcement updated", "success");
            setIsEditingAnnouncement(false);
        } catch (err: unknown) {
            if (err instanceof ApiError) setActionError(err.detail);
            else setActionError("Failed to update announcement");
        } finally { setActionLoading(null); }
    }, [queueId, announcementInput, toast]);

    useEffect(() => {
        function onKeyDown(e: KeyboardEvent) {
            const target = e.target as HTMLElement;
            if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) return;
            if (e.key === "Enter" && !isDisabled && !isPaused) { e.preventDefault(); handleNext(); }
        }
        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, [isDisabled, isPaused, handleNext]);

    useEffect(() => { return () => { if (errorTimerRef.current) clearTimeout(errorTimerRef.current); }; }, []);

    const navItems: { id: ActiveSection; label: string; icon: React.ReactNode }[] = [
        {
            id: "queues", label: "Dashboard / Queues",
            icon: <svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M4 6h16M4 10h16M4 14h16M4 18h16" /></svg>,
        },
        {
            id: "waiting_list", label: "Waiting List",
            icon: <svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>,
        },
        {
            id: "qrcode", label: "QR Code",
            icon: <svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" /></svg>,
        },
        {
            id: "announcement", label: "Public Announcement",
            icon: <svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" /></svg>,
        },
        {
            id: "recent_activity", label: "Recent Activity",
            icon: <svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M4 6h16M4 12h16M4 18h7" /></svg>,
        },
        {
            id: "history", label: "History",
            icon: <svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
        },
    ];

    if (!isMounted) {
        return (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", width: "100%", minHeight: "100vh", /* background removed */ }}>
                <span style={{ width: 28, height: 28, marginBottom: 12, border: `3px solid ${T.brandLight}`, borderTopColor: T.brand, borderRadius: "50%", display: "inline-block", animation: "spin .7s linear infinite" }} />
                <span className="text-gray-600 dark:text-slate-400" style={{ fontSize: 13, fontWeight: 600 }}>Loading Queue…</span>
            </div>
        );
    }

    return (
        <>
            <style>{QD_STYLES}</style>
            <div className="qd-root bg-gray-50 dark:bg-transparent" style={{ display: "flex", width: "100%", height: "100%" }}>

                {/* ── Refactored Sidebar ─────────────────────────────────── */}
                <aside className="hidden md:flex flex-col bg-white border-r border-slate-200" style={{ width: 260, flexShrink: 0, position: "sticky", top: 0, height: "100vh" }}>

                    {/* Top Container */}
                    <div className="p-4 flex flex-col h-full">

                        {/* 1. Top Action */}
                        <div className="pb-4 border-b border-slate-200 mb-4">
                            <Link
                                href={`${dashBase}/sessions`}
                                className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors"
                            >
                                <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" /></svg>
                                Back to Sessions
                            </Link>
                        </div>

                        {/* 2. Context Card */}
                        <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 mb-6">
                            <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Managing</div>
                            <div className="text-sm font-bold text-slate-900 truncate" title={queueName}>{queueName}</div>
                            <div className="text-xs font-medium text-emerald-600 mt-1 flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-[pulse-dot_2s_infinite]" />
                                {isPaused ? <span className="text-amber-600">Paused</span> : isActive ? "Active" : <span className="text-red-600">Inactive</span>}
                            </div>
                        </div>

                        {/* 3. Section Headers */}
                        <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 px-3 mb-2">
                            Queue Management
                        </div>

                        {/* 4. Navigation Links */}
                        <nav className="px-3 flex flex-col gap-1 flex-1 overflow-y-auto">
                            {navItems.map((item) => {
                                const isActiveItem = activeSection === item.id;
                                return (
                                    <button
                                        key={item.id}
                                        onClick={() => setActiveSection(item.id)}
                                        className={`flex items-center gap-3 px-3 py-2 text-sm rounded-lg transition-all text-left ${isActiveItem
                                                ? "font-semibold text-indigo-700 bg-indigo-50"
                                                : "font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                                            }`}
                                    >
                                        <span className={`flex-shrink-0 ${isActiveItem ? "text-indigo-600" : "text-slate-400"}`}>
                                            {item.icon}
                                        </span>
                                        <span className="truncate flex-1">{item.label}</span>
                                        {item.id === "announcement" && (state?.announcement || initialQueue?.announcement) && (
                                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 flex-shrink-0" />
                                        )}
                                    </button>
                                );
                            })}
                        </nav>
                    </div>

                    {/* 5. Bottom Shell */}
                    <div className="mt-auto border-t border-slate-200 p-4">
                        <ConnectionBadge status={status} />
                    </div>
                </aside>

                {/* ── Main Content ──────────────────────────────────── */}
                <div className="bg-gray-50 dark:bg-transparent" style={{ flex: 1, overflowY: "auto" }}>
                    <div style={{ padding: "28px 28px 56px", maxWidth: 1160, margin: "0 auto", display: "flex", flexDirection: "column", gap: 24 }}>

                        {/* ═══════════════════════════════════════════
                        SECTION: Dashboard / Queues
                    ════════════════════════════════════════════ */}
                        {activeSection === "queues" && (
                            <div className="fade-in" style={{ display: "flex", flexDirection: "column", gap: 22 }}>

                                {/* Header */}
                                <div className="flex flex-row justify-between items-center w-full">
                                    <div>
                                        <div className="flex items-center gap-3">
                                            <h1 className="qd-section-title text-gray-900 dark:text-white capitalize">{queueName}</h1>
                                            <button
                                                onClick={refresh}
                                                className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/50 rounded-lg transition-all"
                                                title="Refresh queue data"
                                            >
                                                <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8M21 3v5h-5M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16M8 16H3v5" /></svg>
                                            </button>
                                        </div>
                                        <p className="text-gray-600 dark:text-slate-400" style={{ fontSize: 13, marginTop: 4 }}>
                                            Prefix: <span className="mono text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/50" style={{ fontWeight: 600, padding: "1px 7px", borderRadius: 5 }}>{state?.prefix || initialQueue?.prefix || "—"}</span>
                                        </p>
                                        {(state?.open_time || initialQueue?.open_time) && (state?.close_time || initialQueue?.close_time) && (
                                            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100 text-slate-600 border border-slate-200 text-xs font-semibold shadow-sm mt-2">
                                                <Clock className="w-3.5 h-3.5 text-blue-500" />
                                                <span>{formatTime12(state?.open_time || initialQueue?.open_time)} - {formatTime12(state?.close_time || initialQueue?.close_time)}</span>
                                            </div>
                                        )}
                                    </div>

                                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                                        {isActive && (
                                            <button
                                                onClick={handlePauseToggle}
                                                disabled={isDisabled || pausing}
                                                className={`bg-white border ${isPaused ? "border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100" : "border-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-50"} shadow-sm ring-1 ring-slate-900/5 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors flex items-center gap-2`}
                                            >
                                                {isPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
                                                {isPaused ? "Resume" : "Take a Break"}
                                            </button>
                                        )}
                                        {!isStaff && (
                                            <button
                                                onClick={() => setShowResetConfirm(true)}
                                                disabled={isDisabled || resetting}
                                                className="bg-white border border-slate-100 shadow-sm ring-1 ring-slate-900/5 text-slate-600 hover:text-slate-900 hover:bg-slate-50 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors flex items-center gap-2"
                                            >
                                                <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                                                Reset
                                            </button>
                                        )}

                                        <a
                                            href={`/display/${queueId}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="bg-white border border-slate-100 shadow-sm ring-1 ring-slate-900/5 text-slate-600 hover:text-slate-900 hover:bg-slate-50 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors flex items-center gap-2"
                                        >
                                            <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                                            Display
                                        </a>
                                        {!isStaff && (
                                            <button
                                                onClick={() => setShowDeleteConfirm(true)}
                                                className="bg-white border border-slate-100 shadow-sm ring-1 ring-slate-900/5 text-slate-600 hover:text-slate-900 hover:bg-red-50 hover:border-red-200 hover:text-red-600 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors flex items-center gap-2"
                                            >
                                                <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                                Delete
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {/* Main 2-col Grid */}
                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 lg:h-[calc(100vh-theme(spacing.36))]">
                                    {/* Left: Serving + Actions */}
                                    <div className="lg:col-span-2 space-y-4 lg:overflow-y-auto scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-700 pr-1">

                                        {/* Hero – Now Serving */}
                                        <div className="serving-card bg-white dark:bg-slate-900 border border-slate-100 shadow-sm ring-1 ring-slate-900/5 dark:border-white/10 dark:shadow-none" style={{ padding: "40px 32px 36px", textAlign: "center", minHeight: 280, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", position: "relative" }}>
                                            {/* Label */}
                                            <div className="dark:bg-primary/10 dark:border-primary/30" style={{ display: "inline-flex", alignItems: "center", gap: 8, border: `1px solid ${T.brandBorder}`, borderRadius: 99, padding: "5px 16px", marginBottom: 20, position: "relative", zIndex: 1 }}>
                                                <span style={{ width: 7, height: 7, borderRadius: "50%", background: T.brand, display: "inline-block", animation: "pulse-dot 2s infinite" }} />
                                                <span className="text-blue-600 dark:text-blue-400" style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase" }}>Now Serving</span>
                                            </div>

                                            {/* Token Number */}
                                            {(!state?.current_serving || state.current_serving === 0) ? (
                                                <div className="relative z-10 flex flex-col items-center justify-center py-4" style={{ minHeight: 140 }}>

                                                    {/* Floating ticket icon */}
                                                    <div style={{ animation: 'float-gentle 3s ease-in-out infinite', marginBottom: 20 }}>
                                                        <div style={{ width: 56, height: 56, borderRadius: 16, background: 'linear-gradient(145deg, #eef2ff, #e0e7ff)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 1px 3px rgba(99,102,241,0.12), 0 8px 24px rgba(99,102,241,0.06)' }}>
                                                            <svg width="26" height="26" fill="none" viewBox="0 0 24 24" style={{ color: '#6366f1' }}>
                                                                <path d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                                            </svg>
                                                        </div>
                                                    </div>

                                                    {/* Title + subtitle */}
                                                    <span className="text-slate-800 dark:text-slate-200" style={{ fontSize: 17, fontWeight: 700, letterSpacing: '-0.02em', marginBottom: 6 }}>
                                                        No one is being served
                                                    </span>
                                                    <span className="text-slate-400 dark:text-slate-500" style={{ fontSize: 13, fontWeight: 500, marginBottom: 16 }}>
                                                        Your counter is ready for the next customer
                                                    </span>

                                                    {/* Shortcut hint */}
                                                    <div className="flex items-center gap-1.5" style={{ fontSize: 12, fontWeight: 500 }}>
                                                        <span className="text-slate-400">Shortcut:</span>
                                                        <kbd className="text-slate-600 dark:text-slate-300" style={{ display: 'inline-flex', alignItems: 'center', gap: 2, padding: '2px 8px', borderRadius: 5, background: '#f1f5f9', border: '1px solid #e2e8f0', fontSize: 11, fontWeight: 700, fontFamily: 'ui-monospace, monospace', boxShadow: '0 1px 0 #e2e8f0' }}>Enter ↵</kbd>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="serving-num text-slate-900 dark:text-white drop-shadow-[0_0_30px_rgba(255,255,255,0.05)]" style={{ fontSize: "clamp(72px,11vw,116px)", position: "relative", zIndex: 1 }} aria-live="polite" aria-atomic="true">
                                                    {`${state.prefix || ""}${state.current_serving}`}
                                                </div>
                                            )}

                                            {/* Customer Details */}
                                            {state?.serving_details && (
                                                <div className="fade-in" style={{ marginTop: 16, position: "relative", zIndex: 1, textAlign: "center" }}>
                                                    <p style={{ fontSize: 18, fontWeight: 700, letterSpacing: "-.02em", margin: 0, display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
                                                        {state.serving_details.customer_name}
                                                        {(state.serving_details.companion_names && state.serving_details.companion_names.length > 0) && (
                                                            <span className="bg-indigo-100 text-indigo-700 text-xs px-2 py-0.5 rounded-full flex items-center gap-1 font-bold" title={state.serving_details.companion_names.join(", ")}>
                                                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>
                                                                +{state.serving_details.companion_names.length}
                                                            </span>
                                                        )}
                                                    </p>
                                                    <div className="text-gray-600 dark:text-slate-400" style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "center", gap: "3px 8px", marginTop: 4, fontSize: 13, fontWeight: 500 }}>
                                                        {state.serving_details.customer_age != null && <span>Age {state.serving_details.customer_age}</span>}
                                                        {state.serving_details.customer_age != null && <span>·</span>}
                                                        <span>{state.serving_details.customer_phone}</span>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Live Statistics Grid */}
                                            <div className="grid grid-cols-4 gap-4 w-full mt-8 pt-6 border-t border-slate-100 relative z-10">
                                                {/* Total Customers (Issued) */}
                                                <div className="flex flex-col items-center justify-center">
                                                    <span className="text-xl font-bold text-slate-900">{state?.total_issued ?? 0}</span>
                                                    <div className="flex items-center gap-1.5 mt-1">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-slate-300"></span>
                                                        <span className="text-[10px] font-medium uppercase tracking-wider text-slate-500">Issued</span>
                                                    </div>
                                                </div>

                                                {/* Remaining (Waiting) */}
                                                <div className="flex flex-col items-center justify-center bg-indigo-50/50 rounded-xl py-2 border border-indigo-50/50">
                                                    <span className="text-xl font-bold text-indigo-600">{state?.waiting_count ?? 0}</span>
                                                    <div className="flex items-center gap-1.5 mt-1">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-400"></span>
                                                        <span className="text-[10px] font-medium uppercase tracking-wider text-slate-500">Waiting</span>
                                                    </div>
                                                </div>

                                                {/* Served */}
                                                <div className="flex flex-col items-center justify-center">
                                                    <span className="text-xl font-bold text-emerald-600">{state?.done_count ?? 0}</span>
                                                    <div className="flex items-center gap-1.5 mt-1">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                                                        <span className="text-[10px] font-medium uppercase tracking-wider text-slate-500">Served</span>
                                                    </div>
                                                </div>

                                                {/* Skipped */}
                                                <div className="flex flex-col items-center justify-center">
                                                    <span className="text-xl font-bold text-rose-600">{state?.skipped_count ?? 0}</span>
                                                    <div className="flex items-center gap-1.5 mt-1">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span>
                                                        <span className="text-[10px] font-medium uppercase tracking-wider text-slate-500">Skipped</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Action buttons */}
                                        <div className={`grid gap-3 w-full ${(!state?.current_serving || state.current_serving === 0) ? "grid-cols-1" : "grid-cols-2"}`} role="toolbar">
                                            {(!state?.current_serving || state.current_serving === 0) && (
                                                <button
                                                    onClick={handleNext}
                                                    disabled={isDisabled || isPaused}
                                                    title={isPaused ? "Queue is currently on a break" : undefined}
                                                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium shadow-sm shadow-indigo-500/10 transition-colors duration-200 w-full flex justify-center items-center h-[52px] rounded-xl text-[15px] gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                                >
                                                    {actionLoading === "next" ? (
                                                        <>
                                                            <span style={{ width: 16, height: 16, borderRadius: "50%", border: "#e5e7eb", borderTopColor: "#fff", display: "inline-block", animation: "spin .7s linear infinite" }} />
                                                            Calling…
                                                        </>
                                                    ) : (
                                                        <>
                                                            <svg width="17" height="17" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
                                                            Call Next
                                                            <kbd style={{ fontSize: 10, opacity: .5, marginLeft: 2, padding: "1px 6px", borderRadius: 4, background: "rgba(255,255,255,.15)" }}>↵</kbd>
                                                        </>
                                                    )}
                                                </button>
                                            )}

                                            {(state?.current_serving ?? 0) > 0 && (
                                                <>
                                                    <button
                                                        onClick={() => performAction("skipped", async () => {
                                                            const res = await api.callNext(queueId, "skipped");
                                                            if ("message" in res) toast(res.message, "info");
                                                            else toast(`${state?.prefix || ""}${res.serving} is now serving`, "success");
                                                        })}
                                                        disabled={isDisabled || isPaused}
                                                        title={isPaused ? "Queue is currently on a break" : undefined}
                                                        className="w-full flex justify-center items-center h-12 rounded-xl bg-rose-600 text-white text-[14px] font-semibold shadow-sm border border-transparent hover:bg-rose-700 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:ring-offset-1 transition-colors gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                                    >
                                                        {actionLoading === "skipped" ? (
                                                            <>
                                                                <span style={{ width: 16, height: 16, borderRadius: "50%", border: "#e5e7eb", borderTopColor: "#fff", display: "inline-block", animation: "spin .7s linear infinite" }} />
                                                                Skipping…
                                                            </>
                                                        ) : (
                                                            <>
                                                                <svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11.933 12.8a1 1 0 000-1.6L6.6 7.2A1 1 0 005 8v8a1 1 0 001.6.8l5.333-4zM19.933 12.8a1 1 0 000-1.6l-5.333-4A1 1 0 0013 8v8a1 1 0 001.6.8l5.333-4z" /></svg>
                                                                Skip & Next
                                                            </>
                                                        )}
                                                    </button>

                                                    <button
                                                        onClick={() => performAction("done", async () => {
                                                            const res = await api.callNext(queueId, "done");
                                                            if ("message" in res) toast(res.message, "info");
                                                            else toast(`${state?.prefix || ""}${res.serving} is now serving`, "success");
                                                        })}
                                                        disabled={isDisabled || isPaused}
                                                        title={isPaused ? "Queue is currently on a break" : undefined}
                                                        className="w-full flex justify-center items-center h-12 rounded-xl bg-emerald-600 text-white text-[14px] font-semibold shadow-sm border border-transparent hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-1 transition-colors gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                                    >
                                                        {actionLoading === "done" ? (
                                                            <>
                                                                <span style={{ width: 16, height: 16, borderRadius: "50%", border: "#e5e7eb", borderTopColor: "#fff", display: "inline-block", animation: "spin .7s linear infinite" }} />
                                                                Completing…
                                                            </>
                                                        ) : (
                                                            <>
                                                                <svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" /></svg>
                                                                Done & Next
                                                            </>
                                                        )}
                                                    </button>
                                                </>
                                            )}
                                        </div>

                                        {/* Manual Controls Row */}
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                                            {/* Manual Entry */}
                                            <div className="flex flex-col gap-3">
                                                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                                    <p className="text-slate-500" style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", margin: 0 }}>Manual Entry</p>
                                                </div>
                                                <button
                                                    onClick={() => setShowAddForm(true)}
                                                    disabled={isDisabled || isPaused}
                                                    title={isPaused ? "Queue is currently on a break" : undefined}
                                                    className="h-10 px-4 w-full text-sm font-medium bg-white dark:bg-slate-800 border border-slate-100 dark:border-white/10 shadow-sm ring-1 ring-slate-900/5 text-slate-600 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white transition-colors flex justify-center items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                                >
                                                    <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
                                                    Add Customer
                                                </button>
                                            </div>

                                            {/* Invite by Number */}
                                            <div className="flex flex-col gap-3">
                                                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                                    <p className="text-slate-500" style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", margin: 0 }}>Invite by Number</p>
                                                </div>
                                                <form onSubmit={handleInvite} style={{ display: "flex", gap: 7 }}>
                                                    <input type="number" min="1" value={inviteNumber} onChange={e => setInviteNumber(e.target.value)} placeholder="Token #" disabled={isDisabled || isPaused} className="h-10 bg-slate-50/60 border border-slate-100 shadow-sm ring-1 ring-slate-900/5 rounded-lg px-3 text-sm text-slate-800 placeholder-slate-400 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 transition-all w-full" />
                                                    <button type="submit" disabled={!inviteNumber || isDisabled || isPaused} title={isPaused ? "Queue is currently on a break" : undefined} className="h-10 px-4 text-sm font-medium bg-white border border-slate-100 shadow-sm ring-1 ring-slate-900/5 text-slate-600 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                                                        Call
                                                    </button>
                                                </form>
                                            </div>

                                            {/* Remove by Number */}
                                            <div className="flex flex-col gap-3">
                                                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                                    <p className="text-slate-500" style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", margin: 0 }}>Remove by Number</p>
                                                </div>
                                                <form onSubmit={handleRemoveByNumber} style={{ display: "flex", gap: 7 }}>
                                                    <input type="number" min="1" value={removeNumber} onChange={e => setRemoveNumber(e.target.value)} placeholder="Token #" disabled={isDisabled || isPaused} className="h-10 bg-slate-50/60 border border-slate-100 shadow-sm ring-1 ring-slate-900/5 rounded-lg px-3 text-sm text-slate-800 placeholder-slate-400 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 transition-all w-full" />
                                                    <button type="submit" disabled={!removeNumber || isDisabled || isPaused} title={isPaused ? "Queue is currently on a break" : undefined} className="h-10 px-4 text-sm font-medium bg-red-50 text-red-700 border border-red-100/80 rounded-lg hover:bg-red-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                                                        Remove
                                                    </button>
                                                </form>
                                            </div>
                                        </div>

                                        {/* Status banners */}
                                        {actionError && (
                                            <div role="alert" style={{ color: "#991b1b", padding: "11px 16px", borderRadius: 10, border: `1px solid ${T.redBorder}`, fontSize: 13, fontWeight: 500 }}>
                                                {actionError}
                                            </div>
                                        )}
                                        {status === "disconnected" && (
                                            <div role="alert" style={{ color: "#78350f", padding: "11px 16px", borderRadius: 10, border: `1px solid ${T.amberBorder}`, fontSize: 13 }}>
                                                <strong>Connection lost.</strong> Retrying connection to live updates. Manual actions are still available.
                                            </div>
                                        )}
                                        {status === "reconnecting" && (
                                            <div role="status" style={{ background: T.blueBg, color: "#1d4ed8", padding: "11px 16px", borderRadius: 10, border: `1px solid ${T.blueBorder}`, fontSize: 13, display: "flex", alignItems: "center", gap: 8 }}>
                                                <span style={{ width: 14, height: 14, border: "#e5e7eb", borderTopColor: "#2563eb", borderRadius: "50%", display: "inline-block", animation: "spin .7s linear infinite" }} />
                                                Reconnecting to live updates…
                                            </div>
                                        )}
                                    </div>

                                    {/* Right: Lists */}
                                    <div className="flex flex-col gap-4 lg:h-full lg:min-h-0">

                                        {/* Waiting/Skipped List */}
                                        <aside className="qd-card bg-white dark:bg-slate-900 dark:border-white/10 flex-1 min-h-0" style={{ overflow: "hidden", display: "flex", flexDirection: "column" }} aria-label="Waiting list">
                                            <div style={{ padding: "14px 18px 10px", borderBottom: `1px solid ${T.cardBorder}`, display: "flex", flexDirection: "column", gap: 8 }}>
                                                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                                                    <div className="flex gap-5 pt-1">
                                                        <button
                                                            onClick={() => { setActiveListTab("waiting"); setWaitingPage(1); }}
                                                            className={`flex items-center gap-2 text-[13px] font-semibold pb-2 transition-colors ${activeListTab === "waiting" ? "text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600 dark:border-indigo-400" : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 border-b-2 border-transparent"}`}
                                                        >
                                                            Waiting
                                                            <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded-full font-bold">{state?.waiting_count ?? 0}</span>
                                                        </button>
                                                        <button
                                                            onClick={() => { setActiveListTab("skipped"); setWaitingPage(1); }}
                                                            className={`flex items-center gap-2 text-[13px] font-semibold pb-2 transition-colors ${activeListTab === "skipped" ? "text-rose-600 dark:text-rose-400 border-b-2 border-rose-600 dark:border-rose-400" : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 border-b-2 border-transparent"}`}
                                                        >
                                                            Skipped
                                                            <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded-full font-bold">{state?.skipped_count ?? 0}</span>
                                                        </button>
                                                    </div>
                                                </div>
                                                <div style={{ position: "relative" }}>
                                                    <span style={{ position: "absolute", inset: "0 auto 0 0", display: "flex", alignItems: "center", paddingLeft: 10, pointerEvents: "none" }}>
                                                        <svg width="13" height="13" fill="none" stroke={T.textMuted} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                                                    </span>
                                                    <input type="text" placeholder={`Search ${activeListTab}…`} value={waitingSearch} onChange={e => setWaitingSearch(e.target.value)} className="qd-input bg-[#fafbfc] dark:bg-slate-950 dark:border-white/10 dark:text-white" style={{ paddingLeft: 30, fontSize: 12.5 }} />
                                                </div>
                                            </div>
                                            <div className="scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-700" style={{ flex: 1, overflowY: "auto", minHeight: 0 }}>
                                                {(activeListTab === "waiting" ? paginatedWaiting : paginatedSkipped).length > 0 ? (activeListTab === "waiting" ? paginatedWaiting : paginatedSkipped).map((t: WaitingToken, idx: number) => (
                                                    <div key={t.id} className="group border-b border-slate-200/60 dark:border-white/10" style={{ padding: "10px 18px", background: idx % 2 === 1 ? "var(--q-row-alt)" : "transparent", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                                                        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                                                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                                                <span className="dark:text-white" style={{ fontSize: 15, fontWeight: 800, fontVariantNumeric: "tabular-nums", minWidth: 48 }}>{state?.prefix || ""}{t.token_number}</span>
                                                                <span style={{ padding: "2px 7px", borderRadius: 5, fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em", color: activeListTab === "waiting" ? T.amber : T.red }}>{activeListTab}</span>
                                                                {manuallyAddedTokens.has(t.token_number)
                                                                    ? <span style={{ padding: "1px 6px", borderRadius: 4, fontSize: 9, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".07em", background: T.violetBg, color: T.violet }}>Manual</span>
                                                                    : <span style={{ padding: "1px 6px", borderRadius: 4, fontSize: 9, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".07em", background: T.cyanBg, color: T.cyan, display: "inline-flex", alignItems: "center", gap: 3 }}><QrCode className="w-2.5 h-2.5" />QR</span>
                                                                }

                                                            </div>
                                                            {t.customer_name && (
                                                                <div className="dark:text-slate-400" style={{ display: "flex", flexWrap: "wrap", gap: "0 8px", fontSize: 11.5, paddingLeft: 56 }}>
                                                                    <span className="dark:text-white" style={{ fontWeight: 600 }}>
                                                                        {t.customer_name}
                                                                        {(t.companion_names && t.companion_names.length > 0) && (
                                                                            <span style={{ fontWeight: 400, color: "#6366f1", marginLeft: 4 }}>
                                                                                (+ {t.companion_names.join(", ")})
                                                                            </span>
                                                                        )}
                                                                    </span>
                                                                    {t.customer_age != null && <span>Age: {t.customer_age}</span>}
                                                                    <span>{t.customer_phone}</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                                            <button
                                                                onClick={() => setSelectedToken({ token_number: t.token_number, prefix: state?.prefix || "", customer_name: t.customer_name, customer_age: t.customer_age, customer_phone: t.customer_phone, companion_names: t.companion_names || [], status: t.status, created_at: t.created_at, served_at: t.served_at, completed_at: t.completed_at, entry_type: manuallyAddedTokens.has(t.token_number) ? "manual" : "qr", queue_name: queueName })}
                                                                className="text-gray-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400" style={{ padding: "5px", background: "transparent", border: "#e5e7eb", borderRadius: 6, cursor: "pointer", transition: "all .15s" }}
                                                                onMouseEnter={e => { e.currentTarget.style.color = T.blue; e.currentTarget.style.background = T.blueBg; }}
                                                                onMouseLeave={e => { e.currentTarget.style.color = T.textMuted; e.currentTarget.style.background = "transparent"; }}
                                                            >
                                                                <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                                            </button>
                                                            {activeListTab === "waiting" ? (
                                                                <button
                                                                    onClick={() => setTokenToRemove({ id: t.id, number: t.token_number })}
                                                                    style={{ fontSize: 11, fontWeight: 700, padding: "4px 9px", color: T.red, border: `1px solid ${T.redBorder}`, borderRadius: 6, cursor: "pointer", transition: "all .15s" }}
                                                                    className="hover:bg-red-50 dark:hover:bg-red-900/30"
                                                                >
                                                                    Remove
                                                                </button>
                                                            ) : (
                                                                <button
                                                                    onClick={() => performAction("recall", async () => {
                                                                        const res = await api.serveSpecificToken(queueId, t.token_number);
                                                                        toast(`Recalled ${state?.prefix || ""}${res.serving}`, "success");
                                                                    })}
                                                                    style={{ fontSize: 11, fontWeight: 700, padding: "4px 9px", color: "#4f46e5", border: `1px solid #4f46e5`, borderRadius: 6, cursor: "pointer", transition: "all .15s" }}
                                                                    className="hover:bg-indigo-50 dark:hover:bg-indigo-900/30"
                                                                >
                                                                    Recall
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                )) : (
                                                    <div style={{ padding: "40px 18px", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center" }}>
                                                        <div style={{ width: 42, height: 42, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 10 }}>
                                                            <svg width="20" height="20" fill="none" stroke={T.brand} viewBox="0 0 24 24" style={{ opacity: .4 }}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                                        </div>
                                                        <p className="text-gray-500 dark:text-slate-400" style={{ fontSize: 13, fontWeight: 500, margin: 0 }}>{waitingSearch ? "No tokens match" : activeListTab === "waiting" ? "No one is waiting" : "No skipped tokens"}</p>
                                                    </div>
                                                )}
                                            </div>
                                            {(activeListTab === "waiting" ? filteredWaiting : filteredSkipped).length > PAGE_SIZE && (
                                                <div className="text-gray-600 dark:text-slate-400 dark:border-white/10" style={{ padding: "10px 18px", borderTopWidth: 1, borderTopStyle: "solid", display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 12 }}>
                                                    <span>Showing {(activeListTab === "waiting" ? paginatedWaiting : paginatedSkipped).length} of {(activeListTab === "waiting" ? filteredWaiting : filteredSkipped).length}</span>
                                                    <div style={{ display: "flex", gap: 4 }}>
                                                        <button onClick={() => setWaitingPage(p => Math.max(1, p - 1))} disabled={waitingPage === 1} style={{ padding: "3px 9px", borderRadius: 6, background: "#fff", border: `1px solid ${T.cardBorder}`, fontSize: 12, cursor: "pointer", opacity: waitingPage === 1 ? .4 : 1 }}>Prev</button>
                                                        <button onClick={() => setWaitingPage(p => p + 1)} disabled={waitingPage * PAGE_SIZE >= (activeListTab === "waiting" ? filteredWaiting : filteredSkipped).length} style={{ padding: "3px 9px", borderRadius: 6, background: "#fff", border: `1px solid ${T.cardBorder}`, fontSize: 12, cursor: "pointer", opacity: waitingPage * PAGE_SIZE >= (activeListTab === "waiting" ? filteredWaiting : filteredSkipped).length ? .4 : 1 }}>Next</button>
                                                    </div>
                                                </div>
                                            )}
                                        </aside>

                                        {/* Recent Activity */}
                                        <aside className="qd-card bg-white dark:bg-slate-900 dark:border-white/10 flex-1 min-h-0" style={{ overflow: "hidden", display: "flex", flexDirection: "column" }} aria-label="Recent activity">
                                            <div style={{ padding: "14px 18px 10px", borderBottom: `1px solid ${T.cardBorder}`, display: "flex", flexDirection: "column", gap: 8 }}>
                                                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                                    <span className="text-slate-500" style={{ width: 24, height: 24, borderRadius: 7, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                                                        <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" /></svg>
                                                    </span>
                                                    <h2 style={{ fontSize: 13, fontWeight: 700, margin: 0 }}>Recent Activity</h2>
                                                </div>
                                                <div style={{ position: "relative" }}>
                                                    <span style={{ position: "absolute", inset: "0 auto 0 0", display: "flex", alignItems: "center", paddingLeft: 10, pointerEvents: "none" }}>
                                                        <svg width="13" height="13" fill="none" stroke={T.textMuted} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                                                    </span>
                                                    <input type="text" placeholder="Search recent…" value={recentSearch} onChange={e => setRecentSearch(e.target.value)} className="qd-input bg-[#fafbfc] dark:bg-slate-950 dark:border-white/10 dark:text-white" style={{ paddingLeft: 30, fontSize: 12.5 }} />
                                                </div>
                                            </div>
                                            <div className="scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-700" style={{ flex: 1, overflowY: "auto", minHeight: 0 }}>
                                                {paginatedRecent.length > 0 ? paginatedRecent.map((t: RecentToken, i: number) => (
                                                    <RecentTokenRow
                                                        key={`${t.token_number}-${i}`}
                                                        token={t}
                                                        prefix={state?.prefix || ""}
                                                        queueName={queueName}
                                                        isManual={manuallyAddedTokens.has(t.token_number)}
                                                        onView={setSelectedToken}
                                                    />
                                                )) : (
                                                    <div style={{ padding: "40px 18px", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center" }}>
                                                        <div style={{ width: 42, height: 42, borderRadius: 10, background: T.greenBg, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 10 }}>
                                                            <svg width="20" height="20" fill="none" stroke={T.green} viewBox="0 0 24 24" style={{ opacity: .4 }}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                                        </div>
                                                        <p className="text-gray-500 dark:text-slate-400" style={{ fontSize: 13, fontWeight: 500, margin: 0 }}>{recentSearch ? "No tokens match" : "No recent activity"}</p>
                                                    </div>
                                                )}
                                            </div>
                                            {filteredRecent.length > RECENT_PAGE_SIZE && (
                                                <div className="text-gray-600 dark:text-slate-400 dark:border-white/10" style={{ padding: "10px 18px", borderTopWidth: 1, borderTopStyle: "solid", display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 12 }}>
                                                    <span>Showing {paginatedRecent.length} of {filteredRecent.length}</span>
                                                    <div style={{ display: "flex", gap: 4 }}>
                                                        <button onClick={() => setRecentPage(p => Math.max(1, p - 1))} disabled={recentPage === 1} style={{ padding: "3px 9px", borderRadius: 6, background: "#fff", border: `1px solid ${T.cardBorder}`, fontSize: 12, cursor: "pointer", opacity: recentPage === 1 ? .4 : 1 }}>Prev</button>
                                                        <button onClick={() => setRecentPage(p => p + 1)} disabled={recentPage * RECENT_PAGE_SIZE >= filteredRecent.length} style={{ padding: "3px 9px", borderRadius: 6, background: "#fff", border: `1px solid ${T.cardBorder}`, fontSize: 12, cursor: "pointer", opacity: recentPage * RECENT_PAGE_SIZE >= filteredRecent.length ? .4 : 1 }}>Next</button>
                                                    </div>
                                                </div>
                                            )}
                                        </aside>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* ═══════════════════════════════════════════
                        SECTION: QR Code
                    ════════════════════════════════════════════ */}
                        {activeSection === "qrcode" && (
                            <div className="fade-in" style={{ display: "flex", flexDirection: "column", gap: 22 }}>
                                <div>
                                    <h1 className="qd-section-title text-gray-900 dark:text-white">QR Code</h1>
                                    <p className="qd-section-sub">Share this QR code or link so customers can join the queue from their phones.</p>
                                </div>
                                <div style={{ maxWidth: 440 }}>
                                    <QueueQRCode queueId={queueId} queueName={queueName} isCollapsible={false} />
                                </div>
                            </div>
                        )}

                        {/* ═══════════════════════════════════════════
                        SECTION: Public Announcement
                    ════════════════════════════════════════════ */}
                        {activeSection === "announcement" && (
                            <div className="fade-in" style={{ display: "flex", flexDirection: "column", gap: 22 }}>
                                <div>
                                    <h1 className="qd-section-title text-gray-900 dark:text-white">Public Announcement</h1>
                                    <p className="qd-section-sub">Set a message that will be displayed to all customers currently waiting in the queue.</p>
                                </div>

                                <div className="qd-card" style={{ padding: 28, maxWidth: 600 }}>
                                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                                        <h3 className="text-gray-500 dark:text-slate-400" style={{ fontSize: 12, fontWeight: 700, letterSpacing: ".09em", textTransform: "uppercase", margin: 0 }}>Announcement</h3>
                                        {(state?.announcement || initialQueue?.announcement) && !isEditingAnnouncement && (
                                            <span className="text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/50" style={{ fontSize: 10, fontWeight: 800, padding: "2px 9px", borderRadius: 5, textTransform: "uppercase", letterSpacing: ".07em" }}>Active</span>
                                        )}
                                    </div>

                                    {isEditingAnnouncement ? (
                                        <form onSubmit={handleUpdateAnnouncement} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                                            <textarea
                                                value={announcementInput}
                                                onChange={e => setAnnouncementInput(e.target.value)}
                                                placeholder="Enter a message to display to all customers waiting…"
                                                disabled={isDisabled || actionLoading === "announcement"}
                                                style={{ width: "100%", padding: "12px 14px", background: "#fafbfc", border: `1.5px solid ${T.cardBorder}`, borderRadius: 10, fontSize: 14, resize: "none", height: 120, outline: "none", transition: "border-color .18s" }}
                                                onFocus={e => (e.currentTarget.style.borderColor = T.brand)}
                                                onBlur={e => (e.currentTarget.style.borderColor = T.cardBorder)}
                                            />
                                            <div style={{ display: "flex", gap: 8 }}>
                                                <button type="submit" disabled={isDisabled || actionLoading === "announcement"} style={{ padding: "9px 20px", background: T.brand, color: "#fff", border: "#e5e7eb", borderRadius: 9, fontWeight: 700, fontSize: 13.5, cursor: "pointer" }}>
                                                    {actionLoading === "announcement" ? "Saving…" : "Save Announcement"}
                                                </button>
                                                <button type="button" onClick={() => setIsEditingAnnouncement(false)} disabled={isDisabled} className="text-gray-600 dark:text-slate-300 dark:bg-slate-800 dark:border-white/10" style={{ padding: "9px 18px", background: "#f4f5f8", border: `1px solid ${T.cardBorder}`, borderRadius: 9, fontWeight: 600, fontSize: 13.5, cursor: "pointer" }}>
                                                    Cancel
                                                </button>
                                            </div>
                                        </form>
                                    ) : (
                                        <div>
                                            {(state?.announcement ?? initialQueue?.announcement) ? (
                                                <div style={{ padding: "14px 16px", borderRadius: 10, border: `1px solid ${T.brandBorder}`, fontSize: 14, whiteSpace: "pre-wrap", lineHeight: 1.65, marginBottom: 16 }}>
                                                    {state?.announcement ?? initialQueue?.announcement}
                                                </div>
                                            ) : (
                                                <div style={{ padding: "28px 16px", background: "#fafbfc", borderRadius: 10, border: `1.5px dashed ${T.cardBorder}`, textAlign: "center", marginBottom: 16 }}>
                                                    <svg width="28" height="28" fill="none" stroke={T.textMuted} viewBox="0 0 24 24" style={{ opacity: .4, margin: "0 auto 8px" }}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" /></svg>
                                                    <p className="text-gray-500 dark:text-slate-400" style={{ fontSize: 13, fontStyle: "italic", margin: 0 }}>No active announcement. Set one below to inform waiting customers.</p>
                                                </div>
                                            )}
                                            <button
                                                onClick={() => setIsEditingAnnouncement(true)}
                                                disabled={isDisabled}
                                                style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "9px 18px", background: T.brand, color: "#fff", border: "#e5e7eb", borderRadius: 9, fontWeight: 700, fontSize: 13.5, cursor: "pointer" }}
                                            >
                                                <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                                {(state?.announcement ?? initialQueue?.announcement) ? "Edit Announcement" : "Set Announcement"}
                                            </button>
                                        </div>
                                    )}

                                    {actionError && (
                                        <div role="alert" style={{ marginTop: 14, color: "#991b1b", padding: "11px 16px", borderRadius: 9, border: `1px solid ${T.redBorder}`, fontSize: 13 }}>
                                            {actionError}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* ═══════════════════════════════════════════
                        SECTION: History
                    ════════════════════════════════════════════ */}
                        {activeSection === "history" && (
                            <QueueHistory
                                queueId={queueId}
                                queueName={queueName}
                                prefix={state?.prefix || initialQueue?.prefix || ""}
                                queueHistory={queueHistory}
                                setQueueHistory={setQueueHistory}
                                historyTotal={historyTotal}
                                setHistoryTotal={setHistoryTotal}
                                historyPage={historyPage}
                                setHistoryPage={setHistoryPage}
                                historyLoading={historyLoading}
                                setHistoryLoading={setHistoryLoading}
                                historyPageSize={HISTORY_PAGE_SIZE}
                                manuallyAddedTokens={manuallyAddedTokens}
                                onViewToken={setSelectedToken}
                                onRecallToken={(num, pfx) => performAction("recall", async () => {
                                    const res = await api.serveSpecificToken(queueId, num);
                                    toast(`Recalled ${pfx || ""}${res.serving}`, "success");
                                })}
                                performAction={performAction}
                                toast={toast}
                            />
                        )}

                        {/* ═══════════════════════════════════════════
                        SECTION: Waiting List (Full Page)
                        ════════════════════════════════════════════ */}
                        {activeSection === "waiting_list" && (
                            <div className="fade-in bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-white/10 p-6 shadow-sm min-h-[calc(100vh-120px)] flex flex-col">
                                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Waiting List</h2>

                                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                                    <div className="flex gap-5">
                                        <button
                                            onClick={() => { setActiveListTab("waiting"); setWaitingPage(1); }}
                                            className={`flex items-center gap-2 text-[14px] font-semibold pb-2 transition-colors ${activeListTab === "waiting" ? "text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600 dark:border-indigo-400" : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 border-b-2 border-transparent"}`}
                                        >
                                            Waiting
                                            <span className="text-[11px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded-full font-bold">{state?.waiting_count ?? 0}</span>
                                        </button>
                                        <button
                                            onClick={() => { setActiveListTab("skipped"); setWaitingPage(1); }}
                                            className={`flex items-center gap-2 text-[14px] font-semibold pb-2 transition-colors ${activeListTab === "skipped" ? "text-rose-600 dark:text-rose-400 border-b-2 border-rose-600 dark:border-rose-400" : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 border-b-2 border-transparent"}`}
                                        >
                                            Skipped
                                            <span className="text-[11px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded-full font-bold">{state?.skipped_count ?? 0}</span>
                                        </button>
                                    </div>
                                    <div style={{ position: "relative", width: 300 }}>
                                        <span style={{ position: "absolute", inset: "0 auto 0 0", display: "flex", alignItems: "center", paddingLeft: 12, pointerEvents: "none" }}>
                                            <svg width="14" height="14" fill="none" stroke={T.textMuted} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                                        </span>
                                        <input type="text" placeholder={`Search ${activeListTab}…`} value={waitingSearch} onChange={e => setWaitingSearch(e.target.value)} className="qd-input bg-[#fafbfc] dark:bg-slate-950 dark:border-white/10 dark:text-white" style={{ paddingLeft: 34 }} />
                                    </div>
                                </div>

                                <div className="border border-slate-200 dark:border-white/10 rounded-xl overflow-hidden flex-1 flex flex-col">
                                    <div className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-white/10 px-4 py-3 grid grid-cols-12 gap-4 text-xs font-bold text-slate-500 uppercase tracking-wider">
                                        <div className="col-span-3">Token</div>
                                        <div className="col-span-4">Customer</div>
                                        <div className="col-span-3">Wait Time</div>
                                        <div className="col-span-2 text-right">Actions</div>
                                    </div>

                                    <div className="flex-1 overflow-y-auto min-h-[300px]">
                                        {(activeListTab === "waiting" ? paginatedWaiting : paginatedSkipped).length > 0 ? (activeListTab === "waiting" ? paginatedWaiting : paginatedSkipped).map((t: WaitingToken, idx: number) => {
                                            const waitMins = Math.floor((Date.now() - new Date(t.created_at || Date.now()).getTime()) / 60000);
                                            return (
                                                <div key={t.id} className="grid grid-cols-12 gap-4 px-4 py-3 border-b border-slate-100 dark:border-white/5 items-center hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                                    <div className="col-span-3 flex items-center gap-3">
                                                        <span className="font-bold text-slate-900 dark:text-white tabular-nums">{state?.prefix || ""}{t.token_number}</span>
                                                        <span style={{ padding: "2px 7px", borderRadius: 5, fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em", color: activeListTab === "waiting" ? T.amber : T.red }}>{activeListTab}</span>
                                                        {manuallyAddedTokens.has(t.token_number)
                                                            ? <span style={{ padding: "1px 6px", borderRadius: 4, fontSize: 9, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".07em", background: T.violetBg, color: T.violet }}>Manual</span>
                                                            : <span style={{ padding: "1px 6px", borderRadius: 4, fontSize: 9, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".07em", background: T.cyanBg, color: T.cyan, display: "inline-flex", alignItems: "center", gap: 3 }}><QrCode className="w-2.5 h-2.5" />QR</span>
                                                        }
                                                    </div>
                                                    <div className="col-span-4 flex flex-col justify-center">
                                                        <span className="text-sm font-medium text-slate-900 dark:text-white">
                                                            {t.customer_name || "Walk-in"}
                                                            {(t.companion_names && t.companion_names.length > 0) && (
                                                                <span className="text-indigo-500 font-normal ml-2 text-xs">
                                                                    (+ {t.companion_names.length} comp.)
                                                                </span>
                                                            )}
                                                        </span>
                                                        <span className="text-xs text-slate-500 truncate mt-0.5">
                                                            {t.customer_phone || "-"} {t.customer_age ? `• Age: ${t.customer_age}` : ""}
                                                        </span>
                                                    </div>
                                                    <div className="col-span-3 flex items-center">
                                                        <span className="text-sm text-slate-600 dark:text-slate-400">
                                                            {waitMins < 1 ? "< 1 min" : `${waitMins} min${waitMins !== 1 ? "s" : ""}`}
                                                        </span>
                                                    </div>
                                                    <div className="col-span-2 flex items-center justify-end gap-2">
                                                        <button
                                                            onClick={() => setSelectedToken({ token_number: t.token_number, prefix: state?.prefix || "", customer_name: t.customer_name, customer_age: t.customer_age, customer_phone: t.customer_phone, companion_names: t.companion_names || [], status: t.status, created_at: t.created_at, served_at: t.served_at, completed_at: t.completed_at, entry_type: manuallyAddedTokens.has(t.token_number) ? "manual" : "qr", queue_name: queueName })}
                                                            className="text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 p-1.5 rounded-md transition-colors"
                                                            title="View Details"
                                                        >
                                                            <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                                        </button>
                                                        {activeListTab === "waiting" ? (
                                                            <button
                                                                onClick={() => setTokenToRemove({ id: t.id, number: t.token_number })}
                                                                className="text-xs font-bold px-2.5 py-1 text-rose-600 border border-rose-200 rounded-md hover:bg-rose-50 dark:hover:bg-rose-900/30 transition-colors"
                                                            >
                                                                Remove
                                                            </button>
                                                        ) : (
                                                            <button
                                                                onClick={() => performAction("recall", async () => {
                                                                    const res = await api.serveSpecificToken(queueId, t.token_number);
                                                                    toast(`Recalled ${state?.prefix || ""}${res.serving}`, "success");
                                                                })}
                                                                className="text-xs font-bold px-2.5 py-1 text-indigo-600 border border-indigo-200 rounded-md hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-colors"
                                                            >
                                                                Recall
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        }) : (
                                            <div className="h-full flex flex-col items-center justify-center p-8 text-center">
                                                <div className="w-12 h-12 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mb-3">
                                                    <svg width="24" height="24" fill="none" stroke="currentColor" className="text-slate-400" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                                </div>
                                                <p className="text-slate-500 font-medium">
                                                    {waitingSearch ? "No tokens match your search" : activeListTab === "waiting" ? "No one is waiting right now" : "No skipped tokens"}
                                                </p>
                                            </div>
                                        )}
                                    </div>

                                    {(activeListTab === "waiting" ? filteredWaiting : filteredSkipped).length > PAGE_SIZE && (
                                        <div className="bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-white/10 px-4 py-3 flex items-center justify-between text-xs text-slate-500">
                                            <span>Showing {(activeListTab === "waiting" ? paginatedWaiting : paginatedSkipped).length} of {(activeListTab === "waiting" ? filteredWaiting : filteredSkipped).length} tokens</span>
                                            <div className="flex gap-2">
                                                <button onClick={() => setWaitingPage(p => Math.max(1, p - 1))} disabled={waitingPage === 1} className="px-3 py-1.5 rounded-md bg-white border border-slate-200 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed">Previous</button>
                                                <button onClick={() => setWaitingPage(p => p + 1)} disabled={waitingPage * PAGE_SIZE >= (activeListTab === "waiting" ? filteredWaiting : filteredSkipped).length} className="px-3 py-1.5 rounded-md bg-white border border-slate-200 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed">Next</button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* ═══════════════════════════════════════════
                        SECTION: Recent Activity
                        ════════════════════════════════════════════ */}
                        {activeSection === "recent_activity" && (
                            <div className="fade-in bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-white/10 p-6 shadow-sm min-h-[calc(100vh-120px)] flex flex-col">
                                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Recent Activity</h2>

                                <div className="mb-4">
                                    <div style={{ position: "relative", maxWidth: 350 }}>
                                        <span style={{ position: "absolute", inset: "0 auto 0 0", display: "flex", alignItems: "center", paddingLeft: 12, pointerEvents: "none" }}>
                                            <svg width="14" height="14" fill="none" stroke={T.textMuted} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                                        </span>
                                        <input type="text" placeholder="Search recent…" value={recentSearch} onChange={e => setRecentSearch(e.target.value)} className="qd-input bg-[#fafbfc] dark:bg-slate-950 dark:border-white/10 dark:text-white" style={{ paddingLeft: 34, fontSize: 13 }} />
                                    </div>
                                </div>

                                <div className="space-y-3 flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-700 pr-2">
                                    {paginatedRecent.length > 0 ? paginatedRecent.map((t: RecentToken, i: number) => (
                                        <RecentTokenRow
                                            key={`${t.token_number}-${i}`}
                                            token={t}
                                            prefix={state?.prefix || ""}
                                            queueName={queueName}
                                            isManual={manuallyAddedTokens.has(t.token_number)}
                                            onView={setSelectedToken}
                                        />
                                    )) : (
                                        <div className="py-12 text-center text-slate-500">No recent activity found.</div>
                                    )}
                                </div>

                                {filteredRecent.length > RECENT_PAGE_SIZE && (
                                    <div className="mt-6 pt-4 border-t border-slate-200 dark:border-white/10 flex items-center justify-between text-sm text-slate-500">
                                        <span>Showing {paginatedRecent.length} of {filteredRecent.length}</span>
                                        <div className="flex gap-2">
                                            <button onClick={() => setRecentPage(p => Math.max(1, p - 1))} disabled={recentPage === 1} className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 disabled:opacity-50 transition-colors">Prev</button>
                                            <button onClick={() => setRecentPage(p => p + 1)} disabled={recentPage * RECENT_PAGE_SIZE >= filteredRecent.length} className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 disabled:opacity-50 transition-colors">Next</button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* ── Modals ─────────────────────────────────────────── */}

                <ConfirmModal isOpen={showDeleteConfirm} title="Delete Queue" message={`Are you sure you want to permanently delete the queue "${state?.queue_name || "this queue"}"? All associated tokens and data will be lost forever.`} confirmLabel="Delete Queue" confirmVariant="danger" onConfirm={handleDelete} onCancel={() => setShowDeleteConfirm(false)} isLoading={deleting} requireInput={true} requiredText={state?.queue_name || ""} />
                <ConfirmModal isOpen={showResetConfirm} title="Reset Queue" message={`Are you sure you want to reset the queue "${state?.queue_name || "this queue"}"? This will delete all tokens and reset the current serving number to 0. This cannot be undone.`} confirmLabel="Reset Queue" confirmVariant="danger" onConfirm={handleReset} onCancel={() => setShowResetConfirm(false)} isLoading={resetting} requireInput={true} requiredText={state?.queue_name || ""} />
                <ConfirmModal isOpen={!!tokenToRemove} title="Remove Customer" message={`Are you sure you want to remove token ${state?.prefix || ""}${tokenToRemove?.number} from the waiting list? They will be permanently marked as deleted.`} confirmLabel="Remove Token" confirmVariant="danger" onConfirm={handleConfirmRemove} onCancel={() => setTokenToRemove(null)} isLoading={actionLoading === "remove"} />
                
                {/* WhatsApp Confirmation Modal */}
                <ConfirmModal 
                    isOpen={showWhatsappConfirm} 
                    title="Send WhatsApp Update?" 
                    message={`Do you want to send a WhatsApp notification to ${addName.trim()} containing their token number and tracking link?`} 
                    confirmLabel="Send with WhatsApp" 
                    confirmVariant="primary"
                    cancelLabel="Skip WhatsApp"
                    onConfirm={() => handleConfirmAddCustomer(true)} 
                    onCancel={() => handleConfirmAddCustomer(false)} 
                    isLoading={actionLoading === "add"} 
                />
                {showAddForm && (
                    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md animate-in fade-in duration-200" onClick={(e) => { if (e.target === e.currentTarget) setShowAddForm(false); }}>
                        <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-200 dark:border-white/10">
                            <div className="px-6 py-5 border-b border-slate-100 dark:border-white/5 flex items-center justify-between bg-slate-50/50 dark:bg-slate-950/50">
                                <div>
                                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">Manual Entry</h3>
                                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Add a new customer to the queue</p>
                                </div>
                                <button onClick={() => setShowAddForm(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors bg-white dark:bg-slate-800 shadow-sm ring-1 ring-slate-900/5 p-2 rounded-full">
                                    <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                                </button>
                            </div>
                            <div className="p-6 flex flex-col gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Full Name <span className="text-red-500">*</span></label>
                                    <input type="text" value={addName} onChange={e => setAddName(e.target.value)} placeholder="e.g. Jane Doe" maxLength={50} className={`w-full h-11 bg-slate-50 dark:bg-slate-950 border ${debouncedAddName.length > 0 && !/^[A-Za-z\s'-]{2,50}$/.test(debouncedAddName.trim()) ? 'border-red-300 focus:ring-red-500' : 'border-slate-200 dark:border-white/10 focus:ring-indigo-500 focus:border-indigo-500'} rounded-xl px-4 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 transition-all outline-none`} />
                                    {debouncedAddName.length > 0 && !/^[A-Za-z\s'-]{2,50}$/.test(debouncedAddName.trim()) && (
                                        <p className="text-xs text-red-500 mt-1 flex items-center gap-1 font-medium">
                                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01" /></svg>
                                            Please enter a valid name (letters only, min 2 chars).
                                        </p>
                                    )}
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Phone Number <span className="text-red-500">*</span></label>
                                    <div className="flex gap-2">
                                        <div className="relative">
                                            <select value={addCountryCode} onChange={e => setAddCountryCode(e.target.value)} className="h-11 pl-3 pr-8 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/10 rounded-xl text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 appearance-none cursor-pointer transition-all">
                                                {COUNTRY_CODES.map((c) => (
                                                    <option key={c.code} value={c.code}>{c.flag} {c.code}</option>
                                                ))}
                                            </select>
                                            <div className="absolute inset-y-0 right-2 flex items-center pointer-events-none text-slate-400">
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                                            </div>
                                        </div>
                                        <input type="tel" value={addPhone} onChange={e => setAddPhone(e.target.value.replace(/\D/g, "").slice(0, 10))} placeholder="e.g. 1234567890" maxLength={10} className="flex-1 h-11 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/10 rounded-xl px-4 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none" />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Age <span className="text-slate-400 font-normal normal-case">(optional)</span></label>
                                        <input type="number" value={addAge} onChange={e => setAddAge(e.target.value)} placeholder="e.g. 28" className="w-full h-11 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/10 rounded-xl px-4 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none" />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Companions <span className="text-slate-400 font-normal normal-case">(optional)</span></label>
                                        <input type="text" value={addCompanions} onChange={e => setAddCompanions(e.target.value)} placeholder="e.g. John, Mary" className="w-full h-11 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/10 rounded-xl px-4 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none" />
                                    </div>
                                </div>
                            </div>
                            <div className="px-6 py-5 bg-slate-50 dark:bg-slate-950/50 border-t border-slate-100 dark:border-white/5 flex items-center gap-3 justify-end">
                                <button onClick={() => { setShowAddForm(false); setAddName(""); setAddPhone(""); setAddAge(""); setAddCompanions(""); }} className="px-5 py-2.5 rounded-xl text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors">
                                    Cancel
                                </button>
                                <button 
                                    onClick={handlePreAddCustomer} 
                                    disabled={!isAddNameValid || !addPhone.trim() || actionLoading === "add" || isPaused} 
                                    className="px-6 py-2.5 rounded-xl text-sm font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                >
                                    {actionLoading === "add" ? (
                                        <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Adding...</>
                                    ) : (
                                        "Add to Queue"
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
                <TokenDetailModal
                    token={selectedToken}
                    onClose={() => setSelectedToken(null)}
                    onRecall={selectedToken ? () => performAction("recall", async () => {
                        const res = await api.serveSpecificToken(queueId, selectedToken.token_number);
                        toast(`Recalled ${state?.prefix || ""}${res.serving}`, "success");
                    }) : undefined}
                />
            </div>
        </>
    );
}

// ── Recent Token Row ───────────────────────────────────────────────
const RecentTokenRow = React.memo(function RecentTokenRow({
    token: t, prefix, queueName, isManual, onView,
}: {
    token: RecentToken;
    prefix: string;
    queueName?: string;
    isManual?: boolean;
    onView?: (data: TokenDetailData) => void;
}) {
    const statusClasses: Record<string, string> = {
        serving: "bg-blue-50 text-blue-700 border border-blue-100/80 rounded-full font-medium px-2.5 py-0.5",
        done: "bg-emerald-50 text-emerald-700 border border-emerald-100/80 rounded-full font-medium px-2.5 py-0.5",
        skipped: "bg-amber-50 text-amber-700 border border-amber-100/80 rounded-full font-medium px-2.5 py-0.5",
        deleted: "bg-red-50 text-red-700 border border-red-100/80 rounded-full font-medium px-2.5 py-0.5",
        waiting: "bg-amber-50 text-amber-700 border border-amber-100/80 rounded-full font-medium px-2.5 py-0.5",
    };
    const sClass = statusClasses[t.status] || "bg-slate-50 text-slate-700 border border-slate-100/80 rounded-full font-medium px-2.5 py-0.5";

    return (
        <div style={{ padding: "10px 18px", display: "flex", alignItems: "center", justifyContent: "space-between", transition: "background .15s" }} className="group border-b border-slate-200/60 dark:border-white/10"
            onMouseEnter={e => (e.currentTarget.style.background = "var(--q-row-alt)")}
            onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
        >
            <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                    <span className="dark:text-white" style={{ fontSize: 15, fontWeight: 800, fontVariantNumeric: "tabular-nums", minWidth: 48 }}>{prefix}{t.token_number}</span>
                    <span className={`text-[10px] tracking-wider uppercase ${sClass}`}>{t.status}</span>
                    {isManual
                        ? <span className="bg-slate-50 text-slate-700 border border-slate-200/60 rounded-full font-medium px-2 py-0.5 text-[9px] tracking-wider uppercase">Manual</span>
                        : <span className="bg-slate-50 text-slate-700 border border-slate-200/60 rounded-full font-medium px-2 py-0.5 text-[9px] tracking-wider uppercase inline-flex items-center gap-1"><QrCode className="w-2.5 h-2.5" />QR</span>
                    }
                </div>
                {t.customer_name && (
                    <div className="dark:text-slate-400" style={{ display: "flex", flexWrap: "wrap", gap: "0 8px", fontSize: 11.5, paddingLeft: 56 }}>
                        <span className="font-medium text-slate-900 dark:text-white capitalize">
                            {t.customer_name}
                            {(t.companion_names && t.companion_names.length > 0) && (
                                <span style={{ fontWeight: 400, color: "#6366f1", marginLeft: 4, textTransform: "none" }}>
                                    (+ {t.companion_names.join(", ")})
                                </span>
                            )}
                        </span>

                        {t.customer_age != null && <span>Age: {t.customer_age}</span>}
                        <span>{t.customer_phone}</span>
                    </div>
                )}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                {onView && (
                    <button
                        onClick={() => onView({ token_number: t.token_number, prefix, customer_name: t.customer_name, customer_age: t.customer_age, customer_phone: t.customer_phone, companion_names: t.companion_names || [], status: t.status, created_at: t.created_at, served_at: t.served_at, completed_at: t.completed_at, entry_type: isManual ? "manual" : "qr", queue_name: queueName })}
                        style={{ padding: "5px", background: "transparent", border: "#e5e7eb", borderRadius: 6, cursor: "pointer", transition: "all .15s" }}
                        onMouseEnter={e => { e.currentTarget.style.color = T.blue; e.currentTarget.style.background = T.blueBg; }}
                        onMouseLeave={e => { e.currentTarget.style.color = T.textMuted; e.currentTarget.style.background = "transparent"; }}
                    >
                        <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                    </button>
                )}
                <span className="dark:text-slate-400" style={{ fontSize: 11.5, fontVariantNumeric: "tabular-nums" }}>
                    {t.served_at ? new Date(t.served_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—"}
                </span>
            </div>
        </div>
    );
});

// ── Queue History Section ──────────────────────────────────────────
function QueueHistory({
    queueId, queueName, prefix,
    queueHistory, setQueueHistory,
    historyTotal, setHistoryTotal,
    historyPage, setHistoryPage,
    historyLoading, setHistoryLoading,
    historyPageSize, manuallyAddedTokens, onViewToken, onRecallToken, performAction, toast,
}: {
    queueId: string; queueName: string; prefix: string;
    queueHistory: TokenHistoryItem[]; setQueueHistory: (d: TokenHistoryItem[]) => void;
    historyTotal: number; setHistoryTotal: (t: number) => void;
    historyPage: number; setHistoryPage: (p: number | ((prev: number) => number)) => void;
    historyLoading: boolean; setHistoryLoading: (l: boolean) => void;
    historyPageSize: number; manuallyAddedTokens: Set<number>;
    onViewToken: (t: TokenDetailData) => void;
    onRecallToken: (tokenNumber: number, prefix: string) => void;
    performAction: (action: string, fn: () => Promise<void>) => Promise<void>;
    toast: (msg: string, type: "success" | "error" | "info" | "warning") => void;
}) {
    const [searchQuery, setSearchQuery] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("");
    const [exporting, setExporting] = useState(false);

    const handleExport = async () => {
        setExporting(true);
        try {
            const blob = await api.exportAnalyticsCSV({
                queueId,
                search: debouncedSearch || undefined,
                status: statusFilter || undefined,
            });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `Queue_History.csv`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
        } catch (err) {
            console.error("Export failed", err);
            alert("Failed to export history.");
        } finally {
            setExporting(false);
        }
    };

    useEffect(() => {
        const timer = setTimeout(() => setDebouncedSearch(searchQuery), 350);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    useEffect(() => { setHistoryPage(1); }, [debouncedSearch, statusFilter, setHistoryPage]);

    useEffect(() => {
        setHistoryLoading(true);
        api.getHistory({ queueId, search: debouncedSearch || undefined, status: statusFilter || undefined, limit: historyPageSize, offset: (historyPage - 1) * historyPageSize })
            .then(res => { setQueueHistory(res.items); setHistoryTotal(res.total); })
            .catch(console.error)
            .finally(() => setHistoryLoading(false));
    }, [queueId, historyPage, historyPageSize, statusFilter, debouncedSearch, setQueueHistory, setHistoryTotal, setHistoryLoading]);

    const calcWaitTime = (created: string | null, served: string | null) => {
        if (!served || !created) return "—";
        const mins = Math.floor((new Date(served).getTime() - new Date(created).getTime()) / 60000);
        return mins < 0 ? "—" : mins === 0 ? "< 1 min" : `${mins} min${mins !== 1 ? "s" : ""}`;
    };

    const totalPages = Math.ceil(historyTotal / historyPageSize) || 1;

    const statusStyleMap: Record<string, { bg: string; color: string; label: string }> = {
        done: { bg: T.greenBg, color: T.green, label: "Completed" },
        serving: { bg: T.blueBg, color: T.blue, label: "Serving" },
        skipped: { bg: "#f3f4f6", color: "#6b7280", label: "Skipped" },
        waiting: { bg: T.amberBg, color: T.amber, label: "Waiting" },
        deleted: { bg: T.redBg, color: T.red, label: "Removed" },
    };

    return (
        <div className="fade-in" style={{ display: "flex", flexDirection: "column", gap: 22 }}>
            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-end", justifyContent: "space-between", gap: 10 }}>
                <div>
                    <h1 className="qd-section-title text-gray-900 dark:text-white">Queue History</h1>
                    <p className="qd-section-sub">View past tokens and patient records for this queue.</p>
                </div>
                {historyTotal > 0 && <span style={{ fontSize: 12.5, fontWeight: 500 }}>{historyTotal} record{historyTotal !== 1 ? "s" : ""} found</span>}
            </div>

            {/* Filters */}
            <div className="qd-card" style={{ padding: "16px 20px" }}>
                <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-end", gap: 12 }}>
                    <div style={{ flex: 1, minWidth: 200, display: "flex", flexDirection: "column", gap: 6 }}>
                        <label style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".09em", textTransform: "uppercase", }}>Search Patients</label>
                        <div style={{ position: "relative" }}>
                            <span style={{ position: "absolute", inset: "0 auto 0 0", display: "flex", alignItems: "center", paddingLeft: 11, pointerEvents: "none" }}>
                                <svg width="14" height="14" fill="none" stroke={T.textMuted} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                            </span>
                            <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Name, token #, or phone…" className="qd-input bg-[#fafbfc] dark:bg-slate-950 dark:border-white/10 dark:text-white" style={{ paddingLeft: 34 }} />
                            {searchQuery && (
                                <button onClick={() => setSearchQuery("")} style={{ position: "absolute", inset: "0 0 0 auto", display: "flex", alignItems: "center", paddingRight: 11, background: "transparent", border: "#e5e7eb", cursor: "pointer" }}>
                                    <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                                </button>
                            )}
                        </div>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        <label style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".09em", textTransform: "uppercase", }}>Status</label>
                        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="qd-input bg-[#fafbfc] dark:bg-slate-950 dark:border-white/10 dark:text-white" style={{ width: 148, cursor: "pointer" }}>
                            <option value="">All</option>
                            <option value="done">Completed</option>
                            <option value="skipped">Skipped</option>
                            <option value="serving">Serving</option>
                        </select>
                    </div>
                    <button
                        onClick={handleExport}
                        disabled={exporting || historyTotal === 0}
                        className="qd-btn-secondary"
                        style={{ height: 38, padding: "0 16px", alignSelf: "flex-end", display: "flex", alignItems: "center", gap: 6, opacity: (exporting || historyTotal === 0) ? 0.6 : 1, cursor: (exporting || historyTotal === 0) ? "not-allowed" : "pointer" }}
                    >
                        {exporting ? (
                            <span style={{ width: 14, height: 14, border: `2px solid ${T.textMuted}`, borderTopColor: "currentColor", borderRadius: "50%", display: "inline-block", animation: "spin .7s linear infinite" }} />
                        ) : (
                            <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                        )}
                        Export CSV
                    </button>
                </div>
            </div>

            {/* Table */}
            <div className="qd-card" style={{ overflow: "hidden" }}>
                <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", textAlign: "left", fontSize: 13.5, borderCollapse: "collapse" }}>
                        <thead>
                            <tr style={{ background: "#fafbfc", borderBottom: `1px solid ${T.cardBorder}` }}>
                                {["Token", "Patient", "Status", "Type", "Wait Time", "Actions"].map(h => (
                                    <th key={h} style={{ padding: "11px 18px", fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".09em", whiteSpace: "nowrap" }}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {historyLoading ? (
                                <tr><td colSpan={6} style={{ padding: "48px", textAlign: "center", }}>
                                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                                        <span style={{ width: 18, height: 18, border: `2px solid ${T.brandLight}`, borderTopColor: T.brand, borderRadius: "50%", display: "inline-block", animation: "spin .7s linear infinite" }} />
                                        <span style={{ fontSize: 13 }}>Loading records…</span>
                                    </div>
                                </td></tr>
                            ) : queueHistory.length === 0 ? (
                                <tr><td colSpan={6} style={{ padding: "48px", textAlign: "center", fontSize: 13 }}>No matching history found for this queue.</td></tr>
                            ) : queueHistory.map(item => {
                                const isManual = manuallyAddedTokens.has(item.token_number);
                                const ss = statusStyleMap[item.status] || { bg: "#f3f4f6", color: "#6b7280", label: item.status };
                                return (
                                    <tr key={item.id} style={{ /*border*/ borderBottom: `1px solid #f4f5f8`, transition: "background .12s" }}
                                        onMouseEnter={e => (e.currentTarget.style.background = "var(--q-row-alt)")}
                                        onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                                    >
                                        <td style={{ padding: "12px 18px", fontWeight: 800, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>{item.queue_prefix}{item.token_number}</td>
                                        <td style={{ padding: "12px 18px" }}>
                                            <div style={{ display: "flex", flexDirection: "column" }}>
                                                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                                    <span style={{ fontWeight: 600, maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                                        {item.customer_name || "—"}
                                                        {(item.companion_names && item.companion_names.length > 0) && (
                                                            <span style={{ fontWeight: 400, color: "#6366f1", marginLeft: 4 }}>
                                                                (+ {item.companion_names.join(", ")})
                                                            </span>
                                                        )}
                                                    </span>
                                                </div>
                                                <span style={{ fontSize: 12, }}>{item.customer_phone || "—"}</span>
                                            </div>
                                        </td>
                                        <td style={{ padding: "12px 18px", whiteSpace: "nowrap" }}>
                                            <span style={{ padding: "3px 8px", borderRadius: 6, fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".07em", background: ss.bg, color: ss.color }}>{ss.label}</span>
                                        </td>
                                        <td style={{ padding: "12px 18px", whiteSpace: "nowrap" }}>
                                            <span style={{ padding: "3px 8px", borderRadius: 6, fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".07em", background: isManual ? T.violetBg : T.cyanBg, color: isManual ? T.violet : T.cyan, display: "inline-flex", alignItems: "center", gap: 3 }}>{!isManual && <QrCode className="w-2.5 h-2.5" />}{isManual ? "Manual" : "QR"}</span>
                                        </td>
                                        <td style={{ padding: "12px 18px", whiteSpace: "nowrap", fontSize: 12.5, fontVariantNumeric: "tabular-nums" }}>{calcWaitTime(item.created_at, item.served_at)}</td>
                                        <td style={{ padding: "12px 18px", whiteSpace: "nowrap" }}>
                                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                                {item.status === "skipped" && (
                                                    <button
                                                        onClick={() => onRecallToken(item.token_number, item.queue_prefix || "")}
                                                        style={{ fontSize: 10, fontWeight: 700, padding: "4px 8px", color: "#4f46e5", border: `1px solid #4f46e5`, borderRadius: 6, cursor: "pointer", transition: "all .15s" }}
                                                        className="hover:bg-indigo-50 dark:hover:bg-indigo-900/30"
                                                    >
                                                        Recall
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => onViewToken({ token_number: item.token_number, prefix: item.queue_prefix, customer_name: item.customer_name, customer_age: item.customer_age, customer_phone: item.customer_phone, companion_names: item.companion_names || [], status: item.status, created_at: item.created_at, served_at: item.served_at, completed_at: item.completed_at, entry_type: isManual ? "manual" : "qr", queue_name: queueName })}
                                                    style={{ padding: "6px", background: "transparent", border: "#e5e7eb", borderRadius: 7, cursor: "pointer", transition: "all .15s" }}
                                                    onMouseEnter={e => { e.currentTarget.style.color = T.blue; e.currentTarget.style.background = T.blueBg; }}
                                                    onMouseLeave={e => { e.currentTarget.style.color = "inherit"; e.currentTarget.style.background = "transparent"; }}
                                                >
                                                    <svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                {historyTotal > historyPageSize && (
                    <div style={{ background: "#fafbfc", padding: "14px 20px", borderTop: `1px solid ${T.cardBorder}`, display: "flex", flexDirection: "column", gap: 10, alignItems: "center", justifyContent: "space-between" }} className="sm:flex-row">
                        <p style={{ fontSize: 12.5, margin: 0 }}>
                            Showing <strong style={{}}>{(historyPage - 1) * historyPageSize + 1}</strong>–<strong style={{}}>{Math.min(historyPage * historyPageSize, historyTotal)}</strong> of <strong style={{}}>{historyTotal}</strong> patients
                        </p>
                        <div style={{ display: "flex", gap: 4 }}>
                            {[
                                { label: "«", onClick: () => setHistoryPage(1), disabled: historyPage === 1 },
                                { label: "Prev", onClick: () => setHistoryPage(p => Math.max(1, p - 1)), disabled: historyPage === 1 },
                            ].map(btn => (
                                <button key={btn.label} onClick={btn.onClick} disabled={btn.disabled} style={{ padding: "5px 10px", fontSize: 12.5, fontWeight: 700, background: "#fff", border: `1px solid ${T.cardBorder}`, borderRadius: 7, cursor: btn.disabled ? "not-allowed" : "pointer", opacity: btn.disabled ? .4 : 1 }}>{btn.label}</button>
                            ))}

                            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                let p: number;
                                if (totalPages <= 5) p = i + 1;
                                else if (historyPage <= 3) p = i + 1;
                                else if (historyPage >= totalPages - 2) p = totalPages - 4 + i;
                                else p = historyPage - 2 + i;
                                return (
                                    <button key={p} onClick={() => setHistoryPage(p)} style={{ padding: "5px 10px", fontSize: 12.5, fontWeight: 700, border: "#e5e7eb", borderRadius: 7, cursor: "pointer", background: p === historyPage ? T.brand : "#fff", color: p === historyPage ? "#fff" : T.text, borderColor: p === historyPage ? T.brand : T.cardBorder }}>{p}</button>
                                );
                            })}

                            {[
                                { label: "Next", onClick: () => setHistoryPage(p => p + 1), disabled: historyPage >= totalPages },
                                { label: "»", onClick: () => setHistoryPage(totalPages), disabled: historyPage >= totalPages },
                            ].map(btn => (
                                <button key={btn.label} onClick={btn.onClick} disabled={btn.disabled} style={{ padding: "5px 10px", fontSize: 12.5, fontWeight: 700, background: "#fff", border: `1px solid ${T.cardBorder}`, borderRadius: 7, cursor: btn.disabled ? "not-allowed" : "pointer", opacity: btn.disabled ? .4 : 1 }}>{btn.label}</button>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}