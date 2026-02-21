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
    """Delete a specific reporting period and all its trial balance entries."""
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
    db.commit()

    return {"status": "success", "message": f"Period {period_date} and all associated entries deleted."}
