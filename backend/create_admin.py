"""
One-time script to create an admin user in Supabase Auth + profiles table.
Run: python3 create_admin.py
"""
import os
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    raise RuntimeError("Supabase env vars not set. Check your .env file.")

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

# ---- CHANGE THESE TO YOUR DESIRED ADMIN CREDENTIALS ----
ADMIN_EMAIL = "admin@pau.edu.ng"
ADMIN_PASSWORD = "Admin@12345"
ADMIN_NAME = "Admin User"
# ---------------------------------------------------------

print(f"Creating admin user: {ADMIN_EMAIL}")

# 1. Create user in Supabase Auth
try:
    auth_res = supabase.auth.admin.create_user({
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD,
        "email_confirm": True,  # Skip email verification
    })
    user_id = auth_res.user.id
    print(f"Auth user created! ID: {user_id}")
except Exception as e:
    error_str = str(e)
    if "already been registered" in error_str or "already exists" in error_str:
        print("User already exists in Auth, fetching existing ID...")
        users = supabase.auth.admin.list_users()
        user_id = None
        for u in users:
            if hasattr(u, 'email') and u.email == ADMIN_EMAIL:
                user_id = u.id
                break
            elif isinstance(u, list):
                for inner_u in u:
                    if hasattr(inner_u, 'email') and inner_u.email == ADMIN_EMAIL:
                        user_id = inner_u.id
                        break
        if not user_id:
            print("ERROR: Could not find existing user. Please check Supabase dashboard.")
            exit(1)
        print(f"Found existing user ID: {user_id}")
    else:
        print(f"ERROR creating auth user: {e}")
        exit(1)

# 2. Upsert into profiles table with is_admin = True
try:
    supabase.table("profiles").upsert({
        "id": user_id,
        "full_name": ADMIN_NAME,
        "is_admin": True,
    }, on_conflict="id").execute()
    print("Profile set as admin!")
except Exception as e:
    print(f"ERROR updating profile: {e}")
    exit(1)

print("\n========================================")
print("  Admin account created successfully!")
print(f"  Email:    {ADMIN_EMAIL}")
print(f"  Password: {ADMIN_PASSWORD}")
print("========================================")
print("You can now log in with these credentials.")
