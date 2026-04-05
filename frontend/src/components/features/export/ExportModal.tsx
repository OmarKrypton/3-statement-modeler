"use client";

import React, { useState } from "react";
import { X, FileText, Download, CheckSquare, Square, AlertCircle, FileSpreadsheet } from "lucide-react";

interface ExportModalProps {
    isOpen: boolean;
    onClose: () => void;
    onExport: (format: "excel" | "pdf", selection: { is: boolean; bs: boolean; cf: boolean }) => Promise<void> | void;
    title?: string;
    availableStatements?: ("is" | "bs" | "cf")[];
}

export default function ExportModal({
    isOpen,
    onClose,
    onExport,
    title = "Export Report",
    availableStatements = ["is", "bs", "cf"]
}: ExportModalProps) {
    const [selection, setSelection] = useState({
        is: availableStatements.includes("is"),
        bs: availableStatements.includes("bs"),
        cf: availableStatements.includes("cf")
    });
    const [isExporting, setIsExporting] = useState<"excel" | "pdf" | null>(null);

    if (!isOpen) return null;

    const toggle = (key: keyof typeof selection) => {
        setSelection(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const handleExport = async (format: "excel" | "pdf") => {
        setIsExporting(format);
        try {
            await onExport(format, selection);
        } finally {
            setIsExporting(null);
        }
    };

    const hasSelection = selection.is || selection.bs || selection.cf;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="glass-card w-full max-w-md rounded-2xl border border-border overflow-hidden shadow-2xl scale-in-center animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-white/5">
                    <div className="flex items-center gap-2">
                        <Download className="w-5 h-5 text-primary" />
                        <h2 className="text-lg font-bold text-foreground">{title}</h2>
                    </div>
                    <button
                        onClick={onClose}
                        disabled={!!isExporting}
                        className="p-1 hover:bg-white/10 rounded-md transition-colors text-muted-foreground disabled:opacity-30"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6">
                    <div>
                        <p className="text-sm text-muted-foreground mb-4">
                            Select which financial statements you would like to include in your export.
                        </p>

                        <div className="space-y-3">
                            {availableStatements.includes("is") && (
                                <button
                                    disabled={!!isExporting}
                                    onClick={() => toggle("is")}
                                    className={`w-full flex items-center justify-between px-4 py-3 rounded-lg border transition-all ${selection.is ? 'border-primary/50 bg-primary/10 text-foreground' : 'border-border bg-white/5 text-muted-foreground hover:bg-white/10'} disabled:opacity-50`}
                                >
                                    <div className="flex items-center gap-3">
                                        <FileText className={`w-5 h-5 ${selection.is ? 'text-primary' : 'text-muted-foreground'}`} />
                                        <span className="font-medium">Income Statement</span>
                                    </div>
                                    {selection.is ? <CheckSquare className="w-5 h-5 text-primary" /> : <Square className="w-5 h-5" />}
                                </button>
                            )}

                            {availableStatements.includes("bs") && (
                                <button
                                    disabled={!!isExporting}
                                    onClick={() => toggle("bs")}
                                    className={`w-full flex items-center justify-between px-4 py-3 rounded-lg border transition-all ${selection.bs ? 'border-primary/50 bg-primary/10 text-foreground' : 'border-border bg-white/5 text-muted-foreground hover:bg-white/10'} disabled:opacity-50`}
                                >
                                    <div className="flex items-center gap-3">
                                        <FileText className={`w-5 h-5 ${selection.bs ? 'text-primary' : 'text-muted-foreground'}`} />
                                        <span className="font-medium">Balance Sheet</span>
                                    </div>
                                    {selection.bs ? <CheckSquare className="w-5 h-5 text-primary" /> : <Square className="w-5 h-5" />}
                                </button>
                            )}

                            {availableStatements.includes("cf") && (
                                <button
                                    disabled={!!isExporting}
                                    onClick={() => toggle("cf")}
                                    className={`w-full flex items-center justify-between px-4 py-3 rounded-lg border transition-all ${selection.cf ? 'border-primary/50 bg-primary/10 text-foreground' : 'border-border bg-white/5 text-muted-foreground hover:bg-white/10'} disabled:opacity-50`}
                                >
                                    <div className="flex items-center gap-3">
                                        <FileText className={`w-5 h-5 ${selection.cf ? 'text-primary' : 'text-muted-foreground'}`} />
                                        <span className="font-medium">Cash Flow Statement</span>
                                    </div>
                                    {selection.cf ? <CheckSquare className="w-5 h-5 text-primary" /> : <Square className="w-5 h-5" />}
                                </button>
                            )}
                        </div>
                    </div>

                    {!hasSelection && (
                        <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs">
                            <AlertCircle className="w-4 h-4 shrink-0" />
                            <span>Please select at least one statement to export.</span>
                        </div>
                    )}
                </div>

                {/* Action Buttons */}
                <div className="px-6 pb-6 pt-2 flex flex-col gap-3">
                    <button
                        disabled={!hasSelection || !!isExporting}
                        onClick={() => handleExport("excel")}
                        className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-900/40 disabled:text-emerald-500/50 text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-3 transition-all shadow-lg shadow-emerald-500/10 active:scale-[0.98] group relative overflow-hidden"
                    >
                        {isExporting === "excel" ? (
                            <>
                                <Loader2 className="w-5 h-5 animate-spin" />
                                <span>Exporting Excel...</span>
                            </>
                        ) : (
                            <>
                                <FileSpreadsheet className="w-5 h-5 transition-transform group-hover:scale-110" />
                                <span>Download Excel (.xlsx)</span>
                            </>
                        )}
                    </button>

                    <button
                        disabled={!hasSelection || !!isExporting}
                        onClick={() => handleExport("pdf")}
                        className="w-full bg-white/5 hover:bg-white/10 border border-border disabled:opacity-30 text-foreground font-semibold py-3.5 rounded-xl flex items-center justify-center gap-3 transition-all active:scale-[0.98] group"
                    >
                        {isExporting === "pdf" ? (
                            <>
                                <Loader2 className="w-5 h-5 animate-spin text-rose-400" />
                                <span>Generating PDF...</span>
                            </>
                        ) : (
                            <>
                                <FileText className="w-5 h-5 text-rose-400 transition-transform group-hover:scale-110" />
                                <span>Generate PDF Report</span>
                            </>
                        )}
                    </button>

                    <button
                        disabled={!!isExporting}
                        onClick={onClose}
                        className="w-full py-2 text-sm text-muted-foreground hover:text-foreground transition-colors mt-2 disabled:opacity-30"
                    >
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );
}

import { Loader2 } from "lucide-react";
