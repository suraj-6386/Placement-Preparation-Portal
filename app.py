"""
Placement Preparation Portal - Single Entry Point
==================================================
Start the complete application with one command:

    python app.py

The application will be available at http://localhost:8000
"""
import sys
import os

# Resolve paths
ROOT_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.join(ROOT_DIR, "backend")
sys.path.insert(0, BACKEND_DIR)

from dotenv import load_dotenv
if os.path.exists(os.path.join(ROOT_DIR, ".env")):
    load_dotenv(os.path.join(ROOT_DIR, ".env"), override=True)
elif os.path.exists(os.path.join(BACKEND_DIR, ".env")):
    load_dotenv(os.path.join(BACKEND_DIR, ".env"), override=True)

# Change working directory to backend so relative paths (dataset/, userdata/) resolve correctly
os.chdir(BACKEND_DIR)

import uvicorn
from config import settings

if __name__ == "__main__":
    print("=" * 60)
    print("  Placement Preparation Portal")
    print("=" * 60)
    print(f"  Starting server on http://{settings.HOST}:{settings.PORT}")
    print(f"  Open your browser at: http://localhost:{settings.PORT}")
    print("  Press Ctrl+C to stop the server.")
    print("=" * 60)
    uvicorn.run(
        "app:app",
        host="0.0.0.0",
        port=settings.PORT,
        reload=settings.DEBUG,
        reload_dirs=[BACKEND_DIR, ROOT_DIR] if settings.DEBUG else None,
    )
