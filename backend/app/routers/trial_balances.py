import csv
from datetime import date
from io import StringIO
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.orm import Session
from sqlalchemy.sql import func
from typing import List

from .. import models, schemas
from ..database import get_db

router = APIRouter(
    prefix="/api/v1/companies/{company_id}/trial-balances",
    tags=["Trial Balances"]
)

@router.post("/upload", status_code=status.HTTP_201_CREATED)
async def upload_trial_balance(
    company_id: str,
    period_date: date,
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    # Verify company exists
    company = db.query(models.Company).filter(models.Company.id == company_id).first()
    if not company:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Company not found")

    # Read and parse CSV
    content = await file.read()
    decoded = content.decode("utf-8")
    csv_reader = csv.DictReader(StringIO(decoded))
    
    entries = []
    total_balance = 0
    
    # Expected CSV format: account_number, account_name, balance (in cents)
    for row in csv_reader:
        try:
            account_num = row['account_number']
            account_name = row['account_name']
            balance = int(row['balance'])
            total_balance += balance
            
            entries.append({
                "account_number": account_num,
                "account_name": account_name,
                "balance": balance
            })
        except (KeyError, ValueError) as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, 
                detail=f"Invalid CSV format: {str(e)}"
            )

    # Hard-coded rule: Trial balance sum must equal 0 (Debits + Credits = 0)
    if total_balance != 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Trial balance is out of balance by {total_balance} cents."
        )

    # 1. Ensure Reporting Period exists
    period = db.query(models.ReportingPeriod).filter(
        models.ReportingPeriod.company_id == company_id,
        models.ReportingPeriod.period_date == period_date
    ).first()
    
    if not period:
        period = models.ReportingPeriod(company_id=company_id, period_date=period_date)
        db.add(period)
        db.flush()

    # Clear existing trial balance entries for this period to prevent compounding imbalances
    db.query(models.TrialBalanceEntry).filter(
        models.TrialBalanceEntry.reporting_period_id == period.id
    ).delete(synchronize_session=False)
    db.flush()

    # 2. Process each entry: Create/Get CompanyAccount, Insert TrialBalanceEntry
    for entry_data in entries:
        # Check if company account exists
        company_account = db.query(models.CompanyAccount).filter(
            models.CompanyAccount.company_id == company_id,
            models.CompanyAccount.import_account_number == entry_data["account_number"]
        ).first()
        
        if not company_account:
            company_account = models.CompanyAccount(
                company_id=company_id,
                import_account_number=entry_data["account_number"],
                import_account_name=entry_data["account_name"]
            )
            db.add(company_account)
            db.flush()
            
        tb_entry = models.TrialBalanceEntry(
            reporting_period_id=period.id,
            company_account_id=company_account.id,
            balance=entry_data["balance"]
        )
        db.add(tb_entry)

    db.commit()
    return {"status": "success", "message": f"Imported {len(entries)} trial balance accounts for period {period_date}"}
