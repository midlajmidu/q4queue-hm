"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { CheckCircle2, ArrowRight, Zap, Clock, QrCode } from "lucide-react";
import { Logo } from "@/components/ui/Logo";
import { config } from "@/lib/config";

export default function GetStartedPage() {
    const [submitted, setSubmitted] = useState(false);
    const [formData, setFormData] = useState({
        orgName: "",
        companyType: "",
        email: "",
        phone: "",
    });

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setSubmitError(null);

        const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxo9rC-b7e0DlAZI4Xr5NozIw8WPIEBK-ZTdkdPYE1EpQefQcAlIEDoe8lIQBSro_xZ/exec";

        try {
            await fetch(SCRIPT_URL, {
                method: "POST",
                mode: "no-cors",
                headers: { "Content-Type": "text/plain" },
                body: JSON.stringify(formData),
            });
            setSubmitted(true);
        } catch (error) {
            console.error("Submission error:", error);
            setSubmitError("Failed to submit details. Please try again or contact support.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    return (
        <main className="min-h-screen h-screen relative flex items-center justify-center bg-hero-glow overflow-hidden px-4">
            <div className="absolute inset-0 bg-[linear-gradient(to_right,hsl(220_16%_90%/0.5)_1px,transparent_1px),linear-gradient(to_bottom,hsl(220_16%_90%/0.5)_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,black_70%,transparent_100%)] pointer-events-none" />
            <div className="absolute top-20 left-[10%] w-72 h-72 bg-primary/8 rounded-full blur-[120px] animate-pulse pointer-events-none" />
            <div className="absolute bottom-20 right-[10%] w-56 h-56 bg-accent/8 rounded-full blur-[100px] animate-pulse pointer-events-none" />

            <div className="w-full max-w-6xl mx-auto px-6 lg:px-8 grid lg:grid-cols-2 gap-12 lg:gap-16 items-center relative z-10">
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.6 }}
                    className="hidden lg:flex flex-col justify-center"
                >
                    <Link href="/" className="mb-8 w-fit translate-x-[-12px]">
                        <Logo size="lg" />
                    </Link>
                    <h1 className="font-heading text-3xl xl:text-4xl font-extrabold tracking-tight text-foreground leading-[1.15]">
                        Transform your <br />
                        waiting <span className="text-gradient">experience.</span>
                    </h1>
                    <p className="text-base text-muted-foreground mt-4 leading-relaxed max-w-md">
                        Join modern organizations prioritizing customer happiness. Set up your smart digital queue in minutes.
                    </p>
                    <div className="mt-8 flex flex-col gap-4">
                        {[
                            { icon: Zap, text: "Instant setup, zero hardware limits", color: "bg-primary" },
                            { icon: Clock, text: "Real-time positioning for customers", color: "bg-emerald-500" },
                            { icon: QrCode, text: "Scan to join — no app download needed", color: "bg-accent" },
                        ].map(({ icon: Icon, text, color }, index) => (
                            <div key={text} className="flex items-center gap-3 text-muted-foreground">
                                <div className={`w-8 h-8 rounded-lg ${color} flex items-center justify-center shrink-0`}>
                                    <Icon className="w-4 h-4 text-white" />
                                </div>
                                <span className="text-sm font-medium">{text}</span>
                            </div>
                        ))}
                    </div>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 24 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.1 }}
                    className="w-full max-w-md mx-auto lg:mx-0 lg:ml-auto"
                >
                    <div className="lg:hidden text-center mb-10 flex justify-center scale-110">
                        <Logo size="lg" />
                    </div>

                    {submitted ? (
                        <div className="glass-card rounded-2xl p-8 md:p-10 text-center space-y-6">
                            <CheckCircle2 className="w-16 h-16 text-emerald-500 mx-auto" />
                            <div>
                                <h2 className="text-2xl font-bold text-foreground">Request Received</h2>
                                <p className="text-sm text-muted-foreground mt-2">Team will contact you shortly.</p>
                            </div>
                            <Link href="/" className="inline-flex items-center gap-2 text-primary font-semibold">
                                Return to Home <ArrowRight className="w-4 h-4" />
                            </Link>
                        </div>
                    ) : (
                        <div className="glass-card rounded-2xl p-7 md:p-8 space-y-5">
                            <div className="pb-4 border-b border-border/50">
                                <h2 className="font-heading text-xl font-bold text-foreground">Start free trial</h2>
                                <p className="text-sm text-muted-foreground mt-1">Get early access to Q4Queue.</p>
                            </div>
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-semibold mb-1.5">Organization Name</label>
                                    <input name="orgName" required value={formData.orgName} onChange={handleChange} className="w-full rounded-xl border bg-white/50 px-4 py-2.5 text-sm focus:border-primary focus:outline-none" placeholder="Acme Corp" />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold mb-1.5">Company Type</label>
                                    <select name="companyType" required value={formData.companyType} onChange={handleChange} className="w-full rounded-xl border bg-white/50 px-4 py-2.5 text-sm focus:border-primary focus:outline-none">
                                        <option value="" disabled>Select...</option>
                                        <option value="clinic">Clinic</option>
                                        <option value="retail">Retail</option>
                                        <option value="bank">Bank</option>
                                        <option value="other">Other</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold mb-1.5">Email</label>
                                    <input name="email" type="email" required value={formData.email} onChange={handleChange} className="w-full rounded-xl border bg-white/50 px-4 py-2.5 text-sm" placeholder="you@ex.com" />
                                </div>
                                <button type="submit" disabled={isSubmitting} className="w-full h-11 mt-4 bg-primary text-primary-foreground font-semibold rounded-full shadow-lg hover:scale-[1.02] transition-all flex items-center justify-center gap-2">
                                    {isSubmitting ? "Submitting..." : <>Submit <ArrowRight className="w-4 h-4" /></>}
                                </button>
                            </form>
                            <div className="pt-4 border-t border-border/50 text-center">
                                <p className="text-sm text-muted-foreground">
                                    Already have an account? <a href={`${config.appUrl}/login`} className="text-primary font-semibold">Log in</a>
                                </p>
                            </div>
                        </div>
                    )}
                </motion.div>
            </div>
        </main>
    );
}
