# ==============================================================================
# PAU Interconnect Backend API (v4.2-async-modular)
# ==============================================================================

import logging
import re
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from core.config import settings

# Import modular routers
from routers import system, cv, applications, admin, logbook

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger(__name__)

app = FastAPI(title="PAU Interconnect API", version="4.2-async-modular")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_URL],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.middleware("http")
async def add_custom_headers(request: Request, call_next):
    # Normalize path to handle double slashes
    if "//" in request.url.path:
        new_path = re.sub(r'/{2,}', '/', request.url.path)
        request.scope["path"] = new_path
        
    response = await call_next(request)
    response.headers["X-Backend-Version"] = "v4.2-async-modular"
    return response

# Include all modular routers
app.include_router(system.router, tags=["System"])
app.include_router(cv.router, tags=["CV Profile Operations"])
app.include_router(applications.router, tags=["Applications"])
app.include_router(admin.router, tags=["Admin Dashboard"])
app.include_router(logbook.router, tags=["Logbook"])

# ------------------------------------------------------------------------------
# Global Error Handler (MUST BE LAST)
# ------------------------------------------------------------------------------

@app.api_route("/{path_name:path}", methods=["GET", "POST", "PUT", "DELETE"])
async def resource_not_found(request: Request, path_name: str):
    logger.warning(f"404 Path Trapped: {path_name}")
    return JSONResponse({
        "error": "Endpoint not found.",
        "requested_path": path_name,
        "api_version": "v4.2-async-modular"
    }, status_code=404)
