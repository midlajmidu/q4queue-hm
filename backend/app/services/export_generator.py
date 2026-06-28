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
    date_col = func.coalesce(Session.session_date, func.date(Token.created_at))
    
    from sqlalchemy.orm import aliased
    CompletedByUser = aliased(User)

    stmt = (
        select(
            Organization.name.label("branch_name"),
            date_col.label("date"),
            Queue.name.label("queue_name"),
            Token.token_number,
            Token.assigned_line,
            Token.customer_name,
            Token.customer_phone,
            Token.companion_names,
            Token.status,
            Token.created_at,
            Token.served_at,
            Token.completed_at,
            Token.called_via_invite,
            Token.served_by_id,
            Token.completed_by_id,
            Token.entry_type,
            Session.title.label("session_name"),
            User.first_name.label("staff_first"),
            User.last_name.label("staff_last"),
            CompletedByUser.first_name.label("completed_first"),
            CompletedByUser.last_name.label("completed_last")
        )
        .select_from(Token)
        .join(Organization, Token.org_id == Organization.id)
        .outerjoin(Session, Token.session_id == Session.id)
        .join(Queue, Token.queue_id == Queue.id)
        .outerjoin(User, Token.served_by_id == User.id)
        .outerjoin(CompletedByUser, Token.completed_by_id == CompletedByUser.id)
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
        stmt = stmt.where(date_col == today)
    elif date_range == "Yesterday":
        stmt = stmt.where(date_col == today - timedelta(days=1))
    elif date_range == "Last 7 Days":
        stmt = stmt.where(date_col >= today - timedelta(days=7))
    elif date_range == "Last 30 Days":
        stmt = stmt.where(date_col >= today - timedelta(days=30))
    elif date_range == "This Month":
        start_of_month = today.replace(day=1)
        stmt = stmt.where(date_col >= start_of_month)
    elif date_range == "Last Month":
        start_of_this_month = today.replace(day=1)
        end_of_last_month = start_of_this_month - timedelta(days=1)
        start_of_last_month = end_of_last_month.replace(day=1)
        stmt = stmt.where(date_col.between(start_of_last_month, end_of_last_month))
    elif date_range == "Custom Date Range":
        c_start = filters.get("custom_start_date")
        c_end = filters.get("custom_end_date")
        if c_start:
            stmt = stmt.where(date_col >= datetime.strptime(c_start, "%Y-%m-%d").date())
        if c_end:
            stmt = stmt.where(date_col <= datetime.strptime(c_end, "%Y-%m-%d").date())

    # Order by hierarchy
    stmt = stmt.order_by(
        Organization.name,
        date_col.desc(),
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
        if r.served_at and r.created_at:
            w_secs = (r.served_at - r.created_at).total_seconds()
            wait_mins = round(w_secs / 60, 2)
            if r.status == "done":
                total_wait_secs += w_secs
                
        # Calculate Service Time
        serve_mins = None
        if r.completed_at and r.served_at:
            s_secs = (r.completed_at - r.served_at).total_seconds()
            serve_mins = round(s_secs / 60, 2)
            if r.status == "done":
                total_serve_secs += s_secs
                
        if r.status == "done":
            served_count += 1
        elif r.status in ["skipped", "deleted"]:
            cancelled_count += 1

        staff_name = f"{r.staff_first} {r.staff_last}".strip() if r.staff_first else ""
        completed_by_name = f"{r.completed_first} {r.completed_last}".strip() if r.completed_first else ""

        # Companions: stored as JSON list of names
        companions_raw = r.companion_names or []
        companions_str = ", ".join(companions_raw) if companions_raw else ""

        # Entry Type
        if r.entry_type == "manual":
            entry_type_label = "Manual"
        elif r.entry_type == "qr":
            entry_type_label = "QR Code"
        elif r.entry_type == "auto":
            entry_type_label = "Auto"
        else:
            entry_type_label = r.entry_type or ""

        formatted_data.append({
            "Branch Name": branch,
            "Date": r.date.strftime("%Y-%m-%d") if r.date else "",
            "Queue Name": q_name,
            "Token Number": r.token_number,
            "Service Line": r.assigned_line if r.assigned_line is not None else "",
            "Customer Name": r.customer_name or "",
            "Customer Phone": r.customer_phone or "",
            "Companions": companions_str,
            "Status": r.status.title(),
            "Created At": r.created_at.strftime("%H:%M:%S") if r.created_at else "",
            "Served At": r.served_at.strftime("%H:%M:%S") if r.served_at else "",
            "Completed At": r.completed_at.strftime("%H:%M:%S") if r.completed_at else "",
            "Wait Time (mins)": wait_mins,
            "Serve Time (mins)": serve_mins,
            "Served By": staff_name,
            "Completed By": completed_by_name,
            "Call Method": "Skipped" if r.status == "skipped" else "Normal",
            "Entry Type": entry_type_label
        })

    # Add Called At back as empty
    for row in formatted_data:
        # insert Called At after Created At
        # Since dictionaries are ordered in Python 3.7+, we'll rebuild the dict to ensure column order
        pass

    # Rebuild data with exact columns in the required order
    final_data = []
    for r in formatted_data:
        final_data.append({
            "Branch Name": r.get("Branch Name", ""),   # Keep for grouping/sheet splitting
            "Queue Name": r.get("Queue Name", ""),     # Keep for grouping/sheet splitting
            "Date": r.get("Date", ""),
            "Token Number": r.get("Token Number", ""),
            "Queue": r.get("Queue Name", ""),
            "Service Line": r.get("Service Line", ""),
            "Customer Name": r.get("Customer Name", ""),
            "Customer Phone": r.get("Customer Phone", ""),
            "Companions": r.get("Companions", ""),
            "Status": r.get("Status", ""),
            "Created At": r.get("Created At", ""),
            "Served At": r.get("Served At", ""),
            "Completed At": r.get("Completed At", ""),
            "Wait Time (mins)": r.get("Wait Time (mins)", ""),
            "Serve Time (mins)": r.get("Serve Time (mins)", ""),
            "Served By": r.get("Served By", ""),
            "Completed By": r.get("Completed By", ""),
            "Call Method": r.get("Call Method", ""),
            "Entry Type": r.get("Entry Type", "")
        })

    df = pd.DataFrame(final_data)

    # Compute Summary
    total_customers = len(formatted_data)
    avg_wait = round(total_wait_secs / served_count / 60, 2) if served_count > 0 else 0
    avg_serve = round(total_serve_secs / served_count / 60, 2) if served_count > 0 else 0

    summary_df = pd.DataFrame([
        {"Metric": "Total Branches", "Value": len(unique_branches)},
        {"Metric": "Total Queues", "Value": len(unique_queues)},
        {"Metric": "Total Customers", "Value": total_customers},
        {"Metric": "Total Served", "Value": served_count},
        {"Metric": "Total Cancelled / Deleted", "Value": cancelled_count},
        {"Metric": "Average Wait Time (Mins)", "Value": avg_wait},
        {"Metric": "Average Service Time (Mins)", "Value": avg_serve},
    ])

    # Fetch Parent Org Name
    from app.models.parent_organization import ParentOrganization
    parent_org = await db.scalar(select(ParentOrganization).where(ParentOrganization.id == job.parent_org_id))
    parent_org_name = parent_org.name if parent_org else "Parent Organization"
    report_title = f"{parent_org_name} Customer Report"

    if df.empty:
        # Fallback for empty data
        if job.format.upper() == "EXCEL":
            file_path = os.path.join(EXPORTS_DIR, f"{filename}.xlsx")
            import openpyxl
            from openpyxl.styles import Font, PatternFill, Alignment
            with pd.ExcelWriter(file_path, engine='openpyxl') as writer:
                # Write an empty dataframe so we can grab the sheet and edit it
                pd.DataFrame().to_excel(writer, sheet_name='Report', index=False)
                wb = writer.book
                ws = wb.active
                
                # Title
                ws.append([report_title])
                ws.cell(row=ws.max_row, column=1).font = Font(bold=True, size=16)
                ws.merge_cells(start_row=ws.max_row, start_column=1, end_row=ws.max_row, end_column=5)
                ws.append([])
                
                # Summary
                ws.append(["Report Summary"])
                ws.cell(row=ws.max_row, column=1).font = Font(bold=True, size=14)
                ws.append(["Metric", "Value"])
                ws.cell(row=ws.max_row, column=1).font = Font(bold=True)
                ws.cell(row=ws.max_row, column=2).font = Font(bold=True)
                
                for _, row in summary_df.iterrows():
                    ws.append([row['Metric'], row['Value']])
            return file_path
        elif job.format.upper() == "CSV":
            file_path = os.path.join(EXPORTS_DIR, f"{filename}.csv")
            with open(file_path, 'w') as f:
                summary_df.to_csv(f, index=False)
            return file_path
        else:
            file_path = os.path.join(EXPORTS_DIR, f"{filename}.pdf")
            _generate_detailed_pdf(df, summary_df, file_path, report_title)
            return file_path

    # Grouping logic
    cols_to_drop = ['Branch Name', 'Queue Name']

    if job.format.upper() == "EXCEL":
        file_path = os.path.join(EXPORTS_DIR, f"{filename}.xlsx")
        import openpyxl
        from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
        
        wb = openpyxl.Workbook()
        ws = wb.active
        ws.title = "Report"
        
        thin_border = Border(left=Side(style='thin'), right=Side(style='thin'), top=Side(style='thin'), bottom=Side(style='thin'))
        
        # Write Title
        ws.append([report_title])
        ws.cell(row=ws.max_row, column=1).font = Font(bold=True, size=16)
        ws.merge_cells(start_row=ws.max_row, start_column=1, end_row=ws.max_row, end_column=6)
        ws.append([])
        
        # Write Summary
        ws.append(["Report Summary"])
        ws.cell(row=ws.max_row, column=1).font = Font(bold=True, size=14)
        ws.append(["Metric", "Value"])
        ws.cell(row=ws.max_row, column=1).font = Font(bold=True)
        ws.cell(row=ws.max_row, column=2).font = Font(bold=True)
        
        for _, row in summary_df.iterrows():
            ws.append([row['Metric'], row['Value']])
            
        ws.append([])
        
        # Nested hierarchical grouping: Branch -> Date -> Queue
        branches = df['Branch Name'].unique()
        for branch in branches:
            branch_df = df[df['Branch Name'] == branch]
            
            ws.append([f"BRANCH: {branch}"])
            ws.cell(row=ws.max_row, column=1).font = Font(bold=True, size=14)
            ws.merge_cells(start_row=ws.max_row, start_column=1, end_row=ws.max_row, end_column=6)
            ws.append([])
            ws.append(["---"])
            
            dates = branch_df['Date'].unique()
            for date in dates:
                date_df = branch_df[branch_df['Date'] == date]
                
                ws.append([f"DATE: {date}"])
                ws.cell(row=ws.max_row, column=1).font = Font(bold=True, size=12)
                ws.merge_cells(start_row=ws.max_row, start_column=1, end_row=ws.max_row, end_column=6)
                ws.append([])
                ws.append(["---"])
                
                queues = date_df['Queue Name'].unique()
                for queue in queues:
                    queue_df = date_df[date_df['Queue Name'] == queue]
                    
                    ws.append([f"QUEUE: {queue}"])
                    ws.cell(row=ws.max_row, column=1).font = Font(bold=True, size=11)
                    ws.merge_cells(start_row=ws.max_row, start_column=1, end_row=ws.max_row, end_column=6)
                    ws.append([])
                    
                    group_clean = queue_df.drop(columns=cols_to_drop, errors='ignore')
                    
                    # Table headers
                    row_idx = ws.max_row + 1
                    ws.append(list(group_clean.columns))
                    for col_idx in range(1, len(group_clean.columns) + 1):
                        cell = ws.cell(row=row_idx, column=col_idx)
                        cell.font = Font(bold=True)
                        cell.fill = PatternFill(start_color="F3F4F6", end_color="F3F4F6", fill_type="solid")
                        cell.border = thin_border
                    
                    for _, row in group_clean.iterrows():
                        ws.append(list(row))
                        # apply border to data rows
                        r_idx = ws.max_row
                        for c_idx in range(1, len(group_clean.columns) + 1):
                            ws.cell(row=r_idx, column=c_idx).border = thin_border
                        
                    ws.append([]) # Empty row for spacing
                    ws.append(["---"])
                    ws.append([])
            
        # Adjust column widths for readability
        from openpyxl.utils import get_column_letter
        for col_idx in range(1, ws.max_column + 1):
            max_length = 0
            column_letter = get_column_letter(col_idx)
            for row_idx in range(1, ws.max_row + 1):
                cell = ws.cell(row=row_idx, column=col_idx)
                if type(cell).__name__ != 'MergedCell':
                    try:
                        val = str(cell.value)
                        if cell.value is not None and len(val) > max_length:
                            max_length = len(val)
                    except:
                        pass
            adjusted_width = (max_length + 2)
            if adjusted_width > 50:
                adjusted_width = 50 # Cap maximum width
            ws.column_dimensions[column_letter].width = adjusted_width

        wb.save(file_path)
        return file_path
        
    elif job.format.upper() == "CSV":
        file_path = os.path.join(EXPORTS_DIR, f"{filename}.csv")
        with open(file_path, 'w') as f:
            f.write(f"# {report_title}\n\n")
            f.write("--- REPORT SUMMARY ---\n")
            summary_df.to_csv(f, index=False)
            f.write("\n\n--- DETAILED RECORDS ---\n")
            
            grouped = df.groupby(['Branch Name', 'Date', 'Queue Name'])
            for (branch, date, queue), group in grouped:
                f.write(f"\n## Branch: {branch}\n")
                f.write(f"### Date: {date}\n")
                f.write(f"#### Queue: {queue}\n")
                
                group_clean = group.drop(columns=cols_to_drop)
                group_clean.to_csv(f, index=False)
                
        return file_path
        
    elif job.format.upper() == "PDF":
        file_path = os.path.join(EXPORTS_DIR, f"{filename}.pdf")
        _generate_detailed_pdf(df, summary_df, file_path, report_title)
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
    
    if df.empty:
        elements.append(Paragraph("No customer records found for the selected criteria.", styles['Normal']))
        doc.build(elements)
        return
        
    # Limit rows for PDF to avoid memory issues
    if len(df) > 1000:
        elements.append(Paragraph("Note: PDF output is limited to 1000 rows. Please export to Excel/CSV for the full dataset.", styles['Normal']))
        elements.append(Spacer(1, 10))
        df = df.head(1000)
        
    # Group hierarchical data
    cols_to_drop = ['Branch Name', 'Date', 'Queue Name']
    grouped = df.groupby(['Branch Name', 'Date', 'Queue Name'])
    
    for (branch, date, queue), group in grouped:
        elements.append(Paragraph(f"Branch: {branch}", styles['Heading3']))
        elements.append(Paragraph(f"Date: {date}", styles['Normal']))
        elements.append(Paragraph(f"Queue: {queue}", styles['Normal']))
        elements.append(Spacer(1, 10))
        
        group_clean = group.drop(columns=cols_to_drop)
        data = [group_clean.columns.values.astype(str).tolist()] + group_clean.astype(str).values.tolist()
        
        t = Table(data, repeatRows=1)
        t.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#6b7280')),
            ('TEXTCOLOR', (0,0), (-1,0), colors.whitesmoke),
            ('ALIGN', (0,0), (-1,-1), 'LEFT'),
            ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
            ('FONTSIZE', (0,0), (-1,0), 9),
            ('FONTSIZE', (0,1), (-1,-1), 8),
            ('BOTTOMPADDING', (0,0), (-1,0), 8),
            ('BACKGROUND', (0,1), (-1,-1), colors.white),
            ('GRID', (0,0), (-1,-1), 1, colors.lightgrey)
        ]))
        elements.append(t)
        elements.append(Spacer(1, 20))
        
    doc.build(elements)
