"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname, useParams } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useNotifications } from "@/context/NotificationContext";
import { api } from "@/lib/api";
import type { SystemAnnouncementDetail } from "@/types/api";
import { createPortal } from "react-dom";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Bell, ChevronRight, Search, Menu, ArrowRight } from "lucide-react";
import { useBranchTimezone } from "@/context/BranchTimezoneContext";
import { tzAbbr } from "@/lib/timezones";

// Map to Icons object for convenience
const Icons = { Bell, ChevronRight, Search, Menu, ArrowRight };

function NotificationSystem() {
    const [isOpen, setIsOpen] = useState(false);
    const btnRef = useRef<HTMLButtonElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const { user } = useAuth();
    const pathname = usePathname();
    const params = useParams();
    const orgSlug = params?.orgSlug || user?.org_slug;
    let dashBase = orgSlug ? `/${orgSlug}/dashboard` : "/dashboard";
    if (orgSlug && pathname.startsWith(`/org-admin/${orgSlug}`)) {
        dashBase = `/org-admin/${orgSlug}/dashboard`;
    } else if (orgSlug) {
        const superAdminMatch = pathname.match(new RegExp(`^/super-admin/([^/]+)/${orgSlug}`));
        if (superAdminMatch) {
            dashBase = `/super-admin/${superAdminMatch[1]}/${orgSlug}/dashboard`;
        }
    }
    const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
    const [dropPos, setDropPos] = useState({ top: 0, right: 0 });
    const [activeTab, setActiveTab] = useState<"notifications" | "announcements">("notifications");
    const [announcements, setAnnouncements] = useState<SystemAnnouncementDetail[]>([]);
    const [isLoadingAnnouncements, setIsLoadingAnnouncements] = useState(false);

    const notifIcons: Record<string, string> = {
        warning: "⚠️",
        success: "✅",
        info: "ℹ️",
        error: "🚨",
    };

    const loadAnnouncements = async () => {
        setIsLoadingAnnouncements(true);
        try {
            const sysData = await api.getActiveSystemAnnouncements();
            let orgData: any[] = [];
            try {
                orgData = await api.getActiveOrgAnnouncements();
            } catch (orgErr) {
                console.error("Failed to load org announcements", orgErr);
            }
            
            // Map both to a common format
            const sysMapped = sysData.map(a => ({ ...a, source: 'Global System' }));
            const orgMapped = orgData.map(a => ({ ...a, source: 'Organization' }));
            
            // Combine and sort so Org announcements come first, then sort by date descending
            const combined = [...orgMapped, ...sysMapped].sort((a, b) => {
                if (a.source === 'Organization' && b.source !== 'Organization') return -1;
                if (b.source === 'Organization' && a.source !== 'Organization') return 1;
                return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
            });
            
            setAnnouncements(combined as any);
        } catch (error) {
            console.error("Failed to load announcements", error);
        } finally {
            setIsLoadingAnnouncements(false);
        }
    };

    const toggleOpen = () => {
        if (!isOpen && btnRef.current) {
            const rect = btnRef.current.getBoundingClientRect();
            setDropPos({
                top: rect.bottom + 10,
                right: window.innerWidth - rect.right,
            });
            loadAnnouncements();
        }
        setIsOpen(prev => !prev);
    };

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as Node;
            const clickedInsideBtn = btnRef.current?.contains(target);
            const clickedInsideDrop = dropdownRef.current?.contains(target);
            if (!clickedInsideBtn && !clickedInsideDrop) {
                setIsOpen(false);
            }
        };
        if (isOpen) {
            document.addEventListener("mousedown", handleClickOutside);
        }
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [isOpen]);

    const dropdownContent = isOpen ? (
        <div
            ref={dropdownRef}
            className="fixed z-[99999] w-[320px] bg-white dark:bg-[#0b1121] rounded-[16px] shadow-[0_4px_24px_rgba(0,0,0,0.12),0_0_0_1px_rgba(0,0,0,0.05)] dark:shadow-[0_4px_24px_rgba(0,0,0,0.5),0_0_0_1px_rgba(255,255,255,0.1)] border border-gray-200 dark:border-white/10 overflow-hidden"
            style={{
                top: dropPos.top,
                right: dropPos.right,
            }}
        >
            {/* Header */}
            <div className="px-4 pt-3.5 pb-2 border-b border-gray-200 dark:border-white/10 bg-gray-50/50 dark:bg-slate-900/50">
                <div className="flex justify-between items-center mb-3">
                    <div className="flex items-center gap-2">
                        <span className="font-bold text-[13.5px] text-gray-900 dark:text-white tracking-tight">Updates</span>
                    </div>
                    {activeTab === "notifications" && unreadCount > 0 && (
                        <button
                            onClick={markAllAsRead}
                            className="text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 text-[11.5px] font-semibold px-2.5 py-1 rounded-md transition-colors"
                        >
                            Mark all read
                        </button>
                    )}
                </div>
                {/* Tabs */}
                <div className="flex gap-4">
                    <button 
                        onClick={() => setActiveTab("notifications")}
                        className={`text-[12.5px] font-semibold pb-1.5 border-b-2 transition-colors ${activeTab === "notifications" ? "border-indigo-500 text-indigo-600 dark:text-indigo-400" : "border-transparent text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200"}`}
                    >
                        Alerts
                        {unreadCount > 0 && (
                            <span className="ml-1.5 bg-indigo-100 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-300 text-[10px] px-1.5 py-0.5 rounded-full">{unreadCount}</span>
                        )}
                    </button>
                    <button 
                        onClick={() => setActiveTab("announcements")}
                        className={`text-[12.5px] font-semibold pb-1.5 border-b-2 transition-colors ${activeTab === "announcements" ? "border-indigo-500 text-indigo-600 dark:text-indigo-400" : "border-transparent text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200"}`}
                    >
                        Announcements
                        {announcements.length > 0 && (
                            <span className="ml-1.5 bg-blue-100 dark:bg-blue-950/80 text-blue-600 dark:text-blue-300 text-[10px] px-1.5 py-0.5 rounded-full">{announcements.length}</span>
                        )}
                    </button>
                </div>
            </div>

            {/* Items */}
            <div className="max-h-[340px] overflow-y-auto">
                {activeTab === "notifications" && (
                    notifications.length > 0 ? (
                        notifications.map((n) => (
                            <div
                                key={n.id}
                                className={`flex items-start gap-3 p-3 cursor-pointer transition-colors border-b border-gray-100 dark:border-white/5 last:border-none ${!n.isRead ? "bg-indigo-50/30 dark:bg-indigo-950/20 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/40" : "hover:bg-gray-50 dark:hover:bg-slate-800/40"}`}
                                onClick={() => markAsRead(n.id)}
                            >
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-sm ${n.type === "warning" ? "bg-amber-50 dark:bg-amber-950/50" : n.type === "success" ? "bg-emerald-50 dark:bg-emerald-950/50" : n.type === "error" ? "bg-red-50 dark:bg-red-950/50" : "bg-blue-50 dark:bg-blue-950/50"}`}>
                                    {notifIcons[n.type] || "ℹ️"}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className={`m-0 text-[13px] leading-snug tracking-tight ${n.isRead ? "font-medium text-gray-700 dark:text-slate-300" : "font-semibold text-gray-900 dark:text-white"}`}>
                                        {n.message}
                                    </p>
                                    <p className="mt-1 text-[11px] font-medium text-gray-500 dark:text-slate-400">
                                        {n.time}
                                    </p>
                                </div>
                                {!n.isRead && <div className="w-2 h-2 bg-indigo-500 rounded-full shrink-0 mt-1.5 shadow-[0_0_0_3px_rgba(238,242,255,1)] dark:shadow-[0_0_0_3px_rgba(11,17,33,1)]" />}
                            </div>
                        ))
                    ) : (
                        <div className="py-12 px-5 text-center text-gray-500 dark:text-slate-400">
                            <div className="w-12 h-12 rounded-xl bg-gray-100 dark:bg-slate-800 inline-flex items-center justify-center mb-3.5">
                                <Icons.Bell size={22} className="text-gray-400 dark:text-slate-400" />
                            </div>
                            <p className="m-0 text-[13.5px] font-semibold text-gray-600 dark:text-slate-200">All caught up!</p>
                            <p className="mt-1 text-[12px] text-gray-400 dark:text-slate-400">No new alerts</p>
                        </div>
                    )
                )}

                {activeTab === "announcements" && (
                    isLoadingAnnouncements ? (
                        <div className="py-12 px-5 flex justify-center text-gray-400 dark:text-slate-400">Loading...</div>
                    ) : announcements.length > 0 ? (
                        announcements.map((a) => (
                            <div key={a.id} className="flex items-start gap-3 p-3 border-b border-gray-100 dark:border-white/5 last:border-none hover:bg-gray-50 dark:hover:bg-slate-800/40 transition-colors">
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-sm ${(a as any).type === "warning" ? "bg-amber-50 dark:bg-amber-950/50" : (a as any).type === "success" ? "bg-emerald-50 dark:bg-emerald-950/50" : (a as any).type === "error" ? "bg-red-50 dark:bg-red-950/50" : "bg-blue-50 dark:bg-blue-950/50"}`}>
                                    {notifIcons[(a as any).type] || "📣"}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="m-0 text-[13px] font-semibold leading-snug tracking-tight text-gray-900 dark:text-white">
                                        {(a as any).title ? (a as any).title : (a as any).message}
                                    </p>
                                    {(a as any).title && (
                                        <p className="m-0 text-[12px] text-gray-600 dark:text-slate-300 mt-0.5">
                                            {(a as any).message}
                                        </p>
                                    )}
                                    <p className="mt-1 text-[11px] font-medium text-gray-500 dark:text-slate-400 flex items-center gap-1.5">
                                        <span className={`px-1.5 py-0.5 rounded text-[9px] uppercase tracking-wider ${(a as any).source === 'Organization' ? 'bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'}`}>
                                            {(a as any).source}
                                        </span>
                                        • {new Date(a.created_at).toLocaleDateString()}
                                    </p>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="py-12 px-5 text-center text-gray-500 dark:text-slate-400">
                            <div className="w-12 h-12 rounded-xl bg-gray-100 dark:bg-slate-800 inline-flex items-center justify-center mb-3.5">
                                <span className="text-xl">📣</span>
                            </div>
                            <p className="m-0 text-[13.5px] font-semibold text-gray-600 dark:text-slate-200">No Announcements</p>
                            <p className="mt-1 text-[12px] text-gray-400 dark:text-slate-400">You're all caught up!</p>
                        </div>
                    )
                )}
            </div>

            {/* Footer */}
            <div className="p-3 border-t border-gray-200 dark:border-white/10 bg-gray-50/50 dark:bg-slate-900/50 text-center">
                <Link
                    href={`${dashBase}/notifications`}
                    onClick={() => setIsOpen(false)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-[12.5px] font-semibold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 rounded-lg transition-colors"
                >
                    View All Notifications
                    <Icons.ArrowRight size={14} />
                </Link>
            </div>
        </div>
    ) : null;

    return (
        <>
            <button
                ref={btnRef}
                className={`relative p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-white transition-colors focus:outline-none`}
                onClick={toggleOpen}
                aria-label="Updates"
            >
                <Icons.Bell size={20} />
                {(unreadCount > 0 || announcements.length > 0) && (
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full shadow-[0_0_0_2px_#fff] dark:shadow-[0_0_0_2px_#0b1121]" />
                )}
            </button>
            {typeof document !== "undefined" && createPortal(dropdownContent, document.body)}
        </>
    );
}


function LiveClock() {
    const [time, setTime] = useState<Date | null>(null);
    const tz = useBranchTimezone();

    useEffect(() => {
        setTime(new Date());
        const interval = setInterval(() => setTime(new Date()), 1000);
        return () => clearInterval(interval);
    }, []);

    if (!time) return <div className="hidden md:block w-[150px] h-[32px] animate-pulse bg-slate-100 dark:bg-slate-800/50 rounded-lg" />;

    const timeStr = time.toLocaleTimeString("en-US", { hour: 'numeric', minute: '2-digit', timeZone: tz });
    const dateStr = time.toLocaleDateString("en-US", { month: 'short', day: 'numeric', weekday: 'short', timeZone: tz });
    const abbr = tzAbbr(tz);

    return (
        <div className="hidden md:flex items-center h-8 px-3 rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 transition-colors select-none cursor-default group">
            <div className="flex items-center gap-2.5">
                {/* Premium subtle indicator dot */}
                <div className="relative flex items-center justify-center w-2 h-2">
                    <div className="absolute w-full h-full bg-emerald-400/40 rounded-full animate-ping opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    <div className="w-1.5 h-1.5 bg-emerald-500 dark:bg-emerald-400 rounded-full shadow-[0_0_4px_rgba(16,185,129,0.6)]"></div>
                </div>
                
                <div className="flex items-center gap-1.5 tracking-tight">
                    <span className="text-[13px] font-semibold text-slate-800 dark:text-slate-100">{timeStr} <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold ml-0.5">{abbr}</span></span>
                    <span className="text-[13px] font-medium text-slate-300 dark:text-slate-600">/</span>
                    <span className="text-[13px] font-medium text-slate-500 dark:text-slate-400">{dateStr}</span>
                </div>
            </div>
        </div>
    );
}

export function TopBar({ onOpenMobileMenu }: { onOpenMobileMenu?: () => void }) {
    const pathname = usePathname();
    const { user } = useAuth();

    const isBranchStaffDashboard =
        Boolean(pathname?.includes("/dashboard")) &&
        !pathname?.includes("/super-admin") &&
        !pathname?.includes("/org-admin") &&
        !pathname?.includes("/organization-admin");

    // Simple breadcrumb logic based on pathname segments
    const segments = pathname.split("/").filter(Boolean);
    const dashIndex = segments.indexOf("dashboard");
    let breadcrumbSegments: string[] = [];
    if (dashIndex !== -1) {
        breadcrumbSegments = segments.slice(dashIndex + 1);
    } else {
        breadcrumbSegments = segments.length > 2 ? segments.slice(2) : segments.slice(1);
    }
    
    const formatSegment = (seg: string) => {
        if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(seg)) {
            return "Details";
        }
        return seg;
    };
    
    return (
        <header className="sticky top-0 z-20 w-full h-16 bg-white dark:bg-[#0b1121] border-b border-gray-200 dark:border-white/5 flex items-center justify-between px-4 sm:px-6 lg:px-8">
            {/* Left: Hamburger (Mobile) + Breadcrumbs (Desktop) */}
            <div className="flex items-center gap-3">
                <button
                    onClick={onOpenMobileMenu}
                    className="lg:hidden p-2 -ml-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-white/5 rounded-md focus:outline-none transition-colors"
                    aria-label="Open sidebar"
                >
                    <Icons.Menu size={20} />
                </button>
                <div className="hidden sm:flex items-center gap-2 text-sm font-medium text-gray-500 dark:text-gray-400">
                    <span className="text-gray-900 dark:text-white capitalize">
                        {breadcrumbSegments[0] || "Overview"}
                    </span>
                    {breadcrumbSegments.length > 1 && (
                        <>
                            <Icons.ChevronRight size={14} className="text-gray-400 dark:text-gray-600" />
                            <span className="capitalize">{formatSegment(breadcrumbSegments[1])}</span>
                        </>
                    )}
                </div>
            </div>

            {/* Right: Clock, Theme, Notifs */}
            <div className="flex items-center gap-3 sm:gap-4">
                <LiveClock />
                <div className="w-px h-5 bg-gray-200 dark:bg-white/10 hidden md:block mx-1" />
                {isBranchStaffDashboard && <ThemeToggle />}
                <NotificationSystem />

            </div>
        </header>
    );
}
