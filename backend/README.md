# PAU Interconnect Backend

This is the FastAPI backend for the PAU Interconnect platform.

## 🚀 Getting Started

### Prerequisites
- Python 3.10+
- Virtual environment (venv)

### Installation
1. `cd backend`
2. `python -m venv .venv`
3. `source .venv/bin/activate  # On Windows: .venv\Scripts\activate`
4. `pip install -r requirements.txt`

### Environment Variables
Create a `.env` file with:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `OPENAI_API_KEY`
- `RESEND_API_KEY`

### Development
Run the server with auto-reload:
```bash
python -m uvicorn main:app --reload
```

## 🛠️ Components
- **Routers**: API endpoints organized by feature.
- **Services**: Integration with Supabase, OpenAI, and Resend.
- **Schemas**: Pydantic models for data validation.
- **Core**: App configuration and security settings.
