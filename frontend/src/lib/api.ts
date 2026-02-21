import axios from "axios";

// Assume backend is running on localhost:8000 by default during dev
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

export const api = axios.create({
    baseURL: API_URL,
    headers: {
        "Content-Type": "application/json",
    },
});

export const getCompanies = async () => {
    const { data } = await api.get("/companies/");
    return data;
};

export const getCompany = async (companyId: string) => {
    const { data } = await api.get(`/companies/${companyId}`);
    return data;
};

export const updateCompany = async (companyId: string, companyUpdate: { name?: string, fiscal_year_end?: number, currency?: string }) => {
    const { data } = await api.put(`/companies/${companyId}`, companyUpdate);
    return data;
};

export const getMasterCoA = async () => {
    const { data } = await api.get("/master-coa/");
    return data;
};

export const getUnmappedAccounts = async (companyId: string) => {
    const { data } = await api.get(`/companies/${companyId}/mappings/unmapped`);
    return data;
};

export const uploadTrialBalance = async (companyId: string, periodDate: string, file: File) => {
    const formData = new FormData();
    formData.append("file", file);

    // Notice URL requires period_date as query parameter as per backend router setup
    // @router.post("/upload") async def upload_trial_balance(company_id: str, period_date: date, file: UploadFile ...)
    const { data } = await api.post(`/companies/${companyId}/trial-balances/upload?period_date=${periodDate}`, formData, {
        headers: {
            "Content-Type": "multipart/form-data",
        },
    });
    return data;
};

export const saveMappings = async (companyId: string, mappings: { company_account_id: string, master_account_id: string }[]) => {
    const { data } = await api.put(`/companies/${companyId}/mappings/`, mappings);
    return data;
};

export const resetMappings = async (companyId: string) => {
    const { data } = await api.delete(`/companies/${companyId}/mappings/reset`);
    return data;
};

// Statement Generation
export const getIncomeStatement = async (companyId: string, start: string, end: string) => {
    const { data } = await api.get(`/companies/${companyId}/statements/income-statement?period_start=${start}&period_end=${end}`);
    return data;
};

export const getBalanceSheet = async (companyId: string, date: string) => {
    const { data } = await api.get(`/companies/${companyId}/statements/balance-sheet?period_date=${date}`);
    return data;
};

export const getCashFlow = async (companyId: string, start: string, end: string) => {
    const { data } = await api.get(`/companies/${companyId}/statements/cash-flow?period_start=${start}&period_end=${end}`);
    return data;
};
