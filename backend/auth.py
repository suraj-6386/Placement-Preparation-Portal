"""
SkillPrep Portal - Authentication & Security Utilities
Handles password hashing, token generation, Google OAuth verification,
and current user dependency injection.
"""
import uuid
import secrets
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
import bcrypt
from fastapi import Depends, HTTPException, Header, Query, status
from sqlalchemy.orm import Session
from database import get_db
from models import User, SessionModel
from config import settings


def hash_password(password: str) -> str:
    """Hash a plain text password using bcrypt."""
    pwd_bytes = password.encode("utf-8")
    salt = bcrypt.gensalt(rounds=12)
    return bcrypt.hashpw(pwd_bytes, salt).decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a plain password against a bcrypt hashed password."""
    try:
        return bcrypt.checkpw(
            plain_password.encode("utf-8"),
            hashed_password.encode("utf-8"),
        )
    except Exception:
        return False


def generate_session_token() -> str:
    """Generate a cryptographically secure 64-character hex session token."""
    return secrets.token_hex(32)


def generate_uuid() -> str:
    """Generate a UUID4 string for primary keys."""
    return str(uuid.uuid4())


def session_is_valid(session: SessionModel) -> bool:
    """Check the database-backed session lifetime configured for the app."""
    if not session.created_at:
        return False
    return datetime.utcnow() - session.created_at <= timedelta(
        minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
    )


def verify_google_token(token: str, client_id: Optional[str] = None) -> Dict[str, Any]:
    """
    Verify a Google ID token from Google Identity Services.
    Uses google.oauth2.id_token, or falls back to Google's tokeninfo endpoint.
    Returns user info dictionary containing email, name, sub, picture.
    """
    if not client_id:
        raise ValueError("Google OAuth is not configured")

    # 1. Try verification with google-auth library
    try:
        from google.oauth2 import id_token
        from google.auth.transport import requests as google_requests

        request = google_requests.Request()
        # Verify with or without audience constraint
        idinfo = id_token.verify_oauth2_token(
            token,
            request,
            client_id
        )
        return idinfo
    except Exception as lib_err:
        pass

    # 2. Fallback: Query Google's public tokeninfo endpoint
    try:
        import urllib.request
        import json

        url = f"https://oauth2.googleapis.com/tokeninfo?id_token={token}"
        req = urllib.request.Request(url, headers={"User-Agent": "SkillPrep-Backend"})
        with urllib.request.urlopen(req, timeout=5) as response:
            if response.status == 200:
                data = json.loads(response.read().decode("utf-8"))
                if "email" in data:
                    return data
    except Exception as http_err:
        pass

    raise ValueError("Invalid or expired Google OAuth credential token")


def get_current_user(
    token: Optional[str] = Query(None),
    authorization: Optional[str] = Header(None),
    db: Session = Depends(get_db),
) -> User:
    """
    FastAPI dependency to extract and validate the authenticated User
    from query param ?token=... or Header Authorization: Bearer <token>.
    """
    auth_token = token
    if not auth_token and authorization:
        parts = authorization.split()
        if len(parts) == 2 and parts[0].lower() == "bearer":
            auth_token = parts[1]
        else:
            auth_token = authorization

    if not auth_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"success": False, "message": "Authentication token required"},
        )

    session = db.query(SessionModel).filter(SessionModel.token == auth_token).first()
    if not session or not session_is_valid(session):
        if session:
            db.delete(session)
            db.commit()
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"success": False, "message": "Invalid or expired session"},
        )

    if session.user:
        return session.user

    user = db.query(User).filter(User.username == session.username).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"success": False, "message": "User account not found"},
        )

    return user
