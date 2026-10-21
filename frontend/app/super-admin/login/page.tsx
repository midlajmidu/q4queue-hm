"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import { setToken, isAuthenticated, getCurrentUser } from "@/lib/auth";
import { motion, AnimatePresence } from "framer-motion";
import { Eye, EyeOff, Mail, Lock, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { Source_Code_Pro } from "next/font/google";

const sourceCodePro = Source_Code_Pro({
    subsets: ["latin"],
    weight: ["400", "500", "600", "700", "800"],
    display: "swap",
});

export default function SuperAdminLoginPage() {
    const router = useRouter();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [rememberMe, setRememberMe] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Load remembered email on mount & set document title
    useEffect(() => {
        if (typeof window !== "undefined") {
            document.title = "Super Admin Portal | Q4Queue";
            const savedEmail = localStorage.getItem("super_admin_remember_email");
            if (savedEmail) {
                setEmail(savedEmail);
                setRememberMe(true);
            }

            const params = new URLSearchParams(window.location.search);
            const errParam = params.get("error");
            if (errParam === "account_suspended") {
                setError("This account has been suspended by an administrator. Please contact support at contact@q4queue.com to restore access.");
                window.history.replaceState({}, document.title, window.location.pathname);
            } else if (errParam === "account_deactivated") {
                setError("Your account has been deactivated by an administrator.");
                window.history.replaceState({}, document.title, window.location.pathname);
            }
        }

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

            if (rememberMe) {
                localStorage.setItem("super_admin_remember_email", email);
            } else {
                localStorage.removeItem("super_admin_remember_email");
            }

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
    }, [email, password, rememberMe, router]);

    const handleForgotPassword = () => {
        toast.info("Super Admin recovery requires server infrastructure access or contacting the master administrator.", {
            duration: 6000,
        });
    };

    return (
        <main
            className={`relative min-h-[100dvh] w-full flex items-center justify-center px-4 sm:px-8 py-10 bg-[#070C18] overflow-x-hidden overflow-y-auto select-none selection:bg-[#2563EB]/30 selection:text-white ${sourceCodePro.className}`}
        >
            {/* WhatsApp-Style Crowded Small Tech & Cybersecurity Doodle Watermark Wallpaper */}
            <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none select-none">
                <img
                    src="/images/super-admin-dense-doodle.jpg"
                    alt="Cybersecurity, Code, Server & Tech Doodles"
                    className="w-full h-full object-cover object-center opacity-[0.25] sm:opacity-[0.28] transition-opacity duration-700"
                />
                {/* Dark Mode Ambient Radial Vignette & Soft Gradient Wash */}
                <div className="absolute inset-0 bg-gradient-to-t from-[#070C18] via-transparent to-[#070C18]/85 pointer-events-none" />
                <div className="absolute inset-0 bg-gradient-to-r from-[#070C18]/60 via-transparent to-[#070C18]/60 pointer-events-none" />
                <div className="absolute inset-0 bg-[#070C18]/20 backdrop-blur-[0.5px] pointer-events-none" />
            </div>

            {/* Interactive Floating Glassmorphism Authentication Card */}
            <div className="relative z-10 w-full max-w-[420px] sm:max-w-[440px] mx-auto">
                {/* Subtle Ambient Electric Blue Aura Behind Card */}
                <div className="absolute -inset-1.5 rounded-[32px] bg-gradient-to-br from-blue-500/25 via-indigo-600/15 to-cyan-500/20 blur-2xl opacity-70 pointer-events-none" />

                <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                    className={`relative rounded-[26px] sm:rounded-[28px] border border-white/[0.14] bg-[#0A1022]/80 backdrop-blur-2xl p-7 sm:p-9 md:p-10 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.8),inset_0_1px_1px_rgba(255,255,255,0.15)] flex flex-col items-center ${sourceCodePro.className}`}
                    style={{ fontFamily: sourceCodePro.style.fontFamily }}
                >
                    {/* Portal Title & Subtitle */}
                    <h1
                        className={`text-[21px] sm:text-[23px] font-bold text-white tracking-tight text-center ${sourceCodePro.className}`}
                        style={{ fontFamily: sourceCodePro.style.fontFamily }}
                    >
                        Super Admin Portal
                    </h1>
                    <p
                        className="text-[12.5px] sm:text-[13px] text-slate-300/80 font-normal leading-relaxed text-center mt-2.5 mb-7 max-w-[340px]"
                        style={{ fontFamily: sourceCodePro.style.fontFamily }}
                    >
                        Secure access to manage the entire platform, organizations, and system settings.
                    </p>

                    {/* Authentication Form */}
                    <form onSubmit={handleSubmit} className="w-full space-y-4" noValidate>
                        <AnimatePresence>
                            {error && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0, scale: 0.96 }}
                                    animate={{ opacity: 1, height: "auto", scale: 1 }}
                                    exit={{ opacity: 0, height: 0, scale: 0.96 }}
                                    className="overflow-hidden"
                                >
                                    <div
                                        role="alert"
                                        className="bg-red-500/15 text-red-300 text-xs font-medium p-3 rounded-xl border border-red-500/30 flex items-start gap-2.5 backdrop-blur-md"
                                    >
                                        <svg
                                            className="w-4 h-4 shrink-0 mt-0.5 text-red-400"
                                            fill="none"
                                            viewBox="0 0 24 24"
                                            stroke="currentColor"
                                            strokeWidth={2}
                                        >
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                                            />
                                        </svg>
                                        <span className="leading-snug">{error}</span>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Email Input */}
                        <div className="relative flex items-center h-12 w-full rounded-xl border border-white/10 bg-slate-900/60 hover:border-white/20 focus-within:border-[#2563EB] focus-within:ring-2 focus-within:ring-[#2563EB]/30 transition-all shadow-inner">
                            <Mail className="w-[18px] h-[18px] text-slate-400 ml-3.5 mr-3 shrink-0" strokeWidth={1.8} />
                            <input
                                id="super-admin-email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                autoComplete="email"
                                placeholder="Enter your email address"
                                disabled={isLoading}
                                className="w-full h-full bg-transparent text-[14.5px] text-white placeholder:text-slate-400/70 outline-none pr-3.5"
                            />
                        </div>

                        {/* Password Input */}
                        <div className="relative flex items-center h-12 w-full rounded-xl border border-white/10 bg-slate-900/60 hover:border-white/20 focus-within:border-[#2563EB] focus-within:ring-2 focus-within:ring-[#2563EB]/30 transition-all shadow-inner">
                            <Lock className="w-[18px] h-[18px] text-slate-400 ml-3.5 mr-3 shrink-0" strokeWidth={1.8} />
                            <input
                                id="super-admin-password"
                                type={showPassword ? "text" : "password"}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                autoComplete="current-password"
                                placeholder="Enter your password"
                                disabled={isLoading}
                                className="w-full h-full bg-transparent text-[14.5px] text-white placeholder:text-slate-400/70 outline-none pr-11"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors p-1"
                                aria-label={showPassword ? "Hide password" : "Show password"}
                                disabled={isLoading}
                            >
                                {showPassword ? (
                                    <EyeOff className="w-[17px] h-[17px]" strokeWidth={1.8} />
                                ) : (
                                    <Eye className="w-[17px] h-[17px]" strokeWidth={1.8} />
                                )}
                            </button>
                        </div>

                        {/* Remember Me & Forgot Password Row */}
                        <div className="flex items-center justify-between pt-1 text-[13px]">
                            <label className="flex items-center gap-2 text-slate-300 text-[13px] font-normal cursor-pointer select-none">
                                <input
                                    type="checkbox"
                                    checked={rememberMe}
                                    onChange={(e) => setRememberMe(e.target.checked)}
                                    className="w-4 h-4 rounded border-white/20 bg-slate-800/80 text-[#2563EB] focus:ring-0 focus:ring-offset-0 cursor-pointer accent-[#2563EB]"
                                />
                                <span>Remember me</span>
                            </label>

                            <button
                                type="button"
                                onClick={handleForgotPassword}
                                className="text-[#3B82F6] hover:text-blue-300 transition-colors font-medium text-[13px] cursor-pointer"
                            >
                                Forgot password?
                            </button>
                        </div>

                        {/* Primary Submit CTA Button */}
                        <button
                            type="submit"
                            disabled={isLoading || !email || !password}
                            aria-label="Login to Super Admin Portal"
                            style={{ fontFamily: sourceCodePro.style.fontFamily }}
                            className="w-full h-12 mt-2 rounded-xl bg-[#1D68FE] hover:bg-[#1557E0] active:bg-[#0E4BC9] text-white font-semibold text-[15px] flex items-center justify-center gap-2 shadow-[0_4px_20px_rgba(29,104,254,0.45)] hover:shadow-[0_6px_25px_rgba(29,104,254,0.6)] active:scale-[0.99] transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                        >
                            {isLoading ? (
                                <>
                                    <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24">
                                        <circle
                                            className="opacity-25"
                                            cx="12"
                                            cy="12"
                                            r="10"
                                            stroke="currentColor"
                                            strokeWidth="4"
                                            fill="none"
                                        />
                                        <path
                                            className="opacity-75"
                                            fill="currentColor"
                                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                        />
                                    </svg>
                                    <span>Authenticating...</span>
                                </>
                            ) : (
                                <>
                                    <span>Login</span>
                                    <ArrowRight className="w-4 h-4 stroke-[2.2]" />
                                </>
                            )}
                        </button>
                    </form>
                </motion.div>
            </div>
        </main>
    );
}

