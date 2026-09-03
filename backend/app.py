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
    init_db()
    print(f"  [OK] Connected to MySQL database '{settings.DB_NAME}'")
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
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register REST API router
app.include_router(api_router)

# Root-level Google OAuth routes to strictly match registered redirect URI:
# http://localhost:8000/auth/google/callback
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
