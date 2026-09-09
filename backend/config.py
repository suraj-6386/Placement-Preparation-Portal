"""
SkillPrep Portal - Application Configuration
Loads settings from environment variables or .env file.
"""
import os
import ssl
from pathlib import Path
from dotenv import load_dotenv
from sqlalchemy.engine import URL, make_url

# Resolve paths
BACKEND_DIR = Path(__file__).resolve().parent
ROOT_DIR = BACKEND_DIR.parent

def load_environment(override: bool = False):
    """
    Load .env file, prioritizing project root and falling back to backend folder.
    Uses override=False so system and container environment variables (e.g., Render)
    always take precedence over local .env files.
    """
    if (ROOT_DIR / ".env").exists():
        load_dotenv(ROOT_DIR / ".env", override=override)
    elif (BACKEND_DIR / ".env").exists():
        load_dotenv(BACKEND_DIR / ".env", override=override)

# Initial load of environment variables with override=False so environment variables take precedence
load_environment(override=False)


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

    # MySQL Database Settings (Default to local development values)
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
    GEMINI_MODEL: str = os.getenv("GEMINI_MODEL", "gemini-1.5-flash")
    RESUME_MAX_FILE_SIZE: int = int(os.getenv("RESUME_MAX_FILE_SIZE", str(5 * 1024 * 1024)))
    RESUME_MAX_TEXT_LENGTH: int = int(os.getenv("RESUME_MAX_TEXT_LENGTH", "30000"))

    def reload_env(self):
        """Reload environment variables without overriding system values."""
        load_environment(override=False)

    @property
    def is_production(self) -> bool:
        """Return True if running in production environment (Render or APP_ENV=production)."""
        render_environment = os.getenv("RENDER", "").strip().lower() in {
            "1", "true", "yes", "on"
        }
        return (
            self.APP_ENV.lower() == "production"
            or render_environment
            or bool(os.getenv("RENDER_SERVICE_ID", "").strip())
        )

    @property
    def sync_database_url(self) -> URL:
        """
        Construct the SQLAlchemy MySQL connection URL.
        
        Rules:
        1. In production (Render or APP_ENV=production):
           - DATABASE_URL is required.
           - NEVER connects to 127.0.0.1, localhost, or local MySQL credentials.
        2. In local development:
           - Uses DATABASE_URL if set, otherwise builds from DB_HOST, DB_PORT, DB_USER, etc.
        3. Sanitizes URL query parameters to ensure PyMySQL compatibility:
           - Translates or strips ssl-mode, ssl_mode, ssl to connect_args.
           - Normalizes driver to mysql+pymysql.
        """
        if self.is_production:
            if not self.DATABASE_URL or not self.DATABASE_URL.strip():
                raise ValueError(
                    "CRITICAL CONFIGURATION ERROR: Production environment detected (APP_ENV=production or RENDER), "
                    "but DATABASE_URL is not set. A valid production database connection string (e.g. Aiven MySQL Service URI) "
                    "must be configured in Render environment variables."
                )

            url = make_url(self.DATABASE_URL.strip())
            if not url.drivername.startswith("mysql"):
                raise ValueError(
                    f"CRITICAL CONFIGURATION ERROR: DATABASE_URL must use a MySQL driver, got '{url.drivername}'."
                )

            host_lower = (url.host or "").lower()
            if host_lower in ("127.0.0.1", "localhost", "0.0.0.0", "::1"):
                raise ValueError(
                    f"CRITICAL CONFIGURATION ERROR: Production DATABASE_URL points to '{host_lower}'. "
                    "Local database connections are strictly forbidden in production. "
                    "Configure Render with your remote Aiven MySQL Service URI."
                )

            if url.drivername != "mysql+pymysql":
                url = url.set(drivername="mysql+pymysql")

            # Strip query arguments that PyMySQL does not support as URL parameters
            query = {
                key: value for key, value in url.query.items()
                if key.lower() not in {"ssl-mode", "ssl_mode", "sslmode", "ssl"}
            }
            if "charset" not in query:
                query["charset"] = "utf8mb4"
            return url.set(query=query)

        # Local development path:
        if self.DATABASE_URL and self.DATABASE_URL.strip():
            url = make_url(self.DATABASE_URL.strip())
            if not url.drivername.startswith("mysql"):
                raise ValueError("DATABASE_URL must use a MySQL driver")
            if url.drivername != "mysql+pymysql":
                url = url.set(drivername="mysql+pymysql")

            query = {
                key: value for key, value in url.query.items()
                if key.lower() not in {"ssl-mode", "ssl_mode", "sslmode", "ssl"}
            }
            if "charset" not in query:
                query["charset"] = "utf8mb4"
            return url.set(query=query)

        # Build URL from individual parameters for local MySQL
        return URL.create(
            "mysql+pymysql",
            username=self.DB_USER,
            password=self.DB_PASSWORD,
            host=self.DB_HOST,
            port=self.DB_PORT,
            database=self.DB_NAME,
            query={"charset": "utf8mb4"},
        )

    def is_database_ssl_required(self) -> bool:
        """Determine if SSL/TLS is required based on configuration and host."""
        if self.DB_SSL_ENABLED:
            return True

        if self.DATABASE_URL and self.DATABASE_URL.strip():
            try:
                url = make_url(self.DATABASE_URL.strip())
                for key, value in url.query.items():
                    key_lower = key.lower()
                    val_lower = str(value).lower()
                    if key_lower in {"ssl-mode", "ssl_mode", "sslmode"}:
                        if val_lower in {"required", "verify-ca", "verify-identity", "prefer"}:
                            return True
                    if key_lower == "ssl" and val_lower in {"true", "1", "yes", "required"}:
                        return True
                host_lower = (url.host or "").lower()
                if host_lower.endswith(".aivencloud.com"):
                    return True
            except Exception:
                pass

        if self.is_production:
            return True

        return False

    def get_database_ssl_options(self) -> dict:
        """
        Extract SSL options for PyMySQL from configuration and DATABASE_URL.

        Production connections require certificate-verified TLS. The CA may be supplied
        as a Render Secret File path (DB_SSL_CA) or as PEM text (DB_SSL_CA_CERT).
        """
        if not self.is_database_ssl_required():
            return {}

        ca_value = (
            os.getenv("DB_SSL_CA", "").strip()
            or os.getenv("DB_SSL_CA_CERT", "").strip()
            or os.getenv("AIVEN_CA_CERT", "").strip()
        )
        if ca_value and os.path.isfile(ca_value):
            context = ssl.create_default_context(cafile=ca_value)
        elif "BEGIN CERTIFICATE" in ca_value:
            context = ssl.create_default_context(cadata=ca_value)
        elif self.is_production:
            raise ValueError(
                "Production Aiven TLS requires DB_SSL_CA to point to the Aiven CA certificate "
                "or DB_SSL_CA_CERT to contain its PEM contents."
            )
        else:
            context = ssl.create_default_context()

        context.check_hostname = True
        context.verify_mode = ssl.CERT_REQUIRED
        return {"ssl": context}

    @property
    def database_diagnostics(self) -> dict:
        """
        Return safe database diagnostics for startup logging.
        Strictly excludes usernames, passwords, DATABASE_URL, tokens, and secrets.
        """
        try:
            url = self.sync_database_url
            host = url.host or "unknown-host"
            port = url.port or 3306
            database = url.database or "unknown-database"
        except Exception:
            # If sync_database_url raises (e.g. production validation failure), try extracting from raw DATABASE_URL
            host = "not-configured"
            port = "not-configured"
            database = "not-configured"
            if self.DATABASE_URL and self.DATABASE_URL.strip():
                try:
                    raw = make_url(self.DATABASE_URL.strip())
                    host = raw.host or "unknown-host"
                    port = raw.port or 3306
                    database = raw.database or "unknown-database"
                except Exception:
                    pass
            elif not self.is_production:
                host = self.DB_HOST
                port = self.DB_PORT
                database = self.DB_NAME

        return {
            "host": host,
            "port": port,
            "database": database,
            "ssl_enabled": self.is_database_ssl_required(),
        }

    @property
    def database_target(self) -> str:
        """Return a log-safe database target without username or password."""
        diag = self.database_diagnostics
        port_part = f":{diag['port']}" if diag.get("port") else ""
        return f"{diag.get('host', 'unknown')}{port_part}/{diag.get('database', 'unknown')}"


settings = Settings()

