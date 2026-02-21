from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import or_
from sqlalchemy.sql import func
from typing import List

from .. import models, schemas
from ..database import get_db

router = APIRouter(
    prefix="/api/v1/companies/{company_id}/mappings",
    tags=["Account Mappings"]
)

@router.get("/unmapped", response_model=List[schemas.CompanyAccountWithBalance])
def get_unmapped_accounts(company_id: str, skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    """Fetch all active company accounts that do NOT have an entry in account_mappings, with their total balance."""
    rows = db.query(
        models.CompanyAccount,
        func.coalesce(func.sum(models.TrialBalanceEntry.balance), 0).label("total_balance")
    ).outerjoin(
        models.AccountMapping, 
        models.CompanyAccount.id == models.AccountMapping.company_account_id
    ).outerjoin(
        models.TrialBalanceEntry,
        models.CompanyAccount.id == models.TrialBalanceEntry.company_account_id
    ).filter(
        models.CompanyAccount.company_id == company_id,
        models.CompanyAccount.is_active == True,
        models.AccountMapping.id == None
    ).group_by(models.CompanyAccount.id).offset(skip).limit(limit).all()

    return [
        schemas.CompanyAccountWithBalance(
            id=acc.id,
            company_id=acc.company_id,
            import_account_number=acc.import_account_number,
            import_account_name=acc.import_account_name,
            is_active=acc.is_active,
            total_balance=total_balance
        )
        for acc, total_balance in rows
    ]

@router.put("/", status_code=status.HTTP_200_OK)
def batch_update_mappings(
    company_id: str,
    mappings: List[schemas.AccountMappingUpdate],
    db: Session = Depends(get_db)
):
    """Batch updates mappings between Company Accounts and Master CoA."""
    
    # We should normally enforce user_id, omitting here for simplicity
    mapped_count = 0
    for map_req in mappings:
        # Check if the mapping already exists
        existing_mapping = db.query(models.AccountMapping).filter(
            models.AccountMapping.company_account_id == map_req.company_account_id
        ).first()

        if existing_mapping:
            existing_mapping.master_account_id = map_req.master_account_id
        else:
            new_mapping = models.AccountMapping(
                company_account_id=map_req.company_account_id,
                master_account_id=map_req.master_account_id
            )
            db.add(new_mapping)
        mapped_count += 1

    db.commit()
    return {"status": "success", "mapped_count": mapped_count}

@router.delete("/reset", status_code=status.HTTP_200_OK)
def delete_mappings(company_id: str, db: Session = Depends(get_db)):
    """Clear all account mappings for a specific company."""
    # Find all company account IDs for this company
    company_account_ids = db.query(models.CompanyAccount.id).filter(
        models.CompanyAccount.company_id == company_id
    ).all()
    
    # Flatten the list of tuples
    ids = [id_tuple[0] for id_tuple in company_account_ids]
    
    if not ids:
        return {"status": "success", "deleted_count": 0}

    # Delete mappings for those accounts
    deleted_count = db.query(models.AccountMapping).filter(
        models.AccountMapping.company_account_id.in_(ids)
    ).delete(synchronize_session=False)

    db.commit()
    return {"status": "success", "deleted_count": deleted_count}
