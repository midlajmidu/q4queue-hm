"use client";

import React, { useState, useEffect } from "react";
import { api, ApiError } from "@/lib/api";
import type { OrganizationSettingsResponse, User } from "@/types/api";
import { Lock, CheckCircle, AlertCircle, Eye, EyeOff, Building2, Shield, Zap } from "lucide-react";
import { PageWrapper } from "@/components/PageWrapper";
import { useParams } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { useRef } from "react";
import { setToken } from "@/lib/auth";
import { OperationsTab } from "@/components/settings/OperationsTab";

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
    const { user } = useAuth();
    const isAdmin = user?.role === "admin" || user?.role === "branch_admin";

    // Clinic Info State
    const [settings, setSettings] = useState<OrganizationSettingsResponse | null>(null);
    const [myProfile, setMyProfile] = useState<any | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSavingInfo, setIsSavingInfo] = useState(false);

    const [name, setName] = useState("");
    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [address, setAddress] = useState("");
    const [phone, setPhone] = useState("");
    const [brandColor, setBrandColor] = useState("");
    const [logoUrl, setLogoUrl] = useState("");
    const [logoFile, setLogoFile] = useState<File | null>(null);
    const [logoPreview, setLogoPreview] = useState<string | null>(null);

    const [infoSuccess, setInfoSuccess] = useState<string | null>(null);
    const [showSuccessModal, setShowSuccessModal] = useState<string | null>(null);
    const [infoError, setInfoError] = useState<string | null>(null);

    // Password State
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [isSavingPassword, setIsSavingPassword] = useState(false);

    const [pwdSuccess, setPwdSuccess] = useState<string | null>(null);
    const [pwdError, setPwdError] = useState<string | null>(null);

    const [otp, setOtp] = useState("");
    const [otpValues, setOtpValues] = useState<string[]>(Array(6).fill(""));
    const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

    const handleOtpChange = (index: number, value: string) => {
        if (!/^[0-9]*$/.test(value)) return;
        const newOtp = [...otpValues];
        newOtp[index] = value;
        setOtpValues(newOtp);
        setOtp(newOtp.join(""));
        
        if (value && index < 5) {
            otpRefs.current[index + 1]?.focus();
        }
    };

    const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Backspace' && !otpValues[index] && index > 0) {
            otpRefs.current[index - 1]?.focus();
        }
    };

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
                const [data, profile] = await Promise.all([
                    api.getOrganizationSettings(),
                    api.getMyProfile()
                ]);
                setSettings(data);
                setMyProfile(profile);
                setName(data.name);
                setAddress(data.address || "");
                setPhone(data.phone_number || "");
                setBrandColor(data.brand_color || "");
                setLogoUrl(data.logo_url || "");

                setFirstName(profile.first_name || "");
                setLastName(profile.last_name || "");
            } catch (err) {
                setInfoError(err instanceof ApiError ? err.detail : "Failed to load settings.");
            } finally {
                setIsLoading(false);
            }
        };
        fetchSettings();
    }, []);

    const hasProfileChanges = settings ? (
        isAdmin ? (
            name !== settings.name ||
            address !== (settings.address || "") ||
            phone !== (settings.phone_number || "") ||
            brandColor !== (settings.brand_color || "") ||
            logoFile !== null
        ) : (
            firstName !== (myProfile?.first_name || "") ||
            lastName !== (myProfile?.last_name || "")
        )
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
            setBrandColor(settings.brand_color || "");
            setLogoFile(null);
            setLogoPreview(null);
            if (myProfile) {
                setFirstName(myProfile.first_name || "");
                setLastName(myProfile.last_name || "");
            }
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
            if (isAdmin) {
                const didUploadLogo = !!logoFile;

                if (logoFile) {
                    const logoData = await api.uploadOrganizationLogo(logoFile);
                    if ((logoData as any).access_token) setToken((logoData as any).access_token);
                }
                const data = await api.updateOrganizationSettings({
                    name,
                    address: address || undefined,
                    phone_number: phone || undefined,
                    brand_color: brandColor || undefined,
                });
                if ((data as any).access_token) setToken((data as any).access_token);
                
                setSettings(data);
                setLogoUrl(data.logo_url || "");
                setLogoFile(null);
                setLogoPreview(null);

                if (didUploadLogo) {
                    setShowSuccessModal("Logo uploaded and branding settings updated successfully! Refreshing...");
                } else {
                    setShowSuccessModal("Settings updated successfully! Refreshing...");
                }
                setTimeout(() => window.location.reload(), 1500);
            } else {
                const response = await api.updateMyProfile({
                    first_name: firstName,
                    last_name: lastName,
                }) as any;
                if (response && response.access_token) {
                    setToken(response.access_token);
                }
                setMyProfile((prev: any) => prev ? { ...prev, first_name: firstName, last_name: lastName } : null);
                setShowSuccessModal("Profile updated successfully! Refreshing...");
                setTimeout(() => window.location.reload(), 1500);
            }
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
            toast.success("OTP sent to your email. Please check your inbox.");
            setPwdStep(2);
            setResendTimer(60);
        } catch (err) {
            toast.error(err instanceof ApiError ? err.detail : "Failed to verify current password and send OTP.");
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
            toast.success("A new OTP has been sent to your email.");
            setResendTimer(60);
        } catch (err) {
            toast.error(err instanceof ApiError ? err.detail : "Failed to resend OTP.");
        } finally {
            setIsResending(false);
        }
    };

    const handleUpdatePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setPwdSuccess(null);
        setPwdError(null);

        if (newPassword !== confirmPassword) {
            toast.error("New passwords do not match.");
            return;
        }
        if (otp.length !== 6) {
            toast.error("OTP must be 6 digits.");
            return;
        }

        setIsSavingPassword(true);

        try {
            await api.changePassword({
                otp: otp,
                new_password: newPassword,
            });
            setCurrentPassword("");
            setNewPassword("");
            setConfirmPassword("");
            setOtp("");
            setPwdStep(1);
            setShowSuccessModal("Your password has been changed successfully.");
        } catch (err) {
            toast.error(err instanceof ApiError ? err.detail : "Failed to change password. OTP might be invalid.");
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
                                <Building2 size={18} /> Profile
                            </button>
                            <button
                                onClick={() => handleTabChange('security')}
                                className={`tab-btn ${activeTab === 'security' ? 'active' : ''}`}
                            >
                                <Shield size={18} /> Security
                            </button>
                            {isAdmin && (
                                <button
                                    onClick={() => handleTabChange('operations')}
                                    className={`tab-btn ${activeTab === 'operations' ? 'active' : ''}`}
                                >
                                    <Zap size={18} /> Workflows
                                </button>
                            )}
                        </div>

                        {/* Content Area */}
                        <div style={{ flex: 1, minWidth: '300px' }}>
                            {activeTab === 'profile' && (
                                <div className="card">
                                    <div className="card-header">
                                        <div>
                                            <h2 style={{ fontSize: '15px', fontWeight: 700, color: C.text, margin: 0 }}>
                                                {isAdmin ? "Organization Management" : "Personal Profile Info"}
                                            </h2>
                                            <p style={{ fontSize: '13px', color: C.textSub, marginTop: 4 }}>
                                                {isAdmin ? "Manage organization details that are publicly visible to your customers across all queues." : "Update your personal staff credentials. These details are private and not visible to the public."}
                                            </p>
                                        </div>
                                    </div>

                                    <form onSubmit={handleSaveInfo} style={{ padding: '32px 24px' }}>
                                        {infoSuccess && (
                                            <div style={{ background: '#f0fdf4', color: '#166534', padding: '16px', borderRadius: 8, fontSize: '14px', fontWeight: 500, marginBottom: 24, border: '1px solid #bbf7d0', borderLeft: '4px solid #22c55e', display: 'flex', alignItems: 'center', gap: 12, boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                                                <CheckCircle size={20} color="#22c55e" />
                                                <span style={{ flex: 1, lineHeight: 1.5 }}>{infoSuccess}</span>
                                            </div>
                                        )}
                                        {infoError && (
                                            <div style={{ background: '#fef2f2', color: '#991b1b', padding: '16px', borderRadius: 8, fontSize: '14px', fontWeight: 500, marginBottom: 24, border: '1px solid #fecaca', borderLeft: '4px solid #ef4444', display: 'flex', alignItems: 'center', gap: 12, boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                                                <AlertCircle size={20} color="#ef4444" />
                                                <span style={{ flex: 1, lineHeight: 1.5 }}>{infoError}</span>
                                            </div>
                                        )}

                                        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 24 }}>
                                            {isAdmin ? (
                                                <div style={{ gridColumn: '1 / -1' }}>
                                                    <label className="lbl">Organization Name</label>
                                                    <input type="text" required value={name} onChange={(e) => setName(e.target.value)} className="premium-input" placeholder="e.g. Acme Health Clinic" />
                                                </div>
                                            ) : (
                                                <>
                                                    <div style={{ gridColumn: '1 / -1' }}>
                                                        <label className="lbl">Organization</label>
                                                        <div style={{
                                                            display: 'flex', alignItems: 'center', gap: 16, padding: '16px',
                                                            background: C.cardBgAlt, border: `1px solid ${C.borderLight}`, borderRadius: 12
                                                        }}>
                                                            <div style={{
                                                                width: 48, height: 48, borderRadius: 10, border: `1px solid ${C.borderLight}`,
                                                                background: '#fff', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                                boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
                                                            }}>
                                                                {logoUrl ? (
                                                                    <img src={logoUrl.startsWith('http') ? logoUrl : process.env.NEXT_PUBLIC_API_URL ? `${process.env.NEXT_PUBLIC_API_URL}${logoUrl}` : `http://localhost:8000${logoUrl}`} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                                                                ) : (
                                                                    <span style={{ fontSize: 20, color: C.textMuted }}>🏢</span>
                                                                )}
                                                            </div>
                                                            <div>
                                                                <div style={{ fontSize: 16, fontWeight: 600, color: C.text }}>{name}</div>

                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <label className="lbl">First Name</label>
                                                        <input type="text" required value={firstName} onChange={(e) => setFirstName(e.target.value)} className="premium-input capitalize" placeholder="e.g. John" />
                                                    </div>
                                                    <div>
                                                        <label className="lbl">Last Name</label>
                                                        <input type="text" required value={lastName} onChange={(e) => setLastName(e.target.value)} className="premium-input capitalize" placeholder="e.g. Doe" />
                                                    </div>
                                                    <div style={{ gridColumn: '1 / -1' }}>
                                                        <label className="lbl" style={{ display: "flex", alignItems: "center", gap: 6 }} title="Your email address used for login.">
                                                            Email Address
                                                            <Lock size={12} color={C.textMuted} style={{ cursor: "help" }} />
                                                        </label>
                                                        <input type="email" disabled value={myProfile?.email || ""} className="premium-input" />
                                                    </div>
                                                </>
                                            )}

                                            {isAdmin && (
                                                <>
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

                                                    <div style={{ gridColumn: '1 / -1' }}>
                                                        <h3 style={{ fontSize: '14px', fontWeight: 600, color: C.text, marginBottom: '16px', marginTop: '8px', borderBottom: `1px solid ${C.borderLight}`, paddingBottom: '8px' }}>Branding</h3>
                                                    </div>

                                                    <div>
                                                        <label className="lbl">Brand Color</label>
                                                        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                                                            <input
                                                                type="color"
                                                                value={brandColor || "#2563eb"}
                                                                onChange={(e) => setBrandColor(e.target.value)}
                                                                style={{ width: 44, height: 44, padding: 0, border: `1px solid ${C.borderLight}`, borderRadius: 8, cursor: 'pointer', background: 'transparent' }}
                                                            />
                                                            <input
                                                                type="text"
                                                                value={brandColor}
                                                                onChange={(e) => setBrandColor(e.target.value)}
                                                                placeholder="#2563eb"
                                                                className="premium-input"
                                                                style={{ flex: 1 }}
                                                                pattern="^#[0-9A-Fa-f]{6}$"
                                                            />
                                                        </div>
                                                        <p style={{ fontSize: 11, color: C.textMuted, marginTop: 4 }}>Used as the primary color on the public ticket page.</p>
                                                    </div>

                                                    <div style={{ gridColumn: '1 / -1' }}>
                                                        <label className="lbl">Organization Logo</label>
                                                        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                                                            <div style={{
                                                                width: 64, height: 64, borderRadius: 12, border: `1px solid ${C.borderLight}`,
                                                                background: C.cardBgAlt, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center'
                                                            }}>
                                                                {(logoPreview || logoUrl) ? (
                                                                    <img src={logoPreview || (logoUrl.startsWith('http') ? logoUrl : process.env.NEXT_PUBLIC_API_URL ? `${process.env.NEXT_PUBLIC_API_URL}${logoUrl}` : `http://localhost:8000${logoUrl}`)} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                                                                ) : (
                                                                    <span style={{ fontSize: 24, color: C.textMuted }}>🏢</span>
                                                                )}
                                                            </div>
                                                            <div>
                                                                <input
                                                                    type="file"
                                                                    id="logo-upload"
                                                                    accept="image/*"
                                                                    style={{ display: 'none' }}
                                                                    onChange={(e) => {
                                                                        if (e.target.files && e.target.files[0]) {
                                                                            const file = e.target.files[0];
                                                                            const objectUrl = URL.createObjectURL(file);
                                                                            const img = new Image();
                                                                            img.onload = () => {
                                                                                if (img.width > 1024 || img.height > 1024) {
                                                                                    alert("Image resolution too high. Please upload a profile picture that is 1024x1024 pixels or smaller.");
                                                                                    e.target.value = ''; // Reset the input
                                                                                } else {
                                                                                    setLogoFile(file);
                                                                                    setLogoPreview(objectUrl);
                                                                                }
                                                                            };
                                                                            img.src = objectUrl;
                                                                        }
                                                                    }}
                                                                />
                                                                <label htmlFor="logo-upload" style={{ display: 'inline-block', padding: '6px 12px', fontSize: 13, fontWeight: 600, color: C.text, background: '#fff', border: `1px solid ${C.border}`, borderRadius: 6, cursor: 'pointer', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                                                                    Choose Image
                                                                </label>
                                                                {logoFile && (
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => { setLogoFile(null); setLogoPreview(null); }}
                                                                        style={{ marginLeft: 8, fontSize: 12, color: C.red, background: 'none', border: 'none', cursor: 'pointer' }}
                                                                    >
                                                                        Clear
                                                                    </button>
                                                                )}
                                                                <p style={{ fontSize: 11, color: C.textMuted, marginTop: 4 }}>Recommended: PNG or JPG, max 2MB.</p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </>
                                            )}
                                        </div>

                                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: 32, paddingTop: 24, borderTop: `1px solid ${C.borderLight}` }}>
                                            {hasProfileChanges && (
                                                <button type="button" onClick={handleDiscardChanges} style={{ padding: '10px 20px', fontSize: '13.5px', fontWeight: 600, color: C.textSub, background: C.cardBgAlt, border: `1px solid ${C.border}`, borderRadius: 8, cursor: 'pointer', transition: 'all 0.2s' }} className="hover:bg-slate-100">
                                                    Discard Changes
                                                </button>
                                            )}
                                            <button type="submit" disabled={isSavingInfo || !hasProfileChanges || (isAdmin ? !name.trim() : (!firstName.trim() || !lastName.trim()))} className="qa-btn">
                                                {isSavingInfo ? <><svg width={16} height={16} className="animate-spin" fill="none" stroke="currentColor" strokeWidth={2}><path d="M21 12a9 9 0 11-6.219-8.56" /></svg>Saving...</> : "Save Details"}
                                            </button>
                                        </div>
                                    </form>
                                </div>
                            )}

                            {activeTab === 'security' && (
                                <div className="card" style={{ marginBottom: 40 }}>
                                    <div className="card-header border-b border-slate-200">
                                        <div className="flex items-center gap-2.5">
                                            <Lock size={18} className="text-slate-500" />
                                            <div>
                                                <h2 style={{ fontSize: '15px', fontWeight: 700, color: C.text, margin: 0 }}>Security Configuration</h2>
                                                <p style={{ fontSize: '13px', color: C.textSub, marginTop: 4 }}>To change your password, please verify your identity by entering your current password to receive a secure OTP.</p>
                                            </div>
                                        </div>
                                    </div>

                                    <form onSubmit={pwdStep === 1 ? handleRequestOtp : handleUpdatePassword} style={{ padding: '32px 24px' }}>
                                        {/* Toast notifications will handle success/error popups */}
                                        <div className="w-full">
                                            {pwdStep === 1 ? (
                                                <div className="max-w-md">
                                                    <h3 className="text-base font-semibold text-slate-900 mb-1">Verify Identity with Password</h3>
                                                    <p className="text-[14px] text-slate-500 mb-6">Enter your current password to receive a secure 6-digit OTP via email.</p>
                                                    
                                                    <label className="block text-[14px] font-medium text-slate-700 mb-1.5">Current Password</label>
                                                    <div className="relative">
                                                        <input type={showCurrent ? "text" : "password"} required value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} className="w-full bg-white border border-slate-300 text-slate-900 text-[14px] rounded-lg px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-shadow shadow-sm placeholder:text-slate-400" style={{ paddingRight: 48 }} placeholder="••••••••••••" />
                                                        <button type="button" onClick={() => setShowCurrent(!showCurrent)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors flex items-center justify-center p-1 bg-transparent border-none cursor-pointer">
                                                            {showCurrent ? <Eye size={18} /> : <EyeOff size={18} />}
                                                        </button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="flex flex-col gap-10 w-full max-w-md">
                                                    {/* Step 1: Verify OTP */}
                                                    <div>
                                                        <h3 className="text-base font-semibold text-slate-900 mb-1">1. Verify Identity with OTP</h3>
                                                        <p className="text-[14px] text-slate-500 mb-6">A 6-digit verification code has been sent to your registered email.</p>
                                                        
                                                        <div>
                                                            <div className="flex justify-between items-end mb-2">
                                                                <label className="block text-[14px] font-medium text-slate-700">6-Digit OTP</label>
                                                                <span className="text-[13px] text-slate-500">Sent to: <span className="font-medium text-slate-700">{myProfile?.email?.replace(/(.{1}).*@/, "$1******@")}</span></span>
                                                            </div>
                                                            
                                                            <div className="flex gap-3 mb-4">
                                                                {otpValues.map((digit, index) => (
                                                                    <input
                                                                        key={index}
                                                                        type="text"
                                                                        maxLength={1}
                                                                        value={digit}
                                                                        ref={(el) => { otpRefs.current[index] = el; }}
                                                                        onChange={(e) => handleOtpChange(index, e.target.value)}
                                                                        onKeyDown={(e) => handleOtpKeyDown(index, e)}
                                                                        className="w-12 h-14 text-center text-[24px] font-bold border border-slate-300 rounded-lg bg-white text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/15 transition-all shadow-sm"
                                                                        placeholder="0"
                                                                    />
                                                                ))}
                                                            </div>

                                                            <div className="flex items-center text-[13px]">
                                                                <span className="text-slate-500 mr-2">Didn't receive the code?</span>
                                                                <button
                                                                    type="button"
                                                                    onClick={handleResendOtp}
                                                                    disabled={resendTimer > 0 || isResending}
                                                                    className={`font-medium transition-colors border-none bg-transparent p-0 ${resendTimer > 0 ? 'text-slate-400 cursor-not-allowed' : 'text-blue-600 hover:text-blue-700 cursor-pointer'}`}
                                                                >
                                                                    {isResending ? "Sending..." : resendTimer > 0 ? `Resend Code (${resendTimer}s)` : "Resend Code"}
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="h-px bg-slate-200 w-full" />

                                                    {/* Step 2: Set Password */}
                                                    <div>
                                                        <h3 className="text-base font-semibold text-slate-900 mb-1">2. Create a New Secure Password</h3>
                                                        <p className="text-[14px] text-slate-500 mb-6">Once the OTP is verified, you can set your new password below.</p>
                                                        
                                                        <div className="space-y-6">
                                                            <div>
                                                                <label className="block text-[14px] font-medium text-slate-700 mb-1.5">New Password</label>
                                                                <div className="relative">
                                                                    <input type={showNew ? "text" : "password"} required minLength={8} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="w-full bg-white border border-slate-300 text-slate-900 text-[14px] rounded-lg px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-shadow shadow-sm placeholder:text-slate-400" style={{ paddingRight: 48 }} placeholder="••••••••••••" />
                                                                    <button type="button" onClick={() => setShowNew(!showNew)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors flex items-center justify-center p-1 bg-transparent border-none cursor-pointer">
                                                                        {showNew ? <Eye size={18} /> : <EyeOff size={18} />}
                                                                    </button>
                                                                </div>
                                                                {newPassword.length > 0 && (
                                                                    <div className="mt-3">
                                                                        <div className="flex justify-between items-center mb-1.5">
                                                                            <span className="text-[12px] font-semibold text-slate-500">Password Strength</span>
                                                                            <span className="text-[12px] font-bold" style={{ color: pwdStrength.color }}>{pwdStrength.label}</span>
                                                                        </div>
                                                                        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                                                            <div className="h-full transition-all duration-300" style={{ width: pwdStrength.width, backgroundColor: pwdStrength.color }} />
                                                                        </div>
                                                                    </div>
                                                                )}
                                                                
                                                                <div className="mt-4 flex flex-col gap-2.5">
                                                                    <div className={`flex items-center gap-2.5 text-[13px] ${newPassword.length >= 8 ? 'text-green-700 font-medium' : 'text-slate-500'}`}>
                                                                        {newPassword.length >= 8 ? <CheckCircle size={16} className={newPassword.length >= 8 ? 'text-green-600' : 'text-slate-400'} /> : <div className="w-4 h-4 rounded-full border border-slate-300" />}
                                                                        At least 8 characters
                                                                    </div>
                                                                    <div className={`flex items-center gap-2.5 text-[13px] ${/[0-9]/.test(newPassword) ? 'text-green-700 font-medium' : 'text-slate-500'}`}>
                                                                        {/[0-9]/.test(newPassword) ? <CheckCircle size={16} className={/[0-9]/.test(newPassword) ? 'text-green-600' : 'text-slate-400'} /> : <div className="w-4 h-4 rounded-full border border-slate-300" />}
                                                                        Contains a number
                                                                    </div>
                                                                    <div className={`flex items-center gap-2.5 text-[13px] ${/[A-Z]/.test(newPassword) ? 'text-green-700 font-medium' : 'text-slate-500'}`}>
                                                                        {/[A-Z]/.test(newPassword) ? <CheckCircle size={16} className={/[A-Z]/.test(newPassword) ? 'text-green-600' : 'text-slate-400'} /> : <div className="w-4 h-4 rounded-full border border-slate-300" />}
                                                                        Contains an uppercase letter
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            <div>
                                                                <label className="block text-[14px] font-medium text-slate-700 mb-1.5">Confirm New Password</label>
                                                                <div className="relative">
                                                                    <input type={showConfirm ? "text" : "password"} required minLength={8} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="w-full bg-white border border-slate-300 text-slate-900 text-[14px] rounded-lg px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-shadow shadow-sm placeholder:text-slate-400" style={{ paddingRight: 48 }} placeholder="••••••••••••" />
                                                                    <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors flex items-center justify-center p-1 bg-transparent border-none cursor-pointer">
                                                                        {showConfirm ? <Eye size={18} /> : <EyeOff size={18} />}
                                                                    </button>
                                                                </div>
                                                                {confirmPassword && newPassword !== confirmPassword && (
                                                                    <p className="mt-2 text-[13px] font-medium text-red-600">Passwords do not match.</p>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        <div style={{ display: 'flex', justifyContent: pwdStep === 1 ? 'flex-end' : 'space-between', alignItems: 'center', marginTop: 32, paddingTop: 24, borderTop: `1px solid ${C.borderLight}` }}>
                                            {pwdStep === 1 ? (
                                                <button type="submit" disabled={isSavingPassword || !currentPassword} className="inline-flex items-center justify-center gap-2 px-6 py-2.5 text-[14px] font-semibold text-white bg-blue-600 hover:bg-blue-700 border border-transparent rounded-lg cursor-pointer shadow-sm shadow-blue-600/20 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed">
                                                    {isSavingPassword ? <><svg width={16} height={16} className="animate-spin" fill="none" stroke="currentColor" strokeWidth={2}><path d="M21 12a9 9 0 11-6.219-8.56" /></svg>Sending OTP...</> : "Send OTP"}
                                                </button>
                                            ) : (
                                                <>
                                                    <button type="button" onClick={() => setPwdStep(1)} className="px-5 py-2.5 text-sm font-semibold text-slate-600 bg-transparent hover:bg-slate-100 border border-transparent rounded-lg transition-colors cursor-pointer">
                                                        Cancel
                                                    </button>
                                                    <button type="submit" disabled={isSavingPassword || !otp || otp.length !== 6 || !newPassword || !confirmPassword || newPassword !== confirmPassword} className="inline-flex items-center justify-center gap-2 px-6 py-2.5 text-[14px] font-semibold text-white bg-blue-600 hover:bg-blue-700 border border-transparent rounded-lg cursor-pointer shadow-sm shadow-blue-600/20 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed">
                                                        {isSavingPassword ? <><svg width={16} height={16} className="animate-spin" fill="none" stroke="currentColor" strokeWidth={2}><path d="M21 12a9 9 0 11-6.219-8.56" /></svg>Updating...</> : "Verify & Update Password"}
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </form>
                                </div>
                            )}

                            {activeTab === 'operations' && (
                                <OperationsTab />
                            )}

                        </div>
                    </div>
                </PageWrapper>



                {/* Success Modal */}
                {showSuccessModal && (
                    <div style={{
                        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                        background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999
                    }}>
                        <div style={{
                            background: '#fff', borderRadius: 20, padding: 32, maxWidth: 400, width: '90%',
                            boxShadow: '0 24px 48px rgba(0,0,0,0.15)', textAlign: 'center',
                            animation: 'popIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
                        }}>
                            <div style={{
                                width: 64, height: 64, borderRadius: 32, background: '#d1fae5',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px'
                            }}>
                                <CheckCircle size={32} color="#10b981" />
                            </div>
                            <h2 style={{ fontSize: 24, fontWeight: 700, color: '#111827', marginBottom: 12 }}>Success!</h2>
                            <p style={{ fontSize: 15, color: '#6b7280', marginBottom: 24, lineHeight: 1.5 }}>
                                {showSuccessModal}
                            </p>
                            <button
                                onClick={() => setShowSuccessModal(null)}
                                style={{
                                    width: '100%', padding: '12px', background: '#2563eb', color: '#fff',
                                    border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 600, cursor: 'pointer',
                                    transition: 'all 0.2s', boxShadow: '0 4px 6px -1px rgba(37, 99, 235, 0.2)'
                                }}
                                onMouseOver={e => e.currentTarget.style.transform = 'translateY(-1px)'}
                                onMouseOut={e => e.currentTarget.style.transform = 'none'}
                            >
                                Awesome
                            </button>
                        </div>
                        <style>{`
                            @keyframes popIn {
                                0% { opacity: 0; transform: scale(0.9); }
                                100% { opacity: 1; transform: scale(1); }
                            }
                        `}</style>
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
