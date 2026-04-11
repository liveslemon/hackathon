import os
import resend
from dotenv import load_dotenv

load_dotenv()

resend.api_key = os.getenv("RESEND_API_KEY")

def test_resend():
    if not resend.api_key:
        print("Error: RESEND_API_KEY not found in .env")
        return

    try:
        params = {
            "from": "onboarding@resend.dev",
            "to": ["recipient@example.com"],
            "subject": "Test from PAU Interconnect",
            "html": "<strong>It works!</strong>"
        }
        email = resend.Emails.send(params)
        print(f"Success! Email sent. ID: {email['id']}")
    except Exception as e:
        print(f"Error sending email: {e}")

if __name__ == "__main__":
    test_resend()
