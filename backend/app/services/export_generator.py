import os
import uuid
import pandas as pd
from datetime import datetime, timezone, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, func
from app.models.export_job import ExportJob
from app.models.user import User
from app.models.organization import Organization
from app.models.queue import Queue
from app.models.session import Session
from app.models.token import Token

EXPORTS_DIR = "/app/exports"
os.makedirs(EXPORTS_DIR, exist_ok=True)

async def generate_export(job_id: uuid.UUID, db: AsyncSession):
    # Fetch job
    job = await db.get(ExportJob, job_id)
    if not job:
        return
        
    try:
        job.status = "processing"
        await db.commit()
        
        # Determine specific logic for report type
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"{job.report_type.replace(' ', '_')}_{timestamp}"
        
        if job.report_type == "Customer Detailed Report":
            file_path = await _generate_customer_detailed_report(job, db, filename)
        else:
            # Legacy simple logic
            data = await _fetch_data_for_report(job, db)
            df = pd.DataFrame(data)
            if job.format.upper() == "CSV":
                file_path = os.path.join(EXPORTS_DIR, f"{filename}.csv")
                df.to_csv(file_path, index=False)
            elif job.format.upper() == "EXCEL":
                file_path = os.path.join(EXPORTS_DIR, f"{filename}.xlsx")
                df.to_excel(file_path, index=False)
            elif job.format.upper() == "PDF":
                file_path = os.path.join(EXPORTS_DIR, f"{filename}.pdf")
                _generate_pdf(df, file_path, job.report_type)
            else:
                raise ValueError("Unsupported format")

        job.file_path = file_path
        job.status = "completed"
        job.completed_at = datetime.now(timezone.utc)
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        job.status = "failed"
        job.error_message = str(e)
        job.completed_at = datetime.now(timezone.utc)
        
    finally:
        await db.commit()

async def _fetch_data_for_report(job: ExportJob, db: AsyncSession):
    # Legacy data fetching logic
    if job.report_type == "Executive Summary":
        return [{"Metric": "Total Branches", "Value": 5}, {"Metric": "Total Staff", "Value": 25}]
    elif job.report_type == "Branch Performance Report":
        orgs_res = await db.execute(select(Organization).where(Organization.parent_organization_id == job.parent_org_id))
        orgs = orgs_res.scalars().all()
        return [{"Branch": o.name, "Status": "Active" if o.is_active else "Inactive", "Created At": o.created_at} for o in orgs]
    elif job.report_type == "Queue Performance Report":
        q_res = await db.execute(select(Queue))
        queues = q_res.scalars().all()
        return [{"Queue Name": q.name, "Active": q.is_active, "Tokens Served": q.total_served} for q in queues]
    elif job.report_type == "Session Performance Report":
        s_res = await db.execute(select(Session))
        sessions = s_res.scalars().all()
        return [{"Session": s.name, "Date": s.session_date, "Status": s.status} for s in sessions]
    elif job.report_type == "Staff Performance Report":
        return [{"Staff": "John Doe", "Customers Served": 120}]
    elif job.report_type == "Customer Flow Report":
        return [{"Customer": "Jane", "Wait Time": "12m", "Service Time": "5m"}]
    else:
        return [{"Message": "No data available for this report type"}]

def _generate_pdf(df, file_path, title):
    from reportlab.lib.pagesizes import letter
    from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph
    from reportlab.lib.styles import getSampleStyleSheet
    from reportlab.lib import colors

    doc = SimpleDocTemplate(file_path, pagesize=letter)
    elements = []
    
    styles = getSampleStyleSheet()
    elements.append(Paragraph(title, styles['Title']))
    
    data = [df.columns[:,].values.astype(str).tolist()] + df.values.tolist()
    
    t = Table(data)
    t.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.grey),
        ('TEXTCOLOR', (0,0), (-1,0), colors.whitesmoke),
        ('ALIGN', (0,0), (-1,-1), 'CENTER'),
        ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
        ('BOTTOMPADDING', (0,0), (-1,0), 12),
        ('BACKGROUND', (0,1), (-1,-1), colors.beige),
        ('GRID', (0,0), (-1,-1), 1, colors.black)
    ]))
    
    elements.append(t)
    doc.build(elements)

# ── Customer Detailed Report Logic ──

async def _generate_customer_detailed_report(job: ExportJob, db: AsyncSession, filename: str) -> str:
    # Build Query
    stmt = (
        select(
            Organization.name.label("branch_name"),
            Session.session_date.label("date"),
            Queue.name.label("queue_name"),
            Token.token_number,
            Token.customer_name,
            Token.customer_phone,
            Token.status,
            Token.created_at,
            Token.called_at,
            Token.served_at,
            Token.completed_at,
            Token.call_method,
            Session.name.label("session_name"),
            User.first_name.label("staff_first"),
            User.last_name.label("staff_last")
        )
        .select_from(Token)
        .join(Organization, Token.org_id == Organization.id)
        .join(Session, Token.session_id == Session.id)
        .join(Queue, Token.queue_id == Queue.id)
        .outerjoin(User, Token.served_by == User.id)
        .where(Organization.parent_organization_id == job.parent_org_id)
    )

    filters = job.filters or {}
    
    # 1. Branch filter
    branch_ids = filters.get("branch_ids")
    if branch_ids:
        stmt = stmt.where(Organization.id.in_([uuid.UUID(b) for b in branch_ids]))
        
    # 2. Queue filter
    queue_names = filters.get("queue_names")
    if queue_names:
        stmt = stmt.where(Queue.name.in_(queue_names))
        
    # 3. Date Range
    date_range = filters.get("date_range", "All Time")
    now = datetime.now(timezone.utc)
    today = now.date()
    
    if date_range == "Today":
        stmt = stmt.where(Session.session_date == today)
    elif date_range == "Yesterday":
        stmt = stmt.where(Session.session_date == today - timedelta(days=1))
    elif date_range == "Last 7 Days":
        stmt = stmt.where(Session.session_date >= today - timedelta(days=7))
    elif date_range == "Last 30 Days":
        stmt = stmt.where(Session.session_date >= today - timedelta(days=30))
    elif date_range == "This Month":
        start_of_month = today.replace(day=1)
        stmt = stmt.where(Session.session_date >= start_of_month)
    elif date_range == "Last Month":
        start_of_this_month = today.replace(day=1)
        end_of_last_month = start_of_this_month - timedelta(days=1)
        start_of_last_month = end_of_last_month.replace(day=1)
        stmt = stmt.where(Session.session_date.between(start_of_last_month, end_of_last_month))
    elif date_range == "Custom Date Range":
        c_start = filters.get("custom_start_date")
        c_end = filters.get("custom_end_date")
        if c_start:
            stmt = stmt.where(Session.session_date >= datetime.strptime(c_start, "%Y-%m-%d").date())
        if c_end:
            stmt = stmt.where(Session.session_date <= datetime.strptime(c_end, "%Y-%m-%d").date())

    # Order by hierarchy
    stmt = stmt.order_by(
        Organization.name,
        Session.session_date.desc(),
        Queue.name,
        Token.created_at
    )

    res = await db.execute(stmt)
    records = res.all()

    # Process data
    formatted_data = []
    total_wait_secs = 0
    total_serve_secs = 0
    served_count = 0
    cancelled_count = 0

    unique_branches = set()
    unique_queues = set()

    for r in records:
        branch = r.branch_name
        q_name = r.queue_name
        unique_branches.add(branch)
        unique_queues.add(f"{branch}-{q_name}")
        
        # Calculate Wait Time
        wait_mins = None
        if r.called_at and r.created_at:
            w_secs = (r.called_at - r.created_at).total_seconds()
            wait_mins = round(w_secs / 60, 2)
            if r.status in ["served", "completed"]:
                total_wait_secs += w_secs
                
        # Calculate Service Time
        serve_mins = None
        if r.completed_at and r.served_at:
            s_secs = (r.completed_at - r.served_at).total_seconds()
            serve_mins = round(s_secs / 60, 2)
            if r.status == "completed":
                total_serve_secs += s_secs
                
        if r.status in ["served", "completed"]:
            served_count += 1
        elif r.status in ["cancelled", "no_show"]:
            cancelled_count += 1

        staff_name = f"{r.staff_first} {r.staff_last}" if r.staff_first else ""

        formatted_data.append({
            "Branch Name": branch,
            "Date": r.date.strftime("%Y-%m-%d") if r.date else "",
            "Queue Name": q_name,
            "Token Number": r.token_number,
            "Customer Name": r.customer_name or "",
            "Customer Phone": r.customer_phone or "",
            "Status": r.status.title(),
            "Created At": r.created_at.strftime("%H:%M:%S") if r.created_at else "",
            "Called At": r.called_at.strftime("%H:%M:%S") if r.called_at else "",
            "Served At": r.served_at.strftime("%H:%M:%S") if r.served_at else "",
            "Completed At": r.completed_at.strftime("%H:%M:%S") if r.completed_at else "",
            "Wait Time (Minutes)": wait_mins,
            "Service Time (Minutes)": serve_mins,
            "Served By": staff_name,
            "Call Method": r.call_method or "",
            "Session Name": r.session_name or ""
        })

    df = pd.DataFrame(formatted_data)

    # Compute Summary
    total_customers = len(formatted_data)
    avg_wait = round((total_wait_secs / served_count) / 60, 2) if served_count > 0 else 0
    avg_serve = round((total_serve_secs / served_count) / 60, 2) if served_count > 0 else 0

    summary_df = pd.DataFrame([
        {"Metric": "Total Branches", "Value": len(unique_branches)},
        {"Metric": "Total Queues", "Value": len(unique_queues)},
        {"Metric": "Total Customers", "Value": total_customers},
        {"Metric": "Total Served", "Value": served_count},
        {"Metric": "Total Cancelled", "Value": cancelled_count},
        {"Metric": "Average Wait Time (Mins)", "Value": avg_wait},
        {"Metric": "Average Service Time (Mins)", "Value": avg_serve},
    ])

    if job.format.upper() == "EXCEL":
        file_path = os.path.join(EXPORTS_DIR, f"{filename}.xlsx")
        with pd.ExcelWriter(file_path, engine='openpyxl') as writer:
            summary_df.to_excel(writer, sheet_name='Summary', index=False)
            if not df.empty:
                df.to_excel(writer, sheet_name='Customer Records', index=False)
        return file_path
        
    elif job.format.upper() == "CSV":
        # CSV doesn't support sheets, prepend summary with empty rows
        file_path = os.path.join(EXPORTS_DIR, f"{filename}.csv")
        with open(file_path, 'w') as f:
            f.write("--- REPORT SUMMARY ---\n")
            summary_df.to_csv(f, index=False)
            f.write("\n\n--- DETAILED RECORDS ---\n")
            df.to_csv(f, index=False)
        return file_path
        
    elif job.format.upper() == "PDF":
        file_path = os.path.join(EXPORTS_DIR, f"{filename}.pdf")
        _generate_detailed_pdf(df, summary_df, file_path, "Customer Detailed Report")
        return file_path
        
    else:
        raise ValueError(f"Unsupported format {job.format}")

def _generate_detailed_pdf(df, summary_df, file_path, title):
    from reportlab.lib.pagesizes import landscape, A3
    from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
    from reportlab.lib.styles import getSampleStyleSheet
    from reportlab.lib import colors

    doc = SimpleDocTemplate(file_path, pagesize=landscape(A3), rightMargin=30, leftMargin=30, topMargin=30, bottomMargin=30)
    elements = []
    styles = getSampleStyleSheet()
    
    # Title
    elements.append(Paragraph(title, styles['Title']))
    elements.append(Spacer(1, 20))
    
    # Summary Table
    elements.append(Paragraph("Report Summary", styles['Heading2']))
    sum_data = [summary_df.columns.values.astype(str).tolist()] + summary_df.values.tolist()
    sum_t = Table(sum_data)
    sum_t.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#4f46e5')),
        ('TEXTCOLOR', (0,0), (-1,0), colors.whitesmoke),
        ('ALIGN', (0,0), (-1,-1), 'LEFT'),
        ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
        ('BOTTOMPADDING', (0,0), (-1,0), 10),
        ('BACKGROUND', (0,1), (-1,-1), colors.whitesmoke),
        ('GRID', (0,0), (-1,-1), 1, colors.lightgrey)
    ]))
    elements.append(sum_t)
    elements.append(Spacer(1, 30))
    
    # Data Table - limit to 1000 rows to prevent massive PDF crashes if no other limit
    MAX_ROWS = 1000
    if len(df) > MAX_ROWS:
        elements.append(Paragraph(f"WARNING: Data truncated to {MAX_ROWS} rows to prevent PDF generation failure. Use Excel for full dataset.", styles['Normal']))
        elements.append(Spacer(1, 10))
        df = df.head(MAX_ROWS)
        
    if not df.empty:
        # Hierarchical grouping visual approach in PDF is hard, we just print the flat table nicely.
        # Ensure we only pick most important columns if table too wide
        pdf_cols = ["Branch Name", "Date", "Queue Name", "Token Number", "Customer Name", "Status", "Wait Time (Minutes)", "Service Time (Minutes)"]
        pdf_df = df[pdf_cols]
        data = [pdf_df.columns.values.astype(str).tolist()] + pdf_df.values.tolist()
        
        # Calculate optimal column widths (A3 landscape is ~1190 points wide)
        col_widths = [120, 80, 150, 80, 150, 80, 100, 120]
        
        t = Table(data, colWidths=col_widths, repeatRows=1)
        t.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#1e293b')),
            ('TEXTCOLOR', (0,0), (-1,0), colors.whitesmoke),
            ('ALIGN', (0,0), (-1,-1), 'LEFT'),
            ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
            ('FONTSIZE', (0,0), (-1,-1), 9),
            ('BOTTOMPADDING', (0,0), (-1,0), 8),
            ('TOPPADDING', (0,0), (-1,-1), 4),
            ('BOTTOMPADDING', (0,1), (-1,-1), 4),
            ('BACKGROUND', (0,1), (-1,-1), colors.white),
            ('GRID', (0,0), (-1,-1), 0.5, colors.lightgrey),
            ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.HexColor('#f8fafc')])
        ]))
        elements.append(t)
    
    doc.build(elements)
