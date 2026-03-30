"use client";

import { useState, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import Link from "next/link";
import { Logo } from "@/components/ui/Logo";
import { config } from "@/lib/config";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Eye, EyeOff } from "lucide-react";

export default function LoginPage() {
    const { login, isLoading, error } = useAuth();
    const [orgSlug, setOrgSlug] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);

    const handleSubmit = useCallback(async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await login({ organization_slug: orgSlug, email, password });
        } catch {
            // Error is handled in useAuth hook
        }
    }, [login, orgSlug, email, password]);

    return (
        <main className="min-h-screen h-screen relative flex flex-col items-center justify-center bg-hero-glow overflow-hidden px-4">
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
                {/* Logo */}
                <div className="text-center mb-8 flex justify-center">
                    <Link href={config.landingUrl} className="inline-flex items-center gap-2" aria-label="Go to home page">
                        <Logo size="lg" />
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
                            <label htmlFor="org-slug" className="block text-sm font-semibold text-foreground mb-1.5">Organization</label>
                            <input id="org-slug" type="text" value={orgSlug} onChange={(e) => setOrgSlug(e.target.value)} placeholder="your-org" required className="w-full rounded-xl border border-input bg-white/50 px-4 py-2.5 text-sm" />
                        </div>
                        <div>
                            <label htmlFor="email" className="block text-sm font-semibold mb-1.5">Email Address</label>
                            <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="admin@domain.com" required className="w-full rounded-xl border border-input bg-white/50 px-4 py-2.5 text-sm" />
                        </div>
                        <div>
                            <label htmlFor="password" title="Password" className="block text-sm font-semibold mb-1.5">Password</label>
                            <div className="relative">
                                <input id="password" type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required className="w-full rounded-xl border border-input bg-white/50 pl-4 pr-12 py-2.5 text-sm" />
                                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground p-1.5 transition-colors">{showPassword ? <EyeOff /> : <Eye />}</button>
                            </div>
                        </div>
                        <button type="submit" disabled={isLoading || !orgSlug || !email || !password} className="w-full h-11 mt-4 bg-primary text-primary-foreground font-semibold rounded-full shadow-lg hover:scale-[1.02] transition-all flex items-center justify-center gap-2">
                           {isLoading ? "Signing in..." : <>Sign in <ArrowRight className="w-4 h-4 ml-1" /></>}
                        </button>
                    </form>

                    <div className="pt-5 border-t border-border/50 text-center">
                        <p className="text-sm text-muted-foreground">
                            Don&apos;t have an account?{" "}
                            <a href={`${config.landingUrl}/get-started`} className="text-primary hover:text-primary/80 font-semibold ml-1 transition-colors">
                                Get Started
                            </a>
                        </p>
                    </div>
                </div>
            </motion.div>
        </main>
    );
}
