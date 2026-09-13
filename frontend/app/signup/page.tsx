"use client";

import { FormEvent, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Building2, Check, Eye, EyeOff, KeyRound, Mail, ShieldCheck } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { setToken } from "@/lib/auth";

type SignupStep = "details" | "verify";

export default function SignupPage() {
    const router = useRouter();
    const [step, setStep] = useState<SignupStep>("details");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showPassword, setShowPassword] = useState(false);
    const [otp, setOtp] = useState("");
    const [resendSeconds, setResendSeconds] = useState(0);
    const [form, setForm] = useState({
        business_name: "", branch_name: "Main Branch", first_name: "", last_name: "", email: "", password: "",
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Kolkata", accepted_terms: false,
    });

    useEffect(() => {
        if (resendSeconds <= 0) return;
        const timer = window.setInterval(() => setResendSeconds(value => Math.max(0, value - 1)), 1000);
        return () => window.clearInterval(timer);
    }, [resendSeconds]);

    const update = (key: keyof typeof form, value: string | boolean) => {
        setForm(current => ({ ...current, [key]: value }));
        setError(null);
    };
    const errorMessage = (err: unknown, fallback: string) => err instanceof ApiError ? err.detail : fallback;

    async function requestOtp(event?: FormEvent) {
        event?.preventDefault();
        if (form.password.length < 8) return setError("Password must be at least 8 characters.");
        setLoading(true); setError(null);
        try {
            await api.requestTrialSignupOtp({ email: form.email.trim().toLowerCase() });
            setStep("verify"); setOtp(""); setResendSeconds(60);
        } catch (err) {
            setError(errorMessage(err, "We couldn't send the verification code. Please try again."));
        } finally { setLoading(false); }
    }

    async function verifyAndCreate(event: FormEvent) {
        event.preventDefault();
        if (otp.length !== 6) return setError("Enter the complete 6-digit verification code.");
        setLoading(true); setError(null);
        try {
            const response = await api.startTrial({ ...form, email: form.email.trim().toLowerCase(), otp });
            setToken(response.access_token, "staff");
            router.replace(`/${response.organization_slug}/dashboard`);
        } catch (err) {
            setError(errorMessage(err, "We couldn't verify your email. Please try again."));
        } finally { setLoading(false); }
    }

    const inputWrap = "relative flex items-center rounded-xl border-2 border-slate-300/80 bg-slate-50/50 transition-all hover:border-slate-400 hover:bg-slate-50/90 focus-within:border-indigo-600 focus-within:bg-white focus-within:ring-4 focus-within:ring-indigo-500/10";
    const inputClass = "w-full rounded-xl bg-transparent px-3 py-2.5 text-[14px] font-medium text-slate-900 outline-none placeholder:font-normal placeholder:text-slate-400/70 disabled:cursor-not-allowed disabled:opacity-60";

    return (
        <main className="force-light relative flex h-[100dvh] min-h-screen w-full overflow-hidden bg-[#0A0625]">
            <div className="pointer-events-none absolute inset-0 overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(67,40,192,0.4)_0%,transparent_60%)]" />
                <div className="absolute inset-0 opacity-[0.15]">
                    <svg className="h-full w-full" xmlns="http://www.w3.org/2000/svg"><defs><pattern id="signup-waves" width="200" height="200" patternUnits="userSpaceOnUse" patternTransform="scale(2) rotate(15)">{[60, 80, 100, 120, 140, 160].map(y => <path key={y} d={`M 0,${y} C 50,${y - 100} 150,${y + 100} 200,${y}`} fill="none" stroke="#ffffff" strokeWidth="0.5" />)}</pattern></defs><rect width="100%" height="100%" fill="url(#signup-waves)" /></svg>
                </div>
            </div>

            <div className="z-10 hidden w-1/2 flex-col justify-end p-16 text-white lg:flex xl:p-20">
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease: "easeOut" }}>
                    <p className="mb-4 text-sm font-semibold uppercase tracking-[0.2em] text-indigo-200">14-day free trial</p>
                    <h1 className="text-[48px] font-medium leading-[1.08] tracking-tight xl:text-[60px]">Your first digital<br />queue starts here</h1>
                    <p className="mt-5 max-w-lg text-lg font-light text-white/70">Set up your branch, welcome customers, and experience Q4Queue. No card required.</p>
                    <div className="mt-8 grid max-w-lg grid-cols-2 gap-3 text-sm text-white/80">
                        {["1 branch", "1 queue", "3 sessions", "20 joins per session"].map(item => <div key={item} className="flex items-center gap-2"><span className="rounded-full bg-white/15 p-1"><Check size={13} /></span>{item}</div>)}
                    </div>
                </motion.div>
            </div>

            <div className="z-10 flex h-full w-full flex-col p-4 lg:w-1/2 lg:p-6">
                <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }} className="flex h-full w-full flex-col overflow-y-auto rounded-3xl border border-slate-100 bg-white px-6 py-6 shadow-[0_8px_40px_-12px_rgba(0,0,0,0.1)] hide-scrollbar sm:px-10 lg:px-14 xl:px-20">
                    <div className="my-auto flex w-full max-w-[460px] flex-col py-3">
                        <div className="mb-4 -ml-9 sm:-ml-12"><Link href="/" aria-label="Go to home page" className="inline-block rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"><Image src="/q4queue-new_logo.png" alt="Q4Queue Logo" width={300} height={80} className="h-10 w-auto origin-left scale-[2.3] object-contain sm:h-12 sm:scale-[2.5]" priority /></Link></div>

                        {step === "details" ? (
                            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                                <div className="mb-5"><div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl border border-indigo-100 bg-indigo-50 text-indigo-600"><Building2 size={20} /></div><h1 className="font-heading text-[26px] font-bold tracking-tight text-slate-900 sm:text-[28px]">Start your free trial</h1><p className="mt-1 text-[13.5px] text-slate-600">Create your first branch in just a few steps.</p></div>
                                {error && <div role="alert" className="mb-4 rounded-xl border border-red-100 bg-red-50 p-2.5 text-xs font-medium text-red-600">{error}</div>}
                                <form onSubmit={requestOtp} className="space-y-3">
                                    <div className="grid gap-3 sm:grid-cols-2">
                                        <Field label="Business name"><div className={inputWrap}><input className={inputClass} value={form.business_name} onChange={e => update("business_name", e.target.value)} placeholder="Acme Services" required minLength={2} maxLength={255} /></div></Field>
                                        <Field label="First branch"><div className={inputWrap}><input className={inputClass} value={form.branch_name} onChange={e => update("branch_name", e.target.value)} placeholder="Main Branch" required minLength={2} maxLength={255} /></div></Field>
                                    </div>
                                    <div className="grid gap-3 sm:grid-cols-2">
                                        <Field label="First name"><div className={inputWrap}><input className={inputClass} value={form.first_name} onChange={e => update("first_name", e.target.value)} placeholder="Your first name" required maxLength={50} autoComplete="given-name" /></div></Field>
                                        <Field label="Last name"><div className={inputWrap}><input className={inputClass} value={form.last_name} onChange={e => update("last_name", e.target.value)} placeholder="Your last name" required maxLength={50} autoComplete="family-name" /></div></Field>
                                    </div>
                                    <Field label="Work email"><div className={inputWrap}><Mail className="ml-3 h-4 w-4 shrink-0 text-slate-400" /><input type="email" className={`${inputClass} pl-2`} value={form.email} onChange={e => update("email", e.target.value)} placeholder="you@company.com" required autoComplete="email" /></div></Field>
                                    <Field label="Password"><div className={inputWrap}><input type={showPassword ? "text" : "password"} className={`${inputClass} pr-10`} value={form.password} onChange={e => update("password", e.target.value)} placeholder="At least 8 characters" required minLength={8} maxLength={128} autoComplete="new-password" /><button type="button" onClick={() => setShowPassword(value => !value)} className="absolute right-2 p-1.5 text-slate-400 transition hover:text-slate-600" aria-label={showPassword ? "Hide password" : "Show password"}>{showPassword ? <EyeOff size={16} /> : <Eye size={16} />}</button></div></Field>
                                    <label className="flex cursor-pointer items-start gap-3 pt-1 text-xs leading-5 text-slate-500"><input type="checkbox" checked={form.accepted_terms} onChange={e => update("accepted_terms", e.target.checked)} required className="mt-0.5 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" /><span>I agree to the Terms of Service and Privacy Policy.</span></label>
                                    <button type="submit" disabled={loading || !form.accepted_terms} className="mt-1 flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-transparent bg-indigo-600 text-[14px] font-bold text-white shadow-md shadow-indigo-500/20 transition enabled:hover:bg-indigo-700 enabled:active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50">{loading ? <Spinner label="Sending code..." /> : <>Continue to email verification <ArrowRight size={16} /></>}</button>
                                </form>
                                <p className="mt-5 text-center text-[13px] text-slate-500">Already have an account? <Link href="/login" className="font-semibold text-indigo-600 hover:text-indigo-700">Log in</Link></p>
                            </motion.div>
                        ) : (
                            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                                <div className="mb-6"><div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl border border-indigo-100 bg-indigo-50 text-indigo-600"><KeyRound size={21} /></div><p className="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-indigo-600">Step 2 of 2</p><h1 className="font-heading text-[27px] font-bold tracking-tight text-slate-900">Verify your email</h1><p className="mt-2 text-[14px] leading-6 text-slate-600">We sent a 6-digit code to <strong className="break-all text-slate-900">{form.email}</strong>.</p></div>
                                {error && <div role="alert" className="mb-4 rounded-xl border border-red-100 bg-red-50 p-3 text-xs font-medium text-red-600">{error}</div>}
                                <form onSubmit={verifyAndCreate} className="space-y-5">
                                    <div><label htmlFor="signup-otp" className="mb-2 block text-[13px] font-bold text-slate-800">Verification code</label><input id="signup-otp" type="text" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={otp} onChange={e => { setOtp(e.target.value.replace(/\D/g, "")); setError(null); }} autoFocus placeholder="000000" className="w-full rounded-xl border-2 border-slate-300 bg-slate-50 px-4 py-3 text-center font-mono text-2xl font-bold tracking-[0.45em] text-slate-900 outline-none transition placeholder:text-slate-300 focus:border-indigo-600 focus:bg-white focus:ring-4 focus:ring-indigo-500/10" /><p className="mt-2 text-xs text-slate-500">The code expires in 5 minutes.</p></div>
                                    <button type="submit" disabled={loading || otp.length !== 6} className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 text-[14px] font-bold text-white shadow-md shadow-indigo-500/20 transition enabled:hover:bg-indigo-700 enabled:active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50">{loading ? <Spinner label="Verifying..." /> : <><ShieldCheck size={17} /> Verify & start free trial</>}</button>
                                </form>
                                <div className="mt-6 flex items-center justify-between text-[13px]"><button type="button" onClick={() => { setStep("details"); setOtp(""); setError(null); }} disabled={loading} className="inline-flex items-center gap-1.5 font-medium text-slate-500 transition hover:text-slate-800"><ArrowLeft size={14} /> Edit details</button><button type="button" onClick={() => requestOtp()} disabled={loading || resendSeconds > 0} className="font-semibold text-indigo-600 transition hover:text-indigo-700 disabled:cursor-not-allowed disabled:text-slate-400">{resendSeconds > 0 ? `Resend in ${resendSeconds}s` : "Resend code"}</button></div>
                            </motion.div>
                        )}
                    </div>
                </motion.div>
            </div>
        </main>
    );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return <div className="space-y-1"><label className="block text-[12.5px] font-bold text-slate-800">{label} <span className="text-indigo-600">*</span></label>{children}</div>;
}

function Spinner({ label }: { label: string }) {
    return <><span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />{label}</>;
}
