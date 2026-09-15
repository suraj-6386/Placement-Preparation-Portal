"""
SkillPrep Portal - Database Connection & Session Management
Uses SQLAlchemy ORM with PyMySQL driver for MySQL.
"""
from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import declarative_base, sessionmaker
from config import settings

# Create SQLAlchemy engine with connection pool pre-ping
# Includes PyMySQL-compatible SSL options for Aiven
engine = create_engine(
    settings.sync_database_url,
    connect_args=settings.get_database_ssl_options(),
    pool_pre_ping=True,
    pool_recycle=3600,
)

# Session factory for DB transactions
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Declarative base class for models
Base = declarative_base()


def get_db():
    """
    FastAPI dependency yielding a SQLAlchemy database session per request.
    Ensures the session is cleanly closed after request completion.
    """
    db = SessionLocal()
    try:
        yield db
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


def init_db():
    """
    Ensure all model tables are created in the database.
    Safe to run repeatedly; only creates tables if they do not exist.
    """
    import models  # noqa: F401
    with engine.begin() as connection:
        connection.execute(text("SELECT 1"))
        Base.metadata.create_all(bind=connection)

        # Apply additive changes for databases created before email verification.
        inspector = inspect(connection)
        user_columns = {column["name"] for column in inspector.get_columns("users")}
        if "email_verified" not in user_columns:
            connection.execute(
                text("ALTER TABLE users ADD COLUMN email_verified BOOLEAN NOT NULL DEFAULT 1")
            )
        if "auth_provider" not in user_columns:
            connection.execute(
                text("ALTER TABLE users ADD COLUMN auth_provider VARCHAR(20) NOT NULL DEFAULT 'password'")
            )

        reset_columns = {
            column["name"] for column in inspector.get_columns("password_reset_tokens")
        }
        if "purpose" not in reset_columns:
            connection.execute(
                text(
                    "ALTER TABLE password_reset_tokens "
                    "ADD COLUMN purpose VARCHAR(30) NOT NULL DEFAULT 'password_reset'"
                )
            )
