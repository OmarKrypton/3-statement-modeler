"use client";

import React, { useEffect, useState } from "react";
import { Minus, Square, X, Copy } from "lucide-react";

export const TitleBar = () => {
    const [isTauri, setIsTauri] = useState(false);
    const [isMaximized, setIsMaximized] = useState(false);

    useEffect(() => {
        // Detect Tauri environment
        if (typeof window !== "undefined" && (window as any).__TAURI__) {
            setIsTauri(true);
            
            // Listen for window resize/maximize events to keep icons in sync
            const setupListener = async () => {
                const { getCurrentWindow } = await import("@tauri-apps/api/window");
                const win = getCurrentWindow();
                const unlisten = await win.onResized(async () => {
                   const maximized = await win.isMaximized();
                   setIsMaximized(maximized);
                });
                return unlisten;
            };

            const unlistenPromise = setupListener();
            return () => {
                unlistenPromise.then(unlisten => unlisten());
            };
        }
    }, []);

    if (!isTauri) return null;

    const handleMinimize = async () => {
        const { getCurrentWindow } = await import("@tauri-apps/api/window");
        await getCurrentWindow().minimize();
    };

    const handleMaximize = async () => {
        const { getCurrentWindow } = await import("@tauri-apps/api/window");
        const win = getCurrentWindow();
        await win.toggleMaximize();
        const maximized = await win.isMaximized();
        setIsMaximized(maximized);
    };

    const handleClose = async () => {
        const { getCurrentWindow } = await import("@tauri-apps/api/window");
        await getCurrentWindow().close();
    };

    const handleMouseDown = async (e: React.MouseEvent) => {
        // Only drag for left-click and if not clicking on a control button
        const target = e.target as HTMLElement;
        const isButton = target.closest('button') || target.closest('svg');
        
        if (e.button === 0 && !isButton) {
            e.stopPropagation();
            e.preventDefault();
            const { getCurrentWindow } = await import("@tauri-apps/api/window");
            await getCurrentWindow().startDragging();
        }
    };

    return (
        <div
            data-tauri-drag-region
            className="h-8 bg-slate-950/90 backdrop-blur-md border-b border-white/5 flex items-center justify-between select-none fixed top-0 left-0 right-0 z-[9999]"
        >
            {/* Logo & Title */}
            <div data-tauri-drag-region className="flex items-center gap-2 pl-3">
                <img
                    data-tauri-drag-region
                    src="/icon.png"
                    alt="Logo"
                    className="w-5 h-5 rounded-sm shadow-[0_0_8px_rgba(59,130,246,0.2)]"
                    onError={(e) => {
                        (e.target as any).style.display = "none";
                    }}
                />
                <span data-tauri-drag-region className="text-[11px] font-bold tracking-tight text-slate-300">
                    3-Statement Modeler
                </span>
            </div>

            {/* Window Controls */}
            <div
                onMouseDown={(e) => e.stopPropagation()}
                className="flex items-stretch h-full relative z-50"
            >
                <button
                    onClick={handleMinimize}
                    className="w-10 flex items-center justify-center hover:bg-white/5 transition-colors group"
                >
                    <Minus className="w-3.5 h-3.5 text-slate-500 group-hover:text-white transition-colors" />
                </button>
                <button
                    onClick={handleMaximize}
                    className="w-10 flex items-center justify-center hover:bg-white/5 transition-colors group"
                >
                    {isMaximized ? (
                        <Copy className="w-3 h-3 text-slate-500 group-hover:text-white transition-colors" />
                    ) : (
                        <Square className="w-3 h-3 text-slate-500 group-hover:text-white transition-colors" />
                    )}
                </button>
                <button
                    onClick={handleClose}
                    className="w-10 flex items-center justify-center hover:bg-rose-500/80 transition-colors group"
                >
                    <X className="w-3.5 h-3.5 text-slate-500 group-hover:text-white transition-colors" />
                </button>
            </div>
        </div>
    );
};
