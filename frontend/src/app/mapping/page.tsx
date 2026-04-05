"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getUnmappedAccounts, getMasterCoA, saveMappings, resetMappings, getCompanies } from "@/lib/api";
import { CompanyAccount, MasterAccount } from "@/types";
import { ArrowLeftRight, Check, AlertCircle, Save, RotateCcw, Loader2 } from "lucide-react";
import { CustomSelect } from "../../components/ui/CustomSelect";

export default function MappingPage() {
    const queryClient = useQueryClient();
    const [localMappings, setLocalMappings] = useState<Record<string, string>>({});

    const { data: companies, isLoading: isCompaniesLoading } = useQuery({
        queryKey: ["companies"],
        queryFn: getCompanies
    });

    const companyId = companies?.[0]?.id;

    const { data: unmappedAccounts, isLoading: isLoadingUnmapped } = useQuery<CompanyAccount[]>({
        queryKey: ["unmapped", companyId],
        queryFn: () => getUnmappedAccounts(companyId!),
        enabled: !!companyId,
    });

    const { data: masterAccounts, isLoading: isLoadingMaster } = useQuery<MasterAccount[]>({
        queryKey: ["master-coa"],
        queryFn: getMasterCoA,
    });

    const saveMutation = useMutation({
        mutationFn: (mappingsArray: { company_account_id: string; master_account_id: string }[]) =>
            saveMappings(companyId!, mappingsArray),
        onSuccess: () => {
            setLocalMappings({});
            queryClient.invalidateQueries({ queryKey: ["unmapped", companyId] });
        },
    });

    const resetMutation = useMutation({
        mutationFn: () => resetMappings(companyId!),
        onSuccess: () => {
            setLocalMappings({});
            queryClient.invalidateQueries({ queryKey: ["unmapped", companyId] });
        }
    });

    const handleMap = (companyAccountId: string, masterAccountId: string) => {
        setLocalMappings(prev => ({ ...prev, [companyAccountId]: masterAccountId }));
    };

    const handleSave = () => {
        const payload = Object.entries(localMappings).map(([companyId, masterId]) => ({
            company_account_id: companyId,
            master_account_id: masterId
        }));
        saveMutation.mutate(payload);
    };

    const handleReset = () => {
        if (window.confirm("Are you sure you want to clear ALL existing mappings for this company? This action cannot be undone.")) {
            resetMutation.mutate();
        }
    };

    if (isCompaniesLoading || isLoadingUnmapped || isLoadingMaster) {
        return (
            <div className="flex flex-col items-center justify-center p-24 text-center animate-pulse">
                <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
                <p className="text-muted-foreground">Initializing mapping engine...</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-6 py-8 animate-in slide-in-from-bottom-4 duration-500 min-h-full">
            <div className="flex justify-between items-end">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-foreground">Account Mapping Engine</h1>
                    <p className="mt-2 text-muted-foreground max-w-2xl">
                        Link your raw company trial balance accounts on the left to our standardized Master Chart of Accounts on the right.
                        This standardizes your data for automatic 3-Statement Generation.
                    </p>
                </div>

                <div className="flex gap-4 items-center">
                    <button
                        onClick={handleReset}
                        disabled={resetMutation.isPending}
                        className="flex items-center px-4 py-2.5 rounded-md font-medium text-destructive hover:bg-destructive/10 transition-all border border-transparent hover:border-destructive/20"
                    >
                        <RotateCcw className={`w-4 h-4 mr-2 ${resetMutation.isPending ? "animate-spin" : ""}`} />
                        {resetMutation.isPending ? "Resetting..." : "Reset All Mappings"}
                    </button>

                    <button
                        onClick={handleSave}
                        disabled={Object.keys(localMappings).length === 0 || saveMutation.isPending}
                        className={`flex items-center px-6 py-2.5 rounded-md font-medium transition-all ${Object.keys(localMappings).length === 0
                            ? "bg-muted text-muted-foreground cursor-not-allowed"
                            : "bg-accent text-accent-foreground hover:bg-accent/90 shadow-[0_0_15px_rgba(139,92,246,0.3)]"
                            }`}
                    >
                        {saveMutation.isPending ? "Saving..." : <><Save className="w-4 h-4 mr-2" /> Save {Object.keys(localMappings).length} Mappings</>}
                    </button>
                </div>
            </div>

            {!unmappedAccounts?.length ? (
                <div className="glass-card rounded-xl p-12 text-center mt-8 border-emerald-500/30">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-500/20 mb-4">
                        <Check className="w-8 h-8 text-emerald-400" />
                    </div>
                    <h2 className="text-2xl font-semibold mb-2 text-foreground">All Caught Up!</h2>
                    <p className="text-muted-foreground">There are no unmapped accounts for this company.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-4">

                    {/* LEFT PANE: Unmapped Accounts */}
                    <div className="glass-card rounded-xl border border-border overflow-hidden flex flex-col max-h-[70vh]">
                        <div className="p-4 border-b border-border bg-white/5 flex items-center justify-between">
                            <h3 className="font-semibold text-foreground flex items-center">
                                <AlertCircle className="w-4 h-4 text-warning mr-2 text-amber-500" />
                                Raw Trial Balance ({unmappedAccounts.length} Unmapped)
                            </h3>
                        </div>
                        <div className="overflow-y-auto p-4 space-y-3">
                            {unmappedAccounts.map(acc => {
                                const isMappedLocally = !!localMappings[acc.id];
                                const isDebit = acc.total_balance >= 0;
                                const absDisplay = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Math.abs(acc.total_balance) / 100);
                                return (
                                    <div key={acc.id} className={`relative group p-4 rounded-lg border transition-all ${isMappedLocally ? 'border-primary/50 bg-primary/10' : 'border-border bg-white/5 hover:border-white/20'}`}>
                                        {/* Balance Tooltip — rendered BELOW card to avoid clipping by scroll container header */}
                                        <div className="pointer-events-none absolute top-full left-1/2 -translate-x-1/2 translate-y-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150 z-10">
                                            {/* Arrow pointing up */}
                                            <div className="w-2 h-2 bg-[#1e1e2e] border-t border-l border-border rotate-45 mx-auto mb-[-4px] relative z-20"></div>
                                            <div className="bg-[#1e1e2e] border border-border rounded-lg shadow-xl px-3 py-2 text-xs whitespace-nowrap flex items-center gap-2">
                                                <span className="text-muted-foreground">Total Balance</span>
                                                <span className={`font-mono font-bold ${isDebit ? 'text-emerald-400' : 'text-rose-400'}`}>
                                                    {isDebit ? '+' : '-'}{absDisplay}
                                                </span>
                                                <span className={`text-[10px] px-1.5 py-0.5 rounded border ${isDebit ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-rose-500/10 text-rose-400 border-rose-500/30'}`}>
                                                    {isDebit ? 'DEBIT' : 'CREDIT'}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="flex justify-between items-start">
                                            <div>
                                                <span className="text-xs font-mono text-muted-foreground bg-black/30 px-2 py-1 rounded">{acc.import_account_number}</span>
                                                <p className="font-medium text-foreground mt-2">{acc.import_account_name}</p>
                                                {/* Inline balance badge */}
                                                <span className={`mt-1.5 inline-block text-[10px] font-mono px-2 py-0.5 rounded border ${isDebit ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border-rose-500/20'}`}>
                                                    {isDebit ? '+' : ''}{absDisplay}
                                                </span>
                                            </div>                                            {/* Premium Custom Dropdown */}
                                            <div className="w-64">
                                                <CustomSelect
                                                    options={masterAccounts?.map(m => ({
                                                        value: m.id,
                                                        label: `${m.account_code} - ${m.name}`,
                                                        group: m.category
                                                    })) || []}
                                                    value={localMappings[acc.id] || ""}
                                                    onChange={(val) => handleMap(acc.id, val)}
                                                    placeholder="Select mapping..."
                                                    searchable={true}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>

                    {/* RIGHT PANE: Master CoA Reference */}
                    <div className="glass-card rounded-xl border border-border overflow-hidden flex flex-col hidden lg:flex max-h-[70vh]">
                        <div className="p-4 border-b border-border bg-white/5">
                            <h3 className="font-semibold text-foreground flex items-center">
                                <ArrowLeftRight className="w-4 h-4 text-primary mr-2" />
                                Master Chart of Accounts (Reference)
                            </h3>
                        </div>
                        <div className="overflow-y-auto p-4">
                            {["ASSET", "LIABILITY", "EQUITY", "REVENUE", "EXPENSE"].map(cat => {
                                const accounts = masterAccounts?.filter(m => m.category === cat) || [];
                                if (!accounts.length) return null;

                                return (
                                    <div key={cat} className="mb-6 last:mb-0">
                                        <h4 className="text-xs font-bold tracking-wider text-muted-foreground uppercase mb-3 border-b border-border pb-1">{cat}</h4>
                                        <div className="space-y-1">
                                            {accounts.map((m, idx) => (
                                                <div key={m.id} className={`flex justify-between items-center text-sm p-2 rounded ${idx % 2 === 0 ? 'bg-white/5' : 'bg-transparent'}`}>
                                                    <div>
                                                        <span className="text-primary font-mono mr-2">{m.account_code}</span>
                                                        <span className="text-foreground">{m.name}</span>
                                                    </div>
                                                    <span className="text-xs text-muted-foreground bg-black/30 px-2 py-0.5 rounded">{m.cash_flow_category.replace('_', ' ')}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>

                </div>
            )}
        </div>
    );
}
