from fastapi import FastAPI
from . import models
from .database import engine
from .routers import companies, master_coa, trial_balances, mappings, statements

# Create the database tables
models.Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Automated 3-Statement Modeler",
    description="API for managing core financials, mapping trial balances, and generating statements",
    version="0.1.0"
)

from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(companies.router)
app.include_router(master_coa.router)
app.include_router(trial_balances.router)
app.include_router(mappings.router)
app.include_router(statements.router)

@app.get("/")
def read_root():
    return {"status": "ok", "message": "3-Statement Modeler API is running."}
