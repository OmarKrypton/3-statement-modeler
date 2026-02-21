from sqlalchemy.orm import Session
from datetime import date
from app import models
from app.database import engine, get_db, SessionLocal
from app.models import AccountCategory, CashFlowCategory, NormalBalance

def seed_master_coa(db: Session):
    accounts = [
        # Assets
        {"account_code": "1000", "name": "Cash and Cash Equivalents", "category": AccountCategory.ASSET, "sub_category": "Current Assets", "cash_flow_category": CashFlowCategory.NON_CASH, "normal_balance": NormalBalance.DEBIT},
        {"account_code": "1100", "name": "Accounts Receivable", "category": AccountCategory.ASSET, "sub_category": "Current Assets", "cash_flow_category": CashFlowCategory.OPERATING, "normal_balance": NormalBalance.DEBIT},
        {"account_code": "1500", "name": "Property, Plant & Equipment", "category": AccountCategory.ASSET, "sub_category": "Non-Current Assets", "cash_flow_category": CashFlowCategory.INVESTING, "normal_balance": NormalBalance.DEBIT},
        {"account_code": "1600", "name": "Accumulated Depreciation", "category": AccountCategory.ASSET, "sub_category": "Non-Current Assets", "cash_flow_category": CashFlowCategory.NON_CASH, "normal_balance": NormalBalance.CREDIT},
        
        # Liabilities
        {"account_code": "2000", "name": "Accounts Payable", "category": AccountCategory.LIABILITY, "sub_category": "Current Liabilities", "cash_flow_category": CashFlowCategory.OPERATING, "normal_balance": NormalBalance.CREDIT},
        {"account_code": "2500", "name": "Long-Term Debt", "category": AccountCategory.LIABILITY, "sub_category": "Non-Current Liabilities", "cash_flow_category": CashFlowCategory.FINANCING, "normal_balance": NormalBalance.CREDIT},
        
        # Equity
        {"account_code": "3000", "name": "Common Stock", "category": AccountCategory.EQUITY, "sub_category": "Equity", "cash_flow_category": CashFlowCategory.FINANCING, "normal_balance": NormalBalance.CREDIT},
        {"account_code": "3500", "name": "Retained Earnings", "category": AccountCategory.EQUITY, "sub_category": "Equity", "cash_flow_category": CashFlowCategory.NON_CASH, "normal_balance": NormalBalance.CREDIT},
        
        # Revenue
        {"account_code": "4000", "name": "Product Revenue", "category": AccountCategory.REVENUE, "sub_category": "Revenue", "cash_flow_category": CashFlowCategory.OPERATING, "normal_balance": NormalBalance.CREDIT},
        
        # Expenses
        {"account_code": "5000", "name": "Cost of Goods Sold", "category": AccountCategory.EXPENSE, "sub_category": "COGS", "cash_flow_category": CashFlowCategory.OPERATING, "normal_balance": NormalBalance.DEBIT},
        {"account_code": "6000", "name": "Salaries Expense", "category": AccountCategory.EXPENSE, "sub_category": "Operating Expenses", "cash_flow_category": CashFlowCategory.OPERATING, "normal_balance": NormalBalance.DEBIT},
        {"account_code": "6500", "name": "Depreciation Expense", "category": AccountCategory.EXPENSE, "sub_category": "Operating Expenses", "cash_flow_category": CashFlowCategory.NON_CASH, "normal_balance": NormalBalance.DEBIT},
    ]

    for acc_data in accounts:
        existing = db.query(models.MasterChartOfAccount).filter_by(account_code=acc_data["account_code"]).first()
        if not existing:
            db_acc = models.MasterChartOfAccount(**acc_data)
            db.add(db_acc)
    
    db.commit()
    print("Seeded Master Chart of Accounts.")

def create_sample_company_and_mappings(db: Session):
    # 1. Create a Company
    company = db.query(models.Company).filter_by(name="Acme Corp").first()
    if not company:
        company = models.Company(name="Acme Corp", fiscal_year_end=12, currency="USD")
        db.add(company)
        db.commit()
        db.refresh(company)
        print("Created Acme Corp.")
    
    # 2. Get master accounts to map to
    rev_master = db.query(models.MasterChartOfAccount).filter_by(account_code="4000").first()
    exp_master = db.query(models.MasterChartOfAccount).filter_by(account_code="6000").first()
    
    # 3. Create raw trial balance accounts and map them
    raw_sales = models.CompanyAccount(company_id=company.id, import_account_number="INC-100", import_account_name="Sales - Primary")
    raw_payroll = models.CompanyAccount(company_id=company.id, import_account_number="EXP-200", import_account_name="Payroll")
    
    db.add_all([raw_sales, raw_payroll])
    db.flush()
    
    db.add(models.AccountMapping(company_account_id=raw_sales.id, master_account_id=rev_master.id))
    db.add(models.AccountMapping(company_account_id=raw_payroll.id, master_account_id=exp_master.id))
    
    db.commit()
    print("Created raw company accounts and mappings.")
    
    # 4. Generate a Trial Balance entry for Jan 2024
    period = models.ReportingPeriod(company_id=company.id, period_date=date(2024, 1, 31))
    db.add(period)
    db.flush()
    
    # Remember the rule: Debits are positive, Credits are negative
    # Sales: $10,000 credit (-1,000,000 cents)
    # Payroll: $4,000 debit (400,000 cents)
    # The remaining $6,000 would usually go to Cash or A/R to balance to 0, but for this simple IS test we'll just insert these.
    # We will adjust the IS endpoint query temporarily if we don't have a perfectly balanced TB.
    
    tb1 = models.TrialBalanceEntry(reporting_period_id=period.id, company_account_id=raw_sales.id, balance=-1000000)
    tb2 = models.TrialBalanceEntry(reporting_period_id=period.id, company_account_id=raw_payroll.id, balance=400000)
    
    db.add_all([tb1, tb2])
    db.commit()
    print("Seeded Trial Balance for Jan 2024.")

if __name__ == "__main__":
    from app.models import Base
    from app.database import engine
    
    # Ensure tables are created
    Base.metadata.create_all(bind=engine)
    
    db = SessionLocal()
    seed_master_coa(db)
    create_sample_company_and_mappings(db)
    db.close()
