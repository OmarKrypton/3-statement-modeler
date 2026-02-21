"use client";

import { useQuery } from "@tanstack/react-query";
import { getMasterCoA } from "@/lib/api";
import { Info } from "lucide-react";

interface MasterAccount {
    id: string;
    account_code: string;
    name: string;
    category: string;
    sub_category: string;
    cash_flow_category: string;
    normal_balance: string;
}

export function MasterCoASettings() {
    const { data: masterAccounts, isLoading } = useQuery({
        queryKey: ["master-coa"],
        queryFn: getMasterCoA
    });

    if (isLoading) return <div className="p-8 text-center text-muted-foreground">Loading Master CoA...</div>;

    const categories = ["ASSET", "LIABILITY", "EQUITY", "REVENUE", "EXPENSE"];

    return (
        <div className="space-y-8">
            <div className="flex items-start p-4 rounded-lg bg-primary/10 border border-primary/20">
                <Info className="h-5 w-5 text-primary mr-3 mt-0.5 shrink-0" />
                <p className="text-sm text-muted-foreground leading-relaxed">
                    The Master Chart of Accounts is an immutable global structure used to standardize financial reporting across different company trial balances.
                    All imported accounts must be mapped to one of these master accounts to generate accurate 3-statement models.
                </p>
            </div>

            {categories.map(category => (
                <div key={category} className="space-y-4">
                    <h3 className="text-lg font-semibold text-foreground flex items-center">
                        <div className="h-2 w-2 rounded-full bg-primary mr-2" />
                        {category}
                    </h3>
                    <div className="overflow-hidden rounded-xl border border-border bg-white/5">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-white/5 text-muted-foreground font-medium border-b border-border">
                                <tr>
                                    <th className="px-4 py-3">Code</th>
                                    <th className="px-4 py-3">Account Name</th>
                                    <th className="px-4 py-3">Sub-Category</th>
                                    <th className="px-4 py-3">Cash Flow</th>
                                    <th className="px-4 py-3 text-right">Normal</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border/50">
                                {masterAccounts?.filter((a: MasterAccount) => a.category === category).map((account: MasterAccount) => (
                                    <tr key={account.id} className="hover:bg-white/5 transition-colors">
                                        <td className="px-4 py-3 font-mono text-primary/80">{account.account_code}</td>
                                        <td className="px-4 py-3 font-medium text-foreground">{account.name}</td>
                                        <td className="px-4 py-3 text-muted-foreground">{account.sub_category}</td>
                                        <td className="px-4 py-3">
                                            <span className="px-2 py-0.5 rounded-full bg-accent/20 text-accent text-[10px] font-bold uppercase">
                                                {account.cash_flow_category}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-right text-muted-foreground italic">{account.normal_balance}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            ))}
        </div>
    );
}
