"use client";

import React, { useState, useEffect } from "react";
import { Play, Plus, Clock, X, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useRouter, useParams } from "next/navigation";
import { api } from "@/lib/api";
import { QueueTemplate } from "@/types/api";

export function OperationsTab() {
    const [templates, setTemplates] = useState<QueueTemplate[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const router = useRouter();
    const params = useParams();

    useEffect(() => {
        loadTemplates();
    }, []);

    const loadTemplates = async () => {
        try {
            const settings = await api.getOrganizationSettings();
            setTemplates(settings.queue_templates || []);
        } catch (err) {
            toast.error("Failed to load templates");
        } finally {
            setIsLoading(false);
        }
    };
    
    // Modal A State (Launch)
    const [launchTemplate, setLaunchTemplate] = useState<QueueTemplate | null>(null);
    const [launchQueueName, setLaunchQueueName] = useState("");
    const [launchPrefix, setLaunchPrefix] = useState("");
    const [launchStartingNumber, setLaunchStartingNumber] = useState("1");
    const [isLaunching, setIsLaunching] = useState(false);

    // Modal B State (Create)
    const [isCreating, setIsCreating] = useState(false);
    const [createName, setCreateName] = useState("");
    const [createQueueName, setCreateQueueName] = useState("");
    const [createPrefix, setCreatePrefix] = useState("");
    const [createStartingNumber, setCreateStartingNumber] = useState("1");

    // Handle Launch Click
    const handleLaunchClick = (template: QueueTemplate) => {
        setLaunchTemplate(template);
        // Pre-fill
        const today = new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
        setLaunchQueueName(`${template.name} - ${today}`);
        setLaunchPrefix(template.defaultPrefix);
        setLaunchStartingNumber(template.startingNumber.toString());
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
                starting_sequence: parseInt(launchStartingNumber) || 1,
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

    const handleConfirmCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        
        const newTemplate: QueueTemplate = {
            id: Math.random().toString(36).substr(2, 9),
            name: createName,
            description: `Default Queue: ${createQueueName}`,
            defaultPrefix: createPrefix,
            startingNumber: parseInt(createStartingNumber) || 1,
        };
        
        const updatedTemplates = [newTemplate, ...templates];
        setTemplates(updatedTemplates);
        try {
            const currentSettings = await api.getOrganizationSettings();
            await api.updateOrganizationSettings({
                name: currentSettings.name,
                address: currentSettings.address || undefined,
                phone_number: currentSettings.phone_number || undefined,
                brand_color: currentSettings.brand_color || undefined,
                queue_templates: updatedTemplates
            });
            toast.success("New template created successfully!");
            // Reset
            setIsCreating(false);
            setCreateName("");
            setCreateQueueName("");
            setCreatePrefix("");
            setCreateStartingNumber("1");
        } catch (err) {
            toast.error("Failed to save template");
            setTemplates(templates); // revert
        }
    };

    const handleDeleteTemplate = async (templateId: string) => {
        if (!window.confirm("Are you sure you want to delete this template?")) return;
        const updatedTemplates = templates.filter(t => t.id !== templateId);
        setTemplates(updatedTemplates);
        try {
            const currentSettings = await api.getOrganizationSettings();
            await api.updateOrganizationSettings({
                name: currentSettings.name,
                address: currentSettings.address || undefined,
                phone_number: currentSettings.phone_number || undefined,
                brand_color: currentSettings.brand_color || undefined,
                queue_templates: updatedTemplates
            });
            toast.success("Template deleted.");
        } catch (err) {
            toast.error("Failed to delete template");
            setTemplates(templates);
        }
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
                                    {template.defaultPrefix || "#"}
                                </span>
                            </div>
                            <button 
                                onClick={(e) => { e.stopPropagation(); handleDeleteTemplate(template.id); }}
                                className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors"
                            >
                                <Trash2 size={16} />
                            </button>
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
                                    <div className="flex gap-3">
                                        <input 
                                            type="text" 
                                            value={launchPrefix}
                                            onChange={e => setLaunchPrefix(e.target.value)}
                                            maxLength={3}
                                            className="w-1/2 px-4 py-3 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white text-sm focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all placeholder:text-slate-400"
                                            placeholder="Prefix (e.g. A)"
                                        />
                                        <input 
                                            type="number" 
                                            value={launchStartingNumber}
                                            onChange={e => setLaunchStartingNumber(e.target.value)}
                                            min="1"
                                            className="w-1/2 px-4 py-3 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white text-sm focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all placeholder:text-slate-400"
                                            placeholder="Starting Num (e.g. 1)"
                                        />
                                    </div>
                                    <p className="text-xs text-slate-500 mt-2">Example: Prefix 'A' and Number '1' creates A1.</p>
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
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Starting Number</label>
                                        <input 
                                            type="number" 
                                            required
                                            min="1"
                                            value={createStartingNumber}
                                            onChange={e => setCreateStartingNumber(e.target.value)}
                                            className="w-full px-4 py-3 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white text-sm focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all placeholder:text-slate-400"
                                            placeholder="e.g. 1"
                                        />
                                        <p className="text-xs text-slate-500 mt-2">The very first token number assigned when using this template.</p>
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
