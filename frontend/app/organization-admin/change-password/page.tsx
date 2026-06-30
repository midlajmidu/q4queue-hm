"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import { setToken, getCurrentUser } from "@/lib/auth";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Eye, EyeOff } from "lucide-react";

export default function OrganizationAdminChangePasswordPage() {
    const router = useRouter();

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
            router.replace(`/organization-admin`);
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
            // We must update our local storage to clear the "first login" state
            setToken(resp.access_token);
            
            // Redirect to dashboard with hard reload to clear stale useAuth state
            window.location.href = `/organization-admin`;
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
            <div className="force-light min-h-screen flex items-center justify-center bg-slate-50">
                <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <main className="force-light min-h-screen w-full flex bg-white h-screen overflow-hidden">
            {/* Left Column - Form */}
            <div className="w-full lg:w-[45%] flex flex-col justify-center px-8 sm:px-12 lg:px-20 py-4 relative overflow-y-auto">
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                    className="w-full max-w-md mx-auto flex flex-col justify-center h-full my-auto"
                >
                    <div className="mb-6 flex flex-col items-start">
                        <Link href="/" className="inline-block focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded-lg" aria-label="Go to home page">
                            <Image src="/q4queue-main-logo.png" alt="Q4Queue Logo" width={180} height={45} className="h-9 w-auto object-contain" priority />
                        </Link>
                        <h1 className="font-heading text-2xl font-bold text-slate-900 mt-6 tracking-tight">
                            Secure Your Account
                        </h1>
                        <p className="text-sm text-slate-500 mt-1">
                            For security reasons, please change your password before accessing the enterprise dashboard.
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

                        {/* New Password */}
                        <div>
                            <div className="flex items-center justify-between mb-1.5">
                                <label className="block text-xs font-bold text-slate-900">New Password</label>
                            </div>
                            <div className="relative">
                                <input
                                    type={showPassword ? "text" : "password"}
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    className="w-full rounded-xl border-2 border-slate-200 bg-white pl-4 pr-12 py-2.5 text-sm text-slate-900 focus:border-indigo-600 focus:ring-0 outline-none transition-all placeholder:text-slate-400 font-medium"
                                    disabled={loading}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none p-1.5 rounded-md transition-colors"
                                    aria-label={showPassword ? "Hide password" : "Show password"}
                                    disabled={loading}
                                >
                                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                </button>
                            </div>
                        </div>

                        {/* Confirm Password */}
                        <div>
                            <div className="flex items-center justify-between mb-1.5">
                                <label className="block text-xs font-bold text-slate-900">Confirm New Password</label>
                            </div>
                            <div className="relative">
                                <input
                                    type={showConfirm ? "text" : "password"}
                                    required
                                    value={confirm}
                                    onChange={(e) => setConfirm(e.target.value)}
                                    placeholder="••••••••"
                                    className="w-full rounded-xl border-2 border-slate-200 bg-white pl-4 pr-12 py-2.5 text-sm text-slate-900 focus:border-indigo-600 focus:ring-0 outline-none transition-all placeholder:text-slate-400 font-medium"
                                    disabled={loading}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowConfirm(!showConfirm)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none p-1.5 rounded-md transition-colors"
                                    aria-label={showConfirm ? "Hide password" : "Show password"}
                                    disabled={loading}
                                >
                                    {showConfirm ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                </button>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading || !password || !confirm}
                            className="w-full h-11 mt-4 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center shadow-sm"
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
                </motion.div>
            </div>

            {/* Right Column - Graphic */}
            <div className="hidden lg:flex lg:w-[55%] p-4 pl-0">
                <div className="w-full h-full rounded-[1.5rem] overflow-hidden relative shadow-2xl">
                    <motion.div 
                        initial={{ opacity: 0, scale: 1.05 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.8, ease: "easeOut" }}
                        className="absolute inset-0 w-full h-full"
                    >
                        <Image 
                            src="/images/org-login-hero.png" 
                            alt="Q4Queue Platform" 
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
