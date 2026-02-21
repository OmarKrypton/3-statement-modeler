<p align="center">
  <img src="logo_3s.png" alt="3-Statement Modeler Logo" width="200" style="border-radius:20px;"/>
</p>

---

<h1 align="center">Automated 3-Statement Modeler</h1>

A full-stack web application that automates the generation of financial statements from raw Trial Balance extracts.

The **3-Statement Modeler** ingests accounting data, standardizes it through a visual Mapping Engine to a GAAP-compliant Master Chart of Accounts, and automatically derives a perfectly balanced **Income Statement**, **Balance Sheet**, and **Statement of Cash Flows (Indirect Method)** — across **multiple reporting periods** for comparative analysis.

## 🚀 Features

- **Multi-Period Trial Balance Ingestion**
  - Upload standard `.csv` extracts (columns: `account_number`, `account_name`, `balance` in cents)
  - Imports are accepted even when debits ≠ credits — an amber warning is surfaced in the UI, and the imbalance is reflected in the Balance Sheet automatically
  - View all imported periods in a live list; remove any specific period with a two-step confirmation (cascades to all associated entries and orphaned account records)

- **Account Mapping Engine**
  - Interactive side-by-side UI to map raw company accounts to the standardized Master Chart of Accounts
  - Each account card shows its **total balance inline** (green for debit, red for credit) with a hover tooltip showing the DEBIT/CREDIT classification
  - Mapping panel auto-refreshes immediately after any Trial Balance upload or deletion — no manual page refresh needed

- **Comparative Multi-Period Financial Statements**
  - Toggle any combination of imported periods to view side-by-side comparative columns
  - **Income Statement**: Aggregates revenues and expenses per period to calculate Net Income
  - **Balance Sheet**: Inception-to-date snapshot per period; includes an "Out of Balance" alert if unmapped accounts exist
  - **Statement of Cash Flows**: Indirect method — Operating, Investing, and Financing sections with beginning/ending cash reconciliation

- **Company Settings**: Manage company context, fiscal year end, and inspect the global Master Chart of Accounts structure

## 🛠️ Tech Stack

| Layer | Technologies |
|---|---|
| **Frontend** | Next.js 16, React, TypeScript, Tailwind CSS, `@tanstack/react-query`, `lucide-react` |
| **Backend** | FastAPI, Python 3.12, SQLAlchemy, Pydantic |
| **Database** | SQLite (`threestatement.db`) |

## 🚦 Getting Started

### Prerequisites

- Node.js v18+
- Python 3.12+

### 1. Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# Starts on http://localhost:8000
uvicorn app.main:app --reload
```

> The SQLite database (`threestatement.db`) is auto-created on first run. A `seed.py` script is available to bootstrap sample data.

### 2. Frontend

```bash
cd frontend
npm install

# Starts on http://localhost:3000
npm run dev
```

## 📈 Workflow

1. **Upload** — Go to **Trial Balance** tab. Import one or more `.csv` extracts, each tagged with a period-ending date.
2. **Map** — Go to **Mapping Engine**. Link your raw accounts to the standardized Master CoA categories.
3. **Analyze** — Go to **Statements** tab. Toggle one or more periods to generate comparative Income Statement, Balance Sheet, and Cash Flow side by side.

## 📄 CSV Format

```csv
account_number,account_name,balance
1000,Cash,5000000
1100,Accounts Receivable,2000000
2000,Accounts Payable,-1500000
4000,Sales Revenue,-5000000
5000,Cost of Goods Sold,2000000
```

- `balance` is in **cents** (integer)
- Debits are **positive**, credits are **negative**
- The file should sum to `0` (balanced), but the system accepts and imports unbalanced files with a warning

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
