"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { GlobalSettings } from "@/types/api";

export default function SuperAdminSettingsPage() {
    const [settings, setSettings] = useState<GlobalSettings | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [successMessage, setSuccessMessage] = useState("");

    const loadSettings = async () => {
        setLoading(true);
        try {
            const data = await api.getGlobalSettings();
            setSettings(data);
        } catch (error) {
            console.error("Failed to load settings:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadSettings();
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!settings) return;
        const { name, value, type } = e.target;
        setSettings({
            ...settings,
            [name]: type === "number" ? parseInt(value) || 0 : value,
        });
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!settings) return;
        
        setSaving(true);
        setSuccessMessage("");
        
        try {
            const updated = await api.updateGlobalSettings(settings);
            setSettings(updated);
            setSuccessMessage("Settings saved successfully!");
            setTimeout(() => setSuccessMessage(""), 3000);
        } catch (error) {
            console.error("Failed to save settings:", error);
            alert("Failed to save settings. Please try again.");
        } finally {
            setSaving(false);
        }
    };

    if (loading && !settings) {
        return (
            <div className="flex justify-center items-center h-64 text-slate-400">
                <svg className="animate-spin w-6 h-6 text-indigo-500 mr-3" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Loading global settings...
            </div>
        );
    }

    if (!settings) {
        return (
            <div className="text-center py-12">
                <p className="text-red-400 font-medium">Failed to load settings.</p>
                <button onClick={loadSettings} className="mt-4 px-4 py-2 bg-slate-800 text-white rounded-lg">Retry</button>
            </div>
        );
    }

    return (
        <form onSubmit={handleSave} className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                        <svg className="w-6 h-6 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        Global Settings
                    </h1>
                    <p className="text-sm text-slate-400 mt-1">Manage platform-wide configurations and default limits.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* Limits Card */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl p-6">
                    <h2 className="text-lg font-semibold text-white flex items-center gap-2 mb-6">
                        <svg className="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                        Default Limits
                    </h2>
                    
                    <div className="space-y-5">
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1.5">Default Queue Limit (Per Org)</label>
                            <input 
                                type="number" 
                                name="default_queue_limit"
                                value={settings.default_queue_limit}
                                onChange={handleChange}
                                min="1"
                                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
                            />
                            <p className="text-xs text-slate-500 mt-1.5">Maximum number of concurrent queues a new organization can create.</p>
                        </div>
                        
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1.5">Default Session Limit (Per Day)</label>
                            <input 
                                type="number" 
                                name="default_session_limit"
                                value={settings.default_session_limit}
                                onChange={handleChange}
                                min="1"
                                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
                            />
                            <p className="text-xs text-slate-500 mt-1.5">Maximum number of unique device sessions allowed per day.</p>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1.5">Default WhatsApp Limits (Messages/Day)</label>
                            <input 
                                type="number" 
                                name="default_whatsapp_limit"
                                value={settings.default_whatsapp_limit}
                                onChange={handleChange}
                                min="0"
                                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
                            />
                            <p className="text-xs text-slate-500 mt-1.5">Maximum WhatsApp notification messages sent per day per organization.</p>
                        </div>
                    </div>
                </div>

                <div className="space-y-6">
                    {/* Branding Card */}
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl p-6">
                        <h2 className="text-lg font-semibold text-white flex items-center gap-2 mb-6">
                            <svg className="w-5 h-5 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" /></svg>
                            Branding Settings
                        </h2>
                        
                        <div className="space-y-5">
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1.5">Platform Name</label>
                                <input 
                                    type="text" 
                                    name="platform_name"
                                    value={settings.platform_name}
                                    onChange={handleChange}
                                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
                                />
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1.5">Primary Brand Color</label>
                                <div className="flex items-center gap-3">
                                    <div className="relative w-10 h-10 rounded-lg overflow-hidden border border-slate-700 shadow-sm shrink-0">
                                        <input 
                                            type="color" 
                                            name="primary_color"
                                            value={settings.primary_color}
                                            onChange={handleChange}
                                            className="absolute -top-2 -left-2 w-16 h-16 cursor-pointer"
                                        />
                                    </div>
                                    <input 
                                        type="text" 
                                        name="primary_color"
                                        value={settings.primary_color}
                                        onChange={handleChange}
                                        className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors uppercase font-mono text-sm"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Support Contact Card */}
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl p-6">
                        <h2 className="text-lg font-semibold text-white flex items-center gap-2 mb-6">
                            <svg className="w-5 h-5 text-sky-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" /></svg>
                            Support Contact
                        </h2>
                        
                        <div className="space-y-5">
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1.5">Support Email</label>
                                <input 
                                    type="email" 
                                    name="support_email"
                                    value={settings.support_email}
                                    onChange={handleChange}
                                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
                                />
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1.5">Support Phone</label>
                                <input 
                                    type="text" 
                                    name="support_phone"
                                    value={settings.support_phone}
                                    onChange={handleChange}
                                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
                                />
                            </div>
                        </div>
                    </div>
                </div>

            </div>

            {/* Floating Save Action */}
            <div className="fixed bottom-0 right-0 left-0 lg:left-64 p-4 pointer-events-none z-10 flex justify-end max-w-7xl mx-auto">
                <div className="pointer-events-auto flex items-center gap-4 bg-slate-900/80 backdrop-blur-md border border-slate-800 p-3 rounded-2xl shadow-2xl">
                    {successMessage && (
                        <span className="text-sm font-medium text-emerald-400 bg-emerald-400/10 px-3 py-1.5 rounded-lg animate-in fade-in">
                            {successMessage}
                        </span>
                    )}
                    <button 
                        type="submit" 
                        disabled={saving}
                        className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2.5 rounded-xl font-semibold transition-all disabled:opacity-70 shadow-lg shadow-indigo-500/20"
                    >
                        {saving ? (
                            <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                        ) : (
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                        )}
                        {saving ? "Saving..." : "Save Changes"}
                    </button>
                </div>
            </div>
        </form>
    );
}
