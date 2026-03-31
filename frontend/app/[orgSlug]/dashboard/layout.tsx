"use client";

import { ReactNode, useState, useCallback } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import Sidebar from "@/components/Sidebar";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { usePathname } from "next/navigation";

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
                                    <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                                        </svg>
                                    </div>
                                    <span className="font-bold text-gray-900">Q4Queue</span>
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
