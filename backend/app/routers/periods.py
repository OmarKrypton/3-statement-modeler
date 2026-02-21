from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from datetime import date

from .. import models, schemas
from ..database import get_db

router = APIRouter(
    prefix="/api/v1/companies/{company_id}/periods",
    tags=["Reporting Periods"]
)

@router.get("", response_model=List[date])
def get_periods(company_id: str, db: Session = Depends(get_db)):
    """Fetch all distinct reporting period dates available for a company."""
    periods = db.query(models.ReportingPeriod.period_date).filter(
        models.ReportingPeriod.company_id == company_id
    ).distinct().order_by(models.ReportingPeriod.period_date.desc()).all()
    
    return [p[0] for p in periods]

@router.delete("/{period_date}")
def delete_period(company_id: str, period_date: date, db: Session = Depends(get_db)):
    """Delete a specific reporting period, its trial balance entries, and any now-orphaned company accounts."""
    period = db.query(models.ReportingPeriod).filter(
        models.ReportingPeriod.company_id == company_id,
        models.ReportingPeriod.period_date == period_date
    ).first()

    if not period:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Reporting period not found.")

    # Cascade delete all trial balance entries for this period
    db.query(models.TrialBalanceEntry).filter(
        models.TrialBalanceEntry.reporting_period_id == period.id
    ).delete(synchronize_session=False)
    db.delete(period)
    db.flush()  # Apply changes before querying for orphans

    # Find CompanyAccounts that now have no TrialBalanceEntries in any period
    from sqlalchemy.sql import func
    orphaned = (
        db.query(models.CompanyAccount)
        .outerjoin(
            models.TrialBalanceEntry,
            models.CompanyAccount.id == models.TrialBalanceEntry.company_account_id
        )
        .filter(
            models.CompanyAccount.company_id == company_id,
            models.TrialBalanceEntry.id == None
        )
        .all()
    )

    orphan_ids = [a.id for a in orphaned]
    if orphan_ids:
        # Delete their mappings first (FK constraint)
        db.query(models.AccountMapping).filter(
            models.AccountMapping.company_account_id.in_(orphan_ids)
        ).delete(synchronize_session=False)
        db.query(models.CompanyAccount).filter(
            models.CompanyAccount.id.in_(orphan_ids)
        ).delete(synchronize_session=False)

    db.commit()
    return {"status": "success", "message": f"Period {period_date} and all associated entries deleted.", "orphaned_accounts_removed": len(orphan_ids)}
