"use client";

import { ReactNode, useState } from "react";
import SuperAdminRoute from "@/components/SuperAdminRoute";
import Sidebar from "@/components/SuperAdminSidebar";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { Logo } from "@/components/ui/Logo";
import ConfirmModal from "@/components/ConfirmModal";

export default function SuperAdminProtectedLayout({ children }: { children: ReactNode }) {
    const { logout } = useAuth();
    const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    return (
        <SuperAdminRoute>
            <div className="min-h-screen bg-slate-950 flex flex-col lg:flex-row">
                <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

                <div className="flex-1 flex flex-col min-w-0 lg:pl-64 w-full">
                    {/* Mobile Header */}
                    <header className="lg:hidden bg-slate-900 border-b border-slate-800 h-16 flex items-center justify-between px-4 sticky top-0 z-30">
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => setIsSidebarOpen(true)}
                                className="p-2 -ml-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800/80 focus:outline-none transition-colors"
                                aria-label="Open sidebar"
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                                </svg>
                            </button>
                            <Link href="/super-admin" className="flex items-center gap-2">
                                <Logo size="sm" className="text-white" />
                            </Link>
                        </div>
                        <button
                            onClick={() => setIsLogoutModalOpen(true)}
                            className="p-2 text-slate-400 hover:text-red-400 focus:outline-none transition-colors"
                            aria-label="Sign out"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                            </svg>
                        </button>
                    </header>

                    <main className="flex-1 px-3 sm:px-6 lg:px-8 py-4 sm:py-8 max-w-full overflow-x-hidden">
                        <div className="max-w-7xl mx-auto w-full">
                            {children}
                        </div>
                    </main>
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
        </SuperAdminRoute>
    );
}
