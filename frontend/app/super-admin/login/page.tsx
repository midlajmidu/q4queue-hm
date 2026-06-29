"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api, ApiError } from "@/lib/api";
import { setToken, isAuthenticated, getCurrentUser } from "@/lib/auth";

export default function SuperAdminLoginPage() {
    const router = useRouter();
    const [email, setEmail] = useState("super@gmail.com");
    const [password, setPassword] = useState("super123");
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
            className="min-h-screen w-screen relative flex flex-col items-center justify-center overflow-hidden"
            style={{
                backgroundImage: "url('/images/super-admin-bg.png')",
                backgroundSize: "cover",
                backgroundPosition: "center",
                backgroundRepeat: "no-repeat"
            }}
        >
            {/* Subtle dark vignette overlay */}
            <div className="bg-gradient-to-t from-slate-950/40 via-transparent to-slate-950/40 absolute inset-0 z-0" aria-hidden="true" />
            
            <div className="relative z-10 w-full max-w-md px-4 sm:px-0">
                {/* Logo / Header */}
                <div className="flex flex-col items-center text-center mb-8">
                    <Link href="/" className="focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded-2xl transition-transform hover:scale-105" aria-label="Go to home page">
                        <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center shadow-sm">
                            <svg className="w-7 h-7 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                            </svg>
                        </div>
                    </Link>
                    <h1 className="text-2xl font-bold text-slate-50 mt-5 tracking-tight">Super Admin Login</h1>
                    <p className="text-[14px] text-slate-400 mt-1.5 font-medium">Secure system authentication</p>
                </div>

                {/* Form */}
                <form
                    onSubmit={handleSubmit}
                    className="bg-slate-950/70 backdrop-blur-xl rounded-2xl border border-slate-800/80 p-8 space-y-6 shadow-2xl"
                    noValidate
                >
                    {error && (
                        <div role="alert" className="bg-red-500/10 text-red-400 text-[13px] font-medium p-3.5 rounded-xl border border-red-500/20 flex items-center gap-2">
                            <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span>{error}</span>
                        </div>
                    )}

                    <div className="space-y-4">
                        <div>
                            <input
                                id="sa-email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="Email address"
                                required
                                autoComplete="email"
                                disabled={isLoading}
                                className="w-full rounded-xl bg-slate-900/90 border border-slate-800/80 text-slate-200 placeholder-slate-500 px-4 py-3.5 text-[15px] focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none transition-all shadow-inner"
                            />
                        </div>

                        <div className="relative">
                            <input
                                id="sa-password"
                                type={showPassword ? "text" : "password"}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Password"
                                required
                                autoComplete="current-password"
                                disabled={isLoading}
                                className="w-full rounded-xl bg-slate-900/90 border border-slate-800/80 text-slate-200 placeholder-slate-500 pl-4 pr-12 py-3.5 text-[15px] focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none transition-all shadow-inner font-medium tracking-wide"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 focus:outline-none p-2 rounded-lg transition-colors"
                                aria-label={showPassword ? "Hide password" : "Show password"}
                            >
                                {showPassword ? (
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                                    </svg>
                                ) : (
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                    </svg>
                                )}
                            </button>
                        </div>
                    </div>

                    <div className="pt-2">
                        <button
                            type="submit"
                            disabled={isLoading || !email || !password}
                            aria-label="Sign in to super admin"
                            className="w-full h-[46px] bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-medium tracking-wide rounded-xl shadow-lg shadow-indigo-600/20 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 flex items-center justify-center gap-2 text-[15px]"
                        >
                            {isLoading ? (
                                <>
                                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" aria-hidden="true" />
                                    <span>Signing in...</span>
                                </>
                            ) : (
                                "Sign In"
                            )}
                        </button>
                    </div>

                    <div className="pt-4 border-t border-slate-800/80 flex justify-center">
                        <p className="text-[14px] text-slate-400">
                            Regular admin?{" "}
                            <Link href="/login" className="text-indigo-400 hover:text-indigo-300 font-medium hover:underline underline-offset-4 transition-colors">
                                Sign in here
                            </Link>
                        </p>
                    </div>
                </form>
            </div>
        </main>
    );
}
