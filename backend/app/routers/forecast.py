from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from datetime import date
from dateutil.relativedelta import relativedelta
from typing import List, Optional
from pydantic import BaseModel

from .. import models
from ..database import get_db

router = APIRouter(
    prefix="/api/v1/companies/{company_id}/forecast",
    tags=["Forecast"]
)

# ── Pydantic schemas (local, lightweight) ─────────────────────────────────────

class ForecastConfigIn(BaseModel):
    scenario_name: str = "base"
    base_period: Optional[date] = None
    num_periods: int = 3
    revenue_growth_pct: int = 500    # basis points: 500 = 5.00%
    cogs_pct_of_revenue: int = 6000
    opex_growth_pct: int = 300
    tax_rate_pct: int = 2100
    capex_cents: int = 0
    da_cents: int = 0
    wc_pct_of_revenue: int = 1000

class ForecastConfigOut(ForecastConfigIn):
    id: str
    company_id: str
    model_config = {"from_attributes": True}

# ── Helpers ───────────────────────────────────────────────────────────────────

def _bp(basis_points: int) -> float:
    """Convert stored basis points to a decimal ratio (500 → 0.05)."""
    return basis_points / 10000.0

def _get_actuals(db: Session, company_id: str, period: date) -> dict:
    """Pull actual IS line-items for a given period from the DB."""
    from sqlalchemy.sql import func

    def sumby(categories, period_start, period_end):
        return db.query(func.sum(models.TrialBalanceEntry.balance)).join(
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
        ).scalar() or 0

    # Cash = last actual period's cash (account_code "1000"), inception-to-date
    from sqlalchemy.sql import func as f2
    cash_result = db.query(f2.sum(models.TrialBalanceEntry.balance)).join(
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
        models.ReportingPeriod.period_date <= period,
        models.MasterChartOfAccount.account_code == "1000"
    ).scalar() or 0

    revenue_raw = sumby([models.AccountCategory.REVENUE], period, period)
    expense_raw = sumby([models.AccountCategory.EXPENSE], period, period)

    # Revenue credits are negative in TB; flip to positive for display
    revenue = revenue_raw * -1
    expenses = expense_raw  # expenses are positive debits

    # Working capital = current assets (excl cash) + current liabilities
    wc_assets = db.query(func.sum(models.TrialBalanceEntry.balance)).join(
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
        models.ReportingPeriod.period_date == period,
        models.MasterChartOfAccount.cash_flow_category == models.CashFlowCategory.OPERATING,
        models.MasterChartOfAccount.category.in_([models.AccountCategory.ASSET, models.AccountCategory.LIABILITY]),
        models.MasterChartOfAccount.account_code != "1000"
    ).scalar() or 0
    net_wc = wc_assets * -1

    return {
        "revenue": revenue,
        "expenses": expenses,
        "net_wc": net_wc,
        "cash": cash_result,
    }

# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.get("/config", response_model=ForecastConfigOut)
def get_forecast_config(company_id: str, scenario: str = "base", db: Session = Depends(get_db)):
    config = db.query(models.ForecastConfig).filter(
        models.ForecastConfig.company_id == company_id,
        models.ForecastConfig.scenario_name == scenario
    ).first()
    if not config:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"No {scenario} forecast config found. Save one first.")
    return config

@router.put("/config", response_model=ForecastConfigOut)
def upsert_forecast_config(company_id: str, payload: ForecastConfigIn, db: Session = Depends(get_db)):
    config = db.query(models.ForecastConfig).filter(
        models.ForecastConfig.company_id == company_id,
        models.ForecastConfig.scenario_name == payload.scenario_name
    ).first()
    if config:
        for field, value in payload.model_dump().items():
            setattr(config, field, value)
    else:
        config = models.ForecastConfig(company_id=company_id, **payload.model_dump())
        db.add(config)
    db.commit()
    db.refresh(config)
    return config

@router.get("/statements")
def get_forecast_statements(company_id: str, scenario: str = "base", db: Session = Depends(get_db)):
    """Compute projected 3-statement model from saved ForecastConfig."""
    config = db.query(models.ForecastConfig).filter(
        models.ForecastConfig.company_id == company_id,
        models.ForecastConfig.scenario_name == scenario
    ).first()
    if not config or not config.base_period:
        raise HTTPException(status_code=400, detail="No forecast config or base_period set.")

    # Validate base_period exists
    period_exists = db.query(models.ReportingPeriod).filter(
        models.ReportingPeriod.company_id == company_id,
        models.ReportingPeriod.period_date == config.base_period
    ).first()
    if not period_exists:
        raise HTTPException(status_code=400, detail=f"Base period {config.base_period} has no imported trial balance.")

    actuals = _get_actuals(db, company_id, config.base_period)

    revenue_growth = _bp(config.revenue_growth_pct)
    cogs_pct      = _bp(config.cogs_pct_of_revenue)
    opex_growth   = _bp(config.opex_growth_pct)
    tax_rate      = _bp(config.tax_rate_pct)
    wc_pct        = _bp(config.wc_pct_of_revenue)
    capex         = config.capex_cents
    da            = config.da_cents

    projected_periods = []
    prev_revenue  = actuals["revenue"]
    prev_opex     = actuals["expenses"]
    prev_wc       = actuals["net_wc"]
    ending_cash   = actuals["cash"]

    # Compute projected label dates (one calendar month forward each step)
    base = config.base_period

    for n in range(1, config.num_periods + 1):
        period_label = base + relativedelta(months=n)

        # ── Income Statement ──────────────────────────────────────────────────
        revenue     = int(prev_revenue * (1 + revenue_growth))
        cogs        = int(revenue * cogs_pct)
        gross_profit = revenue - cogs
        opex        = int(prev_opex * (1 + opex_growth))
        ebitda      = gross_profit - opex
        ebit        = ebitda - da
        tax         = int(max(ebit, 0) * tax_rate)
        net_income  = ebit - tax

        # ── Cash Flow ─────────────────────────────────────────────────────────
        net_wc       = int(revenue * wc_pct)
        delta_wc     = net_wc - prev_wc            # positive = more WC tied up → cash outflow
        cfo          = net_income + da - delta_wc
        cfi          = -capex
        cff          = 0
        net_change   = cfo + cfi + cff
        beginning_cash = ending_cash
        ending_cash    = beginning_cash + net_change

        projected_periods.append({
            "period":           str(period_label),
            "is_forecast":      True,

            # IS
            "revenue_cents":       revenue,
            "cogs_cents":          cogs,
            "gross_profit_cents":  gross_profit,
            "opex_cents":          opex,
            "ebitda_cents":        ebitda,
            "ebit_cents":          ebit,
            "tax_cents":           tax,
            "net_income_cents":    net_income,

            # CF
            "net_income_cf_cents":        net_income,
            "da_cents":                   da,
            "delta_wc_cents":             -delta_wc,   # flip sign: WC increase = CF outflow
            "net_cash_from_operations_cents": cfo,
            "capex_cents":                -capex,
            "net_cash_from_investing_cents":  cfi,
            "net_cash_from_financing_cents":  cff,
            "net_change_in_cash_cents":       net_change,
            "beginning_cash_cents":           beginning_cash,
            "ending_cash_cents":              ending_cash,

            # BS (simplified: only tracking cash + retained earnings growth)
            "cash_cents":              ending_cash,
            "net_wc_cents":            net_wc,
            "retained_earnings_delta_cents": net_income,
        })

        prev_revenue = revenue
        prev_opex    = opex
        prev_wc      = net_wc

    return {
        "base_period": str(config.base_period),
        "actuals": {
            "revenue_cents":  actuals["revenue"],
            "expenses_cents": actuals["expenses"],
            "net_income_cents": (actuals["revenue"] + actuals["expenses"] * -1),
            "cash_cents":     actuals["cash"],
            "net_wc_cents":   actuals["net_wc"],
        },
        "projections": projected_periods,
        "config": {
            "revenue_growth_pct":   config.revenue_growth_pct,
            "cogs_pct_of_revenue":  config.cogs_pct_of_revenue,
            "opex_growth_pct":      config.opex_growth_pct,
            "tax_rate_pct":         config.tax_rate_pct,
            "capex_cents":          config.capex_cents,
            "da_cents":             config.da_cents,
            "wc_pct_of_revenue":    config.wc_pct_of_revenue,
        }
    }
