"""
Placement Preparation Portal - Main FastAPI Application
FastAPI application factory. Run via the project root entry point:

    python app.py        (from the project root folder)
"""
from pathlib import Path
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from config import settings
from database import init_db
from routes import router as api_router

# Directory paths
BACKEND_DIR = Path(__file__).resolve().parent
FRONTEND_DIR = BACKEND_DIR.parent / "frontend"
USERDATA_DIR = BACKEND_DIR / "userdata"


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Application lifespan context manager:
    Initializes database tables on application startup.
    """
    # Verify and create MySQL tables if needed
    try:
        diag = settings.database_diagnostics
        print(f"  [DB DIAGNOSTICS] Database Host: {diag['host']}")
        print(f"  [DB DIAGNOSTICS] Database Port: {diag['port']}")
        print(f"  [DB DIAGNOSTICS] Database Name: {diag['database']}")
        print(f"  [DB DIAGNOSTICS] SSL/TLS Enabled: {diag['ssl_enabled']}")
        init_db()
    except Exception as exc:
        # Print safe diagnostics without leaking credentials or secrets
        print("  [ERROR] Database initialization failed; the application cannot start.")
        print(f"  [ERROR] Exception type: {type(exc).__name__}")

        exc_str = str(exc).lower()
        if "name or service not known" in exc_str or "getaddrinfo failed" in exc_str or "errno -2" in exc_str:
            print("  [TROUBLESHOOTING] DNS resolution failure: The configured database hostname does not exist in DNS.")
            print("  [TROUBLESHOOTING] Check your Aiven Console. If the service was recreated or restarted, copy the exact current Service URI into Render's DATABASE_URL.")
        elif "unknown database" in exc_str or "1049" in exc_str:
            print("  [TROUBLESHOOTING] Database name mismatch: Aiven MySQL provisions with 'defaultdb'. Ensure DATABASE_URL targets '/defaultdb'.")
        elif "access denied" in exc_str or "1045" in exc_str:
            print("  [TROUBLESHOOTING] Authentication failure: Verify the username and password in Render's DATABASE_URL match Aiven console.")
        elif "ssl" in exc_str or "certificate" in exc_str:
            print("  [TROUBLESHOOTING] SSL negotiation issue: Ensure SSL options are enabled and required for remote Aiven connections.")

        raise RuntimeError(
            f"Database initialization failed: {type(exc).__name__}"
        ) from None
    else:
        print(f"  [OK] Connected to database: {settings.database_target}")
        print("  [OK] Database tables verified/initialized")
    yield


# Initialize FastAPI application
app = FastAPI(
    title="Placement Preparation Portal",
    description="Full-stack portal for Aptitude, Coding, and Interview Preparation.",
    version="2.0.0",
    lifespan=lifespan,
)

# Configure Cross-Origin Resource Sharing (CORS)
# In production, allow all origins so the Render HTTPS URL isn't blocked.
# Set CORS_ORIGINS env var explicitly to restrict to specific domains.
_cors_origins_env = settings.CORS_ORIGINS
_default_localhost_only = ["http://localhost:8000", "http://127.0.0.1:8000"]
_allow_all_origins = (
    settings.APP_ENV == "production"
    and _cors_origins_env == _default_localhost_only
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"] if _allow_all_origins else _cors_origins_env,
    allow_credentials=not _allow_all_origins,  # credentials require specific origins, not wildcard
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register REST API router
app.include_router(api_router)

# Root-level Google OAuth routes to strictly match the configured redirect URI.
from typing import Optional
from fastapi import Depends
from sqlalchemy.orm import Session
from database import get_db
from routes import google_login_redirect, google_callback


@app.get("/auth/google/login", summary="Google OAuth Login Redirect", tags=["Google OAuth"])
def root_google_login():
    return google_login_redirect()


@app.get("/auth/google/callback", summary="Google OAuth Callback Handler", tags=["Google OAuth"])
def root_google_callback(
    code: Optional[str] = None,
    error: Optional[str] = None,
    db: Session = Depends(get_db),
):
    return google_callback(code=code, error=error, db=db)

# Ensure upload directories exist and mount static file routes
PROFILE_IMAGES_DIR = USERDATA_DIR / "profile_images"
RESUMES_DIR = USERDATA_DIR / "resumes"
PROFILE_IMAGES_DIR.mkdir(parents=True, exist_ok=True)
RESUMES_DIR.mkdir(parents=True, exist_ok=True)

app.mount("/uploads", StaticFiles(directory=str(PROFILE_IMAGES_DIR)), name="uploads")

# Mount frontend assets and serve HTML pages
if FRONTEND_DIR.exists():
    if (FRONTEND_DIR / "assets").exists():
        app.mount(
            "/assets",
            StaticFiles(directory=str(FRONTEND_DIR / "assets")),
            name="assets",
        )
    if (FRONTEND_DIR / "images").exists():
        app.mount(
            "/images",
            StaticFiles(directory=str(FRONTEND_DIR / "images")),
            name="images",
        )

    @app.get("/", summary="Home Page")
    async def serve_home():
        return FileResponse(str(FRONTEND_DIR / "index.html"))

    @app.get("/{page_name}.html", summary="Frontend HTML Pages")
    async def serve_html_page(page_name: str):
        page_path = FRONTEND_DIR / f"{page_name}.html"
        if page_path.exists():
            return FileResponse(str(page_path))
        return FileResponse(str(FRONTEND_DIR / "index.html"))
