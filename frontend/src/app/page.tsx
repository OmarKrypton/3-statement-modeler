"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getDashboardSummary, getCompanies } from "@/lib/api";
import {
  AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ComposedChart, Bar, Line, Cell, ReferenceLine
} from "recharts";
import { formatCurrency, cn } from "@/lib/utils";
import {
  TrendingUp, TrendingDown, DollarSign, Activity,
  ArrowRight, FileSpreadsheet, ListTree, PieChart,
  Loader2, Info
} from "lucide-react";
import Link from "next/link";
import React from "react";

export interface DashboardSummaryEntry {
  period: string;
  revenue: number;
  ebitda: number;
  net_income: number;
  cash: number;
  type: 'actual' | 'forecast';
}

export default function DashboardPage() {
  const { data: companies } = useQuery({
    queryKey: ["companies"],
    queryFn: getCompanies
  });

  const company = companies?.[0];
  const currency = company?.currency || "USD";
  const [scenario, setScenario] = useState<"base" | "bull" | "bear">("base");

  const { data: summary, isLoading } = useQuery<DashboardSummaryEntry[]>({
    queryKey: ["dashboard-summary", company?.id, scenario, currency],
    queryFn: () => getDashboardSummary(company!.id, scenario),
    enabled: !!company?.id
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-8rem)]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-12 h-12 animate-spin text-primary" />
          <p className="text-muted-foreground animate-pulse">Loading financial data...</p>
        </div>
      </div>
    );
  }

  // If no data, show Getting Started
  if (!summary || summary.length === 0) {
    return <GettingStartedGuide />;
  }

  const latestActualIndex = summary.map(s => s.type).lastIndexOf('actual');
  const latestActual = latestActualIndex !== -1 ? summary[latestActualIndex] : summary[0];
  const latest = latestActual;

  // Transform data for seamless transitions (overlap last actual with first forecast)
  const chartData = summary.map((entry, index) => ({
    ...entry,
    revenueActual: entry.type === 'actual' ? entry.revenue : null,
    revenueForecast: entry.type === 'forecast' ? entry.revenue : null,
    // Bridge: The segment between last actual and first forecast needs BOTH values defined to connect
    ebitdaActual: index <= latestActualIndex ? entry.ebitda : null,
    ebitdaForecast: index >= latestActualIndex ? entry.ebitda : null,
    cashActual: index <= latestActualIndex ? entry.cash : null,
    cashForecast: index >= latestActualIndex ? entry.cash : null,
  }));

  const nowPeriod = latestActual?.period;

  return (
    <div className="flex flex-col gap-8 py-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold tracking-tight text-gradient">Financial Dashboard</h1>
          <p className="mt-2 text-muted-foreground max-w-xl">
            Visualizing performance across historical actuals and future projections for the 
            <span className={cn(
              "ml-1 font-bold uppercase transition-colors tracking-widest text-[11px] px-2 py-0.5 rounded border",
              scenario === "base" ? "text-primary border-primary/20 bg-primary/10" :
              scenario === "bull" ? "text-emerald-400 border-emerald-500/20 bg-emerald-500/10" :
              "text-rose-400 border-rose-500/20 bg-rose-500/10"
            )}>
              {scenario === "base" ? "Standard Base" : scenario === "bull" ? "Optimistic Bull" : "Conservative Bear"}
            </span> scenario.
          </p>
        </div>
        <div className="flex flex-col items-end gap-3">
          <div className="flex p-1 bg-white/5 border border-border rounded-xl backdrop-blur-md">
            {(["base", "bull", "bear"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setScenario(s)}
                className={cn(
                  "px-4 py-1.5 rounded-lg text-xs font-bold transition-all uppercase tracking-widest",
                  scenario === s 
                    ? "bg-primary text-white shadow-[0_0_15px_rgba(59,130,246,0.5)]" 
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {s}
              </button>
            ))}
          </div>
          <div className="flex gap-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.6)]" />
              <span className="text-xs font-semibold text-slate-300">Actuals</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full border-2 border-dashed border-purple-500" />
              <span className="text-xs font-semibold text-slate-300">Forecast</span>
            </div>
          </div>
        </div>
      </header>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KPICard
          title="Latest Revenue"
          value={formatCurrency(latest.revenue, currency)}
          subtitle={`Period ending ${latest.period}`}
          icon={<DollarSign className="text-blue-400" />}
        />
        <KPICard
          title="EBITDA"
          value={formatCurrency(latest.ebitda, currency)}
          subtitle={`${latest.revenue > 0 ? ((latest.ebitda / latest.revenue) * 100).toFixed(1) : 0}% Margin`}
          icon={<Activity className="text-purple-400" />}
        />
        <KPICard
          title="Net Income"
          value={formatCurrency(latest.net_income, currency)}
          subtitle={latest.net_income > 0 ? "Profitable" : "Operating Loss"}
          icon={latest.net_income > 0 ? <TrendingUp className="text-green-400" /> : <TrendingDown className="text-red-400" />}
        />
        <KPICard
          title="Ending Cash"
          value={formatCurrency(latest.cash, currency)}
          subtitle="Liquidity Position"
          icon={<DollarSign className="text-emerald-400" />}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Revenue & EBITDA Composed Chart */}
        <div className="glass-card rounded-2xl p-8 border border-white/5 shadow-2xl relative">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-purple-500 opacity-50 rounded-t-2xl" />
          <div className="flex justify-between items-center mb-8">
            <div>
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                Revenue & Profitability
              </h3>
              <p className="text-xs text-muted-foreground mt-1">Industrial-grade trajectory visualization</p>
            </div>
            <TooltipIcon text="Bars: Revenue | Solid Line: Historical EBITDA | Dashed: Forecast EBITDA" />
          </div>
          <div className="h-[300px] w-full min-h-0 min-w-0">
            <ResponsiveContainer width="99%" height="100%">
              <ComposedChart data={chartData} margin={{ top: 20, right: 20, left: 0, bottom: 0 }}>
                <defs>
                   <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="3" result="blur" />
                    <feComposite in="SourceGraphic" in2="blur" operator="over" />
                  </filter>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} opacity={0.15} />
                <XAxis
                  dataKey="period"
                  stroke="#64748b"
                  fontSize={10}
                  fontWeight={600}
                  tickLine={false}
                  axisLine={false}
                  tick={{ dy: 10 }}
                />
                <YAxis
                  stroke="#64748b"
                  fontSize={10}
                  fontWeight={600}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(val) => `$${(val / 100000).toFixed(0)}k`}
                />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      const type = payload[0].payload.type;
                      return (
                        <div className="bg-slate-950/90 backdrop-blur-md border border-white/10 rounded-xl shadow-2xl p-4 min-w-[200px] animate-in fade-in zoom-in-95 duration-200">
                          <div className="flex items-center justify-between mb-3 pb-2 border-b border-white/10">
                            <p className="text-sm font-black text-white uppercase tracking-tighter">{label}</p>
                            <span className={`text-[9px] px-2 py-0.5 rounded-full font-black uppercase tracking-widest ${type === 'actual' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' : 'bg-purple-500/20 text-purple-400 border border-purple-500/30'}`}>
                              {type}
                            </span>
                          </div>
                          {payload.filter(p => p.value !== null).map((entry, index) => {
                            // Smart-hide forecasted duplicate at the bridge point
                            const isForecastDuplicate = entry.name?.toString().includes("Forecast") && 
                                                        payload.some(p => p.value !== null && p.name === entry.name?.toString().replace(" (Forecast)", ""));
                            if (isForecastDuplicate) return null;

                            return (
                              <div key={index} className="flex items-center justify-between py-1.5">
                                <div className="flex items-center gap-2">
                                  <div className="w-2 h-2 rounded-full shadow-[0_0_5px_rgba(255,255,255,0.3)]" style={{ backgroundColor: entry.color }} />
                                  <span className="text-[11px] font-medium text-slate-400">{(String(entry.name || "")).split(' (')[0]}</span>
                                </div>
                                <span className="text-[11px] font-mono font-bold text-white">{formatCurrency(Number(entry.value), currency)}</span>
                              </div>
                            );
                          })}
                        </div>
                      );
                    }
                    return null;
                  }}
                  cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                />
                {nowPeriod && (
                  <ReferenceLine x={nowPeriod} stroke="#64748b" strokeDasharray="3 3" label={{ position: 'top', value: 'NOW', fill: '#94a3b8', fontSize: 10, fontWeight: 800 }} />
                )}
                <Bar name="Revenue" dataKey="revenue" radius={[4, 4, 0, 0]} barSize={32}>
                  {chartData.map((entry, index) => (
                    <Cell key={`bar-${index}`} 
                      fill={entry.type === 'actual' ? '#3b82f6' : '#6366f1'} 
                      fillOpacity={entry.type === 'actual' ? 0.9 : 0.3}
                      stroke={entry.type === 'actual' ? 'none' : '#818cf8'}
                      strokeWidth={entry.type === 'actual' ? 0 : 1}
                      strokeDasharray={entry.type === 'actual' ? "0" : "3 2"}
                    />
                  ))}
                </Bar>
                <Line
                  name="EBITDA"
                  type="monotone"
                  dataKey="ebitdaActual"
                  stroke="#a78bfa"
                  strokeWidth={4}
                  dot={{ r: 0 }}
                  activeDot={{ r: 6, strokeWidth: 0, fill: '#fff' }}
                  filter="url(#glow)"
                  connectNulls={false}
                />
                <Line
                  name="EBITDA (Forecast)"
                  type="monotone"
                  dataKey="ebitdaForecast"
                  stroke="#a78bfa"
                  strokeWidth={3}
                  strokeDasharray="8 6"
                  dot={{ r: 0 }}
                  activeDot={{ r: 6, strokeWidth: 0, fill: '#fff' }}
                  connectNulls={false}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Cash Trajectory Area Chart */}
        <div className="glass-card rounded-2xl p-8 border border-white/5 shadow-2xl relative">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 to-teal-500 opacity-50 rounded-t-2xl" />
          <div className="flex justify-between items-center mb-8">
            <div>
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                Liquidity Position
              </h3>
              <p className="text-xs text-muted-foreground mt-1">Cash flow and treasury runway</p>
            </div>
            <TooltipIcon text="Area gradient showing historical vs projected cash on hand." />
          </div>
          <div className="h-[300px] w-full min-h-0 min-w-0">
            <ResponsiveContainer width="99%" height="100%">
              <AreaChart data={chartData} margin={{ top: 20, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorCashActual" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorCashForecast" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.1} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} opacity={0.15} />
                <XAxis
                  dataKey="period"
                  stroke="#64748b"
                  fontSize={10}
                  fontWeight={600}
                  tickLine={false}
                  axisLine={false}
                  tick={{ dy: 10 }}
                />
                <YAxis
                  stroke="#64748b"
                  fontSize={10}
                  fontWeight={600}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(val) => `$${(val / 100000).toFixed(0)}k`}
                />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      const type = payload[0].payload.type;
                      return (
                        <div className="bg-slate-950/90 backdrop-blur-md border border-white/10 rounded-xl shadow-2xl p-4 min-w-[200px]">
                          <div className="flex items-center justify-between mb-3 pb-2 border-b border-white/10">
                            <p className="text-sm font-black text-white uppercase tracking-tighter">{label}</p>
                            <span className={`text-[9px] px-2 py-0.5 rounded-full font-black uppercase tracking-widest ${type === 'actual' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' : 'bg-purple-500/20 text-purple-400 border border-purple-500/30'}`}>
                              {type}
                            </span>
                          </div>
                          {payload.filter(p => p.value !== null).map((entry, index) => {
                            // Smart-hide forecasted duplicate at the bridge point
                            const isForecastDuplicate = entry.name?.toString().includes("Forecast") && 
                                                        payload.some(p => p.value !== null && p.name === entry.name?.toString().replace(" (Forecast)", ""));
                            if (isForecastDuplicate) return null;

                            return (
                              <div key={index} className="flex items-center justify-between py-1.5">
                                <div className="flex items-center gap-2">
                                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                                  <span className="text-[11px] font-medium text-slate-400">Ending Cash</span>
                                </div>
                                <span className="text-[11px] font-mono font-bold text-white">{formatCurrency(Number(entry.value), currency)}</span>
                              </div>
                            );
                          })}
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                {nowPeriod && (
                  <ReferenceLine x={nowPeriod} stroke="#64748b" strokeDasharray="3 3" label={{ position: 'top', value: 'NOW', fill: '#94a3b8', fontSize: 10, fontWeight: 800 }} />
                )}
                <Area
                  name="Cash"
                  type="monotone"
                  dataKey="cashActual"
                  stroke="#10b981"
                  fillOpacity={1}
                  fill="url(#colorCashActual)"
                  strokeWidth={4}
                  filter="url(#glow)"
                  connectNulls={false}
                />
                <Area
                  name="Cash (Forecast)"
                  type="monotone"
                  dataKey="cashForecast"
                  stroke="#10b981"
                  strokeDasharray="8 6"
                  fillOpacity={1}
                  fill="url(#colorCashForecast)"
                  strokeWidth={2}
                  connectNulls={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}

function KPICard({ title, value, subtitle, icon }: { title: string, value: string, subtitle: string, icon: React.ReactNode }) {
  return (
    <div className="glass-card rounded-xl p-6 flex flex-col gap-2 hover:translate-y-[-4px] transition-all duration-300">
      <div className="flex justify-between items-start">
        <span className="text-muted-foreground text-sm font-medium">{title}</span>
        <div className="p-2 bg-white/5 rounded-lg border border-white/10">
          {icon}
        </div>
      </div>
      <div className="text-3xl font-bold">{value}</div>
      <div className="text-xs text-muted-foreground">{subtitle}</div>
    </div>
  );
}

function TooltipIcon({ text }: { text: string }) {
  return (
    <div className="group relative flex items-center">
      <div className="absolute right-full mr-3 w-56 p-3 bg-slate-900/95 border border-white/10 rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.5)] transition-all duration-300 opacity-0 scale-95 origin-right translate-x-2 group-hover:translate-x-0 group-hover:opacity-100 invisible group-hover:visible pointer-events-none z-50 backdrop-blur-xl">
        <p className="text-[10px] leading-relaxed text-slate-300 font-medium">
           {text}
        </p>
        <div className="absolute left-full top-1/2 -translate-y-1/2 border-[6px] border-transparent border-l-slate-900/95" />
      </div>
      <Info className="w-4 h-4 text-slate-500 cursor-help hover:text-primary transition-all duration-300" />
    </div>
  );
}

function GettingStartedGuide() {
  return (
    <div className="flex flex-col gap-8 py-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <header>
        <h1 className="text-5xl font-bold tracking-tight text-gradient mb-4 leading-tight">
          Financial Mastery, <br />Automated.
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl">
          Standardize your Trial Balance, architect interlinked 3-statement models,
          and project future performance with industrial-grade scenarios.
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-4">
        <GettingStartedCard
          step="1"
          title="Ingest Data"
          desc="Import multi-period Trial Balances via standard .csv extracts."
          href="/trial-balance"
          icon={<FileSpreadsheet className="w-20 h-20" />}
        />
        <GettingStartedCard
          step="2"
          title="Mapping Engine"
          desc="Standardize raw accounts to GAAP-compliant reporting categories."
          href="/mapping"
          icon={<ListTree className="w-20 h-20" />}
        />
        <GettingStartedCard
          step="3"
          title="Strategic Analysis"
          desc="Generate statements, build scenarios, and export professional reports."
          href="/statements"
          icon={<PieChart className="w-20 h-20" />}
        />
      </div>

      <div className="mt-8 p-1 rounded-2xl bg-gradient-to-r from-blue-500/20 to-purple-500/20 max-w-3xl">
        <div className="bg-[#0f172a] rounded-[14px] p-6 border border-white/5">
          <h3 className="text-lg font-semibold mb-2">Pro Tip</h3>
          <p className="text-muted-foreground text-sm">
            Start by uploading at least one Trial Balance period to unlock the Mapping Engine.
            Once mapped, your first set of side-by-side comparative statements will be live instantly.
          </p>
        </div>
      </div>
    </div>
  );
}

function GettingStartedCard({ step, title, desc, href, icon }: { step: string, title: string, desc: string, href: string, icon: React.ReactNode }) {
  return (
    <div className="glass-card rounded-2xl p-8 relative overflow-hidden group hover:scale-[1.02] transition-all duration-300">
      <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 group-hover:scale-110 transition-all duration-500">
        {icon}
      </div>
      <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold mb-6 group-hover:bg-primary group-hover:text-white transition-colors">
        {step}
      </div>
      <h2 className="text-2xl font-bold mb-3">{title}</h2>
      <p className="text-muted-foreground mb-8 text-sm leading-relaxed">
        {desc}
      </p>
      <Link href={href} className="inline-flex items-center text-sm font-bold text-primary hover:gap-3 transition-all">
        Get Started <ArrowRight className="ml-2 w-4 h-4" />
      </Link>
    </div>
  );
}
