"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import Link from "next/link";

import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Eye, EyeOff } from "lucide-react";

export default function LoginPage() {
    const router = useRouter();
    const { login, isLoading, error, isAuthenticated, isHydrated, user } = useAuth();
    const [orgSlug, setOrgSlug] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [loginType, setLoginType] = useState<"staff" | "org_admin">("staff");

    // Redirect to dashboard if already logged in
    useEffect(() => {
        if (isHydrated && isAuthenticated && user) {
            if (user.is_first_login) {
                return; // Let useAuth handle redirect to change-password
            }
            if (user.role === "super_admin") {
                router.replace("/super-admin");
            } else if (user.role === "admin" || user.role === "branch_admin" || user.role === "staff") {
                router.replace(`/${user.org_slug}/dashboard`);
            } else {
                router.replace("/dashboard");
            }
        }
    }, [isHydrated, isAuthenticated, user, router]);

    const handleSubmit = useCallback(async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await login({ organization_slug: orgSlug, email, password });
        } catch {
            // Error is handled in useAuth hook
        }
    }, [login, orgSlug, email, password]);

    return (
        <main className="force-light min-h-screen relative flex flex-col items-center justify-center bg-hero-glow p-4 sm:p-8 overflow-y-auto">
            {/* Background grid */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,hsl(220_16%_90%/0.5)_1px,transparent_1px),linear-gradient(to_bottom,hsl(220_16%_90%/0.5)_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,black_70%,transparent_100%)] pointer-events-none" />
            <div className="absolute top-20 left-[10%] w-72 h-72 bg-primary/8 rounded-full blur-[120px] animate-pulse pointer-events-none" />
            <div className="absolute bottom-20 right-[10%] w-56 h-56 bg-accent/8 rounded-full blur-[100px] animate-pulse pointer-events-none" />

            {/* Centered login */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                className="w-full max-w-[420px] relative z-10"
            >
                <div className="text-center mb-8 flex justify-center">
                    <Link href="/" className="inline-flex items-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-lg p-1" aria-label="Go to home page">
                        <Image src="/newLogo2.png" alt="Q4Queue Logo" width={642} height={543} className="h-16 md:h-20 w-auto object-contain" priority />
                    </Link>
                </div>

                {/* Login card */}
                <div className="glass-card rounded-2xl p-7 md:p-8 space-y-6" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.04), 0 8px 32px -4px rgba(0,0,0,0.06)" }}>
                    <div className="text-center pb-5 border-b border-border/50">
                        <h1 className="font-heading text-xl font-bold text-foreground">
                            Sign in to your <span className="text-gradient">dashboard</span>
                        </h1>
                        <p className="text-sm text-muted-foreground mt-1.5">Enter your credentials to continue</p>
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
                                    <div role="alert" className="bg-destructive/10 text-destructive text-sm font-medium p-3 rounded-lg border border-destructive/20 text-center">
                                        {error}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <div>
                            <label htmlFor="org-slug" className="block text-sm font-semibold text-foreground mb-1.5">
                                {loginType === "staff" ? "Branch Slug" : "Organization Slug"}
                            </label>
                            <input
                                id="org-slug"
                                type="text"
                                value={orgSlug}
                                onChange={(e) => setOrgSlug(e.target.value)}
                                placeholder={loginType === "staff" ? "branch-slug" : "organization-slug"}
                                required
                                autoComplete="organization"
                                className="w-full rounded-xl border border-input bg-white/50 px-4 py-2.5 text-sm text-foreground focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-all placeholder:text-muted-foreground"
                                disabled={isLoading}
                            />
                        </div>

                        <div>
                            <label htmlFor="email" className="block text-sm font-semibold text-foreground mb-1.5">Email Address</label>
                            <input
                                id="email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="admin@clinic.com"
                                required
                                autoComplete="email"
                                className="w-full rounded-xl border border-input bg-white/50 px-4 py-2.5 text-sm text-foreground focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-all placeholder:text-muted-foreground"
                                disabled={isLoading}
                            />
                        </div>

                        <div>
                            <div className="flex items-center justify-between mb-1.5">
                                <label htmlFor="password" title="Password" className="block text-sm font-semibold text-foreground">Password</label>
                            </div>
                            <div className="relative">
                                <input
                                    id="password"
                                    type={showPassword ? "text" : "password"}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    required
                                    autoComplete="current-password"
                                    className="w-full rounded-xl border border-input bg-white/50 pl-4 pr-12 py-2.5 text-sm text-foreground focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-all placeholder:text-muted-foreground"
                                    disabled={isLoading}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground focus:outline-none p-1.5 rounded-md transition-colors"
                                    aria-label={showPassword ? "Hide password" : "Show password"}
                                    disabled={isLoading}
                                >
                                    {showPassword ? (
                                        <EyeOff className="w-5 h-5" />
                                    ) : (
                                        <Eye className="w-5 h-5" />
                                    )}
                                </button>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading || !orgSlug || !email || !password}
                            aria-label="Sign in"
                            className="w-full h-11 mt-4 bg-primary text-primary-foreground font-semibold rounded-full shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 hover:scale-[1.02] transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:opacity-70 disabled:hover:scale-100 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {isLoading ? (
                                <>
                                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Signing in...
                                </>
                            ) : (
                                <>
                                    Sign in <ArrowRight className="w-4 h-4 ml-1" />
                                </>
                            )}
                        </button>
                    </form>

                    <div className="pt-6 border-t border-border/50 flex flex-col items-center">
                        <Link 
                            href="/organization-login" 
                            className="group flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-slate-50/50 hover:bg-slate-50 border border-slate-200/50 hover:border-slate-300 transition-all duration-300"
                        >
                            <span className="text-[13px] font-medium text-slate-500 group-hover:text-slate-600 transition-colors">
                                Parent Organization Admin?
                            </span>
                            <span className="text-[13px] font-bold text-indigo-600 group-hover:text-indigo-700 transition-colors flex items-center gap-1">
                                Login Here <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                            </span>
                        </Link>
                    </div>
                </div>
            </motion.div>

            {/* Minimal footer */}
            <p className="relative z-10 text-center text-xs text-muted-foreground mt-8">
                © {new Date().getFullYear()} Q4Queue · <Link href="/" className="hover:text-foreground transition-colors">Home</Link>
            </p>
        </main>
    );
}
