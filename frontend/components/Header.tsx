"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { Logo } from "@/components/ui/Logo";
import ConfirmModal from "@/components/ConfirmModal";

export default function Header() {
    const { user, logout } = useAuth();
    const pathname = usePathname();
    const isAdmin = user?.role === "admin";
    const dashBase = user?.org_slug ? `/${user.org_slug}/dashboard` : "/dashboard";
    const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);

    const navLinkCls = (href: string) =>
        `flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${pathname === href || pathname.startsWith(href + "/")
            ? "bg-blue-50 text-blue-700"
            : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
        }`;

    return (
        <header className="bg-white border-b border-gray-200 sticky top-0 z-30" role="banner">
            <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8" aria-label="Main navigation">
                <div className="flex justify-between h-16 items-center">
                    {/* Logo */}
                    <div className="flex items-center gap-6">
                        <Link href={dashBase} className="flex items-center gap-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded-lg p-1 -ml-1" aria-label="q4queue Dashboard">
                            <Logo size="sm" />
                        </Link>

                        {/* Navigation links */}
                        <div className="hidden sm:flex items-center gap-1">
                            <Link href={dashBase} className={navLinkCls(dashBase)}>
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                                </svg>
                                Queues
                            </Link>

                            {isAdmin && (
                                <>
                                    <Link href={`${dashBase}/staff`} className={navLinkCls(`${dashBase}/staff`)}>
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                                        </svg>
                                        Staff
                                    </Link>
                                    <Link href={`${dashBase}/settings`} className={navLinkCls(`${dashBase}/settings`)}>
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                        </svg>
                                        Settings
                                    </Link>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Right side */}
                    <div className="flex items-center gap-4">
                        {user && (
                            <div className="hidden sm:flex flex-col items-end leading-tight">
                                <span className="text-xs font-semibold text-gray-900">{user.email}</span>
                                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                                    {user.role} {user.org_name ? `• ${user.org_name}` : ""}
                                </span>
                            </div>
                        )}
                        <button
                            onClick={() => setIsLogoutModalOpen(true)}
                            aria-label="Sign out"
                            className="px-3 py-1.5 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                        >
                            Sign Out
                        </button>
                    </div>
                </div>
            </nav>
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
        </header>
    );
}
