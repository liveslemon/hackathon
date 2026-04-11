import os
import smtplib
import socket
from dotenv import load_dotenv

load_dotenv()

SMTP_EMAIL = os.getenv("SMTP_EMAIL")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD")

def test_port(port, use_ssl=False):
    print(f"\n--- Testing Port {port} ({'SSL' if use_ssl else 'STARTTLS'}) ---")
    try:
        if use_ssl:
            server = smtplib.SMTP_SSL("smtp.gmail.com", port, timeout=10)
        else:
            server = smtplib.SMTP("smtp.gmail.com", port, timeout=10)
            server.starttls()
        
        server.login(SMTP_EMAIL, SMTP_PASSWORD)
        server.quit()
        print(f"Success: Port {port} is reachable and login successful.")
        return True
    except socket.timeout:
        print(f"Failure: Port {port} timed out.")
    except Exception as e:
        print(f"Failure: Port {port} error: {e}")
    return False

if __name__ == "__main__":
    test_port(465, use_ssl=True)
    test_port(587, use_ssl=False)
