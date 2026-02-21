import uuid
from sqlalchemy import Column, String, Integer, BigInteger, Boolean, ForeignKey, Date, DateTime, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from .database import Base

def generate_uuid():
    return str(uuid.uuid4())

# --- ENUMS ---

class AccountCategory(str, enum.Enum):
    ASSET = "ASSET"
    LIABILITY = "LIABILITY"
    EQUITY = "EQUITY"
    REVENUE = "REVENUE"
    EXPENSE = "EXPENSE"

class CashFlowCategory(str, enum.Enum):
    OPERATING = "OPERATING"
    INVESTING = "INVESTING"
    FINANCING = "FINANCING"
    NON_CASH = "NON_CASH"

class NormalBalance(str, enum.Enum):
    DEBIT = "DEBIT"
    CREDIT = "CREDIT"

# --- MODELS ---

class Company(Base):
    __tablename__ = "companies"

    id = Column(String, primary_key=True, default=generate_uuid)
    name = Column(String, nullable=False)
    fiscal_year_end = Column(Integer, nullable=False) # e.g., 12 for December
    currency = Column(String, nullable=False, default="USD")

    users = relationship("User", back_populates="company")
    company_accounts = relationship("CompanyAccount", back_populates="company")
    reporting_periods = relationship("ReportingPeriod", back_populates="company")


class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=generate_uuid)
    company_id = Column(String, ForeignKey("companies.id"), nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    role = Column(String, nullable=False, default="ANALYST")

    company = relationship("Company", back_populates="users")


class MasterChartOfAccount(Base):
    __tablename__ = "master_chart_of_accounts"

    id = Column(String, primary_key=True, default=generate_uuid)
    account_code = Column(String, unique=True, index=True, nullable=False)
    name = Column(String, nullable=False)
    category = Column(Enum(AccountCategory), nullable=False)
    sub_category = Column(String, nullable=False)
    cash_flow_category = Column(Enum(CashFlowCategory), nullable=False)
    normal_balance = Column(Enum(NormalBalance), nullable=False)

    mappings = relationship("AccountMapping", back_populates="master_account")


class CompanyAccount(Base):
    __tablename__ = "company_accounts"

    id = Column(String, primary_key=True, default=generate_uuid)
    company_id = Column(String, ForeignKey("companies.id"), nullable=False)
    import_account_number = Column(String, nullable=False)
    import_account_name = Column(String, nullable=False)
    is_active = Column(Boolean, default=True)

    company = relationship("Company", back_populates="company_accounts")
    mapping = relationship("AccountMapping", back_populates="company_account", uselist=False)
    balances = relationship("TrialBalanceEntry", back_populates="company_account")


class AccountMapping(Base):
    __tablename__ = "account_mappings"

    id = Column(String, primary_key=True, default=generate_uuid)
    company_account_id = Column(String, ForeignKey("company_accounts.id"), unique=True, nullable=False)
    master_account_id = Column(String, ForeignKey("master_chart_of_accounts.id"), nullable=False)
    mapped_by_user_id = Column(String, ForeignKey("users.id"), nullable=True)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    company_account = relationship("CompanyAccount", back_populates="mapping")
    master_account = relationship("MasterChartOfAccount", back_populates="mappings")


class ReportingPeriod(Base):
    __tablename__ = "reporting_periods"

    id = Column(String, primary_key=True, default=generate_uuid)
    company_id = Column(String, ForeignKey("companies.id"), nullable=False)
    period_date = Column(Date, nullable=False) # e.g. 2024-01-31

    company = relationship("Company", back_populates="reporting_periods")
    balances = relationship("TrialBalanceEntry", back_populates="reporting_period")


class TrialBalanceEntry(Base):
    __tablename__ = "trial_balance_entries"

    id = Column(String, primary_key=True, default=generate_uuid)
    reporting_period_id = Column(String, ForeignKey("reporting_periods.id"), nullable=False)
    company_account_id = Column(String, ForeignKey("company_accounts.id"), nullable=False)
    # Stored as big integer of smallest currency unit (e.g. cents).
    # Debits positive, Credits negative. Total should sum to 0.
    balance = Column(BigInteger, nullable=False)

    reporting_period = relationship("ReportingPeriod", back_populates="balances")
    company_account = relationship("CompanyAccount", back_populates="balances")
