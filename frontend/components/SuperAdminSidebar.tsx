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

export default function SuperAdminSidebar({ isOpen, onClose, collapsed = false, onToggleCollapse }: SidebarProps) {
    const { user, logout } = useAuth();
    const pathname = usePathname();
    const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
    const c = collapsed; // shorthand

    useEffect(() => {
        if (onClose && isOpen) onClose();
    }, [pathname]); // eslint-disable-line react-hooks/exhaustive-deps

    const formatRole = (role?: string) => {
        if (!role) return "User";
        return role.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
    };

    const isActive = (href: string, exact?: boolean) => {
        if (exact) return pathname === href;
        return pathname === href || pathname.startsWith(href + "/");
    };

    const linkCls = (href: string, exact?: boolean) => {
        const active = isActive(href, exact);
        const isDummy = ["/super-admin/system-monitoring", "/super-admin/billing", "/super-admin/whatsapp"].includes(href);
        const base = `group relative flex items-center text-sm transition-colors duration-150 focus:outline-none ${c ? "justify-center w-10 h-10 mx-auto rounded-lg" : "gap-3 py-2 px-6"}`;
        
        if (active) {
            return `${base} bg-transparent ${isDummy ? "text-slate-400" : "text-white"} font-medium ${c ? "shadow-[inset_3px_0_0_0_rgba(99,102,241,1)]" : "before:absolute before:left-0 before:top-0 before:bottom-0 before:w-[3px] before:bg-indigo-500 before:rounded-r-sm"} [&>svg]:${isDummy ? "text-slate-400" : "text-white"}`;
        }
        return `${base} ${isDummy ? "text-slate-600 hover:text-slate-500" : "text-slate-400 hover:text-slate-300"} font-medium hover:bg-white/5 ${c ? "border border-transparent rounded-lg" : ""} [&>svg]:${isDummy ? "text-slate-600 group-hover:text-slate-500" : "text-slate-400 group-hover:text-slate-300"}`;
    };

    const sectionLabel = (text: string) =>
        c ? <div className="h-4" /> : (
            <p className={`px-6 text-xs uppercase font-semibold tracking-wider mb-2 mt-8 first:mt-2 text-slate-500`}>{text}</p>
        );

    const divider = <div className="h-4" />;

    /* ── Nav item helper ── */
    const NavLink = ({ href, label, icon, badge, exact }: { href: string; label: string; icon: React.ReactNode; badge?: React.ReactNode; exact?: boolean }) => (
        <Tip label={label} show={c}>
            <Link href={href} className={linkCls(href, exact)}>
                {icon}
                {!c && <>{label}{badge}</>}
                {c && badge && (
                    <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[16px] h-4 px-1 rounded-full text-[9px] font-bold bg-red-500 text-white">2</span>
                )}
            </Link>
        </Tip>
    );

    const iconCls = "w-4 h-4 shrink-0 transition-colors";

    return (
        <>
            {isOpen && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40 lg:hidden" onClick={onClose} />
            )}

            <aside
                className={`fixed inset-y-0 left-0 border-r z-50 flex flex-col transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] ${
                    isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
                } bg-slate-900 border-slate-800/60`}
                style={{ width: c ? 72 : 256 }}
                role="complementary"
            >
                {/* ── Header ── */}
                <div className={`h-14 flex items-center flex-shrink-0 border-b ${c ? "justify-center px-0" : "justify-between px-4"} border-slate-800/60`}>
                    {!c && (
                        <Link href={"/super-admin"} className="flex items-center gap-3 focus:outline-none rounded-lg py-1 pl-1">
                            <Logo size={"md"} className={"brightness-0 invert opacity-90 scale-[0.85] origin-left"} />
                        </Link>
                    )}
                    {/* Toggle button */}
                    <button
                        onClick={onToggleCollapse}
                        className={`flex items-center justify-center w-8 h-8 rounded-lg transition-all duration-200 focus:outline-none text-slate-500 hover:text-slate-300 hover:bg-slate-800`}
                        aria-label={c ? "Expand sidebar" : "Collapse sidebar"}
                    >
                        <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                            className={`transition-transform duration-300 ${c ? "rotate-180" : ""}`}>
                            <path d="M11 19V5" /><path d="m5 12 6-6" /><path d="m5 12 6 6" /><path d="M19 5v14" />
                        </svg>
                    </button>
                </div>

                {/* ── Navigation ── */}
                <div className={`flex-1 overflow-y-auto py-4 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] ${c ? "px-2" : "px-0"}`}>
                    <>
                        {sectionLabel("Overview")}
                        <NavLink href="/super-admin" exact label="Platform Stats" icon={
                            <svg className={iconCls} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                        } />
                        <NavLink href="/super-admin/stats" label="Organization Analytics" icon={
                            <svg className={iconCls} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
                        } />

                        {sectionLabel("Monitoring & Logs")}
                        <NavLink href="/super-admin/system-monitoring" label="System Monitoring" icon={
                            <svg className={iconCls} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" /></svg>
                        } />
                        <NavLink href="/super-admin/usage" label="Usage Monitoring" icon={
                            <svg className={iconCls} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                        } />
                        <NavLink href="/super-admin/queues" label="Queue Monitoring" icon={
                            <svg className={iconCls} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                        } />
                        <NavLink href="/super-admin/audit-logs" label="Audit Logs" icon={
                            <svg className={iconCls} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                        } />
                        <NavLink href="/super-admin/organizations" label="All Organizations" icon={
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                        } />
                        <NavLink href="/super-admin/parent-organizations" label="Parent Organizations" icon={
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                        } />
                        <NavLink href="/super-admin/announcements" label="System Announcements" icon={
                            <svg className={iconCls} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                        } />

                        {sectionLabel("Administration")}
                        <NavLink href="/super-admin/users" label="Global Staff" icon={
                            <svg className={iconCls} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                        } />
                        <NavLink href="/super-admin/backups" label="Disaster Recovery" icon={
                            <svg className={iconCls} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m-8 6v4" /></svg>
                        } />
                        <NavLink href="/super-admin/settings" label="Global Settings" icon={
                            <svg className={iconCls} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                        } />
                        <NavLink href="/super-admin/billing" label="Billing Management" icon={
                            <svg className={iconCls} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        } />
                        <NavLink href="/super-admin/whatsapp" label="WhatsApp Config" icon={
                            <svg className={iconCls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M3 21l1.65 -3.8a9 9 0 1 1 3.4 2.9l-5.05 .9" />
                                <path d="M9 10a.5 .5 0 0 0 1 0v-1a.5 .5 0 0 0 -1 0v1a5 5 0 0 0 5 5h1a.5 .5 0 0 0 0 -1h-1a.5 .5 0 0 0 0 1" />
                            </svg>
                        } />
                        <NavLink href="/super-admin/support" label="Support Tools" icon={
                            <svg className={iconCls} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" /></svg>
                        } />
                    </>
                </div>

                {/* ── Profile & Sign Out ── */}
                <div className="mt-auto">
                    <div className={`${c ? "mx-3" : "mx-5"} h-px bg-gradient-to-r from-transparent via-slate-700/60 to-transparent`} />

                    <div className={`p-3 space-y-1.5 ${c ? "flex flex-col items-center" : ""}`}>
                        {/* Profile */}
                        <Tip label={user?.email || "Account"} show={c}>
                            <div 
                                onClick={() => setIsLogoutModalOpen(true)}
                                className={`group flex flex-row items-center justify-between rounded-xl cursor-pointer transition-all duration-300 ${
                                c ? "justify-center w-12 h-12" : "gap-3 px-4 py-2 w-full"
                            } bg-slate-800/20 hover:bg-slate-800/40 border border-slate-700/50`}>
                                <div className="flex items-center gap-3 overflow-hidden">
                                    <div className="relative shrink-0">
                                        <div className={`${c ? "w-10 h-10 rounded-[10px] text-[13px]" : "w-[36px] h-[36px] rounded-[10px] text-[13px]"} flex items-center justify-center font-bold shadow-sm transition-all duration-500 group-hover:scale-105 group-hover:-rotate-2 bg-gradient-to-br from-indigo-500 to-blue-700 text-white ring-1 ring-white/10 overflow-hidden shrink-0`}>
                                            {(user?.email?.[0] || "U").toUpperCase()}
                                        </div>
                                        <div className={`absolute -bottom-0.5 -right-0.5 ${c ? "w-[10px] h-[10px] border-2" : "w-3 h-3 border-2"} rounded-full bg-emerald-400 border-slate-800 group-hover:border-slate-700 transition-colors duration-300`} />
                                    </div>

                                    {!c && (
                                        <div className="flex flex-col min-w-0 flex-1 justify-center">
                                            <span className={`text-xs font-semibold truncate tracking-tight transition-colors duration-300 text-slate-200 group-hover:text-white`}>
                                                {user?.email || "User Account"}
                                            </span>
                                            <span className={`text-[10px] font-medium truncate mt-[2px] text-slate-500`}>
                                                {formatRole(user?.role)}
                                            </span>
                                        </div>
                                    )}
                                </div>
                                {!c && (
                                    <div
                                        className={`shrink-0 p-1.5 rounded-lg transition-colors text-slate-500 group-hover:text-red-400 group-hover:bg-red-500/10`}
                                        title="Sign out"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                                        </svg>
                                    </div>
                                )}
                            </div>
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
