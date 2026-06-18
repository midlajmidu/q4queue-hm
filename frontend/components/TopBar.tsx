"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useNotifications } from "@/context/NotificationContext";
import { createPortal } from "react-dom";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Bell, ChevronRight, Search, Menu, ArrowRight } from "lucide-react";

// Map to Icons object for convenience
const Icons = { Bell, ChevronRight, Search, Menu, ArrowRight };

function NotificationSystem() {
    const [isOpen, setIsOpen] = useState(false);
    const btnRef = useRef<HTMLButtonElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const { user } = useAuth();
    const dashBase = user?.org_slug ? `/${user.org_slug}/dashboard` : "/dashboard";
    const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
    const [dropPos, setDropPos] = useState({ top: 0, right: 0 });

    const notifIcons: Record<string, string> = {
        warning: "⚠️",
        success: "✅",
        info: "ℹ️",
        error: "🚨",
    };

    const toggleOpen = () => {
        if (!isOpen && btnRef.current) {
            const rect = btnRef.current.getBoundingClientRect();
            setDropPos({
                top: rect.bottom + 10,
                right: window.innerWidth - rect.right,
            });
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
            className="fixed z-[99999] w-[320px] bg-white rounded-[16px] shadow-[0_4px_24px_rgba(0,0,0,0.08),0_0_0_1px_rgba(0,0,0,0.05)] overflow-hidden"
            style={{
                top: dropPos.top,
                right: dropPos.right,
            }}
        >
            {/* Header */}
            <div className="px-4 py-3.5 border-b border-gray-200 bg-gray-50/50 flex justify-between items-center">
                <div className="flex items-center gap-2">
                    <span className="font-bold text-[13.5px] text-gray-900 tracking-tight">Notifications</span>
                    {unreadCount > 0 && (
                        <span className="bg-indigo-50 text-indigo-600 text-[10.5px] font-bold px-2 py-0.5 rounded-md tracking-wide">
                            {unreadCount} new
                        </span>
                    )}
                </div>
                {unreadCount > 0 && (
                    <button
                        onClick={markAllAsRead}
                        className="text-indigo-600 hover:bg-indigo-50 text-[11.5px] font-semibold px-2.5 py-1 rounded-md transition-colors"
                    >
                        Mark all read
                    </button>
                )}
            </div>

            {/* Items */}
            <div className="max-h-[340px] overflow-y-auto">
                {notifications.length > 0 ? (
                    notifications.map((n) => (
                        <div
                            key={n.id}
                            className={`flex items-start gap-3 p-3 cursor-pointer transition-colors border-b border-gray-100 last:border-none ${!n.isRead ? "bg-indigo-50/30 hover:bg-indigo-50/50" : "hover:bg-gray-50"}`}
                            onClick={() => markAsRead(n.id)}
                        >
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-sm ${n.type === "warning" ? "bg-amber-50" : n.type === "success" ? "bg-emerald-50" : n.type === "error" ? "bg-red-50" : "bg-blue-50"}`}>
                                {notifIcons[n.type] || "ℹ️"}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className={`m-0 text-[13px] leading-snug tracking-tight ${n.isRead ? "font-medium text-gray-700" : "font-semibold text-gray-900"}`}>
                                    {n.message}
                                </p>
                                <p className="mt-1 text-[11px] font-medium text-gray-500">
                                    {n.time}
                                </p>
                            </div>
                            {!n.isRead && <div className="w-2 h-2 bg-indigo-500 rounded-full shrink-0 mt-1.5 shadow-[0_0_0_3px_rgba(238,242,255,1)]" />}
                        </div>
                    ))
                ) : (
                    <div className="py-12 px-5 text-center text-gray-500">
                        <div className="w-12 h-12 rounded-xl bg-gray-100 inline-flex items-center justify-center mb-3.5">
                            <Icons.Bell size={22} className="text-gray-400" />
                        </div>
                        <p className="m-0 text-[13.5px] font-semibold text-gray-600">All caught up!</p>
                        <p className="mt-1 text-[12px] text-gray-400">No new notifications</p>
                    </div>
                )}
            </div>

            {/* Footer */}
            <div className="p-3 border-t border-gray-200 bg-gray-50/50 text-center">
                <Link
                    href={`${dashBase}/notifications`}
                    onClick={() => setIsOpen(false)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-[12.5px] font-semibold text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
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
                className={`relative p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-900 transition-colors focus:outline-none`}
                onClick={toggleOpen}
                aria-label="Notifications"
            >
                <Icons.Bell size={20} />
                {unreadCount > 0 && (
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full shadow-[0_0_0_2px_#fff]" />
                )}
            </button>
            {typeof document !== "undefined" && createPortal(dropdownContent, document.body)}
        </>
    );
}


function LiveClock() {
    const [time, setTime] = useState<Date | null>(null);

    useEffect(() => {
        setTime(new Date());
        const interval = setInterval(() => setTime(new Date()), 1000);
        return () => clearInterval(interval);
    }, []);

    if (!time) return <div className="hidden md:block w-[140px] h-[32px] animate-pulse bg-gray-100 dark:bg-white/5 rounded-full" />;

    const timeStr = time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const dateStr = time.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });

    return (
        <div className="hidden md:flex items-center gap-2.5 px-3.5 py-1.5 bg-white dark:bg-slate-900 border border-gray-200/80 dark:border-white/10 rounded-full shadow-sm select-none">
            {/* Live Pulsing Dot */}
            <div className="relative flex h-2 w-2 items-center justify-center">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
            </div>
            
            <div className="flex items-center gap-2">
                <span className="text-[12.5px] font-bold text-slate-800 dark:text-slate-100 tracking-tight leading-none">{timeStr}</span>
                <span className="text-[10.5px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest leading-none mt-[1px]">{dateStr}</span>
            </div>
        </div>
    );
}

export function TopBar({ onOpenMobileMenu }: { onOpenMobileMenu?: () => void }) {
    const pathname = usePathname();
    const { user } = useAuth();

    // Simple breadcrumb logic based on pathname segments
    const segments = pathname.split("/").filter(Boolean);
    // Ignore first segment if it's the orgSlug, unless it's the only one
    const breadcrumbSegments = segments.length > 2 ? segments.slice(2) : segments.slice(1);
    
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
                    aria-label="Open menu"
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
                <ThemeToggle />
                <NotificationSystem />

            </div>
        </header>
    );
}
