"use client";

import { ReactNode, useState, useCallback } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import Sidebar from "@/components/Sidebar";
import { TopBar } from "@/components/TopBar";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { usePathname } from "next/navigation";

import { AlertBannerContainer } from "@/components/AlertBannerContainer";
import ConfirmModal from "@/components/ConfirmModal";
import { NotificationProvider } from "@/context/NotificationContext";

export default function DashboardLayout({ children }: { children: ReactNode }) {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    const { user, logout } = useAuth();
    const pathname = usePathname();
    const dashBase = user?.org_slug ? `/${user.org_slug}/dashboard` : "/dashboard";
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
                <div className="flex min-h-screen" style={{ background: "var(--q-page-bg)" }}>
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
                    className={`flex-1 flex flex-col min-w-0 transition-[padding] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]`}
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
                    <div className={`flex-1 flex flex-col min-w-0 ${!isManageQueuePage ? 'sb-offset' : ''}`}>
                        {/* Global Top Bar */}
                        {!isManageQueuePage && (
                            <TopBar onOpenMobileMenu={() => setIsMobileMenuOpen(true)} />
                        )}

                        <main className={!isManageQueuePage ? "flex-1 px-4 sm:px-6 lg:px-8 py-8 overflow-y-auto md:overflow-y-visible" : "flex-1 overflow-hidden"}>
                            <div className={!isManageQueuePage ? "max-w-7xl mx-auto w-full" : "w-full h-full"}>
                                <AlertBannerContainer />
                                {children}
                            </div>
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
