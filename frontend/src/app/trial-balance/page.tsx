import { TbUploader } from "@/components/features/TbUploader";

export default function TrialBalancePage() {
    return (
        <div className="flex flex-col gap-6 py-8 animate-in slide-in-from-bottom-4 duration-500">
            <div>
                <h1 className="text-3xl font-bold tracking-tight text-foreground">Trial Balance Import</h1>
                <p className="mt-2 text-muted-foreground w-2/3">
                    Upload your raw company trial balance here. Ensure your CSV has headers for
                    <span className="text-primary mx-1">account_number</span>,
                    <span className="text-primary mx-1">account_name</span>, and
                    <span className="text-primary mx-1">balance</span>
                    (in cents, where Debits are positive and Credits are negative).
                </p>
            </div>

            <div className="mt-8">
                <TbUploader />
            </div>
        </div>
    );
}
