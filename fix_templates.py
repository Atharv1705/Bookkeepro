import sys
import datetime
sys.path.append('.')
from sqlalchemy import text
from app.db import SessionLocal

db = SessionLocal()
# Delete old templates
db.execute(text("DELETE FROM required_document_templates;"))
db.commit()

# Insert new ones
current_year = datetime.date.today().year
personal_docs = [
    "W-2 Form", "1099-NEC / 1099-MISC", "SSA-1099 (Social Security Benefits)",
    "Mortgage Interest Statement (1098)", "Charitable Donation Receipts",
    "Medical & Dental Expense Receipts", "Student Loan Interest (1098-E)",
    "State & Local Tax Payment Records", "Investment Income (1099-B / 1099-DIV)",
    "Prior Year Tax Return",
]
business_docs = [
    "Profit & Loss Statement", "Balance Sheet",
    "Bank Statements (All Accounts)", "Business Expense Receipts",
    "Payroll Records / W-3", "1099s Issued to Contractors",
    "Vehicle Mileage Log", "Home Office Documentation",
    "Business Asset Purchase Invoices", "Prior Year Business Tax Return",
]
for name in personal_docs:
    db.execute(text("INSERT IGNORE INTO required_document_templates (category, tax_year, name) VALUES ('personal', :yr, :name)"), {"yr": current_year, "name": name})
for name in business_docs:
    db.execute(text("INSERT IGNORE INTO required_document_templates (category, tax_year, name) VALUES ('business', :yr, :name)"), {"yr": current_year, "name": name})

db.commit()
print("Templates fixed!")
