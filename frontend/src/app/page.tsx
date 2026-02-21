"use client";

import Link from "next/link";
import { ArrowRight, FileSpreadsheet, ListTree, PieChart } from "lucide-react";

export default function Dashboard() {
  return (
    <div className="flex flex-col gap-8 py-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-4xl font-bold tracking-tight text-gradient">Welcome to the 3-Statement Modeler</h1>
        <p className="mt-4 text-lg text-muted-foreground w-2/3">
          Automate your financial reporting workflows. Upload a raw Trial Balance,
          map it to our standardized Chart of Accounts, and instantly generate robust,
          interlinked financial statements based on hard-coded accounting logic.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-4">
        {/* Step 1 */}
        <div className="glass-card rounded-xl p-6 relative overflow-hidden group hover:scale-[1.02] transition-transform">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <FileSpreadsheet className="w-24 h-24" />
          </div>
          <h2 className="text-xl font-semibold mb-2">1. Upload Trial Balance</h2>
          <p className="text-muted-foreground mb-6 text-sm">
            Import your monthly CSV exports directly from QuickBooks, Xero, or NetSuite.
            We validate that debits and credits balance.
          </p>
          <Link href="/trial-balance" className="inline-flex items-center text-primary hover:text-primary/80 font-medium">
            Go to Upload <ArrowRight className="ml-2 w-4 h-4" />
          </Link>
        </div>

        {/* Step 2 */}
        <div className="glass-card rounded-xl p-6 relative overflow-hidden group hover:scale-[1.02] transition-transform">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <ListTree className="w-24 h-24" />
          </div>
          <h2 className="text-xl font-semibold mb-2">2. Map Accounts</h2>
          <p className="text-muted-foreground mb-6 text-sm">
            Link your custom chart of accounts to our Master CoA to establish
            standardized reporting categories and cash flow impacts.
          </p>
          <Link href="/mapping" className="inline-flex items-center text-primary hover:text-primary/80 font-medium">
            Start Mapping <ArrowRight className="ml-2 w-4 h-4" />
          </Link>
        </div>

        {/* Step 3 */}
        <div className="glass-card rounded-xl p-6 relative overflow-hidden group hover:scale-[1.02] transition-transform">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <PieChart className="w-24 h-24" />
          </div>
          <h2 className="text-xl font-semibold mb-2">3. View Statements</h2>
          <p className="text-muted-foreground mb-6 text-sm">
            Generate the Income Statement, Balance Sheet, and Statement of Cash Flows
            perfectly tied out and linked automatically.
          </p>
          <Link href="/statements" className="inline-flex items-center text-primary hover:text-primary/80 font-medium">
            View Output <ArrowRight className="ml-2 w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
