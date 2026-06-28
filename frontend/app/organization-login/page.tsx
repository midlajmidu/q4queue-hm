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
    const [orgSlug, setOrgSlug] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [loginType, setLoginType] = useState<"staff" | "org_admin">("org_admin");

    // Redirect to dashboard if already logged in
    useEffect(() => {
        if (isHydrated && isAuthenticated && user) {
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
            await login({ organization_slug: orgSlug, email, password });
        } catch {
            // Error is handled in useAuth hook
        }
    }, [login, orgSlug, email, password]);

    return (
        <main className="force-dark min-h-screen relative flex flex-col items-center justify-center bg-slate-950 p-4 sm:p-8 overflow-y-auto">
            {/* Dark Mode Background Grid */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,hsl(220_16%_20%/0.3)_1px,transparent_1px),linear-gradient(to_bottom,hsl(220_16%_20%/0.3)_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,black_70%,transparent_100%)] pointer-events-none" />
            
            {/* Premium Glowing Orbs */}
            <div className="absolute top-[10%] left-[20%] w-[500px] h-[500px] bg-indigo-500/15 rounded-full blur-[120px] pointer-events-none mix-blend-screen" />
            <div className="absolute bottom-[10%] right-[20%] w-[400px] h-[400px] bg-purple-500/15 rounded-full blur-[100px] pointer-events-none mix-blend-screen" />

            {/* Centered login */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                className="w-full max-w-[420px] relative z-10"
            >
                {/* Logo */}
                <div className="text-center mb-8 flex justify-center">
                    <Link href="/" className="inline-flex items-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded-lg p-1" aria-label="Go to home page">
                        <Image src="/newLogo2.png" alt="Q4Queue Logo" width={642} height={543} className="h-16 md:h-20 w-auto object-contain brightness-0 invert opacity-90" priority />
                    </Link>
                </div>

                {/* Premium Dark Card */}
                <div className="relative rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-xl p-7 md:p-8 space-y-6 shadow-2xl" style={{ boxShadow: "0 20px 40px -10px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05)" }}>
                    {/* Top Accent Line */}
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/2 h-[1px] bg-gradient-to-r from-transparent via-indigo-500/50 to-transparent" />

                    <div className="text-center pb-5 border-b border-slate-800/80">
                        <div className="inline-flex items-center justify-center p-2.5 bg-indigo-500/10 rounded-xl mb-4 ring-1 ring-indigo-500/20">
                            <Building2 className="w-6 h-6 text-indigo-400" />
                        </div>
                        <h1 className="font-heading text-2xl font-bold text-white tracking-tight">
                            Organization <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">Portal</span>
                        </h1>
                        <p className="text-sm text-slate-400 mt-2">Enterprise access for parent organizations</p>
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
                                    <div role="alert" className="bg-destructive/10 text-destructive text-sm font-medium p-3 rounded-lg border border-destructive/20 text-center">
                                        {error}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <div>
                            <label htmlFor="org-slug" className="block text-sm font-semibold text-slate-200 mb-1.5">
                                Organization Slug
                            </label>
                            <input
                                id="org-slug"
                                type="text"
                                value={orgSlug}
                                onChange={(e) => setOrgSlug(e.target.value)}
                                placeholder="e.g. acme-corp"
                                required
                                autoComplete="organization"
                                className="w-full rounded-xl border border-slate-700/50 bg-slate-900/50 px-4 py-2.5 text-sm text-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none transition-all placeholder:text-slate-500"
                                disabled={isLoading}
                            />
                        </div>

                        <div>
                            <label htmlFor="email" className="block text-sm font-semibold text-slate-200 mb-1.5">Email Address</label>
                            <input
                                id="email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="admin@acme.com"
                                required
                                autoComplete="email"
                                className="w-full rounded-xl border border-slate-700/50 bg-slate-900/50 px-4 py-2.5 text-sm text-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none transition-all placeholder:text-slate-500"
                                disabled={isLoading}
                            />
                        </div>

                        <div>
                            <div className="flex items-center justify-between mb-1.5">
                                <label htmlFor="password" title="Password" className="block text-sm font-semibold text-slate-200">Password</label>
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
                                    className="w-full rounded-xl border border-slate-700/50 bg-slate-900/50 pl-4 pr-12 py-2.5 text-sm text-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none transition-all placeholder:text-slate-500"
                                    disabled={isLoading}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 focus:outline-none p-1.5 rounded-md transition-colors"
                                    aria-label={showPassword ? "Hide password" : "Show password"}
                                    disabled={isLoading}
                                >
                                    {showPassword ? (
                                        <EyeOff className="w-5 h-5" />
                                    ) : (
                                        <Eye className="w-5 h-5" />
                                    )}
                                </button>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading || !orgSlug || !email || !password}
                            aria-label="Sign in"
                            className="w-full h-11 mt-4 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-semibold rounded-full shadow-[0_0_20px_rgba(99,102,241,0.3)] hover:shadow-[0_0_30px_rgba(99,102,241,0.5)] hover:scale-[1.02] transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 disabled:opacity-70 disabled:hover:scale-100 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {isLoading ? (
                                <>
                                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Signing in...
                                </>
                            ) : (
                                <>
                                    Sign in <ArrowRight className="w-4 h-4 ml-1" />
                                </>
                            )}
                        </button>
                    </form>

                    <div className="pt-6 border-t border-slate-800/80 flex flex-col items-center gap-4">
                        <Link 
                            href="/join" 
                            className="group flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-slate-800/30 hover:bg-slate-800/60 border border-slate-700/50 hover:border-slate-600 transition-all duration-300 w-full"
                        >
                            <span className="text-[13px] font-medium text-slate-400 group-hover:text-slate-300 transition-colors">
                                Don&apos;t have an account?
                            </span>
                            <span className="text-[13px] font-bold text-indigo-400 group-hover:text-indigo-300 transition-colors flex items-center gap-1">
                                Sign Up <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                            </span>
                        </Link>

                        <p className="text-xs text-slate-500">
                            Are you Branch Staff?{" "}
                            <Link href="/login" className="text-indigo-400 hover:text-indigo-300 font-medium underline underline-offset-2 transition-colors">
                                Staff Login
                            </Link>
                        </p>
                    </div>
                </div>
            </motion.div>

            {/* Minimal footer */}
            <p className="relative z-10 text-center text-xs text-muted-foreground mt-8">
                © {new Date().getFullYear()} Q4Queue · <Link href="/" className="hover:text-foreground transition-colors">Home</Link>
            </p>
        </main>
    );
}
