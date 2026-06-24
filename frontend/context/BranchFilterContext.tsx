"use client";

import React, { createContext, useContext, useState, ReactNode } from "react";

interface BranchFilterContextType {
    selectedBranchId: string | null; // null means 'All Branches'
    setSelectedBranchId: (id: string | null) => void;
}

const BranchFilterContext = createContext<BranchFilterContextType | undefined>(undefined);

export function BranchFilterProvider({ children }: { children: ReactNode }) {
    const [selectedBranchId, setSelectedBranchId] = useState<string | null>(null);

    return (
        <BranchFilterContext.Provider value={{ selectedBranchId, setSelectedBranchId }}>
            {children}
        </BranchFilterContext.Provider>
    );
}

export function useBranchFilter() {
    const context = useContext(BranchFilterContext);
    if (context === undefined) {
        throw new Error("useBranchFilter must be used within a BranchFilterProvider");
    }
    return context;
}
