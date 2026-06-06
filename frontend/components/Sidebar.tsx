"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { Logo } from "@/components/ui/Logo";
import ConfirmModal from "@/components/ConfirmModal";
import { useNotifications } from "@/context/NotificationContext";

interface SidebarProps {
    isOpen?: boolean;
    onClose?: () => void;
    collapsed?: boolean;
    onToggleCollapse?: () => void;
}

/* ── Tooltip wrapper for collapsed mode ── */
function Tip({ label, show, children }: { label: string; show: boolean; children: React.ReactNode }) {
    if (!show) return <>{children}</>;
    return (
        <div className="relative group/tip">
            {children}
            <div className="pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-3 px-2.5 py-1.5 rounded-lg bg-slate-900 text-white text-[11.5px] font-medium whitespace-nowrap opacity-0 group-hover/tip:opacity-100 transition-opacity duration-150 shadow-lg z-[99]">
                {label}
                <div className="absolute right-full top-1/2 -translate-y-1/2 border-[5px] border-transparent border-r-slate-900" />
            </div>
        </div>
    );
}

export default function Sidebar({ isOpen, onClose, collapsed = false, onToggleCollapse }: SidebarProps) {
    const { user, logout } = useAuth();
    const pathname = usePathname();
    const isAdmin = user?.role === "admin";
    const isSuperAdmin = user?.role === "super_admin" || pathname.startsWith("/super-admin");
    const dashBase = user?.org_slug ? `/${user.org_slug}/dashboard` : "/dashboard";
    const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
    const { unreadCount } = useNotifications();
    const c = collapsed; // shorthand

    useEffect(() => {
        if (onClose && isOpen) onClose();
    }, [pathname]); // eslint-disable-line react-hooks/exhaustive-deps

    const formatRole = (role?: string) => {
        if (!role) return "User";
        return role.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
    };

    const isActive = (href: string) =>
        href === dashBase ? pathname === dashBase : (pathname === href || pathname.startsWith(href + "/"));

    const linkCls = (href: string) => {
        const active = isActive(href);
        const base = `group relative flex items-center rounded-lg text-[13px] font-medium transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50 ${c ? "justify-center w-10 h-10 mx-auto" : "gap-3 px-3 py-2"}`;
        if (active) {
            return isSuperAdmin
                ? `${base} bg-slate-800 text-white shadow-sm border border-slate-700/80 [&>svg]:text-indigo-400`
                : `${base} bg-white text-[#0f172a] font-semibold shadow-[0_1px_2px_rgba(0,0,0,0.04)] border border-slate-200/80 [&>svg]:text-indigo-600`;
        }
        return isSuperAdmin
            ? `${base} text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 border border-transparent [&>svg]:text-slate-500`
            : `${base} text-[#64748b] hover:text-[#0f172a] hover:bg-black/[0.03] border border-transparent [&>svg]:text-slate-400`;
    };

    const sectionLabel = (text: string) =>
        c ? <div className={`mx-auto my-1.5 w-5 h-px ${isSuperAdmin ? "bg-slate-800" : "bg-slate-200"}`} /> : (
            <p className={`px-3 text-[10px] uppercase font-bold tracking-[0.1em] mb-1.5 mt-0.5 ${isSuperAdmin ? "text-slate-600" : "text-slate-400"}`}>{text}</p>
        );

    const divider = <div className={`${c ? "mx-auto w-5" : "mx-3"} my-2 border-t ${isSuperAdmin ? "border-slate-800" : "border-slate-100"}`} />;

    /* ── Nav item helper ── */
    const NavLink = ({ href, label, icon, badge }: { href: string; label: string; icon: React.ReactNode; badge?: React.ReactNode }) => (
        <Tip label={label} show={c}>
            <Link href={href} className={linkCls(href)}>
                {icon}
                {!c && <>{label}{badge}</>}
                {c && badge && (
                    <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[16px] h-4 px-1 rounded-full text-[9px] font-bold bg-red-500 text-white">2</span>
                )}
            </Link>
        </Tip>
    );

    const iconCls = "w-[17px] h-[17px] shrink-0 transition-colors";

    return (
        <>
            {isOpen && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40 lg:hidden" onClick={onClose} />
            )}

            <aside
                className={`fixed inset-y-0 left-0 border-r z-50 flex flex-col transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] ${
                    isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
                } ${isSuperAdmin ? "bg-slate-900 border-slate-800/60" : "bg-[#fafbfe] border-slate-200/60"}`}
                style={{ width: c ? 72 : 256 }}
                role="complementary"
            >
                {/* ── Header ── */}
                <div className={`h-14 flex items-center flex-shrink-0 border-b ${c ? "justify-center px-0" : "justify-between px-4"} ${isSuperAdmin ? "border-slate-800/60" : "border-slate-200/60"}`}>
                    {!c && (
                        <Link href={isSuperAdmin ? "/super-admin" : dashBase} className="flex items-center gap-3 focus:outline-none rounded-lg py-1 pl-1">
                            <Logo size="sm" className={isSuperAdmin ? "text-white" : ""} />
                        </Link>
                    )}
                    {/* Toggle button */}
                    <button
                        onClick={onToggleCollapse}
                        className={`flex items-center justify-center w-8 h-8 rounded-lg transition-all duration-200 focus:outline-none ${
                            isSuperAdmin
                                ? "text-slate-500 hover:text-slate-300 hover:bg-slate-800"
                                : "text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                        }`}
                        aria-label={c ? "Expand sidebar" : "Collapse sidebar"}
                    >
                        <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                            className={`transition-transform duration-300 ${c ? "rotate-180" : ""}`}>
                            <path d="M11 19V5" /><path d="m5 12 6-6" /><path d="m5 12 6 6" /><path d="M19 5v14" />
                        </svg>
                    </button>
                </div>

                {/* ── Navigation ── */}
                <div className={`flex-1 overflow-y-auto py-4 space-y-0.5 ${c ? "px-2" : "px-3"}`}>
                    {isSuperAdmin ? (
                        <>
                            {sectionLabel("Platform")}
                            <NavLink href="/super-admin" label="Platform Stats" icon={
                                <svg className={iconCls} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                            } />
                            <NavLink href="/super-admin/organizations" label="Organizations" icon={
                                <svg className={iconCls} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                            } />
                        </>
                    ) : (
                        <>
                            {sectionLabel("Dashboard")}
                            <NavLink href={dashBase} label="Overview" icon={
                                <svg className={iconCls} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
                            } />
                            <NavLink href={`${dashBase}/insights`} label="Insights" icon={
                                <svg className={iconCls} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                            } />

                            {divider}

                            {sectionLabel("Operations")}
                            <NavLink href={`${dashBase}/sessions`} label="Sessions" icon={
                                <svg className={iconCls} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                            } />
                            <NavLink href={`${dashBase}/history`} label="History" icon={
                                <svg className={iconCls} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            } />
                            <NavLink href={`${dashBase}/notifications`} label="Notifications" icon={
                                <svg className={iconCls} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.73 21a2 2 0 0 1-3.46 0" /></svg>
                            } badge={
                                unreadCount > 0 ? (
                                    <span className="ml-auto flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold bg-red-500 text-white">{unreadCount}</span>
                                ) : undefined
                            } />

                            {isAdmin && (
                                <>
                                    {divider}
                                    {sectionLabel("Management")}
                                    <NavLink href={`${dashBase}/staff`} label="Staff" icon={
                                        <svg className={iconCls} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                    } />
                                    <NavLink href={`${dashBase}/settings`} label="Settings" icon={
                                        <svg className={iconCls} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                    } />
                                    {divider}
                                    {sectionLabel("Resources")}
                                    <NavLink href={`${dashBase}/docs`} label="Documentation" icon={
                                        <svg className={iconCls} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
                                    } />
                                </>
                            )}
                        </>
                    )}
                </div>

                {/* ── Profile & Sign Out ── */}
                <div className="mt-auto">
                    <div className={`${c ? "mx-3" : "mx-5"} h-px ${isSuperAdmin ? "bg-gradient-to-r from-transparent via-slate-700/60 to-transparent" : "bg-gradient-to-r from-transparent via-slate-200/80 to-transparent"}`} />

                    <div className={`p-3 space-y-1.5 ${c ? "flex flex-col items-center" : ""}`}>
                        {/* Profile */}
                        <Tip label={user?.email || "Account"} show={c}>
                            <div className={`group flex items-center rounded-[10px] cursor-default transition-all duration-200 ${c ? "justify-center w-10 h-10" : "gap-3 px-3 py-[10px] w-full"} ${
                                isSuperAdmin ? "hover:bg-slate-800/70" : "hover:bg-white hover:shadow-[0_0_0_1px_rgba(0,0,0,0.04),0_2px_6px_rgba(0,0,0,0.04)]"
                            }`}>
                                <div className="relative shrink-0">
                                    <div className={`${c ? "w-8 h-8 rounded-lg text-[11px]" : "w-[34px] h-[34px] rounded-[9px] text-[12.5px]"} flex items-center justify-center font-bold shadow-sm transition-all duration-200 group-hover:shadow-md ${
                                        isSuperAdmin
                                            ? "bg-gradient-to-br from-[#2563eb] via-[#4f46e5] to-[#043579] text-white ring-1 ring-white/10"
                                            : "bg-gradient-to-br from-[#2563eb] via-[#4f46e5] to-[#043579] text-white ring-1 ring-black/5"
                                    }`}>
                                        {(user?.email?.[0] || "U").toUpperCase()}
                                    </div>
                                    <div className={`absolute -bottom-[3px] -right-[3px] ${c ? "w-[9px] h-[9px] border-2" : "w-[11px] h-[11px] border-[2.5px]"} rounded-full bg-emerald-400 ${
                                        isSuperAdmin ? "border-slate-900" : "border-[#fafbfe]"
                                    }`} />
                                </div>
                                {!c && (
                                    <>
                                        <div className="flex flex-col min-w-0 flex-1">
                                            <span className={`text-[13px] font-semibold truncate leading-none tracking-[-0.01em] ${isSuperAdmin ? "text-slate-100" : "text-slate-800"}`}>
                                                {user?.email || "User Account"}
                                            </span>
                                            <span className={`text-[10.5px] font-medium truncate leading-none mt-[5px] ${isSuperAdmin ? "text-slate-500" : "text-slate-400"}`}>
                                                {formatRole(user?.role)}{user?.org_name ? <><span className="mx-1 opacity-40">·</span>{user.org_name}</> : ""}
                                            </span>
                                        </div>
                                        <div className={`shrink-0 w-6 h-6 rounded-md flex items-center justify-center transition-all duration-200 ${
                                            isSuperAdmin ? "text-slate-600 group-hover:text-slate-400 group-hover:bg-slate-700/50" : "text-slate-300 group-hover:text-slate-500 group-hover:bg-slate-100"
                                        }`}>
                                            <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/>
                                            </svg>
                                        </div>
                                    </>
                                )}
                            </div>
                        </Tip>

                        {/* Sign out */}
                        <Tip label="Sign out" show={c}>
                            <button
                                onClick={() => setIsLogoutModalOpen(true)}
                                className={`group flex items-center rounded-[10px] transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500/30 ${c ? "justify-center w-10 h-10" : "w-full gap-2.5 px-3 py-[9px] text-[12.5px] font-medium"} ${
                                    isSuperAdmin ? "text-slate-500 hover:text-red-400 hover:bg-red-500/10" : "text-slate-400 hover:text-red-600 hover:bg-red-50/80"
                                }`}
                            >
                                <svg className={`${c ? "w-[17px] h-[17px]" : "w-[15px] h-[15px]"} transition-colors duration-200 ${
                                    isSuperAdmin ? "group-hover:text-red-400" : "group-hover:text-red-500"
                                }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.75" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                                </svg>
                                {!c && "Sign out"}
                            </button>
                        </Tip>
                    </div>
                </div>
            </aside>
            <ConfirmModal
                isOpen={isLogoutModalOpen}
                title="Confirm Sign Out"
                message="Are you sure you want to sign out?"
                confirmLabel="Sign Out"
                confirmVariant="danger"
                onConfirm={() => { setIsLogoutModalOpen(false); logout(); }}
                onCancel={() => setIsLogoutModalOpen(false)}
            />
        </>
    );
}
