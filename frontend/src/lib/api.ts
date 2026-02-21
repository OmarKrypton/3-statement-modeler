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
export const getPeriods = async (companyId: string) => {
    const { data } = await api.get(`/companies/${companyId}/periods`);
    return data;
};

const buildPeriodsQuery = (periods: string[]) => {
    return periods.map(p => `periods=${p}`).join("&");
};

export const getIncomeStatement = async (companyId: string, periods: string[]) => {
    const { data } = await api.get(`/companies/${companyId}/statements/income-statement?${buildPeriodsQuery(periods)}`);
    return data;
};

export const getBalanceSheet = async (companyId: string, periods: string[]) => {
    const { data } = await api.get(`/companies/${companyId}/statements/balance-sheet?${buildPeriodsQuery(periods)}`);
    return data;
};

export const getCashFlow = async (companyId: string, periods: string[]) => {
    const { data } = await api.get(`/companies/${companyId}/statements/cash-flow?${buildPeriodsQuery(periods)}`);
    return data;
};

export const deletePeriod = async (companyId: string, periodDate: string) => {
    const { data } = await api.delete(`/companies/${companyId}/periods/${periodDate}`);
    return data;
};

// Forecast Engine
export interface ForecastConfigPayload {
    scenario_name?: string;
    base_period: string | null;
    num_periods: number;
    revenue_growth_pct: number;
    cogs_pct_of_revenue: number;
    opex_growth_pct: number;
    tax_rate_pct: number;
    capex_cents: number;
    da_cents: number;
    wc_pct_of_revenue: number;
}

export const getForecastConfig = async (companyId: string, scenario: string = "base") => {
    const { data } = await api.get(`/companies/${companyId}/forecast/config?scenario=${scenario}`);
    return data;
};

export const saveForecastConfig = async (companyId: string, config: ForecastConfigPayload) => {
    const { data } = await api.put(`/companies/${companyId}/forecast/config`, config);
    return data;
};

export const getForecastStatements = async (companyId: string, scenario: string = "base") => {
    const { data } = await api.get(`/companies/${companyId}/forecast/statements?scenario=${scenario}`);
    return data;
};
