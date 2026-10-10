"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import Link from "next/link";
import { config } from "@/lib/config";

import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Eye, EyeOff, Mail, Lock } from "lucide-react";

export default function LoginPage() {
    const router = useRouter();
    const { login, isLoading, error, isAuthenticated, isHydrated, user } = useAuth();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [loginType, setLoginType] = useState<"staff" | "org_admin">("org_admin");
    const [bannerMessage, setBannerMessage] = useState<string | null>(null);

    useEffect(() => {
        if (typeof window !== "undefined") {
            const params = new URLSearchParams(window.location.search);
            const errParam = params.get("error");
            if (errParam === "account_suspended") {
                setBannerMessage("This account has been suspended by an administrator. Please contact support at contact@q4queue.com to restore access.");
                window.history.replaceState({}, document.title, window.location.pathname);
            } else if (errParam === "account_deactivated") {
                setBannerMessage("Your account has been deactivated by an administrator. Please contact support.");
                window.history.replaceState({}, document.title, window.location.pathname);
            }
        }
    }, []);

    // Redirect to dashboard if already logged in
    useEffect(() => {
        if (isHydrated && isAuthenticated && user) {
            let targetPath = "/dashboard";
            if (user.is_first_login) {
                if (user.role === "super_admin") {
                    targetPath = "/super-admin/change-password";
                } else if (user.role === "organization_admin") {
                    targetPath = "/organization-admin/change-password";
                } else {
                    targetPath = `/${user.org_slug}/change-password`;
                }
            } else if (user.role === "super_admin") {
                targetPath = "/super-admin";
            } else if (user.role === "organization_admin") {
                targetPath = "/organization-admin";
            } else if (user.role === "admin" || user.role === "branch_admin" || user.role === "staff") {
                targetPath = `/${user.org_slug}/dashboard`;
            }

            if (typeof window !== "undefined" && !window.location.host.includes("localhost") && !window.location.host.includes("127.0.0.1") && !window.location.hostname.startsWith("app.")) {
                window.location.href = `https://app.q4queue.com${targetPath}`;
            } else {
                router.replace(targetPath);
            }
        }
    }, [isHydrated, isAuthenticated, user, router]);

    const handleSubmit = useCallback(async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await login({ email, password, login_type: "org_admin" });
        } catch {
            // Error is handled in useAuth hook
        }
    }, [login, email, password]);

    return (
        <main className="force-light min-h-[100dvh] w-full flex flex-col lg:flex-row bg-white sm:bg-[#0A0625] relative overflow-y-auto lg:overflow-hidden lg:h-[100dvh]">
            {/* Background Pattern - Ambient glow & subtle waves on tablet and desktop */}
            <div className="hidden sm:block absolute inset-0 z-0 pointer-events-none overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(67,40,192,0.4)_0%,transparent_60%)]" />
                <div className="absolute inset-0 opacity-[0.15]">
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
            <div className="hidden lg:flex w-1/2 flex-col justify-end p-16 xl:p-20 z-10 text-white">
                <motion.div 
                    initial={{ opacity: 0, y: 20 }} 
                    animate={{ opacity: 1, y: 0 }} 
                    transition={{ duration: 0.8, ease: "easeOut" }}
                >
                    <h1 className="text-[52px] xl:text-[64px] font-medium leading-[1.1] tracking-tight mb-4">
                        Manage your<br />organization
                    </h1>
                    <p className="text-lg xl:text-xl text-white/70 font-light">
                        The intelligent queue management platform
                    </p>
                </motion.div>
            </div>

            {/* Right Column - Form Container */}
            <div className="w-full lg:w-1/2 flex flex-col justify-center items-center p-0 sm:p-6 lg:p-8 z-10 min-h-[100dvh] lg:min-h-0 lg:h-full">
                <motion.div 
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                    className="w-full sm:max-w-[440px] md:max-w-[460px] min-h-[100dvh] sm:min-h-0 bg-white sm:rounded-3xl flex flex-col justify-center px-6 sm:px-10 py-8 sm:py-10 relative sm:shadow-[0_20px_60px_-15px_rgba(0,0,0,0.35)] sm:border sm:border-slate-100 sm:my-auto"
                >
                    <div className="w-full flex flex-col justify-center">
                        {/* Logo */}
                        <div className="mb-6">
                            <a href={config.landingUrl} className="inline-block focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded-lg overflow-visible" aria-label="Go to home page">
                                <Image src="/logo-main-trimmed.png" alt="Q4Queue Logo" width={240} height={50} className="h-8 sm:h-9 w-auto object-contain" priority />
                            </a>
                        </div>

                        <div className="mb-5 flex flex-col items-start">
                            <h1 className="font-heading text-[26px] sm:text-[28px] font-bold text-slate-900 tracking-tight">
                                Organization Portal
                            </h1>
                            <p className="text-[13.5px] text-slate-600 mt-1">
                                Enter your master credentials to continue to your dashboard
                            </p>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-3.5" noValidate>
                            <AnimatePresence>
                                {(error || bannerMessage) && (
                                    <motion.div
                                        initial={{ opacity: 0, height: 0, scale: 0.95 }}
                                        animate={{ opacity: 1, height: 'auto', scale: 1 }}
                                        exit={{ opacity: 0, height: 0, scale: 0.95 }}
                                        className="overflow-hidden"
                                    >
                                        <div role="alert" className="bg-red-50 text-red-600 text-xs font-medium p-2.5 rounded-xl border border-red-100 flex items-start gap-2">
                                            <svg className="w-4 h-4 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                            <span>{error || bannerMessage}</span>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            <div className="space-y-1">
                                <label htmlFor="email" className="block text-[12.5px] font-bold text-slate-800">
                                    Email address <span className="text-indigo-600">*</span>
                                </label>
                                <div className="relative flex items-center rounded-xl border-2 border-slate-300/80 bg-slate-50/50 hover:bg-slate-50/90 hover:border-slate-400 focus-within:border-indigo-600 focus-within:ring-4 focus-within:ring-indigo-500/10 focus-within:bg-white transition-all">
                                    <div className="pl-3 text-slate-400 pointer-events-none flex items-center justify-center">
                                        <Mail className="w-4 h-4" />
                                    </div>
                                    <input
                                        id="email"
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        required
                                        autoComplete="email"
                                        placeholder="name@company.com"
                                        className="w-full rounded-xl bg-transparent pl-2 pr-3 py-2.5 text-[16px] sm:text-[14px] font-medium text-slate-900 outline-none placeholder:text-slate-400/70 placeholder:font-normal transition-all focus:placeholder:opacity-0"
                                        disabled={isLoading}
                                    />
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label htmlFor="password" title="Password" className="block text-[12.5px] font-bold text-slate-800">
                                    Password <span className="text-indigo-600">*</span>
                                </label>
                                <div className="relative flex items-center rounded-xl border-2 border-slate-300/80 bg-slate-50/50 hover:bg-slate-50/90 hover:border-slate-400 focus-within:border-indigo-600 focus-within:ring-4 focus-within:ring-indigo-500/10 focus-within:bg-white transition-all">
                                    <div className="pl-3 text-slate-400 pointer-events-none flex items-center justify-center">
                                        <Lock className="w-4 h-4" />
                                    </div>
                                    <input
                                        id="password"
                                        type={showPassword ? "text" : "password"}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                        autoComplete="current-password"
                                        placeholder="Enter your password"
                                        className="w-full rounded-xl bg-transparent pl-2 pr-9 py-2.5 text-[16px] sm:text-[14px] font-medium text-slate-900 outline-none placeholder:text-slate-400/70 placeholder:font-normal transition-all focus:placeholder:opacity-0"
                                        disabled={isLoading}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none p-1 rounded-md transition-colors"
                                        aria-label={showPassword ? "Hide password" : "Show password"}
                                        disabled={isLoading}
                                    >
                                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={isLoading || !email || !password}
                                aria-label="Log in"
                                className="w-full h-11 mt-2 bg-indigo-600 text-white font-bold text-[14.5px] rounded-xl transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2 hover:bg-indigo-700 shadow-md shadow-indigo-500/20 active:scale-[0.99] disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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

                        <div className="mt-6 pt-5 border-t border-slate-100 flex flex-col items-center">
                            <Link 
                                href="/login" 
                                className="group flex items-center justify-center gap-2 text-[14px] font-medium text-slate-600 hover:text-indigo-600 transition-colors"
                            >
                                Are you a Branch Admin?
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
