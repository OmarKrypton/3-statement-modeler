from app.database import SessionLocal
from app.routers.statements import get_income_statement
from datetime import date

db = SessionLocal()

try:
    # 1. Fetch Acme Corp to get the ID
    from app.models import Company
    company = db.query(Company).filter_by(name="Acme Corp").first()
    
    if not company:
        print("Company not found. Did you run the seed script?")
        exit(1)
        
    print(f"Testing Income Statement for {company.name}...")
    
    # 2. Call the logical endpoint function directly
    # We seeded a period at 2024-01-31
    result = get_income_statement(
        company_id=company.id,
        period_start=date(2024, 1, 1),
        period_end=date(2024, 12, 31),
        db=db
    )
    
    # 3. Print the results beautifully
    print("\n--- INCOME STATEMENT (Jan - Dec 2024) ---")
    
    rev = result['total_revenues_cents'] / 100
    exp = result['total_expenses_cents'] / 100
    ni = result['net_income_cents'] / 100
    
    print(f"Total Revenues: ${rev:,.2f}")
    print(f"Total Expenses: ${exp:,.2f}")
    print("-" * 40)
    print(f"Net Income:     ${ni:,.2f}")
    print("-----------------------------------------")

finally:
    db.close()
