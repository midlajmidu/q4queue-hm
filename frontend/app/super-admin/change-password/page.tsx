"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import { setToken, getCurrentUser } from "@/lib/auth";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Eye, EyeOff, Lock, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Source_Code_Pro } from "next/font/google";

const sourceCodePro = Source_Code_Pro({
    subsets: ["latin"],
    weight: ["400", "500", "600", "700", "800"],
    display: "swap",
});

export default function SuperAdminChangePasswordPage() {
    const router = useRouter();

    const [password, setPassword] = useState("");
    const [confirm, setConfirm] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);

    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [isChecking, setIsChecking] = useState(true);

    useEffect(() => {
        if (typeof window !== "undefined") {
            document.title = "Set New Password | Super Admin | Q4Queue";
        }

        const user = getCurrentUser();
        // If the user isn't logged in, redirect to login
        if (!user) {
            router.replace("/super-admin/login");
            return;
        }
        // If the user has already changed their password (is_first_login is false), redirect to dashboard
        if (user.is_first_login === false) {
            router.replace("/super-admin");
            return;
        }
        
        setIsChecking(false);
    }, [router]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (password.length < 8) {
            setError("Password must be at least 8 characters long.");
            return;
        }

        if (password !== confirm) {
            setError("Passwords do not match.");
            return;
        }

        setLoading(true);
        try {
            const resp = await api.changeFirstPassword({ new_password: password });
            
            // The backend returns a brand new token where is_first_login = false
            setToken(resp.access_token);
            toast.success("Super admin password updated successfully!");
            
            // Redirect to dashboard with hard reload to clear stale useAuth state
            window.location.href = "/super-admin";
        } catch (err) {
            if (err instanceof ApiError) {
                setError(err.detail);
            } else {
                setError("An unexpected error occurred. Please try again.");
            }
        } finally {
            setLoading(false);
        }
    };

    if (isChecking) {
        return (
            <div className={`force-light min-h-screen flex items-center justify-center bg-[#070C18] ${sourceCodePro.className}`}>
                <div className="w-10 h-10 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <main
            className={`relative min-h-[100dvh] w-full flex items-center justify-center px-4 sm:px-8 py-10 bg-[#070C18] overflow-x-hidden overflow-y-auto select-none selection:bg-[#2563EB]/30 selection:text-white ${sourceCodePro.className}`}
        >
            {/* Tech & Cybersecurity Doodle Watermark Wallpaper */}
            <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none select-none">
                <img
                    src="/images/super-admin-dense-doodle.jpg"
                    alt="Cybersecurity, Code, Server & Tech Doodles"
                    className="w-full h-full object-cover object-center opacity-[0.25] sm:opacity-[0.28] transition-opacity duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#070C18] via-transparent to-[#070C18]/85 pointer-events-none" />
                <div className="absolute inset-0 bg-gradient-to-r from-[#070C18]/60 via-transparent to-[#070C18]/60 pointer-events-none" />
                <div className="absolute inset-0 bg-[#070C18]/20 backdrop-blur-[0.5px] pointer-events-none" />
            </div>

            {/* Floating Glassmorphic Authentication Card */}
            <div className="relative z-10 w-full max-w-[420px] sm:max-w-[440px] mx-auto">
                <div className="absolute -inset-1.5 rounded-[32px] bg-gradient-to-br from-blue-500/25 via-indigo-600/15 to-cyan-500/20 blur-2xl opacity-70 pointer-events-none" />

                <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                    className={`relative rounded-[26px] sm:rounded-[28px] border border-white/[0.14] bg-[#0A1022]/80 backdrop-blur-2xl p-7 sm:p-9 md:p-10 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.8),inset_0_1px_1px_rgba(255,255,255,0.15)] flex flex-col items-center ${sourceCodePro.className}`}
                    style={{ fontFamily: sourceCodePro.style.fontFamily }}
                >
                    <div className="w-11 h-11 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 mb-3.5 shadow-inner">
                        <ShieldCheck className="w-6 h-6" />
                    </div>

                    <h1
                        className={`text-[21px] sm:text-[23px] font-bold text-white tracking-tight text-center ${sourceCodePro.className}`}
                        style={{ fontFamily: sourceCodePro.style.fontFamily }}
                    >
                        Set Super Admin Password
                    </h1>
                    <p
                        className="text-[12.5px] sm:text-[13px] text-slate-300/80 font-normal leading-relaxed text-center mt-2.5 mb-7 max-w-[340px]"
                        style={{ fontFamily: sourceCodePro.style.fontFamily }}
                    >
                        For platform security, initialize a new master password before accessing the system console.
                    </p>

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

                        {/* New Password */}
                        <div className="relative flex items-center h-12 w-full rounded-xl border border-white/10 bg-slate-900/60 hover:border-white/20 focus-within:border-[#2563EB] focus-within:ring-2 focus-within:ring-[#2563EB]/30 transition-all shadow-inner">
                            <Lock className="w-[18px] h-[18px] text-slate-400 ml-3.5 mr-3 shrink-0" strokeWidth={1.8} />
                            <input
                                id="super-admin-new-password"
                                type={showPassword ? "text" : "password"}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                autoComplete="new-password"
                                placeholder="New master password (min 8 chars)"
                                disabled={loading}
                                className="w-full h-full bg-transparent text-[14.5px] text-white placeholder:text-slate-400/70 outline-none pr-11"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors p-1"
                                aria-label={showPassword ? "Hide password" : "Show password"}
                                disabled={loading}
                            >
                                {showPassword ? (
                                    <EyeOff className="w-[17px] h-[17px]" strokeWidth={1.8} />
                                ) : (
                                    <Eye className="w-[17px] h-[17px]" strokeWidth={1.8} />
                                )}
                            </button>
                        </div>

                        {/* Confirm Password */}
                        <div className="relative flex items-center h-12 w-full rounded-xl border border-white/10 bg-slate-900/60 hover:border-white/20 focus-within:border-[#2563EB] focus-within:ring-2 focus-within:ring-[#2563EB]/30 transition-all shadow-inner">
                            <Lock className="w-[18px] h-[18px] text-slate-400 ml-3.5 mr-3 shrink-0" strokeWidth={1.8} />
                            <input
                                id="super-admin-confirm-password"
                                type={showConfirm ? "text" : "password"}
                                value={confirm}
                                onChange={(e) => setConfirm(e.target.value)}
                                required
                                autoComplete="new-password"
                                placeholder="Confirm master password"
                                disabled={loading}
                                className="w-full h-full bg-transparent text-[14.5px] text-white placeholder:text-slate-400/70 outline-none pr-11"
                            />
                            <button
                                type="button"
                                onClick={() => setShowConfirm(!showConfirm)}
                                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors p-1"
                                aria-label={showConfirm ? "Hide password" : "Show password"}
                                disabled={loading}
                            >
                                {showConfirm ? (
                                    <EyeOff className="w-[17px] h-[17px]" strokeWidth={1.8} />
                                ) : (
                                    <Eye className="w-[17px] h-[17px]" strokeWidth={1.8} />
                                )}
                            </button>
                        </div>

                        {/* Hint */}
                        <p className="text-[12px] text-slate-400 pt-0.5">
                            Password must be at least 8 characters long.
                        </p>

                        {/* Primary Submit CTA Button */}
                        <button
                            type="submit"
                            disabled={loading || !password || !confirm}
                            aria-label="Update master password"
                            style={{ fontFamily: sourceCodePro.style.fontFamily }}
                            className="w-full h-12 mt-2 rounded-xl bg-[#1D68FE] hover:bg-[#1557E0] active:bg-[#0E4BC9] text-white font-semibold text-[15px] flex items-center justify-center gap-2 shadow-[0_4px_20px_rgba(29,104,254,0.45)] hover:shadow-[0_6px_25px_rgba(29,104,254,0.6)] active:scale-[0.99] transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                        >
                            {loading ? (
                                <>
                                    <svg className="animate-spin h-4 w-4 text-white mr-1.5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Updating...
                                </>
                            ) : (
                                <>
                                    Set Password & Continue <ArrowRight className="w-4 h-4 ml-0.5" />
                                </>
                            )}
                        </button>
                    </form>

                    <div className="mt-8 text-center text-xs text-slate-500">
                        © {new Date().getFullYear()} Q4Queue Platform Infrastructure
                    </div>
                </motion.div>
            </div>
        </main>
    );
}
