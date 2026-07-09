import os
import socket
from dotenv import load_dotenv
from supabase import create_client

# Force IPv4 resolution to fix macOS [Errno 8] issues
old_getaddrinfo = socket.getaddrinfo
def new_getaddrinfo(*args, **kwargs):
    responses = old_getaddrinfo(*args, **kwargs)
    return [response for response in responses if response[0] == socket.AF_INET]
socket.getaddrinfo = new_getaddrinfo

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    raise RuntimeError("Supabase env vars not set. Check your .env file.")

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

TEST_ACCOUNTS = [
    {
        "email": "admin@pau.edu.ng",
        "password": "Password123!",
        "name": "Admin User",
        "role": "admin",
        "is_admin": True
    },
    {
        "email": "employer@pau.edu.ng",
        "password": "Password123!",
        "name": "Tech Corp Employer",
        "role": "employer",
        "is_admin": False
    },
    {
        "email": "student@pau.edu.ng",
        "password": "Password123!",
        "name": "Student User",
        "role": "student",
        "is_admin": False
    }
]

for account in TEST_ACCOUNTS:
    email = account["email"]
    password = account["password"]
    print(f"\nProcessing {email}...")

    # 1. Create user in Supabase Auth
    user_id = None
    try:
        auth_res = supabase.auth.admin.create_user({
            "email": email,
            "password": password,
            "email_confirm": True,
        })
        user_id = auth_res.user.id
        print(f"Auth user created! ID: {user_id}")
    except Exception as e:
        error_str = str(e)
        if "already been registered" in error_str or "already exists" in error_str:
            print("User already exists in Auth, fetching existing ID...")
            users = supabase.auth.admin.list_users()
            for u in users:
                if hasattr(u, 'email') and u.email == email:
                    user_id = u.id
                    break
                elif isinstance(u, list):
                    for inner_u in u:
                        if hasattr(inner_u, 'email') and inner_u.email == email:
                            user_id = inner_u.id
                            break
            if user_id:
                print(f"Found existing user ID: {user_id}")
            else:
                print(f"ERROR: Could not find existing user for {email}.")
                continue
        else:
            print(f"ERROR creating auth user: {e}")
            continue

    # 2. Upsert into profiles table
    if user_id:
        try:
            supabase.table("profiles").upsert({
                "id": user_id,
                "full_name": account["name"],
                "role": account["role"],
                "is_admin": account["is_admin"],
            }, on_conflict="id").execute()
            print(f"Profile updated for {email}!")
        except Exception as e:
            print(f"ERROR updating profile for {email}: {e}")

print("\n========================================")
print("  Test accounts processing complete!")
print("========================================")
