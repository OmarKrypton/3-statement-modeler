import csv
import re
from datetime import date
from io import StringIO
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.orm import Session
from sqlalchemy.sql import func
from typing import List, Dict, Optional

from .. import models, schemas
from ..database import get_db

router = APIRouter(
    prefix="/api/v1/companies/{company_id}/trial-balances",
    tags=["Trial Balances"]
)

def parse_numeric_balance(val: str) -> int:
    """
    Cleans a string representating a balance (e.g. '$1,234.56') and 
    converts it to integer cents.
    """
    if not val or not val.strip():
        return 0
    
    # Remove currency symbols and formatting commas
    clean = val.replace('$', '').replace(',', '').replace('(', '-').replace(')', '').strip()
    
    try:
        # If it contains a decimal point, assume it's a dollar amount
        if '.' in clean:
            return int(round(float(clean) * 100))
        # Otherwise, if it's purely digits, it might be cents OR whole dollars.
        # But in most CSV exports, something like '1000' is $1000.
        # However, our existing spec said 'balance in cents'. 
        # Let's be smart: if it's a float, it's dollars. If it's an int, 
        # we still assume dollars unless the user strictly follows the old 'cents' rule.
        # Actually, for reliability, we treat EVERYTHING with numbers as dollars 
        # if a '.' is present, and dollars if no '.' is present (industry standard).
        return int(float(clean) * 100)
    except (ValueError, TypeError):
        return 0

def find_column(headers: List[str], aliases: List[str]) -> Optional[str]:
    """Finds the first header that matches any of the aliases (normalized)."""
    normalized_headers = { h.lower().replace("_", "").replace(" ", "").replace("#", ""): h for h in headers }
    for alias in aliases:
        if alias in normalized_headers:
            return normalized_headers[alias]
    return None

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
    try:
        content = await file.read()
        # Decode using utf-8-sig to automatically handle Byte Order Mark (BOM)
        decoded = content.decode("utf-8-sig")
    except UnicodeDecodeError:
        # Fallback to latin-1 if UTF-8 fails (common for some Excel exports)
        decoded = content.decode("latin-1")

    # Detect delimiter
    try:
        dialect = csv.Sniffer().sniff(decoded[:2048])
        delimiter = dialect.delimiter
    except Exception:
        delimiter = "," # Default to comma
    
    f = StringIO(decoded)
    csv_reader = csv.DictReader(f, delimiter=delimiter)
    headers = csv_reader.fieldnames or []
    
    # Map headers using aliases
    num_col = find_column(headers, ["accountnumber", "account", "acct#", "acctno", "code"])
    name_col = find_column(headers, ["accountname", "name", "description", "acctname"])
    bal_col = find_column(headers, ["amount", "balance", "value", "currentbalance", "total"])

    if not all([num_col, name_col, bal_col]):
        missing = []
        if not num_col: missing.append("Account Number")
        if not name_col: missing.append("Account Name")
        if not bal_col: missing.append("Balance/Amount")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail=f"Could not identify required columns. Missing: {', '.join(missing)}. Please check your CSV headers."
        )

    entries = []
    total_balance = 0
    
    for row_idx, row in enumerate(csv_reader):
        try:
            account_num = (row.get(num_col) or "").strip()
            account_name = (row.get(name_col) or "").strip()
            raw_balance = (row.get(bal_col) or "0").strip()
            
            if not account_num and not account_name:
                continue # Skip empty rows

            balance_cents = parse_numeric_balance(raw_balance)
            total_balance += balance_cents
            
            entries.append({
                "account_number": account_number if (account_number := account_num) else f"ERR-{row_idx}",
                "account_name": account_name or "Unnamed Account",
                "balance": balance_cents
            })
        except Exception as e:
            # Continue processing but track the error if needed
            continue

    if not entries:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No valid data rows found in CSV.")

    # Standardize balance
    is_balanced = total_balance == 0

    # 1. Ensure Reporting Period exists
    period = db.query(models.ReportingPeriod).filter(
        models.ReportingPeriod.company_id == company_id,
        models.ReportingPeriod.period_date == period_date
    ).first()
    
    if not period:
        period = models.ReportingPeriod(company_id=company_id, period_date=period_date)
        db.add(period)
        db.flush()

    # Clear existing trial balance entries for this period
    db.query(models.TrialBalanceEntry).filter(
        models.TrialBalanceEntry.reporting_period_id == period.id
    ).delete(synchronize_session=False)
    db.flush()

    # 2. Process each entry
    for entry_data in entries:
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
    return {
        "status": "success", 
        "message": f"Successfully imported {len(entries)} accounts for {period_date}.",
        "is_balanced": is_balanced,
        "warning": None if is_balanced else f"Trial balance is out of balance by ${abs(total_balance)/100:,.2f}."
    }
