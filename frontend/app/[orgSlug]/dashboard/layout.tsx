"use client";

import { ReactNode, useState, useCallback } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import Sidebar from "@/components/Sidebar";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/ui/Logo";

export default function DashboardLayout({ children }: { children: ReactNode }) {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const { user, logout } = useAuth();
    const pathname = usePathname();
    const dashBase = user?.org_slug ? `/${user.org_slug}/dashboard` : "/dashboard";

    const handleCloseSidebar = useCallback(() => {
        setIsMobileMenuOpen(false);
    }, []);

    // On "Manage Queue" pages, the queue page itself has its own inner sidebar
    // so we keep the main sidebar hidden but still apply normal layout padding
    const isManageQueuePage = pathname?.match(/\/dashboard\/queues\/[0-9a-f-]{36}/i);

    return (
        <ProtectedRoute>
            <div className="bg-gray-50 flex min-h-screen">
                {/* Main sidebar – shown on all pages except the queue detail page */}
                {!isManageQueuePage && (
                    <Sidebar isOpen={isMobileMenuOpen} onClose={handleCloseSidebar} />
                )}

                <div className={`flex-1 flex flex-col min-w-0 ${!isManageQueuePage ? "lg:pl-64" : ""}`}>
                    {/* Mobile Header – only shown when main sidebar applies */}
                    {!isManageQueuePage && (
                        <header className="lg:hidden bg-white border-b border-gray-200 h-16 flex items-center justify-between px-4 sticky top-0 z-20">
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={() => setIsMobileMenuOpen(true)}
                                    className="p-2 -ml-2 text-gray-400 hover:text-gray-600 focus:outline-none"
                                    aria-label="Open menu"
                                >
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                                    </svg>
                                </button>
                                <Link href={dashBase} className="flex items-center gap-2">
                                    <Logo size="sm" />
                                </Link>
                            </div>
                            <button
                                onClick={logout}
                                className="p-2 text-gray-400 hover:text-gray-600 focus:outline-none"
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                                </svg>
                            </button>
                        </header>
                    )}

                    <main className={!isManageQueuePage ? "flex-1 px-4 sm:px-6 lg:px-8 py-8 overflow-y-auto md:overflow-y-visible" : "flex-1 overflow-hidden"}>
                        <div className={!isManageQueuePage ? "max-w-7xl mx-auto w-full" : "w-full h-full"}>
                            {children}
                        </div>
                    </main>
                </div>
            </div>
        </ProtectedRoute>
    );
}
