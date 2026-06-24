"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { Search, User, Ticket, Calendar, Building2 } from "lucide-react";

export default function GlobalSearchPage() {
    const [query, setQuery] = useState("");
    const [loading, setLoading] = useState(false);
    const [results, setResults] = useState<any[]>([]);
    const [searched, setSearched] = useState(false);

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!query.trim()) return;
        
        setLoading(true);
        setSearched(true);
        try {
            const data = await api.globalOrgAdminSearch(query);
            setResults(data || []);
        } catch (err) {
            console.error(err);
            setResults([]);
        } finally {
            setLoading(false);
        }
    };

    const getIcon = (type: string) => {
        switch (type) {
            case "customer": return <User className="text-blue-500" size={20} />;
            case "token": return <Ticket className="text-amber-500" size={20} />;
            case "session": return <Calendar className="text-indigo-500" size={20} />;
            case "branch": return <Building2 className="text-emerald-500" size={20} />;
            default: return <Search className="text-slate-400" size={20} />;
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div className="text-center py-8">
                <h1 className="text-3xl font-bold text-slate-900 mb-4">Global Search</h1>
                <p className="text-slate-500 max-w-lg mx-auto">
                    Search across all branches for customers, phone numbers, tokens, active sessions, and more.
                </p>
                
                <form onSubmit={handleSearch} className="mt-8 max-w-2xl mx-auto relative">
                    <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                        <Search className="h-5 w-5 text-slate-400" />
                    </div>
                    <input
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Search for a name, phone number, or token..."
                        className="w-full pl-12 pr-24 py-4 rounded-xl border border-slate-300 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-lg"
                    />
                    <button
                        type="submit"
                        disabled={loading || !query.trim()}
                        className="absolute inset-y-2 right-2 bg-indigo-600 text-white px-6 rounded-lg font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50"
                    >
                        Search
                    </button>
                </form>
            </div>

            {searched && (
                <div className="mt-8">
                    <h2 className="text-lg font-semibold text-slate-900 mb-4">
                        {loading ? "Searching..." : `Results for "${query}"`}
                    </h2>
                    
                    {!loading && results.length === 0 ? (
                        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-500">
                            No results found. Try a different search term.
                        </div>
                    ) : (
                        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                            <ul className="divide-y divide-slate-200">
                                {results.map((result, idx) => (
                                    <li key={idx} className="p-4 hover:bg-slate-50 transition-colors flex items-center justify-between">
                                        <div className="flex items-start gap-4">
                                            <div className="mt-1 bg-slate-100 p-2 rounded-lg">
                                                {getIcon(result.type)}
                                            </div>
                                            <div>
                                                <h3 className="font-medium text-slate-900 text-lg">{result.title}</h3>
                                                <p className="text-slate-600">{result.subtitle}</p>
                                                <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                                                    <Building2 size={12} />
                                                    {result.branch_name}
                                                </p>
                                            </div>
                                        </div>
                                        <a 
                                            href={result.url || "#"} 
                                            className="px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors"
                                        >
                                            View Details
                                        </a>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
