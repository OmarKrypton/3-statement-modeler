"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getIncomeStatement, getBalanceSheet, getCashFlow } from "@/lib/api";
import { StatementResult, BalanceSheetResult, CashFlowResult } from "@/types";
import { formatCurrency } from "@/lib/utils";
import { Building2, Calendar as CalendarIcon, FileText, Scale, TrendingUp, AlertCircle } from "lucide-react";

// Hardcoded for MVP
const ACME_CORP_ID = "6921efce-4ef6-418f-b454-7699ba440600";

export default function StatementsPage() {
    const [startPeriod, setStartPeriod] = useState("2024-01-01");
    const [endPeriod, setEndPeriod] = useState("2024-12-31");

    const { data: incomeStatement, isLoading, isError } = useQuery<StatementResult>({
        queryKey: ["income-statement", ACME_CORP_ID, startPeriod, endPeriod],
        queryFn: () => getIncomeStatement(ACME_CORP_ID, startPeriod, endPeriod),
    });

    const { data: balanceSheet, isLoading: isBsLoading, isError: isBsError } = useQuery<BalanceSheetResult>({
        queryKey: ["balance-sheet", ACME_CORP_ID, endPeriod],
        queryFn: () => getBalanceSheet(ACME_CORP_ID, endPeriod),
    });

    const { data: cashFlow, isLoading: isCfLoading, isError: isCfError } = useQuery<CashFlowResult>({
        queryKey: ["cash-flow", ACME_CORP_ID, startPeriod, endPeriod],
        queryFn: () => getCashFlow(ACME_CORP_ID, startPeriod, endPeriod),
    });

    return (
        <div className="flex flex-col gap-6 py-8 animate-in slide-in-from-bottom-4 duration-500">
            <div className="flex justify-between items-end">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-foreground">Financial Statements</h1>
                    <p className="mt-2 text-muted-foreground w-3/4">
                        Aggregated, real-time reporting based entirely on your mapped Trial Balance entries.
                    </p>
                </div>
            </div>

            {/* Control Panel */}
            <div className="glass-card rounded-xl p-6 border-border mt-4 flex gap-8 items-end">
                <div className="flex-1">
                    <label className="block text-sm font-medium text-muted-foreground mb-1 flex items-center">
                        <Building2 className="w-4 h-4 mr-2" /> Company
                    </label>
                    <div className="px-3 py-2 bg-white/5 border border-border rounded-md text-foreground cursor-not-allowed">
                        Acme Corp (Demo)
                    </div>
                </div>
                <div className="flex-1">
                    <label className="block text-sm font-medium text-muted-foreground mb-1 flex items-center">
                        <CalendarIcon className="w-4 h-4 mr-2" /> Period Start
                    </label>
                    <input
                        type="date"
                        value={startPeriod}
                        onChange={(e) => setStartPeriod(e.target.value)}
                        className="w-full px-3 py-2 bg-black/40 border border-border rounded-md text-foreground focus:ring-primary focus:border-primary"
                    />
                </div>
                <div className="flex-1">
                    <label className="block text-sm font-medium text-muted-foreground mb-1 flex items-center">
                        <CalendarIcon className="w-4 h-4 mr-2" /> Period End
                    </label>
                    <input
                        type="date"
                        value={endPeriod}
                        onChange={(e) => setEndPeriod(e.target.value)}
                        className="w-full px-3 py-2 bg-black/40 border border-border rounded-md text-foreground focus:ring-primary focus:border-primary"
                    />
                </div>
            </div>

            {/* Statement Displaay Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-4">

                {/* Income Statement */}
                <div className="glass-card rounded-xl border border-border overflow-hidden">
                    <div className="p-4 border-b border-border bg-gradient-to-r from-primary/10 flex items-center">
                        <FileText className="w-5 h-5 text-primary mr-2" />
                        <h3 className="font-bold text-lg text-foreground">Income Statement</h3>
                    </div>

                    <div className="p-6">
                        {isLoading ? (
                            <div className="animate-pulse space-y-4">
                                <div className="h-4 bg-white/10 rounded w-full"></div>
                                <div className="h-4 bg-white/10 rounded w-full"></div>
                                <div className="h-4 bg-white/10 rounded w-3/4"></div>
                            </div>
                        ) : isError ? (
                            <div className="text-destructive">Failed to load statement logic. Have you uploaded and mapped an entry?</div>
                        ) : (
                            <div className="space-y-4">

                                {/* Revenues Section */}
                                <div>
                                    <h4 className="border-b border-border font-semibold text-muted-foreground text-sm uppercase mb-2 pb-1 tracking-wider">Revenues</h4>
                                    <div className="flex justify-between items-center py-2 px-2 hover:bg-white/5 rounded transition-colors">
                                        <span className="text-foreground">Total Revenues</span>
                                        <span className="font-mono text-emerald-400">{formatCurrency(incomeStatement?.total_revenues_cents || 0)}</span>
                                    </div>
                                </div>

                                {/* Expenses Section */}
                                <div className="pt-4">
                                    <h4 className="border-b border-border font-semibold text-muted-foreground text-sm uppercase mb-2 pb-1 tracking-wider">Expenses</h4>
                                    <div className="flex justify-between items-center py-2 px-2 hover:bg-white/5 rounded transition-colors">
                                        <span className="text-foreground">Total Operating Expenses</span>
                                        <span className="font-mono text-destructive-foreground">{formatCurrency(incomeStatement?.total_expenses_cents || 0)}</span>
                                    </div>
                                </div>

                                {/* Net Income Divider */}
                                <div className="my-6 border-b-2 border-primary/50"></div>

                                <div className="flex justify-between items-center bg-primary/10 p-4 rounded-lg border border-primary/30">
                                    <span className="text-lg font-bold text-primary-foreground">Net Income</span>
                                    <span className="text-xl font-bold font-mono text-primary-foreground">
                                        {formatCurrency(incomeStatement?.net_income_cents || 0)}
                                    </span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Balance Sheet */}
                <div className="glass-card rounded-xl border border-border overflow-hidden">
                    <div className="p-4 border-b border-border bg-gradient-to-r from-accent/10 flex items-center justify-between">
                        <div className="flex items-center">
                            <Scale className="w-5 h-5 text-accent mr-2" />
                            <h3 className="font-bold text-lg text-foreground">Balance Sheet</h3>
                        </div>
                        {balanceSheet?.is_balanced_equation && (
                            <span className="text-xs bg-emerald-500/20 text-emerald-400 px-2 py-1 rounded border border-emerald-500/30">Balanced</span>
                        )}
                    </div>

                    <div className="p-6">
                        {isBsLoading ? (
                            <div className="animate-pulse space-y-4">
                                <div className="h-4 bg-white/10 rounded w-full"></div>
                                <div className="h-4 bg-white/10 rounded w-full"></div>
                                <div className="h-4 bg-white/10 rounded w-3/4"></div>
                            </div>
                        ) : isBsError ? (
                            <div className="text-destructive">Failed to load statement logic.</div>
                        ) : (
                            <div className="space-y-4">

                                {/* Assets Section */}
                                <div>
                                    <h4 className="border-b border-border font-semibold text-muted-foreground text-sm uppercase mb-2 pb-1 tracking-wider">Assets</h4>
                                    <div className="flex justify-between items-center py-2 px-2 hover:bg-white/5 rounded transition-colors">
                                        <span className="text-foreground">Total Assets</span>
                                        <span className="font-mono text-foreground">{formatCurrency(balanceSheet?.total_assets_cents || 0)}</span>
                                    </div>
                                </div>

                                {/* Liabilities Section */}
                                <div className="pt-4">
                                    <h4 className="border-b border-border font-semibold text-muted-foreground text-sm uppercase mb-2 pb-1 tracking-wider">Liabilities & Equity</h4>
                                    <div className="flex justify-between items-center py-2 px-2 hover:bg-white/5 rounded transition-colors text-sm">
                                        <span className="text-muted-foreground">Total Liabilities</span>
                                        <span className="font-mono text-muted-foreground">{formatCurrency(balanceSheet?.total_liabilities_cents || 0)}</span>
                                    </div>
                                    <div className="flex justify-between items-center py-2 px-2 hover:bg-white/5 rounded transition-colors text-sm">
                                        <span className="text-muted-foreground">Total Equity (Incl. YTD Net Income)</span>
                                        <span className="font-mono text-muted-foreground">{formatCurrency(balanceSheet?.total_equity_cents || 0)}</span>
                                    </div>
                                </div>

                                {/* Balance Equation Divider */}
                                <div className="my-6 border-b-2 border-accent/50"></div>

                                <div className="space-y-4">
                                    <div className="flex justify-between items-center bg-accent/10 p-4 rounded-lg border border-accent/30">
                                        <span className="text-lg font-bold text-accent-foreground">Total Liab + Equity</span>
                                        <span className="text-xl font-bold font-mono text-accent-foreground">
                                            {formatCurrency((balanceSheet?.total_liabilities_cents || 0) + (balanceSheet?.total_equity_cents || 0))}
                                        </span>
                                    </div>

                                    {/* Unmapped Warning */}
                                    {balanceSheet?.unmapped_balance_cents !== 0 && (
                                        <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-200 text-sm flex gap-3">
                                            <AlertCircle className="w-5 h-5 shrink-0" />
                                            <div>
                                                <p className="font-bold mb-1">Out of Balance: {formatCurrency(balanceSheet?.unmapped_balance_cents || 0)}</p>
                                                <p className="opacity-80">
                                                    You have unmapped accounts in your Trial Balance.
                                                    Please visit the <strong>Account Mapping Engine</strong> to standardize all accounts.
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Statement of Cash Flows */}
                <div className="glass-card rounded-xl border border-border overflow-hidden lg:col-span-2">
                    <div className="p-4 border-b border-border bg-gradient-to-r from-emerald-500/10 flex items-center">
                        <TrendingUp className="w-5 h-5 text-emerald-400 mr-2" />
                        <h3 className="font-bold text-lg text-foreground">Statement of Cash Flows (Indirect)</h3>
                    </div>

                    <div className="p-6">
                        {isCfLoading ? (
                            <div className="animate-pulse space-y-4">
                                <div className="h-4 bg-white/10 rounded w-full"></div>
                                <div className="h-4 bg-white/10 rounded w-full"></div>
                            </div>
                        ) : isCfError ? (
                            <div className="text-destructive">Failed to load statement logic.</div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">

                                {/* Operating */}
                                <div>
                                    <h4 className="border-b border-border font-semibold text-muted-foreground text-sm uppercase mb-2 pb-1 tracking-wider">Operating Activities</h4>
                                    <div className="space-y-1">
                                        <div className="flex justify-between items-center py-1 px-2 hover:bg-white/5 rounded text-sm">
                                            <span className="text-muted-foreground">Net Income</span>
                                            <span className="font-mono">{formatCurrency(cashFlow?.net_income_cents || 0)}</span>
                                        </div>
                                        <div className="flex justify-between items-center py-1 px-2 hover:bg-white/5 rounded text-sm">
                                            <span className="text-muted-foreground">Depreciation & Non-Cash</span>
                                            <span className="font-mono">{formatCurrency(cashFlow?.non_cash_adjustments_cents || 0)}</span>
                                        </div>
                                        <div className="flex justify-between items-center py-1 px-2 hover:bg-white/5 rounded text-sm mb-2">
                                            <span className="text-muted-foreground">Changes in Working Capital</span>
                                            <span className="font-mono">{formatCurrency(cashFlow?.operating_wc_delta_cents || 0)}</span>
                                        </div>
                                        <div className="flex justify-between items-center py-2 px-2 bg-emerald-500/10 rounded border border-emerald-500/20 font-medium">
                                            <span className="text-emerald-400">Net Cash from Ops</span>
                                            <span className="font-mono text-emerald-400">{formatCurrency(cashFlow?.net_cash_from_operations_cents || 0)}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Investing / Financing */}
                                <div className="space-y-6">
                                    <div>
                                        <h4 className="border-b border-border font-semibold text-muted-foreground text-sm uppercase mb-2 pb-1 tracking-wider">Investing Activities</h4>
                                        <div className="flex justify-between items-center py-2 px-2 bg-emerald-500/10 rounded border border-emerald-500/20 font-medium text-sm">
                                            <span className="text-emerald-400">Net Cash from Investing</span>
                                            <span className="font-mono text-emerald-400">{formatCurrency(cashFlow?.net_cash_from_investing_cents || 0)}</span>
                                        </div>
                                    </div>
                                    <div>
                                        <h4 className="border-b border-border font-semibold text-muted-foreground text-sm uppercase mb-2 pb-1 tracking-wider">Financing Activities</h4>
                                        <div className="flex justify-between items-center py-2 px-2 bg-emerald-500/10 rounded border border-emerald-500/20 font-medium text-sm">
                                            <span className="text-emerald-400">Net Cash from Financing</span>
                                            <span className="font-mono text-emerald-400">{formatCurrency(cashFlow?.net_cash_from_financing_cents || 0)}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Final Cash Yield */}
                                <div className="flex flex-col justify-center p-6 bg-white/5 rounded-xl border border-border space-y-4">
                                    <div className="flex justify-between items-center text-sm border-b border-white/5 pb-3">
                                        <span className="text-muted-foreground uppercase tracking-wider font-semibold">Net Change in Cash</span>
                                        <span className="font-mono text-foreground font-bold text-lg">{formatCurrency(cashFlow?.net_change_in_cash_cents || 0)}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-sm border-b border-white/5 pb-3">
                                        <span className="text-muted-foreground uppercase tracking-wider font-semibold">Beginning Cash Balance</span>
                                        <span className="font-mono text-muted-foreground">{formatCurrency(cashFlow?.beginning_cash_cents || 0)}</span>
                                    </div>
                                    <div className="flex justify-between items-center bg-emerald-500/10 p-4 rounded-lg border border-emerald-500/30 shadow-sm shadow-emerald-500/5 mt-2">
                                        <span className="font-bold text-emerald-400 uppercase tracking-wider text-sm">Ending Cash Balance</span>
                                        <span className="font-mono text-2xl font-bold text-emerald-400 drop-shadow-sm">{formatCurrency(cashFlow?.ending_cash_cents || 0)}</span>
                                    </div>
                                </div>

                            </div>
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
}
