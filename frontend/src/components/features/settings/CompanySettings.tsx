"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getCompanies, updateCompany } from "@/lib/api";
import { Save, Building2, Calendar, Globe } from "lucide-react";
import { CustomSelect } from "../../ui/CustomSelect";

const MONTHS = [
    { value: "1", label: "January" },
    { value: "2", label: "February" },
    { value: "3", label: "March" },
    { value: "4", label: "April" },
    { value: "5", label: "May" },
    { value: "6", label: "June" },
    { value: "7", label: "July" },
    { value: "8", label: "August" },
    { value: "9", label: "September" },
    { value: "10", label: "October" },
    { value: "11", label: "November" },
    { value: "12", label: "December" },
];

const CURRENCIES = [
    { value: "USD", label: "USD - US Dollar" },
    { value: "EUR", label: "EUR - Euro" },
    { value: "GBP", label: "GBP - British Pound" },
    { value: "JPY", label: "JPY - Japanese Yen" },
    { value: "CAD", label: "CAD - Canadian Dollar" },
    { value: "AUD", label: "AUD - Australian Dollar" },
    { value: "CHF", label: "CHF - Swiss Franc" },
    { value: "CNY", label: "CNY - Chinese Yuan" },
    { value: "AED", label: "AED - UAE Dirham" },
    { value: "SAR", label: "SAR - Saudi Riyal" },
    { value: "EGP", label: "EGP - Egyptian Pound" },
    { value: "HKD", label: "HKD - Hong Kong Dollar" },
    { value: "INR", label: "INR - Indian Rupee" },
    { value: "SGD", label: "SGD - Singapore Dollar" },
    { value: "MXN", label: "MXN - Mexican Peso" },
];

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

                <div className="flex flex-col gap-2">
                    <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center">
                        <Calendar className="h-3 w-3 mr-2" /> Fiscal Year End (Month)
                    </label>
                    <CustomSelect
                        options={MONTHS}
                        value={form.fiscal_year_end.toString()}
                        onChange={(val) => setForm({ ...form, fiscal_year_end: parseInt(val) })}
                        placeholder="Select Month..."
                        searchable={false}
                    />
                </div>

                <div className="flex flex-col gap-2">
                    <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center">
                        <Globe className="h-3 w-3 mr-2" /> Reporting Currency
                    </label>
                    <CustomSelect
                        options={CURRENCIES}
                        value={form.currency}
                        onChange={(val) => setForm({ ...form, currency: val })}
                        placeholder="Select Currency..."
                    />
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
