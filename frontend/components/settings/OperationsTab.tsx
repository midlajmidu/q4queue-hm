"use client";

import React, { useState } from "react";
import { Play, Plus, Clock, Globe, X, Zap, ChevronDown, Check } from "lucide-react";
import { toast } from "sonner";
import { useRouter, useParams } from "next/navigation";
import { api } from "@/lib/api";

interface Template {
    id: string;
    name: string;
    description: string;
    defaultPrefix: string;
    autoPilot: boolean;
}

const MOCK_TEMPLATES: Template[] = [
    {
        id: "1",
        name: "Morning General",
        description: "Standard morning walk-ins. Starts at prefix A.",
        defaultPrefix: "A",
        autoPilot: true,
    },
    {
        id: "2",
        name: "Dr. Smith Consultations",
        description: "Specialized queue for Dr. Smith's booked appointments.",
        defaultPrefix: "S",
        autoPilot: false,
    },
    {
        id: "3",
        name: "Evening Fast-Track",
        description: "Quick renewals and fast-track services for the evening.",
        defaultPrefix: "E",
        autoPilot: false,
    }
];

const TIMEZONES = [
    "Asia/Kolkata (IST)"
];

export function OperationsTab() {
    const [templates, setTemplates] = useState<Template[]>(MOCK_TEMPLATES);
    const router = useRouter();
    const params = useParams();
    
    // Modal A State (Launch)
    const [launchTemplate, setLaunchTemplate] = useState<Template | null>(null);
    const [launchQueueName, setLaunchQueueName] = useState("");
    const [launchPrefix, setLaunchPrefix] = useState("");
    const [isLaunching, setIsLaunching] = useState(false);

    // Modal B State (Create)
    const [isCreating, setIsCreating] = useState(false);
    const [createName, setCreateName] = useState("");
    const [createQueueName, setCreateQueueName] = useState("");
    const [createPrefix, setCreatePrefix] = useState("");
    const [isAutoPilot, setIsAutoPilot] = useState(false);
    const [timezone, setTimezone] = useState(TIMEZONES[0]);

    // Handle Launch Click
    const handleLaunchClick = (template: Template) => {
        setLaunchTemplate(template);
        // Pre-fill
        const today = new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
        setLaunchQueueName(`${template.name} - ${today}`);
        setLaunchPrefix(template.defaultPrefix);
    };

    const handleConfirmLaunch = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLaunching(true);
        try {
            // 1. Get or Create Today's Session
            const todayDate = new Date().toISOString().split('T')[0];
            let sessionId = null;
            
            const sessionsResponse = await api.listSessions(1, 0, todayDate);
            if (sessionsResponse.items && sessionsResponse.items.length > 0) {
                sessionId = sessionsResponse.items[0].id;
            } else {
                const newSession = await api.createSession({ 
                    session_date: todayDate, 
                    title: `Session - ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}` 
                });
                sessionId = newSession.id;
            }

            // 2. Create the Queue inside that Session
            const queue = await api.createSessionQueue(sessionId, {
                name: launchQueueName,
                prefix: launchPrefix,
            });

            toast.success(`Session "${launchQueueName}" launched successfully!`);
            setLaunchTemplate(null);
            router.push(`/${params.orgSlug}/dashboard/queues/${queue.id}`);
        } catch (error: any) {
            toast.error(error?.detail || "Failed to launch session");
        } finally {
            setIsLaunching(false);
        }
    };

    const handleConfirmCreate = (e: React.FormEvent) => {
        e.preventDefault();
        
        const newTemplate: Template = {
            id: Math.random().toString(36).substr(2, 9),
            name: createName,
            description: `Default Queue: ${createQueueName}`,
            defaultPrefix: createPrefix,
            autoPilot: isAutoPilot,
        };
        
        setTemplates([newTemplate, ...templates]);
        toast.success("New template created successfully!");
        
        if (isAutoPilot) {
            toast.success(`Auto-Pilot scheduled for Midnight in ${timezone}`);
        }

        // Reset
        setIsCreating(false);
        setCreateName("");
        setCreateQueueName("");
        setCreatePrefix("");
        setIsAutoPilot(false);
    };

    return (
        <div className="w-full">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 pb-6 border-b border-slate-200 dark:border-slate-800">
                <div>
                    <h2 className="text-xl font-semibold text-slate-900 dark:text-white m-0">Session Templates</h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1.5">
                        Manage pre-configured queue templates and automate your daily schedule.
                    </p>
                </div>
                <button 
                    onClick={() => setIsCreating(true)}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 text-sm font-medium rounded-xl transition-all shadow-sm hover:shadow-md hover:-translate-y-0.5 active:translate-y-0"
                >
                    <Plus size={18} />
                    Create Custom Template
                </button>
            </div>

            {/* Template Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {templates.map(template => (
                    <div 
                        key={template.id} 
                        className="group relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 transition-all hover:border-blue-500/50 hover:shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:hover:shadow-[0_8px_30px_rgb(0,0,0,0.2)] flex flex-col h-full"
                    >
                        <div className="flex justify-between items-start mb-4">
                            <div className="w-12 h-12 rounded-xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center border border-slate-100 dark:border-slate-700/50">
                                <span className="text-xl font-bold text-slate-700 dark:text-slate-300">
                                    {template.defaultPrefix}
                                </span>
                            </div>
                            {template.autoPilot && (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-xs font-semibold border border-indigo-100 dark:border-indigo-500/20">
                                    <Zap size={12} className="fill-indigo-600 dark:fill-indigo-400" />
                                    Auto-Pilot
                                </span>
                            )}
                        </div>
                        
                        <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1.5 line-clamp-1">
                            {template.name}
                        </h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mb-8 line-clamp-2 flex-grow">
                            {template.description}
                        </p>
                        
                        <button 
                            onClick={() => handleLaunchClick(template)}
                            className="w-full flex items-center justify-center gap-2 py-2.5 bg-blue-600 border border-transparent text-white text-sm font-medium rounded-xl hover:bg-blue-700 transition-colors shadow-sm shadow-blue-600/20"
                        >
                            <Play size={16} />
                            Launch Session
                        </button>
                    </div>
                ))}
            </div>

            {/* Modal A: Manual Launch Workflow */}
            {launchTemplate && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-slate-900/40 dark:bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-slate-900 rounded-[24px] shadow-2xl border border-slate-100 dark:border-slate-800 w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Launch Session</h3>
                            <button onClick={() => setLaunchTemplate(null)} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
                                <X size={20} />
                            </button>
                        </div>
                        
                        <form onSubmit={handleConfirmLaunch} className="p-6">
                            <div className="mb-6">
                                <div className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">Using Template</div>
                                <div className="text-base font-semibold text-slate-900 dark:text-white">{launchTemplate.name}</div>
                            </div>

                            <div className="space-y-5">
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Custom Queue Name</label>
                                    <input 
                                        type="text" 
                                        required
                                        value={launchQueueName}
                                        onChange={e => setLaunchQueueName(e.target.value)}
                                        className="w-full px-4 py-3 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white text-sm focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all placeholder:text-slate-400"
                                        placeholder="e.g. Morning Shift - Oct 24"
                                    />
                                </div>
                                
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Starting Token Prefix</label>
                                    <input 
                                        type="text" 
                                        value={launchPrefix}
                                        onChange={e => setLaunchPrefix(e.target.value)}
                                        maxLength={3}
                                        className="w-full px-4 py-3 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white text-sm focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all placeholder:text-slate-400"
                                        placeholder="e.g. A"
                                    />
                                    <p className="text-xs text-slate-500 mt-2">Maximum 3 characters. Leave empty for numbers only.</p>
                                </div>
                            </div>

                            <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3">
                                <button 
                                    type="button" 
                                    onClick={() => setLaunchTemplate(null)}
                                    className="px-5 py-2.5 text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
                                >
                                    Cancel
                                </button>
                                <button 
                                    type="submit"
                                    className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl shadow-sm shadow-blue-600/20 transition-all hover:shadow-md hover:-translate-y-0.5 flex items-center gap-2"
                                >
                                    <Play size={16} />
                                    Launch Session
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal B: Create & Automate Workflow */}
            {isCreating && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-slate-900/40 dark:bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-slate-900 rounded-[24px] shadow-2xl border border-slate-100 dark:border-slate-800 w-full max-w-xl overflow-hidden animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
                        <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50 shrink-0">
                            <div>
                                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Create Custom Template</h3>
                                <p className="text-xs text-slate-500 mt-0.5">Design a reusable configuration for your queues.</p>
                            </div>
                            <button onClick={() => setIsCreating(false)} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
                                <X size={20} />
                            </button>
                        </div>
                        
                        <div className="overflow-y-auto shrink p-6">
                            <form id="create-template-form" onSubmit={handleConfirmCreate} className="space-y-6">
                                
                                {/* Standard Inputs */}
                                <div className="space-y-5">
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Template Name</label>
                                        <input 
                                            type="text" 
                                            required
                                            value={createName}
                                            onChange={e => setCreateName(e.target.value)}
                                            className="w-full px-4 py-3 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white text-sm focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all placeholder:text-slate-400"
                                            placeholder="e.g. General Check-ups"
                                        />
                                    </div>
                                    
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                        <div>
                                            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Default Queue Name</label>
                                            <input 
                                                type="text" 
                                                required
                                                value={createQueueName}
                                                onChange={e => setCreateQueueName(e.target.value)}
                                                className="w-full px-4 py-3 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white text-sm focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all placeholder:text-slate-400"
                                                placeholder="e.g. Daily Queue"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Default Prefix (Optional)</label>
                                            <input 
                                                type="text" 
                                                value={createPrefix}
                                                onChange={e => setCreatePrefix(e.target.value)}
                                                maxLength={3}
                                                className="w-full px-4 py-3 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white text-sm focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all placeholder:text-slate-400"
                                                placeholder="e.g. A"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* The Hero Feature: Daily Auto-Pilot */}
                                <div className={`relative overflow-hidden rounded-2xl transition-all duration-300 ${isAutoPilot ? 'bg-indigo-50/50 dark:bg-indigo-500/5 border-indigo-200 dark:border-indigo-500/20 ring-1 ring-indigo-500/20' : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700'} border p-5`}>
                                    
                                    <div className="flex items-start justify-between">
                                        <div className="flex gap-4">
                                            <div className={`shrink-0 w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${isAutoPilot ? 'bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400' : 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400'}`}>
                                                <Zap size={20} className={isAutoPilot ? 'fill-indigo-600/20' : ''} />
                                            </div>
                                            <div>
                                                <h4 className="text-base font-bold text-slate-900 dark:text-white mb-0.5">Daily Auto-Pilot</h4>
                                                <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed max-w-sm">
                                                    Automatically generate and launch a fresh session for this queue every day at 12:00 AM Midnight.
                                                </p>
                                            </div>
                                        </div>
                                        
                                        {/* Premium iOS-style Toggle */}
                                        <button 
                                            type="button"
                                            onClick={() => setIsAutoPilot(!isAutoPilot)}
                                            className={`relative shrink-0 w-12 h-6 rounded-full transition-colors duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900 ${isAutoPilot ? 'bg-indigo-500' : 'bg-slate-300 dark:bg-slate-600'}`}
                                        >
                                            <span className={`inline-block w-5 h-5 bg-white rounded-full shadow transition-transform duration-300 ease-in-out absolute top-0.5 left-0.5 ${isAutoPilot ? 'translate-x-6' : 'translate-x-0'}`} />
                                        </button>
                                    </div>

                                    {/* Expanded State: Timezone */}
                                    <div className={`grid transition-[grid-template-rows,opacity,margin] duration-300 ease-in-out ${isAutoPilot ? 'grid-rows-[1fr] opacity-100 mt-5 pt-5 border-t border-indigo-100 dark:border-indigo-500/20' : 'grid-rows-[0fr] opacity-0 mt-0 pt-0 border-transparent'}`}>
                                        <div className="overflow-hidden">
                                            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Select Your Timezone</label>
                                            <p className="text-xs text-slate-500 mb-3">We need to know whose midnight it is to schedule the generation correctly.</p>
                                            
                                            <div className="relative">
                                                <Globe className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                                <select 
                                                    value={timezone}
                                                    onChange={e => setTimezone(e.target.value)}
                                                    className="w-full pl-10 pr-10 py-3 bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-500/30 rounded-xl text-slate-900 dark:text-white text-sm font-medium focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all appearance-none cursor-pointer shadow-sm shadow-indigo-500/5"
                                                >
                                                    {TIMEZONES.map(tz => (
                                                        <option key={tz} value={tz}>{tz}</option>
                                                    ))}
                                                </select>
                                                <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={18} />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                
                            </form>
                        </div>
                        
                        <div className="px-6 py-5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 shrink-0 flex justify-end gap-3">
                            <button 
                                type="button" 
                                onClick={() => setIsCreating(false)}
                                className="px-5 py-2.5 text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
                            >
                                Cancel
                            </button>
                            <button 
                                type="submit"
                                form="create-template-form"
                                className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 text-sm font-medium rounded-xl shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5"
                            >
                                Create Template
                            </button>
                        </div>
                    </div>
                </div>
            )}
            
        </div>
    );
}
