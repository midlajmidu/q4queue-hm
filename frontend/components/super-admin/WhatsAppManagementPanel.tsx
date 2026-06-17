"use client";

import { useState } from "react";

export default function WhatsAppManagementPanel() {
    const [status, setStatus] = useState<"Connected" | "Disconnected" | "Expired">("Connected");
    const [isActionLoading, setIsActionLoading] = useState<string | null>(null);

    const handleAction = (actionName: string) => {
        setIsActionLoading(actionName);
        setTimeout(() => {
            setIsActionLoading(null);
            if (actionName === "Logout") setStatus("Disconnected");
            if (actionName === "Reconnect") setStatus("Connected");
        }, 1200);
    };

    const isConnected = status === "Connected";

    return (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
                <div>
                    <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                        <svg className="w-5 h-5 text-emerald-500" fill="currentColor" viewBox="0 0 24 24">
                            <path fillRule="evenodd" clipRule="evenodd" d="M12.012 2C6.49 2 2 6.49 2 12.013c0 1.764.462 3.428 1.258 4.887L2 22l5.244-1.219a9.96 9.96 0 004.768 1.218h.004c5.52 0 10.01-4.488 10.01-10.009S17.534 2 12.012 2zm0 18.324a8.27 8.27 0 01-4.22-1.157l-.302-.18-3.136.73.743-3.056-.196-.312A8.256 8.256 0 013.682 12.01c0-4.596 3.74-8.335 8.337-8.335 2.227 0 4.32.868 5.894 2.44a8.3 8.3 0 012.443 5.895c0 4.594-3.74 8.335-8.334 8.335zm4.57-6.242c-.25-.125-1.482-.733-1.713-.816-.23-.084-.397-.126-.566.125-.168.252-.647.817-.792.984-.146.168-.293.188-.543.063a6.83 6.83 0 01-2.008-1.24 7.55 7.55 0 01-1.393-1.737c-.146-.252-.016-.388.11-.513.113-.112.25-.292.376-.439.125-.147.167-.251.25-.418.084-.168.042-.315-.021-.44-.063-.125-.565-1.36-.774-1.864-.203-.49-.408-.423-.566-.431-.146-.008-.313-.01-.48-.01a.92.92 0 00-.668.314c-.23.25-.878.858-.878 2.093 0 1.234.9 2.427 1.025 2.594.126.167 1.766 2.695 4.28 3.778 1.543.663 2.164.717 2.946.602.868-.126 2.673-1.09 3.05-2.146.376-1.055.376-1.956.262-2.145-.115-.188-.43-.303-.68-.428z" />
                        </svg>
                        WhatsApp Session
                    </h2>
                    <p className="text-xs text-slate-400 mt-0.5">Manage global WhatsApp Web connection</p>
                    <div className="mt-2 inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        Dummy Data (Testing Only)
                    </div>
                </div>
                <div>
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium border ${
                        isConnected ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" :
                        status === "Disconnected" ? "bg-red-500/10 text-red-400 border-red-500/20" :
                        "bg-amber-500/10 text-amber-400 border-amber-500/20"
                    }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${
                            isConnected ? "bg-emerald-400" :
                            status === "Disconnected" ? "bg-red-400" :
                            "bg-amber-400"
                        }`} />
                        {status}
                    </span>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 p-6 gap-6">
                {/* Actions */}
                <div>
                    <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">Connection Actions</h3>
                    <div className="flex flex-wrap gap-3">
                        <button 
                            onClick={() => handleAction("View QR")}
                            disabled={isActionLoading !== null || isConnected}
                            className="flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed text-slate-200 py-2 px-4 rounded-lg transition-colors border border-slate-700 text-sm"
                        >
                            {isActionLoading === "View QR" ? (
                                <div className="w-3.5 h-3.5 border-2 border-slate-400 border-t-white rounded-full animate-spin" />
                            ) : (
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm14 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" /></svg>
                            )}
                            View QR Code
                        </button>
                        
                        <button 
                            onClick={() => handleAction("Reconnect")}
                            disabled={isActionLoading !== null || isConnected}
                            className="flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed text-slate-200 py-2 px-4 rounded-lg transition-colors border border-slate-700 text-sm"
                        >
                            {isActionLoading === "Reconnect" ? (
                                <div className="w-3.5 h-3.5 border-2 border-slate-400 border-t-white rounded-full animate-spin" />
                            ) : (
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                            )}
                            Reconnect
                        </button>

                        <button 
                            onClick={() => handleAction("Logout")}
                            disabled={isActionLoading !== null || !isConnected}
                            className="flex items-center justify-center gap-2 bg-slate-800 hover:bg-red-500/20 hover:text-red-400 hover:border-red-500/30 disabled:opacity-50 disabled:cursor-not-allowed text-slate-200 py-2 px-4 rounded-lg transition-colors border border-slate-700 text-sm"
                        >
                            {isActionLoading === "Logout" ? (
                                <div className="w-3.5 h-3.5 border-2 border-slate-400 border-t-red-400 rounded-full animate-spin" />
                            ) : (
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                            )}
                            Logout Device
                        </button>
                    </div>

                    <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mt-8 mb-4">Diagnostics</h3>
                    <button 
                        onClick={() => handleAction("Test Message")}
                        disabled={isActionLoading !== null || !isConnected}
                        className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white py-2 px-4 rounded-lg transition-colors text-sm"
                    >
                        {isActionLoading === "Test Message" ? (
                            <div className="w-3.5 h-3.5 border-2 border-emerald-400 border-t-white rounded-full animate-spin" />
                        ) : (
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                        )}
                        Send Test Ping
                    </button>
                </div>

                {/* Metrics */}
                <div className="space-y-4">
                    <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">Usage Stats</h3>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/50">
                            <p className="text-xs text-slate-400 mb-1">Total Messages</p>
                            <p className="text-2xl font-semibold text-slate-100">45,231</p>
                            <p className="text-xs text-emerald-400 mt-1 flex items-center gap-1">
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
                                12% this week
                            </p>
                        </div>
                        <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/50">
                            <p className="text-xs text-slate-400 mb-1">Failed Delivery</p>
                            <p className="text-2xl font-semibold text-red-400">12</p>
                            <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                                0.02% error rate
                            </p>
                        </div>
                        <div className="col-span-2 bg-slate-800/50 p-4 rounded-xl border border-slate-700/50 flex items-center justify-between">
                            <div>
                                <p className="text-xs text-slate-400 mb-1">Last System Activity</p>
                                <p className="text-sm font-medium text-slate-200">2 minutes ago</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                                <span className="text-xs text-slate-500 font-mono">OK</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
