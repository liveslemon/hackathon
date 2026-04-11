import os
import logging
from dotenv import load_dotenv
from supabase import create_client, Client

# Configure logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    logger.error("Error: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not found in .env")
    exit(1)

# Initialize Supabase client
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

def delete_all_applications():
    """Deletes all records from the applied_internships table."""
    try:
        logger.info("Fetching record count before deletion...")
        # Get count first
        count_res = supabase.table("applied_internships").select("id", count="exact").execute()
        total_records = count_res.count if count_res.count is not None else 0
        
        if total_records == 0:
            logger.info("No records found in 'applied_internships'. Nothing to delete.")
            return

        logger.info(f"Found {total_records} records. Proceeding with deletion...")
        
        # In Supabase/Postgrest, a filter is required for DELETE. 
        # We use a filter that will match all valid UUIDs or just check for non-null IDs.
        res = supabase.table("applied_internships").delete().neq("id", "00000000-0000-0000-0000-000000000000").execute()
        
        logger.info(f"Successfully deleted records from 'applied_internships'.")
        
    except Exception as e:
        logger.error(f"Failed to delete records: {e}")

if __name__ == "__main__":
    confirm = input("Are you sure you want to delete ALL records in 'applied_internships'? (y/N): ")
    if confirm.lower() == 'y':
        delete_all_applications()
    else:
        logger.info("Deletion cancelled.")
