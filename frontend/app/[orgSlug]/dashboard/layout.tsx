"use client";

import { ReactNode, useState, useCallback } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import Sidebar from "@/components/UserSidebar";
import { TopBar } from "@/components/TopBar";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { usePathname, useParams } from "next/navigation";

import { AlertBannerContainer } from "@/components/AlertBannerContainer";
import ConfirmModal from "@/components/ConfirmModal";
import { NotificationProvider } from "@/context/NotificationContext";
import { ImpersonationBanner } from "@/components/ImpersonationBanner";
import { AdminViewBanner } from "@/components/AdminViewBanner";
import SystemBanner from "@/components/SystemBanner";
import { OrganizationAnnouncementsBanner } from "@/components/OrganizationAnnouncementsBanner";
import { useHeartbeat } from "@/hooks/useHeartbeat";

export default function DashboardLayout({ children }: { children: ReactNode }) {
    useHeartbeat();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    const { user, logout } = useAuth();
    const pathname = usePathname();
    const params = useParams();
    const orgSlug = params?.orgSlug || user?.org_slug;
    const dashBase = orgSlug ? `/${orgSlug}/dashboard` : "/dashboard";
    const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);

    const handleCloseSidebar = useCallback(() => {
        setIsMobileMenuOpen(false);
    }, []);

    const handleToggleCollapse = useCallback(() => {
        setIsSidebarCollapsed(prev => !prev);
    }, []);

    // On "Manage Queue" pages, the queue page itself has its own inner sidebar
    // so we keep the main sidebar hidden but still apply normal layout padding
    const isManageQueuePage = pathname?.match(/\/dashboard\/queues\/[0-9a-f-]{36}/i);

    return (
        <ProtectedRoute>
            <NotificationProvider>
                <div className="flex h-screen overflow-hidden bg-slate-50/60 dark:bg-slate-950">
                    {/* Main sidebar – shown on all pages except the queue detail page */}
                {!isManageQueuePage && (
                    <Sidebar
                        isOpen={isMobileMenuOpen}
                        onClose={handleCloseSidebar}
                        collapsed={isSidebarCollapsed}
                        onToggleCollapse={handleToggleCollapse}
                    />
                )}

                <div
                    className={`flex-1 flex flex-col min-w-0 h-full overflow-hidden transition-[padding] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]`}
                    style={{
                        paddingLeft: !isManageQueuePage
                            ? undefined
                            : 0,
                    }}
                >
                    {/* Apply padding via a class that matches sidebar width */}
                    <style>{`
                        @media (min-width: 1024px) {
                            .sb-offset { padding-left: ${!isManageQueuePage ? (isSidebarCollapsed ? '72px' : '256px') : '0px'}; transition: padding-left 300ms cubic-bezier(0.4,0,0.2,1); }
                        }
                    `}</style>
                    <div className={`flex-1 flex flex-col min-w-0 h-full overflow-hidden ${!isManageQueuePage ? 'sb-offset' : ''}`}>
                        <SystemBanner />
                        <OrganizationAnnouncementsBanner />
                        <ImpersonationBanner />
                        <AdminViewBanner />
                        {/* Global Top Bar */}
                        {!isManageQueuePage && (
                            <TopBar onOpenMobileMenu={() => setIsMobileMenuOpen(true)} />
                        )}

                        <main className={!isManageQueuePage ? "flex-1 min-h-0 px-4 sm:px-6 lg:px-8 pt-8 pb-4 overflow-y-auto flex flex-col" : "flex-1 min-h-0 overflow-hidden"}>
                            <div className={!isManageQueuePage ? "max-w-7xl mx-auto w-full flex-1 flex flex-col" : "w-full h-full"}>
                                <AlertBannerContainer />
                                {children}
                            </div>
                            
                            {!isManageQueuePage && (
                                <footer className="max-w-7xl mx-auto w-full mt-12 pt-5 border-t border-slate-200/80 dark:border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] font-medium text-slate-400 dark:text-slate-500 shrink-0">
                                    <div className="flex items-center gap-3">
                                        <span className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></span>
                                            All systems operational
                                        </span>
                                        <span className="hidden sm:inline text-slate-200 dark:text-slate-800">|</span>
                                        <span className="hidden sm:inline">v1.2.4</span>
                                    </div>
                                    <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6">
                                        <span className="hidden lg:flex items-center gap-1.5 cursor-pointer hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
                                            <kbd className="px-1.5 py-0.5 rounded-[4px] border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-900 font-sans text-[9px] font-bold text-slate-500">?</kbd>
                                            Shortcuts
                                        </span>
                                        <a href="#" className="hover:text-slate-600 dark:hover:text-slate-300 transition-colors">Help</a>
                                        <a href="#" className="hover:text-slate-600 dark:hover:text-slate-300 transition-colors">API Docs</a>
                                        <a href="#" className="hover:text-slate-600 dark:hover:text-slate-300 transition-colors">Privacy</a>
                                        <span className="text-slate-300 dark:text-slate-700">© 2026 Q4Queue</span>
                                    </div>
                                </footer>
                            )}
                        </main>
                    </div>
                </div>
            </div>
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
            </NotificationProvider>
        </ProtectedRoute>
    );
}
