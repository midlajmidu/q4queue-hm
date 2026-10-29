"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import { setToken, getCurrentUser } from "@/lib/auth";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Eye, EyeOff, Lock } from "lucide-react";
import { toast } from "sonner";
import { Plus_Jakarta_Sans } from "next/font/google";

const plusJakarta = Plus_Jakarta_Sans({
    subsets: ["latin"],
    weight: ["400", "500", "600", "700", "800"],
    display: "swap",
});

export default function ChangePasswordPage() {
    const router = useRouter();
    const params = useParams();
    const orgSlug = params.orgSlug as string;

    const [password, setPassword] = useState("");
    const [confirm, setConfirm] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [isChecking, setIsChecking] = useState(true);

    useEffect(() => {
        const user = getCurrentUser();
        // If the user isn't logged in, redirect to login
        if (!user) {
            router.replace("/login");
            return;
        }
        // If the user has already changed their password (is_first_login is false), redirect to dashboard
        if (user.is_first_login === false) {
            router.replace(`/${orgSlug}/dashboard`);
            return;
        }
        
        setIsChecking(false);
    }, [router, orgSlug]);

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
            toast.success("Password updated successfully!");
            
            // Redirect to dashboard with hard reload to clear stale auth state
            window.location.href = `/${orgSlug}/dashboard`;
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
            <div className={`force-light min-h-screen flex items-center justify-center bg-[#F8FBFF] ${plusJakarta.className}`}>
                <div className="w-10 h-10 border-4 border-[#3849FC]/20 border-t-[#3849FC] rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <main className={`force-light min-h-[100dvh] lg:h-screen lg:max-h-screen w-full flex flex-col lg:flex-row bg-white sm:bg-[#F8FBFF] lg:bg-white relative overflow-y-auto lg:overflow-hidden select-none selection:bg-[#3849FC]/15 selection:text-[#0A1128] ${plusJakarta.className}`}>
            {/* ---------------------------------------------------- */}
            {/* LEFT SECTION: Queue Illustration & Hero Marketing (Desktop Only) */}
            {/* ---------------------------------------------------- */}
            <div className="hidden lg:flex relative lg:w-[57%] xl:w-[58%] 2xl:w-[60%] lg:h-full lg:max-h-screen flex-col justify-start items-start bg-[#F8FBFF] overflow-hidden shrink-0">
                {/* Subtle Ambient Depth Glows */}
                <div className="absolute inset-0 pointer-events-none z-0">
                    <div className="absolute -top-20 -left-20 w-80 h-80 rounded-full bg-[#3849FC]/5 blur-3xl" />
                    <div className="absolute bottom-10 right-10 w-96 h-96 rounded-full bg-[#3B82F6]/5 blur-3xl" />
                </div>

                {/* Top Marketing Copy (Positioned in Ambient Upper-Left Space) */}
                <motion.div 
                    initial={{ opacity: 0, y: 14 }} 
                    animate={{ opacity: 1, y: 0 }} 
                    transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                    className="relative z-30 pt-10 sm:pt-12 lg:pt-14 xl:pt-18 px-8 sm:px-12 lg:px-14 xl:px-18 w-full max-w-[640px]"
                >
                    <h1 className="text-[32px] sm:text-[36px] lg:text-[40px] xl:text-[44px] 2xl:text-[48px] font-extrabold tracking-[-0.035em] text-[#0A1128] leading-[1.12]">
                        Smarter Queues<br />
                        <span className="text-[#3849FC] inline-block whitespace-nowrap">Happier Customers</span>
                    </h1>
                    <p className="mt-3.5 sm:mt-4 text-[14.5px] sm:text-[15px] xl:text-[16px] text-[#5E6582] leading-[1.6] font-normal max-w-[480px]">
                        Streamline customer flow, reduce waiting time<br className="hidden sm:inline" /> and manage your business efficiently.
                    </p>
                </motion.div>

                {/* Full-Bleed 1:1 Queue Hero Illustration */}
                <div className="absolute inset-0 w-full h-full flex items-end justify-center pointer-events-none overflow-hidden z-10">
                    <img 
                        src="/images/queue-hero-seamless@2x.png" 
                        alt="Queue Management Customer Service Environment" 
                        className="w-full h-full object-cover object-bottom select-none"
                        loading="eager"
                    />
                </div>

                {/* Signature Organic S-Shaped Curved Divider (Desktop) */}
                <div className="hidden lg:block absolute top-0 bottom-0 right-0 w-20 xl:w-28 2xl:w-32 h-full pointer-events-none z-20 overflow-hidden">
                    <svg 
                        viewBox="0 0 120 1000" 
                        preserveAspectRatio="none" 
                        className="w-full h-full" 
                        aria-hidden="true"
                    >
                        {/* Layer 1: Soft Pale-Blue Shadow / Ambient Edge */}
                        <path 
                            d="M 45 0 C 40 160, 18 280, 20 420 C 22 560, 68 640, 65 780 C 62 890, 36 940, 40 1000 L 120 1000 L 120 0 Z" 
                            fill="#E0EAFF" 
                            opacity="0.65" 
                        />
                        {/* Layer 2: Intermediate Soft Tint */}
                        <path 
                            d="M 65 0 C 60 160, 40 280, 42 420 C 44 560, 88 640, 85 780 C 82 890, 58 940, 62 1000 L 120 1000 L 120 0 Z" 
                            fill="#EEF4FF" 
                            opacity="0.85" 
                        />
                        {/* Layer 3: Crisp Pure White Wave Boundary */}
                        <path 
                            d="M 85 0 C 80 160, 62 280, 64 420 C 66 560, 106 640, 104 780 C 102 890, 80 940, 84 1000 L 120 1000 L 120 0 Z" 
                            fill="#FFFFFF" 
                        />
                    </svg>
                </div>
            </div>

            {/* ---------------------------------------------------- */}
            {/* TABLET / MEDIUM AMBIENT HERO WATERMARK BACKGROUND (sm to lg) */}
            {/* ---------------------------------------------------- */}
            <div className="hidden sm:block lg:hidden absolute inset-0 overflow-hidden pointer-events-none z-0 select-none">
                <img 
                    src="/images/queue-hero-seamless@2x.png" 
                    alt="" 
                    aria-hidden="true"
                    className="w-full h-full object-cover object-center opacity-60 sm:opacity-65"
                />
                <div className="absolute inset-0 bg-slate-900/5 backdrop-blur-[1px]" />
            </div>

            {/* ---------------------------------------------------- */}
            {/* RIGHT SECTION: Polished Authentication Form Container */}
            {/* ---------------------------------------------------- */}
            <div className="relative w-full lg:w-[43%] xl:w-[42%] 2xl:w-[40%] bg-white sm:bg-transparent lg:bg-white flex flex-col justify-center items-center px-6 sm:px-10 lg:px-8 xl:px-14 py-8 sm:py-10 lg:py-6 z-10 min-h-[100dvh] lg:min-h-0 lg:h-full lg:max-h-screen overflow-y-auto lg:overflow-hidden">
                <motion.div 
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                    className="relative z-10 w-full max-w-[390px] sm:max-w-[430px] md:max-w-[450px] lg:max-w-[390px] xl:max-w-[400px] mx-auto my-auto flex flex-col justify-center bg-transparent sm:bg-white/95 backdrop-none sm:backdrop-blur-xl lg:bg-transparent lg:backdrop-blur-none border-none sm:border sm:border-slate-200/80 lg:border-none rounded-none sm:rounded-3xl p-0 sm:py-8 sm:px-8 md:py-8 md:px-9 lg:p-0 shadow-none sm:shadow-[0_20px_60px_-15px_rgba(0,0,0,0.15)] lg:shadow-none"
                >
                    <div className="mb-4 sm:mb-5 xl:mb-6 flex flex-col items-start">
                        <h2 className="text-[26px] xl:text-[29px] font-extrabold text-[#0A1128] tracking-[-0.025em] leading-tight">
                            Set New Password
                        </h2>
                        <p className="text-[13.5px] xl:text-[14px] text-[#64748B] mt-1.5 font-normal">
                            For security reasons, please change your password before accessing the branch dashboard.
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-3.5" noValidate>
                        <AnimatePresence>
                            {error && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0, scale: 0.96 }}
                                    animate={{ opacity: 1, height: 'auto', scale: 1 }}
                                    exit={{ opacity: 0, height: 0, scale: 0.96 }}
                                    className="overflow-hidden"
                                >
                                    <div role="alert" className="bg-red-50 text-red-600 text-xs font-medium p-3 rounded-xl border border-red-100 flex items-start gap-2.5">
                                        <svg className="w-4 h-4 shrink-0 mt-0.5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        <span className="leading-snug">{error}</span>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* New Password Field */}
                        <div className="space-y-1.5">
                            <label htmlFor="new-password" title="New Password" className="block text-[13px] font-semibold text-[#1E293B]">
                                New Password
                            </label>
                            <div className="relative flex items-center rounded-xl border border-slate-200/90 bg-white hover:border-slate-300 focus-within:border-[#3849FC] focus-within:ring-4 focus-within:ring-[#3849FC]/12 transition-all shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
                                <div className="pl-3.5 text-slate-400 pointer-events-none flex items-center justify-center">
                                    <Lock className="w-[17px] h-[17px]" strokeWidth={1.8} />
                                </div>
                                <input
                                    id="new-password"
                                    type={showPassword ? "text" : "password"}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    autoComplete="new-password"
                                    placeholder="Enter at least 8 characters"
                                    className="w-full rounded-xl bg-transparent pl-2.5 pr-10 py-2.5 xl:py-3 text-[14.5px] font-normal text-slate-900 outline-none placeholder:text-slate-400/90 transition-all"
                                    disabled={loading}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none p-1 rounded-md transition-colors"
                                    aria-label={showPassword ? "Hide password" : "Show password"}
                                    disabled={loading}
                                >
                                    {showPassword ? <EyeOff className="w-[17px] h-[17px]" strokeWidth={1.8} /> : <Eye className="w-[17px] h-[17px]" strokeWidth={1.8} />}
                                </button>
                            </div>
                        </div>

                        {/* Confirm Password Field */}
                        <div className="space-y-1.5">
                            <label htmlFor="confirm-password" title="Confirm New Password" className="block text-[13px] font-semibold text-[#1E293B]">
                                Confirm New Password
                            </label>
                            <div className="relative flex items-center rounded-xl border border-slate-200/90 bg-white hover:border-slate-300 focus-within:border-[#3849FC] focus-within:ring-4 focus-within:ring-[#3849FC]/12 transition-all shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
                                <div className="pl-3.5 text-slate-400 pointer-events-none flex items-center justify-center">
                                    <Lock className="w-[17px] h-[17px]" strokeWidth={1.8} />
                                </div>
                                <input
                                    id="confirm-password"
                                    type={showConfirm ? "text" : "password"}
                                    value={confirm}
                                    onChange={(e) => setConfirm(e.target.value)}
                                    required
                                    autoComplete="new-password"
                                    placeholder="Re-enter your password"
                                    className="w-full rounded-xl bg-transparent pl-2.5 pr-10 py-2.5 xl:py-3 text-[14.5px] font-normal text-slate-900 outline-none placeholder:text-slate-400/90 transition-all"
                                    disabled={loading}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowConfirm(!showConfirm)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none p-1 rounded-md transition-colors"
                                    aria-label={showConfirm ? "Hide password" : "Show password"}
                                    disabled={loading}
                                >
                                    {showConfirm ? <EyeOff className="w-[17px] h-[17px]" strokeWidth={1.8} /> : <Eye className="w-[17px] h-[17px]" strokeWidth={1.8} />}
                                </button>
                            </div>
                        </div>

                        {/* Hint */}
                        <p className="text-[12px] text-[#64748B] pt-0.5">
                            Password must be at least 8 characters long.
                        </p>

                        {/* Submit CTA */}
                        <button
                            type="submit"
                            disabled={loading || !password || !confirm}
                            aria-label="Update and continue"
                            className="w-full h-11 xl:h-12 mt-1.5 bg-[#3849FC] hover:bg-[#2A3BF0] active:bg-[#2031E0] text-white font-bold text-[14.5px] xl:text-[15px] rounded-xl transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#3849FC] focus-visible:ring-offset-2 shadow-sm hover:shadow active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
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
                                    Update & Continue <ArrowRight className="w-4 h-4 ml-0.5" />
                                </>
                            )}
                        </button>
                    </form>

                    {/* Footer */}
                    <div className="mt-8 text-center text-xs text-slate-400">
                        © {new Date().getFullYear()} Q4Queue
                    </div>
                </motion.div>
            </div>
        </main>
    );
}
