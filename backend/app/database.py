import os
import sys
from pathlib import Path
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base
from sqlalchemy.orm import sessionmaker


def get_db_path() -> str:
    """
    Returns the path to the SQLite database file.

    - In development (plain Python): uses ./threestatement.db (relative to CWD).
    - When bundled with PyInstaller: stores the DB in the user's app-data directory
      so it is writable and persists across app updates.
        Linux:   ~/.local/share/3-statement-modeler/threestatement.db
        Windows: %APPDATA%/3-statement-modeler/threestatement.db
    """
    if getattr(sys, "frozen", False):
        # Running inside a PyInstaller bundle — use a writable user data dir
        if sys.platform == "win32":
            data_dir = Path(os.environ.get("APPDATA", Path.home())) / "3-statement-modeler"
        else:
            data_dir = Path.home() / ".local" / "share" / "3-statement-modeler"
        data_dir.mkdir(parents=True, exist_ok=True)
        return f"sqlite:///{data_dir / 'threestatement.db'}"

    # Development: use the environment variable or fall back to local file
    return os.getenv("DATABASE_URL", "sqlite:///./threestatement.db")


DATABASE_URL = get_db_path()

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
