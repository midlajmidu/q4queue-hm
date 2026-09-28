"use client";

import React, { useState } from "react";
import Link from "next/link";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import {
  Sparkles,
  ArrowRight,
  CheckCircle2,
  Building2,
  ShieldCheck,
  Zap,
  Users2,
  Clock,
} from "lucide-react";

export default function GetStartedPage() {
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    fullName: "",
    workEmail: "",
    organization: "",
    industry: "entertainment",
    dailyVisitors: "500-2000",
    notes: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 selection:bg-blue-100 selection:text-blue-900 flex flex-col justify-between">
      <Navbar />

      <main className="pt-24 sm:pt-28 pb-20 sm:pb-28">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          {/* Header */}
          <div className="text-center max-w-3xl mx-auto mt-8 sm:mt-12">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 border border-blue-200 text-xs font-semibold text-blue-700 mb-4 shadow-2xs">
              <Sparkles className="w-3.5 h-3.5 text-blue-600" />
              <span>Instant Pilot &amp; Architecture Review</span>
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 tracking-tight leading-tight">
              Get started with Q4Queue
            </h1>
            <p className="mt-3 text-base sm:text-lg text-slate-600 leading-relaxed max-w-2xl mx-auto">
              Join leading amusement arenas, healthcare networks, and luxury flagships.
              Eliminate physical lines and gain full control over customer flow.
            </p>
          </div>

          <div className="mt-12 max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-start">
            {/* Left Column: Form (7 cols) */}
            <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200/90 p-8 sm:p-10 shadow-sm">
              {submitted ? (
                <div className="text-center py-10">
                  <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-5 shadow-xs">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                  <h3 className="text-2xl font-bold text-slate-900 tracking-tight">
                    Pilot Request Received!
                  </h3>
                  <p className="mt-2 text-slate-600 text-sm max-w-md mx-auto leading-relaxed">
                    Thank you, <span className="font-semibold text-slate-900">{formData.fullName}</span>. An enterprise solutions architect will reach out to <span className="font-semibold text-slate-900">{formData.workEmail}</span> within 2 business hours with your custom sandbox access.
                  </p>

                  <div className="mt-8 pt-6 border-t border-slate-100">
                    <Link
                      href="/"
                      className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-xs"
                    >
                      <span>Return to Home</span>
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-5">
                  <h3 className="text-xl font-bold text-slate-900 tracking-tight mb-2">
                    Request custom sandbox or schedule demo
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                        Full Name *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Alex Morgan"
                        value={formData.fullName}
                        onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition-all"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                        Work Email *
                      </label>
                      <input
                        type="email"
                        required
                        placeholder="alex@company.com"
                        value={formData.workEmail}
                        onChange={(e) => setFormData({ ...formData, workEmail: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition-all"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                        Company / Organization *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Apex Hospital Network"
                        value={formData.organization}
                        onChange={(e) => setFormData({ ...formData, organization: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition-all"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                        Industry *
                      </label>
                      <select
                        value={formData.industry}
                        onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition-all"
                      >
                        <option value="entertainment">Entertainment &amp; Leisure</option>
                        <option value="healthcare">Healthcare &amp; Clinical Triage</option>
                        <option value="retail">Retail &amp; Luxury Flagships</option>
                        <option value="banking">Banking &amp; Financial Services</option>
                        <option value="government">Government &amp; Civic Administration</option>
                        <option value="other">Other High-Footfall Facility</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Estimated Daily Visitor Volume
                    </label>
                    <select
                      value={formData.dailyVisitors}
                      onChange={(e) => setFormData({ ...formData, dailyVisitors: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition-all"
                    >
                      <option value="100-500">100 – 500 visitors / day</option>
                      <option value="500-2000">500 – 2,000 visitors / day</option>
                      <option value="2000-10000">2,000 – 10,000 visitors / day</option>
                      <option value="10000+">10,000+ enterprise campus network</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Operational Goals or Questions (Optional)
                    </label>
                    <textarea
                      rows={3}
                      placeholder="Tell us about your current lobby stanchions, counter setup, or peak rush bottlenecks..."
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition-all resize-none"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3 px-6 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span>Request Enterprise Access</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>

                  <p className="text-[11px] text-slate-400 text-center mt-2">
                    No credit card required. SOC2 &amp; HIPAA compliant digital tokens.
                  </p>
                </form>
              )}
            </div>

            {/* Right Column: Trust & Highlights (5 cols) */}
            <div className="lg:col-span-5 space-y-6">
              <div className="rounded-2xl bg-slate-950 text-white p-7 border border-slate-800 shadow-xl">
                <div className="text-xs font-bold text-blue-400 uppercase tracking-wider mb-2">
                  What you get
                </div>
                <h4 className="text-xl font-bold tracking-tight">
                  Full platform access in under 5 minutes
                </h4>

                <div className="mt-6 space-y-4 text-sm text-slate-300">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                    <span>Instant self-service QR code generators for all your entryways.</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                    <span>Multi-counter dispatch consoles for your front-line team.</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                    <span>Real-time throughput metrics, wait forecasts, and drop-off analytics.</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                    <span>Dedicated solutions architect support for campus-wide rollouts.</span>
                  </div>
                </div>
              </div>

              {/* Direct Support Card */}
              <div className="rounded-2xl bg-white border border-slate-200/90 p-6 shadow-xs">
                <h4 className="text-sm font-bold text-slate-900">
                  Prefer a direct enterprise call?
                </h4>
                <p className="text-xs text-slate-500 mt-1">
                  Contact our global architecture team directly:
                </p>
                <div className="mt-3 text-xs space-y-1 font-medium">
                  <div className="text-blue-600 font-semibold">contact@q4queue.com</div>
                  <div className="text-slate-600">+91 95396 79027</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
