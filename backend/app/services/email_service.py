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
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eaeaea; border-radius: 10px;">
        <h2 style="color: #333; text-align: center;">Password Change OTP</h2>
        <p style="color: #555; font-size: 16px;">You requested a password change. Please use the following One-Time Password (OTP) to proceed.</p>
        <div style="background-color: #f4f4f4; padding: 20px; text-align: center; border-radius: 8px; margin: 20px 0;">
            <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #4f46e5;">{otp}</span>
        </div>
        <p style="color: #888; font-size: 14px; text-align: center;">This OTP is valid for 5 minutes. If you did not request this, please ignore this email.</p>
    </div>
    """
    
    # Run synchronous smtplib in a background thread to not block asyncio loop
    return await asyncio.to_thread(_send_email_sync, to_email, subject, html_body)
