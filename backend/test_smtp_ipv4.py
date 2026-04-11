import os
import smtplib
import socket
from dotenv import load_dotenv

load_dotenv()

SMTP_EMAIL = os.getenv("SMTP_EMAIL")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD")

def test_ipv4(port, use_ssl=False):
    print(f"\n--- Testing Port {port} ({'SSL' if use_ssl else 'STARTTLS'}) - FORCING IPv4 ---")
    try:
        # Resolve to IPv4
        addr_info = socket.getaddrinfo("smtp.gmail.com", port, socket.AF_INET, socket.SOCK_STREAM)
        ipv4_addr = addr_info[0][4][0]
        print(f"Resolved smtp.gmail.com to IPv4: {ipv4_addr}")
        
        if use_ssl:
            server = smtplib.SMTP_SSL(ipv4_addr, port, timeout=10)
        else:
            server = smtplib.SMTP(ipv4_addr, port, timeout=10)
            server.starttls()
        
        server.login(SMTP_EMAIL, SMTP_PASSWORD)
        server.quit()
        print(f"Success: IPv4 connection to Port {port} successful.")
        return True
    except Exception as e:
        print(f"Failure: IPv4 Port {port} error: {e}")
    return False

if __name__ == "__main__":
    test_ipv4(465, use_ssl=True)
    test_ipv4(587, use_ssl=False)
