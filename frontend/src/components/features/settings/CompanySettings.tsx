"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getCompanies, updateCompany } from "@/lib/api";
import { Save, Building2, Calendar, Globe } from "lucide-react";

// Hardcoded for demo as in other components
const ACME_CORP_ID = "6921efce-4ef6-418f-b454-7699ba440600";

interface Company {
    id: string;
    name: string;
    fiscal_year_end: number;
    currency: string;
}

export function CompanySettings() {
    const queryClient = useQueryClient();
    const { data: companies, isLoading } = useQuery<Company[]>({
        queryKey: ["companies"],
        queryFn: getCompanies
    });

    const company = companies?.find((c: Company) => c.id === ACME_CORP_ID);

    const [form, setForm] = useState({
        name: "",
        fiscal_year_end: 12,
        currency: "USD"
    });

    useEffect(() => {
        if (company) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setForm({
                name: company.name,
                fiscal_year_end: company.fiscal_year_end,
                currency: company.currency
            });
        }
    }, [company]);

    const mutation = useMutation({
        mutationFn: (updatedData: typeof form) => updateCompany(ACME_CORP_ID, updatedData),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["companies"] });
        }
    });

    if (isLoading) return <div className="p-8 text-center text-muted-foreground">Loading company profile...</div>;

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-1.5 flex items-center">
                        <Building2 className="h-4 w-4 mr-2" /> Company Name
                    </label>
                    <input
                        type="text"
                        value={form.name}
                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                        className="w-full px-4 py-2.5 bg-white/5 border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary transition-all"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-1.5 flex items-center">
                        <Calendar className="h-4 w-4 mr-2" /> Fiscal Year End (Month)
                    </label>
                    <select
                        value={form.fiscal_year_end}
                        onChange={(e) => setForm({ ...form, fiscal_year_end: parseInt(e.target.value) })}
                        className="w-full px-4 py-2.5 bg-white/5 border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary transition-all appearance-none"
                    >
                        {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
                            <option key={month} value={month}>
                                {new Date(2000, month - 1).toLocaleString('default', { month: 'long' })}
                            </option>
                        ))}
                    </select>
                </div>

                <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-1.5 flex items-center">
                        <Globe className="h-4 w-4 mr-2" /> Reporting Currency
                    </label>
                    <select
                        value={form.currency}
                        onChange={(e) => setForm({ ...form, currency: e.target.value })}
                        className="w-full px-4 py-2.5 bg-white/5 border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary transition-all appearance-none"
                    >
                        <option value="USD">USD - US Dollar</option>
                        <option value="EUR">EUR - Euro</option>
                        <option value="GBP">GBP - British Pound</option>
                        <option value="CAD">CAD - Canadian Dollar</option>
                    </select>
                </div>
            </div>

            <div className="flex justify-end pt-4">
                <button
                    onClick={() => mutation.mutate(form)}
                    disabled={mutation.isPending}
                    className="flex items-center px-6 py-2.5 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-all shadow-[0_0_20px_rgba(59,130,246,0.3)] disabled:opacity-50"
                >
                    <Save className="h-4 w-4 mr-2" />
                    {mutation.isPending ? "Saving..." : "Save Changes"}
                </button>
            </div>

            {mutation.isSuccess && (
                <p className="text-sm text-emerald-400 text-center">Settings updated successfully!</p>
            )}
        </div>
    );
}
