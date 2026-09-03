"""
SkillPrep Portal - Application Configuration
Loads settings from environment variables or .env file.
"""
import os
from pathlib import Path
from dotenv import load_dotenv

# Resolve paths
BACKEND_DIR = Path(__file__).resolve().parent
ROOT_DIR = BACKEND_DIR.parent

# Load .env file (prioritize root, fallback to backend)
if (ROOT_DIR / ".env").exists():
    load_dotenv(ROOT_DIR / ".env")
elif (BACKEND_DIR / ".env").exists():
    load_dotenv(BACKEND_DIR / ".env")


class Settings:
    # App Settings
    APP_NAME: str = os.getenv("APP_NAME", "Placement Preparation Portal")
    APP_ENV: str = os.getenv("APP_ENV", "development")
    DEBUG: bool = os.getenv("DEBUG", "True").lower() in ("true", "1", "yes")
    HOST: str = os.getenv("HOST", "127.0.0.1")
    PORT: int = int(os.getenv("PORT", "8000"))

    # Security Settings
    SECRET_KEY: str = os.getenv(
        "SECRET_KEY", "skillprep_super_secret_session_key_change_in_production"
    )
    ALGORITHM: str = os.getenv("ALGORITHM", "HS256")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(
        os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "1440")
    )

    # MySQL Database Settings
    DB_HOST: str = os.getenv("DB_HOST", "127.0.0.1")
    DB_PORT: int = int(os.getenv("DB_PORT", "3306"))
    DB_USER: str = os.getenv("DB_USER", "root")
    DB_PASSWORD: str = os.getenv("DB_PASSWORD", "")
    DB_NAME: str = os.getenv("DB_NAME", "skillprep_db")
    DATABASE_URL: str = os.getenv("DATABASE_URL", "")

    # Google OAuth Settings
    GOOGLE_CLIENT_ID: str = os.getenv("GOOGLE_CLIENT_ID", "")
    GOOGLE_CLIENT_SECRET: str = os.getenv("GOOGLE_CLIENT_SECRET", "")
    GOOGLE_REDIRECT_URI: str = os.getenv(
        "GOOGLE_REDIRECT_URI", "http://localhost:8000/auth/google/callback"
    )

    # File Upload Settings
    UPLOAD_FOLDER_IMAGES: str = os.getenv(
        "UPLOAD_FOLDER_IMAGES", "userdata/profile_images"
    )
    UPLOAD_FOLDER_RESUMES: str = os.getenv(
        "UPLOAD_FOLDER_RESUMES", "userdata/resumes"
    )
    ALLOWED_EXTENSIONS_IMAGES: set = {"png", "jpg", "jpeg", "gif", "webp"}
    ALLOWED_EXTENSIONS_RESUMES: set = {"pdf", "doc", "docx"}

    @property
    def sync_database_url(self) -> str:
        """Construct the SQLAlchemy MySQL connection URL."""
        if self.DATABASE_URL:
            url = self.DATABASE_URL
            if url.startswith("mysql://"):
                url = url.replace("mysql://", "mysql+pymysql://", 1)
            return url

        pwd = f":{self.DB_PASSWORD}" if self.DB_PASSWORD else ""
        return (
            f"mysql+pymysql://{self.DB_USER}{pwd}@{self.DB_HOST}:{self.DB_PORT}/"
            f"{self.DB_NAME}?charset=utf8mb4"
        )


settings = Settings()
