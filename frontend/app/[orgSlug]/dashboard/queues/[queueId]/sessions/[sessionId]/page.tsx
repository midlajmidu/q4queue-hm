"use client";

import { use, useState, useCallback, useRef, useEffect } from "react";
import React from "react";
import Link from "next/link";
import { api, ApiError } from "@/lib/api";
import { useRouter } from "next/navigation";
import { useQueueSocket } from "@/hooks/useQueueSocket";
import { getToken, getCurrentUser } from "@/lib/auth";
import { useAuth } from "@/hooks/useAuth";
import { useDashBase } from "@/hooks/useDashBase";
import { useToast } from "@/components/Toast";
import ConnectionBadge from "@/components/ConnectionBadge";
import ConfirmModal from "@/components/ConfirmModal";
import QueueQRCode from "@/components/QueueQRCode";
import TokenDetailModal from "@/components/TokenDetailModal";
import type { TokenDetailData } from "@/components/TokenDetailModal";
import type { RecentToken, WaitingToken, QueueResponse, TokenHistoryItem, ServingToken } from "@/types/api";
import { Pause, Play, Clock, QrCode, UserPlus, RefreshCw, Menu, MoreVertical, X, Users, List, Phone, CheckCircle2, MinusCircle, Hourglass, Send, User, Filter, Tv, ArrowRight, ShieldCheck, Settings2 } from "lucide-react";
import { toast as sonnerToast } from "sonner";
import ServiceLinesGrid from "@/components/ServiceLinesGrid";
import WebRTCCallModal from "@/components/organization-admin/WebRTCCallModal";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Logo } from "@/components/ui/Logo";
import { useBranchTimezone } from "@/context/BranchTimezoneContext";
import { fmtTime, fmtDateTime, nowInTz, localTodayStr } from "@/lib/tzformat";
import QueueTokenSettings from "@/components/organization-admin/queue/QueueTokenSettings";

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
    params: Promise<{ queueId: string; sessionId: string }>;
}

type ActiveSection = "queues" | "waiting_list" | "qrcode" | "announcement" | "history" | "connect_tv" | "settings";

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
    const { queueId, sessionId } = use(params);
    const token = getToken();
    const user = getCurrentUser();
    const { isReadOnly } = useAuth();
    const dashBase = useDashBase();
    const isStaff = user?.role === "staff";
    const isGlobalOrOrgAdmin = user?.role === "super_admin" || user?.role === "organization_admin";
    const canManageQueue = !isGlobalOrOrgAdmin && !isReadOnly;
    const { toast } = useToast();
    const tz = useBranchTimezone();

    const handleNewCustomer = useCallback((data: any) => {
        sonnerToast.custom((t) => (
            <div
                onClick={() => sonnerToast.dismiss(t)}
                className="w-[calc(100vw-32px)] sm:w-[320px] max-w-[320px] mx-auto bg-white rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.08)] border border-slate-200 cursor-pointer hover:border-slate-300 transition-colors duration-200 animate-in slide-in-from-top-4 fade-in ease-out overflow-hidden"
            >
                <div className="flex items-start px-4 py-4 gap-3.5">
                    {/* Professional Flat Icon */}
                    <div className="w-10 h-10 flex-shrink-0 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
                        <UserPlus className="h-5 w-5 stroke-[2px]" />
                    </div>

                    {/* Clean Typography */}
                    <div className="flex flex-col flex-1 min-w-0 justify-center pt-0.5">
                        {/* Header Row */}
                        <div className="flex justify-between items-center mb-1">
                            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">New Customer</span>
                            <span className="text-[11px] font-medium text-slate-400 whitespace-nowrap ml-2">
                                {data.time ? fmtTime(data.time, tz) : ""}
                            </span>
                        </div>
                        {/* Primary Subject */}
                        <span className="text-xl font-bold text-slate-900 dark:text-white leading-none truncate">
                            {data.token}
                        </span>
                        {/* Secondary Text */}
                        {data.name && (
                            <span className="text-[13px] font-medium text-slate-600 dark:text-slate-300 truncate mt-1">
                                {data.name}
                            </span>
                        )}
                    </div>
                </div>
            </div>
        ), {
            duration: 4000,
            id: `customer-${data.token}`,
            unstyled: true
        });
    }, []);

    const [autoLive, setAutoLive] = useState(true);
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

    useEffect(() => {
        const saved = localStorage.getItem("q4_inner_sidebar_collapsed");
        if (saved === "true") setSidebarCollapsed(true);
    }, []);

    const toggleSidebar = () => {
        setSidebarCollapsed(prev => {
            const next = !prev;
            localStorage.setItem("q4_inner_sidebar_collapsed", String(next));
            return next;
        });
    };

    const [initialQueue, setInitialQueue] = useState<QueueResponse | null>(null);
    const [sessionInfo, setSessionInfo] = useState<{ session_date: string; title: string } | null>(null);

    useEffect(() => {
        api.getQueue(queueId).then(setInitialQueue).catch(() => { });
        api.getSession(sessionId).then(s => setSessionInfo({ session_date: s.session_date, title: s.title })).catch(() => { });
    }, [queueId, sessionId]);

    const isTodaySession = React.useMemo(() => {
        if (!sessionInfo?.session_date) return true;
        const sessionDateStr = String(sessionInfo.session_date).slice(0, 10);
        const todayStr = localTodayStr(tz);
        return sessionDateStr === todayStr;
    }, [sessionInfo?.session_date, tz]);

    const { state, status, refresh } = useQueueSocket(queueId, {
        token: token || undefined,
        enabled: autoLive && isTodaySession,
        onNewCustomer: isTodaySession ? handleNewCustomer : undefined
    });

    const [staticSessionTokens, setStaticSessionTokens] = useState<TokenHistoryItem[]>([]);
    const [staticSessionLoading, setStaticSessionLoading] = useState(false);

    useEffect(() => {
        if (!isTodaySession && sessionId) {
            setStaticSessionLoading(true);
            api.getHistory({ sessionId, limit: 100 })
                .then(res => setStaticSessionTokens(res.items))
                .catch(console.error)
                .finally(() => setStaticSessionLoading(false));
        }
    }, [isTodaySession, sessionId]);

    const [isMounted, setIsMounted] = useState(false);
    const [isScrollingDown, setIsScrollingDown] = useState(false);
    const lastScrollY = useRef(0);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    const [activeSection, setActiveSection] = useState<ActiveSection>("queues");

    // TV Pairing state
    const [pairingCodeInput, setPairingCodeInput] = useState("");
    const [isPairing, setIsPairing] = useState(false);

    const [qrPairingCodeInput, setQrPairingCodeInput] = useState("");
    const [isQrPairing, setIsQrPairing] = useState(false);

    const handleConnectTV = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!pairingCodeInput.trim()) {
            sonnerToast.error("Please enter a pairing code.");
            return;
        }
        setIsPairing(true);
        try {
            await api.connectPairingCode({
                pair_code: pairingCodeInput.trim().toUpperCase(),
                queue_id: queueId
            });
            sonnerToast.success("TV Screen connected successfully!");
            setPairingCodeInput("");
        } catch (err: any) {
            sonnerToast.error(err.message || "Invalid or expired pairing code.");
        } finally {
            setIsPairing(false);
        }
    };

    const handleConnectQrShowcase = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!qrPairingCodeInput.trim()) {
            sonnerToast.error("Please enter a pairing code.");
            return;
        }
        setIsQrPairing(true);
        try {
            await api.connectPairingCode({
                pair_code: qrPairingCodeInput.trim().toUpperCase(),
                queue_id: queueId
            });
            sonnerToast.success("QR Showcase Device connected successfully!");
            setQrPairingCodeInput("");
        } catch (err: any) {
            sonnerToast.error(err.message || "Invalid or expired pairing code.");
        } finally {
            setIsQrPairing(false);
        }
    };

    const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
        const currentScrollY = e.currentTarget.scrollTop;
        const direction = currentScrollY > lastScrollY.current;
        if (direction !== isScrollingDown && Math.abs(currentScrollY - lastScrollY.current) > 0) {
            setIsScrollingDown(direction);
        }
        lastScrollY.current = currentScrollY > 0 ? currentScrollY : 0;
    }, [isScrollingDown]);

    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [mobileActionsOpen, setMobileActionsOpen] = useState(false);

    // ── "Updated Ns ago" ticker ───────────────────────────────────
    const [secondsAgo, setSecondsAgo] = useState(0);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

    useEffect(() => {
        if (state) {
            setLastUpdated(new Date());
            setSecondsAgo(0);
        }
    }, [state]);

    useEffect(() => {
        const interval = setInterval(() => {
            if (lastUpdated) {
                setSecondsAgo(Math.floor((Date.now() - lastUpdated.getTime()) / 1000));
            }
        }, 1000);
        return () => clearInterval(interval);
    }, [lastUpdated]);

    const [selectedToken, setSelectedToken] = useState<TokenDetailData | null>(null);
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
    const [removeNumber, setRemoveNumber] = useState("");
    const [inviteNumber, setInviteNumber] = useState("");
    const [showInviteLineModal, setShowInviteLineModal] = useState(false);
    const [tokenToRemove, setTokenToRemove] = useState<{ id: string, number: number } | null>(null);
    const [announcementInput, setAnnouncementInput] = useState("");
    const [isEditingAnnouncement, setIsEditingAnnouncement] = useState(false);
    const [waitingSearch, setWaitingSearch] = useState("");
    const [recentSearch, setRecentSearch] = useState("");

    // WebRTC Calling State
    const [callModalOpen, setCallModalOpen] = useState(false);
    const [callTokenNumber, setCallTokenNumber] = useState("");
    const [callCustomerPhone, setCallCustomerPhone] = useState("");
    const [callCustomerName, setCallCustomerName] = useState("");
    const [callTokenId, setCallTokenId] = useState("");

    const handleCall = useCallback((token: any) => {
        setCallTokenNumber(`${state?.prefix || ""}${token.token_number}`);
        setCallCustomerPhone(token.customer_phone || "");
        setCallCustomerName(token.customer_name || "");
        setCallTokenId(token.id);
        setCallModalOpen(true);
    }, [state?.prefix]);

    const [isClient, setIsClient] = useState(false);
    const [waitingPage, setWaitingPage] = useState(1);
    const [recentPage, setRecentPage] = useState(1);
    const PAGE_SIZE = 10;
    const RECENT_PAGE_SIZE = 20;
    const router = useRouter();

    const [activeListTab, setActiveListTab] = useState<"recent" | "waiting" | "skipped" | "deleted">("waiting");

    const effectiveWaitingTokens = React.useMemo(() => {
        if (isTodaySession) return state?.waiting_tokens || [];
        return staticSessionTokens
            .filter(t => t.status === "waiting")
            .map(t => ({
                id: t.id,
                token_number: t.token_number,
                status: t.status as any,
                customer_name: t.customer_name,
                customer_phone: t.customer_phone,
                customer_age: t.customer_age,
                created_at: t.created_at,
                served_at: t.served_at,
                completed_at: t.completed_at,
                assigned_line: t.assigned_line,
                called_via_invite: t.called_via_invite,
                pax_count: t.pax_count || 1,
            }));
    }, [isTodaySession, state?.waiting_tokens, staticSessionTokens]);

    const effectiveSkippedTokens = React.useMemo(() => {
        if (isTodaySession) return state?.skipped_tokens || [];
        return staticSessionTokens
            .filter(t => t.status === "skipped")
            .map(t => ({
                id: t.id,
                token_number: t.token_number,
                status: t.status as any,
                customer_name: t.customer_name,
                customer_phone: t.customer_phone,
                customer_age: t.customer_age,
                created_at: t.created_at,
                served_at: t.served_at,
                completed_at: t.completed_at,
                skipped_at: t.skipped_at,
                assigned_line: t.assigned_line,
                called_via_invite: t.called_via_invite,
                pax_count: t.pax_count || 1,
            }));
    }, [isTodaySession, state?.skipped_tokens, staticSessionTokens]);

    const effectiveDeletedTokens = React.useMemo(() => {
        if (isTodaySession) return state?.deleted_tokens || [];
        return staticSessionTokens
            .filter(t => t.status === "deleted")
            .map(t => ({
                id: t.id,
                token_number: t.token_number,
                status: t.status as any,
                customer_name: t.customer_name,
                customer_phone: t.customer_phone,
                customer_age: t.customer_age,
                created_at: t.created_at,
                served_at: t.served_at,
                completed_at: t.completed_at,
                deleted_at: t.deleted_at,
                assigned_line: t.assigned_line,
                called_via_invite: t.called_via_invite,
                pax_count: t.pax_count || 1,
            }));
    }, [isTodaySession, state?.deleted_tokens, staticSessionTokens]);

    const effectiveRecentTokens = React.useMemo(() => {
        if (isTodaySession) return state?.recent_tokens || [];
        return staticSessionTokens
            .filter(t => t.status === "serving" || t.status === "done" || t.status === "skipped" || t.status === "deleted")
            .map(t => ({
                id: t.id,
                token_number: t.token_number,
                status: t.status as any,
                customer_name: t.customer_name,
                customer_phone: t.customer_phone,
                customer_age: t.customer_age,
                created_at: t.created_at,
                served_at: t.served_at,
                completed_at: t.completed_at,
                assigned_line: t.assigned_line,
                called_via_invite: t.called_via_invite,
                pax_count: t.pax_count || 1,
            }));
    }, [isTodaySession, state?.recent_tokens, staticSessionTokens]);

    const filteredWaiting = React.useMemo(() => {
        if (!effectiveWaitingTokens) return [];
        const filtered = waitingSearch
            ? effectiveWaitingTokens.filter(t =>
                String(t.token_number).includes(waitingSearch) ||
                t.customer_name?.toLowerCase().includes(waitingSearch.toLowerCase()) ||
                t.customer_phone?.includes(waitingSearch)
            )
            : effectiveWaitingTokens;
        return [...filtered].sort((a, b) => (a.token_number ?? 0) - (b.token_number ?? 0));
    }, [effectiveWaitingTokens, waitingSearch]);

    const paginatedWaiting = React.useMemo(() => {
        const start = (waitingPage - 1) * PAGE_SIZE;
        return filteredWaiting.slice(start, start + PAGE_SIZE);
    }, [filteredWaiting, waitingPage]);

    const filteredSkipped = React.useMemo(() => {
        if (!effectiveSkippedTokens) return [];
        const filtered = waitingSearch
            ? effectiveSkippedTokens.filter(t =>
                String(t.token_number).includes(waitingSearch) ||
                (t.customer_name || "").toLowerCase().includes(waitingSearch.toLowerCase()) ||
                (t.customer_phone || "").includes(waitingSearch)
            )
            : effectiveSkippedTokens;
        return [...filtered].sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
    }, [effectiveSkippedTokens, waitingSearch]);

    const paginatedSkipped = React.useMemo(() => {
        const start = (waitingPage - 1) * PAGE_SIZE;
        return filteredSkipped.slice(start, start + PAGE_SIZE);
    }, [filteredSkipped, waitingPage]);

    const filteredDeleted = React.useMemo(() => {
        if (!effectiveDeletedTokens) return [];
        const filtered = waitingSearch
            ? effectiveDeletedTokens.filter(t =>
                String(t.token_number).includes(waitingSearch) ||
                (t.customer_name || "").toLowerCase().includes(waitingSearch.toLowerCase()) ||
                (t.customer_phone || "").includes(waitingSearch)
            )
            : effectiveDeletedTokens;
        return [...filtered].sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
    }, [effectiveDeletedTokens, waitingSearch]);

    const paginatedDeleted = React.useMemo(() => {
        const start = (waitingPage - 1) * PAGE_SIZE;
        return filteredDeleted.slice(start, start + PAGE_SIZE);
    }, [filteredDeleted, waitingPage]);

    const filteredRecent = React.useMemo(() => {
        if (!effectiveRecentTokens) return [];
        const filtered = recentSearch
            ? effectiveRecentTokens.filter(t =>
                String(t.token_number).includes(recentSearch) ||
                t.customer_name?.toLowerCase().includes(recentSearch.toLowerCase()) ||
                t.customer_phone?.includes(recentSearch)
            )
            : [...effectiveRecentTokens];

        // Sort by most recently served (or completed/created) to show latest activity at the top
        return filtered.sort((a, b) => {
            const timeA = new Date(a.served_at || a.completed_at || a.created_at || 0).getTime();
            const timeB = new Date(b.served_at || b.completed_at || b.created_at || 0).getTime();
            return timeB - timeA;
        });
    }, [effectiveRecentTokens, recentSearch]);

    const paginatedRecent = React.useMemo(() => {
        const start = (recentPage - 1) * RECENT_PAGE_SIZE;
        return filteredRecent.slice(start, start + RECENT_PAGE_SIZE);
    }, [filteredRecent, recentPage]);

    React.useEffect(() => { setWaitingPage(1); }, [waitingSearch]);
    React.useEffect(() => { setRecentPage(1); }, [recentSearch]);

    const lastActionRef = useRef(0);
    const errorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
            // Queue reset is handled by ending the current session and starting a new one.
            // Navigate back to the session list where the user can start a fresh session.
            toast("To reset the queue, go back to Sessions and start a new session for today.", "info");
            setShowResetConfirm(false);
        } catch (err: unknown) {
            if (err instanceof ApiError) setActionError(err.detail);
            else setActionError("Failed to reset queue");
            setShowResetConfirm(false);
        } finally { setResetting(false); }
    }, [toast]);

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
            sonnerToast.warning(nextState ? `Queue "${queueName}" is now paused` : `Queue "${queueName}" is resumed`);
        } catch (err: unknown) {
            if (err instanceof ApiError) setActionError(err.detail);
            else setActionError("Failed to pause/resume queue");
            sonnerToast.error("Action failed");
        } finally { setPausing(false); }
    }, [queueId, state?.is_paused, initialQueue?.is_paused, queueName]);

    const [showAddForm, setShowAddForm] = useState(false);
    const [mobileQuickExpanded, setMobileQuickExpanded] = useState(false);
    const [addName, setAddName] = useState("");
    const [debouncedAddName, setDebouncedAddName] = useState("");
    useEffect(() => {
        const t = setTimeout(() => setDebouncedAddName(addName), 800);
        return () => clearTimeout(t);
    }, [addName]);
    const [addCountryCode, setAddCountryCode] = useState("+91");
    const [addPhone, setAddPhone] = useState("");
    const [addPaxCount, setAddPaxCount] = useState<string>("1");
    const [showWhatsappConfirm, setShowWhatsappConfirm] = useState(false);
    const [addFormError, setAddFormError] = useState<string | null>(null);
    const [addCustomData, setAddCustomData] = useState<Record<string, any>>({});
    const isAddNameValid = /^[A-Za-z\s'-]{2,50}$/.test(addName.trim());

    useEffect(() => {
        if (addFormError) setAddFormError(null);
    }, [addName, addPhone]);

    useEffect(() => {
        if (!showAddForm) setAddFormError(null);
    }, [showAddForm]);

    const hasAdminCustomFieldsConfigured = Array.isArray(state?.custom_fields);
    const adminCustomFieldsList = state?.custom_fields || [];

    const handlePreAddCustomer = useCallback(async () => {
        if (!isTodaySession) {
            setAddFormError("Cannot add customer: This session is closed (historical).");
            return;
        }
        if (hasAdminCustomFieldsConfigured) {
            if (adminCustomFieldsList.length === 0) {
                setAddFormError("Cannot add customer: No token fields are configured in Token Settings.");
                return;
            }
            // Validate required custom fields
            for (const field of adminCustomFieldsList) {
                if (field.required && !addCustomData[field.key]) {
                    setAddFormError(`Please fill out the required field: ${field.label}`);
                    return;
                }
            }
            setAddFormError(null);
            setShowWhatsappConfirm(true);
        } else {
            // Legacy validation
            const phoneDigits = addPhone.replace(/\D/g, "");
            if (!isAddNameValid || phoneDigits.length < 7) { setAddFormError("Please enter a valid name and phone number"); return; }
            setAddFormError(null);
            setShowWhatsappConfirm(true);
        }
    }, [isTodaySession, addPhone, isAddNameValid, hasAdminCustomFieldsConfigured, adminCustomFieldsList, addCustomData]);

    const handleConfirmAddCustomer = useCallback(async (sendWhatsapp: boolean) => {
        setShowWhatsappConfirm(false);
        if (!isTodaySession) {
            toast("Cannot add customers to a past session.", "error");
            return;
        }
        const phoneDigits = addPhone.replace(/\D/g, "");
        setActionLoading("add");
        setActionError(null);
        try {
            const resolvedName = addCustomData['name'] || addCustomData['full_name'] || addName.trim() || 'Walk-in Customer';
            const rawPhone = addCustomData['phone'] || addCustomData['phone_number'] || addPhone;
            const resolvedPhone = rawPhone ? `${addCountryCode}${rawPhone.replace(/\D/g, "")}` : '+910000000000';
            const resolvedPax = parseInt(addCustomData['pax'] || addCustomData['group_size'] || String(addPaxCount)) || 1;

            const res = await api.adminJoin(queueId, {
                name: resolvedName,
                phone: resolvedPhone,
                pax_count: resolvedPax,
                send_whatsapp: sendWhatsapp,
                entry_type: "manual",
                custom_data: hasAdminCustomFieldsConfigured ? addCustomData : undefined
            });
            toast(`Token ${state?.prefix || ""}${res.token_number} created`, "success");
            setShowAddForm(false);
            setAddName(""); setAddPhone(""); setAddPaxCount("1"); setAddCustomData({});
        } catch (err: unknown) {
            if (err instanceof ApiError) toast(err.detail, "error");
            else toast("Failed to add customer", "error");
        } finally { setActionLoading(null); }
    }, [isTodaySession, queueId, addName, addPhone, addPaxCount, addCountryCode, state?.prefix, hasAdminCustomFieldsConfigured, addCustomData, toast]);


    const executeInviteWithNumber = useCallback(async (num: number, lineNum?: number) => {
        setActionLoading("invite");
        setActionError(null);
        try {
            await api.serveSpecificToken(queueId, num, lineNum);
            toast(`Token ${state?.prefix || ""}${num} is now serving${lineNum ? ` on Lane ${lineNum}` : ''}`, "success");
            setInviteNumber("");
            setShowInviteLineModal(false);
        } catch (err: unknown) {
            if (err instanceof ApiError) toast(err.detail, "error");
            else toast("Failed to invite token: it might not be waiting or doesn't exist.", "error");
            setShowInviteLineModal(false);
        } finally { setActionLoading(null); }
    }, [queueId, state?.prefix, toast]);

    const executeInvite = useCallback((lineNum?: number) => {
        if (lineNum !== undefined && state?.all_serving_tokens) {
            const isBusy = state.all_serving_tokens.some(t => t.assigned_line === lineNum);
            if (isBusy) {
                toast(`Lane ${lineNum} is already serving a customer.`, "error");
                return;
            }
        }

        const num = parseInt(inviteNumber, 10);
        if (isNaN(num)) return;
        executeInviteWithNumber(num, lineNum);
    }, [inviteNumber, executeInviteWithNumber, state?.all_serving_tokens, toast]);

    const handleInvite = useCallback(async (e: React.FormEvent) => {
        e.preventDefault();
        if (!inviteNumber) return;
        const num = parseInt(inviteNumber, 10);
        if (isNaN(num)) return;

        const token = state?.waiting_tokens?.find((t) => t.token_number === num);
        if (!token) { toast("Token not found", "error"); return; }

        if ((state?.service_lines || 0) > 0) {
            setShowInviteLineModal(true);
            return;
        }

        executeInviteWithNumber(num, undefined);
    }, [inviteNumber, state?.service_lines, state?.waiting_tokens, executeInviteWithNumber, toast]);

    const handleRecallFlow = useCallback((tokenNum: number) => {
        setInviteNumber(tokenNum.toString());
        if ((state?.service_lines || 0) > 0) {
            setShowInviteLineModal(true);
        } else {
            executeInviteWithNumber(tokenNum, undefined);
        }
    }, [state?.service_lines, executeInviteWithNumber]);

    const handleRemoveByNumber = useCallback((e: React.FormEvent) => {
        e.preventDefault();
        setActionError(null);
        if (!removeNumber) return;
        const num = parseInt(removeNumber, 10);
        if (isNaN(num)) return;
        const token = state?.waiting_tokens?.find((t) => t.token_number === num);
        if (!token) { toast("Token not found", "error"); return; }
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
            if (err instanceof ApiError) toast(err.detail, "error");
            else toast("Failed to remove token", "error");
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

    const baseNavItems: { id: ActiveSection; label: string; icon: React.ReactNode }[] = [
        {
            id: "queues", label: "Dashboard / Queues",
            icon: <svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M4 6h16M4 10h16M4 14h16M4 18h16" /></svg>,
        },
        {
            id: "waiting_list", label: "Queue Lists",
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
            id: "history", label: "History",
            icon: <svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
        },
        {
            id: "connect_tv", label: "Connect TV",
            icon: <svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M4.9 19.1C1 15.2 1 8.8 4.9 4.9M7.8 16.2c-2.3-2.3-2.3-6.1 0-8.5M12 12a2 2 0 100-4 2 2 0 000 4zm4.2 4.2c2.3-2.3 2.3-6.1 0-8.5M19.1 19.1c3.9-3.9 3.9-10.3 0-14.2" /></svg>,
        },
        {
            id: "settings", label: "Token Settings",
            icon: <Settings2 width="15" height="15" strokeWidth="1.8" />,
        },
    ];

    const navItems = baseNavItems.filter(item => {
        if (!canManageQueue && item.id === "qrcode") return false;
        return true;
    });

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
                {/* Mobile Sidebar Overlay */}
                <div className={`md:hidden fixed inset-0 z-[99999] transition-opacity duration-300 ${mobileMenuOpen ? "opacity-100" : "opacity-0 pointer-events-none"}`}>
                    <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)} />
                    <div className={`absolute top-0 left-0 bottom-0 w-[280px] bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-white/10 shadow-2xl transition-transform duration-300 ease-in-out ${mobileMenuOpen ? "translate-x-0" : "-translate-x-full"}`}>
                        <div className="p-4 flex flex-col h-full">
                            <div className="flex justify-between items-center pb-4 border-b border-slate-200 dark:border-white/10 mb-4">
                                <Link href={`${dashBase}/queues/${queueId}`} className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">
                                    <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" /></svg>
                                    Back to Sessions
                                </Link>
                                <button onClick={() => setMobileMenuOpen(false)} className="p-1.5 -mr-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-white rounded-lg transition-colors"><X size={20} /></button>
                            </div>
                            <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4 border border-slate-100 dark:border-white/10 mb-6">
                                <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Managing</div>
                                <div className="text-sm font-bold text-slate-900 dark:text-white truncate" title={queueName}>{queueName}</div>
                                <div className="text-xs font-medium text-emerald-600 dark:text-emerald-400 mt-1 flex items-center gap-1.5">
                                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-[pulse-dot_2s_infinite]" />
                                    {isPaused ? <span className="text-amber-600 dark:text-amber-400">Paused</span> : isActive ? "Active" : <span className="text-rose-600 dark:text-rose-400">Inactive</span>}
                                </div>
                            </div>
                            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 px-3 mb-2">Queue Management</div>
                            <nav className="px-3 flex flex-col gap-1 flex-1 overflow-y-auto">
                                {navItems.map((item) => {
                                    const isActiveItem = activeSection === item.id;
                                    return (
                                        <button key={item.id} onClick={() => { setActiveSection(item.id); setMobileMenuOpen(false); }} className={`flex items-center gap-3 px-3 py-2 text-sm rounded-lg transition-all text-left ${isActiveItem ? "font-semibold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60" : "font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white"}`}>
                                            <span className={`flex-shrink-0 ${isActiveItem ? "text-indigo-600 dark:text-indigo-400" : "text-slate-400"}`}>{item.icon}</span>
                                            <span className="truncate flex-1">{item.label}</span>
                                        </button>
                                    );
                                })}
                            </nav>
                            
                            <div className="mt-auto pt-4 border-t border-slate-200 dark:border-white/10 flex items-center justify-between">
                                {isTodaySession ? (
                                    <ConnectionBadge status={status} />
                                ) : (
                                    <span className="inline-flex items-center gap-1.5 px-2 py-1 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 text-[11px] font-semibold rounded-md border border-amber-200 dark:border-amber-800/60">
                                        <Clock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" /> Past Session
                                    </span>
                                )}
                                <ThemeToggle />
                            </div>
                        </div>
                    </div>
                </div>


                {/* ── Refactored Collapsible Sidebar ─────────────────────────────────── */}
                <aside 
                    className="hidden md:flex flex-col bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-white/10 relative transition-all duration-300 ease-in-out" 
                    style={{ width: sidebarCollapsed ? 72 : 260, flexShrink: 0, position: "sticky", top: 0, height: "100vh" }}
                >
                    {/* Top Container */}
                    <div className={`p-4 flex flex-col h-full ${sidebarCollapsed ? "items-center px-2" : ""}`}>

                        {/* 1. Top Action Bar with Panel Collapse Toggle */}
                        <div className={`pb-4 border-b border-slate-200 dark:border-white/10 mb-4 w-full flex items-center ${sidebarCollapsed ? "justify-center flex-col gap-3" : "justify-between"}`}>
                            <Link
                                href={`${dashBase}/queues/${queueId}`}
                                className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
                                title="Back to Sessions"
                            >
                                <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" /></svg>
                                {!sidebarCollapsed && <span>Back to Sessions</span>}
                            </Link>

                            <button
                                onClick={toggleSidebar}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                                title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
                                aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
                            >
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <rect width="18" height="18" x="3" y="3" rx="2" />
                                    <path d="M9 3v18" />
                                    {sidebarCollapsed ? <path d="m14 9 3 3-3 3" /> : <path d="m16 15-3-3 3-3" />}
                                </svg>
                            </button>
                        </div>

                        {/* 2. Context Card */}
                        <div className={`bg-slate-50 dark:bg-slate-800 rounded-xl p-3 border border-slate-100 dark:border-white/10 mb-6 w-full ${sidebarCollapsed ? "flex flex-col items-center justify-center p-2 text-center" : ""}`} title={queueName}>
                            {!sidebarCollapsed ? (
                                <>
                                    <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Managing</div>
                                    <div className="text-sm font-bold text-slate-900 dark:text-white truncate" title={queueName}>{queueName}</div>
                                    <div className="text-xs font-medium text-emerald-600 dark:text-emerald-400 mt-1 flex items-center gap-1.5">
                                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-[pulse-dot_2s_infinite]" />
                                        {isPaused ? <span className="text-amber-600 dark:text-amber-400">Paused</span> : isActive ? "Active" : <span className="text-rose-600 dark:text-rose-400">Inactive</span>}
                                    </div>
                                </>
                            ) : (
                                <div className="flex items-center justify-center relative py-1" title={`${queueName} (${isActive ? "Active" : "Inactive"})`}>
                                    <span className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
                                </div>
                            )}
                        </div>

                        {/* 3. Section Headers */}
                        {!sidebarCollapsed && (
                            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 px-3 mb-2 w-full">
                                Queue Management
                            </div>
                        )}

                        {/* 4. Navigation Links */}
                        <nav className={`flex flex-col gap-1 flex-1 overflow-y-auto w-full ${sidebarCollapsed ? "px-0 items-center" : "px-3"}`}>
                            {navItems.map((item) => {
                                const isActiveItem = activeSection === item.id;
                                return (
                                    <button
                                        key={item.id}
                                        onClick={() => setActiveSection(item.id)}
                                        title={sidebarCollapsed ? item.label : undefined}
                                        className={`flex items-center gap-3 py-2 text-sm rounded-lg transition-all text-left ${sidebarCollapsed ? "justify-center w-10 h-10 px-0" : "px-3 w-full"} ${isActiveItem
                                            ? "font-semibold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60"
                                            : "font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white"
                                            }`}
                                    >
                                        <span className={`flex-shrink-0 ${isActiveItem ? "text-indigo-600 dark:text-indigo-400" : "text-slate-400"}`}>
                                            {item.icon}
                                        </span>
                                        {!sidebarCollapsed && <span className="truncate flex-1">{item.label}</span>}
                                        {item.id === "announcement" && (state?.announcement || initialQueue?.announcement) && (
                                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 flex-shrink-0" />
                                        )}
                                    </button>
                                );
                            })}
                        </nav>
                    </div>

                    {/* 5. Bottom Shell */}
                    <div className={`mt-auto border-t border-slate-200 dark:border-white/10 p-3 flex items-center ${sidebarCollapsed ? "justify-center" : "justify-between"}`}>
                        {!sidebarCollapsed && (
                            isTodaySession ? (
                                <ConnectionBadge status={status} />
                            ) : (
                                <span className="inline-flex items-center gap-1.5 px-2 py-1 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 text-[11px] font-semibold rounded-md border border-amber-200 dark:border-amber-800/60">
                                    <Clock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" /> Past Session
                                </span>
                            )
                        )}
                        <ThemeToggle />
                    </div>
                </aside>

                {/* ── Main Content ──────────────────────────────────── */}
                <div className="bg-gray-50 dark:bg-transparent" style={{ flex: 1, overflowY: "auto" }} onScroll={handleScroll}>
                    <div className="px-4 py-6 md:px-7 md:py-7" style={{ maxWidth: 1160, margin: "0 auto", display: "flex", flexDirection: "column", gap: 24 }}>

                        {/* ═══════════════════════════════════════════
                        SECTION: Dashboard / Queues
                    ════════════════════════════════════════════ */}
                        {activeSection === "queues" && (
                            <div className="fade-in" style={{ display: "flex", flexDirection: "column", gap: 22 }}>

                                {/* Header */}
                                <div className="flex flex-col md:flex-row justify-between items-start md:items-center w-full gap-4 relative">
                                    <div className="flex w-full md:w-auto items-start md:items-center gap-3">
                                        <button className="md:hidden mt-1 p-1 -ml-1 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors flex-shrink-0" onClick={() => setMobileMenuOpen(true)}>
                                            <Menu size={24} />
                                        </button>
                                        <div className="flex-1">
                                            <div className="flex items-center gap-3 flex-wrap">
                                                <h1 className="qd-section-title text-gray-900 dark:text-white capitalize">{queueName}</h1>
                                                {!isTodaySession && (
                                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[11px] font-semibold bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200/80 dark:border-amber-800/60">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                                                        Past Session ({sessionInfo?.session_date || "Closed"}) • Read Only
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-gray-600 dark:text-slate-400" style={{ fontSize: 13, marginTop: 4 }}>
                                                Prefix: <span className="mono text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/50" style={{ fontWeight: 600, padding: "1px 7px", borderRadius: 5 }}>{state?.prefix || initialQueue?.prefix || "—"}</span>
                                            </p>
                                            {(state?.open_time || initialQueue?.open_time) && (state?.close_time || initialQueue?.close_time) && (
                                                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 text-xs font-semibold shadow-sm mt-2">
                                                    <Clock className="w-3.5 h-3.5 text-blue-500 dark:text-blue-400" />
                                                    <span>{formatTime12(state?.open_time || initialQueue?.open_time)} - {formatTime12(state?.close_time || initialQueue?.close_time)}</span>
                                                </div>
                                            )}
                                        </div>
                                        <div className="relative md:hidden flex-shrink-0 mt-1">
                                            <button className="p-1 -mr-1 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors" onClick={() => setMobileActionsOpen(prev => !prev)}>
                                                <MoreVertical size={24} />
                                            </button>
                                            {mobileActionsOpen && (
                                                <>
                                                    <div className="fixed inset-0 z-[40]" onClick={() => setMobileActionsOpen(false)} />
                                                    <div className="absolute top-full right-0 mt-2 w-48 bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 shadow-xl rounded-xl p-2 z-[50] flex flex-col gap-1 text-left">
                                                        {isActive && canManageQueue && (
                                                            <button onClick={() => { handlePauseToggle(); setMobileActionsOpen(false); }} disabled={isDisabled || pausing} className="text-left px-3 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg flex items-center gap-2">
                                                                {isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
                                                                {isPaused ? "Resume" : "Take a Break"}
                                                            </button>
                                                        )}
                                                        {!isStaff && canManageQueue && (
                                                            <button onClick={() => { setShowResetConfirm(true); setMobileActionsOpen(false); }} disabled={isDisabled || resetting} className="text-left px-3 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg flex items-center gap-2">
                                                                <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                                                                Reset Queue
                                                            </button>
                                                        )}
                                                        <a href={`/display/${queueId}`} target="_blank" rel="noopener noreferrer" onClick={() => setMobileActionsOpen(false)} className="text-left px-3 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg flex items-center gap-2">
                                                            <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                                                            Display Screen
                                                        </a>
                                                        {!isStaff && canManageQueue && (
                                                            <button onClick={() => { setShowDeleteConfirm(true); setMobileActionsOpen(false); }} className="text-left px-3 py-2 text-sm text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/60 rounded-lg flex items-center gap-2">
                                                                <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                                                Delete Queue
                                                            </button>
                                                        )}
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    </div>

                                    <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>


                                        <div className="hidden md:block border-r border-slate-200 dark:border-white/10 h-6 mx-1" />

                                        <div className="hidden md:flex items-center gap-2">
                                            {isActive && canManageQueue && (
                                                <button
                                                    onClick={handlePauseToggle}
                                                    disabled={isDisabled || pausing}
                                                    className={`bg-white dark:bg-slate-800 border ${isPaused ? "border-amber-200 dark:border-amber-900/40 bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/80" : "border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-700"} shadow-sm text-xs font-medium px-3 py-1.5 rounded-lg transition-colors flex items-center gap-2`}
                                                >
                                                    {isPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
                                                    {isPaused ? "Resume" : "Take a Break"}
                                                </button>
                                            )}
                                            {!isStaff && canManageQueue && (
                                                <button
                                                    onClick={() => setShowResetConfirm(true)}
                                                    disabled={isDisabled || resetting}
                                                    className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 shadow-sm text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-700 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors flex items-center gap-2"
                                                >
                                                    <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                                                    Reset
                                                </button>
                                            )}

                                            <a
                                                href={`/display/${queueId}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 shadow-sm text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-700 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors flex items-center gap-2"
                                            >
                                                <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                                                Display
                                            </a>
                                            {!isStaff && canManageQueue && (
                                                <button
                                                    onClick={() => setShowDeleteConfirm(true)}
                                                    className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 shadow-sm text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-rose-50 dark:hover:bg-rose-950/60 hover:border-rose-200 dark:hover:border-rose-900/40 hover:text-rose-600 dark:hover:text-rose-400 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors flex items-center gap-2"
                                                >
                                                    <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                                    Delete
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Historical Session Notice Banner */}
                                {!isTodaySession && (
                                    <div
                                        role="alert"
                                        className="flex items-center justify-between gap-3 px-4 py-2.5 rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/70 dark:border-amber-800/40 text-xs text-slate-700 dark:text-slate-200 shadow-2xs transition-all"
                                    >
                                        <div className="flex items-center gap-2.5 min-w-0">
                                            <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                                            <span className="font-semibold text-slate-900 dark:text-slate-100 shrink-0">
                                                Historical Session {sessionInfo?.session_date ? `(${sessionInfo.session_date})` : ""}
                                            </span>
                                            <span className="text-slate-400 dark:text-slate-500 hidden sm:inline">•</span>
                                            <span className="text-slate-500 dark:text-slate-400 truncate hidden sm:inline">
                                                This session is closed. Token creation and live calling are strictly disabled for past records.
                                            </span>
                                        </div>

                                        {initialQueue?.token_session_id && initialQueue.token_session_id !== sessionId && (
                                            <Link
                                                href={`${dashBase}/queues/${queueId}/sessions/${initialQueue.token_session_id}`}
                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-amber-800 dark:text-amber-200 hover:text-amber-900 bg-amber-100/80 hover:bg-amber-200/80 dark:bg-amber-900/40 dark:hover:bg-amber-900/70 border border-amber-300/60 dark:border-amber-700/50 rounded-lg transition-colors shrink-0"
                                            >
                                                <span>Switch to Today&apos;s Session</span>
                                                <ArrowRight className="w-3.5 h-3.5" />
                                            </Link>
                                        )}
                                    </div>
                                )}

                                {/* Main 2-col Grid */}
                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 lg:h-[calc(100vh-theme(spacing.36))]">
                                    {/* Left: Serving + Actions */}
                                    <div className="lg:col-span-2 flex flex-col gap-4 lg:overflow-y-auto scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-700 pr-1 pb-4 relative">

                                        {/* Hero – Now Serving or Service Lanes Grid */}
                                        {(() => {
                                            const numLines = state?.service_lines ?? initialQueue?.service_lines ?? 0;
                                            if (numLines > 0) {
                                                return (
                                                    <ServiceLinesGrid
                                                        queueId={queueId}
                                                        serviceLines={numLines}
                                                        allServingTokens={(state?.all_serving_tokens ?? []) as ServingToken[]}
                                                        prefix={state?.prefix ?? initialQueue?.prefix ?? ""}
                                                        onUpdate={refresh}
                                                        isGlobalOrOrgAdmin={isGlobalOrOrgAdmin}
                                                        isPaused={(state?.is_paused ?? initialQueue?.is_paused) === true}
                                                        isReadOnly={isReadOnly}
                                                        enableSharedTokens={state?.enable_shared_tokens ?? false}
                                                    />
                                                );
                                            }
                                            // Single counter mode: render the original serving card below
                                            return null;
                                        })()}

                                        {/* Original single-counter serving hero (only when service_lines === 0) */}
                                        {(state?.service_lines ?? initialQueue?.service_lines ?? 0) === 0 && (
                                            <>
                                                <div className="pt-4 pb-1 px-4 sm:px-6 lg:px-8 w-full flex justify-center">
                                                    <div className="relative w-full max-w-2xl flex flex-col filter drop-shadow-[0_2px_12px_rgba(0,0,0,0.06)] dark:drop-shadow-[0_2px_12px_rgba(0,0,0,0.2)]">

                                                        {/* 2. The Top Half (Content) */}
                                                        <div className="bg-white dark:bg-slate-900 pt-10 pb-8 px-8 flex flex-col items-center justify-center rounded-t-[1.5rem] relative overflow-hidden">

                                                            {/* "NOW SERVING" Pill */}
                                                            <div className="relative z-10 inline-flex items-center gap-2 bg-slate-50 dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700/60 shadow-sm rounded-full px-4 py-1.5 mb-6">
                                                                <span className="relative flex h-2 w-2">
                                                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
                                                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500" />
                                                                </span>
                                                                <span className="text-slate-600 dark:text-slate-300 text-[10px] font-bold tracking-widest uppercase">Now Serving</span>
                                                            </div>

                                                            {/* The Main Token (A1) */}
                                                            {(!state?.serving_details) ? (
                                                                <div className="relative z-10 flex flex-col items-center justify-center py-2" style={{ minHeight: 100 }}>
                                                                    <div className="w-12 h-12 mb-3 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-400 dark:text-slate-500 flex items-center justify-center border border-slate-200/60 dark:border-slate-700/60">
                                                                        <svg width="22" height="22" fill="none" viewBox="0 0 24 24">
                                                                            <path d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                                                        </svg>
                                                                    </div>
                                                                    <span className="text-slate-800 dark:text-slate-200 text-base font-semibold mb-1">
                                                                        No one is being served
                                                                    </span>
                                                                    <span className="text-slate-500 dark:text-slate-400 text-sm mb-4">
                                                                        Ready for next customer
                                                                    </span>
                                                                </div>
                                                            ) : (
                                                                <>
                                                                    <div className="serving-num relative z-10 text-[96px] leading-none font-extrabold tracking-tight bg-gradient-to-br from-slate-900 via-slate-800 to-slate-700 dark:from-white dark:via-slate-100 dark:to-slate-300 bg-clip-text text-transparent mb-2" aria-live="polite" aria-atomic="true">
                                                                        {`${state.prefix || ""}${state.current_serving}`}
                                                                    </div>

                                                                    {/* Customer Details */}
                                                                    {state?.serving_details && (
                                                                        <div className="fade-in relative z-10 flex flex-col items-center mt-2">
                                                                            <div className="flex items-center gap-2 mb-1">
                                                                                <h3 className="text-slate-800 dark:text-slate-100 text-lg font-semibold m-0">
                                                                                    {state.serving_details.customer_name}
                                                                                </h3>
                                                                                {(state.serving_details.pax_count && state.serving_details.pax_count > 1) && (
                                                                                    <span className="inline-flex items-center gap-1 font-medium text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-[10px] ml-1.5 shadow-sm border border-slate-200 dark:border-slate-700" title={`Total Pax: ${state.serving_details.pax_count}`}>
                                                                                        <Users size={10} className="text-slate-400" />
                                                                                        +{state.serving_details.pax_count - 1}
                                                                                    </span>
                                                                                )}
                                                                            </div>

                                                                            <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-sm mt-1">
                                                                                <span>{state.serving_details.customer_phone}</span>
                                                                            </div>
                                                                        </div>
                                                                    )}
                                                                </>
                                                            )}
                                                        </div>

                                                        {/* 3. The Middle Divider (The Magic CSS Mask) */}
                                                        <div
                                                            className="h-12 bg-white dark:bg-slate-900 relative flex items-center justify-center"
                                                            style={{
                                                                WebkitMaskImage: 'radial-gradient(circle at 0px 50%, transparent 18px, black 19px), radial-gradient(circle at 100% 50%, transparent 18px, black 19px)',
                                                                WebkitMaskSize: '51% 100%',
                                                                WebkitMaskPosition: 'left, right',
                                                                WebkitMaskRepeat: 'no-repeat',
                                                                maskImage: 'radial-gradient(circle at 0px 50%, transparent 18px, black 19px), radial-gradient(circle at 100% 50%, transparent 18px, black 19px)',
                                                                maskSize: '51% 100%',
                                                                maskPosition: 'left, right',
                                                                maskRepeat: 'no-repeat'
                                                            }}
                                                        >
                                                            {/* The Dashed Line - calculated width to avoid bleeding into the holes */}
                                                            <div className="w-[calc(100%-72px)] border-t-[1.5px] border-dashed border-slate-200 dark:border-slate-700"></div>
                                                        </div>

                                                        {/* 4. The Bottom Half (Stub & Metrics) */}
                                                        <div className="bg-white dark:bg-slate-900 px-8 pb-6 pt-2 rounded-b-[1.5rem]">
                                                            <div className="grid grid-cols-4 divide-x divide-slate-100 dark:divide-slate-800">

                                                                {/* Total Customers (Issued) */}
                                                                <div className="flex flex-col items-center justify-center py-2">
                                                                    <span className="text-2xl font-bold text-slate-900 dark:text-white tabular-nums leading-none">{state?.total_issued ?? 0}</span>
                                                                    <span className="mt-1 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                                                                        <span className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-600"></span> Issued
                                                                    </span>
                                                                </div>

                                                                {/* Remaining (Waiting) */}
                                                                <div className="flex flex-col items-center justify-center py-2">
                                                                    <span className="text-2xl font-bold text-slate-900 dark:text-white tabular-nums leading-none">{effectiveWaitingTokens.length > 0 ? effectiveWaitingTokens.length : (state?.waiting_count ?? 0)}</span>
                                                                    <span className="mt-1 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                                                                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span> Waiting
                                                                    </span>
                                                                </div>

                                                                {/* Served */}
                                                                <div className="flex flex-col items-center justify-center py-2">
                                                                    <span className="text-2xl font-bold text-slate-900 dark:text-white tabular-nums leading-none">{state?.done_count ?? 0}</span>
                                                                    <span className="mt-1 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                                                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Served
                                                                    </span>
                                                                </div>

                                                                {/* Skipped */}
                                                                <div className="flex flex-col items-center justify-center py-2">
                                                                    <span className="text-2xl font-bold text-slate-900 dark:text-white tabular-nums leading-none">{effectiveSkippedTokens.length > 0 ? effectiveSkippedTokens.length : (state?.skipped_count ?? 0)}</span>
                                                                    <span className="mt-1 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                                                                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span> Skipped
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Action buttons */}
                                                {canManageQueue && (
                                                    <div className={`grid gap-3 w-full ${(!state?.serving_details) ? "grid-cols-1" : "grid-cols-2"}`} role="toolbar">
                                                        {(!state?.serving_details) && (
                                                            <button
                                                                onClick={handleNext}
                                                                disabled={isDisabled || isPaused}
                                                                title={isPaused ? "Queue is currently on a break" : undefined}
                                                                className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-lg shadow-indigo-500/20 transition-all duration-200 w-full flex justify-center items-center h-[52px] rounded-2xl text-[15px] gap-2 disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-indigo-500/30 hover:-translate-y-0.5 active:translate-y-0"
                                                            >
                                                                {actionLoading === "next" ? (
                                                                    <>
                                                                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                                        Calling…
                                                                    </>
                                                                ) : (
                                                                    <>
                                                                        <svg width="17" height="17" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
                                                                        Call Next
                                                                        <kbd className="text-[10px] opacity-50 ml-1 px-1.5 py-0.5 rounded bg-white/15">↵</kbd>
                                                                    </>
                                                                )}
                                                            </button>
                                                        )}

                                                        {(!!state?.serving_details) && (
                                                            <>
                                                                <button
                                                                    onClick={() => performAction("skipped", async () => {
                                                                        const res = await api.callNext(queueId, "skipped");
                                                                        if ("message" in res) toast(res.message, "info");
                                                                        else toast(`${state?.prefix || ""}${res.serving} is now serving`, "success");
                                                                    })}
                                                                    disabled={isDisabled || isPaused}
                                                                    title={isPaused ? "Queue is currently on a break" : undefined}
                                                                    className="w-full flex justify-center items-center h-12 rounded-2xl bg-amber-500 text-white text-[14px] font-semibold shadow-lg shadow-amber-500/20 border border-transparent hover:bg-amber-600 hover:shadow-amber-500/30 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-1 transition-all gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                                                >
                                                                    {actionLoading === "skipped" ? (
                                                                        <>
                                                                            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
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
                                                                    className="w-full flex justify-center items-center h-12 rounded-2xl bg-emerald-600 text-white text-[14px] font-semibold shadow-lg shadow-emerald-500/20 border border-transparent hover:bg-emerald-700 hover:shadow-emerald-500/30 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-1 transition-all gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                                                >
                                                                    {actionLoading === "done" ? (
                                                                        <>
                                                                            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
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
                                                )}
                                            </>
                                        )} {/* end service_lines === 0 single-counter section */}

                                        {/* Quick Actions Toolbar — Desktop (horizontal bar) */}
                                        {canManageQueue && (
                                            <div className="sticky bottom-0 z-30 mt-auto hidden sm:flex items-center gap-2 p-2 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-slate-200/80 dark:border-white/10 rounded-[16px] shadow-[0_-4px_20px_rgb(0,0,0,0.08)] dark:shadow-[0_-4px_20px_rgb(0,0,0,0.4)] transition-all">
                                                {/* Manual Entry */}
                                                <button
                                                    onClick={() => setShowAddForm(true)}
                                                    disabled={isDisabled || isPaused || !isTodaySession}
                                                    title={!isTodaySession ? "Cannot add customers to a past session" : isPaused ? "Queue is currently on a break" : undefined}
                                                    className="w-auto h-10 px-5 text-[13px] font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-[10px] shadow-[0_4px_12px_rgba(79,70,229,0.25)] hover:shadow-[0_6px_16px_rgba(79,70,229,0.35)] transition-all flex justify-center items-center gap-2 flex-shrink-0 disabled:opacity-50 disabled:shadow-none"
                                                >
                                                    <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                                                    Add Customer
                                                </button>

                                                <div className="w-[1px] h-7 bg-slate-200 dark:bg-slate-700/50 mx-1" />

                                                {/* Invite by Number */}
                                                <form onSubmit={handleInvite} className="flex-1 relative flex items-center group">
                                                    <div className="absolute left-3.5 text-slate-400 group-focus-within:text-indigo-500 transition-colors">
                                                        <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                                                    </div>
                                                    <input type="number" min="1" value={inviteNumber} onChange={e => setInviteNumber(e.target.value)} placeholder="Invite Token #" disabled={isDisabled || isPaused || !isTodaySession} className="w-full h-10 bg-slate-50/50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-white/5 rounded-[10px] pl-10 pr-[70px] text-[13px] font-medium text-slate-900 dark:text-white placeholder-slate-400 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 dark:focus:border-indigo-500/50 transition-all outline-none disabled:opacity-50" />
                                                    <button type="submit" disabled={!inviteNumber || isDisabled || isPaused || !isTodaySession} className="absolute right-1.5 h-7 px-3 text-[12px] font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-200 rounded-[8px] hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 dark:hover:bg-indigo-500/20 dark:hover:text-indigo-400 dark:hover:border-indigo-500/30 shadow-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed">
                                                        Call
                                                    </button>
                                                </form>

                                                <div className="w-[1px] h-7 bg-slate-200 dark:bg-slate-700/50 mx-1" />

                                                {/* Remove by Number */}
                                                <form onSubmit={handleRemoveByNumber} className="flex-1 relative flex items-center group">
                                                    <div className="absolute left-3.5 text-slate-400 group-focus-within:text-rose-500 transition-colors">
                                                        <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                                    </div>
                                                    <input type="number" min="1" value={removeNumber} onChange={e => setRemoveNumber(e.target.value)} placeholder="Remove Token #" disabled={isDisabled || isPaused || !isTodaySession} className="w-full h-10 bg-slate-50/50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-white/5 rounded-[10px] pl-10 pr-[80px] text-[13px] font-medium text-slate-900 dark:text-white placeholder-slate-400 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-rose-500/20 focus:border-rose-400 dark:focus:border-rose-500/50 transition-all outline-none disabled:opacity-50" />
                                                    <button type="submit" disabled={!removeNumber || isDisabled || isPaused || !isTodaySession} className="absolute right-1.5 h-7 px-3 text-[12px] font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-200 rounded-[8px] hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 dark:hover:bg-rose-500/20 dark:hover:text-rose-400 dark:hover:border-rose-500/30 shadow-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed">
                                                        Remove
                                                    </button>
                                                </form>
                                            </div>
                                        )}


                                        {/* Status banners */}
                                        {actionError && (
                                            <div role="alert" style={{ color: "#991b1b", padding: "11px 16px", borderRadius: 10, border: `1px solid ${T.redBorder}`, fontSize: 13, fontWeight: 500 }}>
                                                {actionError}
                                            </div>
                                        )}
                                        {isTodaySession && status === "disconnected" && (
                                            <div role="alert" style={{ color: "#78350f", padding: "11px 16px", borderRadius: 10, border: `1px solid ${T.amberBorder}`, fontSize: 13 }}>
                                                <strong>Connection lost.</strong> Retrying connection to live updates. Manual actions are still available.
                                            </div>
                                        )}
                                        {isTodaySession && status === "reconnecting" && (
                                            <div role="status" style={{ background: T.blueBg, color: "#1d4ed8", padding: "11px 16px", borderRadius: 10, border: `1px solid ${T.blueBorder}`, fontSize: 13, display: "flex", alignItems: "center", gap: 8 }}>
                                                <span style={{ width: 14, height: 14, border: "#e5e7eb", borderTopColor: "#2563eb", borderRadius: "50%", display: "inline-block", animation: "spin .7s linear infinite" }} />
                                                Reconnecting to live updates…
                                            </div>
                                        )}
                                    </div>

                                    {/* Right: Lists */}
                                    <div className="flex flex-col gap-4 lg:h-full lg:min-h-0">

                                        {/* Combined Lists */}
                                        <aside className="flex flex-col flex-1 min-h-0 bg-white/80 dark:bg-slate-800/60 backdrop-blur-xl border border-slate-200/80 dark:border-white/10 rounded-[16px] shadow-[0_4px_20px_rgb(0,0,0,0.03)] dark:shadow-none overflow-hidden" aria-label="Queue Lists">
                                            <div className="px-4 pt-4 pb-0 border-b border-slate-200/80 dark:border-white/10 flex flex-col gap-3">
                                                <div className="flex items-center gap-2 text-slate-800 dark:text-white">
                                                    <div className="w-6 h-6 rounded-md bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                                                        <List size={14} strokeWidth={2.5} />
                                                    </div>
                                                    <h2 className="text-[14px] font-bold m-0">Queue Lists</h2>
                                                </div>
                                                <div className="flex items-center justify-between">
                                                    <div className="flex gap-4 pt-1 overflow-x-auto scrollbar-none">
                                                        <button
                                                            onClick={() => { setActiveListTab("recent"); setRecentPage(1); }}
                                                            className={`flex items-center gap-1.5 text-[12px] font-semibold pb-2 transition-colors whitespace-nowrap ${activeListTab === "recent" ? "text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600 dark:border-indigo-400" : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 border-b-2 border-transparent"}`}
                                                        >
                                                            Recent
                                                        </button>
                                                        <button
                                                            onClick={() => { setActiveListTab("waiting"); setWaitingPage(1); }}
                                                            className={`flex items-center gap-1.5 text-[12px] font-semibold pb-2 transition-colors whitespace-nowrap ${activeListTab === "waiting" ? "text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600 dark:border-indigo-400" : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 border-b-2 border-transparent"}`}
                                                        >
                                                            Waiting
                                                            <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-1.5 py-0.5 rounded-full font-bold">{effectiveWaitingTokens.length}</span>
                                                        </button>
                                                        <button
                                                            onClick={() => { setActiveListTab("skipped"); setWaitingPage(1); }}
                                                            className={`flex items-center gap-1.5 text-[12px] font-semibold pb-2 transition-colors whitespace-nowrap ${activeListTab === "skipped" ? "text-rose-600 dark:text-rose-400 border-b-2 border-rose-600 dark:border-rose-400" : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 border-b-2 border-transparent"}`}
                                                        >
                                                            Skipped
                                                            <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-1.5 py-0.5 rounded-full font-bold">{effectiveSkippedTokens.length}</span>
                                                        </button>
                                                        <button
                                                            onClick={() => { setActiveListTab("deleted"); setWaitingPage(1); }}
                                                            className={`flex items-center gap-1.5 text-[12px] font-semibold pb-2 transition-colors whitespace-nowrap ${activeListTab === "deleted" ? "text-red-600 dark:text-red-400 border-b-2 border-red-600 dark:border-red-400" : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 border-b-2 border-transparent"}`}
                                                        >
                                                            Removed
                                                            <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-1.5 py-0.5 rounded-full font-bold">{effectiveDeletedTokens.length}</span>
                                                        </button>
                                                    </div>
                                                </div>
                                                <div className="relative group pb-3">
                                                    <div className="absolute left-3 top-[18px] -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors">
                                                        <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                                                    </div>
                                                    {activeListTab === "recent" ? (
                                                        <input type="text" placeholder="Search recent…" value={recentSearch} onChange={e => setRecentSearch(e.target.value)} className="w-full h-9 bg-slate-50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-white/5 rounded-xl pl-9 pr-4 text-[13px] font-medium text-slate-900 dark:text-white placeholder-slate-400 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 dark:focus:border-indigo-500/50 transition-all outline-none" />
                                                    ) : (
                                                        <input type="text" placeholder={`Search ${activeListTab}…`} value={waitingSearch} onChange={e => setWaitingSearch(e.target.value)} className="w-full h-9 bg-slate-50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-white/5 rounded-xl pl-9 pr-4 text-[13px] font-medium text-slate-900 dark:text-white placeholder-slate-400 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 dark:focus:border-indigo-500/50 transition-all outline-none" />
                                                    )}
                                                </div>
                                            </div>

                                            <div className="scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-700" style={{ flex: 1, overflowY: "auto", minHeight: 0 }}>
                                                {activeListTab === "recent" && (
                                                    paginatedRecent.length > 0 ? paginatedRecent.map((t: RecentToken, i: number) => (
                                                        <RecentTokenRow
                                                            key={`${t.token_number}-${i}`}
                                                            token={t}
                                                            prefix={state?.prefix || ""}
                                                            queueName={queueName}
                                                            isManual={t.entry_type === "manual"}
                                                            onView={setSelectedToken}
                                                        />
                                                    )) : (
                                                        <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
                                                            <div className="w-16 h-16 bg-emerald-50 dark:bg-emerald-900/10 rounded-2xl flex items-center justify-center mb-4 ring-1 ring-emerald-100 dark:ring-emerald-500/10 shadow-sm">
                                                                <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24" className="text-emerald-500 dark:text-emerald-600"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                                            </div>
                                                            <p className="text-[14px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                                                                {recentSearch ? "No matching activity" : "No recent activity"}
                                                            </p>
                                                            <p className="text-[12.5px] font-medium text-slate-400 dark:text-slate-500 max-w-[200px] leading-relaxed">
                                                                {recentSearch ? "Try a different search term" : "Your queue's recent actions will appear here."}
                                                            </p>
                                                        </div>
                                                    )
                                                )}

                                                {activeListTab !== "recent" && (
                                                    (activeListTab === "waiting" ? paginatedWaiting : activeListTab === "skipped" ? paginatedSkipped : paginatedDeleted).length > 0 ? (activeListTab === "waiting" ? paginatedWaiting : activeListTab === "skipped" ? paginatedSkipped : paginatedDeleted).map((t: WaitingToken, idx: number) => (
                                                        <RecentTokenRow
                                                            key={t.id}
                                                            token={t}
                                                            prefix={state?.prefix || ""}
                                                            queueName={queueName}
                                                            isManual={t.entry_type === "manual"}
                                                            onView={setSelectedToken}
                                                            onCall={canManageQueue ? handleCall : undefined}
                                                            hasServiceLines={(state?.service_lines ?? initialQueue?.service_lines ?? 0) > 0}
                                                            extraActions={
                                                                <>
                                                                    {canManageQueue && activeListTab === "waiting" ? (
                                                                        <button
                                                                            onClick={(e) => { e.stopPropagation(); setTokenToRemove({ id: t.id, number: t.token_number }); }}
                                                                            className="px-2.5 h-7 text-[11px] font-bold text-rose-600 dark:text-rose-400 bg-white dark:bg-slate-800 border border-rose-200 dark:border-rose-500/30 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors shadow-sm ml-1"
                                                                        >
                                                                            Remove
                                                                        </button>
                                                                    ) : canManageQueue && activeListTab === "deleted" ? (
                                                                        <button
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                performAction(`undo_remove_${t.id}`, async () => {
                                                                                    await api.undoRemoveToken(t.id);
                                                                                    toast(`Restored ${state?.prefix || ""}${t.token_number} back to queue`, "success");
                                                                                    refresh();
                                                                                });
                                                                            }}
                                                                            disabled={actionLoading === `undo_remove_${t.id}`}
                                                                            className="px-2.5 h-7 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-white dark:bg-slate-800 border border-emerald-200 dark:border-emerald-500/30 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-500/10 transition-colors shadow-sm disabled:opacity-50 ml-1"
                                                                        >
                                                                            {actionLoading === `undo_remove_${t.id}` ? "..." : "Undo"}
                                                                        </button>
                                                                    ) : canManageQueue ? (
                                                                        <button
                                                                            onClick={(e) => { e.stopPropagation(); handleRecallFlow(t.token_number); }}
                                                                            className="px-2.5 h-7 text-[11px] font-bold text-indigo-600 dark:text-indigo-400 bg-white dark:bg-slate-800 border border-indigo-200 dark:border-indigo-500/30 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-500/10 transition-colors shadow-sm ml-1"
                                                                        >
                                                                            Recall
                                                                        </button>
                                                                    ) : null}
                                                                </>
                                                            }
                                                        />
                                                    )) : (
                                                        <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
                                                            <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800/50 rounded-2xl flex items-center justify-center mb-4 ring-1 ring-slate-100 dark:ring-white/5 shadow-sm">
                                                                <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24" className="text-slate-400 dark:text-slate-500"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                                            </div>
                                                            <p className="text-[14px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                                                                {waitingSearch ? "No matching tokens" : activeListTab === "waiting" ? "Queue is clear" : activeListTab === "skipped" ? "No skipped tokens" : "No removed tokens"}
                                                            </p>
                                                            <p className="text-[12.5px] font-medium text-slate-400 dark:text-slate-500 max-w-[200px] leading-relaxed">
                                                                {waitingSearch ? "Try a different search term" : activeListTab === "waiting" ? "There are no customers currently waiting in line." : activeListTab === "skipped" ? "No customers have been skipped recently." : "No customers have been removed."}
                                                            </p>
                                                        </div>
                                                    )
                                                )}
                                            </div>

                                            {activeListTab === "recent" && filteredRecent.length > RECENT_PAGE_SIZE && (
                                                <div className="text-gray-600 dark:text-slate-400 dark:border-white/10" style={{ padding: "10px 18px", borderTopWidth: 1, borderTopStyle: "solid", display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 12 }}>
                                                    <span>Showing {paginatedRecent.length} of {filteredRecent.length}</span>
                                                    <div style={{ display: "flex", gap: 4 }}>
                                                        <button onClick={() => setRecentPage(p => Math.max(1, p - 1))} disabled={recentPage === 1} style={{ padding: "3px 9px", borderRadius: 6, background: "#fff", border: `1px solid ${T.cardBorder}`, fontSize: 12, cursor: "pointer", opacity: recentPage === 1 ? .4 : 1 }}>Prev</button>
                                                        <button onClick={() => setRecentPage(p => p + 1)} disabled={recentPage * RECENT_PAGE_SIZE >= filteredRecent.length} style={{ padding: "3px 9px", borderRadius: 6, background: "#fff", border: `1px solid ${T.cardBorder}`, fontSize: 12, cursor: "pointer", opacity: recentPage * RECENT_PAGE_SIZE >= filteredRecent.length ? .4 : 1 }}>Next</button>
                                                    </div>
                                                </div>
                                            )}

                                            {activeListTab !== "recent" && (activeListTab === "waiting" ? filteredWaiting : activeListTab === "skipped" ? filteredSkipped : filteredDeleted).length > PAGE_SIZE && (
                                                <div className="text-gray-600 dark:text-slate-400 dark:border-white/10" style={{ padding: "10px 18px", borderTopWidth: 1, borderTopStyle: "solid", display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 12 }}>
                                                    <span>Showing {(activeListTab === "waiting" ? paginatedWaiting : activeListTab === "skipped" ? paginatedSkipped : paginatedDeleted).length} of {(activeListTab === "waiting" ? filteredWaiting : activeListTab === "skipped" ? filteredSkipped : filteredDeleted).length}</span>
                                                    <div style={{ display: "flex", gap: 4 }}>
                                                        <button onClick={() => setWaitingPage(p => Math.max(1, p - 1))} disabled={waitingPage === 1} style={{ padding: "3px 9px", borderRadius: 6, background: "#fff", border: `1px solid ${T.cardBorder}`, fontSize: 12, cursor: "pointer", opacity: waitingPage === 1 ? .4 : 1 }}>Prev</button>
                                                        <button onClick={() => setWaitingPage(p => p + 1)} disabled={waitingPage * PAGE_SIZE >= (activeListTab === "waiting" ? filteredWaiting : activeListTab === "skipped" ? filteredSkipped : filteredDeleted).length} style={{ padding: "3px 9px", borderRadius: 6, background: "#fff", border: `1px solid ${T.cardBorder}`, fontSize: 12, cursor: "pointer", opacity: waitingPage * PAGE_SIZE >= (activeListTab === "waiting" ? filteredWaiting : activeListTab === "skipped" ? filteredSkipped : filteredDeleted).length ? .4 : 1 }}>Next</button>
                                                    </div>
                                                </div>
                                            )}
                                        </aside>
                                    </div>
                                </div>

                                {/* Mobile bottom spacer so content isn't hidden behind the fixed dock */}
                                <div className="md:hidden h-[160px] w-full flex-shrink-0" />
                            </div>
                        )}

                        {/* ═══════════════════════════════════════════
                        SECTION: QR Code
                    ════════════════════════════════════════════ */}
                        {activeSection === "qrcode" && (
                            <div className="fade-in" style={{ display: "flex", flexDirection: "column", gap: 22 }}>
                                <div className="flex items-start gap-3">
                                    <button className="md:hidden mt-0.5 p-1.5 -ml-1 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors flex-shrink-0" onClick={() => setMobileMenuOpen(true)} aria-label="Open menu">
                                        <Menu size={22} />
                                    </button>
                                    <div className="flex-1">
                                        <h1 className="qd-section-title text-xl md:text-2xl font-bold break-words text-gray-900 dark:text-white">QR Code Showcase</h1>
                                        <p className="qd-section-sub">Share this QR code or link so customers can join the queue from their phones.</p>
                                    </div>
                                </div>
                                
                                {!isTodaySession ? (
                                    <div className="bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/60 rounded-3xl p-8 sm:p-10 text-center my-4">
                                        <div className="w-14 h-14 bg-rose-100 dark:bg-rose-900/60 text-rose-600 dark:text-rose-400 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-rose-200/80">
                                            <QrCode size={28} />
                                        </div>
                                        <h3 className="text-lg font-bold text-rose-900 dark:text-rose-200 mb-2">QR Code Inactive for Historical Sessions</h3>
                                        <p className="text-sm text-slate-600 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
                                            This queue session ({sessionInfo?.session_date}) is closed. QR codes and customer join links are strictly deactivated for historical dates.
                                        </p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-stretch mt-4">
                                        {/* Left side: Static QR Code */}
                                        <div className="md:col-span-5 flex flex-col h-full">
                                            <QueueQRCode queueId={queueId} queueName={queueName} isCollapsible={false} className="h-full flex-1 rounded-3xl" />
                                        </div>

                                        {/* Right side: Pair Showcase Device */}
                                        <div className="md:col-span-7 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/70 dark:border-white/10 p-8 sm:p-10 flex flex-col justify-between relative overflow-hidden">
                                            <div className="space-y-8">
                                                {/* Header */}
                                                <div className="flex items-start gap-5 pb-6 border-b border-slate-100 dark:border-white/5">
                                                    <div className="w-12 h-12 rounded-xl bg-indigo-50/50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
                                                        <QrCode size={24} strokeWidth={1.5} />
                                                    </div>
                                                    <div>
                                                        <h2 className="text-xl font-medium tracking-tight text-slate-900 dark:text-white">Pair Showcase Device</h2>
                                                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                                                            Open <span className="font-mono text-indigo-700 dark:text-indigo-300 font-medium bg-indigo-50 dark:bg-indigo-900/30 px-1.5 py-0.5 rounded">/qr</span> on your tablet or phone, then enter the 6-digit code below to cast your queue.
                                                        </p>
                                                        <div className="flex items-center gap-2 sm:gap-3 mt-6">
                                                            {[0, 1, 2, 3, 4, 5].map((index) => (
                                                                <input
                                                                    key={index}
                                                                    id={`pin-${index}`}
                                                                    type="text"
                                                                    inputMode="numeric"
                                                                    pattern="[0-9]*"
                                                                    maxLength={1}
                                                                    value={qrPairingCodeInput[index] || ""}
                                                                    onChange={(e) => {
                                                                        const val = e.target.value.replace(/[^0-9]/g, '');
                                                                        if (!val) {
                                                                            const newPin = qrPairingCodeInput.split('');
                                                                            newPin[index] = '';
                                                                            setQrPairingCodeInput(newPin.join(''));
                                                                            return;
                                                                        }
                                                                        const newPin = qrPairingCodeInput.split('');
                                                                        newPin[index] = val;
                                                                        const updated = newPin.join('').slice(0, 6);
                                                                        setQrPairingCodeInput(updated);
                                                                        if (index < 5 && val) {
                                                                            const next = document.getElementById(`pin-${index + 1}`);
                                                                            next?.focus();
                                                                        }
                                                                    }}
                                                                    onKeyDown={(e) => {
                                                                        if (e.key === 'Backspace' && !qrPairingCodeInput[index] && index > 0) {
                                                                            const prev = document.getElementById(`pin-${index - 1}`);
                                                                            prev?.focus();
                                                                        }
                                                                    }}
                                                                    className="w-12 h-14 sm:w-14 sm:h-16 text-center text-xl font-bold bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/10 rounded-2xl text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none"
                                                                />
                                                            ))}
                                                        </div>
                                                    </div>
                                                </div>

                                                <form onSubmit={handleConnectQrShowcase} className="space-y-8">
                                                    <button
                                                        type="submit"
                                                        disabled={qrPairingCodeInput.length !== 6 || isQrPairing}
                                                        className="w-full py-3.5 px-6 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-md shadow-indigo-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                                    >
                                                        {isQrPairing ? "Connecting..." : "Connect Device"}
                                                        {!isQrPairing && <ArrowRight size={16} className={`transition-transform duration-300 ${qrPairingCodeInput.length === 6 ? 'translate-x-1' : ''}`} />}
                                                    </button>
                                                </form>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* ═══════════════════════════════════════════
                        SECTION: Public Announcement
                    ════════════════════════════════════════════ */}
                        {activeSection === "announcement" && (
                            <div className="fade-in" style={{ display: "flex", flexDirection: "column", gap: 22 }}>
                                <div className="flex items-start gap-3">
                                    <button className="md:hidden mt-0.5 p-1.5 -ml-1 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors flex-shrink-0" onClick={() => setMobileMenuOpen(true)} aria-label="Open menu">
                                        <Menu size={22} />
                                    </button>
                                    <div className="flex-1">
                                        <h1 className="qd-section-title text-xl md:text-2xl font-bold break-words text-gray-900 dark:text-white">Public Announcement</h1>
                                        <p className="qd-section-sub">Set a message that will be displayed to all customers currently waiting in the queue.</p>
                                    </div>
                                </div>

                                <div className="qd-card bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-2xl w-full max-w-2xl p-6 sm:p-7">
                                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                                        <h3 className="text-slate-500 dark:text-slate-400" style={{ fontSize: 12, fontWeight: 700, letterSpacing: ".09em", textTransform: "uppercase", margin: 0 }}>Announcement</h3>
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
                                                className="w-full p-3.5 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-white/10 rounded-xl text-sm outline-none focus:border-indigo-500 dark:focus:border-indigo-500 transition-colors"
                                                style={{ resize: "none", height: 120 }}
                                            />
                                            <div style={{ display: "flex", gap: 8 }}>
                                                <button type="submit" disabled={isDisabled || actionLoading === "announcement"} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm px-5 py-2.5 rounded-xl shadow-sm transition-colors">
                                                    {actionLoading === "announcement" ? "Saving…" : "Save Announcement"}
                                                </button>
                                                <button type="button" onClick={() => setIsEditingAnnouncement(false)} disabled={isDisabled} className="text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-white/10 font-semibold text-sm px-4 py-2.5 rounded-xl transition-colors">
                                                    Cancel
                                                </button>
                                            </div>
                                        </form>
                                    ) : (
                                        <div>
                                            {(state?.announcement ?? initialQueue?.announcement) ? (
                                                <div className="bg-indigo-50/50 dark:bg-indigo-950/40 text-slate-900 dark:text-white border border-indigo-200 dark:border-indigo-900/50 rounded-xl p-4 text-sm leading-relaxed mb-4 whitespace-pre-wrap">
                                                    {state?.announcement ?? initialQueue?.announcement}
                                                </div>
                                            ) : (
                                                <div className="p-7 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-dashed border-slate-200 dark:border-white/10 text-center mb-4">
                                                    <svg width="28" height="28" fill="none" stroke="currentColor" viewBox="0 0 24 24" className="text-slate-400 dark:text-slate-500 mx-auto mb-2 opacity-60"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" /></svg>
                                                    <p className="text-xs italic text-slate-500 dark:text-slate-400">No active announcement. Set one below to inform waiting customers.</p>
                                                </div>
                                            )}
                                            <button
                                                onClick={() => setIsEditingAnnouncement(true)}
                                                disabled={isDisabled}
                                                className="w-full md:w-auto bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm px-4 py-2.5 rounded-xl shadow-sm transition-colors flex items-center justify-center gap-2"
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
                                sessionId={sessionId}
                                sessionDate={sessionInfo?.session_date}
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
                                onViewToken={setSelectedToken}
                                onRecallToken={(num, pfx) => handleRecallFlow(num)}
                                performAction={performAction}
                                toast={toast}
                                onOpenMobileMenu={() => setMobileMenuOpen(true)}
                                hasServiceLines={(state?.service_lines ?? initialQueue?.service_lines ?? 0) > 0}
                            />
                        )}

                        {/* ═══════════════════════════════════════════
                        SECTION: Connect TV
                        ════════════════════════════════════════════ */}
                        {activeSection === "connect_tv" && (
                            <div className="fade-in max-w-5xl mx-auto space-y-8 py-2">
                                <div className="flex items-start gap-3">
                                    <button className="md:hidden mt-0.5 p-1.5 -ml-1 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors flex-shrink-0" onClick={() => setMobileMenuOpen(true)} aria-label="Open menu">
                                        <Menu size={22} />
                                    </button>
                                    <div className="flex-1">
                                        <h1 className="qd-section-title text-xl md:text-2xl font-bold break-words text-slate-900 dark:text-white">Connect Smart TV</h1>
                                        <p className="qd-section-sub text-slate-500 dark:text-slate-400 text-xs sm:text-sm mt-1">Link an external TV screen or digital display to broadcast live queue status in real-time.</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-stretch">
                                    {/* Primary Pairing Form Card */}
                                    <div className="md:col-span-7 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-white/10 p-7 sm:p-9 shadow-sm flex flex-col justify-between relative overflow-hidden">
                                        <div className="space-y-6">
                                            <div className="flex items-center gap-4 pb-6 border-b border-slate-100 dark:border-white/10">
                                                <div className="relative shrink-0">
                                                    <div className="w-14 h-14 bg-gradient-to-br from-indigo-50 to-indigo-100/70 dark:from-indigo-950/80 dark:to-slate-800 rounded-2xl border border-indigo-200/60 dark:border-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shadow-sm">
                                                        <Tv size={26} strokeWidth={1.8} />
                                                    </div>
                                                    <div className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
                                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                                        <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500 border-2 border-white dark:border-slate-900"></span>
                                                    </div>
                                                </div>
                                                <div>
                                                    <h2 className="text-lg font-bold text-slate-900 dark:text-white">TV Pairing Terminal</h2>
                                                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Enter the 6-digit pairing code displayed on your Smart TV screen</p>
                                                </div>
                                            </div>

                                            <form onSubmit={handleConnectTV} className="space-y-6">
                                                <div className="space-y-3">
                                                    <div className="flex items-center justify-between">
                                                        <label className="text-[11px] font-bold tracking-wider text-slate-500 dark:text-slate-400 uppercase">
                                                            Pairing Code
                                                        </label>
                                                        <span className="text-[11px] text-indigo-600 dark:text-indigo-400 font-semibold bg-indigo-50 dark:bg-indigo-950/60 px-2.5 py-0.5 rounded-md">6 Digits</span>
                                                    </div>
                                                    
                                                    <div className="relative">
                                                        <input
                                                            type="text"
                                                            value={pairingCodeInput}
                                                            onChange={(e) => setPairingCodeInput(e.target.value.toUpperCase())}
                                                            maxLength={6}
                                                            placeholder="6-DIGIT CODE"
                                                            className="w-full h-16 rounded-2xl border-2 border-slate-200 dark:border-slate-700/80 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white font-mono text-center text-2xl sm:text-3xl font-black tracking-[0.4em] focus:outline-none focus:border-indigo-500 dark:focus:border-indigo-400 focus:bg-white dark:focus:bg-slate-900 focus:ring-4 focus:ring-indigo-500/10 placeholder:text-slate-300 dark:placeholder:text-slate-600 transition-all uppercase"
                                                            required
                                                        />
                                                    </div>
                                                </div>

                                                <button
                                                    type="submit"
                                                    disabled={isPairing || pairingCodeInput.length < 6}
                                                    className="w-full h-13 py-3.5 flex items-center justify-center gap-2 rounded-2xl font-bold text-sm transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed bg-indigo-600 hover:bg-indigo-700 active:scale-[0.99] text-white shadow-md shadow-indigo-600/20"
                                                >
                                                    {isPairing ? (
                                                        <RefreshCw size={18} className="animate-spin" />
                                                    ) : (
                                                        <>
                                                            Link TV Screen
                                                            <ArrowRight size={16} className={`transition-transform duration-200 ${pairingCodeInput.length === 6 ? 'translate-x-1' : ''}`} />
                                                        </>
                                                    )}
                                                </button>
                                            </form>
                                        </div>

                                        <div className="mt-8 pt-5 border-t border-slate-100 dark:border-white/10 flex items-center justify-between text-xs text-slate-400 dark:text-slate-500">
                                            <span className="flex items-center gap-1.5">
                                                <ShieldCheck size={15} className="text-emerald-500" />
                                                Secure WebSockets Broadcast
                                            </span>
                                            <span className="inline-flex items-center gap-1">
                                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                                Auto-Sync Ready
                                            </span>
                                        </div>
                                    </div>

                                    {/* Step-by-Step Setup Guide Card */}
                                    <div className="md:col-span-5 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-white/10 p-7 sm:p-9 shadow-sm flex flex-col justify-between space-y-6">
                                        <div className="space-y-5">
                                            <div className="pb-4 border-b border-slate-100 dark:border-white/10">
                                                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white">Quick Setup Guide</h3>
                                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">3 simple steps to pair your TV display</p>
                                            </div>

                                            <div className="space-y-3.5">
                                                <div className="flex items-start gap-3.5 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-white/5 transition-colors">
                                                    <div className="w-8 h-8 rounded-xl bg-indigo-100 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 font-bold text-xs flex items-center justify-center shrink-0 shadow-xs">
                                                        1
                                                    </div>
                                                    <div className="text-xs space-y-1 min-w-0">
                                                        <p className="font-bold text-slate-800 dark:text-slate-200">Open Browser on TV</p>
                                                        <p className="text-slate-500 dark:text-slate-400 leading-relaxed">Navigate to <code className="bg-slate-200/60 dark:bg-slate-700 px-1.5 py-0.5 rounded text-[11px] font-mono text-indigo-600 dark:text-indigo-300">/display</code> on your Smart TV web browser.</p>
                                                    </div>
                                                </div>

                                                <div className="flex items-start gap-3.5 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-white/5 transition-colors">
                                                    <div className="w-8 h-8 rounded-xl bg-indigo-100 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 font-bold text-xs flex items-center justify-center shrink-0 shadow-xs">
                                                        2
                                                    </div>
                                                    <div className="text-xs space-y-1 min-w-0">
                                                        <p className="font-bold text-slate-800 dark:text-slate-200">Get 6-Digit Code</p>
                                                        <p className="text-slate-500 dark:text-slate-400 leading-relaxed">Note the unique 6-digit code displayed on the TV screen.</p>
                                                    </div>
                                                </div>

                                                <div className="flex items-start gap-3.5 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-white/5 transition-colors">
                                                    <div className="w-8 h-8 rounded-xl bg-indigo-100 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 font-bold text-xs flex items-center justify-center shrink-0 shadow-xs">
                                                        3
                                                    </div>
                                                    <div className="text-xs space-y-1 min-w-0">
                                                        <p className="font-bold text-slate-800 dark:text-slate-200">Pair & Broadcast</p>
                                                        <p className="text-slate-500 dark:text-slate-400 leading-relaxed">Type code in terminal & click Link TV to broadcast live.</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}


                        {/* ═══════════════════════════════════════════
                        SECTION: Queue Lists (Full Page)
                        ════════════════════════════════════════════ */}
                        {activeSection === "waiting_list" && (
                            <div className="fade-in bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-white/10 p-4 md:p-6 shadow-sm min-h-[calc(100vh-120px)] flex flex-col overflow-hidden">
                                <div className="flex flex-col gap-1 mb-6">
                                    <div className="flex items-start gap-3">
                                        <button className="md:hidden mt-0.5 p-1.5 -ml-1 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors flex-shrink-0" onClick={() => setMobileMenuOpen(true)} aria-label="Open menu">
                                            <Menu size={22} />
                                        </button>
                                        <h2 className="text-xl md:text-2xl font-bold break-words text-gray-900 dark:text-white">Queue Lists</h2>
                                    </div>
                                    <p className="text-[13px] text-slate-500 md:ml-0 ml-8">Monitor and manage all your queue activities in real time.</p>
                                </div>

                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 w-full mb-4">
                                    <div className="flex gap-5 overflow-x-auto scrollbar-none whitespace-nowrap border-b border-slate-200 dark:border-white/10 md:border-0">
                                        <button
                                            onClick={() => { setActiveListTab("recent"); setRecentPage(1); }}
                                            className={`flex items-center gap-2 text-[14px] font-semibold pb-2.5 transition-colors whitespace-nowrap ${activeListTab === "recent" ? "text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600 dark:border-indigo-400" : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300 border-b-2 border-transparent"}`}
                                        >
                                            Recent
                                        </button>
                                        <button
                                            onClick={() => { setActiveListTab("waiting"); setWaitingPage(1); }}
                                            className={`flex items-center gap-2 text-[14px] font-semibold pb-2.5 transition-colors whitespace-nowrap ${activeListTab === "waiting" ? "text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600 dark:border-indigo-400" : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300 border-b-2 border-transparent"}`}
                                        >
                                            Waiting
                                            <span className={`text-[11px] px-2 py-0.5 rounded-full font-bold ${activeListTab === "waiting" ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300" : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"}`}>{effectiveWaitingTokens.length}</span>
                                        </button>
                                        <button
                                            onClick={() => { setActiveListTab("skipped"); setWaitingPage(1); }}
                                            className={`flex items-center gap-2 text-[14px] font-semibold pb-2.5 transition-colors whitespace-nowrap ${activeListTab === "skipped" ? "text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600 dark:border-indigo-400" : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300 border-b-2 border-transparent"}`}
                                        >
                                            Skipped
                                            <span className={`text-[11px] px-2 py-0.5 rounded-full font-bold ${activeListTab === "skipped" ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300" : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"}`}>{effectiveSkippedTokens.length}</span>
                                        </button>
                                        <button
                                            onClick={() => { setActiveListTab("deleted"); setWaitingPage(1); }}
                                            className={`flex items-center gap-2 text-[14px] font-semibold pb-2.5 transition-colors whitespace-nowrap ${activeListTab === "deleted" ? "text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600 dark:border-indigo-400" : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300 border-b-2 border-transparent"}`}
                                        >
                                            Removed
                                            <span className={`text-[11px] px-2 py-0.5 rounded-full font-bold ${activeListTab === "deleted" ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300" : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"}`}>{effectiveDeletedTokens.length}</span>
                                        </button>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="relative w-full md:w-64 lg:w-80">
                                            <span style={{ position: "absolute", inset: "0 auto 0 0", display: "flex", alignItems: "center", paddingLeft: 12, pointerEvents: "none" }}>
                                                <svg width="14" height="14" fill="none" stroke={T.textMuted} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                                            </span>
                                            {activeListTab === "recent" ? (
                                                <input type="text" placeholder="Search recent…" value={recentSearch} onChange={e => setRecentSearch(e.target.value)} className="qd-input bg-[#fafbfc] dark:bg-slate-950 dark:border-white/10 dark:text-white" style={{ paddingLeft: 34, height: 42 }} />
                                            ) : (
                                                <input type="text" placeholder={`Search ${activeListTab}…`} value={waitingSearch} onChange={e => setWaitingSearch(e.target.value)} className="qd-input bg-[#fafbfc] dark:bg-slate-950 dark:border-white/10 dark:text-white" style={{ paddingLeft: 34, height: 42 }} />
                                            )}
                                        </div>
                                        <button className="h-[42px] px-3.5 border border-slate-200 dark:border-white/10 rounded-xl bg-white dark:bg-slate-900 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center justify-center shrink-0 shadow-sm">
                                            <Filter size={16} />
                                        </button>
                                    </div>
                                </div>

                                <div className="w-full overflow-x-auto border border-slate-200 dark:border-white/10 rounded-xl overflow-hidden flex-1 flex flex-col">
                                    <div className="hidden md:grid gap-3 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-white/10 px-4 py-2.5 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest" style={{ gridTemplateColumns: ((state?.service_lines ?? initialQueue?.service_lines ?? 0) > 0) ? '80px 110px 120px 70px 120px 1fr 120px 80px' : '80px 110px 120px 120px 1fr 120px 80px' }}>
                                        <div>Token</div>
                                        <div>Status</div>
                                        <div>Entry Method</div>
                                        {((state?.service_lines ?? initialQueue?.service_lines ?? 0) > 0) && <div>Line</div>}
                                        <div>Call Method</div>
                                        <div style={{ paddingLeft: 38 }}>Customer</div>
                                        <div>{activeListTab === "recent" ? "Join Time" : activeListTab === "waiting" ? "Wait Time" : activeListTab === "skipped" ? "Skipped / Recalled" : "Removed At"}</div>
                                        <div className="text-right">Actions</div>
                                    </div>

                                    <div className="flex-1 overflow-y-auto min-h-[300px]">
                                        {activeListTab === "recent" ? (
                                            paginatedRecent.length > 0 ? paginatedRecent.map((t: RecentToken, i: number) => (
                                                <FullRecentTokenRow
                                                    key={`${t.token_number}-${i}`}
                                                    token={t}
                                                    prefix={state?.prefix || ""}
                                                    queueName={queueName}
                                                    isManual={t.entry_type === "manual"}
                                                    onView={setSelectedToken}
                                                    onCall={canManageQueue ? handleCall : undefined}
                                                    hasServiceLines={(state?.service_lines ?? initialQueue?.service_lines ?? 0) > 0}
                                                />
                                            )) : (
                                                <div className="h-full flex flex-col items-center justify-center p-8 text-center">
                                                    <div className="w-12 h-12 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mb-3">
                                                        <svg width="24" height="24" fill="none" stroke="currentColor" className="text-slate-400" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                                    </div>
                                                    <p className="text-slate-500 font-medium">
                                                        {recentSearch ? "No tokens match your search" : "No recent activity found"}
                                                    </p>
                                                </div>
                                            )
                                        ) : (
                                            (activeListTab === "waiting" ? paginatedWaiting : activeListTab === "skipped" ? paginatedSkipped : paginatedDeleted).length > 0 ? (activeListTab === "waiting" ? paginatedWaiting : activeListTab === "skipped" ? paginatedSkipped : paginatedDeleted).map((t: WaitingToken, idx: number) => {
                                                let customTimeStr = "";
                                                if (activeListTab === "waiting") {
                                                    const waitMins = Math.floor((nowInTz(tz).getTime() - new Date(t.created_at || nowInTz(tz)).getTime()) / 60000);
                                                    customTimeStr = waitMins < 1 ? "< 1 min wait" : `${waitMins} min${waitMins !== 1 ? "s" : ""} wait`;
                                                } else if (activeListTab === "skipped") {
                                                    if (t.recalled_at && t.skipped_at && new Date(t.recalled_at) > new Date(t.skipped_at)) {
                                                        customTimeStr = `Recalled ${fmtTime(t.recalled_at, tz)}`;
                                                    } else if (t.skipped_at) {
                                                        customTimeStr = `Skipped ${fmtTime(t.skipped_at, tz)}`;
                                                    }
                                                } else if (activeListTab === "deleted") {
                                                    if (t.deleted_at) {
                                                        customTimeStr = `Removed ${fmtTime(t.deleted_at, tz)}`;
                                                    }
                                                }

                                                return (
                                                    <FullRecentTokenRow
                                                        key={`${t.token_number}-${idx}`}
                                                        token={t}
                                                        prefix={state?.prefix || ""}
                                                        queueName={queueName}
                                                        isManual={t.entry_type === "manual"}
                                                        onView={setSelectedToken}
                                                        onCall={canManageQueue ? handleCall : undefined}
                                                        customTimeStr={customTimeStr || undefined}
                                                        hasServiceLines={(state?.service_lines ?? initialQueue?.service_lines ?? 0) > 0}
                                                        extraActions={
                                                            <>
                                                                {canManageQueue && activeListTab === "waiting" ? (
                                                                    <button
                                                                        onClick={() => setTokenToRemove({ id: t.id, number: t.token_number })}
                                                                        className="text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/30 w-8 h-8 flex items-center justify-center rounded-md transition-colors"
                                                                        title="Remove Customer"
                                                                    >
                                                                        <svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                                                    </button>
                                                                ) : canManageQueue && activeListTab === "skipped" ? (
                                                                    <button
                                                                        onClick={() => handleRecallFlow(t.token_number)}
                                                                        className="text-[11px] font-bold h-8 px-3 flex items-center text-indigo-600 dark:text-indigo-400 bg-white dark:bg-slate-800 border border-indigo-200 dark:border-indigo-500/30 rounded-md hover:bg-indigo-50 dark:hover:bg-indigo-500/10 transition-colors shadow-sm"
                                                                    >
                                                                        Recall
                                                                    </button>
                                                                ) : canManageQueue && activeListTab === "deleted" ? (
                                                                    <button
                                                                        onClick={() => {
                                                                            performAction(`undo_remove_${t.id}`, async () => {
                                                                                await api.undoRemoveToken(t.id);
                                                                                toast(`Restored ${state?.prefix || ""}${t.token_number} back to queue`, "success");
                                                                                refresh();
                                                                            });
                                                                        }}
                                                                        disabled={actionLoading === `undo_remove_${t.id}`}
                                                                        className="text-[11px] font-bold h-8 px-3 flex items-center text-emerald-600 dark:text-emerald-400 bg-white dark:bg-slate-800 border border-emerald-200 dark:border-emerald-500/30 rounded-md hover:bg-emerald-50 dark:hover:bg-emerald-500/10 transition-colors disabled:opacity-50 shadow-sm"
                                                                    >
                                                                        {actionLoading === `undo_remove_${t.id}` ? "..." : "Undo"}
                                                                    </button>
                                                                ) : activeListTab === "deleted" ? (
                                                                    <span className="text-[11px] font-bold text-slate-400 h-8 px-2 flex items-center border border-transparent">
                                                                        {t.removed_by === "customer" ? "By Customer" : "By Admin"}
                                                                    </span>
                                                                ) : null}
                                                            </>
                                                        }
                                                    />
                                                );
                                            }) : (
                                                <div className="h-full flex flex-col items-center justify-center p-8 text-center">
                                                    <div className="w-12 h-12 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mb-3">
                                                        <svg width="24" height="24" fill="none" stroke="currentColor" className="text-slate-400" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                                    </div>
                                                    <p className="text-slate-500 font-medium">
                                                        {waitingSearch ? "No tokens match your search" : activeListTab === "waiting" ? "No one is waiting right now" : activeListTab === "skipped" ? "No skipped tokens" : "No removed tokens"}
                                                    </p>
                                                </div>
                                            )
                                        )}
                                    </div>

                                    {activeListTab === "recent" && filteredRecent.length > RECENT_PAGE_SIZE && (
                                        <div className="bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-white/10 px-4 py-3 flex items-center justify-between text-xs text-slate-500">
                                            <span>Showing {paginatedRecent.length} of {filteredRecent.length} tokens</span>
                                            <div className="flex gap-2">
                                                <button onClick={() => setRecentPage(p => Math.max(1, p - 1))} disabled={recentPage === 1} className="px-3 py-1.5 rounded-md bg-white border border-slate-200 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed">Previous</button>
                                                <button onClick={() => setRecentPage(p => p + 1)} disabled={recentPage * RECENT_PAGE_SIZE >= filteredRecent.length} className="px-3 py-1.5 rounded-md bg-white border border-slate-200 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed">Next</button>
                                            </div>
                                        </div>
                                    )}

                                    {activeListTab !== "recent" && (activeListTab === "waiting" ? filteredWaiting : activeListTab === "skipped" ? filteredSkipped : filteredDeleted).length > PAGE_SIZE && (
                                        <div className="bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-white/10 px-4 py-3 flex items-center justify-between text-xs text-slate-500">
                                            <span>Showing {(activeListTab === "waiting" ? paginatedWaiting : activeListTab === "skipped" ? paginatedSkipped : paginatedDeleted).length} of {(activeListTab === "waiting" ? filteredWaiting : activeListTab === "skipped" ? filteredSkipped : filteredDeleted).length} tokens</span>
                                            <div className="flex gap-2">
                                                <button onClick={() => setWaitingPage(p => Math.max(1, p - 1))} disabled={waitingPage === 1} className="px-3 py-1.5 rounded-md bg-white border border-slate-200 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed">Previous</button>
                                                <button onClick={() => setWaitingPage(p => p + 1)} disabled={waitingPage * PAGE_SIZE >= (activeListTab === "waiting" ? filteredWaiting : activeListTab === "skipped" ? filteredSkipped : filteredDeleted).length} className="px-3 py-1.5 rounded-md bg-white border border-slate-200 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed">Next</button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {activeSection === "settings" && (
                            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 fill-mode-both max-w-4xl mx-auto">
                                <QueueTokenSettings 
                                    queueId={queueId} 
                                    initialFields={state?.custom_fields ?? initialQueue?.custom_fields ?? null}
                                    onUpdate={(fields) => {
                                        refresh();
                                    }}
                                />
                            </div>
                        )}
                    </div>
                </div>

                {/* ── Modals ─────────────────────────────────────────── */}

                <ConfirmModal isOpen={showDeleteConfirm} title="Delete Queue" message={`Are you sure you want to permanently delete the queue "${state?.queue_name || "this queue"}"? All associated tokens and data will be lost forever.`} confirmLabel="Delete Queue" confirmVariant="danger" onConfirm={handleDelete} onCancel={() => setShowDeleteConfirm(false)} isLoading={deleting} requireInput={true} requiredText={state?.queue_name || ""} />
                <ConfirmModal isOpen={showResetConfirm} title="Reset Queue" message={`Are you sure you want to reset the queue "${state?.queue_name || "this queue"}"? This will delete all tokens and reset the current serving number to 0. This cannot be undone.`} confirmLabel="Reset Queue" confirmVariant="danger" onConfirm={handleReset} onCancel={() => setShowResetConfirm(false)} isLoading={resetting} requireInput={true} requiredText={state?.queue_name || ""} />
                <ConfirmModal isOpen={!!tokenToRemove} title="Remove Customer" message={`Are you sure you want to remove token ${state?.prefix || ""}${tokenToRemove?.number} from the waiting list? They will be permanently marked as deleted.`} confirmLabel="Remove Token" confirmVariant="danger" onConfirm={handleConfirmRemove} onCancel={() => setTokenToRemove(null)} isLoading={actionLoading === "remove"} />

                <WebRTCCallModal
                    isOpen={callModalOpen}
                    onClose={() => setCallModalOpen(false)}
                    tokenNumber={callTokenNumber}
                    customerPhone={callCustomerPhone}
                    customerName={callCustomerName}
                    tokenId={callTokenId}
                    queueId={queueId}
                    sessionId={state?.session_id}
                    organizationId={initialQueue?.org_id || user?.org_id || undefined}
                />

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
                    autoFocusConfirm={true}
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
                            <div className="p-6 flex flex-col gap-4 max-h-[60vh] overflow-y-auto">
                                {hasAdminCustomFieldsConfigured ? (
                                    adminCustomFieldsList.length === 0 ? (
                                        <div className="text-center py-6 px-4 bg-amber-50 dark:bg-amber-950/30 rounded-xl border border-dashed border-amber-300 dark:border-amber-800/60">
                                            <p className="text-sm font-bold text-slate-900 dark:text-white mb-1">No Fields Configured</p>
                                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                                You have not configured any input fields in Token Settings. Please add fields or restore default fields first.
                                            </p>
                                        </div>
                                    ) : (
                                        adminCustomFieldsList.slice().sort((a, b) => a.order - b.order).map((field) => (
                                            <div key={field.id} className="space-y-1.5">
                                                <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                                    {field.label} {field.required && <span className="text-red-500">*</span>}
                                                </label>
                                                
                                                {field.type === 'textarea' ? (
                                                    <textarea
                                                        value={addCustomData[field.key] || ""}
                                                        onChange={e => setAddCustomData({ ...addCustomData, [field.key]: e.target.value })}
                                                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none resize-none h-24"
                                                        placeholder={`Enter ${field.label}`}
                                                    />
                                                ) : field.type === 'select' ? (
                                                    <select
                                                        value={addCustomData[field.key] || ""}
                                                        onChange={e => setAddCustomData({ ...addCustomData, [field.key]: e.target.value })}
                                                        className="w-full h-11 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/10 rounded-xl px-4 text-sm text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none"
                                                    >
                                                        <option value="" disabled>Select {field.label}</option>
                                                        {field.options?.map(opt => (
                                                            <option key={opt} value={opt}>{opt}</option>
                                                        ))}
                                                    </select>
                                                ) : (
                                                    <input
                                                        type={field.type === 'phone' ? 'tel' : field.type === 'number' ? 'number' : field.type === 'email' ? 'email' : field.type === 'date' ? 'date' : 'text'}
                                                        value={addCustomData[field.key] || ""}
                                                        onChange={e => setAddCustomData({ ...addCustomData, [field.key]: e.target.value })}
                                                        placeholder={`Enter ${field.label}`}
                                                        className="w-full h-11 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/10 rounded-xl px-4 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none"
                                                    />
                                                )}
                                            </div>
                                        ))
                                    )
                                ) : (
                                    <>
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

                                <div className="space-y-1.5">
                                    <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Number of Pax <span className="text-red-500">*</span></label>
                                    <div className="relative">
                                        <input
                                            type="text"
                                            inputMode="numeric"
                                            pattern="[0-9]*"
                                            value={addPaxCount}
                                            onChange={e => {
                                                const val = e.target.value.replace(/[^0-9]/g, '');
                                                setAddPaxCount(val);
                                            }}
                                            placeholder="1"
                                            className="w-full h-11 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/10 rounded-xl px-4 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none"
                                        />
                                    </div>
                                </div>
                            </>
                        )}
                            </div>
                            <div className="px-6 py-5 bg-slate-50 dark:bg-slate-950/50 border-t border-slate-100 dark:border-white/5 flex items-center gap-3 justify-between">
                                <div className="flex-1">
                                    {addFormError && (
                                        <p className="text-xs text-red-500 font-medium flex items-center gap-1.5 leading-snug pr-4">
                                            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                            {addFormError}
                                        </p>
                                    )}
                                </div>
                                <div className="flex items-center gap-3">
                                    <button onClick={() => { setShowAddForm(false); setAddName(""); setAddPhone(""); setAddPaxCount("1"); }} className="px-5 py-2.5 rounded-xl text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors">
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handlePreAddCustomer}
                                        disabled={!isAddNameValid || !addPhone.trim() || actionLoading === "add" || isPaused || !isTodaySession}
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
                    </div>
                )}

                {/* Invite Line Selection Modal */}
                {showInviteLineModal && (
                    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md animate-in fade-in duration-200" onClick={(e) => { if (e.target === e.currentTarget) setShowInviteLineModal(false); }}>
                        <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-200 dark:border-white/10">
                            <div className="px-6 py-5 border-b border-slate-100 dark:border-white/5 flex items-center justify-between bg-slate-50/50 dark:bg-slate-950/50">
                                <div>
                                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">Select Service Lane</h3>
                                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Which lane is calling Token {state?.prefix || ""}{inviteNumber}?</p>
                                </div>
                                <button onClick={() => setShowInviteLineModal(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors bg-white dark:bg-slate-800 shadow-sm ring-1 ring-slate-900/5 p-2 rounded-full">
                                    <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                                </button>
                            </div>
                            <div className="p-6">
                                <div className="grid grid-cols-2 gap-3">
                                    {Array.from({ length: state?.service_lines || 0 }).map((_, i) => (
                                        <button
                                            key={i + 1}
                                            onClick={() => executeInvite(i + 1)}
                                            className="px-4 py-3 rounded-xl border-2 border-slate-200 hover:border-indigo-500 hover:bg-indigo-50 dark:border-white/10 dark:hover:border-indigo-500 dark:hover:bg-indigo-900/20 text-slate-700 dark:text-slate-200 font-bold text-sm transition-all text-center"
                                        >
                                            Lane {i + 1}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                <TokenDetailModal
                    token={selectedToken}
                    onClose={() => setSelectedToken(null)}
                    onRecall={selectedToken && !isReadOnly ? () => handleRecallFlow(selectedToken.token_number) : undefined}
                />
            </div>

            {/* Mobile Bottom Dock — rendered at root level to avoid overflow clipping */}
            {activeSection === "queues" && (
                <div className={`sm:hidden fixed bottom-0 left-0 right-0 z-[9999] transition-transform duration-300 ease-in-out ${isScrollingDown ? "translate-y-full" : "translate-y-0"}`}>
                    {/* Expandable Panel (slides up from bottom) */}
                    <div className={`overflow-hidden transition-all duration-300 ease-in-out ${mobileQuickExpanded ? "max-h-[200px] opacity-100" : "max-h-0 opacity-0"}`}>
                        <div className="mx-3 mb-2 flex flex-col gap-2">
                            {/* Invite by Number */}
                            <form onSubmit={(e) => { handleInvite(e); setMobileQuickExpanded(false); }} className="relative flex items-center group bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm p-1">
                                <div className="absolute left-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors">
                                    <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                                </div>
                                <input type="number" min="1" value={inviteNumber} onChange={e => setInviteNumber(e.target.value)} placeholder="Invite Token #" disabled={isDisabled || isPaused || !isTodaySession} className="w-full h-11 bg-transparent pl-11 pr-[70px] text-[14px] font-medium text-slate-900 dark:text-white placeholder-slate-400 outline-none rounded-xl disabled:opacity-50" />
                                <button type="submit" disabled={!inviteNumber || isDisabled || isPaused || !isTodaySession} className="absolute right-2 h-8 px-4 text-[12px] font-bold bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-xl transition-all hover:bg-indigo-100 disabled:opacity-40">
                                    Call
                                </button>
                            </form>
                            {/* Remove by Number */}
                            <form onSubmit={(e) => { handleRemoveByNumber(e); setMobileQuickExpanded(false); }} className="relative flex items-center group bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm p-1">
                                <div className="absolute left-4 text-slate-400 group-focus-within:text-rose-500 transition-colors">
                                    <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                </div>
                                <input type="number" min="1" value={removeNumber} onChange={e => setRemoveNumber(e.target.value)} placeholder="Remove Token #" disabled={isDisabled || isPaused || !isTodaySession} className="w-full h-11 bg-transparent pl-11 pr-[85px] text-[14px] font-medium text-slate-900 dark:text-white placeholder-slate-400 outline-none rounded-xl disabled:opacity-50" />
                                <button type="submit" disabled={!removeNumber || isDisabled || isPaused || !isTodaySession} className="absolute right-2 h-8 px-4 text-[12px] font-bold bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 rounded-xl transition-all hover:bg-rose-100 disabled:opacity-40">
                                    Remove
                                </button>
                            </form>
                        </div>
                    </div>

                    {/* Bottom Dock Bar */}
                    <div className="flex items-center gap-2 px-4 py-3 bg-white border-t border-slate-200 shadow-[0_-4px_20px_rgb(0,0,0,0.04)]" style={{ paddingBottom: "max(12px, env(safe-area-inset-bottom))" }}>
                        {/* Add Customer — primary CTA */}
                        <button
                            onClick={() => setShowAddForm(true)}
                            disabled={isDisabled || isPaused || !isTodaySession}
                            title={!isTodaySession ? "Cannot add customer to past session" : undefined}
                            className="flex-1 w-full h-11 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-[13px] font-bold rounded-xl shadow-lg shadow-indigo-500/25 transition-all disabled:opacity-50 disabled:shadow-none"
                        >
                            <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                            Add Customer
                        </button>

                        {/* More Actions Toggle */}
                        <button
                            type="button"
                            onClick={() => setMobileQuickExpanded(prev => !prev)}
                            className={`w-11 h-11 flex items-center justify-center rounded-xl border transition-all flex-shrink-0 ${mobileQuickExpanded
                                ? "bg-indigo-50 dark:bg-indigo-500/10 border-indigo-200 dark:border-indigo-500/30 text-indigo-600 dark:text-indigo-400"
                                : "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400"
                                }`}
                        >
                            <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /><circle cx="5" cy="12" r="1" />
                            </svg>
                        </button>
                    </div>
                </div>
            )}
        </>
    );
}

// ── Recent Token Row ───────────────────────────────────────────────
const RecentTokenRow = React.memo(function RecentTokenRow({
    token: t, prefix, queueName, isManual, onView, onCall, hasServiceLines = true, extraActions
}: {
    token: RecentToken | WaitingToken;
    prefix: string;
    queueName?: string;
    isManual?: boolean;
    onView?: (data: TokenDetailData) => void;
    onCall?: (token: any) => void;
    hasServiceLines?: boolean;
    extraActions?: React.ReactNode;
}) {
    const tz = useBranchTimezone();
    const statusClasses: Record<string, string> = {
        serving: "bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20",
        done: "bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20",
        skipped: "bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20",
        deleted: "bg-rose-50 text-rose-600 border-rose-200 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20",
        waiting: "bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20",
    };
    const sClass = statusClasses[t.status] || "bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-500/10 dark:text-slate-400 dark:border-slate-500/20";

    let timeStr = "";
    if (t.status === "done" && (t as RecentToken).completed_at) {
        timeStr = fmtTime((t as RecentToken).completed_at!, tz);
    } else if (t.status === "serving" && (t as RecentToken).served_at) {
        timeStr = fmtTime((t as RecentToken).served_at!, tz);
    } else if (t.created_at) {
        timeStr = fmtTime(t.created_at, tz);
    }

    return (
        <div
            className="group border-b border-slate-100 dark:border-white/5 px-4 py-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors bg-transparent cursor-pointer"
            onClick={() => onView?.({
                id: (t as WaitingToken).id,
                token_number: t.token_number,
                prefix: prefix || "",
                customer_name: t.customer_name,
                customer_phone: t.customer_phone,
                pax_count: t.pax_count,
                status: t.status,
                created_at: t.created_at,
                served_at: (t as RecentToken).served_at,
                completed_at: (t as RecentToken).completed_at,
                entry_type: t.entry_type || "qr",
                queue_name: queueName,
                called_via_invite: t.called_via_invite,
                assigned_line: t.assigned_line,
                skipped_at: (t as WaitingToken).skipped_at,
                deleted_at: (t as WaitingToken).deleted_at,
                recalled_at: (t as WaitingToken).recalled_at,
                removed_by: (t as WaitingToken).removed_by
            })}
        >
            <div className="flex items-center gap-3.5 min-w-0 flex-1">
                <div className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-[12px] flex-shrink-0 bg-[hsl(var(--hue),70%,90%)] text-[hsl(var(--hue),70%,30%)] dark:bg-[hsl(var(--hue),40%,25%)] dark:text-[hsl(var(--hue),70%,85%)]" style={{ "--hue": t.customer_name ? t.customer_name.charCodeAt(0) * 20 % 360 : 200 } as React.CSSProperties}>
                    {t.customer_name ? t.customer_name.substring(0, 2).toUpperCase() : "WA"}
                </div>

                <div className="flex flex-col min-w-0 gap-0.5">
                    <div className="flex items-center gap-2">
                        <span className="font-bold text-[14px] text-slate-800 dark:text-slate-100 tracking-tight">
                            {prefix}{t.token_number}
                        </span>
                        <span className="text-[13px] text-slate-600 dark:text-slate-300 truncate">
                            {t.customer_name || "Walk-in"}
                        </span>
                        {(t.pax_count && t.pax_count > 1) ? (
                            <span className="inline-flex items-center gap-1 font-medium text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-1.5 py-0.5 rounded text-[10px] ml-1" title={`Total Pax: ${t.pax_count}`}>
                                <Users size={10} /> +{(t.pax_count) - 1}
                            </span>
                        ) : null}
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-slate-500 font-medium">
                        <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md ${sClass.replace("border-slate-200", "border-transparent").replace("bg-slate-50", "bg-slate-100")}`}>
                            {t.status === "done" && <CheckCircle2 size={12} className="text-emerald-500" />}
                            {t.status === "serving" && <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />}
                            {t.status === "deleted" && <MinusCircle size={12} />}
                            {t.status === "skipped" && <Hourglass size={12} />}
                            {t.status === "waiting" && <Clock size={12} />}
                            <span className="capitalize tracking-wide">{t.status === "done" ? "Done" : t.status === "deleted" ? "Removed" : t.status === "skipped" ? "Skipped" : t.status}</span>
                        </span>
                        {timeStr && <span>• {timeStr}</span>}
                        {hasServiceLines && t.assigned_line != null && <span>• L{t.assigned_line}</span>}
                    </div>
                </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
                {extraActions}
            </div>
        </div>
    );
});

// ── Full Recent Token Row ───────────────────────────────────────────────
const STATUS_LABELS: Record<string, { label: string; cls: string }> = {
    serving: { label: "Serving", cls: "bg-blue-50  text-blue-600  border-blue-200  dark:bg-blue-500/10  dark:text-blue-400  dark:border-blue-500/20" },
    done: { label: "Done", cls: "bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20" },
    skipped: { label: "Skipped", cls: "bg-amber-50  text-amber-600  border-amber-200  dark:bg-amber-500/10  dark:text-amber-400  dark:border-amber-500/20" },
    deleted: { label: "Removed", cls: "bg-rose-50   text-rose-600   border-rose-200   dark:bg-rose-500/10   dark:text-rose-400   dark:border-rose-500/20" },
    waiting: { label: "Waiting", cls: "bg-amber-50  text-amber-600  border-amber-200  dark:bg-amber-500/10  dark:text-amber-400  dark:border-amber-500/20" },
};

const FullRecentTokenRow = React.memo(function FullRecentTokenRow({
    token: t, prefix, queueName, isManual, onView, onCall, customTimeStr, extraActions, hasServiceLines = true
}: {
    token: RecentToken | WaitingToken;
    prefix: string;
    queueName?: string;
    isManual?: boolean;
    onView?: (data: TokenDetailData) => void;
    onCall?: (token: any) => void;
    customTimeStr?: string;
    extraActions?: React.ReactNode;
    hasServiceLines?: boolean;
}) {
    const tz = useBranchTimezone();
    const st = STATUS_LABELS[t.status] ?? { label: t.status, cls: "bg-slate-50 text-slate-600 border-slate-200" };

    const timeStr = customTimeStr ?? (t.created_at
        ? fmtTime(t.created_at, tz)
        : "");

    const tokenData: TokenDetailData = {
        id: (t as WaitingToken).id,
        token_number: t.token_number,
        prefix,
        customer_name: t.customer_name,
        customer_phone: t.customer_phone,
        pax_count: t.pax_count,
        status: t.status,
        created_at: t.created_at,
        served_at: t.served_at,
        completed_at: t.completed_at,
        entry_type: isManual ? "manual" : "qr",
        queue_name: queueName,
        called_via_invite: t.called_via_invite,
        assigned_line: t.assigned_line,
        skipped_at: (t as WaitingToken).skipped_at,
        deleted_at: (t as WaitingToken).deleted_at,
        recalled_at: (t as WaitingToken).recalled_at,
        removed_by: (t as WaitingToken).removed_by,
    };

    return (
        /* Desktop: proper columns */
        <div
            className="group border-b border-slate-100 dark:border-white/5 hover:bg-indigo-50/30 dark:hover:bg-slate-800/40 transition-colors bg-transparent"
        >
            {/* ── Desktop row ─────────────────────────────── */}
            <div
                className="hidden md:grid px-4 py-3 items-center gap-3"
                style={{ gridTemplateColumns: hasServiceLines ? '80px 110px 120px 70px 120px 1fr 120px 80px' : '80px 110px 120px 120px 1fr 120px 80px' }}
            >
                {/* Token # */}
                <div className="flex items-center">
                    <span className="font-black tabular-nums text-[15px] text-slate-800 dark:text-white">
                        <span className="text-indigo-500">{prefix}</span>{t.token_number}
                    </span>
                </div>

                {/* Status */}
                <div>
                    <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[12px] font-medium border ${st.cls}`}>
                        {t.status === "done" && <CheckCircle2 size={13} />}
                        {t.status === "deleted" && <MinusCircle size={13} />}
                        {t.status === "skipped" && <Hourglass size={13} />}
                        {t.status === "serving" && <Play size={13} />}
                        {t.status === "waiting" && <Clock size={13} />}
                        {t.status === "done" ? "Done" : t.status === "deleted" ? "Removed" : t.status === "skipped" ? "Skipped" : st.label}
                    </span>
                </div>

                {/* Entry Type */}
                <div>
                    {isManual
                        ? <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[12px] font-medium text-slate-500 dark:text-slate-400"><User size={13} />Manual</span>
                        : <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[12px] font-medium text-slate-500 dark:text-slate-400"><QrCode size={13} />QR</span>
                    }
                </div>

                {/* Line */}
                {hasServiceLines && (
                    <div>
                        {t.assigned_line != null
                            ? <span className="inline-flex px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20">L {t.assigned_line}</span>
                            : <span className="text-slate-300 dark:text-slate-600 text-xs">—</span>
                        }
                    </div>
                )}

                {/* Call Method */}
                <div>
                    {t.called_via_invite
                        ? <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] font-medium bg-fuchsia-50 text-fuchsia-700 border border-fuchsia-200 dark:bg-fuchsia-500/10 dark:text-fuchsia-400 dark:border-fuchsia-500/20"><Send size={12} />Invited</span>
                        : <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] font-medium bg-slate-50 text-slate-500 border border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700"><Phone size={12} />Call Next</span>
                    }
                </div>

                {/* Customer */}
                <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-7 h-7 rounded-full flex items-center justify-center font-bold text-[10px] flex-shrink-0 bg-[hsl(var(--hue),70%,90%)] text-[hsl(var(--hue),70%,30%)] dark:bg-[hsl(var(--hue),40%,25%)] dark:text-[hsl(var(--hue),70%,85%)]" style={{ "--hue": t.customer_name ? t.customer_name.charCodeAt(0) * 20 % 360 : 200 } as React.CSSProperties}>
                        {t.customer_name ? t.customer_name.substring(0, 2).toUpperCase() : "WA"}
                    </div>
                    <div className="flex flex-col min-w-0">
                        <span className="text-[13px] font-semibold text-slate-800 dark:text-slate-100 truncate flex items-center">
                            {t.customer_name || "Walk-in"}
                            {(t.pax_count && t.pax_count > 1) && (
                                <span className="inline-flex items-center gap-1 font-medium text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-[9px] ml-1.5 shadow-sm border border-slate-200 dark:border-slate-700 flex-shrink-0" title={`Total Pax: ${t.pax_count}`}>
                                    <Users size={10} className="text-slate-400" />
                                    +{(t.pax_count) - 1}
                                </span>
                            )}
                        </span>
                        <span className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5 truncate">
                            {t.customer_phone || "No phone"}
                        </span>
                    </div>
                </div>

                {/* Time */}
                <div>
                    <span className="text-[12px] font-medium text-slate-500 dark:text-slate-400 tabular-nums">
                        {timeStr || "—"}
                    </span>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {onView && (
                        <button
                            onClick={() => onView(tokenData)}
                            className="w-7 h-7 flex items-center justify-center text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-md transition-colors"
                            title="View Details"
                        >
                            <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                        </button>
                    )}
                    {onCall && t.customer_phone && (
                        <button
                            onClick={() => onCall(t)}
                            className="w-7 h-7 flex items-center justify-center text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 rounded-md transition-colors"
                            title="Call Handset"
                        >
                            <Phone width={13} height={13} />
                        </button>
                    )}
                    {extraActions}
                </div>
            </div>

            {/* ── Mobile card ─────────────────────────────── */}
            <div className="md:hidden px-4 py-3 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <span className="font-black text-[16px] text-slate-900 dark:text-white tabular-nums">
                            <span className="text-indigo-500">{prefix}</span>{t.token_number}
                        </span>
                        <span className={`px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider border ${st.cls}`}>{st.label}</span>
                        {isManual
                            ? <span className="px-2 py-0.5 rounded-md text-[9px] font-bold bg-violet-50 text-violet-700 border border-violet-200">Manual</span>
                            : <span className="px-2 py-0.5 rounded-md text-[9px] font-bold bg-cyan-50 text-cyan-700 border border-cyan-200">QR</span>
                        }
                        {hasServiceLines && t.assigned_line != null && (
                            <span className="px-2 py-0.5 rounded-md text-[9px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">L{t.assigned_line}</span>
                        )}
                    </div>
                    <span className="text-[11px] font-medium text-slate-400 tabular-nums">{timeStr}</span>
                </div>
                <div className="flex items-center justify-between">
                    <div className="flex flex-col">
                        <span className="text-[13px] font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                            {t.customer_name || "Walk-in"}
                            {(t.pax_count && t.pax_count > 1) && (
                                <span className="inline-flex items-center gap-1 font-medium text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-[10px] shadow-sm border border-slate-200 dark:border-slate-700" title={`Total Pax: ${t.pax_count}`}>
                                    <Users size={10} className="text-slate-400" />
                                    +{(t.pax_count) - 1}
                                </span>
                            )}
                        </span>
                        <span className="text-[11px] text-slate-400">{t.customer_phone || "No phone"}</span>
                    </div>
                    <div className="flex items-center gap-1">
                        {onView && (
                            <button onClick={() => onView(tokenData)} className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors" title="View Details">
                                <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                            </button>
                        )}
                        {onCall && t.customer_phone && (
                            <button
                                onClick={() => onCall(t)}
                                className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-md transition-colors"
                                title="Call Handset"
                            >
                                <Phone width={14} height={14} />
                            </button>
                        )}
                        {extraActions}
                    </div>
                </div>
            </div>
        </div>
    );
});

// ── Queue History Section ──────────────────────────────────────────
function calcSvcTime(served?: string | null, completed?: string | null): string {
    if (!served || !completed) return "—";
    const diffMs = new Date(completed).getTime() - new Date(served).getTime();
    if (diffMs < 0) return "—";
    const mins = Math.floor(diffMs / 60000);
    if (mins === 0) return "< 1 min";
    return `${mins} min${mins !== 1 ? "s" : ""}`;
}

function QueueHistory({
    queueId, sessionId, sessionDate, queueName, prefix,
    queueHistory, setQueueHistory,
    historyTotal, setHistoryTotal,
    historyPage, setHistoryPage,
    historyLoading, setHistoryLoading,
    historyPageSize, onViewToken, onRecallToken, performAction, toast,
    onOpenMobileMenu, hasServiceLines
}: {
    queueId: string; sessionId?: string; sessionDate?: string; queueName: string; prefix: string;
    queueHistory: TokenHistoryItem[]; setQueueHistory: (d: TokenHistoryItem[]) => void;
    historyTotal: number; setHistoryTotal: (t: number) => void;
    historyPage: number; setHistoryPage: (p: number | ((prev: number) => number)) => void;
    historyLoading: boolean; setHistoryLoading: (l: boolean) => void;
    historyPageSize: number;
    onViewToken: (t: TokenDetailData) => void;
    onRecallToken: (tokenNumber: number, prefix: string) => void;
    performAction: (action: string, fn: () => Promise<void>) => Promise<void>;
    toast: (msg: string, type: "success" | "error" | "info" | "warning") => void;
    onOpenMobileMenu: () => void;
    hasServiceLines?: boolean;
}) {
    const [searchQuery, setSearchQuery] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("");
    const [dateFilterMode, setDateFilterMode] = useState<"session" | "date" | "all">("session");
    const [selectedDate, setSelectedDate] = useState<string>(sessionDate || new Date().toISOString().split("T")[0]);
    const [exporting, setExporting] = useState(false);

    useEffect(() => {
        if (sessionDate) {
            setSelectedDate(sessionDate);
        }
    }, [sessionDate]);

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

    useEffect(() => { setHistoryPage(1); }, [debouncedSearch, statusFilter, dateFilterMode, selectedDate, setHistoryPage]);

    useEffect(() => {
        setHistoryLoading(true);
        const params: any = {
            queueId,
            search: debouncedSearch || undefined,
            status: statusFilter || undefined,
            limit: historyPageSize,
            offset: (historyPage - 1) * historyPageSize,
        };

        if (dateFilterMode === "session" && (sessionDate || selectedDate)) {
            const targetDate = sessionDate || selectedDate;
            params.startDate = targetDate;
            params.endDate = targetDate;
        } else if (dateFilterMode === "date" && selectedDate) {
            params.startDate = selectedDate;
            params.endDate = selectedDate;
        }

        api.getHistory(params)
            .then(res => { setQueueHistory(res.items); setHistoryTotal(res.total); })
            .catch(console.error)
            .finally(() => setHistoryLoading(false));
    }, [queueId, sessionId, dateFilterMode, selectedDate, historyPage, historyPageSize, statusFilter, debouncedSearch, setQueueHistory, setHistoryTotal, setHistoryLoading]);

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
                <div className="flex items-start gap-3">
                    <button className="md:hidden mt-0.5 p-1.5 -ml-1 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors flex-shrink-0" onClick={onOpenMobileMenu} aria-label="Open menu">
                        <Menu size={22} />
                    </button>
                    <div className="flex-1">
                        <h1 className="qd-section-title text-xl md:text-2xl font-bold break-words text-gray-900 dark:text-white">Queue History</h1>
                        <p className="qd-section-sub">View past tokens and customer records for this queue.</p>
                    </div>
                </div>
                {historyTotal > 0 && <span style={{ fontSize: 12.5, fontWeight: 500 }}>{historyTotal} record{historyTotal !== 1 ? "s" : ""} found</span>}
            </div>

            {/* Filters */}
            <div className="qd-card bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-2xl p-3.5 sm:p-4">
                <div className="flex flex-col md:flex-row items-start md:items-end gap-3 w-full">
                    <div className="w-full md:flex-1 flex flex-col gap-1.5">
                        <label className="text-[10px] font-bold tracking-[0.09em] uppercase text-slate-500 dark:text-slate-400">Search Customers</label>
                        <div style={{ position: "relative" }}>
                            <span style={{ position: "absolute", inset: "0 auto 0 0", display: "flex", alignItems: "center", paddingLeft: 11, pointerEvents: "none" }}>
                                <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" className="text-slate-400 dark:text-slate-500"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                            </span>
                            <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Name, token #, or phone…" className="w-full pl-9 pr-8 py-2 text-sm bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-white/10 rounded-xl focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 placeholder:text-slate-400 dark:placeholder:text-slate-500 transition-colors" style={{ height: 38 }} />
                            {searchQuery && (
                                <button onClick={() => setSearchQuery("")} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200" style={{ position: "absolute", inset: "0 0 0 auto", display: "flex", alignItems: "center", paddingRight: 11, background: "transparent", border: "none", cursor: "pointer" }}>
                                    <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                                </button>
                            )}
                        </div>
                    </div>
                    <div className="flex flex-wrap items-end gap-3 w-full md:w-auto">
                        <div className="flex-1 md:w-auto flex flex-col gap-1.5">
                            <label className="text-[10px] font-bold tracking-[0.09em] uppercase text-slate-500 dark:text-slate-400">Date Range</label>
                            <div className="flex items-center gap-2">
                                <select
                                    value={dateFilterMode}
                                    onChange={e => setDateFilterMode(e.target.value as any)}
                                    className="w-full md:w-[160px] px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-white/10 rounded-xl focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 cursor-pointer transition-colors"
                                    style={{ height: 38 }}
                                >
                                    <option value="session" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">
                                        {sessionDate ? `Session (${sessionDate})` : "Current Session"}
                                    </option>
                                    <option value="date" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">
                                        Custom Date...
                                    </option>
                                    <option value="all" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">
                                        All Dates
                                    </option>
                                </select>

                                {dateFilterMode === "date" && (
                                    <input
                                        type="date"
                                        value={selectedDate}
                                        onChange={e => setSelectedDate(e.target.value)}
                                        className="px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-white/10 rounded-xl focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-colors"
                                        style={{ height: 38 }}
                                    />
                                )}
                            </div>
                        </div>

                        <div className="flex-1 md:w-auto flex flex-col gap-1.5">
                            <label className="text-[10px] font-bold tracking-[0.09em] uppercase text-slate-500 dark:text-slate-400">Status</label>
                            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="w-full md:w-[130px] px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-white/10 rounded-xl focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 cursor-pointer transition-colors" style={{ height: 38 }}>
                                <option value="" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">All</option>
                                <option value="done" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">Completed</option>
                                <option value="skipped" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">Skipped</option>
                                <option value="serving" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">Serving</option>
                                <option value="deleted" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">Removed</option>
                            </select>
                        </div>
                        <button
                            onClick={handleExport}
                            disabled={exporting || historyTotal === 0}
                            className="shrink-0 h-[38px] px-3.5 flex items-center justify-center gap-1.5 font-semibold text-xs rounded-xl bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
                        >
                            {exporting ? (
                                <span style={{ width: 14, height: 14, border: `2px solid ${T.textMuted}`, borderTopColor: "currentColor", borderRadius: "50%", display: "inline-block", animation: "spin .7s linear infinite" }} />
                            ) : (
                                <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                            )}
                            <span className="hidden sm:inline">Export CSV</span>
                            <span className="sm:hidden">Export</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="qd-card bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 w-full overflow-x-auto rounded-2xl shadow-sm" style={{ overflow: "hidden" }}>
                <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", textAlign: "left", fontSize: 13.5, borderCollapse: "collapse", minWidth: 800 }}>
                        <thead>
                            <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-white/10">
                                {["Token", "Customer", "Status", "Type", "Wait Time", "Service Time", "Staff", ...(hasServiceLines ? ["Line"] : []), "Actions"].map(h => (
                                    <th key={h} className="text-slate-500 dark:text-slate-400" style={{ padding: "11px 18px", fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".09em", whiteSpace: "nowrap" }}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {historyLoading ? (
                                <tr><td colSpan={hasServiceLines ? 9 : 8} style={{ padding: "48px", textAlign: "center", }}>
                                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                                        <span style={{ width: 18, height: 18, border: `2px solid ${T.brandLight}`, borderTopColor: T.brand, borderRadius: "50%", display: "inline-block", animation: "spin .7s linear infinite" }} />
                                        <span className="text-slate-600 dark:text-slate-400" style={{ fontSize: 13 }}>Loading records…</span>
                                    </div>
                                </td></tr>
                            ) : queueHistory.length === 0 ? (
                                <tr><td colSpan={hasServiceLines ? 9 : 8} className="text-slate-500 dark:text-slate-400" style={{ padding: "48px", textAlign: "center", fontSize: 13 }}>No matching history found for this queue.</td></tr>
                            ) : queueHistory.map(item => {
                                const isManual = item.entry_type === "manual";
                                const ss = statusStyleMap[item.status] || { bg: "#f3f4f6", color: "#6b7280", label: item.status };
                                return (
                                    <tr key={item.id} className="border-b border-slate-100 dark:border-white/5 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                        <td className="text-slate-900 dark:text-white" style={{ padding: "12px 18px", fontWeight: 800, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>{item.queue_prefix}{item.token_number}</td>
                                        <td style={{ padding: "12px 18px" }}>
                                            <div className="flex items-center gap-2.5 min-w-0">
                                                <div className="w-7 h-7 rounded-full flex items-center justify-center font-bold text-[10px] flex-shrink-0 bg-[hsl(var(--hue),70%,90%)] text-[hsl(var(--hue),70%,30%)] dark:bg-[hsl(var(--hue),40%,25%)] dark:text-[hsl(var(--hue),70%,85%)]" style={{ "--hue": item.customer_name ? item.customer_name.charCodeAt(0) * 20 % 360 : 200 } as React.CSSProperties}>
                                                    {item.customer_name ? item.customer_name.substring(0, 2).toUpperCase() : "WA"}
                                                </div>
                                                <div className="flex flex-col min-w-0">
                                                    <span className="text-[13px] font-semibold text-slate-800 dark:text-slate-100 truncate flex items-center">
                                                        {item.customer_name || "Walk-in"}
                                                        {(item.pax_count && item.pax_count > 1) && (
                                                            <span className="inline-flex items-center gap-1 font-medium text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-[9px] ml-1.5 shadow-sm border border-slate-200 dark:border-slate-700 flex-shrink-0" title={`Total Pax: ${item.pax_count}`}>
                                                                <Users size={10} className="text-slate-400" />
                                                                +{(item.pax_count) - 1}
                                                            </span>
                                                        )}
                                                    </span>
                                                    <span className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5 truncate">
                                                        {item.customer_phone || "No phone"}
                                                    </span>
                                                </div>
                                            </div>
                                        </td>
                                        <td style={{ padding: "12px 18px", whiteSpace: "nowrap" }}>
                                            <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                                                {(() => {
                                                    const cls = item.status === "done" ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20"
                                                        : item.status === "serving" ? "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20"
                                                            : item.status === "waiting" ? "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20"
                                                                : item.status === "deleted" ? "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20"
                                                                    : "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700";
                                                    return (
                                                        <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[12px] font-medium border ${cls}`}>
                                                            {item.status === "done" && <CheckCircle2 size={13} />}
                                                            {item.status === "deleted" && <MinusCircle size={13} />}
                                                            {item.status === "skipped" && <Hourglass size={13} />}
                                                            {item.status === "serving" && <Play size={13} />}
                                                            {item.status === "waiting" && <Clock size={13} />}
                                                            {item.status === "done" ? "Done" : item.status === "deleted" ? "Removed" : item.status === "skipped" ? "Skipped" : ss.label}
                                                        </span>
                                                    );
                                                })()}
                                            </div>
                                        </td>
                                        <td style={{ padding: "12px 18px", whiteSpace: "nowrap" }}>
                                            {isManual
                                                ? <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[12px] font-medium text-slate-500 dark:text-slate-400"><User size={13} />Manual</span>
                                                : <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[12px] font-medium text-slate-500 dark:text-slate-400"><QrCode size={13} />QR</span>
                                            }
                                        </td>
                                        <td className="text-slate-600 dark:text-slate-300" style={{ padding: "12px 18px", whiteSpace: "nowrap", fontSize: 12.5, fontVariantNumeric: "tabular-nums" }}>{calcWaitTime(item.created_at, item.served_at)}</td>
                                        <td className="text-emerald-600 dark:text-emerald-400 font-medium" style={{ padding: "12px 18px", whiteSpace: "nowrap", fontSize: 12.5, fontVariantNumeric: "tabular-nums" }}>
                                            {calcSvcTime(item.served_at, item.completed_at)}
                                        </td>
                                        <td className="text-slate-600 dark:text-slate-300" style={{ padding: "12px 18px", whiteSpace: "nowrap", fontSize: 12.5 }}>
                                            {(item.completed_by_staff_name || item.served_by_staff_name) ? (
                                                <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                                                    {item.completed_by_staff_name && (
                                                        <span className="text-slate-800 dark:text-slate-200" title="Completed By">C: {item.completed_by_staff_name}</span>
                                                    )}
                                                    {(item.served_by_staff_name && item.served_by_staff_name !== item.completed_by_staff_name) && (
                                                        <span className="text-slate-500 dark:text-slate-400 text-[11px]" title="Served By">S: {item.served_by_staff_name}</span>
                                                    )}
                                                </div>
                                            ) : <span className="text-slate-400 dark:text-slate-500">—</span>}
                                        </td>
                                        {hasServiceLines && (
                                            <td className="text-slate-600 dark:text-slate-300" style={{ padding: "12px 18px", whiteSpace: "nowrap" }}>
                                                {(item as any).assigned_line != null ? (
                                                    <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[12px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20">
                                                        Lane {(item as any).assigned_line}
                                                    </span>
                                                ) : <span className="text-slate-400 dark:text-slate-500">—</span>}
                                            </td>
                                        )}
                                        <td style={{ padding: "12px 18px", whiteSpace: "nowrap" }}>
                                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                                <button
                                                    onClick={() => onViewToken({
                                                        token_number: item.token_number, prefix: item.queue_prefix, customer_name: item.customer_name,
                                                        customer_phone: item.customer_phone, pax_count: item.pax_count,
                                                        status: item.status, created_at: item.created_at, served_at: item.served_at, completed_at: item.completed_at,
                                                        entry_type: isManual ? "manual" : "qr", queue_name: queueName,
                                                        assigned_line: item.assigned_line, served_by_staff_name: item.served_by_staff_name, completed_by_staff_name: item.completed_by_staff_name,
                                                        skipped_at: item.skipped_at, deleted_at: item.deleted_at, recalled_at: item.recalled_at, removed_by: item.removed_by
                                                    })}
                                                    className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 rounded-lg transition-colors"
                                                    title="View Details"
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
                    <div className="bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-white/10 p-3.5 sm:px-5 flex flex-col sm:flex-row gap-2.5 items-center justify-between">
                        <p className="text-xs text-slate-600 dark:text-slate-400" style={{ margin: 0 }}>
                            Showing <strong className="text-slate-900 dark:text-white">{(historyPage - 1) * historyPageSize + 1}</strong>–<strong className="text-slate-900 dark:text-white">{Math.min(historyPage * historyPageSize, historyTotal)}</strong> of <strong className="text-slate-900 dark:text-white">{historyTotal}</strong> customers
                        </p>
                        <div style={{ display: "flex", gap: 4 }}>
                            {[
                                { label: "«", onClick: () => setHistoryPage(1), disabled: historyPage === 1 },
                                { label: "Prev", onClick: () => setHistoryPage(p => Math.max(1, p - 1)), disabled: historyPage === 1 },
                            ].map(btn => (
                                <button key={btn.label} onClick={btn.onClick} disabled={btn.disabled} className="px-2.5 py-1 text-xs font-bold bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-white/10 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">{btn.label}</button>
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