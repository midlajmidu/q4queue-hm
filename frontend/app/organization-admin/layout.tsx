"use client";

import { useState, useRef, useEffect, ReactNode } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useAuth } from "@/hooks/useAuth";
import { NotificationProvider } from "@/context/NotificationContext";
import { BranchFilterProvider } from "@/context/BranchFilterContext";
import { 
    Building2, LogOut, LayoutDashboard, Users, UserCog, 
    Settings, Megaphone, Download, Database, Search, 
    Bell, ChevronRight, Activity, LineChart, MessageCircle, ChevronUp
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/ui/Logo";
import { useHeartbeat } from "@/hooks/useHeartbeat";

export default function OrgAdminLayout({ children }: { children: ReactNode }) {
    const { user, logout } = useAuth();
    useHeartbeat();
    const pathname = usePathname();
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
    const [isNotificationOpen, setIsNotificationOpen] = useState(false);
    const profileRef = useRef<HTMLDivElement>(null);
    const notifRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
                setIsProfileMenuOpen(false);
            }
            if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
                setIsNotificationOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const NavLink = ({ href, icon: Icon, label, badge, badgeColor = "indigo" }: { href: string, icon: any, label: string, badge?: ReactNode | string | number, badgeColor?: "indigo" | "emerald" | "rose" | "amber" | "slate" }) => {
        const isActive = pathname === href || (href !== "/organization-admin" && pathname.startsWith(href));
        
        const badgeColors = {
            indigo: "bg-indigo-100 text-indigo-700 border-indigo-200",
            emerald: "bg-emerald-100 text-emerald-700 border-emerald-200",
            rose: "bg-rose-100 text-rose-700 border-rose-200",
            amber: "bg-amber-100 text-amber-700 border-amber-200",
            slate: "bg-slate-100 text-slate-700 border-slate-200"
        };
        
        return (
            <Link 
                href={href}
                title={isSidebarCollapsed ? label : undefined}
                className={`group relative flex items-center ${isSidebarCollapsed ? 'justify-center px-0' : 'justify-between px-3'} py-2 rounded-lg text-[13px] font-medium transition-all duration-150 border ${
                    isActive 
                    ? "bg-indigo-50/80 text-indigo-700 border-indigo-100/60 shadow-sm" 
                    : "border-transparent text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`}
            >
                {isActive && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-indigo-600 rounded-r-md" />
                )}
                <div className={`flex items-center gap-3 ${isSidebarCollapsed ? 'justify-center w-full' : ''}`}>
                    <Icon size={18} strokeWidth={isActive ? 2.5 : 2} className={`transition-colors duration-150 shrink-0 ${isActive ? "text-indigo-700" : "text-slate-400 group-hover:text-slate-600"}`} />
                    {!isSidebarCollapsed && <span className="tracking-tight whitespace-nowrap overflow-hidden">{label}</span>}
                </div>
                {badge && (
                    <div className={`${isSidebarCollapsed ? 'absolute top-1 right-1' : 'ml-auto flex items-center'}`}>
                        {isSidebarCollapsed ? (
                            <div className={`w-2 h-2 rounded-full ${badgeColor === 'emerald' ? 'bg-emerald-500' : badgeColor === 'rose' ? 'bg-rose-500' : 'bg-indigo-500'} shadow-sm`}></div>
                        ) : typeof badge === 'string' || typeof badge === 'number' ? (
                            <div className={`flex items-center justify-center min-w-[20px] h-5 px-1.5 text-[10px] font-bold rounded-full border ${badgeColors[badgeColor]} transition-transform duration-200 group-hover:scale-105 shadow-sm`}>
                                {badge}
                            </div>
                        ) : (
                            badge
                        )}
                    </div>
                )}
            </Link>
        );
    };

    const getPageTitle = (path: string) => {
        if (path === "/organization-admin") return "Command Center";
        if (path.startsWith("/organization-admin/branches")) return "Branches";
        if (path.startsWith("/organization-admin/analytics")) return "Analytics";
        if (path.startsWith("/organization-admin/monitoring/sessions")) return "Live Sessions";
        if (path.startsWith("/organization-admin/monitoring/queues")) return "Active Queues";
        if (path.startsWith("/organization-admin/monitoring/staff")) return "Staff Presence";
        if (path.startsWith("/organization-admin/monitoring/audit")) return "Audit Logs";
        if (path.startsWith("/organization-admin/announcements")) return "Announcements";
        if (path.startsWith("/organization-admin/exports")) return "Data Exports";
        if (path.startsWith("/organization-admin/settings")) return "Settings";
        return "Command Center";
    };

    if (pathname === "/organization-admin/change-password") {
        return (
            <ProtectedRoute>
                <div className="flex min-h-screen bg-slate-50 font-sans w-full items-center justify-center">
                    {children}
                </div>
            </ProtectedRoute>
        );
    }

    return (
        <ProtectedRoute>
            <BranchFilterProvider>
            <NotificationProvider>
                <div className="flex h-screen overflow-hidden bg-slate-50 font-sans">
                    
                    {/* Enterprise Sidebar */}
                    <aside className={`bg-white border-r border-slate-200 flex flex-col hidden md:flex h-full shrink-0 relative z-20 transition-all duration-300 ${isSidebarCollapsed ? 'w-[72px]' : 'w-[260px]'}`}>
                        <button 
                            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                            className="absolute -right-3 top-7 bg-white border border-slate-200 text-slate-400 hover:text-slate-600 rounded-full p-1 shadow-sm z-50 hover:bg-slate-50 transition-colors"
                        >
                            <ChevronRight size={14} className={`transition-transform duration-300 ${isSidebarCollapsed ? "" : "rotate-180"}`} />
                        </button>
                        
                        {/* Logo */}
                        <div className="h-16 flex items-center justify-center px-4 shrink-0 border-b border-slate-100 overflow-hidden">
                            <Link href="/organization-admin" className="focus:outline-none transition-opacity hover:opacity-80 flex items-center justify-center">
                                {isSidebarCollapsed ? (
                                    <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold text-lg">Q</div>
                                ) : (
                                    <Logo size="sm" />
                                )}
                            </Link>
                        </div>

                        {/* Navigation */}
                        <div className="flex-1 overflow-y-auto py-5 px-3 flex flex-col gap-8 scrollbar-thin">
                            
                            {/* Core */}
                            <div>
                                <h3 className={`px-3 text-[11px] font-semibold tracking-wider text-slate-400 uppercase mb-2 transition-all duration-200 ${isSidebarCollapsed ? 'opacity-0 h-0 overflow-hidden m-0' : ''}`}>Overview</h3>
                                <div className="space-y-1">
                                    <NavLink href="/organization-admin" icon={LayoutDashboard} label="Command Center" />
                                    <NavLink href="/organization-admin/branches" icon={Building2} label="Branches" />
                                    <NavLink href="/organization-admin/analytics" icon={LineChart} label="Analytics" />
                                </div>
                            </div>

                            {/* Live Operations */}
                            <div>
                                <h3 className={`px-3 text-[11px] font-semibold tracking-wider text-slate-400 uppercase mb-2 transition-all duration-200 ${isSidebarCollapsed ? 'opacity-0 h-0 overflow-hidden m-0' : ''}`}>Live Operations</h3>
                                <div className="space-y-1">
                                    <NavLink href="/organization-admin/monitoring/sessions" icon={Users} label="Live Sessions" />
                                    <NavLink href="/organization-admin/monitoring/queues" icon={Activity} label="Active Queues" />
                                    <NavLink href="/organization-admin/monitoring/staff" icon={UserCog} label="Staff Presence" />
                                </div>
                            </div>

                            {/* Administration */}
                            <div>
                                <h3 className={`px-3 text-[11px] font-semibold tracking-wider text-slate-400 uppercase mb-2 transition-all duration-200 ${isSidebarCollapsed ? 'opacity-0 h-0 overflow-hidden m-0' : ''}`}>Administration</h3>
                                <div className="space-y-1">
                                    <NavLink href="/organization-admin/monitoring/audit" icon={Database} label="Audit Logs" />
                                    <NavLink href="/organization-admin/announcements" icon={Megaphone} label="Announcements" />
                                    <NavLink href="/organization-admin/exports" icon={Download} label="Data Exports" />
                                    <NavLink href="/organization-admin/settings" icon={Settings} label="Organization Settings" />
                                </div>
                            </div>
                            
                            {/* Help Section */}
                            <div className={`mt-auto mb-2 ${isSidebarCollapsed ? 'mx-2' : 'mx-4'} p-3 rounded-xl bg-slate-50 border border-slate-100/50 shadow-sm`}>
                                {!isSidebarCollapsed && <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Need Help?</p>}
                                <a href={`mailto:contact@q4queue.com`} className={`flex items-center ${isSidebarCollapsed ? 'justify-center' : 'gap-2 mb-1'} text-[13px] font-medium text-slate-500 hover:text-indigo-600 transition-colors`} title={"contact@q4queue.com"}>
                                    <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                                    {!isSidebarCollapsed && <span className="truncate">contact@q4queue.com</span>}
                                </a>
                            </div>

                        </div>

                        {/* Profile & Logout in Sidebar */}
                        <div className="p-4 border-t border-slate-100 shrink-0 bg-white relative" ref={profileRef}>
                            
                            {/* Popover Menu */}
                            {isProfileMenuOpen && (
                                <div className="absolute bottom-full left-4 right-4 mb-2 bg-white border border-slate-200 rounded-xl shadow-lg p-1.5 animate-in fade-in slide-in-from-bottom-2 duration-200 z-50">
                                    <div className="px-2.5 py-2 border-b border-slate-100 mb-1.5">
                                        <p className="text-[10px] font-bold tracking-widest text-slate-400/80 uppercase">Current Role</p>
                                        <p className="text-xs font-semibold text-slate-700 mt-0.5">Organization Admin</p>
                                    </div>
                                    <button
                                        onClick={() => { setIsProfileMenuOpen(false); logout(); }}
                                        className="flex items-center gap-2.5 px-2.5 py-2 rounded-md text-[13px] font-medium text-slate-600 hover:bg-rose-50 hover:text-rose-700 transition-colors w-full text-left group"
                                    >
                                        <LogOut size={15} className="text-slate-400 group-hover:text-rose-500 transition-colors" />
                                        Sign Out
                                    </button>
                                </div>
                            )}

                            {/* Profile Trigger */}
                            <div 
                                onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                                className={`w-full flex items-center ${isSidebarCollapsed ? 'justify-center p-2' : 'justify-between p-2'} rounded-xl transition-all cursor-pointer select-none group ${
                                    isProfileMenuOpen 
                                    ? 'bg-slate-50 shadow-[inset_0_1px_0_rgba(255,255,255,1)] ring-1 ring-slate-200/60' 
                                    : 'bg-transparent hover:bg-slate-50'
                                }`}
                                title={isSidebarCollapsed ? "Profile & Settings" : undefined}
                            >
                                <div className={`flex items-center gap-3 min-w-0 ${isSidebarCollapsed ? '' : 'pr-2'}`}>
                                    <div className="w-9 h-9 shrink-0 rounded-full bg-gradient-to-tr from-indigo-600 to-indigo-500 flex items-center justify-center text-white font-bold shadow-sm ring-2 ring-white relative">
                                        {user?.first_name?.charAt(0)?.toUpperCase() || 'U'}
                                        <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full"></div>
                                    </div>
                                    {!isSidebarCollapsed && (
                                        <div className="flex-1 min-w-0 overflow-hidden">
                                            <div className="text-[13px] font-semibold text-slate-900 truncate w-full group-hover:text-indigo-700 transition-colors">
                                                {user?.first_name} {user?.last_name}
                                            </div>
                                            <div className="text-[11px] text-slate-500 truncate font-medium w-full">
                                                {user?.email}
                                            </div>
                                        </div>
                                    )}
                                </div>
                                {!isSidebarCollapsed && (
                                    <div className={`shrink-0 flex items-center justify-center w-6 h-6 rounded-md transition-colors ${
                                        isProfileMenuOpen 
                                        ? 'bg-slate-200 text-slate-700' 
                                        : 'text-slate-400 group-hover:bg-slate-200 group-hover:text-slate-600'
                                    }`}>
                                        <ChevronUp size={14} className={`transition-transform duration-200 ${isProfileMenuOpen ? "rotate-180" : ""}`} />
                                    </div>
                                )}
                            </div>
                        </div>
                    </aside>

                    {/* Main Content Area */}
                    <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden bg-slate-50">
                        
                        {/* Enterprise Header */}
                        <header className="h-16 flex items-center justify-between px-4 sm:px-6 lg:px-8 bg-slate-50 border-b border-slate-200 shrink-0">
                            
                            {/* Breadcrumbs & Mobile Logo */}
                            <div className="flex items-center gap-4">
                                <div className="flex items-center gap-2 md:hidden">
                                    <Link href="/organization-admin" className="focus:outline-none">
                                        <Logo size="sm" />
                                    </Link>
                                </div>
                                <div className="hidden md:flex items-center gap-2 text-sm text-slate-500 font-medium">
                                    <span className="text-slate-900 font-semibold">{user?.org_name || "Organization"}</span>
                                    <ChevronRight size={14} className="text-slate-400" />
                                    <span className="text-slate-600">{getPageTitle(pathname)}</span>
                                </div>
                            </div>
                            
                            {/* Actions & Profile */}
                            <div className="flex items-center gap-4 sm:gap-6">


                                <div className="flex items-center gap-3 pl-4 sm:pl-6">
                                    {/* Notification Bell */}
                                    <div className="relative" ref={notifRef}>
                                        <button 
                                            onClick={() => setIsNotificationOpen(!isNotificationOpen)}
                                            className={`relative p-2 rounded-lg transition-colors focus:outline-none ${isNotificationOpen ? 'bg-slate-200 text-slate-700' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-200/50'}`}
                                        >
                                            <Bell size={20} />
                                        </button>

                                        {/* Notification Slide-out Panel */}
                                        {isNotificationOpen && (
                                            <div className="absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                                                <div className="p-8 flex flex-col items-center justify-center text-center">
                                                    <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mb-3 border border-slate-100">
                                                        <Bell className="w-5 h-5 text-slate-400" />
                                                    </div>
                                                    <h3 className="text-sm font-bold text-slate-900 mb-1">Coming Soon</h3>
                                                    <p className="text-xs text-slate-500 leading-relaxed">Notifications will be available in the next version release.</p>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Header Profile Trigger */}
                                    <div className="group relative">
                                        <button className="flex items-center gap-2 focus:outline-none ml-2">
                                            <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white text-sm font-bold shadow-sm ring-2 ring-slate-50 group-hover:ring-indigo-100 transition-colors">
                                                {user?.first_name?.charAt(0)}
                                            </div>
                                        </button>
                                        
                                        <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-slate-100 py-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                                            <div className="px-4 py-2 border-b border-slate-100 mb-1">
                                                <p className="text-sm font-bold text-slate-900 truncate">{user?.first_name} {user?.last_name}</p>
                                                <p className="text-xs text-slate-500 truncate">{user?.email}</p>
                                            </div>
                                            <Link
                                                href="/organization-admin/settings"
                                                className="w-full flex items-center gap-3 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
                                            >
                                                <Settings size={16} />
                                                Account Settings
                                            </Link>
                                            <button
                                                onClick={() => logout()}
                                                className="w-full flex items-center gap-3 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors text-left"
                                            >
                                                <LogOut size={16} className="text-red-500" />
                                                Sign Out
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </header>

                        {/* Page Content */}
                        <main className="flex-1 overflow-y-auto bg-slate-50 p-4 sm:p-6 lg:p-8 flex flex-col">
                            <div className="max-w-[1600px] mx-auto w-full flex-1">
                                {children}
                            </div>
                            
                            <footer className="max-w-[1600px] mx-auto w-full mt-12 pt-5 border-t border-slate-200/80 grid grid-cols-1 sm:grid-cols-3 gap-4 text-[12px] font-medium text-slate-500 shrink-0">
                                <div className="flex flex-col sm:flex-row items-center sm:justify-start gap-2 sm:gap-4">
                                    <div className="flex items-center gap-2.5 text-slate-600 hover:text-slate-900 transition-colors cursor-pointer group">
                                        <span className="relative flex h-1.5 w-1.5">
                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 group-hover:opacity-100 transition-opacity"></span>
                                            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                                        </span>
                                        All systems operational
                                    </div>
                                </div>
                                <div className="flex items-center justify-center">
                                    <span className="text-slate-400">© {new Date().getFullYear()} Q4Queue</span>
                                </div>
                                <div className="flex items-center justify-center sm:justify-end">
                                    <span>v1.0.0</span>
                                </div>
                            </footer>
                        </main>
                        
                    </div>
                </div>
            </NotificationProvider>
            </BranchFilterProvider>
        </ProtectedRoute>
    );
}
