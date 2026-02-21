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
