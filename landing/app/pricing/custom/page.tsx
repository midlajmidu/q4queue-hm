"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import {
  Building2,
  CheckCircle2,
  ArrowRight,
  MessageSquare,
  PhoneCall,
  Tv,
  QrCode,
  Layers,
  ShieldCheck,
  Stethoscope,
  Landmark,
  ShoppingBag,
  Gamepad2,
  Utensils,
  Sparkles,
  Check,
  HelpCircle,
  Users,
  GitBranch,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";

const businessTypes = [
  { id: "healthcare", label: "Healthcare & Clinics", icon: Stethoscope },
  { id: "banking", label: "Banking & Finance", icon: Landmark },
  { id: "retail", label: "Retail & Flagships", icon: ShoppingBag },
  { id: "entertainment", label: "Entertainment & Leisure", icon: Gamepad2 },
  { id: "restaurants", label: "Restaurants & Hospitality", icon: Utensils },
  { id: "government", label: "Civic & Government", icon: Building2 },
  { id: "other", label: "Other Business Category", icon: HelpCircle },
];

const branchOptions = [
  { id: "1-3", label: "1 – 3 Branches" },
  { id: "4-10", label: "4 – 10 Branches" },
  { id: "11-25", label: "11 – 25 Branches" },
  { id: "25+", label: "25+ Global Branches" },
];

const queueOptions = [
  { id: "1-3", label: "1 – 3 Queues" },
  { id: "4-10", label: "4 – 10 Queues" },
  { id: "11-25", label: "11 – 25 Queues" },
  { id: "25+", label: "25+ Queues" },
];

const staffOptions = [
  { id: "1-5", label: "1 – 5 Staff" },
  { id: "6-20", label: "6 – 20 Staff" },
  { id: "21-50", label: "21 – 50 Staff" },
  { id: "50+", label: "50+ Staff / Operators" },
];

const visitorOptions = [
  { id: "<200", label: "< 200 / day" },
  { id: "200-1000", label: "200 – 1,000 / day" },
  { id: "1000-5000", label: "1,000 – 5,000 / day" },
  { id: "5000+", label: "5,000+ / day" },
];

const serviceAddons = [
  {
    id: "whatsapp",
    title: "WhatsApp Notification on Every Update",
    desc: "Automated real-time ticket confirmation, turn warnings, and delay alerts.",
    icon: MessageSquare,
  },
  {
    id: "webrtc-call",
    title: "Direct WebRTC Portal Voice Calling",
    desc: "Browser-to-phone voice calling directly from staff counter console.",
    icon: PhoneCall,
  },
  {
    id: "live-tv",
    title: "Live TV Display Feeds & Audio Chimes",
    desc: "Smart TV lobby status matrices with loud audible turn chime calls.",
    icon: Tv,
  },
  {
    id: "totp-qr",
    title: "Dynamic TOTP Anti-Screenshot QR",
    desc: "Rotating 10-second security code encryption preventing screenshot gaming.",
    icon: QrCode,
  },
  {
    id: "multi-queue",
    title: "Multi-Queue & Priority Triage",
    desc: "Sub-service department routing, VIP fast-track, and counter balancing.",
    icon: Layers,
  },
  {
    id: "dedicated-sla",
    title: "24/7 Solutions Architect & SLA Support",
    desc: "Dedicated enterprise support lead, custom webhooks, and 99.9% uptime SLA.",
    icon: ShieldCheck,
  },
];

export default function CustomPlanPage() {
  const router = useRouter();
  const [submitted, setSubmitted] = useState(false);

  // Form State
  const [fullName, setFullName] = useState("");
  const [workEmail, setWorkEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [selectedBusiness, setSelectedBusiness] = useState("healthcare");
  const [otherBusinessCategory, setOtherBusinessCategory] = useState("");
  const [selectedBranches, setSelectedBranches] = useState("1 – 3 Branches");
  const [selectedQueues, setSelectedQueues] = useState("1 – 3 Queues");
  const [selectedStaff, setSelectedStaff] = useState("1 – 5 Staff");
  const [selectedVisitors, setSelectedVisitors] = useState("200 – 1,000 / day");
  const [selectedServices, setSelectedServices] = useState<string[]>([
    "whatsapp",
    "webrtc-call",
    "live-tv",
  ]);
  const [specialRequirements, setSpecialRequirements] = useState("");

  const toggleService = (id: string) => {
    setSelectedServices((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  };

  const activeBusinessObj = businessTypes.find((b) => b.id === selectedBusiness);
  const displayBusinessName =
    selectedBusiness === "other"
      ? (otherBusinessCategory.trim() || "Other Business Category")
      : (activeBusinessObj?.label || "Healthcare & Clinics");

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const handleSubmitProposal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !workEmail.trim() || !phone.trim() || !companyName.trim()) {
      setSubmitError("Please fill out all required contact fields (Full Name, Work Email, Phone Number, and Company Name).");
      if (typeof window !== "undefined") {
        window.scrollTo({ top: 180, behavior: "smooth" });
      }
      return;
    }
    setSubmitting(true);
    setSubmitError(null);
    try {
      const selectedServiceTitles = selectedServices.map((id) => {
        const item = serviceAddons.find((a) => a.id === id);
        return item ? item.title : id;
      });
      await api.submitPublicCustomPlanRequest({
        contact_name: fullName.trim(),
        contact_email: workEmail.trim(),
        contact_phone: phone.trim(),
        company_name: companyName.trim(),
        business_category: displayBusinessName,
        branch_count: selectedBranches,
        queue_count: selectedQueues,
        staff_count: selectedStaff,
        visitor_volume: selectedVisitors,
        selected_services: selectedServiceTitles,
        special_notes: specialRequirements,
      });
      setSubmitted(true);
      if (typeof window !== "undefined") {
        window.scrollTo({ top: 100, behavior: "smooth" });
      }
    } catch (err: any) {
      setSubmitError(err?.detail || err?.message || "Unable to submit proposal request. Please check your network.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 selection:bg-blue-100 selection:text-blue-900 pt-16 flex flex-col justify-between">
      <Navbar />

      <main className="py-16 sm:py-24">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          {/* Header */}
          <div className="max-w-3xl mx-auto text-center mb-14">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-blue-50 border border-blue-200 text-xs font-bold uppercase tracking-wider text-blue-700 mb-4">
              <Sparkles className="w-3.5 h-3.5 text-blue-600" />
              Tailored Enterprise Architect
            </div>
            <h1 className="text-3xl sm:text-5xl font-extrabold text-[#0B1220] tracking-tight leading-tight">
              Configure Your Custom Enterprise Queue Infrastructure
            </h1>
            <p className="mt-4 text-base sm:text-lg text-slate-600 leading-relaxed font-normal">
              Select your business sector, total branches, queues to manage, staff count, and communication services to receive an instant custom proposal.
            </p>
          </div>

          {submitted ? (
            <div className="max-w-2xl mx-auto bg-white rounded-3xl border border-slate-200 p-10 text-center shadow-lg my-10">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-6">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-[#0B1220]">
                Proposal Request Received!
              </h2>
              <p className="mt-3 text-slate-600 text-base leading-relaxed">
                Thank you, <span className="font-bold text-[#0B1220]">{fullName}</span>. Our enterprise architecture team for <span className="font-bold text-[#0B1220]">{companyName}</span> has received your custom plan specification.
              </p>

              <div className="mt-8 p-6 rounded-2xl bg-slate-50 border border-slate-200/80 text-left text-xs sm:text-sm space-y-2.5">
                <div className="flex justify-between border-b border-slate-200/60 pb-2">
                  <span className="text-slate-500">Business Sector:</span>
                  <span className="font-bold text-[#0B1220]">{displayBusinessName}</span>
                </div>
                <div className="flex justify-between border-b border-slate-200/60 pb-2">
                  <span className="text-slate-500">Total Branches:</span>
                  <span className="font-bold text-[#0B1220]">{selectedBranches}</span>
                </div>
                <div className="flex justify-between border-b border-slate-200/60 pb-2">
                  <span className="text-slate-500">Queues to Manage:</span>
                  <span className="font-bold text-[#0B1220]">{selectedQueues}</span>
                </div>
                <div className="flex justify-between border-b border-slate-200/60 pb-2">
                  <span className="text-slate-500">Staff / Counter Operators:</span>
                  <span className="font-bold text-[#0B1220]">{selectedStaff}</span>
                </div>
                <div className="flex justify-between border-b border-slate-200/60 pb-2">
                  <span className="text-slate-500">Daily Visitor Volume:</span>
                  <span className="font-bold text-[#0B1220]">{selectedVisitors}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Selected Services:</span>
                  <span className="font-bold text-blue-600">{selectedServices.length} Premium Services</span>
                </div>
              </div>

              <p className="mt-6 text-xs text-slate-500">
                We will email your custom proposal &amp; SLA terms to <span className="font-semibold text-slate-800">{workEmail}</span> within 24 hours.
              </p>

              <div className="mt-8">
                <Button
                  onClick={() => router.push("/")}
                  className="px-8 h-12 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-md"
                >
                  Return to Home
                </Button>
              </div>
            </div>
          ) : (
            <form id="custom-proposal-form" noValidate onSubmit={handleSubmitProposal}>
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
                {/* Form Configurator Left Column (7 cols) */}
                <div className="lg:col-span-7 space-y-10">
                {submitError && (
                  <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-xs font-bold text-red-700">
                    {submitError}
                  </div>
                )}
                {/* 1. Contact Info */}
                <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-xs space-y-5">
                  <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
                    <span className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 text-xs font-black flex items-center justify-center">
                      1
                    </span>
                    <h3 className="text-lg font-bold text-[#0B1220]">Organization &amp; Contact Details</h3>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                        Full Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="e.g. Alex Morgan"
                        className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-slate-50/50 text-sm font-medium focus:border-blue-600 focus:bg-white focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                        Work Email *
                      </label>
                      <input
                        type="email"
                        required
                        value={workEmail}
                        onChange={(e) => setWorkEmail(e.target.value)}
                        placeholder="alex@company.com"
                        className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-slate-50/50 text-sm font-medium focus:border-blue-600 focus:bg-white focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                        Phone Number *
                      </label>
                      <input
                        type="tel"
                        required
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+91 98765 43210"
                        className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-slate-50/50 text-sm font-medium focus:border-blue-600 focus:bg-white focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                        Company / Organization *
                      </label>
                      <input
                        type="text"
                        required
                        value={companyName}
                        onChange={(e) => setCompanyName(e.target.value)}
                        placeholder="Apex Facility Network"
                        className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-slate-50/50 text-sm font-medium focus:border-blue-600 focus:bg-white focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* 2. Business Category */}
                <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-xs space-y-5">
                  <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
                    <span className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 text-xs font-black flex items-center justify-center">
                      2
                    </span>
                    <h3 className="text-lg font-bold text-[#0B1220]">Business Category</h3>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {businessTypes.map((type) => {
                      const Icon = type.icon;
                      const isSelected = selectedBusiness === type.id;
                      return (
                        <button
                          key={type.id}
                          type="button"
                          onClick={() => setSelectedBusiness(type.id)}
                          className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                            isSelected
                              ? "bg-blue-50/80 border-blue-600 text-blue-900 ring-2 ring-blue-600/20 shadow-xs"
                              : "bg-white border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50/50"
                          }`}
                        >
                          <Icon className={`w-5 h-5 mb-2.5 ${isSelected ? "text-blue-600" : "text-slate-400"}`} />
                          <span className="text-xs font-bold leading-tight">{type.label}</span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Other Category Text Input */}
                  {selectedBusiness === "other" && (
                    <div className="mt-4 p-4 rounded-2xl bg-blue-50/50 border border-blue-200/80">
                      <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
                        Specify Your Business / Industry Type *
                      </label>
                      <input
                        type="text"
                        required
                        value={otherBusinessCategory}
                        onChange={(e) => setOtherBusinessCategory(e.target.value)}
                        placeholder="e.g. Educational Academy, Logistics Hub, Salon Chain, Diagnostic Lab..."
                        className="w-full h-11 px-4 rounded-xl border border-slate-300 bg-white text-sm font-medium focus:border-blue-600 focus:outline-none"
                      />
                    </div>
                  )}
                </div>

                {/* 3. Operational Scale (Branches, Queues & Staff) */}
                <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-xs space-y-6">
                  <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
                    <span className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 text-xs font-black flex items-center justify-center">
                      3
                    </span>
                    <h3 className="text-lg font-bold text-[#0B1220]">Operational Scale &amp; Capacity</h3>
                  </div>

                  {/* Total Branches */}
                  <div>
                    <div className="flex items-center gap-1.5 mb-2.5">
                      <GitBranch className="w-4 h-4 text-blue-600" />
                      <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                        Total Active Branches / Locations
                      </label>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                      {branchOptions.map((opt) => (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => setSelectedBranches(opt.label)}
                          className={`py-3 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer text-center ${
                            selectedBranches === opt.label
                              ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                              : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Total Queues to Manage */}
                  <div className="pt-3 border-t border-slate-100">
                    <div className="flex items-center gap-1.5 mb-2.5">
                      <Layers className="w-4 h-4 text-blue-600" />
                      <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                        Total Queues Needed to Manage
                      </label>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                      {queueOptions.map((opt) => (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => setSelectedQueues(opt.label)}
                          className={`py-3 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer text-center ${
                            selectedQueues === opt.label
                              ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                              : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Staff Required to Manage */}
                  <div className="pt-3 border-t border-slate-100">
                    <div className="flex items-center gap-1.5 mb-2.5">
                      <Users className="w-4 h-4 text-blue-600" />
                      <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                        Staff / Counter Operators Required to Manage
                      </label>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                      {staffOptions.map((opt) => (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => setSelectedStaff(opt.label)}
                          className={`py-3 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer text-center ${
                            selectedStaff === opt.label
                              ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                              : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Daily Visitor Volume */}
                  <div className="pt-3 border-t border-slate-100">
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2.5">
                      Approximate Daily Visitors Across All Branches
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                      {visitorOptions.map((opt) => (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => setSelectedVisitors(opt.label)}
                          className={`py-3 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer text-center ${
                            selectedVisitors === opt.label
                              ? "bg-[#0B1220] text-white border-[#0B1220] shadow-sm"
                              : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* 4. Required Services & Add-ons */}
                <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-xs space-y-5">
                  <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
                    <span className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 text-xs font-black flex items-center justify-center">
                      4
                    </span>
                    <h3 className="text-lg font-bold text-[#0B1220]">Communication Services &amp; Add-ons</h3>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    {serviceAddons.map((addon) => {
                      const Icon = addon.icon;
                      const isChecked = selectedServices.includes(addon.id);
                      return (
                        <div
                          key={addon.id}
                          onClick={() => toggleService(addon.id)}
                          className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-start gap-3.5 ${
                            isChecked
                              ? "bg-blue-50/70 border-blue-600 ring-2 ring-blue-600/15"
                              : "bg-white border-slate-200 hover:border-slate-300"
                          }`}
                        >
                          <div className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 mt-0.5 border ${
                            isChecked ? "bg-blue-600 border-blue-600 text-white" : "border-slate-300 bg-white"
                          }`}>
                            {isChecked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <Icon className={`w-4 h-4 ${isChecked ? "text-blue-600" : "text-slate-500"}`} />
                              <h4 className="text-xs font-bold text-[#0B1220]">{addon.title}</h4>
                            </div>
                            <p className="mt-1 text-[11px] text-slate-500 leading-relaxed font-normal">
                              {addon.desc}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 5. Special Notes */}
                <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-xs space-y-4">
                  <h3 className="text-base font-bold text-[#0B1220]">Special Integration Notes (Optional)</h3>
                  <textarea
                    rows={3}
                    value={specialRequirements}
                    onChange={(e) => setSpecialRequirements(e.target.value)}
                    placeholder="Tell us about existing kiosks, CRM integrations, or specific hardware requirements..."
                    className="w-full p-4 rounded-xl border border-slate-200 bg-slate-50/50 text-sm focus:border-blue-600 focus:bg-white focus:outline-none resize-none"
                  />
                </div>

                <div className="pt-2">
                  <Button
                    type="submit"
                    onClick={handleSubmitProposal}
                    disabled={submitting}
                    className="w-full h-12 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    <span>{submitting ? "Submitting Proposal..." : "Submit Custom Proposal Request"}</span>
                    {!submitting && <ArrowRight className="w-4 h-4" />}
                  </Button>
                </div>
              </div>

              {/* Live Proposal Summary Sidebar Right Column (5 cols) */}
              <div className="lg:col-span-5 sticky top-24 space-y-6">
                <div className="bg-white rounded-3xl border border-slate-200/90 p-7 shadow-lg">
                  <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                    <h3 className="text-lg font-extrabold text-[#0B1220]">Architecture Summary</h3>
                    <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                      Live Estimate
                    </span>
                  </div>

                  <div className="mt-5 space-y-3.5 text-xs sm:text-sm">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500 font-medium">Industry Sector:</span>
                      <span className="font-bold text-[#0B1220]">{displayBusinessName}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500 font-medium">Active Branch Tier:</span>
                      <span className="font-bold text-[#0B1220]">{selectedBranches}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500 font-medium">Queues to Manage:</span>
                      <span className="font-bold text-[#0B1220]">{selectedQueues}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500 font-medium">Staff Operators:</span>
                      <span className="font-bold text-[#0B1220]">{selectedStaff}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500 font-medium">Daily Volume Tier:</span>
                      <span className="font-bold text-[#0B1220]">{selectedVisitors}</span>
                    </div>

                    <div className="pt-3 border-t border-slate-100">
                      <span className="text-slate-500 font-medium block mb-2">Selected Services ({selectedServices.length}):</span>
                      <div className="flex flex-wrap gap-1.5">
                        {selectedServices.map((sid) => {
                          const addon = serviceAddons.find((a) => a.id === sid);
                          return (
                            <span
                              key={sid}
                              className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 text-[11px] font-bold"
                            >
                              {addon?.title.split(" ")[0]} {addon?.title.split(" ")[1]}
                            </span>
                          );
                        })}
                      </div>
                    </div>

                    <div className="pt-4 border-t border-slate-100 flex justify-between items-baseline">
                      <div>
                        <span className="text-xs text-slate-500 block font-medium">Turnaround SLA:</span>
                        <span className="text-sm font-extrabold text-blue-600">&lt; 24 Hours</span>
                      </div>
                      <span className="text-xs font-semibold text-slate-400">Custom Billing</span>
                    </div>
                  </div>

                  <div className="mt-6 pt-4 border-t border-slate-100 space-y-3">
                    {submitError && (
                      <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs font-bold text-red-700 leading-snug">
                        {submitError}
                      </div>
                    )}
                    <Button
                      type="submit"
                      form="custom-proposal-form"
                      onClick={handleSubmitProposal}
                      disabled={submitting}
                      className="w-full h-12 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      <span>{submitting ? "Submitting Proposal..." : "Submit Custom Proposal Request"}</span>
                      {!submitting && <ArrowRight className="w-4 h-4" />}
                    </Button>
                    <p className="text-center text-[11px] text-slate-400 font-medium">
                      No credit card required · Custom SLA within 24h
                    </p>
                  </div>
                </div>

                {/* Guaranteed Support Card */}
                <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs space-y-3">
                  <div className="flex items-center gap-2.5 text-slate-900 font-bold text-sm">
                    <ShieldCheck className="w-5 h-5 text-blue-600 shrink-0" />
                    <span>Enterprise Security Guarantee</span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed font-normal">
                    All custom infrastructure plans include dedicated data isolation per organization, end-to-end audit logging, and 99.9% uptime SLA guarantees.
                  </p>
                </div>
                </div>
              </div>
            </form>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
