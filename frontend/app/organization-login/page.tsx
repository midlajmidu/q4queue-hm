"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import Link from "next/link";

import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Eye, EyeOff, Building2 } from "lucide-react";

export default function LoginPage() {
    const router = useRouter();
    const { login, isLoading, error, isAuthenticated, isHydrated, user } = useAuth();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [loginType, setLoginType] = useState<"staff" | "org_admin">("org_admin");

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
                router.replace("/organization-admin");
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
            await login({ email, password, login_type: "org_admin" });
        } catch {
            // Error is handled in useAuth hook
        }
    }, [login, email, password]);

    return (
        <main className="force-light min-h-screen w-full flex bg-white h-screen overflow-hidden">
            {/* Left Column - Form */}
            <div className="w-full lg:w-1/2 flex flex-col px-8 sm:px-12 lg:px-20 xl:px-32 py-10 sm:py-12 relative overflow-y-auto">
                {/* Logo */}
                <div className="flex-none mb-auto">
                    <Link href="/" className="inline-block focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded-lg" aria-label="Go to home page">
                        <Image src="/q4queue-main-logo.png" alt="Q4Queue Logo" width={140} height={35} className="h-7 sm:h-8 w-auto object-contain" priority />
                    </Link>
                </div>

                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                    className="w-full max-w-[440px] flex flex-col justify-center h-full my-auto pt-8 sm:pt-0"
                >
                    <div className="mb-8 flex flex-col items-start">
                        <h1 className="font-heading text-[28px] sm:text-3xl font-bold text-slate-900 tracking-tight">
                            Organization Portal
                        </h1>
                        <p className="text-[15px] text-slate-600 mt-2">
                            Enter your credentials to continue to your dashboard.
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
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


                        <div>
                            <label htmlFor="email" className="block text-[13px] font-bold text-slate-900 mb-1.5">Email Address *</label>
                            <input
                                id="email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="admin@acme.com"
                                required
                                autoComplete="email"
                                className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-[15px] text-slate-900 focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 outline-none transition-all placeholder:text-slate-400"
                                disabled={isLoading}
                            />
                        </div>

                        <div>
                            <div className="flex items-center justify-between mb-1.5">
                                <label htmlFor="password" title="Password" className="block text-[13px] font-bold text-slate-900">Password *</label>
                            </div>
                            <div className="relative">
                                <input
                                    id="password"
                                    type={showPassword ? "text" : "password"}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    required
                                    autoComplete="current-password"
                                    className="w-full rounded-lg border border-slate-300 bg-white pl-3.5 pr-10 py-2.5 text-[15px] text-slate-900 focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 outline-none transition-all placeholder:text-slate-400"
                                    disabled={isLoading}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none p-1.5 rounded-md transition-colors"
                                    aria-label={showPassword ? "Hide password" : "Show password"}
                                    disabled={isLoading}
                                >
                                    {showPassword ? (
                                        <EyeOff className="w-4 h-4" />
                                    ) : (
                                        <Eye className="w-4 h-4" />
                                    )}
                                </button>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading || !email || !password}
                            aria-label="Continue"
                            className="w-full h-[46px] mt-6 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-[15px] rounded-lg transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                        >
                            {isLoading ? (
                                <>
                                    <svg className="animate-spin h-4 w-4 text-white mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Continuing...
                                </>
                            ) : (
                                "Continue"
                            )}
                        </button>
                    </form>

                    <div className="mt-6 pt-6 border-t border-slate-100 flex flex-col items-center gap-3">
                        {/* Sign up link removed per user request */}
                        <p className="text-[13px] text-slate-500 font-medium">
                            Sign in as Branch Admin?{" "}
                            <Link href="/login" className="text-indigo-600 hover:text-indigo-700 font-bold hover:underline underline-offset-2 transition-colors">
                                Login
                            </Link>
                        </p>
                    </div>

                    <p className="text-center text-xs text-slate-400 mt-6 mb-2">
                        © {new Date().getFullYear()} Q4Queue · <Link href="/" className="hover:text-slate-600 transition-colors">Home</Link>
                    </p>
                </motion.div>
            </div>

            {/* Right Column - Graphic */}
            <div className="hidden lg:flex lg:w-1/2 p-3 lg:p-4 justify-center items-center bg-white">
                <div className="w-full h-full rounded-[2rem] lg:rounded-[2.5rem] overflow-hidden relative">
                    <motion.div 
                        initial={{ opacity: 0, scale: 1.05 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.8, ease: "easeOut" }}
                        className="absolute inset-0 w-full h-full"
                    >
                        <Image 
                            src="/images/org-login-industry-standard.png" 
                            alt="Enterprise Queue Management Platform" 
                            fill
                            className="object-cover object-center"
                            priority
                            sizes="55vw"
                        />
                    </motion.div>
                </div>
            </div>
        </main>
    );
}
