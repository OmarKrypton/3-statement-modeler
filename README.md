<p align="center">
  <img src="logo_3s.png" alt="3-Statement Modeler Logo" width="200" style="border-radius:20px;"/>
</p>

---

<h1 align="center">Automated 3-Statement Modeler</h1>

A full-stack web application designed to automate the generation of financial statements from raw Trial Balance extracts. 

The **3-Statement Modeler** ingests accounting data, standardizes it through a visual Mapping Engine to a GAAP-compliant Master Chart of Accounts, and automatically derives a perfectly balanced **Income Statement**, **Balance Sheet**, and **Statement of Cash Flows (Indirect Method)**.

## 🚀 Features

*   **Trial Balance Ingestion**: Upload standard `.csv` Trial Balance extracts directly into the system. The backend validates mathematical integrity (Debits = Credits) upon import.
*   **Account Mapping Engine**: An interactive UI for mapping raw company specific accounts to standard Master Chart of Account categories. Track unmapped accounts effortlessly.
*   **Real-time Financial Statements**:
    *   **Income Statement**: Aggregates Operating Revenues and Expenses to calculate accurate Net Income.
    *   **Balance Sheet**: Standardizes Assets, Liabilities, and Equity. Dynamically rolls forward Net Income to perfectly balance the accounting equation. Features an "Out of Balance" detection alert for unmapped accounts.
    *   **Statement of Cash Flows**: Uses the indirect method to derive Operations, Investing, and Financing cash flows. Excludes historical Retained Earnings from current-period financing logic and automatically surfaces true Beginning and Ending Cash bounds.
*   **Company Settings**: Manage application context, fiscal year reporting periods, and view the global Master Chart of Accounts structural topology.

## 🛠️ Tech Stack

*   **Frontend**: Next.js 15, React, Tailwind CSS, TypeScript, `@tanstack/react-query`, `lucide-react`
*   **Backend**: FastAPI, Python 3, SQLAlchemy, Pydantic
*   **Database**: SQLite (`threestatement.db`) with relational mapping across Companies, Accounts, Mapping rules, and Trial Balance entries.

## 🚦 Getting Started

### Prerequisites

*   Node.js (v18+ recommended)
*   Python (3.12+ recommended)

### 1. Backend Setup

Navigate to the `backend` directory, create a virtual environment, and start the FastAPI server:

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# Run the backend server (runs on http://localhost:8000)
uvicorn app.main:app --reload
```

*Note: The SQLite database (`threestatement.db`) will be automatically generated upon your first startup. A seed script (`seed.py`) is also available for bootstrapping the testing environment.*

### 2. Frontend Setup

In a new terminal, navigate to the `frontend` directory and start the Next.js development server:

```bash
cd frontend
npm install

# Run the frontend server (runs on http://localhost:3000)
npm run dev
```

## 📈 Usage Workflow

1.  **Configure**: Add your company details in the Settings tab.
2.  **Upload**: Navigate to the **Trial Balance** tab and import a `.csv` extract (ensure the format aligns with the standard import format: `Account Number`, `Account Name`, `Balance`).
3.  **Map**: Head to the **Mapping Engine**. Drag and drop or select the global parent categories for your raw Trial Balance accounts.
4.  **Analyze**: Open the **Statements** tab. Select your reporting period and view your dynamically generated, GAAP-compliant financial statements!

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
