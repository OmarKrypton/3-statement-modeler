"use client";

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { getPeriods, getIncomeStatement, getBalanceSheet, getCashFlow } from "@/lib/api";
import { StatementResult, BalanceSheetResult, CashFlowResult } from "@/types";
import { formatCurrency } from "@/lib/utils";
import { Building2, Calendar as CalendarIcon, FileText, Scale, TrendingUp, AlertCircle, CheckSquare, Square, Share } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import ExportModal from "@/components/features/export/ExportModal";

// Hardcoded for MVP
const ACME_CORP_ID = "6921efce-4ef6-418f-b454-7699ba440600";

export default function StatementsPage() {
    const [selectedPeriods, setSelectedPeriods] = useState<string[]>([]);
    const [isExportModalOpen, setIsExportModalOpen] = useState(false);

    const { data: availablePeriods, isLoading: isPeriodsLoading } = useQuery<string[]>({
        queryKey: ["periods", ACME_CORP_ID],
        queryFn: () => getPeriods(ACME_CORP_ID),
    });

    // Auto-select latest period if none selected and data loaded
    useEffect(() => {
        if (availablePeriods && availablePeriods.length > 0 && selectedPeriods.length === 0) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setSelectedPeriods([availablePeriods[0]]);
        }
    }, [availablePeriods, selectedPeriods.length]);

    const togglePeriod = (p: string) => {
        setSelectedPeriods(prev =>
            prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]
        );
    };

    const handleExport = (format: "excel" | "pdf", selection: { is: boolean; bs: boolean; cf: boolean }) => {
        if (format === "excel") {
            const params = new URLSearchParams({
                periods: selectedPeriods.join(","),
                include_is: selection.is.toString(),
                include_bs: selection.bs.toString(),
                include_cf: selection.cf.toString(),
            });
            window.open(`http://localhost:8000/api/v1/companies/${ACME_CORP_ID}/export/actuals/excel?${params.toString()}`);
        } else {
            handleExportPDF(selection);
        }
        setIsExportModalOpen(false);
    };

    const handleExportPDF = (selection: { is: boolean; bs: boolean; cf: boolean }) => {
        const doc = new jsPDF("landscape");

        const getExportMetadata = () => {
            const selectedBits: string[] = [];
            if (selection.is) selectedBits.push("IS");
            if (selection.bs) selectedBits.push("BS");
            if (selection.cf) selectedBits.push("CF");

            const mapping: Record<string, string> = {
                "IS": "Income Statement",
                "BS": "Balance Sheet",
                "CF": "Cash Flow"
            };
            const names = selectedBits.map(b => mapping[b]);

            if (selectedBits.length === 3) {
                return { title: "Full Financial Report (Actuals)", filename: "Full_Financial_Report_Actuals" };
            }
            if (selectedBits.length === 1) {
                return { title: `${names[0] || "Financial Statement"} (Actuals)`, filename: `${selectedBits[0]}_Actuals` };
            }

            return {
                title: `${names.join(" & ") || "Financial Report"} (Actuals)`,
                filename: `${selectedBits.join("_")}_Actuals`
            };
        };

        const metadata = getExportMetadata();

        const formatMoney = (cents: number): string => {
            const value = cents / 100;
            const formatted = new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: 'USD',
                minimumFractionDigits: 0,
                maximumFractionDigits: 0,
            }).format(Math.abs(value));

            return value < 0 ? `(${formatted})` : formatted;
        };

        doc.setFontSize(20);
        doc.text(metadata.title, 14, 22);
        doc.setFontSize(10);
        doc.setTextColor(100, 100, 100);
        doc.text(`Generated on ${new Date().toLocaleString()}`, 14, 30);

        const tableHeaders = ["Metric", ...selectedPeriods];
        let lastY = 40;

        if (selection.is) {
            autoTable(doc, {
                startY: lastY,
                head: [tableHeaders],
                body: [
                    ["Total Revenues", ...incomeStatement.map(s => formatMoney(s.total_revenues_cents))],
                    ["Total Expenses", ...incomeStatement.map(s => formatMoney(-s.total_expenses_cents))],
                    [{ content: "Net Income", styles: { fontStyle: 'bold' as const } },
                    ...incomeStatement.map(s => ({ content: formatMoney(s.net_income_cents), styles: { fontStyle: 'bold' as const } }))]
                ],
                theme: 'grid',
                headStyles: { fillColor: [30, 41, 59] },
                styles: { halign: 'right' },
                didParseCell: (d) => { if (d.column.index === 0) d.cell.styles.halign = 'left'; }
            });
            lastY = ((doc as unknown) as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 15;
        }

        if (selection.bs) {
            autoTable(doc, {
                startY: lastY,
                head: [tableHeaders],
                body: [
                    ["Total Assets", ...balanceSheet.map(s => formatMoney(s.total_assets_cents))],
                    ["Total Liabilities", ...balanceSheet.map(s => formatMoney(-s.total_liabilities_cents))],
                    ["Total Equity", ...balanceSheet.map(s => formatMoney(-s.total_equity_cents))],
                    [{ content: "Liab + Equity", styles: { fontStyle: 'bold' as const } },
                    ...balanceSheet.map(s => ({ content: formatMoney(s.total_liabilities_cents + s.total_equity_cents), styles: { fontStyle: 'bold' as const } }))]
                ],
                theme: 'grid',
                headStyles: { fillColor: [15, 23, 42] },
                styles: { halign: 'right' },
                didParseCell: (d) => { if (d.column.index === 0) d.cell.styles.halign = 'left'; }
            });
            lastY = ((doc as unknown) as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 15;
        }

        if (selection.cf) {
            autoTable(doc, {
                startY: lastY,
                head: [tableHeaders],
                body: [
                    ["Net Income", ...cashFlow.map(s => formatMoney(s.net_income_cents))],
                    ["Net Cash from Ops", ...cashFlow.map(s => formatMoney(s.net_cash_from_operations_cents))],
                    ["Net Cash from Investing", ...cashFlow.map(s => formatMoney(s.net_cash_from_investing_cents))],
                    ["Net Cash from Financing", ...cashFlow.map(s => formatMoney(s.net_cash_from_financing_cents))],
                    [{ content: "Ending Cash", styles: { fontStyle: 'bold' as const } },
                    ...cashFlow.map(s => ({ content: formatMoney(s.ending_cash_cents), styles: { fontStyle: 'bold' as const } }))]
                ],
                theme: 'grid',
                headStyles: { fillColor: [5, 150, 105] },
                styles: { halign: 'right' },
                didParseCell: (d) => { if (d.column.index === 0) d.cell.styles.halign = 'left'; }
            });
        }

        doc.save(`${metadata.filename}.pdf`);
    };

    const hasSelection = selectedPeriods.length > 0;

    const { data: incomeStatement = [], isLoading, isError } = useQuery<StatementResult[]>({
        queryKey: ["income-statement", ACME_CORP_ID, selectedPeriods],
        queryFn: () => getIncomeStatement(ACME_CORP_ID, selectedPeriods),
        enabled: hasSelection,
    });

    const { data: balanceSheet = [], isLoading: isBsLoading, isError: isBsError } = useQuery<BalanceSheetResult[]>({
        queryKey: ["balance-sheet", ACME_CORP_ID, selectedPeriods],
        queryFn: () => getBalanceSheet(ACME_CORP_ID, selectedPeriods),
        enabled: hasSelection,
    });

    const { data: cashFlow = [], isLoading: isCfLoading, isError: isCfError } = useQuery<CashFlowResult[]>({
        queryKey: ["cash-flow", ACME_CORP_ID, selectedPeriods],
        queryFn: () => getCashFlow(ACME_CORP_ID, selectedPeriods),
        enabled: hasSelection,
    });

    const hasUnmapped = balanceSheet.some(bs => bs.unmapped_balance_cents !== 0);

    return (
        <div className="flex flex-col gap-6 py-8 animate-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-foreground">Financial Statements</h1>
                    <p className="mt-2 text-muted-foreground max-w-2xl">
                        Comparative, real-time reporting based entirely on your mapped Trial Balance entries. Select multiple periods to track performance over time.
                    </p>
                </div>
                {hasSelection && (
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setIsExportModalOpen(true)}
                            className="bg-primary/10 hover:bg-primary/20 border border-primary/20 hover:border-primary/40 px-5 py-2.5 rounded-xl flex items-center gap-2.5 transition-all font-semibold text-primary shadow-lg shadow-primary/5 active:scale-95 group"
                        >
                            <Share className="w-4.5 h-4.5 transition-transform group-hover:scale-110" />
                            <span className="tracking-wide">Export Report</span>
                        </button>
                    </div>
                )}
            </div>

            <ExportModal
                isOpen={isExportModalOpen}
                onClose={() => setIsExportModalOpen(false)}
                onExport={(format, selection) => handleExport(format, selection)}
                title="Export Comparative Report"
            />

            {/* Control Panel */}
            <div className="glass-card rounded-xl p-6 border-border mt-4 flex gap-8 items-start">
                <div className="w-1/4">
                    <label className="block text-sm font-medium text-muted-foreground mb-2 flex items-center">
                        <Building2 className="w-4 h-4 mr-2" /> Company
                    </label>
                    <div className="px-3 py-2 bg-white/5 border border-border rounded-md text-foreground cursor-not-allowed">
                        Acme Corp (Demo)
                    </div>
                </div>
                <div className="flex-1">
                    <label className="block text-sm font-medium text-muted-foreground mb-2 flex items-center">
                        <CalendarIcon className="w-4 h-4 mr-2" /> Select Reporting Periods
                    </label>
                    <div className="flex flex-wrap gap-2">
                        {isPeriodsLoading ? (
                            <span className="text-sm text-muted-foreground">Loading periods...</span>
                        ) : availablePeriods?.length ? (
                            availablePeriods.map(p => (
                                <button
                                    key={p}
                                    onClick={() => togglePeriod(p)}
                                    className={`flex items-center gap-2 px-3 py-1.5 rounded-md border text-sm transition-colors ${selectedPeriods.includes(p) ? 'bg-primary/20 border-primary/50 text-primary-foreground shadow-sm' : 'bg-white/5 border-border text-muted-foreground hover:bg-white/10'}`}
                                >
                                    {selectedPeriods.includes(p) ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                                    {p}
                                </button>
                            ))
                        ) : (
                            <span className="text-sm text-muted-foreground">No trial balances found.</span>
                        )}
                    </div>
                </div>
            </div>

            {/* Empty State Warning */}
            {!hasSelection && !isPeriodsLoading && (
                <div className="p-8 text-center glass-card rounded-xl border border-border mt-4">
                    <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                    <h3 className="text-lg font-bold text-foreground mb-2">No Periods Selected</h3>
                    <p className="text-muted-foreground">Please select at least one reporting period from the control panel to generate financial statements.</p>
                </div>
            )}

            {/* Statement Display Grid */}
            {hasSelection && (
                <div className="flex flex-col gap-8 mt-4">

                    {/* Income Statement */}
                    <div className="glass-card rounded-xl border border-border overflow-hidden">
                        <div className="p-4 border-b border-border bg-gradient-to-r from-primary/10 flex items-center">
                            <FileText className="w-5 h-5 text-primary mr-2" />
                            <h3 className="font-bold text-lg text-foreground">Income Statement</h3>
                        </div>

                        <div className="px-1 overflow-x-auto">
                            {isLoading ? (
                                <div className="p-6 animate-pulse space-y-4">
                                    <div className="h-4 bg-white/10 rounded w-full"></div>
                                    <div className="h-4 bg-white/10 rounded w-full"></div>
                                </div>
                            ) : isError ? (
                                <div className="p-6 text-destructive">Failed to load statement logic.</div>
                            ) : (
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-border text-muted-foreground">
                                            <th className="py-4 px-6 font-semibold text-left w-1/3">Metric</th>
                                            {incomeStatement?.map(s => (
                                                <th key={s.period} className="py-4 px-6 font-semibold text-right">{s.period}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border/50">
                                        <tr className="hover:bg-white/5 transition-colors">
                                            <td className="py-4 px-6 text-foreground font-medium">Total Revenues</td>
                                            {incomeStatement?.map(s => (
                                                <td key={s.period} className="py-4 px-6 text-right font-mono text-emerald-400">{formatCurrency(s.total_revenues_cents)}</td>
                                            ))}
                                        </tr>
                                        <tr className="hover:bg-white/5 transition-colors">
                                            <td className="py-4 px-6 text-foreground font-medium">Total Operating Expenses</td>
                                            {incomeStatement?.map(s => (
                                                <td key={s.period} className="py-4 px-6 text-right font-mono text-destructive-foreground">{formatCurrency(s.total_expenses_cents)}</td>
                                            ))}
                                        </tr>
                                        <tr className="bg-primary/5 border-t border-primary/20">
                                            <td className="py-5 px-6 font-bold text-primary-foreground text-base">Net Income</td>
                                            {incomeStatement?.map(s => (
                                                <td key={s.period} className="py-5 px-6 text-right font-mono font-bold text-primary-foreground text-base">{formatCurrency(s.net_income_cents)}</td>
                                            ))}
                                        </tr>
                                    </tbody>
                                </table>
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
                        </div>

                        <div className="px-1 overflow-x-auto">
                            {isBsLoading ? (
                                <div className="p-6 animate-pulse space-y-4">
                                    <div className="h-4 bg-white/10 rounded w-full"></div>
                                </div>
                            ) : isBsError ? (
                                <div className="p-6 text-destructive">Failed to load statement logic.</div>
                            ) : (
                                <div>
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="border-b border-border text-muted-foreground">
                                                <th className="py-4 px-6 font-semibold text-left w-1/3">Metric</th>
                                                {balanceSheet?.map(s => (
                                                    <th key={s.period} className="py-4 px-6 font-semibold text-right">
                                                        <div className="flex flex-col items-end">
                                                            <span>{s.period}</span>
                                                            {s.is_balanced_equation ? (
                                                                <span className="text-[10px] uppercase bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 mt-1 rounded border border-emerald-500/30">Balanced</span>
                                                            ) : (
                                                                <span className="text-[10px] uppercase bg-amber-500/20 text-amber-400 px-1.5 py-0.5 mt-1 rounded border border-amber-500/30">Imbalanced</span>
                                                            )}
                                                        </div>
                                                    </th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-border/50">
                                            <tr className="hover:bg-white/5 transition-colors">
                                                <td className="py-4 px-6 text-foreground font-medium">Total Assets</td>
                                                {balanceSheet?.map(s => (
                                                    <td key={s.period} className="py-4 px-6 text-right font-mono text-foreground">{formatCurrency(s.total_assets_cents)}</td>
                                                ))}
                                            </tr>
                                            <tr className="hover:bg-white/5 transition-colors">
                                                <td className="py-4 px-6 text-muted-foreground font-medium pl-10">Total Liabilities</td>
                                                {balanceSheet?.map(s => (
                                                    <td key={s.period} className="py-4 px-6 text-right font-mono text-muted-foreground">{formatCurrency(s.total_liabilities_cents)}</td>
                                                ))}
                                            </tr>
                                            <tr className="hover:bg-white/5 transition-colors">
                                                <td className="py-4 px-6 text-muted-foreground font-medium pl-10">Total Equity (Incl. YTD Net Income)</td>
                                                {balanceSheet?.map(s => (
                                                    <td key={s.period} className="py-4 px-6 text-right font-mono text-muted-foreground">{formatCurrency(s.total_equity_cents)}</td>
                                                ))}
                                            </tr>
                                            <tr className="bg-accent/5 border-t border-accent/20">
                                                <td className="py-5 px-6 font-bold text-accent-foreground text-base">Total Liab + Equity</td>
                                                {balanceSheet?.map(s => (
                                                    <td key={s.period} className="py-5 px-6 text-right font-mono font-bold text-accent-foreground text-base">{formatCurrency(s.total_liabilities_cents + s.total_equity_cents)}</td>
                                                ))}
                                            </tr>
                                        </tbody>
                                    </table>

                                    {/* Unmapped Warning Display */}
                                    {hasUnmapped && (
                                        <div className="p-4 mx-4 mb-4 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-200 text-sm flex gap-3">
                                            <AlertCircle className="w-5 h-5 shrink-0" />
                                            <div>
                                                <p className="font-bold mb-1">Out of Balance</p>
                                                <p className="opacity-80 mb-2">You have unmapped accounts in your Trial Balance. Please visit the Mapping Engine to standardize all accounts.</p>
                                                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                                    {balanceSheet.filter(bs => bs.unmapped_balance_cents !== 0).map(bs => (
                                                        <div key={bs.period} className="bg-black/20 p-2 rounded text-xs border border-amber-500/20">
                                                            <span className="block opacity-70 mb-1">{bs.period}</span>
                                                            <span className="font-mono font-bold">{formatCurrency(bs.unmapped_balance_cents)}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    )}
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

                        <div className="px-1 overflow-x-auto">
                            {isCfLoading ? (
                                <div className="p-6 animate-pulse space-y-4">
                                    <div className="h-4 bg-white/10 rounded w-full"></div>
                                </div>
                            ) : isCfError ? (
                                <div className="p-6 text-destructive">Failed to load statement logic.</div>
                            ) : (
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-border text-muted-foreground">
                                            <th className="py-4 px-6 font-semibold text-left w-1/3">Metric</th>
                                            {cashFlow?.map(s => (
                                                <th key={s.period} className="py-4 px-6 font-semibold text-right">{s.period}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border/50">
                                        <tr className="bg-black/20">
                                            <td colSpan={cashFlow.length + 1} className="py-2 px-6 font-bold text-xs uppercase tracking-wider text-muted-foreground">Operating Activities</td>
                                        </tr>
                                        <tr className="hover:bg-white/5 transition-colors">
                                            <td className="py-3 px-6 text-foreground">Net Income</td>
                                            {cashFlow?.map(s => (
                                                <td key={s.period} className="py-3 px-6 text-right font-mono">{formatCurrency(s.net_income_cents)}</td>
                                            ))}
                                        </tr>
                                        <tr className="hover:bg-white/5 transition-colors">
                                            <td className="py-3 px-6 text-foreground">Depreciation & Non-Cash</td>
                                            {cashFlow?.map(s => (
                                                <td key={s.period} className="py-3 px-6 text-right font-mono">{formatCurrency(s.non_cash_adjustments_cents)}</td>
                                            ))}
                                        </tr>
                                        <tr className="hover:bg-white/5 transition-colors">
                                            <td className="py-3 px-6 text-foreground">Changes in Working Capital</td>
                                            {cashFlow?.map(s => (
                                                <td key={s.period} className="py-3 px-6 text-right font-mono">{formatCurrency(s.operating_wc_delta_cents)}</td>
                                            ))}
                                        </tr>
                                        <tr className="bg-emerald-500/5">
                                            <td className="py-3 px-6 font-semibold text-emerald-400">Net Cash from Ops</td>
                                            {cashFlow?.map(s => (
                                                <td key={s.period} className="py-3 px-6 text-right font-mono font-semibold text-emerald-400">{formatCurrency(s.net_cash_from_operations_cents)}</td>
                                            ))}
                                        </tr>

                                        <tr className="bg-black/20">
                                            <td colSpan={cashFlow.length + 1} className="py-2 px-6 font-bold text-xs uppercase tracking-wider text-muted-foreground border-t border-border">Investing & Financing</td>
                                        </tr>
                                        <tr className="hover:bg-white/5 transition-colors">
                                            <td className="py-3 px-6 text-foreground">Net Cash from Investing</td>
                                            {cashFlow?.map(s => (
                                                <td key={s.period} className="py-3 px-6 text-right font-mono text-emerald-400">{formatCurrency(s.net_cash_from_investing_cents)}</td>
                                            ))}
                                        </tr>
                                        <tr className="hover:bg-white/5 transition-colors">
                                            <td className="py-3 px-6 text-foreground">Net Cash from Financing</td>
                                            {cashFlow?.map(s => (
                                                <td key={s.period} className="py-3 px-6 text-right font-mono text-emerald-400">{formatCurrency(s.net_cash_from_financing_cents)}</td>
                                            ))}
                                        </tr>

                                        <tr className="bg-emerald-500/10 border-t-2 border-emerald-500/30">
                                            <td className="py-4 px-6 font-bold text-emerald-400 uppercase tracking-wider text-xs">Net Change in Cash</td>
                                            {cashFlow?.map(s => (
                                                <td key={s.period} className="py-4 px-6 text-right font-mono font-bold text-emerald-400">{formatCurrency(s.net_change_in_cash_cents)}</td>
                                            ))}
                                        </tr>
                                        <tr className="hover:bg-white/5 transition-colors">
                                            <td className="py-3 px-6 text-muted-foreground uppercase tracking-wider text-xs font-semibold">Beginning Cash Balance</td>
                                            {cashFlow?.map(s => (
                                                <td key={s.period} className="py-3 px-6 text-right font-mono text-muted-foreground">{formatCurrency(s.beginning_cash_cents)}</td>
                                            ))}
                                        </tr>
                                        <tr className="bg-emerald-500/20 border-t border-emerald-500/40">
                                            <td className="py-5 px-6 font-bold text-emerald-300 uppercase tracking-wider text-sm shadow-sm">Ending Cash Balance</td>
                                            {cashFlow?.map(s => (
                                                <td key={s.period} className="py-5 px-6 text-right font-mono font-bold text-emerald-300 text-lg drop-shadow-sm">{formatCurrency(s.ending_cash_cents)}</td>
                                            ))}
                                        </tr>

                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>

                </div>
            )}
        </div>
    );
}
