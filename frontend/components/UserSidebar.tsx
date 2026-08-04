"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useParams } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { Logo } from "@/components/ui/Logo";
import ConfirmModal from "@/components/ConfirmModal";
import { useNotifications } from "@/context/NotificationContext";
import { api } from "@/lib/api";

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

export default function UserSidebar({ isOpen, onClose, collapsed = false, onToggleCollapse }: SidebarProps) {
    const { user, logout, impersonatorUser, isImpersonating } = useAuth();
    const displayUser = isImpersonating && impersonatorUser ? impersonatorUser : user;
    const pathname = usePathname();
    const params = useParams();
    const orgSlug = (params?.branchSlug as string) || (params?.orgSlug as string) || user?.org_slug;
    let dashBase = orgSlug ? `/${orgSlug}/dashboard` : "/dashboard";
    if (orgSlug && pathname.startsWith(`/organization-admin/${orgSlug}`)) {
        // Org-admin read-only branch view — keep links under /organization-admin/{slug}/dashboard
        dashBase = `/organization-admin/${orgSlug}/dashboard`;
    } else if (orgSlug && pathname.startsWith(`/org-admin/${orgSlug}`)) {
        dashBase = `/org-admin/${orgSlug}/dashboard`;
    } else if (orgSlug) {
        const superAdminMatch = pathname.match(new RegExp(`^/super-admin/([^/]+)/${orgSlug}`));
        if (superAdminMatch) {
            dashBase = `/super-admin/${superAdminMatch[1]}/${orgSlug}/dashboard`;
        }
    }
    const isAdmin = user?.role === "admin";
    const isGlobalOrOrgAdmin = user?.role === "super_admin" || user?.role === "organization_admin" || isImpersonating;
    const isOrgAdminUser = user?.role === "organization_admin";
    const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
    const [supportContact, setSupportContact] = useState<{support_email: string, support_phone: string} | null>(null);
    const { unreadCount } = useNotifications();
    const c = collapsed; // shorthand

    useEffect(() => {
        api.getSupportContact().then(setSupportContact).catch(() => {});
    }, []);

    const isParentDashboard = pathname.startsWith('/organization-admin') || pathname.startsWith('/org-admin') || user?.role === "super_admin";
    const displaySupportEmail = isParentDashboard ? "contact@q4queue.com" : (supportContact?.support_email || "contact@q4queue.com");

    useEffect(() => {
        if (onClose && isOpen) onClose();
    }, [pathname]); // eslint-disable-line react-hooks/exhaustive-deps

    const formatRole = (role?: string) => {
        if (!role) return "User";
        return role.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
    };

    const isActive = (href: string, exact?: boolean) => {
        if (exact) return pathname === href;
        return href === dashBase ? pathname === dashBase : (pathname === href || pathname.startsWith(href + "/"));
    };

    const linkCls = (href: string, exact?: boolean) => {
        const active = isActive(href, exact);
        const base = `group relative flex items-center text-sm transition-colors duration-150 focus:outline-none ${c ? "justify-center w-10 h-10 mx-auto rounded-lg my-1" : "gap-3 py-2 px-3 mx-3 my-0.5 rounded-lg"}`;
        
        if (active) {
            return `${base} bg-indigo-50/70 dark:bg-white/5 text-indigo-600 dark:text-white font-medium ${c ? "border-transparent shadow-[inset_3px_0_0_0_rgba(79,70,229,1)] dark:shadow-[inset_3px_0_0_0_rgba(255,255,255,0.1)]" : "border border-transparent"} [&>svg]:text-indigo-600 dark:[&>svg]:text-white`;
        }
        return `${base} text-slate-600 dark:text-slate-400 font-medium hover:bg-slate-50 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-slate-200 ${c ? "border border-transparent" : "border border-transparent"} [&>svg]:text-slate-600 dark:[&>svg]:text-slate-400 hover:[&>svg]:text-slate-900 dark:hover:[&>svg]:text-slate-200`;
    };

    const sectionLabel = (text: string) =>
        c ? <div className="h-4" /> : (
            <p className={`px-6 text-xs uppercase font-semibold tracking-wider mb-2 mt-6 first:mt-2 text-slate-400`}>{text}</p>
        );

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

    /* ── Shared nav content (used in both mobile and desktop panels) ── */
    const NavContent = () => (
        <div className={`flex-1 overflow-y-auto py-4 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] ${c ? "px-2" : "px-0"}`}>
            <>
                {sectionLabel("Dashboard")}
                <NavLink href={dashBase} label="Overview" icon={
                    <svg className={iconCls} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
                } />

                {sectionLabel("Operations")}
                <NavLink href={`${dashBase}/queues`} label="Queues" icon={
                    <svg className={iconCls} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h7" /></svg>
                } />

                {!isGlobalOrOrgAdmin && (
                    <>
                        <NavLink href={`${dashBase}/notifications`} label="Notifications" icon={
                            <svg className={iconCls} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.73 21a2 2 0 0 1-3.46 0" /></svg>
                        } badge={
                            unreadCount > 0 ? (
                                <span className="ml-auto flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold bg-red-500 text-white">{unreadCount}</span>
                            ) : undefined
                        } />
                        <NavLink href={`${dashBase}/whatsapp`} label="WhatsApp & Call" icon={
                            <svg className={iconCls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M3 21l1.65 -3.8a9 9 0 1 1 3.4 2.9l-5.05 .9" />
                                <path d="M9 10a.5 .5 0 0 0 1 0v-1a.5 .5 0 0 0 -1 0v1a5 5 0 0 0 5 5h1a.5 .5 0 0 0 0 -1h-1a.5 .5 0 0 0 0 1" />
                            </svg>
                        } />
                    </>
                )}

                {sectionLabel("Analytics & Reports")}
                <NavLink href={`${dashBase}/insights`} label="Insights" icon={
                    <svg className={iconCls} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                } />
                <NavLink href={`${dashBase}/history`} label="Customers" icon={
                    <svg className={iconCls} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                } />

                {sectionLabel("Management")}
                {(isAdmin || isGlobalOrOrgAdmin) && (
                    <>
                        <NavLink href={`${dashBase}/staff`} label="Staff" icon={
                            <svg className={iconCls} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                        } />
                        <NavLink href={`${dashBase}/tokens`} label="Tokens" icon={
                            <svg className={iconCls} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" /></svg>
                        } />
                        <NavLink href={`${dashBase}/trash`} label="Trash" icon={
                            <svg className={iconCls} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        } />
                    </>
                )}
                {!isGlobalOrOrgAdmin && (
                    <NavLink href={`${dashBase}/settings`} label="Settings" icon={
                        <svg className={iconCls} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                    } />
                )}

                <div className={`mt-6 ${c ? 'mx-2' : 'mx-6'} p-3 rounded-xl bg-white dark:bg-transparent border border-slate-100 dark:border-white/10 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.05)]`}>
                    {!c && <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Need Help?</p>}
                    <a href={`mailto:${displaySupportEmail}`} className={`flex items-center ${c ? 'justify-center' : 'gap-2 mb-2'} text-sm text-slate-500 dark:text-slate-400 hover:text-indigo-600 transition-colors`} title={displaySupportEmail}>
                        <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                        {!c && <span className="truncate">{displaySupportEmail}</span>}
                    </a>
                </div>
            </>
        </div>
    );

    return (
        <>
            {/* ── Mobile Overlay ── */}
            {isOpen && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40 lg:hidden" onClick={onClose} />
            )}

            {/* ══════════════════════════════════════════════
                LOGO RAIL — Desktop Only
                Always fixed at top-left, always 256px wide.
                Never collapses. Never hides.
            ══════════════════════════════════════════════ */}
            <div
                className="hidden lg:flex fixed top-0 left-0 z-[70] items-center justify-between flex-shrink-0 bg-white dark:bg-[#0b1121] border-b border-r border-gray-200 dark:border-white/5"
                style={{ width: 256, height: 64 }}
            >
                <Link
                    href={dashBase}
                    className="flex items-center gap-3 py-2 px-4 focus:outline-none rounded-lg"
                >
                    <Logo size="sm" className="" />
                </Link>

                {/* Desktop Collapse Toggle — sits on the right edge of the logo rail */}
                <button
                    onClick={onToggleCollapse}
                    className="absolute -right-3 top-1/2 -translate-y-1/2 z-[80] flex items-center justify-center w-6 h-6 bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-full shadow-sm transition-all duration-200 focus:outline-none text-slate-400 hover:text-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 dark:hover:text-slate-300"
                    aria-label={c ? "Expand sidebar" : "Collapse sidebar"}
                >
                    <svg
                        width={14} height={14}
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className={`transition-transform duration-300 ${c ? "rotate-180" : ""}`}
                    >
                        <path d="m15 18-6-6 6-6"/>
                    </svg>
                </button>
            </div>

            {/* ══════════════════════════════════════════════
                NAV PANEL
                • Desktop: starts at top-16 (below logo rail),
                  collapses 256px ↔ 72px independently.
                • Mobile: full-height drawer, shows logo inside.
            ══════════════════════════════════════════════ */}
            <aside
                className={`fixed left-0 bottom-0 z-[50] flex flex-col
                    transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]
                    bg-white dark:bg-transparent
                    border-r border-slate-200/80 dark:border-white/5
                    top-0 lg:top-16
                    ${isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
                `}
                style={{ width: c ? 72 : 256 }}
                role="complementary"
            >
                {/* ── Mobile Header (logo + close button) — hidden on desktop ── */}
                <div className="lg:hidden h-16 flex items-center justify-between flex-shrink-0 border-b border-gray-200 dark:border-white/5 px-4">
                    <Link href={dashBase} className="flex items-center gap-3 focus:outline-none rounded-lg">
                        <Logo size="sm" className="" />
                    </Link>
                    <button
                        onClick={onClose}
                        className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-white/5 rounded-lg transition-colors focus:outline-none"
                        aria-label="Close sidebar"
                    >
                        <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M18 6 6 18" /><path d="m6 6 12 12" />
                        </svg>
                    </button>
                </div>

                {/* ── Nav Links ── */}
                <NavContent />

                {/* ── Profile & Sign Out ── */}
                <div className="mt-auto">
                    <div className={`${c ? "mx-3" : "mx-5"} h-px bg-gradient-to-r from-transparent via-slate-200/80 dark:via-slate-700/60 to-transparent`} />

                    <div className={`p-3 space-y-1.5 ${c ? "flex flex-col items-center" : ""}`}>
                        {/* Profile */}
                        <Tip label={displayUser?.email || "Account"} show={c}>
                            <div
                                onClick={() => setIsLogoutModalOpen(true)}
                                className={`group flex flex-row items-center justify-between rounded-xl cursor-pointer transition-all duration-300 ${
                                    c ? "justify-center w-12 h-12" : "gap-3 px-4 py-2 w-full"
                                } bg-slate-50 dark:bg-slate-800/40 hover:bg-slate-100 dark:hover:bg-slate-800/60 border border-slate-200/60 dark:border-white/10`}
                            >
                                <div className="flex items-center gap-3 overflow-hidden">
                                    <div className="relative shrink-0">
                                        <div className={`${c ? "w-10 h-10 rounded-[10px] text-[13px]" : "w-[36px] h-[36px] rounded-[10px] text-[13px]"} flex items-center justify-center font-bold shadow-sm transition-all duration-500 group-hover:scale-105 group-hover:-rotate-2 ${
                                            displayUser?.org_logo_url
                                                ? "bg-white dark:bg-slate-800 ring-1 ring-black/5 dark:ring-white/10"
                                                : "bg-gradient-to-br from-indigo-500 to-blue-700 text-white ring-1 ring-black/5 group-hover:shadow-indigo-500/20"
                                        } overflow-hidden shrink-0`}>
                                            {displayUser?.org_logo_url ? (
                                                <img
                                                    src={displayUser.org_logo_url.startsWith('http') ? displayUser.org_logo_url : `${(process.env.NEXT_PUBLIC_API_URL || 'https://amoebaq.com/api/v1').replace('/api/v1', '')}${displayUser.org_logo_url}`}
                                                    alt="Org Logo"
                                                    className="w-full h-full object-contain p-1"
                                                />
                                            ) : (
                                                (displayUser?.first_name && displayUser?.last_name)
                                                    ? `${displayUser.first_name[0]}${displayUser.last_name[0]}`.toUpperCase()
                                                    : (displayUser?.first_name ? displayUser.first_name[0].toUpperCase() : (displayUser?.email?.[0] || "U").toUpperCase())
                                            )}
                                        </div>
                                        <div className={`absolute -bottom-0.5 -right-0.5 ${c ? "w-[10px] h-[10px] border-2" : "w-3 h-3 border-2"} rounded-full bg-emerald-400 border-[#f4f5f8] dark:border-slate-900 group-hover:border-white dark:group-hover:border-slate-800 transition-colors duration-300`} />
                                    </div>

                                    {!c && (
                                        <div className="flex flex-col min-w-0 flex-1 justify-center">
                                            <span className={`text-xs font-semibold truncate tracking-tight transition-colors duration-300 text-gray-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400`}>
                                                {displayUser?.email || "User Account"}
                                            </span>
                                            <span className={`text-[10px] font-medium truncate mt-[2px] text-gray-500 dark:text-gray-400`}>
                                                {formatRole(displayUser?.role)}{displayUser?.org_name ? <><span className="mx-1.5 opacity-30">|</span>{displayUser.org_name}</> : ""}
                                            </span>
                                        </div>
                                    )}
                                </div>
                                {!c && (
                                    <div
                                        className="shrink-0 p-1.5 rounded-lg transition-colors text-slate-400 dark:text-slate-500 group-hover:text-rose-600 dark:group-hover:text-rose-400 group-hover:bg-rose-50 dark:group-hover:bg-rose-950/60"
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
