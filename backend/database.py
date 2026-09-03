"""
SkillPrep Portal - Database Connection & Session Management
Uses SQLAlchemy ORM with PyMySQL driver for MySQL.
"""
from sqlalchemy import create_engine
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
    finally:
        db.close()


def init_db():
    """
    Ensure all model tables are created in the database.
    Safe to run repeatedly; only creates tables if they do not exist.
    """
    import models  # noqa: F401
    Base.metadata.create_all(bind=engine)
