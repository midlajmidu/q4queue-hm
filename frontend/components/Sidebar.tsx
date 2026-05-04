"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { Logo } from "@/components/ui/Logo";
import ConfirmModal from "@/components/ConfirmModal";

interface SidebarProps {
    isOpen?: boolean;
    onClose?: () => void;
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
    const { user, logout } = useAuth();
    const pathname = usePathname();
    const isAdmin = user?.role === "admin";
    const isSuperAdmin = user?.role === "super_admin" || pathname.startsWith("/super-admin");
    const dashBase = user?.org_slug ? `/${user.org_slug}/dashboard` : "/dashboard";
    const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);

    // Close on mobile when navigating
    useEffect(() => {
        if (onClose && isOpen) onClose();
    }, [pathname]); // eslint-disable-line react-hooks/exhaustive-deps

    const formatRole = (role?: string) => {
        if (!role) return "User";
        return role.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
    };

    const navLinkCls = (href: string) => {
        const isActive = href === dashBase
            ? pathname === dashBase
            : (pathname === href || pathname.startsWith(href + "/"));

        const base = "group flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl text-[13.5px] font-medium transition-all duration-[0.22s] ease-[cubic-bezier(0.4,0,0.2,1)] focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50";
        
        if (isActive) {
            return isSuperAdmin
                ? `${base} bg-slate-800 text-white shadow-sm border border-slate-700/80 [&>svg]:text-indigo-400`
                : `${base} bg-white text-[#0f172a] font-semibold shadow-[0_1px_3px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.02)] border border-slate-200/80 [&>svg]:text-indigo-600`;
        } else {
            return isSuperAdmin
                ? `${base} text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 border border-transparent [&>svg]:text-slate-500 group-hover:[&>svg]:text-slate-300`
                : `${base} text-[#64748b] hover:text-[#0f172a] hover:bg-black/[0.03] border border-transparent [&>svg]:text-slate-400 group-hover:[&>svg]:text-slate-600`;
        }
    };

    return (
        <>
            {/* Mobile Backdrop */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40 lg:hidden"
                    onClick={onClose}
                />
            )}

            <aside className={`fixed inset-y-0 left-0 w-64 border-r z-50 transition-all duration-300 ease-in-out flex flex-col ${isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"} ${isSuperAdmin ? "bg-slate-900 border-slate-800/60" : "bg-[#fafbfe] border-slate-200/60"}`} role="complementary">
                {/* Logo Section */}
                <div className={`h-16 flex items-center px-6 border-b flex-shrink-0 ${isSuperAdmin ? "border-slate-800/60" : "border-slate-200/60"}`}>
                    <Link href={isSuperAdmin ? "/super-admin" : dashBase} className="flex items-center gap-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50 rounded-lg py-1">
                        <Logo size="sm" className={isSuperAdmin ? "text-white" : ""} />
                    </Link>
                </div>

                {/* Navigation Section */}
                <div className="flex-1 overflow-y-auto py-6 px-4 space-y-1">
                    <p className={`px-3.5 text-[10.5px] uppercase font-bold tracking-[0.08em] mb-4 ${isSuperAdmin ? "text-slate-500" : "text-[#94a3b8]"}`}>Main Menu</p>

                    {isSuperAdmin ? (
                        <>
                            <Link href="/super-admin" className={navLinkCls("/super-admin")}>
                                <svg className="w-[18px] h-[18px] transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                </svg>
                                Platform Stats
                            </Link>
                            <Link href="/super-admin/organizations" className={navLinkCls("/super-admin/organizations")}>
                                <svg className="w-[18px] h-[18px] transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                </svg>
                                Organizations
                            </Link>
                        </>
                    ) : (
                        <>
                            <Link href={dashBase} className={navLinkCls(dashBase)}>
                                <svg className="w-[18px] h-[18px] transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                                </svg>
                                Overview
                            </Link>

                            <Link href={`${dashBase}/sessions`} className={navLinkCls(`${dashBase}/sessions`)}>
                                <svg className="w-[18px] h-[18px] transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                                Sessions
                            </Link>

                            <Link href={`${dashBase}/history`} className={navLinkCls(`${dashBase}/history`)}>
                                <svg className="w-[18px] h-[18px] transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                History
                            </Link>

                            <Link href={`${dashBase}/notifications`} className={navLinkCls(`${dashBase}/notifications`)}>
                                <svg className="w-[18px] h-[18px] transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.73 21a2 2 0 0 1-3.46 0" />
                                </svg>
                                Notifications
                            </Link>

                            {isAdmin && (
                                <>
                                    <Link href={`${dashBase}/staff`} className={navLinkCls(`${dashBase}/staff`)}>
                                        <svg className="w-[18px] h-[18px] transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                                        </svg>
                                        Staff
                                    </Link>
                                    <Link href={`${dashBase}/settings`} className={navLinkCls(`${dashBase}/settings`)}>
                                        <svg className="w-[18px] h-[18px] transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                        </svg>
                                        Settings
                                    </Link>
                                    <Link href={`${dashBase}/docs`} className={navLinkCls(`${dashBase}/docs`)}>
                                        <svg className="w-[18px] h-[18px] transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                                        </svg>
                                        Docs
                                    </Link>
                                </>
                            )}
                        </>
                    )}
                </div>

                <div className={`p-4 border-t mt-auto ${isSuperAdmin ? "bg-slate-800/50 border-slate-800" : "bg-gradient-to-t from-black/[0.02] to-transparent border-slate-200/60"}`}>
                    <div className="flex items-center gap-3.5 px-3 mb-5">
                        <div className={`shrink-0 w-9 h-9 rounded-full flex items-center justify-center font-bold text-[13px] shadow-sm border ${isSuperAdmin ? "bg-slate-700 text-white border-slate-600" : "bg-gradient-to-b from-white to-indigo-50/80 text-indigo-600 border-indigo-100/60 ring-1 ring-black/[0.02]"}`}>
                            {(user?.role || "U")[0].toUpperCase()}
                        </div>
                        <div className="flex flex-col min-w-0 justify-center">
                            <span className={`text-[13.5px] font-semibold tracking-tight truncate leading-tight ${isSuperAdmin ? "text-white" : "text-[#0f172a]"}`}>
                                {user?.email || "User Account"}
                            </span>
                            <span className={`text-[10.5px] font-medium tracking-[0.03em] mt-0.5 truncate ${isSuperAdmin ? "text-slate-400" : "text-[#64748b]"}`}>
                                {formatRole(user?.role)} {user?.org_name ? <span className="text-slate-300 mx-1.5">•</span> : ""}{user?.org_name}
                            </span>
                        </div>
                    </div>
                    <button
                        onClick={() => setIsLogoutModalOpen(true)}
                        className={`group w-full flex items-center gap-3.5 px-3.5 py-2.5 text-[13.5px] font-medium rounded-xl transition-all duration-[0.22s] ease-[cubic-bezier(0.4,0,0.2,1)] focus:outline-none focus:ring-2 focus:ring-red-500/50 border border-transparent ${isSuperAdmin ? "text-slate-400 hover:text-white hover:bg-slate-800/50 [&>svg]:text-slate-500 group-hover:[&>svg]:text-slate-300" : "text-[#64748b] hover:text-red-700 hover:bg-red-50/80 hover:border-red-100/50 [&>svg]:text-slate-400 group-hover:[&>svg]:text-red-500"}`}
                    >
                        <svg className="w-[18px] h-[18px] transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                        Sign Out
                    </button>
                </div>
            </aside>
            <ConfirmModal
                isOpen={isLogoutModalOpen}
                title="Confirm Sign Out"
                message="Are you sure you want to sign out?"
                confirmLabel="Sign Out"
                confirmVariant="danger"
                onConfirm={() => {
                    setIsLogoutModalOpen(false);
                    logout();
                }}
                onCancel={() => setIsLogoutModalOpen(false)}
            />
        </>
    );
}
