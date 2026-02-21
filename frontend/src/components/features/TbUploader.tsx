"use client";

import { useState } from "react";
import { UploadCloud, FileType, CheckCircle, AlertCircle, Calendar, Trash2 } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { uploadTrialBalance, getPeriods, deletePeriod } from "@/lib/api";
import { AxiosError } from "axios";

// We hardcode the Acme Corp ID for this prototype layout, 
// usually this comes from context or a dropdown selector.
const ACME_CORP_ID = "6921efce-4ef6-418f-b454-7699ba440600";

export function TbUploader() {
    const [file, setFile] = useState<File | null>(null);
    const [periodDate, setPeriodDate] = useState("2024-01-31");
    const [errorText, setErrorText] = useState("");
    const [warningText, setWarningText] = useState("");
    const [deletingPeriod, setDeletingPeriod] = useState<string | null>(null);

    const queryClient = useQueryClient();

    const { data: importedPeriods = [], isLoading: isPeriodsLoading } = useQuery<string[]>({
        queryKey: ["periods", ACME_CORP_ID],
        queryFn: () => getPeriods(ACME_CORP_ID),
    });

    const uploadMutation = useMutation({
        mutationFn: (fileToUpload: File) => uploadTrialBalance(ACME_CORP_ID, periodDate, fileToUpload),
        onSuccess: (data: { status: string; message: string; is_balanced: boolean; warning?: string }) => {
            setFile(null);
            setErrorText("");
            setWarningText(data.warning || "");
            queryClient.invalidateQueries({ queryKey: ["periods", ACME_CORP_ID] });
            queryClient.invalidateQueries({ queryKey: ["unmapped", ACME_CORP_ID] });
        },
        onError: (err: AxiosError<{ detail: string }>) => {
            setErrorText(err.response?.data?.detail || "An error occurred during upload.");
            setWarningText("");
        }
    });

    const deleteMutation = useMutation({
        mutationFn: (p: string) => deletePeriod(ACME_CORP_ID, p),
        onSuccess: () => {
            setDeletingPeriod(null);
            queryClient.invalidateQueries({ queryKey: ["periods", ACME_CORP_ID] });
            queryClient.invalidateQueries({ queryKey: ["unmapped", ACME_CORP_ID] });
        },
    });

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setErrorText("");
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            const droppedFile = e.dataTransfer.files[0];
            if (droppedFile.type === "text/csv") {
                setFile(droppedFile);
            } else {
                setErrorText("Please upload a valid CSV file.");
            }
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setErrorText("");
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
        }
    };

    return (
        <div className="flex flex-col gap-8 max-w-3xl mx-auto">
            {/* Upload Card */}
            <div className="glass-card rounded-xl p-8 shadow-2xl">
                <div className="mb-6 flex space-x-4 items-center">
                    <div className="flex-1">
                        <label className="block text-sm font-medium text-muted-foreground mb-1">Company Context</label>
                        <div className="px-3 py-2 bg-white/5 border border-border rounded-md text-foreground cursor-not-allowed">
                            Acme Corp (Demo)
                        </div>
                    </div>
                    <div className="flex-1">
                        <label className="block text-sm font-medium text-muted-foreground mb-1">Period Ending</label>
                        <input
                            type="date"
                            value={periodDate}
                            onChange={(e) => setPeriodDate(e.target.value)}
                            className="w-full px-3 py-2 bg-white/5 border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                    </div>
                </div>

                <div
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={handleDrop}
                    className={`border-2 border-dashed rounded-xl p-12 text-center transition-colors
          ${file ? "border-primary/50 bg-primary/5" : "border-border hover:border-primary/50 hover:bg-white/5"}`}
                >
                    <input
                        type="file"
                        id="csv-upload"
                        accept=".csv"
                        className="hidden"
                        onChange={handleChange}
                    />

                    {!file ? (
                        <label htmlFor="csv-upload" className="cursor-pointer flex flex-col items-center">
                            <div className="h-16 w-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                                <UploadCloud className="h-8 w-8 text-primary" />
                            </div>
                            <p className="text-lg font-medium text-foreground">Click to upload or drag and drop</p>
                            <p className="text-sm text-muted-foreground mt-1">CSV files only (Account Number, Name, Balance in cents)</p>
                        </label>
                    ) : (
                        <div className="flex flex-col items-center">
                            <div className="h-16 w-16 bg-accent/20 rounded-full flex items-center justify-center mb-4">
                                <FileType className="h-8 w-8 text-accent" />
                            </div>
                            <p className="text-lg font-medium text-foreground">{file.name}</p>
                            <p className="text-sm text-muted-foreground mt-1">{(file.size / 1024).toFixed(2)} KB</p>
                            <button
                                onClick={() => setFile(null)}
                                className="mt-3 text-sm text-destructive hover:underline"
                            >
                                Remove file
                            </button>
                        </div>
                    )}
                </div>

                {errorText && (
                    <div className="mt-4 p-3 rounded-md bg-destructive/20 border border-destructive/50 flex items-start">
                        <AlertCircle className="h-5 w-5 text-destructive mr-2 shrink-0" />
                        <p className="text-sm text-destructive-foreground">{errorText}</p>
                    </div>
                )}

                {warningText && (
                    <div className="mt-4 p-3 rounded-md bg-amber-500/20 border border-amber-500/50 flex items-start">
                        <AlertCircle className="h-5 w-5 text-amber-400 mr-2 shrink-0" />
                        <p className="text-sm text-amber-200">{warningText}</p>
                    </div>
                )}

                {uploadMutation.isSuccess && !warningText && (
                    <div className="mt-4 p-3 rounded-md bg-emerald-500/20 border border-emerald-500/50 flex items-start">
                        <CheckCircle className="h-5 w-5 text-emerald-400 mr-2 shrink-0" />
                        <p className="text-sm text-emerald-400">Trial balance uploaded successfully!</p>
                    </div>
                )}

                {uploadMutation.isSuccess && warningText && (
                    <div className="mt-4 p-3 rounded-md bg-emerald-500/10 border border-emerald-500/30 flex items-start">
                        <CheckCircle className="h-5 w-5 text-emerald-500 mr-2 shrink-0" />
                        <p className="text-sm text-emerald-500">Uploaded. The imbalance above will appear as a warning in the Balance Sheet.</p>
                    </div>
                )}

                <button
                    onClick={() => uploadMutation.mutate(file!)}
                    disabled={!file || uploadMutation.isPending}
                    className={`w-full mt-6 py-3 px-4 rounded-lg font-medium transition-all duration-300
          ${!file || uploadMutation.isPending
                            ? "bg-muted text-muted-foreground cursor-not-allowed"
                            : "bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_0_20px_rgba(59,130,246,0.5)]"
                        }`}
                >
                    {uploadMutation.isPending ? "Validating & Uploading..." : "Process Trial Balance"}
                </button>
            </div>

            {/* Imported Periods List */}
            <div className="glass-card rounded-xl border border-border overflow-hidden">
                <div className="p-4 border-b border-border bg-gradient-to-r from-primary/5 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-primary" />
                        <h3 className="font-bold text-foreground">Imported Periods</h3>
                    </div>
                    <span className="text-xs text-muted-foreground bg-white/5 border border-border px-2 py-1 rounded">
                        {importedPeriods.length} period{importedPeriods.length !== 1 ? "s" : ""} on record
                    </span>
                </div>

                {isPeriodsLoading ? (
                    <div className="p-6 animate-pulse space-y-3">
                        <div className="h-10 bg-white/5 rounded"></div>
                        <div className="h-10 bg-white/5 rounded"></div>
                    </div>
                ) : importedPeriods.length === 0 ? (
                    <div className="p-10 text-center text-muted-foreground">
                        <Calendar className="w-10 h-10 mx-auto mb-3 opacity-20" />
                        <p className="text-sm">No trial balances imported yet.</p>
                        <p className="text-xs mt-1 opacity-70">Upload your first CSV above to get started.</p>
                    </div>
                ) : (
                    <div className="divide-y divide-border/50">
                        {importedPeriods.map((p) => (
                            <div key={p} className="flex items-center justify-between px-6 py-4 hover:bg-white/5 transition-colors group">
                                <div className="flex items-center gap-3">
                                    <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/50"></div>
                                    <div>
                                        <p className="font-mono font-medium text-foreground">{p}</p>
                                        <p className="text-xs text-muted-foreground mt-0.5">Trial Balance — Period Ending</p>
                                    </div>
                                </div>

                                {deletingPeriod === p ? (
                                    <div className="flex items-center gap-3 text-sm">
                                        <span className="text-muted-foreground">Delete permanently?</span>
                                        <button
                                            onClick={() => deleteMutation.mutate(p)}
                                            disabled={deleteMutation.isPending}
                                            className="text-destructive-foreground bg-destructive/80 hover:bg-destructive px-3 py-1 rounded text-xs font-medium transition-colors"
                                        >
                                            {deleteMutation.isPending ? "Deleting..." : "Confirm"}
                                        </button>
                                        <button
                                            onClick={() => setDeletingPeriod(null)}
                                            className="text-muted-foreground hover:text-foreground px-3 py-1 rounded text-xs transition-colors"
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                ) : (
                                    <button
                                        onClick={() => setDeletingPeriod(p)}
                                        className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive-foreground p-2 rounded-md hover:bg-destructive/20"
                                        title="Delete this period"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
