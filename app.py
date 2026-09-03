"""
Placement Preparation Portal - Single Entry Point
==================================================
Start the complete application with one command:

    python app.py

The application will be available at http://localhost:8000
"""
import sys
import os

# Add the backend directory to Python path so all backend modules can be found
BACKEND_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "backend")
sys.path.insert(0, BACKEND_DIR)

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
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG,
        reload_dirs=[BACKEND_DIR] if settings.DEBUG else None,
    )
