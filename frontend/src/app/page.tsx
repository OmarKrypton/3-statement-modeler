"use client";

import { useQuery } from "@tanstack/react-query";
import { getDashboardSummary, getCompanies } from "@/lib/api";
import {
  AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ComposedChart, Bar, Line
} from "recharts";
import { formatCurrency } from "@/lib/utils";
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

  const companyId = companies?.[0]?.id;

  const { data: summary, isLoading } = useQuery<DashboardSummaryEntry[]>({
    queryKey: ["dashboard-summary", companyId],
    queryFn: () => getDashboardSummary(companyId!),
    enabled: !!companyId
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

  const latestActual = [...summary].filter(s => s.type === 'actual').pop();
  const latest = latestActual || summary[0];

  return (
    <div className="flex flex-col gap-8 py-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold tracking-tight text-gradient">Financial Dashboard</h1>
          <p className="mt-2 text-muted-foreground max-w-xl">
            Visualizing performance across historical actuals and future projections.
            Forecasts are based on the primary <span className="text-primary font-medium">Base</span> scenario.
          </p>
        </div>
        <div className="flex gap-2">
          <div className="px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-xs text-blue-400 flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
            Actuals
          </div>
          <div className="px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-xs text-purple-400 flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-purple-500 animate-pulse" />
            Forecast
          </div>
        </div>
      </header>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KPICard
          title="Latest Revenue"
          value={formatCurrency(latest.revenue)}
          subtitle={`Period ending ${latest.period}`}
          icon={<DollarSign className="text-blue-400" />}
        />
        <KPICard
          title="EBITDA"
          value={formatCurrency(latest.ebitda)}
          subtitle={`${latest.revenue > 0 ? ((latest.ebitda / latest.revenue) * 100).toFixed(1) : 0}% Margin`}
          icon={<Activity className="text-purple-400" />}
        />
        <KPICard
          title="Net Income"
          value={formatCurrency(latest.net_income)}
          subtitle={latest.net_income > 0 ? "Profitable" : "Operating Loss"}
          icon={latest.net_income > 0 ? <TrendingUp className="text-green-400" /> : <TrendingDown className="text-red-400" />}
        />
        <KPICard
          title="Ending Cash"
          value={formatCurrency(latest.cash)}
          subtitle="Liquidity Position"
          icon={<DollarSign className="text-emerald-400" />}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Revenue & EBITDA Composed Chart */}
        <div className="glass-card rounded-xl p-6 border border-white/5 shadow-2xl">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              Revenue & EBITDA Trajectory
              <TooltipIcon text="Bars represent Revenue, Line represents EBITDA (Operating Profit)" />
            </h3>
          </div>
          <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={summary} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} opacity={0.3} />
                <XAxis
                  dataKey="period"
                  stroke="#94a3b8"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  tick={{ dy: 10 }}
                />
                <YAxis
                  stroke="#94a3b8"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(val) => `$${(val / 100000).toFixed(0)}k`}
                />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.4)', padding: '12px' }}
                  itemStyle={{ fontSize: '12px', padding: '2px 0' }}
                  cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                  formatter={(val: number | string | (number | string)[] | undefined) => formatCurrency(Number(val ?? 0))}
                />
                <Legend
                  verticalAlign="top"
                  align="right"
                  height={36}
                  iconType="circle"
                  formatter={(value) => <span className="text-xs font-medium text-muted-foreground ml-1">{value}</span>}
                />
                <Bar name="Revenue" dataKey="revenue" fill="#3b82f6" radius={[6, 6, 0, 0]} barSize={28} />
                <Line name="EBITDA" type="monotone" dataKey="ebitda" stroke="#a78bfa" strokeWidth={3} dot={{ r: 4, fill: '#a78bfa', strokeWidth: 2, stroke: '#1e293b' }} activeDot={{ r: 6, strokeWidth: 0 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Cash Trajectory Area Chart */}
        <div className="glass-card rounded-xl p-6 border border-white/5 shadow-2xl">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              Liquidity (Ending Cash)
              <TooltipIcon text="Area chart showing inception-to-date cumulative cash position." />
            </h3>
          </div>
          <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={summary} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorCash" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} opacity={0.3} />
                <XAxis
                  dataKey="period"
                  stroke="#94a3b8"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  tick={{ dy: 10 }}
                />
                <YAxis
                  stroke="#94a3b8"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(val) => `$${(val / 100000).toFixed(0)}k`}
                />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.4)', padding: '12px' }}
                  itemStyle={{ fontSize: '12px', padding: '2px 0' }}
                  formatter={(val: number | string | (number | string)[] | undefined) => formatCurrency(Number(val ?? 0))}
                />
                <Area
                  type="monotone"
                  dataKey="cash"
                  stroke="#10b981"
                  fillOpacity={1}
                  fill="url(#colorCash)"
                  strokeWidth={3}
                  animationDuration={1500}
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
    <div className="group relative">
      <Info className="w-4 h-4 text-muted-foreground cursor-help hover:text-primary transition-colors" />
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-slate-800 text-[10px] text-slate-200 rounded border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
        {text}
        <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-slate-800" />
      </div>
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
