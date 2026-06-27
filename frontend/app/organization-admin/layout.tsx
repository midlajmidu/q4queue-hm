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

export default function OrgAdminLayout({ children }: { children: ReactNode }) {
    const { user, logout } = useAuth();
    const pathname = usePathname();
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

    const NavLink = ({ href, icon: Icon, label }: { href: string, icon: any, label: string }) => {
        const isActive = pathname === href || (href !== "/organization-admin" && pathname.startsWith(href));
        return (
            <Link 
                href={href}
                className={`flex items-center px-3 py-1.5 rounded-lg text-[13px] font-medium transition-all duration-200 ${
                    isActive 
                    ? "bg-indigo-50/80 text-indigo-700" 
                    : "text-slate-600 hover:bg-slate-100/60 hover:text-slate-900"
                }`}
            >
                <div className="w-6 flex items-center justify-start shrink-0">
                    <Icon size={16} className={isActive ? "text-indigo-600" : "text-slate-400"} />
                </div>
                <span>{label}</span>
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

    return (
        <ProtectedRoute>
            <BranchFilterProvider>
            <NotificationProvider>
                <div className="flex h-screen overflow-hidden bg-slate-50 font-sans">
                    
                    {/* Enterprise Sidebar */}
                    <aside className="w-64 bg-white border-r border-slate-200 flex flex-col hidden md:flex h-full shrink-0">
                        {/* Logo */}
                        <div className="h-16 flex items-center px-6 shrink-0">
                            <Link href="/organization-admin" className="focus:outline-none">
                                <Logo size="sm" />
                            </Link>
                        </div>

                        {/* Navigation */}
                        <div className="flex-1 overflow-y-auto py-4 px-3 flex flex-col gap-6 scrollbar-hide">
                            
                            {/* Core */}
                            <div className="space-y-1">
                                <NavLink href="/organization-admin" icon={LayoutDashboard} label="Command Center" />
                                <NavLink href="/organization-admin/branches" icon={Building2} label="Branches" />
                                <NavLink href="/organization-admin/analytics" icon={LineChart} label="Analytics" />
                            </div>

                            {/* Live Operations */}
                            <div>
                                <h3 className="px-3 text-xs font-semibold tracking-wider text-slate-400 uppercase mb-2">Live Operations</h3>
                                <div className="space-y-0.5">
                                    <NavLink href="/organization-admin/monitoring/sessions" icon={Users} label="Live Sessions" />
                                    <NavLink href="/organization-admin/monitoring/queues" icon={Activity} label="Active Queues" />
                                    <NavLink href="/organization-admin/monitoring/staff" icon={UserCog} label="Staff Presence" />
                                </div>
                            </div>

                            {/* Administration */}
                            <div>
                                <h3 className="px-3 text-xs font-semibold tracking-wider text-slate-400 uppercase mb-2">Administration</h3>
                                <div className="space-y-0.5">
                                    <NavLink href="/organization-admin/monitoring/audit" icon={Database} label="Audit Logs" />
                                    <NavLink href="/organization-admin/announcements" icon={Megaphone} label="Announcements" />
                                    <NavLink href="/organization-admin/exports" icon={Download} label="Data Exports" />
                                    <NavLink href="/organization-admin/settings" icon={Settings} label="Organization Settings" />
                                </div>
                            </div>

                        </div>

                        {/* Profile & Logout in Sidebar */}
                        <div className="p-4 border-t border-slate-200 shrink-0 bg-white relative" ref={profileRef}>
                            
                            {/* Popover Menu */}
                            {isProfileMenuOpen && (
                                <div className="absolute bottom-full left-4 right-4 mb-2 bg-white border border-slate-200 rounded-xl shadow-lg p-1 animate-in fade-in slide-in-from-bottom-2 duration-200 z-50">
                                    <Link 
                                        href="/organization-admin/settings"
                                        onClick={() => setIsProfileMenuOpen(false)}
                                        className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors w-full"
                                    >
                                        <Settings size={16} className="text-slate-400" />
                                        Account Settings
                                    </Link>
                                    <button
                                        onClick={() => { setIsProfileMenuOpen(false); logout(); }}
                                        className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-colors w-full text-left"
                                    >
                                        <LogOut size={16} className="text-red-500" />
                                        Sign Out
                                    </button>
                                </div>
                            )}

                            {/* Profile Trigger */}
                            <div 
                                onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                                className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer select-none"
                            >
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className="w-9 h-9 shrink-0 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-700 font-bold shadow-sm">
                                        {user?.first_name?.charAt(0) || 'U'}
                                    </div>
                                    <div className="flex-1 min-w-0 overflow-hidden">
                                        <div className="text-[13px] font-semibold text-slate-900 truncate w-full">
                                            {user?.first_name} {user?.last_name}
                                        </div>
                                        <div className="text-[11px] text-slate-500 truncate font-medium w-full">
                                            {user?.email}
                                        </div>
                                    </div>
                                </div>
                                <ChevronUp size={16} className={`text-slate-400 transition-transform duration-200 ${isProfileMenuOpen ? "rotate-180" : ""}`} />
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
                                            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full ring-2 ring-slate-50" />
                                        </button>

                                        {/* Notification Slide-out Panel */}
                                        {isNotificationOpen && (
                                            <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                                                <div className="px-4 py-3 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                                                    <h3 className="text-sm font-bold text-slate-900">System Alerts</h3>
                                                    <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">3 New</span>
                                                </div>
                                                <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                                                    <div className="p-4 hover:bg-slate-50 transition-colors">
                                                        <div className="flex items-start gap-3">
                                                            <div className="mt-0.5 w-2 h-2 rounded-full bg-rose-500 shrink-0"></div>
                                                            <div>
                                                                <p className="text-sm font-medium text-slate-900">SLA Breach Warning</p>
                                                                <p className="text-xs text-slate-500 mt-0.5">Downtown Branch wait times have exceeded 15 minutes.</p>
                                                                <p className="text-[10px] font-semibold text-slate-400 mt-1">2 mins ago</p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="p-4 hover:bg-slate-50 transition-colors">
                                                        <div className="flex items-start gap-3">
                                                            <div className="mt-0.5 w-2 h-2 rounded-full bg-indigo-500 shrink-0"></div>
                                                            <div>
                                                                <p className="text-sm font-medium text-slate-900">Weekly Report Ready</p>
                                                                <p className="text-xs text-slate-500 mt-0.5">Your organization's weekly performance report is available to download.</p>
                                                                <p className="text-[10px] font-semibold text-slate-400 mt-1">1 hour ago</p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="p-4 hover:bg-slate-50 transition-colors">
                                                        <div className="flex items-start gap-3">
                                                            <div className="mt-0.5 w-2 h-2 rounded-full bg-emerald-500 shrink-0"></div>
                                                            <div>
                                                                <p className="text-sm font-medium text-slate-900">New Staff Added</p>
                                                                <p className="text-xs text-slate-500 mt-0.5">3 new staff members were added to the Westside Branch.</p>
                                                                <p className="text-[10px] font-semibold text-slate-400 mt-1">3 hours ago</p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="px-4 py-2 bg-slate-50 border-t border-slate-100">
                                                    <button className="w-full text-xs font-semibold text-indigo-600 hover:text-indigo-700 py-1 transition-colors text-center">
                                                        Mark all as read
                                                    </button>
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
                        <main className="flex-1 overflow-y-auto bg-slate-50 p-4 sm:p-6 lg:p-8">
                            <div className="max-w-[1600px] mx-auto">
                                {children}
                            </div>
                        </main>
                        
                    </div>
                </div>
            </NotificationProvider>
            </BranchFilterProvider>
        </ProtectedRoute>
    );
}
