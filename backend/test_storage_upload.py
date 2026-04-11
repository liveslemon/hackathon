import os

import requests
from fpdf import FPDF

# --- Configuration ---
# URL of your running FastAPI backend
BACKEND_URL = "http://localhost:8000"
# A valid user ID that exists in your 'profiles' table in Supabase
VALID_USER_ID = "12b91698-43b7-4e68-8a08-82115de1b5e8"
# Path for the temporary CV file
DUMMY_CV_PATH = "HillaryIlona_CV.pdf"


def run_storage_upload_test():
    """
    Tests the CV upload functionality to Supabase Storage.
    1. Creates a dummy PDF file.
    2. Uploads it via the /upload-and-analyze endpoint.
    3. Verifies that a signed URL for the CV is returned.
    4. Cleans up the dummy file.
    """
    print("--- Starting Storage Upload Test ---")

    # 1. Create a dummy PDF
    try:
        print(f"Creating dummy PDF: {DUMMY_CV_PATH}")
        pdf = FPDF()
        pdf.add_page()
        pdf.set_font("Arial", size=16)
        pdf.cell(200, 10, txt="Test CV for Storage Upload", ln=1, align="C")
        pdf.output(DUMMY_CV_PATH)
    except Exception as e:
        print(f"\n[ERROR] Failed to create dummy PDF: {e}")
        return

    # 2. Upload the file
    try:
        print("Uploading file to the backend...")
        with open(DUMMY_CV_PATH, "rb") as f:
            files = {"file": (DUMMY_CV_PATH, f, "application/pdf")}
            data = {"user_id": VALID_USER_ID}
            response = requests.post(
                f"{BACKEND_URL}/upload-and-analyze", data=data, files=files, timeout=60
            )

        response.raise_for_status()
        response_data = response.json()

        # 3. Verify the response
        if "cv_url" in response_data and response_data["cv_url"]:
            print("\n[SUCCESS] File uploaded successfully!")
            print(f"Message from backend: {response_data.get('message')}")
            print(f"Returned CV URL: {response_data['cv_url']}")
        elif "error" in response_data:
            print(f"\n[FAILURE] Backend returned an error: {response_data['error']}")
        else:
            print(
                f"\n[FAILURE] The response did not contain a 'cv_url'. Response: {response_data}"
            )

    except requests.exceptions.RequestException as e:
        print(f"\n[ERROR] A network request to the backend failed: {e}")
    except Exception as e:
        print(f"\n[ERROR] An unexpected error occurred: {e}")
    finally:
        # 4. Clean up the dummy file
        if os.path.exists(DUMMY_CV_PATH):
            print(f"\nCleaning up {DUMMY_CV_PATH}...")
            os.remove(DUMMY_CV_PATH)
            print("--- Test Finished ---")


if __name__ == "__main__":
    run_storage_upload_test()
