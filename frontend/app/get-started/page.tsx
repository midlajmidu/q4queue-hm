"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { CheckCircle2, ArrowRight, Zap, Clock, QrCode } from "lucide-react";


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

        // PLACE YOUR GOOGLE APPS SCRIPT URL HERE
        const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxo9rC-b7e0DlAZI4Xr5NozIw8WPIEBK-ZTdkdPYE1EpQefQcAlIEDoe8lIQBSro_xZ/exec";

        try {
            // Sending as text/plain to avoid CORS preflight issues with Apps Script
            // The script handles the JSON parsing on its end
            await fetch(SCRIPT_URL, {
                method: "POST",
                mode: "no-cors",
                headers: {
                    "Content-Type": "text/plain",
                },
                body: JSON.stringify(formData),
            });

            // Because we use no-cors, we won't get a standard response object
            // but we assume success if no network error occurred
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
        <main className="min-h-screen h-screen relative flex items-center justify-center bg-hero-glow overflow-hidden">
            {/* Background grid */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,hsl(220_16%_90%/0.5)_1px,transparent_1px),linear-gradient(to_bottom,hsl(220_16%_90%/0.5)_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,black_70%,transparent_100%)] pointer-events-none" />
            <div className="absolute top-20 left-[10%] w-72 h-72 bg-primary/8 rounded-full blur-[120px] animate-pulse pointer-events-none" />
            <div className="absolute bottom-20 right-[10%] w-56 h-56 bg-accent/8 rounded-full blur-[100px] animate-pulse pointer-events-none" />

            {/* Two-column layout */}
            <div className="w-full max-w-6xl mx-auto px-6 lg:px-8 grid lg:grid-cols-2 gap-12 lg:gap-16 items-center relative z-10">

                {/* Left Column: Branding & Benefits */}
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                    className="hidden lg:flex flex-col justify-center"
                >
                    <Link href="/" className="inline-flex items-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-lg p-1 mb-6 w-fit" aria-label="Go to home page">
                        <Image src="/newLogo2.png" alt="Q4Queue Logo" width={642} height={543} className="h-20 w-auto object-contain" priority />
                    </Link>

                    <h1 className="font-heading text-3xl xl:text-4xl font-extrabold tracking-tight text-foreground leading-[1.15]">
                        Transform your <br />
                        waiting <span className="text-gradient">experience.</span>
                    </h1>

                    <p className="text-base text-muted-foreground mt-4 leading-relaxed max-w-md">
                        Join modern organizations prioritizing customer happiness. Set up your smart digital queue in minutes — no app download required.
                    </p>

                    {/* Trust indicators with colored icon badges */}
                    <div className="mt-8 flex flex-col gap-4">
                        {[
                            { icon: Zap, text: "Instant setup, zero hardware limits", color: "bg-primary" },
                            { icon: Clock, text: "Real-time positioning for customers", color: "bg-emerald-500" },
                            { icon: QrCode, text: "Scan to join — no app download needed", color: "bg-accent" },
                        ].map(({ icon: Icon, text, color }, index) => (
                            <motion.div
                                key={text}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.4, delay: 0.4 + (index * 0.1) }}
                                className="flex items-center gap-3 text-muted-foreground"
                            >
                                <div className={`w-8 h-8 rounded-lg ${color} flex items-center justify-center shrink-0 shadow-sm`}>
                                    <Icon className="w-4 h-4 text-white" />
                                </div>
                                <span className="text-sm font-medium">{text}</span>
                            </motion.div>
                        ))}
                    </div>
                </motion.div>

                {/* Right Column: Form Card */}
                <motion.div
                    initial={{ opacity: 0, y: 24 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1], delay: 0.1 }}
                    className="w-full max-w-md mx-auto lg:mx-0 lg:ml-auto"
                >
                    <div className="lg:hidden text-center mb-6 flex justify-center">
                        <Link href="/" className="inline-flex items-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-lg p-1" aria-label="Go to home page">
                            <Image src="/newLogo2.png" alt="Q4Queue Logo" width={642} height={543} className="h-20 w-auto object-contain" priority />
                        </Link>
                    </div>

                    {submitted ? (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                        >
                            <div className="glass-card rounded-2xl p-8 md:p-10 text-center space-y-6" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.04), 0 8px 32px -4px rgba(0,0,0,0.06)" }}>
                                <motion.div
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    transition={{ type: "spring", stiffness: 200, damping: 20, delay: 0.2 }}
                                    className="w-16 h-16 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto shadow-inner border border-emerald-100"
                                >
                                    <CheckCircle2 className="w-8 h-8" />
                                </motion.div>

                                <div className="space-y-2">
                                    <h2 className="text-2xl font-bold text-foreground">Request <span className="text-gradient">Received</span></h2>
                                    <p className="text-sm text-muted-foreground leading-relaxed px-2">
                                        Thank you! We have received your details. Our team will contact you shortly to get you set up.
                                    </p>
                                </div>

                                <div className="pt-4">
                                    <Link
                                        href="/"
                                        className="inline-flex items-center gap-2 text-primary hover:text-primary/80 font-semibold transition-colors focus:outline-none"
                                    >
                                        Return to Home <ArrowRight className="w-4 h-4" />
                                    </Link>
                                </div>
                            </div>
                        </motion.div>
                    ) : (
                        <div className="glass-card rounded-2xl p-7 md:p-8 space-y-5" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.04), 0 8px 32px -4px rgba(0,0,0,0.06)" }}>
                            {/* Card header */}
                            <div className="pb-4 border-b border-border/50">
                                <h2 className="font-heading text-xl font-bold text-foreground">
                                    Start your <span className="text-gradient">free trial</span>
                                </h2>
                                <p className="text-sm text-muted-foreground mt-1.5">Get early access to Q4Queue today.</p>
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div>
                                    <label htmlFor="orgName" className="block text-sm font-semibold text-foreground mb-1.5">Organization Name</label>
                                    <input
                                        id="orgName"
                                        name="orgName"
                                        type="text"
                                        required
                                        value={formData.orgName}
                                        onChange={handleChange}
                                        className="w-full rounded-xl border border-input bg-white/50 px-4 py-2.5 text-sm text-foreground focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-all placeholder:text-muted-foreground"
                                        placeholder="e.g. Acme Corp"
                                    />
                                </div>

                                <div>
                                    <label htmlFor="companyType" className="block text-sm font-semibold text-foreground mb-1.5">Company Type</label>
                                    <select
                                        id="companyType"
                                        name="companyType"
                                        required
                                        value={formData.companyType}
                                        onChange={handleChange}
                                        className="w-full rounded-xl border border-input bg-white/50 px-4 py-2.5 text-sm text-foreground focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-all appearance-none"
                                    >
                                        <option value="" disabled>Select a type...</option>
                                        <option value="clinic">Clinic / Hospital</option>
                                        <option value="retail">Retail Store</option>
                                        <option value="restaurant">Restaurant / Cafe</option>
                                        <option value="bank">Bank / Financial Institution</option>
                                        <option value="government">Government Office</option>
                                        <option value="other">Other</option>
                                    </select>
                                </div>

                                <div>
                                    <label htmlFor="email" className="block text-sm font-semibold text-foreground mb-1.5">Contact Email</label>
                                    <input
                                        id="email"
                                        name="email"
                                        type="email"
                                        required
                                        value={formData.email}
                                        onChange={handleChange}
                                        className="w-full rounded-xl border border-input bg-white/50 px-4 py-2.5 text-sm text-foreground focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-all placeholder:text-muted-foreground"
                                        placeholder="you@example.com"
                                    />
                                </div>

                                <div>
                                    <label htmlFor="phone" className="block text-sm font-semibold text-foreground mb-1.5">Phone Number <span className="text-muted-foreground font-normal">(Optional)</span></label>
                                    <input
                                        id="phone"
                                        name="phone"
                                        type="tel"
                                        value={formData.phone}
                                        onChange={handleChange}
                                        className="w-full rounded-xl border border-input bg-white/50 px-4 py-2.5 text-sm text-foreground focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-all placeholder:text-muted-foreground"
                                        placeholder="+1 (555) 000-0000"
                                    />
                                </div>

                                {submitError && (
                                    <motion.p
                                        initial={{ opacity: 0, y: -10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="text-sm font-medium text-destructive text-center bg-destructive/10 py-2 px-3 rounded-lg"
                                    >
                                        {submitError}
                                    </motion.p>
                                )}

                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="w-full h-11 mt-4 bg-primary text-primary-foreground font-semibold rounded-full shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 hover:scale-[1.02] transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:opacity-70 disabled:hover:scale-100 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                >
                                    {isSubmitting ? (
                                        <>
                                            <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                            Submitting...
                                        </>
                                    ) : (
                                        <>
                                            Submit Details <ArrowRight className="w-4 h-4 ml-1" />
                                        </>
                                    )}
                                </button>
                            </form>

                            <div className="pt-4 border-t border-border/50 text-center">
                                <p className="text-sm text-muted-foreground">
                                    Already have an account?{" "}
                                    <Link href="/login" className="text-primary hover:text-primary/80 font-semibold ml-1 transition-colors">
                                        Log in
                                    </Link>
                                </p>
                            </div>
                        </div>
                    )}
                </motion.div>
            </div>
        </main>
    );
}

