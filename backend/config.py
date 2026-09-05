"""
SkillPrep Portal - Application Configuration
Loads settings from environment variables or .env file.
"""
import os
from pathlib import Path
from dotenv import load_dotenv
from sqlalchemy.engine import URL, make_url

# Resolve paths
BACKEND_DIR = Path(__file__).resolve().parent
ROOT_DIR = BACKEND_DIR.parent

def load_environment(override: bool = True):
    """Load .env file, prioritizing project root and falling back to backend folder."""
    if (ROOT_DIR / ".env").exists():
        load_dotenv(ROOT_DIR / ".env", override=override)
    elif (BACKEND_DIR / ".env").exists():
        load_dotenv(BACKEND_DIR / ".env", override=override)

# Initial load of environment variables with override enabled so .env takes precedence
load_environment(override=True)


class Settings:
    # App Settings
    APP_NAME: str = os.getenv("APP_NAME", "Placement Preparation Portal")
    APP_ENV: str = os.getenv("APP_ENV", "development")
    DEBUG: bool = os.getenv("DEBUG", "False").lower() in ("true", "1", "yes")
    HOST: str = os.getenv("HOST", "0.0.0.0")  # 0.0.0.0 required for Render/Docker
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
    CORS_ORIGINS: list[str] = [
        origin.strip()
        for origin in os.getenv(
            "CORS_ORIGINS",
            "http://localhost:8000,http://127.0.0.1:8000",
        ).split(",")
        if origin.strip()
    ]

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

    # Resume analysis settings
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    GEMINI_MODEL: str = os.getenv("GEMINI_MODEL", "gemini-1.5-flash")  # gemini-3.6-flash does not exist
    RESUME_MAX_FILE_SIZE: int = int(os.getenv("RESUME_MAX_FILE_SIZE", str(5 * 1024 * 1024)))
    RESUME_MAX_TEXT_LENGTH: int = int(os.getenv("RESUME_MAX_TEXT_LENGTH", "30000"))

    def reload_env(self):
        """Force reload environment variables from .env file."""
        load_environment(override=True)

    @property
    def sync_database_url(self) -> URL:
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
            url = make_url(self.DATABASE_URL)
            if not url.drivername.startswith("mysql"):
                raise ValueError("DATABASE_URL must use a MySQL driver")
            if url.drivername != "mysql+pymysql":
                url = url.set(drivername="mysql+pymysql")

            # ssl-mode is a MySQL CLI option, not a PyMySQL connection argument.
            query = {
                key: value for key, value in url.query.items()
                if key.lower() != "ssl-mode"
            }
            if "charset" not in query:
                query["charset"] = "utf8mb4"
            return url.set(query=query)

        # Otherwise, construct URL from individual parameters (local MySQL)
        return URL.create(
            "mysql+pymysql",
            username=self.DB_USER,
            password=self.DB_PASSWORD,
            host=self.DB_HOST,
            port=self.DB_PORT,
            database=self.DB_NAME,
            query={"charset": "utf8mb4"},
        )

    @property
    def database_target(self) -> str:
        """Return a log-safe database target without username or password."""
        url = make_url(self.sync_database_url)
        host = url.host or "unknown-host"
        port = f":{url.port}" if url.port else ""
        database = url.database or "unknown-database"
        return f"{host}{port}/{database}"

    def get_database_ssl_options(self) -> dict:
        """
        Extract SSL options for PyMySQL from DATABASE_URL.
        
        Returns a dict with SSL settings for SQLAlchemy's connect_args.
        For Aiven (ssl-mode=REQUIRED), enables TLS without certificate verification
        using both the legacy ssl dict AND PyMySQL 2.x dedicated ssl_* parameters.
        
        Usage in database.py:
            engine = create_engine(
                settings.sync_database_url,
                connect_args=settings.get_database_ssl_options(),
                pool_pre_ping=True,
                pool_recycle=3600,
            )
        """
        connect_args = {}
        
        # Translate the URL's MySQL SSL mode to PyMySQL's supported SSL options.
        url = make_url(self.DATABASE_URL) if self.DATABASE_URL else None
        ssl_mode = ""
        if url:
            for key, value in url.query.items():
                if key.lower() == "ssl-mode":
                    ssl_mode = str(value).lower()
                    break

        ssl_required = self.DB_SSL_ENABLED or ssl_mode in {
            "required",
            "verify-ca",
            "verify-identity",
        }

        if ssl_required:
            # PyMySQL 2.x approach: pass ssl dict + dedicated ssl_* top-level params.
            # ssl dict with no 'ca' key => hasnoca=True => CERT_NONE (no cert verification).
            # This is safe for Aiven which uses self-signed certs and requires encryption.
            connect_args["ssl"] = {"check_hostname": False}
            # PyMySQL 2.x dedicated parameters (more explicit than the dict approach)
            connect_args["ssl_verify_cert"] = False
            connect_args["ssl_verify_identity"] = False
        
        return connect_args


settings = Settings()
