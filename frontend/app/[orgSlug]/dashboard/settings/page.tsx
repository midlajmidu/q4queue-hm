"use client";

import React, { useState, useEffect } from "react";
import { api, ApiError } from "@/lib/api";
import type { OrganizationSettingsResponse } from "@/types/api";
import { Lock } from "lucide-react";
import { PageWrapper } from "@/components/PageWrapper";
import { useParams } from "next/navigation";

const C = {
    // bg
    pageBg: "var(--q-page-bg)",
    cardBg: "var(--q-card-bg)",
    cardBgAlt: "var(--q-card-bg-alt)",
    // borders
    border: "var(--q-border)",
    borderHov: "var(--q-border-hov)",
    borderLight: "var(--q-border-light)",
    // text
    text: "var(--q-text)",
    textSub: "var(--q-text-sub)",
    textMuted: "var(--q-text-muted)",
    // brand
    brand: "var(--q-brand)",
    brandDark: "var(--q-brand-dark)",
    brandLight: "var(--q-brand-light)",
    brandBorder: "var(--q-brand-border)",
    brandGlow: "var(--q-brand-glow)",
    // semantic
    blue: "var(--q-blue)", blueBg: "var(--q-blue-bg)", blueBorder: "var(--q-blue-border)",
    green: "var(--q-green)", greenBg: "var(--q-green-bg)", greenBorder: "var(--q-green-border)",
    amber: "var(--q-amber)", amberBg: "var(--q-amber-bg)", amberBorder: "var(--q-amber-border)",
    red: "var(--q-red)", redBg: "var(--q-red-bg)", redBorder: "var(--q-red-border)",
    violet: "#7c3aed", violetBg: "#f5f3ff",
    slate: "#64748b", slateBg: "#f8fafc",
};

const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;600;700&display=swap');

  .ov {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    color: ${C.text};
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }

  .card {
    background: ${C.cardBg};
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    border: 1px solid ${C.border};
    border-radius: 8px;
    box-shadow: none;
    transition: box-shadow .25s cubic-bezier(.4,0,.2,1), border-color .25s ease;
  }
  .card:hover {
    box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
    border-color: ${C.borderHov};
  }

  .card-header {
    display: flex; align-items: center; justify-content: space-between;
    padding: 16px 24px; border-bottom: 1px solid ${C.border};
    background: ${C.cardBg};
    border-radius: 14px 14px 0 0;
  }

  .ov-sel {
    appearance: none;
    background: ${C.cardBgAlt};
    border: 1px solid ${C.border};
    color: ${C.text};
    border-radius: 8px;
    padding: 9px 34px 9px 12px;
    font-size: 13px; font-weight: 500;
    font-family: 'Inter', sans-serif;
    cursor: pointer; min-width: 172px;
    box-shadow: 0 1px 2px rgba(0,0,0,.03);
    transition: all .2s cubic-bezier(.4,0,.2,1);
  }
  .ov-sel:hover:not(:disabled) {
    border-color: ${C.borderHov};
    background: ${C.cardBg};
    box-shadow: 0 2px 4px rgba(0,0,0,.04);
  }
  .ov-sel:focus {
    outline: none;
    border-color: ${C.brand};
    box-shadow: 0 0 0 3px ${C.brandGlow}, 0 1px 2px rgba(0,0,0,.03);
    background: ${C.cardBgAlt};
  }
  .ov-sel:disabled { opacity: .4; cursor: not-allowed; }

  .qa-btn {
    display: inline-flex; align-items: center; justify-content: center; gap: 8px;
    padding: 10px 20px; font-size: 13.5px; font-weight: 600;
    font-family: 'Inter', sans-serif; color: #ffffff;
    background: linear-gradient(180deg, #2563eb 0%, #1d4ed8 100%); border: 1px solid transparent;
    border-radius: 8px; cursor: pointer; text-decoration: none;
    box-shadow: 0 1px 3px rgba(37,99,235,0.2), 0 1px 2px rgba(0,0,0,.06), inset 0 1px 0 rgba(255,255,255,0.1);
    transition: all .22s ease;
  }
  .qa-btn:hover:not(:disabled) {
    background: linear-gradient(180deg, #1d4ed8 0%, #1e40af 100%);
    transform: translateY(-0.5px);
    box-shadow: 0 4px 6px rgba(37,99,235,0.3);
  }
  .qa-btn:disabled { opacity: .4; cursor: not-allowed; }

  .icon-badge {
    display: flex; align-items: center; justify-content: center;
    border-radius: 8px; flex-shrink: 0;
  }

  .lbl {
    font-size: 10.5px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase;
    color: ${C.textMuted};
    font-family: 'Inter', sans-serif;
    display: block; margin-bottom: 8px;
  }

  .premium-input {
    width: 100%; border-radius: 8px; border: 1px solid var(--q-border-light);
    padding: 12px 16px; font-size: 14px; font-weight: 500; color: var(--q-text);
    background: var(--q-card-bg-alt); transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    outline: none;
  }
  .premium-input::placeholder { color: var(--q-text-muted); opacity: 0.7; }
  .premium-input:hover:not(:disabled) { border-color: var(--q-border-hov); }
  .premium-input:focus:not(:disabled) {
    border-color: var(--q-brand);
    box-shadow: 0 0 0 3px var(--q-brand-glow);
    background: var(--q-card-bg);
  }
  .premium-input:disabled { background: var(--q-slate-bg); color: var(--q-text-muted); cursor: not-allowed; }
  
  .tab-btn {
    display: flex; align-items: center; gap: 12px;
    padding: 12px 16px; width: 100%; border-radius: 8px;
    font-size: 14px; font-weight: 600; font-family: 'Inter', sans-serif;
    color: ${C.textSub}; background: transparent; border: none;
    cursor: pointer; text-align: left; transition: all 0.2s;
  }
  .tab-btn:hover {
    background: ${C.borderLight}; color: ${C.text};
  }
  .tab-btn.active {
    background: ${C.brandLight}; color: ${C.brandDark};
  }

  @keyframes modalFadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  @keyframes modalSlideUp {
    from { opacity: 0; transform: translateY(10px) scale(0.98); }
    to { opacity: 1; transform: translateY(0) scale(1); }
  }
`;

export default function SettingsPage() {
    // Layout State
    const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'operations'>('profile');
    const [showUnsavedModal, setShowUnsavedModal] = useState(false);
    const [pendingTab, setPendingTab] = useState<'profile' | 'security' | 'operations' | null>(null);
    const params = useParams();
    const orgSlug = params?.orgSlug as string;

    // Clinic Info State
    const [settings, setSettings] = useState<OrganizationSettingsResponse | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSavingInfo, setIsSavingInfo] = useState(false);

    const [name, setName] = useState("");
    const [address, setAddress] = useState("");
    const [phone, setPhone] = useState("");

    const [infoSuccess, setInfoSuccess] = useState<string | null>(null);
    const [infoError, setInfoError] = useState<string | null>(null);

    // Password State
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [isSavingPassword, setIsSavingPassword] = useState(false);

    const [pwdSuccess, setPwdSuccess] = useState<string | null>(null);
    const [pwdError, setPwdError] = useState<string | null>(null);

    const [otp, setOtp] = useState("");
    const [pwdStep, setPwdStep] = useState<1 | 2>(1); // 1 = request OTP, 2 = verify and change

    const [showCurrent, setShowCurrent] = useState(false);
    const [showNew, setShowNew] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);

    const [resendTimer, setResendTimer] = useState(0);
    const [isResending, setIsResending] = useState(false);

    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (resendTimer > 0) {
            interval = setInterval(() => setResendTimer((prev) => prev - 1), 1000);
        }
        return () => clearInterval(interval);
    }, [resendTimer]);

    const calculatePasswordStrength = (pwd: string) => {
        let score = 0;
        if (pwd.length > 8) score += 1;
        if (/[A-Z]/.test(pwd)) score += 1;
        if (/[0-9]/.test(pwd)) score += 1;
        if (/[^A-Za-z0-9]/.test(pwd)) score += 1;

        if (pwd.length === 0) return { label: "", color: "transparent", width: "0%" };
        if (score <= 1) return { label: "Weak", color: C.red, width: "33%" };
        if (score === 2) return { label: "Medium", color: C.amber, width: "66%" };
        return { label: "Strong", color: C.green, width: "100%" };
    };
    const pwdStrength = calculatePasswordStrength(newPassword);

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const data = await api.getOrganizationSettings();
                setSettings(data);
                setName(data.name);
                setAddress(data.address || "");
                setPhone(data.phone_number || "");
            } catch (err) {
                setInfoError(err instanceof ApiError ? err.detail : "Failed to load settings.");
            } finally {
                setIsLoading(false);
            }
        };
        fetchSettings();
    }, []);

    const hasProfileChanges = settings ? (
        name !== settings.name ||
        address !== (settings.address || "") ||
        phone !== (settings.phone_number || "")
    ) : false;

    const hasSecurityChanges = pwdStep === 2 || currentPassword !== "" || newPassword !== "" || confirmPassword !== "" || otp !== "";
    const hasUnsavedChanges = hasProfileChanges || hasSecurityChanges;

    useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (hasUnsavedChanges) {
                e.preventDefault();
                e.returnValue = '';
            }
        };
        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [hasUnsavedChanges]);

    const handleDiscardChanges = () => {
        if (settings) {
            setName(settings.name);
            setAddress(settings.address || "");
            setPhone(settings.phone_number || "");
        }
    };

    const handleTabChange = (tab: 'profile' | 'security' | 'operations') => {
        if (hasUnsavedChanges) {
            setPendingTab(tab);
            setShowUnsavedModal(true);
            return;
        }
        setActiveTab(tab);
    };

    const confirmTabChange = () => {
        handleDiscardChanges();
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
        setOtp("");
        setPwdStep(1);
        if (pendingTab) setActiveTab(pendingTab);
        setShowUnsavedModal(false);
        setPendingTab(null);
    };

    const cancelTabChange = () => {
        setShowUnsavedModal(false);
        setPendingTab(null);
    };

    const handleSaveInfo = async (e: React.FormEvent) => {
        e.preventDefault();
        setInfoSuccess(null);
        setInfoError(null);
        setIsSavingInfo(true);

        try {
            const data = await api.updateOrganizationSettings({
                name,
                address: address || null,
                phone_number: phone || null,
            });
            setSettings(data);
            setInfoSuccess("Settings updated successfully");
            setTimeout(() => setInfoSuccess(null), 4000);
        } catch (err) {
            setInfoError(err instanceof ApiError ? err.detail : "Failed to update settings.");
        } finally {
            setIsSavingInfo(false);
        }
    };

    const handleRequestOtp = async (e: React.FormEvent) => {
        e.preventDefault();
        setPwdSuccess(null);
        setPwdError(null);
        setIsSavingPassword(true);

        try {
            await api.requestPasswordChangeOtp({ current_password: currentPassword });
            setPwdSuccess("OTP sent to your email. Please check your inbox.");
            setPwdStep(2);
            setResendTimer(60);
        } catch (err) {
            setPwdError(err instanceof ApiError ? err.detail : "Failed to verify current password and send OTP.");
        } finally {
            setIsSavingPassword(false);
        }
    };

    const handleResendOtp = async () => {
        if (resendTimer > 0) return;
        setPwdError(null);
        setPwdSuccess(null);
        setIsResending(true);
        try {
            await api.requestPasswordChangeOtp({ current_password: currentPassword });
            setPwdSuccess("A new OTP has been sent to your email.");
            setResendTimer(60);
        } catch (err) {
            setPwdError(err instanceof ApiError ? err.detail : "Failed to resend OTP.");
        } finally {
            setIsResending(false);
        }
    };

    const handleUpdatePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setPwdSuccess(null);
        setPwdError(null);

        if (newPassword !== confirmPassword) {
            setPwdError("New passwords do not match.");
            return;
        }
        if (otp.length !== 6) {
            setPwdError("OTP must be 6 digits.");
            return;
        }

        setIsSavingPassword(true);

        try {
            await api.changePassword({
                otp: otp,
                new_password: newPassword,
            });
            setPwdSuccess("Password changed successfully");
            setCurrentPassword("");
            setNewPassword("");
            setConfirmPassword("");
            setOtp("");
            setPwdStep(1);
            setTimeout(() => setPwdSuccess(null), 4000);
        } catch (err) {
            setPwdError(err instanceof ApiError ? err.detail : "Failed to change password. OTP might be invalid.");
        } finally {
            setIsSavingPassword(false);
        }
    };

    if (isLoading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
                <svg width={24} height={24} className="animate-spin text-indigo-600" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 11-6.219-8.56" /></svg>
            </div>
        );
    }

    return (
        <>
            <style>{STYLES}</style>
            <div className="ov">
                <PageWrapper
                    title="Settings"
                    subtitle="Update your organization's core details and manage admin credentials."
                    breadcrumbs={[
                        { label: "Configuration", href: `/${orgSlug}/dashboard` },
                        { label: "Settings" }
                    ]}
                >

                    <div style={{ display: 'flex', gap: '32px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                        {/* Sidebar */}
                        <div style={{ flexShrink: 0, width: '240px', display: 'flex', flexDirection: 'column', gap: '8px', position: 'sticky', top: '24px' }}>
                            <button
                                onClick={() => handleTabChange('profile')}
                                className={`tab-btn ${activeTab === 'profile' ? 'active' : ''}`}
                            >
                                <span style={{ fontSize: '18px' }}>🏢</span> Profile
                            </button>
                            <button
                                onClick={() => handleTabChange('security')}
                                className={`tab-btn ${activeTab === 'security' ? 'active' : ''}`}
                            >
                                <span style={{ fontSize: '18px' }}>🛡️</span> Security
                            </button>
                            <button
                                onClick={() => handleTabChange('operations')}
                                className={`tab-btn ${activeTab === 'operations' ? 'active' : ''}`}
                            >
                                <span style={{ fontSize: '18px' }}>⚙️</span> Operations
                            </button>
                        </div>

                        {/* Content Area */}
                        <div style={{ flex: 1, minWidth: '300px' }}>
                            {activeTab === 'profile' && (
                                <div className="card">
                                    <div className="card-header">
                                        <div>
                                            <h2 style={{ fontSize: '15px', fontWeight: 700, color: C.text, margin: 0 }}>Organization Details</h2>
                                            <p style={{ fontSize: '13px', color: C.textSub, marginTop: 4 }}>Update contact and profile information globally displayed to customers.</p>
                                        </div>
                                    </div>

                                    <form onSubmit={handleSaveInfo} style={{ padding: '32px 24px' }}>
                                        {infoSuccess && (
                                            <div style={{ background: C.greenBg, color: C.green, padding: '12px 16px', borderRadius: 8, fontSize: '13px', fontWeight: 500, marginBottom: 24, border: `1px solid ${C.greenBorder}`, display: 'flex', alignItems: 'center', gap: 8 }}>
                                                <svg width={16} height={16} fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
                                                {infoSuccess}
                                            </div>
                                        )}
                                        {infoError && (
                                            <div style={{ background: C.redBg, color: C.red, padding: '12px 16px', borderRadius: 8, fontSize: '13px', fontWeight: 500, marginBottom: 24, border: `1px solid ${C.redBorder}`, display: 'flex', alignItems: 'center', gap: 8 }}>
                                                <svg width={16} height={16} fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><path d="m21 21-4.3-4.3" /><circle cx="11" cy="11" r="8" /></svg>
                                                {infoError}
                                            </div>
                                        )}

                                        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 24 }}>
                                            <div style={{ gridColumn: '1 / -1' }}>
                                                <label className="lbl">Organization Name</label>
                                                <input type="text" required value={name} onChange={(e) => setName(e.target.value)} className="premium-input" placeholder="e.g. Acme Health Clinic" />
                                            </div>

                                            <div style={{ gridColumn: '1 / -1' }}>
                                                <label className="lbl">Address</label>
                                                <textarea value={address} onChange={(e) => setAddress(e.target.value)} rows={3} className="premium-input" style={{ resize: 'vertical' }} placeholder="123 Main Street..." />
                                            </div>

                                            <div>
                                                <label className="lbl">Contact Phone</label>
                                                <input type="text" value={phone} onChange={(e) => setPhone(e.target.value)} className="premium-input" placeholder="(555) 123-4567" />
                                            </div>

                                            <div>
                                                <label className="lbl" style={{ display: "flex", alignItems: "center", gap: 6 }} title="Slug cannot be changed after creation">
                                                    Public URL Slug
                                                    <Lock size={12} color={C.textMuted} style={{ cursor: "help" }} />
                                                </label>
                                                <input type="text" disabled value={settings?.slug || ""} className="premium-input" />
                                            </div>

                                            <div style={{ gridColumn: '1 / -1' }}>
                                                <label className="lbl" style={{ display: "flex", alignItems: "center", gap: 6 }} title="Modifying the system owner email requires contacting administrative support.">
                                                    Owner Email Address
                                                    <Lock size={12} color={C.textMuted} style={{ cursor: "help" }} />
                                                </label>
                                                <input type="email" disabled value={settings?.email || ""} className="premium-input" />
                                            </div>
                                        </div>

                                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 32, paddingTop: 24, borderTop: `1px solid ${C.borderLight}` }}>
                                            <button type="submit" disabled={isSavingInfo || !name.trim()} className="qa-btn">
                                                {isSavingInfo ? <><svg width={16} height={16} className="animate-spin" fill="none" stroke="currentColor" strokeWidth={2}><path d="M21 12a9 9 0 11-6.219-8.56" /></svg>Saving...</> : "Save Details"}
                                            </button>
                                        </div>
                                    </form>
                                </div>
                            )}

                            {activeTab === 'security' && (
                                <div className="card" style={{ marginBottom: 40 }}>
                                    <div className="card-header">
                                        <div>
                                            <h2 style={{ fontSize: '15px', fontWeight: 700, color: C.text, margin: 0 }}>Security Configuration</h2>
                                            <p style={{ fontSize: '13px', color: C.textSub, marginTop: 4 }}>Update the password used to access this administrative dashboard.</p>
                                        </div>
                                    </div>

                                    <form onSubmit={pwdStep === 1 ? handleRequestOtp : handleUpdatePassword} style={{ padding: '32px 24px' }}>
                                        {pwdSuccess && (
                                            <div style={{ background: C.greenBg, color: C.green, padding: '12px 16px', borderRadius: 8, fontSize: '13px', fontWeight: 500, marginBottom: 24, border: `1px solid ${C.greenBorder}`, display: 'flex', alignItems: 'center', gap: 8 }}>
                                                <svg width={16} height={16} fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
                                                {pwdSuccess}
                                            </div>
                                        )}
                                        {pwdError && (
                                            <div style={{ background: C.redBg, color: C.red, padding: '12px 16px', borderRadius: 8, fontSize: '13px', fontWeight: 500, marginBottom: 24, border: `1px solid ${C.redBorder}`, display: 'flex', alignItems: 'center', gap: 8 }}>
                                                <svg width={16} height={16} fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
                                                {pwdError}
                                            </div>
                                        )}

                                        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: 24, maxWidth: 480 }}>
                                            {pwdStep === 1 ? (
                                                <div>
                                                    <label className="lbl">Current Password</label>
                                                    <div style={{ position: 'relative' }}>
                                                        <input type={showCurrent ? "text" : "password"} required value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} className="premium-input" style={{ paddingRight: 48 }} placeholder="••••••••••••" />
                                                        <button type="button" onClick={() => setShowCurrent(!showCurrent)} style={{ position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)', color: C.textMuted, cursor: 'pointer' }} className="hover:text-slate-700 transition-colors">
                                                            {showCurrent ? <svg width={18} height={18} fill="none" stroke="currentColor" strokeWidth={2}><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg> : <svg width={18} height={18} fill="none" stroke="currentColor" strokeWidth={2}><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24M1 1l22 22" /></svg>}
                                                        </button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <>
                                                    <div>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                                            <label className="lbl" style={{ margin: 0 }}>6-Digit OTP</label>
                                                            <button
                                                                type="button"
                                                                onClick={handleResendOtp}
                                                                disabled={resendTimer > 0 || isResending}
                                                                style={{ fontSize: 12, fontWeight: 600, color: resendTimer > 0 ? C.textMuted : C.brand, background: 'none', border: 'none', padding: 0, cursor: resendTimer > 0 ? 'not-allowed' : 'pointer' }}
                                                            >
                                                                {isResending ? "Sending..." : resendTimer > 0 ? `Resend OTP in ${resendTimer}s` : "Resend OTP"}
                                                            </button>
                                                        </div>
                                                        <input type="text" required maxLength={6} value={otp} onChange={(e) => setOtp(e.target.value.replace(/[^0-9]/g, ''))} className="premium-input text-center text-lg tracking-[0.25em]" placeholder="000000" />
                                                    </div>
                                                    <div>
                                                        <label className="lbl">New Password</label>
                                                        <div style={{ position: 'relative' }}>
                                                            <input type={showNew ? "text" : "password"} required minLength={8} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="premium-input" style={{ paddingRight: 48 }} placeholder="••••••••••••" />
                                                            <button type="button" onClick={() => setShowNew(!showNew)} style={{ position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)', color: C.textMuted, cursor: 'pointer' }} className="hover:text-slate-700 transition-colors">
                                                                {showNew ? <svg width={18} height={18} fill="none" stroke="currentColor" strokeWidth={2}><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg> : <svg width={18} height={18} fill="none" stroke="currentColor" strokeWidth={2}><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24M1 1l22 22" /></svg>}
                                                            </button>
                                                        </div>
                                                        {newPassword.length > 0 && (
                                                            <div style={{ marginTop: 8 }}>
                                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                                                                    <span style={{ fontSize: 11, fontWeight: 600, color: C.textMuted }}>Password Strength</span>
                                                                    <span style={{ fontSize: 11, fontWeight: 700, color: pwdStrength.color }}>{pwdStrength.label}</span>
                                                                </div>
                                                                <div style={{ height: 4, background: '#e2e8f0', borderRadius: 2, overflow: 'hidden' }}>
                                                                    <div style={{ height: '100%', width: pwdStrength.width, background: pwdStrength.color, transition: 'all 0.3s' }} />
                                                                </div>
                                                            </div>
                                                        )}
                                                        <p style={{ marginTop: 8, fontSize: 12, color: C.textMuted }}>Minimum 8 characters, numbers, and capital letters recommended.</p>
                                                    </div>

                                                    <div>
                                                        <label className="lbl">Confirm New Password</label>
                                                        <div style={{ position: 'relative' }}>
                                                            <input type={showConfirm ? "text" : "password"} required minLength={8} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="premium-input" style={{ paddingRight: 48 }} placeholder="••••••••••••" />
                                                            <button type="button" onClick={() => setShowConfirm(!showConfirm)} style={{ position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)', color: C.textMuted, cursor: 'pointer' }} className="hover:text-slate-700 transition-colors">
                                                                {showConfirm ? <svg width={18} height={18} fill="none" stroke="currentColor" strokeWidth={2}><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg> : <svg width={18} height={18} fill="none" stroke="currentColor" strokeWidth={2}><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24M1 1l22 22" /></svg>}
                                                            </button>
                                                        </div>
                                                        {confirmPassword && newPassword !== confirmPassword && (
                                                            <p style={{ marginTop: 8, fontSize: 12, fontWeight: 500, color: C.red }}>Passwords do not match.</p>
                                                        )}
                                                    </div>
                                                </>
                                            )}
                                        </div>

                                        <div style={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'center', gap: '16px', marginTop: 32, paddingTop: 24, borderTop: `1px solid ${C.borderLight}` }}>
                                            {pwdStep === 1 ? (
                                                <button type="submit" disabled={isSavingPassword || !currentPassword} className="qa-btn">
                                                    {isSavingPassword ? <><svg width={16} height={16} className="animate-spin" fill="none" stroke="currentColor" strokeWidth={2}><path d="M21 12a9 9 0 11-6.219-8.56" /></svg>Sending OTP...</> : "Send OTP"}
                                                </button>
                                            ) : (
                                                <>
                                                    <button type="submit" disabled={isSavingPassword || !otp || otp.length !== 6 || !newPassword || !confirmPassword || newPassword !== confirmPassword} className="qa-btn">
                                                        {isSavingPassword ? <><svg width={16} height={16} className="animate-spin" fill="none" stroke="currentColor" strokeWidth={2}><path d="M21 12a9 9 0 11-6.219-8.56" /></svg>Updating...</> : "Verify & Update Password"}
                                                    </button>
                                                    <button type="button" onClick={() => setPwdStep(1)} className="qa-btn" style={{ background: '#f1f5f9', color: '#475569', boxShadow: 'none' }}>
                                                        Cancel
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </form>
                                </div>
                            )}

                            {activeTab === 'operations' && (
                                <div className="card">
                                    <div className="card-header">
                                        <div>
                                            <h2 style={{ fontSize: '15px', fontWeight: 700, color: C.text, margin: 0 }}>Operational Settings</h2>
                                            <p style={{ fontSize: '13px', color: C.textSub, marginTop: 4 }}>Configure system-wide operational defaults.</p>
                                        </div>
                                    </div>
                                    <div style={{ padding: '64px 24px', textAlign: 'center' }}>
                                        <div style={{ background: C.brandLight, color: C.brand, width: 48, height: 48, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                                            <svg width={24} height={24} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                        </div>
                                        <h3 style={{ fontSize: '18px', fontWeight: 600, color: C.text, margin: '0 0 8px' }}>Coming Soon</h3>
                                        <p style={{ color: C.textSub, fontSize: '14px', maxWidth: 300, margin: '0 auto' }}>
                                            Operational settings, auto-closing times, and default metrics will be available here soon.
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </PageWrapper>

                {hasProfileChanges && activeTab === 'profile' && (
                    <div style={{
                        position: 'fixed', bottom: 32, left: '50%', transform: 'translateX(-50%)',
                        background: C.cardBg, border: `1px solid ${C.border}`, borderRadius: 12,
                        boxShadow: '0 8px 32px rgba(0,0,0,0.12)', padding: '16px 24px',
                        display: 'flex', alignItems: 'center', gap: 24, zIndex: 100
                    }}>
                        <span style={{ fontSize: 14, fontWeight: 500, color: C.text }}>You have unsaved changes.</span>
                        <div style={{ display: 'flex', gap: 12 }}>
                            <button onClick={handleDiscardChanges} style={{ padding: '8px 16px', fontSize: 13, fontWeight: 600, color: C.textSub, background: C.borderLight, border: 'none', borderRadius: 8, cursor: 'pointer', transition: 'background 0.2s' }}>Discard/Reset</button>
                            <button onClick={handleSaveInfo} style={{ padding: '8px 16px', fontSize: 13, fontWeight: 600, color: '#fff', background: C.brand, border: 'none', borderRadius: 8, cursor: 'pointer', transition: 'background 0.2s' }}>Save Changes</button>
                        </div>
                    </div>
                )}

                {showUnsavedModal && (
                    <div style={{
                        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                        backgroundColor: 'rgba(15, 23, 42, 0.4)',
                        backdropFilter: 'blur(4px)',
                        zIndex: 9999,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        padding: 24, animation: 'modalFadeIn 0.2s ease-out'
                    }}>
                        <div style={{
                            position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
                            background: C.cardBg, borderRadius: 16, width: '100%', maxWidth: 400,
                            padding: 32, textAlign: 'center', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                            border: `1px solid ${C.border}`
                        }}>
                            <div style={{ width: 56, height: 56, borderRadius: '50%', background: C.redBg, color: C.red, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                                <svg width={28} height={28} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                                    <line x1="12" y1="9" x2="12" y2="13" />
                                    <line x1="12" y1="17" x2="12.01" y2="17" />
                                </svg>
                            </div>
                            <h3 style={{ fontSize: 20, fontWeight: 700, color: C.text, margin: '0 0 12px', letterSpacing: '-0.02em' }}>
                                Unsaved Changes
                            </h3>
                            <p style={{ fontSize: 14, color: C.textSub, lineHeight: 1.5, margin: '0 0 24px' }}>
                                You have unsaved changes in your settings. If you leave this tab, your changes will be lost. Are you sure you want to discard them?
                            </p>
                            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
                                <button onClick={cancelTabChange} style={{ padding: '8px 16px', borderRadius: 8, border: `1px solid ${C.border}`, background: C.cardBgAlt, color: C.text, fontSize: 14, fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }}>
                                    Keep Editing
                                </button>
                                <button onClick={confirmTabChange} style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: C.red, color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: 6 }}>
                                    Discard Changes
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
}
