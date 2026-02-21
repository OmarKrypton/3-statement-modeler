"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
    getPeriods,
    getForecastConfig,
    saveForecastConfig,
    getForecastStatements,
    ForecastConfigPayload,
} from "@/lib/api";
import { TrendingUp, Save, Play, ChevronDown, ChevronRight, AlertCircle } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

const ACME_CORP_ID = "6921efce-4ef6-418f-b454-7699ba440600";

// ── Assumption input field ────────────────────────────────────────────────────

function BpsInput({
    label, hint, value, onChange,
}: { label: string; hint: string; value: number; onChange: (v: number) => void }) {
    const displayVal = (value / 100).toFixed(2);
    return (
        <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</label>
            <div className="flex items-center gap-2">
                <input
                    type="number"
                    step="0.01"
                    value={displayVal}
                    onChange={(e) => onChange(Math.round(parseFloat(e.target.value || "0") * 100))}
                    className="w-full px-3 py-2 bg-white/5 border border-border rounded-md text-foreground font-mono text-sm focus:ring-2 focus:ring-primary focus:outline-none"
                />
                <span className="text-muted-foreground text-sm shrink-0">%</span>
            </div>
            <p className="text-[11px] text-muted-foreground/70">{hint}</p>
        </div>
    );
}

function CentsInput({
    label, hint, value, onChange,
}: { label: string; hint: string; value: number; onChange: (v: number) => void }) {
    const displayVal = (value / 100).toFixed(0);
    return (
        <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</label>
            <div className="flex items-center gap-2">
                <span className="text-muted-foreground text-sm shrink-0">$</span>
                <input
                    type="number"
                    step="1000"
                    value={displayVal}
                    onChange={(e) => onChange(Math.round(parseFloat(e.target.value || "0") * 100))}
                    className="w-full px-3 py-2 bg-white/5 border border-border rounded-md text-foreground font-mono text-sm focus:ring-2 focus:ring-primary focus:outline-none"
                />
            </div>
            <p className="text-[11px] text-muted-foreground/70">{hint}</p>
        </div>
    );
}

// ── Statement row helper ──────────────────────────────────────────────────────

function StatRow({
    label, values, highlight = false, indent = false, dimmed = false,
}: {
    label: string;
    values: (number | null)[];
    highlight?: boolean;
    indent?: boolean;
    dimmed?: boolean;
}) {
    return (
        <tr className={`border-b border-border/40 ${highlight ? "bg-primary/5 font-semibold" : dimmed ? "opacity-60" : "hover:bg-white/3"} transition-colors`}>
            <td className={`py-3 px-4 text-sm ${indent ? "pl-8 text-muted-foreground" : "text-foreground font-medium"}`}>{label}</td>
            {values.map((v, i) => (
                <td key={i} className={`py-3 px-4 text-right font-mono text-sm ${v !== null && v < 0 ? "text-rose-400" : "text-foreground"}`}>
                    {v === null ? "—" : formatCurrency(v)}
                </td>
            ))}
        </tr>
    );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function ForecastPage() {
    const queryClient = useQueryClient();
    const [openSection, setOpenSection] = useState<"is" | "cf" | null>("is");
    const [hasRun, setHasRun] = useState(false);
    const [scenario, setScenario] = useState<"base" | "bull" | "bear">("base");

    const { data: periods = [] } = useQuery<string[]>({
        queryKey: ["periods", ACME_CORP_ID],
        queryFn: () => getPeriods(ACME_CORP_ID),
    });

    const [cfg, setCfg] = useState<ForecastConfigPayload>({
        base_period: null,
        num_periods: 3,
        revenue_growth_pct: 500,
        cogs_pct_of_revenue: 6000,
        opex_growth_pct: 300,
        tax_rate_pct: 2100,
        capex_cents: 0,
        da_cents: 0,
        wc_pct_of_revenue: 1000,
    });

    // Try loading existing config for the current scenario
    const { data: savedConfig, isFetching: isFetchingConfig } = useQuery({
        queryKey: ["forecast-config", ACME_CORP_ID, scenario],
        queryFn: () => getForecastConfig(ACME_CORP_ID, scenario),
        retry: false,
    });
    useEffect(() => {
        if (savedConfig) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setCfg(savedConfig);
        } else {
            // Reset to defaults if no config exists for this scenario (except keep base_period)
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setCfg(prev => ({
                ...prev,
                scenario_name: scenario,
                revenue_growth_pct: 500,
                cogs_pct_of_revenue: 6000,
                opex_growth_pct: 300,
                tax_rate_pct: 2100,
                capex_cents: 0,
                da_cents: 0,
                wc_pct_of_revenue: 1000,
            }));
            // We clear hasRun so the user knows they need to hit Run Forecast for the new scenario
            setHasRun(false);
        }
    }, [savedConfig, scenario]);

    // Auto-select latest period as base
    useEffect(() => {
        if (periods.length > 0 && !cfg.base_period) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setCfg(prev => ({ ...prev, base_period: periods[0] }));
        }
    }, [periods, cfg.base_period]);

    const saveMutation = useMutation({
        mutationFn: () => saveForecastConfig(ACME_CORP_ID, { ...cfg, scenario_name: scenario }),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ["forecast-config", ACME_CORP_ID, scenario] }),
    });

    const { data: forecast, refetch: runForecast, isFetching, error: forecastError } = useQuery({
        queryKey: ["forecast-statements", ACME_CORP_ID, scenario],
        queryFn: () => getForecastStatements(ACME_CORP_ID, scenario),
        enabled: false,
        retry: false,
    });

    const handleRun = async () => {
        await saveMutation.mutateAsync();
        await runForecast();
        setHasRun(true);
    };

    const projections = forecast?.projections ?? [];
    const actuals = forecast?.actuals;

    // Header labels: "Actuals (base)" + each projected period
    const headers = actuals
        ? [`Actuals\n${forecast.base_period}`, ...projections.map((p: { period: string }) => `Forecast\n${p.period}`)]
        : [];

    const toggle = (s: "is" | "cf") => setOpenSection(prev => prev === s ? null : s);

    return (
        <div className="flex flex-col gap-6 py-8 animate-in slide-in-from-bottom-4 duration-500 min-h-full">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
                    <TrendingUp className="w-8 h-8 text-primary" />
                    Forecast Engine
                </h1>
                <p className="mt-2 text-muted-foreground max-w-2xl">
                    Define assumption drivers based on your actual historical data and project future Income Statement, Balance Sheet, and Cash Flow positions.
                </p>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-[320px_1fr] gap-6 items-start">

                {/* ── Left panel: Assumptions ─────────────────────────────── */}
                <div className="glass-card rounded-xl border border-border overflow-hidden sticky top-6">
                    <div className="p-4 border-b border-border bg-gradient-to-r from-primary/10 flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-primary" />
                        <h3 className="font-semibold text-foreground">Assumption Drivers</h3>
                    </div>

                    <div className="p-5 flex flex-col gap-5">
                        {/* Scenario Toggle */}
                        <div className="flex bg-white/5 rounded-lg border border-border p-1">
                            {(["base", "bull", "bear"] as const).map(s => (
                                <button
                                    key={s}
                                    onClick={() => setScenario(s)}
                                    className={`flex-1 py-1.5 text-xs font-semibold rounded-md capitalize transition-all ${scenario === s ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground hover:bg-white/5"}`}
                                >
                                    {s}
                                </button>
                            ))}
                        </div>

                        {/* Base period */}
                        <div className="flex flex-col gap-1">
                            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Base Period</label>
                            <select
                                className="w-full px-3 py-2 bg-white/5 border border-border rounded-md text-foreground text-sm focus:ring-2 focus:ring-primary focus:outline-none"
                                value={cfg.base_period ?? ""}
                                onChange={e => setCfg(prev => ({ ...prev, base_period: e.target.value || null }))}
                            >
                                <option value="" disabled>Select a period…</option>
                                {periods.map(p => <option key={p} value={p}>{p}</option>)}
                            </select>
                            <p className="text-[11px] text-muted-foreground/70">Last actual period used as the starting point</p>
                        </div>

                        {/* Num periods */}
                        <div className="flex flex-col gap-1">
                            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                Forecast Periods — <span className="text-primary">{cfg.num_periods}</span>
                            </label>
                            <input
                                type="range" min={1} max={12} value={cfg.num_periods}
                                onChange={e => setCfg(prev => ({ ...prev, num_periods: parseInt(e.target.value) }))}
                                className="w-full accent-primary"
                            />
                            <div className="flex justify-between text-[11px] text-muted-foreground/50">
                                <span>1</span><span>12</span>
                            </div>
                        </div>

                        <hr className="border-border" />

                        {/* IS drivers */}
                        <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Income Statement</p>
                        <BpsInput label="Revenue Growth" hint="Period-over-period revenue increase" value={cfg.revenue_growth_pct} onChange={v => setCfg(p => ({ ...p, revenue_growth_pct: v }))} />
                        <BpsInput label="COGS % of Revenue" hint="Cost of goods as % of each period's revenue" value={cfg.cogs_pct_of_revenue} onChange={v => setCfg(p => ({ ...p, cogs_pct_of_revenue: v }))} />
                        <BpsInput label="OpEx Growth" hint="Period-over-period operating expense increase" value={cfg.opex_growth_pct} onChange={v => setCfg(p => ({ ...p, opex_growth_pct: v }))} />
                        <BpsInput label="Tax Rate" hint="Effective tax rate on pre-tax income" value={cfg.tax_rate_pct} onChange={v => setCfg(p => ({ ...p, tax_rate_pct: v }))} />

                        <hr className="border-border" />

                        {/* CF drivers */}
                        <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Cash Flow</p>
                        <CentsInput label="D&A per Period" hint="Non-cash depreciation add-back to CFO" value={cfg.da_cents} onChange={v => setCfg(p => ({ ...p, da_cents: v }))} />
                        <CentsInput label="CapEx per Period" hint="Capital expenditure investing outflow" value={cfg.capex_cents} onChange={v => setCfg(p => ({ ...p, capex_cents: v }))} />
                        <BpsInput label="Net WC % of Revenue" hint="Working capital tied up as % of revenue" value={cfg.wc_pct_of_revenue} onChange={v => setCfg(p => ({ ...p, wc_pct_of_revenue: v }))} />

                        <button
                            onClick={handleRun}
                            disabled={!cfg.base_period || isFetching || saveMutation.isPending}
                            className={`w-full mt-2 py-3 px-4 rounded-lg font-medium flex items-center justify-center gap-2 transition-all duration-300 
                ${!cfg.base_period || isFetching || saveMutation.isPending
                                    ? "bg-muted text-muted-foreground cursor-not-allowed"
                                    : "bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_0_20px_rgba(59,130,246,0.5)]"
                                }`}
                        >
                            <Play className="w-4 h-4" />
                            {isFetching || saveMutation.isPending ? "Running…" : "Run Forecast"}
                        </button>
                        {saveMutation.isSuccess && !isFetching && (
                            <p className="text-xs text-center text-emerald-400 flex items-center justify-center gap-1">
                                <Save className="w-3 h-3" /> Assumptions saved
                            </p>
                        )}
                    </div>
                </div>

                {/* ── Right panel: Projected Statements ──────────────────── */}
                <div className="flex flex-col gap-5">
                    {!hasRun && !forecast && (
                        <div className="glass-card rounded-xl border border-border p-16 text-center">
                            <TrendingUp className="w-12 h-12 mx-auto mb-4 text-primary/30" />
                            <h3 className="text-lg font-semibold text-foreground mb-2">Ready to Model</h3>
                            <p className="text-muted-foreground text-sm max-w-xs mx-auto">
                                Configure your assumption drivers on the left and click <strong>Run Forecast</strong> to generate projected statements.
                            </p>
                        </div>
                    )}

                    {forecastError && (
                        <div className="p-4 rounded-lg bg-destructive/20 border border-destructive/30 flex items-start gap-3 text-sm text-destructive-foreground">
                            <AlertCircle className="w-5 h-5 shrink-0" />
                            <span>Could not run forecast. Make sure you have imported a trial balance and mapped all accounts.</span>
                        </div>
                    )}

                    {forecast && projections.length > 0 && (
                        <>
                            {/* ── Income Statement ── */}
                            <div className="glass-card rounded-xl border border-border overflow-hidden">
                                <button
                                    onClick={() => toggle("is")}
                                    className="w-full p-4 border-b border-border bg-gradient-to-r from-primary/10 flex items-center justify-between hover:from-primary/15 transition-all"
                                >
                                    <span className="font-bold text-foreground">Income Statement</span>
                                    {openSection === "is" ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
                                </button>
                                {openSection === "is" && (
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-sm">
                                            <thead>
                                                <tr className="border-b border-border text-muted-foreground text-xs">
                                                    <th className="py-3 px-4 text-left w-48">Metric</th>
                                                    {headers.map((h, i) => (
                                                        <th key={i} className={`py-3 px-4 text-right whitespace-pre-line min-w-[120px] ${i > 0 ? "text-primary/80" : ""}`}>{h}</th>
                                                    ))}
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-border/30">
                                                <StatRow label="Revenue" values={[actuals!.revenue_cents, ...projections.map((p: { revenue_cents: number }) => p.revenue_cents)]} />
                                                <StatRow label="COGS" indent values={[null, ...projections.map((p: { cogs_cents: number }) => -p.cogs_cents)]} dimmed />
                                                <StatRow label="Gross Profit" values={[null, ...projections.map((p: { gross_profit_cents: number }) => p.gross_profit_cents)]} />
                                                <StatRow label="Operating Expenses" indent values={[actuals!.expenses_cents, ...projections.map((p: { opex_cents: number }) => -p.opex_cents)]} dimmed />
                                                <StatRow label="EBITDA" values={[null, ...projections.map((p: { ebitda_cents: number }) => p.ebitda_cents)]} />
                                                <StatRow label="D&A" indent values={[null, ...projections.map((p: { da_cents: number }) => -p.da_cents)]} dimmed />
                                                <StatRow label="EBIT" values={[null, ...projections.map((p: { ebit_cents: number }) => p.ebit_cents)]} />
                                                <StatRow label="Tax" indent values={[null, ...projections.map((p: { tax_cents: number }) => -p.tax_cents)]} dimmed />
                                                <StatRow label="Net Income" values={[actuals!.net_income_cents, ...projections.map((p: { net_income_cents: number }) => p.net_income_cents)]} highlight />
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>

                            {/* ── Cash Flow ── */}
                            <div className="glass-card rounded-xl border border-border overflow-hidden">
                                <button
                                    onClick={() => toggle("cf")}
                                    className="w-full p-4 border-b border-border bg-gradient-to-r from-accent/10 flex items-center justify-between hover:from-accent/15 transition-all"
                                >
                                    <span className="font-bold text-foreground">Cash Flow Statement</span>
                                    {openSection === "cf" ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
                                </button>
                                {openSection === "cf" && (
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-sm">
                                            <thead>
                                                <tr className="border-b border-border text-muted-foreground text-xs">
                                                    <th className="py-3 px-4 text-left w-48">Metric</th>
                                                    {headers.map((h, i) => (
                                                        <th key={i} className={`py-3 px-4 text-right whitespace-pre-line min-w-[120px] ${i > 0 ? "text-primary/80" : ""}`}>{h}</th>
                                                    ))}
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-border/30">
                                                <StatRow label="Net Income" values={[actuals!.net_income_cents, ...projections.map((p: { net_income_cf_cents: number }) => p.net_income_cf_cents)]} />
                                                <StatRow label="D&A (Add-back)" indent values={[null, ...projections.map((p: { da_cents: number }) => p.da_cents)]} dimmed />
                                                <StatRow label="Δ Net Working Capital" indent values={[null, ...projections.map((p: { delta_wc_cents: number }) => p.delta_wc_cents)]} dimmed />
                                                <StatRow label="Cash from Operations" values={[null, ...projections.map((p: { net_cash_from_operations_cents: number }) => p.net_cash_from_operations_cents)]} highlight />
                                                <StatRow label="CapEx" indent values={[null, ...projections.map((p: { capex_cents: number }) => p.capex_cents)]} dimmed />
                                                <StatRow label="Cash from Investing" values={[null, ...projections.map((p: { net_cash_from_investing_cents: number }) => p.net_cash_from_investing_cents)]} />
                                                <StatRow label="Cash from Financing" values={[null, ...projections.map((p: { net_cash_from_financing_cents: number }) => p.net_cash_from_financing_cents)]} />
                                                <StatRow label="Net Change in Cash" values={[null, ...projections.map((p: { net_change_in_cash_cents: number }) => p.net_change_in_cash_cents)]} />
                                                <StatRow label="Beginning Cash" indent values={[actuals!.cash_cents, ...projections.map((p: { beginning_cash_cents: number }) => p.beginning_cash_cents)]} dimmed />
                                                <StatRow label="Ending Cash" values={[actuals!.cash_cents, ...projections.map((p: { ending_cash_cents: number }) => p.ending_cash_cents)]} highlight />
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>

                            {/* ── Key Metrics summary strip ── */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                {projections.slice(0, 4).map((p: { period: string; revenue_cents: number; net_income_cents: number; ending_cash_cents: number; net_cash_from_operations_cents: number }) => (
                                    <div key={p.period} className="glass-card rounded-xl border border-border p-4 flex flex-col gap-2">
                                        <p className="text-xs text-primary font-mono">{p.period}</p>
                                        <p className="text-[11px] text-muted-foreground uppercase tracking-wide">Revenue</p>
                                        <p className="font-mono font-bold text-foreground">{formatCurrency(p.revenue_cents)}</p>
                                        <hr className="border-border/50" />
                                        <div className="flex justify-between text-xs">
                                            <span className="text-muted-foreground">Net Income</span>
                                            <span className={`font-mono ${p.net_income_cents >= 0 ? "text-emerald-400" : "text-rose-400"}`}>{formatCurrency(p.net_income_cents)}</span>
                                        </div>
                                        <div className="flex justify-between text-xs">
                                            <span className="text-muted-foreground">Ending Cash</span>
                                            <span className="font-mono text-foreground">{formatCurrency(p.ending_cash_cents)}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
