"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import { setToken, getCurrentUser } from "@/lib/auth";

export default function SuperAdminChangePasswordPage() {
    const router = useRouter();

    const [password, setPassword] = useState("");
    const [confirm, setConfirm] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [isChecking, setIsChecking] = useState(true);

    useEffect(() => {
        const user = getCurrentUser();
        // If the user isn't logged in, redirect to login
        if (!user) {
            router.replace("/super-admin/login");
            return;
        }
        // If the user has already changed their password (is_first_login is false), redirect to dashboard
        if (user.is_first_login === false) {
            router.replace("/super-admin/dashboard");
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
            
            // Redirect to dashboard
            router.push("/super-admin/dashboard");
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
            <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--q-page-bg)" }}>
                <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8" style={{ background: "var(--q-page-bg)" }}>
            <div className="max-w-md w-full space-y-8 p-10 bg-[#0f172a] rounded-2xl border border-slate-800 shadow-2xl">
                <div>
                    <h2 className="mt-2 text-center text-3xl font-extrabold text-white">
                        Welcome to QRQ Super Admin
                    </h2>
                    <p className="mt-4 text-center text-sm text-slate-400">
                        For security reasons, you must change your password before accessing the dashboard for the first time.
                    </p>
                </div>
                
                {error && (
                    <div className="bg-red-900/50 border border-red-500/50 text-red-200 px-4 py-3 rounded-lg text-sm">
                        {error}
                    </div>
                )}

                <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1">New Password</label>
                            <input
                                type="password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="appearance-none block w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm transition-all"
                                placeholder="••••••••"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1">Confirm New Password</label>
                            <input
                                type="password"
                                required
                                value={confirm}
                                onChange={(e) => setConfirm(e.target.value)}
                                className="appearance-none block w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm transition-all"
                                placeholder="••••••••"
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 focus:ring-offset-slate-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        {loading ? (
                            <span className="flex items-center">
                                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Updating Password...
                            </span>
                        ) : (
                            "Update Password & Continue"
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
}
