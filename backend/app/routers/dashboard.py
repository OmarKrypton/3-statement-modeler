from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from datetime import date
from typing import List, Dict, Any

from ..database import get_db
from .statements import get_income_statement, get_cash_flow
from .forecast import get_forecast_statements
from .periods import get_periods

router = APIRouter(
    prefix="/api/v1/companies/{company_id}/dashboard",
    tags=["Dashboard"]
)

@router.get("/summary")
def get_dashboard_summary(company_id: str, db: Session = Depends(get_db)):
    # 1. Get historical periods
    historical_dates = get_periods(company_id, db)
    historical_dates.sort()

    # 2. Fetch Statements
    is_actuals = get_income_statement(company_id, historical_dates, db)
    cf_actuals = get_cash_flow(company_id, historical_dates, db)

    # 3. Fetch Forecast (Base)
    projections = []
    try:
        forecast_data = get_forecast_statements(company_id, "base", db)
        projections = forecast_data.get("projections", [])
    except:
        pass

    results = []

    # Map Actuals
    for is_entry in is_actuals:
        p_str = is_entry["period"]
        revenue = is_entry.get("total_revenues_cents", 0)
        expenses = is_entry.get("total_expenses_cents", 0)
        net_income = is_entry.get("net_income_cents", 0)
        
        # EBITDA for actuals: Rev - Expenses (Approximate for MVP)
        ebitda = revenue - expenses
        
        cf_entry = next((c for c in cf_actuals if c["period"] == p_str), {})
        ending_cash = cf_entry.get("ending_cash_cents", 0)

        results.append({
            "period": p_str,
            "revenue": revenue,
            "ebitda": ebitda,
            "net_income": net_income,
            "cash": ending_cash,
            "type": "actual"
        })

    # Map Forecasts
    for p in projections:
        results.append({
            "period": p["period"],
            "revenue": p["revenue_cents"],
            "ebitda": p["ebitda_cents"],
            "net_income": p["net_income_cents"],
            "cash": p["ending_cash_cents"],
            "type": "forecast"
        })

    return results
