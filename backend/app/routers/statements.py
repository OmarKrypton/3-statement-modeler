from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy.sql import func
from datetime import date
from typing import List

from .. import models, schemas
from ..database import get_db

router = APIRouter(
    prefix="/api/v1/companies/{company_id}/statements",
    tags=["Financial Statements"]
)

def get_statement_balance(
    db: Session, 
    company_id: str, 
    period_start: date, 
    period_end: date, 
    categories: list[models.AccountCategory]
) -> int:
    """Helper to sum balances across period(s) based on Master CoA category mapping."""
    result = db.query(func.sum(models.TrialBalanceEntry.balance)).join(
        models.CompanyAccount, 
        models.TrialBalanceEntry.company_account_id == models.CompanyAccount.id
    ).join(
        models.AccountMapping,
        models.CompanyAccount.id == models.AccountMapping.company_account_id
    ).join(
        models.MasterChartOfAccount,
        models.AccountMapping.master_account_id == models.MasterChartOfAccount.id
    ).join(
        models.ReportingPeriod,
        models.TrialBalanceEntry.reporting_period_id == models.ReportingPeriod.id
    ).filter(
        models.CompanyAccount.company_id == company_id,
        models.ReportingPeriod.period_date >= period_start,
        models.ReportingPeriod.period_date <= period_end,
        models.MasterChartOfAccount.category.in_(categories)
    ).scalar()
    return result or 0

def get_unmapped_balance(db: Session, company_id: str, period_date: date) -> int:
    """Sum balances for accounts that have NOT been mapped to the Master CoA."""
    result = db.query(func.sum(models.TrialBalanceEntry.balance)).join(
        models.CompanyAccount,
        models.TrialBalanceEntry.company_account_id == models.CompanyAccount.id
    ).join(
        models.ReportingPeriod,
        models.TrialBalanceEntry.reporting_period_id == models.ReportingPeriod.id
    ).outerjoin(
        models.AccountMapping,
        models.CompanyAccount.id == models.AccountMapping.company_account_id
    ).filter(
        models.CompanyAccount.company_id == company_id,
        models.ReportingPeriod.period_date <= period_date,
        models.AccountMapping.id == None
    ).scalar()
    return result or 0

@router.get("/income-statement")
def get_income_statement(
    company_id: str,
    periods: List[date] = Query(...),
    db: Session = Depends(get_db)
):
    results = []
    # Sort periods chronologically
    for p in sorted(periods):
        total_revenues = get_statement_balance(db, company_id, p, p, [models.AccountCategory.REVENUE])
        total_expenses = get_statement_balance(db, company_id, p, p, [models.AccountCategory.EXPENSE])
        net_income = (total_revenues + total_expenses) * -1
        
        results.append({
            "period": str(p),
            "total_revenues_cents": total_revenues * -1,
            "total_expenses_cents": total_expenses,
            "net_income_cents": net_income
        })
    return results

@router.get("/balance-sheet")
def get_balance_sheet(
    company_id: str,
    periods: List[date] = Query(...),
    db: Session = Depends(get_db)
):
    results = []
    for p in sorted(periods):
        total_assets = get_statement_balance(db, company_id, date.min, p, [models.AccountCategory.ASSET])
        total_liabilities = get_statement_balance(db, company_id, date.min, p, [models.AccountCategory.LIABILITY])
        base_equity = get_statement_balance(db, company_id, date.min, p, [models.AccountCategory.EQUITY])
        
        total_revenues = get_statement_balance(db, company_id, date.min, p, [models.AccountCategory.REVENUE])
        total_expenses = get_statement_balance(db, company_id, date.min, p, [models.AccountCategory.EXPENSE])
        retained_earnings_impact = total_revenues + total_expenses
        total_equity = base_equity + retained_earnings_impact
        
        unmapped_balance = get_unmapped_balance(db, company_id, p)
        is_balanced = (total_assets + total_liabilities + total_equity + unmapped_balance) == 0

        results.append({
            "period": str(p),
            "total_assets_cents": total_assets,
            "total_liabilities_cents": total_liabilities * -1,
            "total_equity_cents": total_equity * -1,
            "unmapped_balance_cents": unmapped_balance,
            "is_balanced_equation": is_balanced
        })
    return results

def get_statement_balance_by_cash_flow(
    db: Session, 
    company_id: str, 
    period_start: date, 
    period_end: date, 
    cf_category: models.CashFlowCategory
) -> int:
    result = db.query(func.sum(models.TrialBalanceEntry.balance)).join(
        models.CompanyAccount, 
        models.TrialBalanceEntry.company_account_id == models.CompanyAccount.id
    ).join(
        models.AccountMapping,
        models.CompanyAccount.id == models.AccountMapping.company_account_id
    ).join(
        models.MasterChartOfAccount,
        models.AccountMapping.master_account_id == models.MasterChartOfAccount.id
    ).join(
        models.ReportingPeriod,
        models.TrialBalanceEntry.reporting_period_id == models.ReportingPeriod.id
    ).filter(
        models.CompanyAccount.company_id == company_id,
        models.ReportingPeriod.period_date >= period_start,
        models.ReportingPeriod.period_date <= period_end,
        models.MasterChartOfAccount.cash_flow_category == cf_category
    ).scalar()
    return result or 0

@router.get("/cash-flow")
def get_cash_flow(
    company_id: str,
    periods: List[date] = Query(...),
    db: Session = Depends(get_db)
):
    results = []
    for p in sorted(periods):
        # MTD Net Income
        total_revenues = get_statement_balance(db, company_id, p, p, [models.AccountCategory.REVENUE])
        total_expenses = get_statement_balance(db, company_id, p, p, [models.AccountCategory.EXPENSE])
        net_income = (total_revenues + total_expenses) * -1
        
        # MTD Cash Flow components
        non_cash_adjustments = get_statement_balance_by_cash_flow(db, company_id, p, p, models.CashFlowCategory.NON_CASH)
        
        operating_wc_delta_result = db.query(func.sum(models.TrialBalanceEntry.balance)).join(
            models.CompanyAccount, 
            models.TrialBalanceEntry.company_account_id == models.CompanyAccount.id
        ).join(
            models.AccountMapping,
            models.CompanyAccount.id == models.AccountMapping.company_account_id
        ).join(
            models.MasterChartOfAccount,
            models.AccountMapping.master_account_id == models.MasterChartOfAccount.id
        ).join(
            models.ReportingPeriod,
            models.TrialBalanceEntry.reporting_period_id == models.ReportingPeriod.id
        ).filter(
            models.CompanyAccount.company_id == company_id,
            models.ReportingPeriod.period_date == p,
            models.MasterChartOfAccount.cash_flow_category == models.CashFlowCategory.OPERATING,
            models.MasterChartOfAccount.category.in_([models.AccountCategory.ASSET, models.AccountCategory.LIABILITY]),
            models.MasterChartOfAccount.account_code != "1000"
        ).scalar()
        
        operating_wc_delta = (operating_wc_delta_result or 0) * -1
        cash_from_operations = net_income + non_cash_adjustments + operating_wc_delta
        investing_delta = get_statement_balance_by_cash_flow(db, company_id, p, p, models.CashFlowCategory.INVESTING) * -1
        
        financing_delta_result = db.query(func.sum(models.TrialBalanceEntry.balance)).join(
            models.CompanyAccount, 
            models.TrialBalanceEntry.company_account_id == models.CompanyAccount.id
        ).join(
            models.AccountMapping,
            models.CompanyAccount.id == models.AccountMapping.company_account_id
        ).join(
            models.MasterChartOfAccount,
            models.AccountMapping.master_account_id == models.MasterChartOfAccount.id
        ).join(
            models.ReportingPeriod,
            models.TrialBalanceEntry.reporting_period_id == models.ReportingPeriod.id
        ).filter(
            models.CompanyAccount.company_id == company_id,
            models.ReportingPeriod.period_date == p,
            models.MasterChartOfAccount.cash_flow_category == models.CashFlowCategory.FINANCING,
            models.MasterChartOfAccount.account_code != "3500"
        ).scalar()

        financing_delta = (financing_delta_result or 0) * -1
        net_change_in_cash = cash_from_operations + investing_delta + financing_delta

        # Ending cash is inception to date
        ending_cash_result = db.query(func.sum(models.TrialBalanceEntry.balance)).join(
            models.CompanyAccount, 
            models.TrialBalanceEntry.company_account_id == models.CompanyAccount.id
        ).join(
            models.AccountMapping,
            models.CompanyAccount.id == models.AccountMapping.company_account_id
        ).join(
            models.MasterChartOfAccount,
            models.AccountMapping.master_account_id == models.MasterChartOfAccount.id
        ).join(
            models.ReportingPeriod,
            models.TrialBalanceEntry.reporting_period_id == models.ReportingPeriod.id
        ).filter(
            models.CompanyAccount.company_id == company_id,
            models.ReportingPeriod.period_date <= p,
            models.MasterChartOfAccount.account_code == "1000"
        ).scalar()

        ending_cash = ending_cash_result or 0
        beginning_cash = ending_cash - net_change_in_cash
        
        results.append({
            "period": str(p),
            "net_income_cents": net_income,
            "non_cash_adjustments_cents": non_cash_adjustments,
            "operating_wc_delta_cents": operating_wc_delta,
            "net_cash_from_operations_cents": cash_from_operations,
            "net_cash_from_investing_cents": investing_delta,
            "net_cash_from_financing_cents": financing_delta,
            "net_change_in_cash_cents": net_change_in_cash,
            "beginning_cash_cents": beginning_cash,
            "ending_cash_cents": ending_cash
        })
        
    return results
