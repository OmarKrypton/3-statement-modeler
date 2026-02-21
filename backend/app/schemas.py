from pydantic import BaseModel, Field, EmailStr
from typing import Optional, List
from datetime import date
from .models import AccountCategory, CashFlowCategory, NormalBalance

# --- Shared ---
class ORMBase(BaseModel):
    model_config = {"from_attributes": True}

# --- Companies ---
class CompanyBase(BaseModel):
    name: str
    fiscal_year_end: int = Field(..., ge=1, le=12)
    currency: str = "USD"

class CompanyCreate(CompanyBase):
    pass

class CompanyUpdate(BaseModel):
    name: Optional[str] = None
    fiscal_year_end: Optional[int] = Field(None, ge=1, le=12)
    currency: Optional[str] = None

class CompanyResponse(CompanyBase, ORMBase):
    id: str

# --- Master Chart of Accounts ---
class MasterAccountResponse(ORMBase):
    id: str
    account_code: str
    name: str
    category: AccountCategory
    sub_category: str
    cash_flow_category: CashFlowCategory
    normal_balance: NormalBalance

# --- Company Accounts ---
class CompanyAccountBase(BaseModel):
    import_account_number: str
    import_account_name: str
    is_active: bool = True

class CompanyAccountResponse(CompanyAccountBase, ORMBase):
    id: str
    company_id: str

# --- Account Mappings ---
class AccountMappingUpdate(BaseModel):
    company_account_id: str
    master_account_id: str

class AccountMappingResponse(ORMBase):
    id: str
    company_account_id: str
    master_account_id: str

# --- Trial Balances ---
class TrialBalanceUploadRow(BaseModel):
    account_number: str
    account_name: str
    balance: int # In cents!

class TrialBalanceUpload(BaseModel):
    period_date: date
    entries: List[TrialBalanceUploadRow]
