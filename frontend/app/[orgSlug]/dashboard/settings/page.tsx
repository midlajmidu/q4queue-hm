"use client";

import React, { useState, useEffect } from "react";
import { api, ApiError } from "@/lib/api";
import type { OrganizationSettingsResponse } from "@/types/api";

const C = {
  // bg
  pageBg:     "#f7f8fa",
  cardBg:     "#ffffff",
  cardBgAlt:  "#fbfcfd",
  // borders
  border:     "#e8eaef",
  borderHov:  "#c4ccd8",
  borderLight:"#f1f2f5",
  // text
  text:       "#0f1729",
  textSub:    "#475569",
  textMuted:  "#8b95a9",
  // brand
  brand:      "#4f46e5",
  brandDark:  "#4338ca",
  brandLight: "#eef2ff",
  brandBorder:"#c7d2fe",
  brandGlow:  "rgba(79,70,229,.10)",
  // semantic
  blue:       "#3b82f6", blueBg: "#eff6ff",   blueBorder: "#bfdbfe",
  green:      "#10b981", greenBg: "#ecfdf5",   greenBorder:"#a7f3d0",
  amber:      "#f59e0b", amberBg: "#fffbeb",   amberBorder:"#fde68a",
  red:        "#ef4444", redBg:   "#fef2f2",   redBorder:  "#fecaca",
  violet:     "#7c3aed", violetBg:"#f5f3ff",
  slate:      "#64748b", slateBg: "#f8fafc",
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
    border: 1px solid ${C.border};
    border-radius: 14px;
    box-shadow:
      0 0 0 1px rgba(0,0,0,.02),
      0 1px 2px rgba(0,0,0,.03),
      0 2px 8px rgba(0,0,0,.025);
    transition: box-shadow .25s cubic-bezier(.4,0,.2,1), border-color .25s ease;
  }
  .card:hover {
    box-shadow:
      0 0 0 1px rgba(0,0,0,.03),
      0 4px 12px rgba(0,0,0,.06),
      0 8px 28px rgba(0,0,0,.04);
    border-color: ${C.borderHov};
  }

  .card-header {
    display: flex; align-items: center; justify-content: space-between;
    padding: 16px 24px; border-bottom: 1px solid ${C.border};
    background: linear-gradient(180deg, #fafbfd 0%, ${C.cardBg} 100%);
    border-radius: 14px 14px 0 0;
  }

  .ov-sel {
    appearance: none;
    background: #ffffff;
    border: 1px solid #e2e8f0;
    color: #0f172a;
    border-radius: 8px;
    padding: 9px 34px 9px 12px;
    font-size: 13px; font-weight: 500;
    font-family: 'Inter', sans-serif;
    cursor: pointer; min-width: 172px;
    box-shadow: 0 1px 2px rgba(0,0,0,.03);
    transition: all .2s cubic-bezier(.4,0,.2,1);
  }
  .ov-sel:hover:not(:disabled) {
    border-color: #cbd5e1;
    background: #f8fafc;
    box-shadow: 0 2px 4px rgba(0,0,0,.04);
  }
  .ov-sel:focus {
    outline: none;
    border-color: #818cf8;
    box-shadow: 0 0 0 3px rgba(129,140,248,.15), 0 1px 2px rgba(0,0,0,.03);
    background: #ffffff;
  }
  .ov-sel:disabled { opacity: .4; cursor: not-allowed; }

  .qa-btn {
    display: inline-flex; align-items: center; justify-content: center; gap: 8px;
    padding: 10px 20px; font-size: 13.5px; font-weight: 600;
    font-family: 'Inter', sans-serif; color: #ffffff;
    background: linear-gradient(180deg, #2563eb 0%, #1d4ed8 100%); border: 1px solid transparent;
    border-radius: 10px; cursor: pointer; text-decoration: none;
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
    border-radius: 11px; flex-shrink: 0;
  }

  .lbl {
    font-size: 10.5px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase;
    color: ${C.textMuted};
    font-family: 'Inter', sans-serif;
    display: block; margin-bottom: 8px;
  }

  .premium-input {
    width: 100%; border-radius: 12px; border: 1px solid #e2e8f0;
    padding: 12px 16px; font-size: 14px; font-weight: 500; color: #0f172a;
    background: #fafbfe; transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    outline: none;
  }
  .premium-input:hover:not(:disabled) { border-color: #cbd5e1; }
  .premium-input:focus:not(:disabled) {
    background: #ffffff; border-color: #818cf8;
    box-shadow: 0 0 0 4px rgba(129,140,248,.15);
  }
  .premium-input:disabled { background: #f8fafc; color: #94a3b8; cursor: not-allowed; }
`;

export default function SettingsPage() {
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
        } catch (err) {
            setPwdError(err instanceof ApiError ? err.detail : "Failed to verify current password and send OTP.");
        } finally {
            setIsSavingPassword(false);
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
                <svg width={24} height={24} className="animate-spin text-indigo-600" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 11-6.219-8.56"/></svg>
            </div>
        );
    }

    return (
        <>
            <style>{STYLES}</style>
            <div className="ov">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 28, maxWidth: 840, margin: '0 auto' }}>
                    
                    {/* Header */}
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '20px' }}>
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                                <div className="icon-badge" style={{ background: C.brandLight, color: C.brand, width: 28, height: 28 }}>
                                    <svg width={14} height={14} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                </div>
                                <span style={{ fontSize: '11.5px', fontWeight: 700, letterSpacing: '.06em', color: C.brand, textTransform: 'uppercase' }}>
                                    Configuration
                                </span>
                            </div>
                            <h1 style={{ fontSize: '28px', fontWeight: 800, letterSpacing: '-.02em', color: C.text, margin: '0 0 6px 0' }}>
                                Settings
                            </h1>
                            <p style={{ fontSize: '14px', color: C.textSub, margin: 0, maxWidth: '500px', lineHeight: 1.5 }}>
                                Update your organization's core details and manage admin credentials.
                            </p>
                        </div>
                    </div>

                    {/* Clinic Information Card */}
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
                                    <svg width={16} height={16} fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
                                    {infoSuccess}
                                </div>
                            )}
                            {infoError && (
                                <div style={{ background: C.redBg, color: C.red, padding: '12px 16px', borderRadius: 8, fontSize: '13px', fontWeight: 500, marginBottom: 24, border: `1px solid ${C.redBorder}`, display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <svg width={16} height={16} fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><path d="m21 21-4.3-4.3"/><circle cx="11" cy="11" r="8"/></svg>
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
                                    <label className="lbl">Public URL Slug</label>
                                    <input type="text" disabled value={settings?.slug || ""} className="premium-input" />
                                </div>

                                <div style={{ gridColumn: '1 / -1' }}>
                                    <label className="lbl">Owner Email Address</label>
                                    <input type="email" disabled value={settings?.email || ""} className="premium-input" />
                                    <p style={{ marginTop: 8, fontSize: 12, color: C.textMuted }}>Modifying the system owner email requires contacting administrative support.</p>
                                </div>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 32, paddingTop: 24, borderTop: `1px solid ${C.borderLight}` }}>
                                <button type="submit" disabled={isSavingInfo || !name.trim()} className="qa-btn">
                                    {isSavingInfo ? <><svg width={16} height={16} className="animate-spin" fill="none" stroke="currentColor" strokeWidth={2}><path d="M21 12a9 9 0 11-6.219-8.56"/></svg>Saving...</> : "Save Details"}
                                </button>
                            </div>
                        </form>
                    </div>

                    {/* Change Password Section */}
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
                                    <svg width={16} height={16} fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
                                    {pwdSuccess}
                                </div>
                            )}
                            {pwdError && (
                                <div style={{ background: C.redBg, color: C.red, padding: '12px 16px', borderRadius: 8, fontSize: '13px', fontWeight: 500, marginBottom: 24, border: `1px solid ${C.redBorder}`, display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <svg width={16} height={16} fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
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
                                                {showCurrent ? <svg width={18} height={18} fill="none" stroke="currentColor" strokeWidth={2}><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg> : <svg width={18} height={18} fill="none" stroke="currentColor" strokeWidth={2}><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24M1 1l22 22"/></svg>}
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        <div>
                                            <label className="lbl">6-Digit OTP (sent to your email)</label>
                                            <input type="text" required maxLength={6} value={otp} onChange={(e) => setOtp(e.target.value.replace(/[^0-9]/g, ''))} className="premium-input text-center text-lg tracking-[0.25em]" placeholder="000000" />
                                        </div>
                                        <div>
                                            <label className="lbl">New Password</label>
                                            <div style={{ position: 'relative' }}>
                                                <input type={showNew ? "text" : "password"} required minLength={8} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="premium-input" style={{ paddingRight: 48 }} placeholder="••••••••••••" />
                                                <button type="button" onClick={() => setShowNew(!showNew)} style={{ position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)', color: C.textMuted, cursor: 'pointer' }} className="hover:text-slate-700 transition-colors">
                                                    {showNew ? <svg width={18} height={18} fill="none" stroke="currentColor" strokeWidth={2}><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg> : <svg width={18} height={18} fill="none" stroke="currentColor" strokeWidth={2}><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24M1 1l22 22"/></svg>}
                                                </button>
                                            </div>
                                            <p style={{ marginTop: 8, fontSize: 12, color: C.textMuted }}>Minimum 8 characters length required.</p>
                                        </div>

                                        <div>
                                            <label className="lbl">Confirm New Password</label>
                                            <div style={{ position: 'relative' }}>
                                                <input type={showConfirm ? "text" : "password"} required minLength={8} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="premium-input" style={{ paddingRight: 48 }} placeholder="••••••••••••" />
                                                <button type="button" onClick={() => setShowConfirm(!showConfirm)} style={{ position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)', color: C.textMuted, cursor: 'pointer' }} className="hover:text-slate-700 transition-colors">
                                                    {showConfirm ? <svg width={18} height={18} fill="none" stroke="currentColor" strokeWidth={2}><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg> : <svg width={18} height={18} fill="none" stroke="currentColor" strokeWidth={2}><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24M1 1l22 22"/></svg>}
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
                                        {isSavingPassword ? <><svg width={16} height={16} className="animate-spin" fill="none" stroke="currentColor" strokeWidth={2}><path d="M21 12a9 9 0 11-6.219-8.56"/></svg>Sending OTP...</> : "Send OTP"}
                                    </button>
                                ) : (
                                    <>
                                        <button type="submit" disabled={isSavingPassword || !otp || otp.length !== 6 || !newPassword || !confirmPassword || newPassword !== confirmPassword} className="qa-btn">
                                            {isSavingPassword ? <><svg width={16} height={16} className="animate-spin" fill="none" stroke="currentColor" strokeWidth={2}><path d="M21 12a9 9 0 11-6.219-8.56"/></svg>Updating...</> : "Verify & Update Password"}
                                        </button>
                                        <button type="button" onClick={() => setPwdStep(1)} className="qa-btn" style={{ background: '#f1f5f9', color: '#475569', boxShadow: 'none' }}>
                                            Cancel
                                        </button>
                                    </>
                                )}
                            </div>
                        </form>
                    </div>

                </div>
            </div>
        </>
    );
}
