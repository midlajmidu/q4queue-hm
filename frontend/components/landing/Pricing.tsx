"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, ArrowRight, X, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

import { api } from "@/lib/api";

export default function PricingSection() {
  const router = useRouter();
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [company, setCompany] = useState("");
  const [branches, setBranches] = useState("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedSuccess, setSubmittedSuccess] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const handleSubmitCustomRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !phone.trim() || !company.trim()) {
      setFormError("Please fill out all required fields.");
      return;
    }
    setFormError(null);
    setIsSubmitting(true);
    try {
      await api.submitPublicCustomPlanRequest({
        contact_name: name.trim(),
        contact_email: email.trim(),
        contact_phone: phone.trim(),
        company_name: company.trim(),
        business_category: "Enterprise Custom Plan",
        branch_count: branches ? `${branches} Branches` : "Multi-branch",
        queue_count: "Custom Queues",
        staff_count: "Custom Staff",
        visitor_volume: "High Enterprise Volume",
        selected_services: ["Custom Enterprise SLA", "Dedicated Account Manager"],
        special_notes: notes,
      });
      setSubmittedSuccess(true);
    } catch (err: any) {
      setFormError(err?.detail || err?.message || "Unable to submit request. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section id="pricing" className="py-20 sm:py-28 bg-white border-b border-slate-200/80">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        {/* Clean Header */}
        <div className="text-center max-w-2xl mx-auto mb-14 sm:mb-16">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-[#0B1220] tracking-tight">
            Simple, transparent pricing.
          </h2>
          <p className="mt-4 text-base sm:text-lg text-slate-600 leading-relaxed font-normal">
            Start with our 14-day free trial or contact us for a custom enterprise setup.
          </p>
        </div>

        {/* 2 Minimal Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto items-stretch">
          {/* Card 1: 14-Day Free Trial */}
          <div className="bg-white rounded-2xl border border-slate-200 p-8 sm:p-10 flex flex-col justify-between hover:border-slate-300 transition-all">
            <div>
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-[#0B1220]">Free Trial Plan</h3>
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                  14 Days Free
                </span>
              </div>
              <p className="mt-2 text-sm text-slate-600">
                Full-featured 14-day trial period for single-branch setups.
              </p>

              {/* Price */}
              <div className="mt-6 flex items-baseline gap-1.5">
                <span className="text-4xl font-extrabold text-[#0B1220] tracking-tight">₹0</span>
                <span className="text-sm font-medium text-slate-500">/ 14 days</span>
              </div>

              {/* Minimal Features List */}
              <div className="mt-8 pt-6 border-t border-slate-100 space-y-3 text-sm text-slate-700">
                <div className="flex items-center gap-3">
                  <Check className="w-4 h-4 text-blue-600 shrink-0" />
                  <span><strong>14 Days Full Access</strong> to core features</span>
                </div>
                <div className="flex items-center gap-3">
                  <Check className="w-4 h-4 text-blue-600 shrink-0" />
                  <span><strong>1 Active Branch</strong> location</span>
                </div>
                <div className="flex items-center gap-3">
                  <Check className="w-4 h-4 text-blue-600 shrink-0" />
                  <span><strong>1 Queue</strong> per branch</span>
                </div>
                <div className="flex items-center gap-3">
                  <Check className="w-4 h-4 text-blue-600 shrink-0" />
                  <span><strong>1 Staff Seat</strong> operator</span>
                </div>
                <div className="flex items-center gap-3">
                  <Check className="w-4 h-4 text-blue-600 shrink-0" />
                  <span><strong>20 Tokens</strong> per session</span>
                </div>
                <div className="flex items-center gap-3">
                  <Check className="w-4 h-4 text-blue-600 shrink-0" />
                  <span><strong>14 Total Sessions</strong> (1 / day)</span>
                </div>
                <div className="flex items-center gap-3">
                  <Check className="w-4 h-4 text-blue-600 shrink-0" />
                  <span>Live TV Display &amp; WhatsApp alerts</span>
                </div>
              </div>
            </div>

            <div className="mt-10">
              <Button
                onClick={() => router.push("/signup")}
                className="w-full h-11 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs"
              >
                <span>Start 14-Day Free Trial</span>
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Card 2: Custom Enterprise */}
          <div className="bg-white rounded-2xl border border-slate-200 p-8 sm:p-10 flex flex-col justify-between hover:border-slate-300 transition-all">
            <div>
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-[#0B1220]">Custom Plan</h3>
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                  Enterprise
                </span>
              </div>
              <p className="mt-2 text-sm text-slate-600">
                Tailored infrastructure for hospitals, banks, &amp; multi-branch networks.
              </p>

              {/* Price */}
              <div className="mt-6 flex items-baseline gap-1.5">
                <span className="text-3xl font-extrabold text-[#0B1220] tracking-tight">Custom</span>
                <span className="text-sm font-medium text-slate-500">/ tailored billing</span>
              </div>

              {/* Minimal Features List */}
              <div className="mt-8 pt-6 border-t border-slate-100 space-y-3 text-sm text-slate-700">
                <div className="flex items-center gap-3">
                  <Check className="w-4 h-4 text-slate-900 shrink-0" />
                  <span><strong>Unlimited Branches</strong> &amp; locations</span>
                </div>
                <div className="flex items-center gap-3">
                  <Check className="w-4 h-4 text-slate-900 shrink-0" />
                  <span><strong>Unlimited Sessions</strong> &amp; token volume</span>
                </div>
                <div className="flex items-center gap-3">
                  <Check className="w-4 h-4 text-slate-900 shrink-0" />
                  <span><strong>Unlimited Staff Seats</strong> &amp; counter operators</span>
                </div>
                <div className="flex items-center gap-3">
                  <Check className="w-4 h-4 text-slate-900 shrink-0" />
                  <span>WhatsApp &amp; WebRTC direct portal calling</span>
                </div>
                <div className="flex items-center gap-3">
                  <Check className="w-4 h-4 text-slate-900 shrink-0" />
                  <span>Live TV display feeds &amp; custom kiosks</span>
                </div>
                <div className="flex items-center gap-3">
                  <Check className="w-4 h-4 text-slate-900 shrink-0" />
                  <span>Dedicated 24/7 SLA support &amp; account manager</span>
                </div>
              </div>
            </div>

            <div className="mt-10">
              <Button
                onClick={() => router.push("/pricing/custom")}
                variant="outline"
                className="w-full h-11 rounded-xl border-slate-300 hover:bg-slate-50 text-[#0B1220] font-bold text-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Request Custom Plan</span>
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Custom Plan Request Modal */}
      {showCustomModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-950/60 backdrop-blur-xs"
            onClick={() => {
              setShowCustomModal(false);
              setSubmittedSuccess(false);
            }}
          />

          <div className="relative w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 text-slate-900 shadow-2xl z-10 max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => {
                setShowCustomModal(false);
                setSubmittedSuccess(false);
              }}
              aria-label="Close modal"
              className="absolute right-5 top-5 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
            >
              <X size={20} />
            </button>

            {submittedSuccess ? (
              <div className="py-8 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 mb-4">
                  <CheckCircle2 size={32} />
                </div>
                <h3 className="text-xl font-bold text-slate-900">Request Received</h3>
                <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                  Thank you! Our enterprise solutions team will contact you within 24 hours to discuss your customized plan.
                </p>
                <Button
                  onClick={() => {
                    setShowCustomModal(false);
                    setSubmittedSuccess(false);
                  }}
                  className="mt-6 rounded-xl bg-slate-900 px-6 py-2.5 text-sm font-bold text-white hover:bg-slate-800"
                >
                  Close
                </Button>
              </div>
            ) : (
              <div>
                <h3 className="text-xl font-bold text-slate-900">Request Custom Enterprise Plan</h3>
                <p className="mt-1 text-sm text-slate-600">
                  Fill out the form below and our queue architecture team will reach out with a custom quote.
                </p>

                {formError && (
                  <div className="mt-4 p-3 rounded-lg bg-red-50 border border-red-200 text-xs font-semibold text-red-700">
                    {formError}
                  </div>
                )}

                <form onSubmit={handleSubmitCustomRequest} className="mt-5 space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Your Name *</label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. John Doe"
                      className="w-full h-10 px-3 rounded-lg border border-slate-200 text-sm focus:border-blue-600 focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Work Email *</label>
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="john@company.com"
                        className="w-full h-10 px-3 rounded-lg border border-slate-200 text-sm focus:border-blue-600 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Phone Number *</label>
                      <input
                        type="tel"
                        required
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+91 98765 43210"
                        className="w-full h-10 px-3 rounded-lg border border-slate-200 text-sm focus:border-blue-600 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Company / Organization *</label>
                      <input
                        type="text"
                        required
                        value={company}
                        onChange={(e) => setCompany(e.target.value)}
                        placeholder="Organization Name"
                        className="w-full h-10 px-3 rounded-lg border border-slate-200 text-sm focus:border-blue-600 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Number of Branches</label>
                      <input
                        type="number"
                        min="1"
                        value={branches}
                        onChange={(e) => setBranches(e.target.value)}
                        placeholder="e.g. 5"
                        className="w-full h-10 px-3 rounded-lg border border-slate-200 text-sm focus:border-blue-600 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Requirements / Notes</label>
                    <textarea
                      rows={3}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Tell us about your operational needs..."
                      className="w-full p-3 rounded-lg border border-slate-200 text-sm focus:border-blue-600 focus:outline-none resize-none"
                    />
                  </div>

                  <div className="pt-2">
                    <Button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full h-11 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm"
                    >
                      {isSubmitting ? "Submitting..." : "Submit Custom Plan Request"}
                    </Button>
                  </div>
                </form>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
