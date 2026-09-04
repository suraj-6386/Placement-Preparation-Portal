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
        
        # Translate the URL's MySQL SSL mode to PyMySQL's supported SSL options.
        url = make_url(self.DATABASE_URL) if self.DATABASE_URL else None
        ssl_mode = ""
        if url:
            for key, value in url.query.items():
                if key.lower() == "ssl-mode":
                    ssl_mode = str(value).lower()
                    break

        if self.DB_SSL_ENABLED or ssl_mode in {
            "required",
            "verify-ca",
            "verify-identity",
        }:
            connect_args["ssl"] = {
                "check_hostname": False,
            }
        
        return connect_args


settings = Settings()
