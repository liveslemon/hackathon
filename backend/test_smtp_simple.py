import os
import smtplib
from email.mime.text import MIMEText
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

SMTP_EMAIL = os.getenv("SMTP_EMAIL")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD")

def test_smtp():
    if not SMTP_EMAIL or not SMTP_PASSWORD:
        print("Error: SMTP_EMAIL or SMTP_PASSWORD not set in environment.")
        return

    print(f"Attempting to connect to SMTP server with: {SMTP_EMAIL}")
    
    msg = MIMEText("This is a test email to verify SMTP configuration.")
    msg["Subject"] = "SMTP Verification Test"
    msg["From"] = SMTP_EMAIL
    msg["To"] = SMTP_EMAIL  # Send to self for testing

    try:
        # Using STARTTLS (Port 587) as updated in main.py
        server = smtplib.SMTP("smtp.gmail.com", 587)
        server.starttls()
        server.login(SMTP_EMAIL, SMTP_PASSWORD)
        server.send_message(msg)
        server.quit()
        print("Success: Test email sent successfully!")
    except Exception as e:
        print(f"Failure: SMTP error occurred: {e}")

if __name__ == "__main__":
    test_smtp()
