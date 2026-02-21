from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from .. import models, schemas
from ..database import get_db

router = APIRouter(
    prefix="/api/v1/master-coa",
    tags=["Master Chart of Accounts"]
)

@router.get("/", response_model=List[schemas.MasterAccountResponse])
def get_master_coa(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    accounts = db.query(models.MasterChartOfAccount).offset(skip).limit(limit).all()
    return accounts
