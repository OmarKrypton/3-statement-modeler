"use client";

import { useState } from "react";
import { UploadCloud, FileType, CheckCircle, AlertCircle } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { uploadTrialBalance } from "@/lib/api";
import { AxiosError } from "axios";

// We hardcode the Acme Corp ID for this prototype layout, 
// usually this comes from context or a dropdown selector.
const ACME_CORP_ID = "6921efce-4ef6-418f-b454-7699ba440600";

export function TbUploader() {
    const [file, setFile] = useState<File | null>(null);
    const [periodDate, setPeriodDate] = useState("2024-01-31");
    const [errorText, setErrorText] = useState("");

    const uploadMutation = useMutation({
        mutationFn: (fileToUpload: File) => uploadTrialBalance(ACME_CORP_ID, periodDate, fileToUpload),
        onSuccess: () => {
            setFile(null);
            setErrorText("");
        },
        onError: (err: AxiosError<{ detail: string }>) => {
            setErrorText(err.response?.data?.detail || "An error occurred during upload.");
        }
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
        <div className="glass-card rounded-xl p-8 max-w-2xl mx-auto shadow-2xl">
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

            {uploadMutation.isSuccess && (
                <div className="mt-4 p-3 rounded-md bg-emerald-500/20 border border-emerald-500/50 flex items-start">
                    <CheckCircle className="h-5 w-5 text-emerald-400 mr-2 shrink-0" />
                    <p className="text-sm text-emerald-400">Trial balance uploaded and balanced successfully!</p>
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
                {uploadMutation.isPending ? "Validating Equation & Uploading..." : "Process Trial Balance"}
            </button>
        </div>
    );
}
