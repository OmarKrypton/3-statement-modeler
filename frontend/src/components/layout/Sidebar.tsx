"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Calculator, ArrowLeftRight, FileSpreadsheet, LayoutDashboard, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

const navigation = [
    { name: "Dashboard", href: "/", icon: LayoutDashboard },
    { name: "Trial Balance", href: "/trial-balance", icon: FileSpreadsheet },
    { name: "Account Mapping", href: "/mapping", icon: ArrowLeftRight },
    { name: "Financial Statements", href: "/statements", icon: Calculator },
];

export function Sidebar() {
    const pathname = usePathname();

    return (
        <div className="flex flex-col w-64 h-full glass border-r border-border">
            <div className="flex h-16 shrink-0 items-center px-6 border-b border-border">
                <Calculator className="h-8 w-8 text-primary" />
                <span className="ml-3 text-lg font-semibold text-gradient">3-Statement Modeler</span>
            </div>
            <div className="flex flex-1 flex-col overflow-y-auto mt-6">
                <nav className="flex-1 space-y-2 px-4">
                    {navigation.map((item) => {
                        const isActive = pathname === item.href || (pathname.startsWith(item.href) && item.href !== "/");
                        return (
                            <Link
                                key={item.name}
                                href={item.href}
                                className={cn(
                                    isActive
                                        ? "bg-primary/20 text-primary border border-primary/30"
                                        : "text-muted-foreground hover:bg-white/5 hover:text-foreground",
                                    "group flex gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold transition-all duration-200"
                                )}
                            >
                                <item.icon
                                    className={cn(
                                        isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground",
                                        "h-5 w-5 shrink-0 transition-colors"
                                    )}
                                    aria-hidden="true"
                                />
                                {item.name}
                            </Link>
                        );
                    })}
                </nav>
            </div>
            <div className="p-4 mt-auto border-t border-border">
                <Link
                    href="/settings"
                    className="group flex gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold text-muted-foreground hover:bg-white/5 hover:text-foreground transition-all duration-200"
                >
                    <Settings className="h-5 w-5 shrink-0 text-muted-foreground group-hover:text-foreground" />
                    Settings
                </Link>
            </div>
        </div>
    );
}
