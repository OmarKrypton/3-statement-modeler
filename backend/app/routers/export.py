from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
import io
import openpyxl
from openpyxl.styles import Font, Alignment, Border, Side, PatternFill

from ..database import get_db
from .forecast import get_forecast_statements

router = APIRouter(
    prefix="/api/v1/companies/{company_id}/export",
    tags=["Export"]
)

# Shared styles
bold_font = Font(bold=True)
header_font = Font(bold=True, size=12, color="FFFFFF")
title_font = Font(bold=True, size=16, color="333333")
right_align = Alignment(horizontal="right")
center_align = Alignment(horizontal="center")
bottom_border = Border(bottom=Side(style='thin', color="CCCCCC"))
all_border = Border(bottom=Side(style='thin', color="EEEEEE"), top=Side(style='thin', color="EEEEEE"))
header_fill = PatternFill(start_color="1E293B", end_color="1E293B", fill_type="solid")
number_format = '_($* #,##0_);_($* (#,##0);_($* "-"_);_(@_)'

def add_title(sheet, title_text, col_span):
    sheet.append([title_text])
    sheet.merge_cells(start_row=1, start_column=1, end_row=1, end_column=col_span)
    cell = sheet.cell(row=1, column=1)
    cell.font = title_font
    cell.alignment = Alignment(horizontal="left", vertical="center")
    sheet.row_dimensions[1].height = 25

def add_header(sheet, columns):
    sheet.append(columns)
    row = sheet.max_row
    for cell in sheet[row]:
        cell.font = header_font
        cell.fill = header_fill
        cell.border = bottom_border
        if cell.column > 1:
            cell.alignment = center_align

def format_row(sheet, row_idx, is_bold=False):
    for cell in sheet[row_idx]:
        if cell.column > 1:
            cell.number_format = number_format
        if is_bold:
            cell.font = bold_font

@router.get("/excel")
def export_forecast_excel(company_id: str, scenario: str = "base", db: Session = Depends(get_db)):
    # 1. Fetch data dictionary from the existing forecasting engine
    data = get_forecast_statements(company_id, scenario, db)
    
    actuals = data.get("actuals", {})
    projections = data.get("projections", [])
    if not projections:
        raise HTTPException(status_code=400, detail="No projection data found to export.")

    base_period = data["base_period"]
    
    # Header row: 'Metric', 'Actuals (Date)', 'Forecast (Date1)', 'Forecast (Date2)'...
    headers = ["Metric", f"Actuals\n{base_period}"]
    for p in projections:
        headers.append(f"Forecast\n{p['period']}")

    # 2. Setup Workbook
    wb = openpyxl.Workbook()
    total_cols = len(headers)
    
    # ── INCOME STATEMENT ──
    ws_is = wb.active
    ws_is.title = "Income Statement"
    add_title(ws_is, f"Automated 3-Statement Modeler - Income Statement ({scenario.capitalize()} Scenario)", total_cols)
    add_header(ws_is, headers)
    ws_is.freeze_panes = "B3"
    
    def r(actual_val, key, flip_sign=False):
        row = [actual_val]
        for p in projections:
            val = p[key] / 100.0  # Convert cents to dollars
            row.append(-val if flip_sign else val)
        return row

    ws_is.append(["Revenue"] + r(actuals.get("revenue_cents", 0) / 100.0, "revenue_cents"))
    ws_is.append(["COGS"] + r(0, "cogs_cents", flip_sign=True))
    ws_is.append(["Gross Profit"] + r(0, "gross_profit_cents"))
    format_row(ws_is, ws_is.max_row, is_bold=True)
    
    ws_is.append(["Operating Expenses"] + r(actuals.get("expenses_cents", 0) / 100.0, "opex_cents", flip_sign=True))
    ws_is.append(["EBITDA"] + r(0, "ebitda_cents"))
    format_row(ws_is, ws_is.max_row, is_bold=True)
    
    ws_is.append(["D&A"] + r(0, "da_cents", flip_sign=True))
    ws_is.append(["EBIT"] + r(0, "ebit_cents"))
    format_row(ws_is, ws_is.max_row, is_bold=True)
    
    ws_is.append(["Tax"] + r(0, "tax_cents", flip_sign=True))
    ws_is.append(["Net Income"] + r(actuals.get("net_income_cents", 0) / 100.0, "net_income_cents"))
    format_row(ws_is, ws_is.max_row, is_bold=True)
    
    # ── CASH FLOW STATEMENT ──
    ws_cf = wb.create_sheet("Cash Flow")
    add_title(ws_cf, f"Automated 3-Statement Modeler - Cash Flow ({scenario.capitalize()} Scenario)", total_cols)
    add_header(ws_cf, headers)
    ws_cf.freeze_panes = "B3"
    
    ws_cf.append(["Net Income"] + r(actuals.get("net_income_cents", 0) / 100.0, "net_income_cf_cents"))
    ws_cf.append(["D&A (Add-back)"] + r(0, "da_cents"))
    ws_cf.append(["Δ Net Working Capital"] + r(0, "delta_wc_cents"))
    ws_cf.append(["Cash from Operations"] + r(0, "net_cash_from_operations_cents"))
    format_row(ws_cf, ws_cf.max_row, is_bold=True)
    
    ws_cf.append(["CapEx"] + r(0, "capex_cents"))
    ws_cf.append(["Cash from Investing"] + r(0, "net_cash_from_investing_cents"))
    format_row(ws_cf, ws_cf.max_row, is_bold=True)
    
    ws_cf.append(["Cash from Financing"] + r(0, "net_cash_from_financing_cents"))
    format_row(ws_cf, ws_cf.max_row, is_bold=True)
    
    ws_cf.append(["Net Change in Cash"] + r(0, "net_change_in_cash_cents"))
    ws_cf.append(["Beginning Cash"] + r(actuals.get("cash_cents", 0) / 100.0, "beginning_cash_cents"))
    ws_cf.append(["Ending Cash"] + r(actuals.get("cash_cents", 0) / 100.0, "ending_cash_cents"))
    format_row(ws_cf, ws_cf.max_row, is_bold=True)

    # Clean up column widths
    for ws in [ws_is, ws_cf]:
        ws.column_dimensions['A'].width = 25
        for col_letter in [openpyxl.utils.get_column_letter(i+2) for i in range(len(projections)+1)]:
            ws.column_dimensions[col_letter].width = 15

    # 3. Stream back to client
    stream = io.BytesIO()
    wb.save(stream)
    stream.seek(0)
    
    filename = f"Forecast_{scenario.capitalize()}.xlsx"
    headers_response = {
        'Content-Disposition': f'attachment; filename="{filename}"'
    }
    
    return StreamingResponse(
        stream, 
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers=headers_response
    )
