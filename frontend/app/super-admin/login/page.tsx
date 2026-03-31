"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api, ApiError } from "@/lib/api";
import { setToken, isAuthenticated, getCurrentUser } from "@/lib/auth";

export default function SuperAdminLoginPage() {
    const router = useRouter();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // If already logged in as super_admin, redirect immediately
    useEffect(() => {
        if (isAuthenticated()) {
            const user = getCurrentUser();
            if (user?.role === "super_admin") {
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
            router.push("/super-admin");
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
        <main className="min-h-screen flex items-center justify-center bg-slate-900 px-4">
            {/* Background glow */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
                <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-violet-600/20 rounded-full blur-3xl" />
            </div>

            <div className="relative w-full max-w-sm">
                {/* Logo / Header */}
                <div className="text-center mb-8">
                    <Link href="/" className="inline-flex items-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 rounded-lg p-1" aria-label="Go to home page">
                        <div className="w-12 h-12 bg-gradient-to-br from-violet-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-violet-500/30" aria-hidden="true">
                            <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                            </svg>
                        </div>
                    </Link>
                    <h1 className="text-2xl font-bold text-white mt-4">Super Admin</h1>
                    <p className="text-sm text-slate-400 mt-1">Restricted access — authorized personnel only</p>
                </div>

                {/* Form */}
                <form
                    onSubmit={handleSubmit}
                    className="bg-slate-800/60 backdrop-blur-sm rounded-2xl border border-slate-700/50 p-6 space-y-4 shadow-xl"
                    noValidate
                >
                    {error && (
                        <div role="alert" className="bg-red-500/10 text-red-400 text-sm font-medium p-3 rounded-xl border border-red-500/20">
                            {error}
                        </div>
                    )}

                    <div>
                        <label htmlFor="sa-email" className="block text-sm font-medium text-slate-300 mb-1.5">Email</label>
                        <input
                            id="sa-email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="superadmin@q4queue.internal"
                            required
                            autoComplete="email"
                            disabled={isLoading}
                            className="w-full rounded-xl bg-slate-900/60 border border-slate-600 text-white placeholder-slate-500 px-3.5 py-2.5 text-sm focus:border-violet-500 focus:ring-1 focus:ring-violet-500 focus:outline-none transition-colors"
                        />
                    </div>

                    <div>
                        <label htmlFor="sa-password" className="block text-sm font-medium text-slate-300 mb-1.5">Password</label>
                        <div className="relative">
                            <input
                                id="sa-password"
                                type={showPassword ? "text" : "password"}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                required
                                autoComplete="current-password"
                                disabled={isLoading}
                                className="w-full rounded-xl bg-slate-900/60 border border-slate-600 text-white placeholder-slate-500 pl-3.5 pr-10 py-2.5 text-sm focus:border-violet-500 focus:ring-1 focus:ring-violet-500 focus:outline-none transition-colors"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-300 focus:outline-none"
                                aria-label={showPassword ? "Hide password" : "Show password"}
                            >
                                {showPassword ? (
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                                    </svg>
                                ) : (
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                    </svg>
                                )}
                            </button>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading || !email || !password}
                        aria-label="Sign in to super admin"
                        className="w-full py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-semibold rounded-xl transition-all shadow-lg shadow-violet-500/20 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-800"
                    >
                        {isLoading ? (
                            <span className="flex items-center justify-center gap-2">
                                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" aria-hidden="true" />
                                Authenticating...
                            </span>
                        ) : (
                            "Sign in"
                        )}
                    </button>

                    <p className="text-center text-xs text-slate-500 pt-1">
                        Regular admin?{" "}
                        <Link href="/login" className="text-violet-400 hover:text-violet-300 underline underline-offset-2">
                            Sign in here
                        </Link>
                    </p>
                </form>
            </div>
        </main>
    );
}
