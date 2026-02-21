export interface Company {
    id: string;
    name: string;
    fiscal_year_end: number;
    currency: string;
}

export enum AccountCategory {
    ASSET = "ASSET",
    LIABILITY = "LIABILITY",
    EQUITY = "EQUITY",
    REVENUE = "REVENUE",
    EXPENSE = "EXPENSE"
}

export enum CashFlowCategory {
    OPERATING = "OPERATING",
    INVESTING = "INVESTING",
    FINANCING = "FINANCING",
    NON_CASH = "NON_CASH"
}

export interface MasterAccount {
    id: string;
    account_code: string;
    name: string;
    category: AccountCategory;
    sub_category: string;
    cash_flow_category: CashFlowCategory;
    normal_balance: "DEBIT" | "CREDIT";
}

export interface CompanyAccount {
    id: string;
    company_id: string;
    import_account_number: string;
    import_account_name: string;
    is_active: boolean;
}

export interface StatementResult {
    period: string;
    total_revenues_cents: number;
    total_expenses_cents: number;
    net_income_cents: number;
}

export interface BalanceSheetResult {
    period: string;
    total_assets_cents: number;
    total_liabilities_cents: number;
    total_equity_cents: number;
    unmapped_balance_cents: number;
    is_balanced_equation: boolean;
}

export interface CashFlowResult {
    period: string;
    net_income_cents: number;
    non_cash_adjustments_cents: number;
    operating_wc_delta_cents: number;
    net_cash_from_operations_cents: number;
    net_cash_from_investing_cents: number;
    net_cash_from_financing_cents: number;
    net_change_in_cash_cents: number;
    beginning_cash_cents: number;
    ending_cash_cents: number;
}
