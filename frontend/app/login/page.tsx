"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Eye, EyeOff, Mail, Lock, KeyRound, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { api, ApiError } from "@/lib/api";
import { ContactSalesModal } from "@/components/ContactSalesModal";
import { Plus_Jakarta_Sans } from "next/font/google";

const plusJakarta = Plus_Jakarta_Sans({
    subsets: ["latin"],
    weight: ["400", "500", "600", "700", "800"],
    display: "swap",
});

export default function LoginPage() {
    const router = useRouter();
    const { login, isLoading, error, isAuthenticated, isHydrated, user } = useAuth();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [showSales, setShowSales] = useState(false);

    // Forgot Password Flow States
    const [viewMode, setViewMode] = useState<"login" | "request_otp" | "verify_otp">("login");
    const [forgotEmail, setForgotEmail] = useState("");
    const [otp, setOtp] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [isSubmittingForgot, setIsSubmittingForgot] = useState(false);
    const [forgotError, setForgotError] = useState<string | null>(null);
    const [bannerMessage, setBannerMessage] = useState<string | null>(null);
    const trialExpired = Boolean(error?.startsWith("Your free trial has ended"));

    useEffect(() => {
        if (typeof window !== "undefined") {
            const params = new URLSearchParams(window.location.search);
            const errParam = params.get("error");
            if (errParam === "account_suspended") {
                setBannerMessage("This account has been suspended by an administrator. Please contact support at contact@q4queue.com to restore access.");
                toast.error("This account has been suspended by an administrator.", {
                    duration: 8000,
                });
                window.history.replaceState({}, document.title, window.location.pathname);
            } else if (errParam === "account_deactivated") {
                setBannerMessage("Your account has been deactivated by an administrator. Please contact your administrator for assistance.");
                toast.error("Your account has been deactivated by an administrator.", {
                    duration: 8000,
                });
                window.history.replaceState({}, document.title, window.location.pathname);
            } else if (errParam === "deactivated") {
                setBannerMessage("This branch has been deactivated by the organization admin.");
                toast.error("This branch has been deactivated by the organization admin.", {
                    duration: 8000,
                });
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
            await login({ email, password, login_type: "staff" });
        } catch {
            // Error is handled in useAuth hook
        }
    }, [login, email, password]);

    const handleRequestOtp = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!forgotEmail) return;
        setIsSubmittingForgot(true);
        setForgotError(null);

        try {
            const res = await api.requestForgotPasswordOtp({
                email: forgotEmail,
            });
            toast.success(res.message || "OTP sent to your email!");
            setViewMode("verify_otp");
        } catch (err: unknown) {
            setForgotError(err instanceof ApiError ? err.detail : "Failed to send OTP. Please try again.");
        } finally {
            setIsSubmittingForgot(false);
        }
    };

    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!otp || !newPassword) return;
        if (newPassword !== confirmPassword) {
            setForgotError("New password and confirm password do not match.");
            return;
        }
        if (newPassword.length < 8) {
            setForgotError("Password must be at least 8 characters long.");
            return;
        }

        setIsSubmittingForgot(true);
        setForgotError(null);

        try {
            const res = await api.resetPasswordWithOtp({
                email: forgotEmail,
                otp,
                new_password: newPassword,
            });
            toast.success(res.message || "Password reset successfully!");
            setEmail(forgotEmail);
            setViewMode("login");
        } catch (err: unknown) {
            setForgotError(err instanceof ApiError ? err.detail : "Failed to reset password. Please check your OTP.");
        } finally {
            setIsSubmittingForgot(false);
        }
    };

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

                {/* Top Marketing Copy (Correctly Positioned in Ambient Upper-Left Space) */}
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

                {/* Full-Bleed 1:1 Queue Hero Illustration (Fills Entire Left Panel with Zero Empty Bands) */}
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
                {/* Subtle soft tint to give card depth without washing out the art */}
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
                    {/* MODE 1: Standard Login Form */}
                    {viewMode === "login" && (
                        <>
                            <div className="mb-4 sm:mb-5 xl:mb-6 flex flex-col items-start">
                                <h2 className="text-[26px] xl:text-[29px] font-extrabold text-[#0A1128] tracking-[-0.025em] leading-tight">
                                    Welcome Back
                                </h2>
                                <p className="text-[13.5px] xl:text-[14px] text-[#64748B] mt-1 font-normal">
                                    Sign in to manage your queues and business.
                                </p>
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-3.5" noValidate>
                                <AnimatePresence>
                                    {(error || bannerMessage) && (
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
                                                <span className="leading-snug">{error || bannerMessage}</span>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>

                                {/* Email Field */}
                                <div className="space-y-1.5">
                                    <label htmlFor="email" className="block text-[13px] font-semibold text-[#1E293B]">
                                        Email address
                                    </label>
                                    <div className="relative flex items-center rounded-xl border border-slate-200/90 bg-white hover:border-slate-300 focus-within:border-[#3849FC] focus-within:ring-4 focus-within:ring-[#3849FC]/12 transition-all shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
                                        <div className="pl-3.5 text-slate-400 pointer-events-none flex items-center justify-center">
                                            <Mail className="w-[17px] h-[17px]" strokeWidth={1.8} />
                                        </div>
                                        <input
                                            id="email"
                                            type="email"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            required
                                            autoComplete="email"
                                            placeholder="Enter your email address"
                                            className="w-full rounded-xl bg-transparent pl-2.5 pr-3.5 py-2.5 xl:py-3 text-[14.5px] font-normal text-slate-900 outline-none placeholder:text-slate-400/90 transition-all"
                                            disabled={isLoading}
                                        />
                                    </div>
                                </div>

                                {/* Password Field */}
                                <div className="space-y-1.5">
                                    <label htmlFor="password" title="Password" className="block text-[13px] font-semibold text-[#1E293B]">
                                        Password
                                    </label>
                                    <div className="relative flex items-center rounded-xl border border-slate-200/90 bg-white hover:border-slate-300 focus-within:border-[#3849FC] focus-within:ring-4 focus-within:ring-[#3849FC]/12 transition-all shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
                                        <div className="pl-3.5 text-slate-400 pointer-events-none flex items-center justify-center">
                                            <Lock className="w-[17px] h-[17px]" strokeWidth={1.8} />
                                        </div>
                                        <input
                                            id="password"
                                            type={showPassword ? "text" : "password"}
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            required
                                            autoComplete="current-password"
                                            placeholder="Enter your password"
                                            className="w-full rounded-xl bg-transparent pl-2.5 pr-10 py-2.5 xl:py-3 text-[14.5px] font-normal text-slate-900 outline-none placeholder:text-slate-400/90 transition-all"
                                            disabled={isLoading}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none p-1 rounded-md transition-colors"
                                            aria-label={showPassword ? "Hide password" : "Show password"}
                                            disabled={isLoading}
                                        >
                                            {showPassword ? <EyeOff className="w-[17px] h-[17px]" strokeWidth={1.8} /> : <Eye className="w-[17px] h-[17px]" strokeWidth={1.8} />}
                                        </button>
                                    </div>
                                </div>

                                {/* Forgot Password Link (Right-aligned) */}
                                <div className="flex justify-end pt-0.5">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setForgotEmail(email);
                                            setViewMode("request_otp");
                                        }}
                                        className="text-[12.5px] font-semibold text-[#3849FC] hover:text-[#2A3BF0] transition-colors cursor-pointer"
                                    >
                                        Forgot password?
                                    </button>
                                </div>

                                {/* Primary Login Button */}
                                <button
                                    type="submit"
                                    disabled={isLoading || !email || !password}
                                    aria-label="Login"
                                    className="w-full h-11 xl:h-12 mt-1.5 bg-[#3849FC] hover:bg-[#2A3BF0] active:bg-[#2031E0] text-white font-bold text-[14.5px] xl:text-[15px] rounded-xl transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#3849FC] focus-visible:ring-offset-2 shadow-sm hover:shadow active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
                                >
                                    {isLoading ? (
                                        <>
                                            <svg className="animate-spin h-4 w-4 text-white mr-1.5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                            Logging in...
                                        </>
                                    ) : (
                                        "Login"
                                    )}
                                </button>
                            </form>

                            {trialExpired && (
                                <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-2.5 text-center">
                                    <p className="text-xs leading-4 text-amber-800">Your workspace and customer data have been preserved.</p>
                                    <button type="button" onClick={() => setShowSales(true)} className="mt-1.5 inline-flex h-8 items-center justify-center rounded-lg bg-[#3849FC] px-3.5 text-xs font-bold text-white hover:bg-[#2A3BF0]">
                                        Contact sales to continue
                                    </button>
                                </div>
                            )}

                            {/* Footer: Register Link */}
                            <div className="mt-5 text-center text-[13px] text-[#64748B]">
                                Don’t have an account?{" "}
                                <Link href="/signup" className="font-bold text-[#3849FC] hover:text-[#2A3BF0] transition-colors">
                                    Register
                                </Link>
                            </div>

                            {/* Organization Portal Link */}
                            <div className="mt-6 pt-4 border-t border-slate-100 flex flex-col items-center">
                                <Link 
                                    href="/organization-login" 
                                    className="group flex items-center justify-center gap-1.5 text-[13px] font-medium text-slate-500 hover:text-[#3849FC] transition-colors"
                                >
                                    Are you an Organization?
                                    <span className="flex items-center gap-0.5 font-bold text-[#3849FC]">
                                        Login here <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                                    </span>
                                </Link>
                            </div>
                        </>
                    )}

                    {/* MODE 2: Request OTP */}
                    {viewMode === "request_otp" && (
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                            <div className="mb-6 flex flex-col items-start">
                                <div className="w-10 h-10 rounded-xl bg-[#EAF1FF] flex items-center justify-center text-[#3849FC] mb-3 border border-[#3849FC]/15">
                                    <Mail className="w-5 h-5" />
                                </div>
                                <h2 className="text-[26px] font-extrabold text-[#0A1128] tracking-tight">
                                    Reset Password
                                </h2>
                                <p className="text-[14px] text-[#64748B] mt-1">
                                    Enter your email to receive a 6-digit verification code.
                                </p>
                            </div>

                            <form onSubmit={handleRequestOtp} className="space-y-4" noValidate>
                                {forgotError && (
                                    <div role="alert" className="bg-red-50 text-red-600 text-xs font-medium p-3 rounded-xl border border-red-100">
                                        {forgotError}
                                    </div>
                                )}

                                <div className="space-y-1.5">
                                    <label className="block text-[13px] font-semibold text-[#1E293B]">Account Email</label>
                                    <input
                                        type="email"
                                        value={forgotEmail}
                                        onChange={(e) => setForgotEmail(e.target.value)}
                                        required
                                        placeholder="admin@example.com"
                                        className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-[15px] text-slate-900 focus:border-[#3849FC] focus:ring-4 focus:ring-[#3849FC]/12 outline-none transition-all placeholder:text-slate-400"
                                        disabled={isSubmittingForgot}
                                    />
                                </div>

                                <button
                                    type="submit"
                                    disabled={isSubmittingForgot || !forgotEmail}
                                    className="w-full h-12 mt-2 bg-[#3849FC] hover:bg-[#2A3BF0] text-white font-bold text-[14.5px] rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                                >
                                    {isSubmittingForgot ? "Sending Code..." : "Send Verification OTP"}
                                </button>
                            </form>

                            <div className="flex items-center justify-center mt-6">
                                <button
                                    type="button"
                                    onClick={() => setViewMode("login")}
                                    className="inline-flex items-center gap-1.5 text-[13px] font-medium text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
                                >
                                    <ArrowLeft className="w-3.5 h-3.5" /> Back to Login
                                </button>
                            </div>
                        </motion.div>
                    )}

                    {/* MODE 3: Verify OTP & New Password */}
                    {viewMode === "verify_otp" && (
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                            <div className="mb-6 flex flex-col items-start">
                                <div className="w-10 h-10 rounded-xl bg-[#EAF1FF] flex items-center justify-center text-[#3849FC] mb-3 border border-[#3849FC]/15">
                                    <KeyRound className="w-5 h-5" />
                                </div>
                                <h2 className="text-[26px] font-extrabold text-[#0A1128] tracking-tight">
                                    Enter Security Code
                                </h2>
                                <p className="text-[13px] text-[#64748B] mt-1">
                                    We sent a 6-digit code to <strong className="text-slate-900">{forgotEmail}</strong>.
                                </p>
                            </div>

                            <form onSubmit={handleResetPassword} className="space-y-4" noValidate>
                                {forgotError && (
                                    <div role="alert" className="bg-red-50 text-red-600 text-xs font-medium p-3 rounded-xl border border-red-100">
                                        {forgotError}
                                    </div>
                                )}

                                <div className="space-y-1.5">
                                    <label className="block text-[13px] font-semibold text-[#1E293B]">6-Digit Security OTP</label>
                                    <input
                                        type="text"
                                        maxLength={6}
                                        value={otp}
                                        onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                                        required
                                        placeholder="123456"
                                        className="w-full text-center tracking-[8px] font-mono text-xl rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-slate-900 focus:border-[#3849FC] focus:ring-4 focus:ring-[#3849FC]/12 outline-none transition-all placeholder:tracking-normal placeholder:font-sans placeholder:text-sm placeholder:text-slate-400"
                                        disabled={isSubmittingForgot}
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <label className="block text-[13px] font-semibold text-[#1E293B]">New Password</label>
                                    <div className="relative">
                                        <input
                                            type={showNewPassword ? "text" : "password"}
                                            value={newPassword}
                                            onChange={(e) => setNewPassword(e.target.value)}
                                            required
                                            placeholder="At least 8 characters"
                                            className="w-full rounded-xl border border-slate-200 bg-white pl-3.5 pr-10 py-3 text-[15px] text-slate-900 focus:border-[#3849FC] focus:ring-4 focus:ring-[#3849FC]/12 outline-none transition-all placeholder:text-slate-400"
                                            disabled={isSubmittingForgot}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowNewPassword(!showNewPassword)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none p-1 rounded-md"
                                        >
                                            {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                        </button>
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="block text-[13px] font-semibold text-[#1E293B]">Confirm New Password</label>
                                    <input
                                        type="password"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        required
                                        placeholder="Re-enter new password"
                                        className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-[15px] text-slate-900 focus:border-[#3849FC] focus:ring-4 focus:ring-[#3849FC]/12 outline-none transition-all placeholder:text-slate-400"
                                        disabled={isSubmittingForgot}
                                    />
                                </div>

                                <button
                                    type="submit"
                                    disabled={isSubmittingForgot || !otp || !newPassword || !confirmPassword}
                                    className="w-full h-12 mt-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[14.5px] rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                                >
                                    {isSubmittingForgot ? "Resetting Password..." : "Reset Password & Login"}
                                </button>
                            </form>

                            <div className="flex items-center justify-between mt-6 text-[13px]">
                                <button
                                    type="button"
                                    onClick={() => setViewMode("request_otp")}
                                    className="text-[#3849FC] hover:text-[#2A3BF0] font-semibold transition-colors cursor-pointer"
                                >
                                    Resend Code
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setViewMode("login")}
                                    className="inline-flex items-center gap-1.5 font-medium text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
                                >
                                    <ArrowLeft className="w-3.5 h-3.5" /> Back to Login
                                </button>
                            </div>
                        </motion.div>
                    )}

                    {showSales && <ContactSalesModal mode="expired" email={email.trim().toLowerCase()} organizationSlug="" password={password} onClose={() => setShowSales(false)} />}
                </motion.div>
            </div>
        </main>
    );
}

