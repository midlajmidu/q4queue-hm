"""
app/services/email_service.py
Service for sending emails via SMTP.
"""
import logging
import smtplib
from email.message import EmailMessage
import asyncio
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
        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
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
