# ==============================================================================
# PAU Interconnect Backend API (v4.2-async-modular)
# ==============================================================================

import logging
import re
import uuid as uuid_lib
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from core.config import settings, log_startup_diagnostics

# Import modular routers
from routers import system, cv, applications, admin, logbook, profiles, analysis

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage startup/shutdown lifecycle — close HTTP clients on shutdown."""
    log_startup_diagnostics()
    yield
    # Shutdown: close long-lived HTTP clients
    try:
        from services.embedding_service import _EMBEDDING_CLIENT
        await _EMBEDDING_CLIENT.aclose()
        logger.info("Embedding HTTP client closed.")
    except Exception:
        pass
    try:
        from services.llm_service import llm_client
        for provider in llm_client.providers:
            await provider["client"].close()
        logger.info("LLM clients closed.")
    except Exception:
        pass


app = FastAPI(
    title="PAU Interconnect API",
    description="AI-powered internship matching platform for Pan-Atlantic University",
    version="4.2.0",
    lifespan=lifespan,
)

# --- CORS (Improvement 01: no wildcard + credentials) ---
_origins = [o.strip() for o in settings.FRONTEND_URL.split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)


# --- Request-ID + access-log middleware (Improvement 10) ---
@app.middleware("http")
async def request_middleware(request: Request, call_next):
    # Assign request ID
    request_id = request.headers.get("X-Request-ID", str(uuid_lib.uuid4())[:8])
    request.state.request_id = request_id

    # Normalize double-slash paths
    if "//" in request.url.path:
        request.scope["path"] = re.sub(r"/{2,}", "/", request.url.path)

    import time
    start = time.time()
    response = await call_next(request)
    duration_ms = round((time.time() - start) * 1000, 2)

    response.headers["X-Request-ID"] = request_id

    logger.info(
        "request_completed",
        extra={
            "request_id": request_id,
            "method": request.method,
            "path": request.url.path,
            "status": response.status_code,
            "duration_ms": duration_ms,
        },
    )
    return response


# --- Global exception handler (Improvement 03) ---
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    error_id = str(uuid_lib.uuid4())[:8]
    logger.error(f"Unhandled error [{error_id}]: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={
            "error": "An unexpected error occurred.",
            "reference": error_id,
        },
    )


# Include all modular routers
app.include_router(system.router, tags=["System"])
app.include_router(cv.router, tags=["CV Profile Operations"])
app.include_router(applications.router, tags=["Applications"])
app.include_router(admin.router, tags=["Admin Dashboard"])
app.include_router(logbook.router, tags=["Logbook"])
app.include_router(profiles.router, tags=["Profiles"])
app.include_router(analysis.router, tags=["Analysis"])

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

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
