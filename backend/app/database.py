import os
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base
from sqlalchemy.orm import sessionmaker

# We'll use a local SQLite database for testing.
# Format: sqlite:///./threestatement.db
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./threestatement.db")

# SQLite requires this argument for multithreading in FastAPI
engine = create_engine(
    DATABASE_URL, connect_args={"check_same_thread": False}
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
