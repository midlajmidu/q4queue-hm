"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import Link from "next/link";

import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Eye, EyeOff } from "lucide-react";

export default function LoginPage() {
    const router = useRouter();
    const { login, isLoading, error, isAuthenticated, isHydrated, user } = useAuth();
    const [orgSlug, setOrgSlug] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [loginType, setLoginType] = useState<"staff" | "org_admin">("staff");

    // Redirect to dashboard if already logged in
    useEffect(() => {
        if (isHydrated && isAuthenticated && user) {
            if (user.is_first_login) {
                if (user.role === "super_admin") {
                    router.replace("/super-admin/change-password");
                } else if (user.role === "organization_admin") {
                    router.replace("/organization-admin/change-password");
                } else {
                    router.replace(`/${user.org_slug}/change-password`);
                }
                return;
            }
            if (user.role === "super_admin") {
                router.replace("/super-admin");
            } else if (user.role === "organization_admin") {
                // BUG FIX: If an org_admin is loaded on the staff /login page,
                // it means their local storage has a corrupted fc_access_token from the old bug.
                // We must clear it so they can log in as a staff member.
                if (typeof window !== "undefined") {
                    localStorage.removeItem("fc_access_token");
                    window.location.reload();
                }
            } else if (user.role === "admin" || user.role === "branch_admin" || user.role === "staff") {
                router.replace(`/${user.org_slug}/dashboard`);
            } else {
                router.replace("/dashboard");
            }
        }
    }, [isHydrated, isAuthenticated, user, router]);

    const handleSubmit = useCallback(async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await login({ organization_slug: orgSlug, email, password, login_type: "staff" });
        } catch {
            // Error is handled in useAuth hook
        }
    }, [login, orgSlug, email, password]);

    return (
        <main className="force-light min-h-screen w-full flex bg-[#0A0625] relative overflow-hidden h-[100dvh]">
            {/* Background Pattern - Wavy Lines & Gradient */}
            <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(67,40,192,0.4)_0%,transparent_60%)]" />
                <div className="absolute inset-0 opacity-[0.15]">
                    {/* Minimal SVG pattern to mimic the wavy lines */}
                    <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
                        <defs>
                            <pattern id="waves" width="200" height="200" patternUnits="userSpaceOnUse" patternTransform="scale(2) rotate(15)">
                                <path d="M 0,100 C 50,0 150,200 200,100" fill="none" stroke="#ffffff" strokeWidth="0.5" />
                                <path d="M 0,120 C 50,20 150,220 200,120" fill="none" stroke="#ffffff" strokeWidth="0.5" />
                                <path d="M 0,140 C 50,40 150,240 200,140" fill="none" stroke="#ffffff" strokeWidth="0.5" />
                                <path d="M 0,160 C 50,60 150,260 200,160" fill="none" stroke="#ffffff" strokeWidth="0.5" />
                                <path d="M 0,80 C 50,-20 150,180 200,80" fill="none" stroke="#ffffff" strokeWidth="0.5" />
                                <path d="M 0,60 C 50,-40 150,160 200,60" fill="none" stroke="#ffffff" strokeWidth="0.5" />
                            </pattern>
                        </defs>
                        <rect width="100%" height="100%" fill="url(#waves)" />
                    </svg>
                </div>
            </div>

            {/* Left Column - Hero Text */}
            <div className="hidden lg:flex w-1/2 flex-col justify-end p-20 z-10 text-white">
                <motion.div 
                    initial={{ opacity: 0, y: 20 }} 
                    animate={{ opacity: 1, y: 0 }} 
                    transition={{ duration: 0.8, ease: "easeOut" }}
                >
                    <h1 className="text-[52px] xl:text-[64px] font-medium leading-[1.1] tracking-tight mb-4">
                        It's good to see<br />you again
                    </h1>
                    <p className="text-lg xl:text-xl text-white/70 font-light">
                        The intelligent queue management platform
                    </p>
                </motion.div>
            </div>

            {/* Right Column - Form Card */}
            <div className="w-full lg:w-1/2 flex flex-col p-4 lg:p-6 z-10 h-full">
                <motion.div 
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                    className="w-full h-full bg-white rounded-3xl flex flex-col px-8 sm:px-12 lg:px-16 xl:px-24 py-10 relative overflow-y-auto hide-scrollbar shadow-2xl"
                >
                    {/* Logo */}
                    <div className="flex-none mb-12 lg:mb-16">
                        <Link href="/" className="inline-block focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded-lg" aria-label="Go to home page">
                            <Image src="/q4queue-main-logo.png" alt="Q4Queue Logo" width={140} height={35} className="h-7 sm:h-8 w-auto object-contain" priority />
                        </Link>
                    </div>

                    <div className="w-full max-w-[420px] flex flex-col justify-center my-auto">
                        <div className="mb-8 flex flex-col items-start">
                            <h1 className="font-heading text-[28px] sm:text-[32px] font-bold text-slate-900 tracking-tight">
                                Welcome back!
                            </h1>
                            <p className="text-[15px] text-slate-600 mt-2">
                                Log in to your Q4Queue account
                            </p>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-5" noValidate>
                            <AnimatePresence>
                                {error && (
                                    <motion.div
                                        initial={{ opacity: 0, height: 0, scale: 0.95 }}
                                        animate={{ opacity: 1, height: 'auto', scale: 1 }}
                                        exit={{ opacity: 0, height: 0, scale: 0.95 }}
                                        className="overflow-hidden"
                                    >
                                        <div role="alert" className="bg-red-50 text-red-600 text-sm font-medium p-3 rounded-xl border border-red-100 flex items-start gap-2">
                                            <svg className="w-4 h-4 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                            <span>{error}</span>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            <div className="space-y-1.5">
                                <label htmlFor="org-slug" className="block text-[13px] font-bold text-slate-800">
                                    {loginType === "staff" ? "Branch Slug *" : "Organization Slug *"}
                                </label>
                                <input
                                    id="org-slug"
                                    type="text"
                                    value={orgSlug}
                                    onChange={(e) => setOrgSlug(e.target.value)}
                                    required
                                    autoComplete="organization"
                                    className="w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-[15px] text-slate-900 focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 outline-none transition-all placeholder:text-slate-400"
                                    disabled={isLoading}
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label htmlFor="email" className="block text-[13px] font-bold text-slate-800">Email *</label>
                                <input
                                    id="email"
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    autoComplete="email"
                                    className="w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-[15px] text-slate-900 focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 outline-none transition-all placeholder:text-slate-400"
                                    disabled={isLoading}
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label htmlFor="password" title="Password" className="block text-[13px] font-bold text-slate-800">Password *</label>
                                <div className="relative">
                                    <input
                                        id="password"
                                        type={showPassword ? "text" : "password"}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                        autoComplete="current-password"
                                        className="w-full rounded-lg border border-slate-200 bg-white pl-3.5 pr-10 py-2.5 text-[15px] text-slate-900 focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 outline-none transition-all placeholder:text-slate-400"
                                        disabled={isLoading}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none p-1.5 rounded-md transition-colors"
                                        aria-label={showPassword ? "Hide password" : "Show password"}
                                        disabled={isLoading}
                                    >
                                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={isLoading || !orgSlug || !email || !password}
                                aria-label="Log in"
                                className="w-full h-[46px] mt-2 bg-[#f4f4f5] text-slate-400 font-semibold text-[15px] rounded-lg transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2 enabled:bg-indigo-600 enabled:text-white enabled:hover:bg-indigo-700 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center"
                            >
                                {isLoading ? (
                                    <>
                                        <svg className="animate-spin h-4 w-4 text-white mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        Logging in...
                                    </>
                                ) : (
                                    "Log in"
                                )}
                            </button>
                        </form>

                        <div className="flex items-center justify-center mt-6 text-[13px]">
                            <Link href="#" className="text-indigo-600 hover:text-indigo-700 font-medium transition-colors">
                                Forgot your password?
                            </Link>
                        </div>

                        <div className="mt-8 pt-6 border-t border-slate-100 flex flex-col items-center mb-8 lg:mb-0">
                            <Link 
                                href="/organization-login" 
                                className="group flex items-center justify-center gap-2 text-[14px] font-medium text-slate-600 hover:text-indigo-600 transition-colors"
                            >
                                Are you an Organization?
                                <span className="flex items-center gap-1 font-bold text-indigo-600">
                                    Login here <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                </span>
                            </Link>
                        </div>
                    </div>
                </motion.div>
            </div>
        </main>
    );
}
