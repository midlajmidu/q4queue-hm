"""
app/services/email_service.py
Service for sending emails via SMTP.
"""
import logging
import smtplib
from email.message import EmailMessage
import asyncio
from html import escape
from app.core.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

def _send_email_sync(to_email: str, subject: str, html_body: str) -> bool:
    if not settings.SMTP_HOST or not settings.SMTP_USER or not settings.SMTP_PASSWORD:
        logger.warning(
            f"SMTP not configured! Would have sent email to {to_email} with subject: {subject}. "
            f"HTML Body: {html_body}"
        )
        return False

    msg = EmailMessage()
    msg['Subject'] = subject
    msg['From'] = f"{settings.SMTP_FROM_NAME} <{settings.SMTP_FROM_EMAIL or settings.SMTP_USER}>"
    msg['To'] = to_email
    
    msg.set_content("Please enable HTML to view this email.")
    msg.add_alternative(html_body, subtype='html')

    try:
        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=10) as server:
            server.starttls()
            server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            server.send_message(msg)
        logger.info(f"Email sent successfully to {to_email}")
        return True
    except Exception as e:
        logger.error(f"Failed to send email to {to_email}: {str(e)}")
        return False

async def send_otp_email(to_email: str, otp: str) -> bool:
    """Send a password change OTP to the user's email."""
    subject = "Password Change Request (OTP)"
    html_body = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f9fafb; margin: 0; padding: 40px 0; color: #111827;">
        <div style="max-width: 500px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06); border: 1px solid #e5e7eb;">
            <div style="background-color: #4f46e5; padding: 24px; text-align: center;">
                <h1 style="color: #ffffff; margin: 0; font-size: 20px; font-weight: 600; letter-spacing: 0.5px;">Q4Queue Security</h1>
            </div>
            <div style="padding: 32px 24px;">
                <h2 style="margin: 0 0 16px; font-size: 20px; font-weight: 600; color: #1f2937;">Password Change Request</h2>
                <p style="margin: 0 0 24px; font-size: 15px; line-height: 1.6; color: #4b5563;">
                    We received a request to change the password for your Q4Queue administrative account. Please use the following One-Time Password (OTP) to securely complete this process.
                </p>
                <div style="background-color: #f3f4f6; border-radius: 8px; padding: 24px; text-align: center; margin-bottom: 24px;">
                    <span style="display: block; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; color: #6b7280; margin-bottom: 8px; font-weight: 600;">Your Security Code</span>
                    <span style="font-size: 36px; font-weight: 700; letter-spacing: 8px; color: #4f46e5; font-family: monospace;">{otp}</span>
                </div>
                <p style="margin: 0 0 24px; font-size: 14px; line-height: 1.6; color: #4b5563;">
                    This code will securely expire in <strong>5 minutes</strong>. For your protection, never share this code with anyone, including Q4Queue support staff.
                </p>
                <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;">
                <p style="margin: 0; font-size: 13px; line-height: 1.5; color: #6b7280;">
                    <strong>Didn't request this change?</strong><br>
                    If you did not initiate this request, someone may be trying to access your account. Please ignore this email and verify your current account security.
                </p>
            </div>
            <div style="background-color: #f9fafb; padding: 16px 24px; text-align: center; border-top: 1px solid #e5e7eb;">
                <p style="margin: 0; font-size: 12px; color: #9ca3af;">
                    &copy; {{{{ year }}}} Q4Queue. All rights reserved.<br>
                    This is an automated message, please do not reply.
                </p>
            </div>
        </div>
    </body>
    </html>
    """.replace("{{ year }}", "2026")
    
    # Run synchronous smtplib in a background thread to not block asyncio loop
    return await asyncio.to_thread(_send_email_sync, to_email, subject, html_body)


async def send_trial_signup_otp_email(to_email: str, otp: str) -> bool:
    """Send the email-ownership verification code used before trial provisioning."""
    subject = "Verify your email to start your Q4Queue trial"
    html_body = f"""
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
    <body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;background:#f8fafc;margin:0;padding:40px 16px;color:#0f172a;">
      <div style="max-width:500px;margin:0 auto;background:#fff;border:1px solid #e2e8f0;border-radius:16px;overflow:hidden;box-shadow:0 10px 25px rgba(15,23,42,.08);">
        <div style="background:#4f46e5;padding:24px;text-align:center;">
          <h1 style="color:#fff;margin:0;font-size:21px;font-weight:700;">Q4Queue</h1>
        </div>
        <div style="padding:32px 28px;">
          <h2 style="margin:0 0 12px;font-size:22px;">Verify your email</h2>
          <p style="margin:0 0 24px;color:#475569;font-size:15px;line-height:1.6;">Use this one-time code to confirm your email and start your 14-day free trial.</p>
          <div style="background:#eef2ff;border:1px solid #c7d2fe;border-radius:12px;padding:22px;text-align:center;margin-bottom:24px;">
            <span style="display:block;font-size:11px;text-transform:uppercase;letter-spacing:1.4px;color:#6366f1;font-weight:700;margin-bottom:9px;">Verification code</span>
            <span style="font-family:monospace;font-size:36px;font-weight:800;letter-spacing:8px;color:#3730a3;">{otp}</span>
          </div>
          <p style="margin:0;color:#475569;font-size:14px;line-height:1.6;">This code expires in <strong>5 minutes</strong>. Q4Queue support will never ask you to share it.</p>
          <hr style="border:0;border-top:1px solid #e2e8f0;margin:24px 0;">
          <p style="margin:0;color:#94a3b8;font-size:12px;line-height:1.5;">If you did not request a Q4Queue trial, you can safely ignore this email.</p>
        </div>
      </div>
    </body>
    </html>
    """
    return await asyncio.to_thread(_send_email_sync, to_email, subject, html_body)


async def send_sales_request_notification(
    to_email: str,
    *,
    customer_name: str,
    contact_name: str,
    contact_email: str,
    contact_phone: str | None,
    message: str | None,
    source: str,
) -> bool:
    """Alert an internal sales recipient when a customer asks to continue service."""
    portal_url = f"{settings.FRONTEND_URL.rstrip('/')}/super-admin/sales-requests"
    safe_message = escape(message or "No additional message provided.").replace("\n", "<br>")
    subject = f"Q4Queue sales request — {customer_name}"
    html_body = f"""
    <!DOCTYPE html><html><body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;background:#f8fafc;margin:0;padding:36px 16px;color:#0f172a;">
      <div style="max-width:560px;margin:auto;background:#fff;border:1px solid #e2e8f0;border-radius:16px;overflow:hidden;box-shadow:0 10px 25px rgba(15,23,42,.08);">
        <div style="background:#4f46e5;padding:22px 28px;color:#fff;"><h1 style="margin:0;font-size:20px;">New Q4Queue sales request</h1></div>
        <div style="padding:28px;">
          <p style="margin:0 0 20px;color:#475569;line-height:1.6;"><strong>{escape(customer_name)}</strong> has reached out about continuing or extending their Q4Queue service. Please contact them and review the request in the Super Admin portal.</p>
          <table style="width:100%;border-collapse:collapse;font-size:14px;">
            <tr><td style="padding:8px 0;color:#64748b;">Contact</td><td style="padding:8px 0;font-weight:600;">{escape(contact_name)}</td></tr>
            <tr><td style="padding:8px 0;color:#64748b;">Email</td><td style="padding:8px 0;"><a href="mailto:{escape(contact_email)}">{escape(contact_email)}</a></td></tr>
            <tr><td style="padding:8px 0;color:#64748b;">Phone</td><td style="padding:8px 0;">{escape(contact_phone or 'Not provided')}</td></tr>
            <tr><td style="padding:8px 0;color:#64748b;">Source</td><td style="padding:8px 0;">{escape(source.replace('_', ' ').title())}</td></tr>
          </table>
          <div style="margin-top:18px;padding:14px;border-radius:10px;background:#f8fafc;color:#334155;font-size:14px;line-height:1.6;">{safe_message}</div>
          <a href="{escape(portal_url)}" style="display:inline-block;margin-top:22px;padding:11px 18px;border-radius:9px;background:#4f46e5;color:#fff;text-decoration:none;font-size:14px;font-weight:700;">Open Sales Requests</a>
        </div>
      </div>
    </body></html>
    """
    return await asyncio.to_thread(_send_email_sync, to_email, subject, html_body)
