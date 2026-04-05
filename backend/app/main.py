import os
import sys
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from . import models
from .database import engine, SessionLocal
from .routers import companies, master_coa, trial_balances, mappings, statements, periods, forecast, export, dashboard

models.Base.metadata.create_all(bind=engine)

# Standardize: Always ensure at least one company exists on startup
def init_db():
    db = SessionLocal()
    try:
        from .models import AccountCategory, CashFlowCategory, NormalBalance
        # Full master CoA from seed.py
        standard_accounts = [
            {"account_code": "1000", "name": "Cash and Cash Equivalents", "category": AccountCategory.ASSET, "sub_category": "Current Assets", "cash_flow_category": CashFlowCategory.NON_CASH, "normal_balance": NormalBalance.DEBIT},
            {"account_code": "1100", "name": "Accounts Receivable", "category": AccountCategory.ASSET, "sub_category": "Current Assets", "cash_flow_category": CashFlowCategory.OPERATING, "normal_balance": NormalBalance.DEBIT},
            {"account_code": "1200", "name": "Inventory", "category": AccountCategory.ASSET, "sub_category": "Current Assets", "cash_flow_category": CashFlowCategory.OPERATING, "normal_balance": NormalBalance.DEBIT},
            {"account_code": "1500", "name": "Property, Plant & Equipment", "category": AccountCategory.ASSET, "sub_category": "Non-Current Assets", "cash_flow_category": CashFlowCategory.INVESTING, "normal_balance": NormalBalance.DEBIT},
            {"account_code": "1600", "name": "Accumulated Depreciation", "category": AccountCategory.ASSET, "sub_category": "Non-Current Assets", "cash_flow_category": CashFlowCategory.NON_CASH, "normal_balance": NormalBalance.CREDIT},
            {"account_code": "2000", "name": "Accounts Payable", "category": AccountCategory.LIABILITY, "sub_category": "Current Liabilities", "cash_flow_category": CashFlowCategory.OPERATING, "normal_balance": NormalBalance.CREDIT},
            {"account_code": "2500", "name": "Long-Term Debt", "category": AccountCategory.LIABILITY, "sub_category": "Non-Current Liabilities", "cash_flow_category": CashFlowCategory.FINANCING, "normal_balance": NormalBalance.CREDIT},
            {"account_code": "3000", "name": "Common Stock", "category": AccountCategory.EQUITY, "sub_category": "Equity", "cash_flow_category": CashFlowCategory.FINANCING, "normal_balance": NormalBalance.CREDIT},
            {"account_code": "3500", "name": "Retained Earnings", "category": AccountCategory.EQUITY, "sub_category": "Equity", "cash_flow_category": CashFlowCategory.NON_CASH, "normal_balance": NormalBalance.CREDIT},
            {"account_code": "4000", "name": "Product Revenue", "category": AccountCategory.REVENUE, "sub_category": "Revenue", "cash_flow_category": CashFlowCategory.OPERATING, "normal_balance": NormalBalance.CREDIT},
            {"account_code": "5000", "name": "Cost of Goods Sold", "category": AccountCategory.EXPENSE, "sub_category": "COGS", "cash_flow_category": CashFlowCategory.OPERATING, "normal_balance": NormalBalance.DEBIT},
            {"account_code": "6000", "name": "Salaries Expense", "category": AccountCategory.EXPENSE, "sub_category": "Operating Expenses", "cash_flow_category": CashFlowCategory.OPERATING, "normal_balance": NormalBalance.DEBIT},
            {"account_code": "6500", "name": "Depreciation Expense", "category": AccountCategory.EXPENSE, "sub_category": "Operating Expenses", "cash_flow_category": CashFlowCategory.NON_CASH, "normal_balance": NormalBalance.DEBIT},
        ]

        # Add missing accounts one by one
        for acc_data in standard_accounts:
            exists = db.query(models.MasterChartOfAccount).filter_by(account_code=acc_data["account_code"]).first()
            if not exists:
                db.add(models.MasterChartOfAccount(**acc_data))
        
        db.commit()

        # 2. Seed default company if none exists
        if db.query(models.Company).count() == 0:
            db.add(models.Company(name="Acme Corp", fiscal_year_end=12, currency="USD"))
            db.commit()
    finally:
        db.close()

init_db()

app = FastAPI(
    title="Automated 3-Statement Modeler",
    description="API for managing core financials, mapping trial balances, and generating statements",
    version="0.1.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",  # Next.js dev server
        "http://localhost:8000",  # Production (Electron points here)
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(companies.router)
app.include_router(master_coa.router)
app.include_router(trial_balances.router)
app.include_router(mappings.router)
app.include_router(statements.router)
app.include_router(periods.router)
app.include_router(forecast.router)
app.include_router(export.router)
app.include_router(dashboard.router)


@app.get("/health")
def health_check():
    """Health check endpoint used by Electron to know when the backend is ready."""
    return {"status": "ok"}


@app.get("/api-info")
def read_root():
    return {"status": "ok", "message": "3-Statement Modeler API is running."}


# Serve the Next.js static build when running as a packaged binary.
# In development, the Next.js dev server runs on its own (port 3000).
def _get_static_dir() -> Path | None:
    if getattr(sys, "frozen", False):
        # PyInstaller bundles resources into sys._MEIPASS
        return Path(sys._MEIPASS) / "static"  # type: ignore[attr-defined]
    # Optional: serve static build in non-bundled mode if out/ exists alongside
    local_static = Path(__file__).parent.parent / "static"
    if local_static.exists():
        return local_static
    return None


_static_dir = _get_static_dir()
if _static_dir and _static_dir.exists():
    # Serve all static assets under their normal paths
    app.mount("/", StaticFiles(directory=str(_static_dir), html=True), name="static")

