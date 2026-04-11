import os
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("Error: Supabase credentials not found.")
    exit(1)

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

def check_internships():
    try:
        res = supabase.table("internships").select("*").execute()
        for job in res.data:
            print(f"ID: {job.get('id')} | Role: {job.get('role')} | Employer Email: {job.get('employer_email')}")
    except Exception as e:
        print(f"Error fetching internships: {e}")

if __name__ == "__main__":
    check_internships()
