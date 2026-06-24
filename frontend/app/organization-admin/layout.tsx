"use client";

import { ReactNode } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useAuth } from "@/hooks/useAuth";
import { NotificationProvider } from "@/context/NotificationContext";
import { BranchFilterProvider } from "@/context/BranchFilterContext";
import BranchSelector from "@/components/organization-admin/BranchSelector";
import { Building2, LogOut, LayoutDashboard, Users, UserCog, Settings, Megaphone, Download, Database, Search } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function OrgAdminLayout({ children }: { children: ReactNode }) {
    const { user, logout } = useAuth();
    const pathname = usePathname();

    return (
        <ProtectedRoute>
            <BranchFilterProvider>
            <NotificationProvider>
                <div className="flex h-screen overflow-hidden bg-slate-50 dark:bg-slate-950">
                    {/* Simplified Sidebar */}
                    <aside className="w-64 bg-white border-r border-slate-200 flex flex-col hidden md:flex h-full">
                        <div className="p-4 flex items-center gap-3 border-b border-slate-100">
                            <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold">
                                O
                            </div>
                            <div>
                                <h1 className="font-bold text-slate-900 leading-none">Organization</h1>
                                <span className="text-xs text-slate-500">Admin Portal</span>
                            </div>
                        </div>

                        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
                            <Link 
                                href="/organization-admin"
                                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                                    pathname === "/organization-admin" 
                                    ? "bg-indigo-50 text-indigo-700" 
                                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                                }`}
                            >
                                <LayoutDashboard size={18} />
                                Dashboard
                            </Link>
                            <Link 
                                href="/organization-admin/branches"
                                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                                    pathname.startsWith("/organization-admin/branches") 
                                    ? "bg-indigo-50 text-indigo-700" 
                                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                                }`}
                            >
                                <Building2 size={18} />
                                Branches Overview
                            </Link>
                            
                            <div className="pt-4 pb-2 px-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                                Analytics
                            </div>
                            <Link 
                                href="/organization-admin/analytics"
                                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                                    pathname.startsWith("/organization-admin/analytics") 
                                    ? "bg-indigo-50 text-indigo-700" 
                                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                                }`}
                            >
                                <LayoutDashboard size={18} />
                                Cross-Branch Analytics
                            </Link>

                            <div className="pt-4 pb-2 px-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                                Monitoring
                            </div>
                            <Link 
                                href="/organization-admin/monitoring/sessions"
                                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                                    pathname.startsWith("/organization-admin/monitoring/sessions") 
                                    ? "bg-indigo-50 text-indigo-700" 
                                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                                }`}
                            >
                                <Users size={18} />
                                Live Sessions
                            </Link>
                            <Link 
                                href="/organization-admin/monitoring/queues"
                                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                                    pathname.startsWith("/organization-admin/monitoring/queues") 
                                    ? "bg-indigo-50 text-indigo-700" 
                                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                                }`}
                            >
                                <LayoutDashboard size={18} />
                                Live Queues
                            </Link>
                            <Link 
                                href="/organization-admin/monitoring/staff"
                                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                                    pathname.startsWith("/organization-admin/monitoring/staff") 
                                    ? "bg-indigo-50 text-indigo-700" 
                                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                                }`}
                            >
                                <UserCog size={18} />
                                Staff Overview
                            </Link>
                            <Link 
                                href="/organization-admin/monitoring/whatsapp"
                                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                                    pathname.startsWith("/organization-admin/monitoring/whatsapp") 
                                    ? "bg-indigo-50 text-indigo-700" 
                                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                                }`}
                            >
                                <LayoutDashboard size={18} />
                                WhatsApp Status
                            </Link>
                            <Link 
                                href="/organization-admin/monitoring/audit"
                                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                                    pathname.startsWith("/organization-admin/monitoring/audit") 
                                    ? "bg-indigo-50 text-indigo-700" 
                                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                                }`}
                            >
                                <LayoutDashboard size={18} />
                                Audit Logs
                            </Link>
                        </nav>
                        
                        {/* Enterprise Operations Section */}
                        <div className="px-4 py-2 mt-4">
                            <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Enterprise Ops</h2>
                        </div>
                        <nav className="flex-1 px-3 space-y-1 overflow-y-auto mb-4">
                            <Link 
                                href="/organization-admin/search"
                                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                                    pathname.startsWith("/organization-admin/search") 
                                    ? "bg-indigo-50 text-indigo-700" 
                                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                                }`}
                            >
                                <Search size={18} />
                                Global Search
                            </Link>
                            <Link 
                                href="/organization-admin/announcements"
                                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                                    pathname.startsWith("/organization-admin/announcements") 
                                    ? "bg-indigo-50 text-indigo-700" 
                                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                                }`}
                            >
                                <Megaphone size={18} />
                                Announcements
                            </Link>
                            <Link 
                                href="/organization-admin/exports"
                                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                                    pathname.startsWith("/organization-admin/exports") 
                                    ? "bg-indigo-50 text-indigo-700" 
                                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                                }`}
                            >
                                <Download size={18} />
                                Data Exports
                            </Link>
                            <Link 
                                href="/organization-admin/backups"
                                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                                    pathname.startsWith("/organization-admin/backups") 
                                    ? "bg-indigo-50 text-indigo-700" 
                                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                                }`}
                            >
                                <Database size={18} />
                                Backups & Restore
                            </Link>
                            <Link 
                                href="/organization-admin/settings"
                                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                                    pathname.startsWith("/organization-admin/settings") 
                                    ? "bg-indigo-50 text-indigo-700" 
                                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                                }`}
                            >
                                <Settings size={18} />
                                Organization Settings
                            </Link>
                        </nav>

                        <div className="p-4 border-t border-slate-100">
                            <div className="mb-4 flex items-center gap-3 px-3">
                                <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-medium">
                                    {user?.first_name?.charAt(0)}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="text-sm font-medium text-slate-900 truncate">
                                        {user?.first_name} {user?.last_name}
                                    </div>
                                    <div className="text-xs text-slate-500 truncate">{user?.email}</div>
                                </div>
                            </div>
                            <button
                                onClick={() => logout()}
                                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
                            >
                                <LogOut size={18} />
                                Sign Out
                            </button>
                        </div>
                    </aside>

                    {/* Main Content */}
                    <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
                        {/* Header for both Desktop & Mobile to hold BranchSelector */}
                        <header className="flex items-center justify-between p-4 bg-white border-b border-slate-200">
                            <div className="flex items-center gap-2 md:hidden">
                                <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-sm">
                                    O
                                </div>
                                <span className="font-bold text-slate-900">Org Admin</span>
                            </div>
                            <div className="hidden md:block">
                                {/* Empty space for desktop alignment */}
                            </div>
                            
                            <div className="flex items-center gap-4">
                                <BranchSelector />
                                <button onClick={() => logout()} className="text-slate-500 p-2 md:hidden">
                                    <LogOut size={20} />
                                </button>
                            </div>
                        </header>

                        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
                            <div className="max-w-7xl mx-auto">
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
