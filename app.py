"""
Placement Preparation Portal - Root Entry Point
================================================
This file serves TWO purposes:
  1. Direct execution:  python app.py
  2. uvicorn import:    uvicorn app:app --host 0.0.0.0 --port $PORT

Both modes work from the REPO ROOT directory.

For Render deployment, the start command is:
    uvicorn app:app --host 0.0.0.0 --port $PORT
"""
import sys
import os

# ---------------------------------------------------------------------------
# Step 1: Add backend/ to sys.path so bare imports (config, database, etc.)
#         resolve when Python's CWD is the repo root.
# ---------------------------------------------------------------------------
ROOT_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.join(ROOT_DIR, "backend")

for import_path in (ROOT_DIR, BACKEND_DIR):
    if import_path not in sys.path:
        sys.path.insert(0, import_path)

# ---------------------------------------------------------------------------
# Step 2: Change CWD to backend/ so all relative paths inside backend modules
#         (dataset/, userdata/, .env) resolve correctly.
# ---------------------------------------------------------------------------
os.chdir(BACKEND_DIR)

# ---------------------------------------------------------------------------
# Step 3: Load .env file (local dev only — Render injects env vars natively).
# ---------------------------------------------------------------------------
try:
    from dotenv import load_dotenv
    env_root = os.path.join(ROOT_DIR, ".env")
    env_backend = os.path.join(BACKEND_DIR, ".env")
    if os.path.exists(env_root):
        load_dotenv(env_root, override=False)
    elif os.path.exists(env_backend):
        load_dotenv(env_backend, override=False)
except ImportError:
    pass  # python-dotenv not installed; rely on OS environment

# ---------------------------------------------------------------------------
# Step 4: Import the FastAPI app object — MUST be at module level so that
#         `uvicorn app:app` can import it when used as the Render start command.
#         Use the qualified module name to avoid importing this root module again.
# ---------------------------------------------------------------------------
from backend.app import app  # noqa: F401, E402

# ---------------------------------------------------------------------------
# Step 5: Direct execution entry point (python app.py from repo root)
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    import uvicorn
    from config import settings  # noqa: E402

    port = int(os.environ.get("PORT", str(settings.PORT)))

    print("=" * 60)
    print("  Placement Preparation Portal")
    print("=" * 60)
    print(f"  Starting server on http://0.0.0.0:{port}")
    print(f"  Open your browser at: http://localhost:{port}")
    print("  Press Ctrl+C to stop the server.")
    print("=" * 60)

    uvicorn.run(
        "app:app",  # This root app.py's 'app' object
        host=settings.HOST,
        port=port,
        reload=settings.DEBUG,
        reload_dirs=[BACKEND_DIR, ROOT_DIR] if settings.DEBUG else None,
    )
