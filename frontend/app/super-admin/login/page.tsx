"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api, ApiError } from "@/lib/api";
import { setToken, isAuthenticated, getCurrentUser } from "@/lib/auth";
import { motion, AnimatePresence } from "framer-motion";
import { Eye, EyeOff, ShieldCheck } from "lucide-react";

export default function SuperAdminLoginPage() {
    const router = useRouter();
    const [email, setEmail] = useState("superadmin@q4queue.internal");
    const [password, setPassword] = useState("SuperAdmin@2026!!!");
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // If already logged in as super_admin, redirect immediately
    useEffect(() => {
        if (isAuthenticated()) {
            const user = getCurrentUser();
            if (user?.role === "super_admin") {
                if (user.is_first_login) {
                    router.replace("/super-admin/change-password");
                    return;
                }
                router.replace("/super-admin");
            }
        }
    }, [router]);

    const handleSubmit = useCallback(async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);
        try {
            const resp = await api.superAdminLogin({ email, password });
            setToken(resp.access_token);
            if (resp.force_password_change) {
                router.push("/super-admin/change-password");
            } else {
                router.push("/super-admin");
            }
        } catch (err) {
            if (err instanceof ApiError) {
                if (err.status === 401) {
                    setError("Invalid super admin credentials.");
                } else {
                    setError(err.detail);
                }
            } else {
                setError("Network error. Please check your connection.");
            }
        } finally {
            setIsLoading(false);
        }
    }, [email, password, router]);

    return (
        <main 
            className="min-h-screen w-screen relative flex flex-col items-center justify-center overflow-hidden bg-[#0A0F1C]"
            style={{
                backgroundImage: "url('/images/super_admin_bg_premium.png')",
                backgroundSize: "cover",
                backgroundPosition: "center",
                backgroundRepeat: "no-repeat"
            }}
        >
            {/* Ambient Overlays */}
            <div className="absolute inset-0 bg-slate-950/80 mix-blend-multiply z-0" aria-hidden="true" />
            <div className="absolute inset-0 bg-black/60 z-0" aria-hidden="true" />
            <div className="absolute inset-0 bg-gradient-to-br from-blue-900/10 via-transparent to-violet-900/10 z-0" aria-hidden="true" />
            
            <div className="relative z-10 w-full max-w-md px-6 sm:px-0">
                
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                >
                    {/* Logo / Header */}
                    <div className="flex flex-col items-center text-center mb-8">
                        <Link href="/" className="focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded-2xl transition-transform hover:scale-105" aria-label="Go to home page">
                            <div className="w-16 h-16 rounded-2xl bg-white/5 backdrop-blur-md border border-white/10 flex items-center justify-center shadow-[0_0_20px_rgba(59,130,246,0.15)] relative overflow-hidden group">
                                <div className="absolute inset-0 bg-gradient-to-tr from-blue-500/20 to-purple-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                                <ShieldCheck className="w-8 h-8 text-blue-400 relative z-10" strokeWidth={1.5} />
                            </div>
                        </Link>
                        <h1 className="text-3xl font-extrabold text-white mt-6 tracking-tight drop-shadow-md">
                            Super Admin Portal
                        </h1>
                        <p className="text-[15px] text-blue-100/60 mt-2 font-medium tracking-wide">
                            Secure system authentication
                        </p>
                    </div>

                    {/* Form Container */}
                    <form
                        onSubmit={handleSubmit}
                        className="bg-slate-900/40 backdrop-blur-2xl rounded-3xl border border-white/10 p-8 sm:p-10 shadow-[0_8px_40px_-12px_rgba(0,0,0,0.6)] relative overflow-hidden"
                        noValidate
                    >
                        {/* Subtle inner highlight */}
                        <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent pointer-events-none rounded-3xl" />

                        <AnimatePresence>
                            {error && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, height: 'auto', scale: 1 }}
                                    exit={{ opacity: 0, height: 0, scale: 0.95 }}
                                    className="overflow-hidden mb-6"
                                >
                                    <div role="alert" className="bg-red-500/10 backdrop-blur-md text-red-400 text-[14px] font-medium p-4 rounded-xl border border-red-500/20 flex items-start gap-3 shadow-inner">
                                        <svg className="w-5 h-5 shrink-0 mt-0.5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        <span className="leading-relaxed">{error}</span>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <div className="space-y-5 relative z-10">
                            <div>
                                <label htmlFor="sa-email" className="block text-[13px] font-semibold text-slate-300 mb-2 uppercase tracking-wider">
                                    Email Address
                                </label>
                                <input
                                    id="sa-email"
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="Enter your admin email"
                                    required
                                    autoComplete="email"
                                    disabled={isLoading}
                                    className="w-full rounded-xl bg-black/20 border border-white/10 text-white placeholder-slate-500 px-4 py-3.5 text-[15px] focus:bg-black/40 focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 focus:outline-none transition-all shadow-inner font-medium"
                                />
                            </div>

                            <div className="relative">
                                <label htmlFor="sa-password" className="block text-[13px] font-semibold text-slate-300 mb-2 uppercase tracking-wider">
                                    Password
                                </label>
                                <div className="relative">
                                    <input
                                        id="sa-password"
                                        type={showPassword ? "text" : "password"}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="••••••••••••"
                                        required
                                        autoComplete="current-password"
                                        disabled={isLoading}
                                        className="w-full rounded-xl bg-black/20 border border-white/10 text-white placeholder-slate-500 pl-4 pr-12 py-3.5 text-[15px] focus:bg-black/40 focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 focus:outline-none transition-all shadow-inner font-medium tracking-wide"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white focus:outline-none p-1.5 rounded-lg transition-colors"
                                        aria-label={showPassword ? "Hide password" : "Show password"}
                                    >
                                        {showPassword ? (
                                            <EyeOff className="w-5 h-5" strokeWidth={1.5} />
                                        ) : (
                                            <Eye className="w-5 h-5" strokeWidth={1.5} />
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="mt-8 relative z-10">
                            <button
                                type="submit"
                                disabled={isLoading || !email || !password}
                                aria-label="Sign in to super admin"
                                className="w-full h-12 bg-white text-slate-950 hover:bg-slate-100 font-bold tracking-wide rounded-xl shadow-[0_0_20px_rgba(255,255,255,0.1)] hover:shadow-[0_0_25px_rgba(255,255,255,0.2)] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 flex items-center justify-center gap-3 text-[15px] transform active:scale-[0.98]"
                            >
                                {isLoading ? (
                                    <>
                                        <span className="w-5 h-5 border-2 border-slate-950/20 border-t-slate-950 rounded-full animate-spin" aria-hidden="true" />
                                        <span>Authenticating...</span>
                                    </>
                                ) : (
                                    "Authenticate"
                                )}
                            </button>
                        </div>

                        <div className="mt-8 pt-6 border-t border-white/10 flex justify-center relative z-10">
                            <p className="text-[13px] text-slate-400 font-medium">
                                Regular admin?{" "}
                                <Link href="/login" className="text-blue-400 hover:text-blue-300 font-bold hover:underline underline-offset-4 transition-colors">
                                    Sign in here
                                </Link>
                            </p>
                        </div>
                    </form>
                </motion.div>
                
                <motion.p 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.4, duration: 0.6 }}
                    className="text-center text-[13px] text-white/40 mt-8 font-medium tracking-wide"
                >
                    © {new Date().getFullYear()} Q4Queue Systems. All rights reserved.
                </motion.p>
            </div>
        </main>
    );
}
