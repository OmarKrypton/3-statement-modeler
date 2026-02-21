"use client";

import { useState } from "react";
import { Building2, ListTree, Settings as SettingsIcon } from "lucide-react";
import { CompanySettings } from "@/components/features/settings/CompanySettings";
import { MasterCoASettings } from "@/components/features/settings/MasterCoASettings";

export default function SettingsPage() {
    const [activeTab, setActiveTab] = useState<"company" | "master-coa">("company");

    const tabs = [
        { id: "company", name: "Company Profile", icon: Building2 },
        { id: "master-coa", name: "Master Chart of Accounts", icon: ListTree },
    ] as const;

    return (
        <div className="max-w-5xl mx-auto py-8 px-4">
            <div className="flex items-center mb-8">
                <div className="h-12 w-12 bg-primary/20 rounded-xl flex items-center justify-center mr-4">
                    <SettingsIcon className="h-6 w-6 text-primary" />
                </div>
                <div>
                    <h1 className="text-3xl font-bold text-foreground">Settings</h1>
                    <p className="text-muted-foreground">Manage your organization and financial structure</p>
                </div>
            </div>

            <div className="glass-card rounded-2xl overflow-hidden shadow-2xl border border-border">
                <div className="flex border-b border-border bg-white/5">
                    {tabs.map((tab) => {
                        const IsActive = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex items-center px-8 py-4 text-sm font-semibold transition-all relative
                  ${IsActive ? "text-primary" : "text-muted-foreground hover:text-foreground hover:bg-white/5"}`}
                            >
                                <tab.icon className={`h-4 w-4 mr-2 ${IsActive ? "text-primary" : "text-muted-foreground"}`} />
                                {tab.name}
                                {IsActive && (
                                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary shadow-[0_0_10px_rgba(59,130,246,0.8)]" />
                                )}
                            </button>
                        );
                    })}
                </div>

                <div className="p-8 min-h-[500px]">
                    {activeTab === "company" ? <CompanySettings /> : <MasterCoASettings />}
                </div>
            </div>
        </div>
    );
}
