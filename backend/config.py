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
    
    # SSL/TLS Settings (for Aiven and other remote databases)
    DB_SSL_ENABLED: bool = os.getenv("DB_SSL_ENABLED", "False").lower() in ("true", "1", "yes")

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
        """
        Construct the SQLAlchemy MySQL connection URL.
        
        Supports two modes:
        1. Full DATABASE_URL (for Aiven on Render)
        2. Individual parameters: DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME (for local MySQL)
        
        Returns a clean URL with PyMySQL-compatible parameters.
        Use get_database_ssl_options() to get SSL options for create_engine().
        """
        # If DATABASE_URL is provided (recommended for Aiven), use it
        if self.DATABASE_URL:
            url = self.DATABASE_URL
            # Ensure mysql:// is converted to mysql+pymysql://
            if url.startswith("mysql://"):
                url = url.replace("mysql://", "mysql+pymysql://", 1)
            
            # Remove ssl-mode parameter (not supported by PyMySQL)
            # PyMySQL SSL options are passed via connect_args instead
            url = url.replace("?ssl-mode=REQUIRED", "")
            url = url.replace("&ssl-mode=REQUIRED", "")
            
            # Ensure charset is present
            if "charset=" not in url:
                url += "?charset=utf8mb4" if "?" not in url else "&charset=utf8mb4"
            
            return url

        # Otherwise, construct URL from individual parameters (local MySQL)
        pwd = f":{self.DB_PASSWORD}" if self.DB_PASSWORD else ""
        url = (
            f"mysql+pymysql://{self.DB_USER}{pwd}@{self.DB_HOST}:{self.DB_PORT}/"
            f"{self.DB_NAME}?charset=utf8mb4"
        )
        
        # Add SSL parameter if enabled (for local databases requiring SSL)
        if self.DB_SSL_ENABLED:
            url += "&ssl_verify_cert=false"
        
        return url

    def get_database_ssl_options(self) -> dict:
        """
        Extract SSL options for PyMySQL from DATABASE_URL.
        
        Returns a dict with 'ssl' key containing SSL settings for SQLAlchemy's connect_args.
        For Aiven (ssl-mode=REQUIRED), returns PyMySQL-compatible SSL options.
        
        Usage in database.py:
            engine = create_engine(
                settings.sync_database_url,
                connect_args=settings.get_database_ssl_options(),
                pool_pre_ping=True,
                pool_recycle=3600,
            )
        """
        connect_args = {}
        
        # Check if DATABASE_URL indicates SSL requirement (for Aiven)
        if self.DATABASE_URL and "ssl-mode=REQUIRED" in self.DATABASE_URL:
            # PyMySQL SSL options for secure connection
            connect_args["ssl"] = {
                "check_hostname": False,  # Aiven uses self-signed certs
                "verify_cert": False,     # Skip certificate verification (Aiven requirement)
            }
        
        return connect_args


settings = Settings()
