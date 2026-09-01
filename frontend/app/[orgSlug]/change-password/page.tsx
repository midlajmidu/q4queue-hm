"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import { setToken, getCurrentUser } from "@/lib/auth";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Eye, EyeOff, Lock } from "lucide-react";

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
            <div className="force-light min-h-screen flex items-center justify-center bg-[#0A0625]">
                <div className="w-10 h-10 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <main className="force-light min-h-screen w-full flex bg-[#0A0625] relative overflow-hidden h-[100dvh]">
            {/* Background Pattern - Wavy Lines & Radial Gradient */}
            <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(67,40,192,0.4)_0%,transparent_60%)]" />
                <div className="absolute inset-0 opacity-[0.15]">
                    <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
                        <defs>
                            <pattern id="waves-branch-pwd" width="200" height="200" patternUnits="userSpaceOnUse" patternTransform="scale(2) rotate(15)">
                                <path d="M 0,100 C 50,0 150,200 200,100" fill="none" stroke="#ffffff" strokeWidth="0.5" />
                                <path d="M 0,120 C 50,20 150,220 200,120" fill="none" stroke="#ffffff" strokeWidth="0.5" />
                                <path d="M 0,140 C 50,40 150,240 200,140" fill="none" stroke="#ffffff" strokeWidth="0.5" />
                                <path d="M 0,160 C 50,60 150,260 200,160" fill="none" stroke="#ffffff" strokeWidth="0.5" />
                                <path d="M 0,80 C 50,-20 150,180 200,80" fill="none" stroke="#ffffff" strokeWidth="0.5" />
                                <path d="M 0,60 C 50,-40 150,160 200,60" fill="none" stroke="#ffffff" strokeWidth="0.5" />
                            </pattern>
                        </defs>
                        <rect width="100%" height="100%" fill="url(#waves-branch-pwd)" />
                    </svg>
                </div>
            </div>

            {/* Left Column - Hero Branding Text */}
            <div className="hidden lg:flex w-1/2 flex-col justify-end p-20 z-10 text-white">
                <motion.div 
                    initial={{ opacity: 0, y: 20 }} 
                    animate={{ opacity: 1, y: 0 }} 
                    transition={{ duration: 0.8, ease: "easeOut" }}
                >
                    <h1 className="text-[52px] xl:text-[64px] font-medium leading-[1.1] tracking-tight mb-4">
                        Secure your<br />branch
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
                    className="w-full h-full bg-white rounded-3xl flex flex-col px-8 sm:px-12 lg:px-16 xl:px-24 py-10 relative overflow-y-auto hide-scrollbar shadow-[0_8px_40px_-12px_rgba(0,0,0,0.1)] border border-slate-100"
                >
                    <div className="w-full max-w-[420px] flex flex-col justify-center my-auto py-6">
                        {/* Logo */}
                        <div className="mb-8 sm:mb-10 -ml-9 sm:-ml-12">
                            <Link href="/" className="inline-block focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded-lg overflow-visible" aria-label="Go to home page">
                                <Image src="/q4queue-new_logo.png" alt="Q4Queue Logo" width={300} height={80} className="h-12 sm:h-14 w-auto object-contain origin-left scale-[2.7] sm:scale-[3.0]" priority />
                            </Link>
                        </div>

                        <div className="mb-8 flex flex-col items-start">
                            <h1 className="font-heading text-[28px] sm:text-[32px] font-bold text-slate-900 tracking-tight">
                                Set New Password
                            </h1>
                            <p className="text-[15px] text-slate-600 mt-2">
                                For security reasons, please change your password before accessing the branch dashboard.
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

                            {/* New Password */}
                            <div className="space-y-1.5">
                                <label htmlFor="new-password" title="New Password" className="block text-[13px] font-bold text-slate-800">
                                    New Password <span className="text-indigo-600">*</span>
                                </label>
                                <div className="relative flex items-center rounded-xl border-2 border-slate-300/80 bg-slate-50/50 hover:bg-slate-50/90 hover:border-slate-400 focus-within:border-indigo-600 focus-within:ring-4 focus-within:ring-indigo-500/10 focus-within:bg-white transition-all">
                                    <div className="pl-3.5 text-slate-400 pointer-events-none flex items-center justify-center">
                                        <Lock className="w-4 h-4" />
                                    </div>
                                    <input
                                        id="new-password"
                                        type={showPassword ? "text" : "password"}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                        autoComplete="new-password"
                                        placeholder="Enter at least 8 characters"
                                        className="w-full rounded-xl bg-transparent pl-2.5 pr-10 py-2.5 text-[15px] font-medium text-slate-900 outline-none placeholder:text-slate-400/70 placeholder:font-normal transition-all focus:placeholder:opacity-0"
                                        disabled={loading}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none p-1.5 rounded-md transition-colors"
                                        aria-label={showPassword ? "Hide password" : "Show password"}
                                        disabled={loading}
                                    >
                                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>
                            </div>

                            {/* Confirm Password */}
                            <div className="space-y-1.5">
                                <label htmlFor="confirm-password" title="Confirm New Password" className="block text-[13px] font-bold text-slate-800">
                                    Confirm New Password <span className="text-indigo-600">*</span>
                                </label>
                                <div className="relative flex items-center rounded-xl border-2 border-slate-300/80 bg-slate-50/50 hover:bg-slate-50/90 hover:border-slate-400 focus-within:border-indigo-600 focus-within:ring-4 focus-within:ring-indigo-500/10 focus-within:bg-white transition-all">
                                    <div className="pl-3.5 text-slate-400 pointer-events-none flex items-center justify-center">
                                        <Lock className="w-4 h-4" />
                                    </div>
                                    <input
                                        id="confirm-password"
                                        type={showConfirm ? "text" : "password"}
                                        value={confirm}
                                        onChange={(e) => setConfirm(e.target.value)}
                                        required
                                        autoComplete="new-password"
                                        placeholder="Re-enter your password"
                                        className="w-full rounded-xl bg-transparent pl-2.5 pr-10 py-2.5 text-[15px] font-medium text-slate-900 outline-none placeholder:text-slate-400/70 placeholder:font-normal transition-all focus:placeholder:opacity-0"
                                        disabled={loading}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowConfirm(!showConfirm)}
                                        className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none p-1.5 rounded-md transition-colors"
                                        aria-label={showConfirm ? "Hide password" : "Show password"}
                                        disabled={loading}
                                    >
                                        {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={loading || !password || !confirm}
                                aria-label="Update and continue"
                                className="w-full h-12 mt-3 bg-slate-100 text-slate-400 border border-slate-200 font-bold text-[15px] rounded-xl transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2 enabled:bg-indigo-600 enabled:text-white enabled:border-transparent enabled:hover:bg-indigo-700 enabled:shadow-md enabled:shadow-indigo-500/20 enabled:active:scale-[0.99] disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {loading ? (
                                    <>
                                        <svg className="animate-spin h-4 w-4 text-white mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        Updating...
                                    </>
                                ) : (
                                    <>
                                        Update & Continue <ArrowRight className="w-4 h-4 ml-1" />
                                    </>
                                )}
                            </button>
                        </form>

                        <p className="text-center text-xs text-slate-400 mt-8 mb-2">
                            © {new Date().getFullYear()} Q4Queue
                        </p>
                    </div>
                </motion.div>
            </div>
        </main>
    );
}
