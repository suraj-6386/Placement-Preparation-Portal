"""
SkillPrep Portal - REST API Endpoints
Implements authentication, user profiles, aptitude, coding, interview, and help routes.
"""
import os
import re
import json
import html
import secrets
import urllib.parse
import urllib.request
from pathlib import Path
from typing import Optional, Dict, Any, List
from fastapi import APIRouter, Depends, Form, File, UploadFile, Header, Query, status
from fastapi.responses import JSONResponse, HTMLResponse, RedirectResponse
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from config import settings
from database import get_db
from models import (
    User,
    SessionModel,
    HelpQuery,
    FAQ,
    InterviewQuestion,
    LearningResource,
    PracticeQuestion,
    MockTest,
    CodingChallenge,
)
from schemas import (
    UserRegisterRequest,
    UserLoginRequest,
    GoogleAuthRequest,
    GoogleClientIdResponse,
    LogoutRequest,
    AuthResponse,
    BaseResponse,
    UserProfileResponse,
    HelpQueryCreate,
    HelpQueryResponse,
)
from auth import (
    hash_password,
    verify_password,
    generate_session_token,
    generate_uuid,
    session_is_valid,
    verify_google_token,
)

router = APIRouter(prefix="/api", tags=["API"])

BACKEND_DIR = Path(__file__).resolve().parent
DATASET_DIR = BACKEND_DIR / "dataset"
USERDATA_DIR = BACKEND_DIR / "userdata"

# ============================================================================
# File Upload Helpers
# ============================================================================

def secure_filename(filename: str) -> str:
    """Sanitize filename to prevent directory traversal."""
    filename = re.sub(r"[^\w\.-]", "_", os.path.basename(filename))
    return filename.strip("._")


def is_allowed_file(filename: str, allowed_extensions: set) -> bool:
    """Check if uploaded file has an allowed extension."""
    if "." not in filename:
        return False
    ext = filename.rsplit(".", 1)[1].lower()
    return ext in allowed_extensions


async def save_uploaded_photo(user_id: str, file: UploadFile) -> Optional[str]:
    """Save user profile image to userdata/profile_images."""
    if not file or not file.filename:
        return None
    if not is_allowed_file(file.filename, settings.ALLOWED_EXTENSIONS_IMAGES):
        return None

    target_dir = USERDATA_DIR / "profile_images"
    target_dir.mkdir(parents=True, exist_ok=True)
    safe_name = secure_filename(file.filename)
    stored_name = f"{user_id}_{safe_name}"
    target_path = target_dir / stored_name

    content = await file.read()
    with open(target_path, "wb") as f:
        f.write(content)
    return stored_name


async def save_uploaded_resume(user_id: str, file: UploadFile) -> Optional[str]:
    """Save user resume document to userdata/resumes."""
    if not file or not file.filename:
        return None
    if not is_allowed_file(file.filename, settings.ALLOWED_EXTENSIONS_RESUMES):
        return None

    target_dir = USERDATA_DIR / "resumes"
    target_dir.mkdir(parents=True, exist_ok=True)
    safe_name = secure_filename(file.filename)
    stored_name = f"{user_id}_{safe_name}"
    target_path = target_dir / stored_name

    content = await file.read()
    with open(target_path, "wb") as f:
        f.write(content)
    return stored_name


# ============================================================================
# Dataset Fallback Loader
# ============================================================================

def _read_json_file(filename: str, default: Any = None) -> Any:
    """Read a JSON dataset file from the dataset directory."""
    filepath = DATASET_DIR / filename
    if filepath.exists():
        try:
            with open(filepath, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            pass
    return default if default is not None else {}


# ============================================================================
# Authentication Endpoints
# ============================================================================

@router.post("/register", response_model=BaseResponse)
def register(req: UserRegisterRequest, db: Session = Depends(get_db)):
    """
    Register a new user account.
    Validates unique email and username, hashes password with bcrypt,
    and stores user in MySQL.
    """
    if not req.name or not req.email or not req.username or not req.password:
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={"success": False, "message": "All required fields must be provided"},
        )

    username = req.username.strip()
    email = req.email.strip().lower()

    # Check for existing username
    if db.query(User).filter(User.username == username).first():
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={"success": False, "message": "Username already exists"},
        )

    # Check for existing email
    if db.query(User).filter(User.email == email).first():
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={"success": False, "message": "Email already registered"},
        )

    # Create new User model instance
    new_user = User(
        id=generate_uuid(),
        name=req.name.strip(),
        email=email,
        username=username,
        password=hash_password(req.password),
        phone=req.phone or "",
        college=req.college or "",
        course=req.course or "",
        skills=req.skills or "",
        photo="",
        resume="",
    )
    db.add(new_user)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={"success": False, "message": "Username or email already exists"},
        )
    db.refresh(new_user)

    return {"success": True, "message": "Registration successful"}


@router.post("/login", response_model=AuthResponse)
def login(req: UserLoginRequest, db: Session = Depends(get_db)):
    """
    Authenticate user with username and password.
    Creates a new session token in MySQL and returns user info.
    """
    if not req.username or not req.password:
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={"success": False, "message": "Username and password required"},
        )

    user = db.query(User).filter(User.username == req.username.strip()).first()
    if not user or not verify_password(req.password, user.password):
        return JSONResponse(
            status_code=status.HTTP_401_UNAUTHORIZED,
            content={"success": False, "message": "Invalid username or password"},
        )

    # Generate session token and store in MySQL sessions table
    token = generate_session_token()
    session = SessionModel(token=token, user_id=user.id, username=user.username)
    db.add(session)
    db.commit()

    return {
        "success": True,
        "message": "Login successful",
        "token": token,
        "username": user.username,
        "name": user.name,
    }


@router.post("/auth/google", response_model=AuthResponse)
def google_auth(req: GoogleAuthRequest, db: Session = Depends(get_db)):
    """
    Authenticate or register user using Google Sign-In (OAuth ID token).
    Verifies the Google credential, finds or creates the user in MySQL,
    and returns an application session token.
    """
    if not req.credential:
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={"success": False, "message": "Google credential token required"},
        )

    try:
        if not settings.GOOGLE_CLIENT_ID:
            return JSONResponse(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                content={"success": False, "message": "Google Sign-In is not configured"},
            )
        idinfo = verify_google_token(req.credential, settings.GOOGLE_CLIENT_ID or None)
    except Exception as e:
        return JSONResponse(
            status_code=status.HTTP_401_UNAUTHORIZED,
            content={"success": False, "message": f"Google authentication failed: {str(e)}"},
        )

    email = idinfo.get("email")
    if not email:
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={"success": False, "message": "Email not provided by Google account"},
        )

    email = email.lower().strip()
    name = idinfo.get("name") or email.split("@")[0]
    picture = idinfo.get("picture") or ""

    # Check if user already exists
    user = db.query(User).filter(User.email == email).first()

    if not user:
        # Create username based on email
        base_username = email.split("@")[0]
        base_username = re.sub(r"[^\w]", "_", base_username)
        username = base_username

        # Avoid username collision
        counter = 1
        while db.query(User).filter(User.username == username).first():
            username = f"{base_username}_{counter}"
            counter += 1

        # Secure random password hash for OAuth accounts
        random_pwd = generate_session_token()
        user = User(
            id=generate_uuid(),
            name=name,
            email=email,
            username=username,
            password=hash_password(random_pwd),
            phone="",
            college="",
            course="",
            skills="",
            photo=picture,
            resume="",
        )
        db.add(user)
        db.commit()
        db.refresh(user)

    # Issue session token
    token = generate_session_token()
    session = SessionModel(token=token, user_id=user.id, username=user.username)
    db.add(session)
    db.commit()

    return {
        "success": True,
        "message": "Google Sign-In successful",
        "token": token,
        "username": user.username,
        "name": user.name,
    }


@router.get("/auth/google/login")
def google_login_redirect():
    """
    Redirect user to Google's OAuth2 authorization screen.
    Uses configured GOOGLE_CLIENT_ID and GOOGLE_REDIRECT_URI.
    """
    if not settings.GOOGLE_CLIENT_ID:
        return HTMLResponse(
            """
            <html><body style="font-family:sans-serif;padding:3rem;text-align:center;">
            <h2 style="color:#ef4444;">Google Client ID Not Configured</h2>
            <p>Please enter your <code>GOOGLE_CLIENT_ID</code> in <code>.env</code> as described in <code>update.txt</code>.</p>
            <a href="/" style="display:inline-block;padding:8px 16px;background:#4f46e5;color:#fff;text-decoration:none;border-radius:6px;margin-top:1rem;">Back to Home</a>
            </body></html>
            """,
            status_code=400,
        )

    params = {
        "client_id": settings.GOOGLE_CLIENT_ID,
        "redirect_uri": settings.GOOGLE_REDIRECT_URI,
        "response_type": "code",
        "scope": "openid email profile",
        "access_type": "online",
        "prompt": "select_account",
    }
    auth_url = f"https://accounts.google.com/o/oauth2/v2/auth?{urllib.parse.urlencode(params)}"
    return RedirectResponse(url=auth_url)


@router.get("/auth/google/callback", response_class=HTMLResponse)
def google_callback(
    code: Optional[str] = None,
    error: Optional[str] = None,
    db: Session = Depends(get_db),
):
    """
    Handle Google OAuth2 callback.
    Exchanges the authorization code for an access token,
    fetches the user profile from Google, finds or creates the user in MySQL,
    creates a session in MySQL, and sets the auth session in the client.
    """
    if error:
        safe_error = html.escape(error, quote=True)
        return HTMLResponse(
            f"""
            <!DOCTYPE html>
            <html><body style="font-family:sans-serif;padding:3rem;text-align:center;">
            <h2 style="color:#ef4444;">Google Authentication Failed</h2>
            <p style="color:#64748b;">{safe_error}</p>
            <a href="/" style="display:inline-block;padding:8px 18px;background:#4f46e5;color:#fff;text-decoration:none;border-radius:6px;margin-top:1rem;">Return to Portal</a>
            </body></html>
            """,
            status_code=400,
        )

    if not code:
        return HTMLResponse(
            """
            <!DOCTYPE html>
            <html><body style="font-family:sans-serif;padding:3rem;text-align:center;">
            <h2 style="color:#ef4444;">Authorization Code Missing</h2>
            <p style="color:#64748b;">No authorization code received from Google.</p>
            <a href="/" style="display:inline-block;padding:8px 18px;background:#4f46e5;color:#fff;text-decoration:none;border-radius:6px;margin-top:1rem;">Return to Portal</a>
            </body></html>
            """,
            status_code=400,
        )

    try:
        # 1. Exchange authorization code for tokens
        token_url = "https://oauth2.googleapis.com/token"
        token_payload = urllib.parse.urlencode({
            "code": code,
            "client_id": settings.GOOGLE_CLIENT_ID,
            "client_secret": settings.GOOGLE_CLIENT_SECRET,
            "redirect_uri": settings.GOOGLE_REDIRECT_URI,
            "grant_type": "authorization_code",
        }).encode("utf-8")

        req = urllib.request.Request(
            token_url,
            data=token_payload,
            headers={
                "Content-Type": "application/x-www-form-urlencoded",
                "User-Agent": "PlacementPreparationPortal",
            },
        )
        with urllib.request.urlopen(req, timeout=10) as resp:
            token_data = json.loads(resp.read().decode("utf-8"))

        access_token = token_data.get("access_token")
        if not access_token:
            raise ValueError("Failed to obtain access token from Google.")

        # 2. Fetch user information using access token
        userinfo_url = "https://www.googleapis.com/oauth2/v2/userinfo"
        userinfo_req = urllib.request.Request(
            userinfo_url,
            headers={
                "Authorization": f"Bearer {access_token}",
                "User-Agent": "PlacementPreparationPortal",
            },
        )
        with urllib.request.urlopen(userinfo_req, timeout=10) as resp:
            userinfo = json.loads(resp.read().decode("utf-8"))

        email = userinfo.get("email")
        if not email:
            raise ValueError("Google account did not provide an email address.")

        email = email.lower().strip()
        name = userinfo.get("name") or email.split("@")[0]
        picture = userinfo.get("picture") or ""

        # 3. Find or create user in MySQL database
        user = db.query(User).filter(User.email == email).first()
        if not user:
            base_username = re.sub(r"[^\w]", "_", email.split("@")[0])
            username = base_username
            counter = 1
            while db.query(User).filter(User.username == username).first():
                username = f"{base_username}_{counter}"
                counter += 1

            random_pwd = secrets.token_urlsafe(24)
            user = User(
                id=generate_uuid(),
                name=name,
                email=email,
                username=username,
                password=hash_password(random_pwd),
                phone="",
                college="",
                course="",
                skills="",
                photo=picture,
                resume="",
            )
            db.add(user)
            db.commit()
            db.refresh(user)
        elif not user.photo and picture:
            user.photo = picture
            db.commit()

        # 4. Create session token in MySQL sessions table
        session_token = generate_session_token()
        session = SessionModel(token=session_token, user_id=user.id, username=user.username)
        db.add(session)
        db.commit()

        safe_name_html = html.escape(user.name or "", quote=True)
        safe_name_js = json.dumps(user.name or "")
        safe_token_js = json.dumps(session_token)
        return HTMLResponse(
            f"""
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Authenticating with Google...</title>
                <style>
                    body {{
                        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        height: 100vh;
                        margin: 0;
                        background: #f8fafc;
                        color: #1e293b;
                    }}
                    .auth-card {{
                        background: #ffffff;
                        padding: 2.5rem 3rem;
                        border-radius: 16px;
                        box-shadow: 0 10px 25px rgba(0,0,0,0.08);
                        text-align: center;
                        max-width: 420px;
                        width: 90%;
                    }}
                    .spinner {{
                        width: 48px;
                        height: 48px;
                        border: 4px solid #e2e8f0;
                        border-top-color: #4f46e5;
                        border-radius: 50%;
                        animation: spin 0.8s linear infinite;
                        margin: 0 auto 1.5rem;
                    }}
                    @keyframes spin {{
                        to {{ transform: rotate(360deg); }}
                    }}
                </style>
            </head>
            <body>
                <div class="auth-card">
                    <div class="spinner"></div>
                    <h3 style="margin: 0 0 0.5rem; font-weight: 600;">Welcome, {safe_name_html}!</h3>
                    <p style="color: #64748b; margin: 0;">Signed in successfully. Redirecting to portal...</p>
                </div>
                <script>
                    try {{
                        localStorage.setItem('authToken', {safe_token_js});
                        localStorage.setItem('userName', {safe_name_js});
                    }} catch (e) {{
                        console.error('Local storage error', e);
                    }}
                    setTimeout(function() {{
                        window.location.href = '/';
                    }}, 600);
                </script>
            </body>
            </html>
            """
        )
    except Exception as exc:
        return HTMLResponse(
            f"""
            <!DOCTYPE html>
            <html><body style="font-family:sans-serif;padding:3rem;text-align:center;">
            <h2 style="color:#ef4444;">Google Sign-In Error</h2>
            <p style="color:#64748b;">Google Sign-In could not be completed. Please try again.</p>
            <a href="/" style="display:inline-block;padding:8px 18px;background:#4f46e5;color:#fff;text-decoration:none;border-radius:6px;margin-top:1rem;">Return to Portal</a>
            </body></html>
            """,
            status_code=500,
        )


@router.get("/auth/google/client-id", response_model=GoogleClientIdResponse)
def get_google_client_id():
    """
    Retrieve the configured Google OAuth Client ID for frontend initialization.
    """
    return {"client_id": settings.GOOGLE_CLIENT_ID or ""}


@router.post("/logout", response_model=BaseResponse)
def logout(req: LogoutRequest, db: Session = Depends(get_db)):
    """
    Invalidate and remove session token from MySQL.
    """
    if req.token:
        session = db.query(SessionModel).filter(SessionModel.token == req.token).first()
        if session:
            db.delete(session)
            db.commit()
    return {"success": True, "message": "Logout successful"}


# ============================================================================
# User Profile Endpoints
# ============================================================================

def _resolve_token(token: Optional[str], authorization: Optional[str]) -> Optional[str]:
    if token:
        return token
    if authorization:
        parts = authorization.split()
        return parts[1] if len(parts) == 2 and parts[0].lower() == "bearer" else authorization
    return None


@router.get("/profile", response_model=UserProfileResponse)
def get_profile(
    token: Optional[str] = Query(None),
    authorization: Optional[str] = Header(None),
    db: Session = Depends(get_db),
):
    """
    Retrieve user profile information by session token.
    """
    auth_token = _resolve_token(token, authorization)
    if not auth_token:
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={"success": False, "message": "Authentication token required"},
        )

    session = db.query(SessionModel).filter(SessionModel.token == auth_token).first()
    if not session or not session_is_valid(session):
        if session:
            db.delete(session)
            db.commit()
        return JSONResponse(
            status_code=status.HTTP_401_UNAUTHORIZED,
            content={"success": False, "message": "Invalid or expired session"},
        )

    user = session.user or db.query(User).filter(User.username == session.username).first()
    if not user:
        return JSONResponse(
            status_code=status.HTTP_404_NOT_FOUND,
            content={"success": False, "message": "User not found"},
        )

    return {"success": True, "user": user.to_dict()}


@router.post("/profile/update", response_model=BaseResponse)
async def update_profile(
    token: Optional[str] = Form(None),
    name: Optional[str] = Form(None),
    email: Optional[str] = Form(None),
    phone: Optional[str] = Form(None),
    college: Optional[str] = Form(None),
    course: Optional[str] = Form(None),
    skills: Optional[str] = Form(None),
    photo: Optional[UploadFile] = File(None),
    resume: Optional[UploadFile] = File(None),
    authorization: Optional[str] = Header(None),
    db: Session = Depends(get_db),
):
    """
    Update user personal details, profile image, and resume in MySQL.
    """
    auth_token = _resolve_token(token, authorization)
    if not auth_token:
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={"success": False, "message": "Authentication token required"},
        )

    session = db.query(SessionModel).filter(SessionModel.token == auth_token).first()
    if not session or not session_is_valid(session):
        if session:
            db.delete(session)
            db.commit()
        return JSONResponse(
            status_code=status.HTTP_401_UNAUTHORIZED,
            content={"success": False, "message": "Invalid or expired session"},
        )

    user = session.user or db.query(User).filter(User.username == session.username).first()
    if not user:
        return JSONResponse(
            status_code=status.HTTP_404_NOT_FOUND,
            content={"success": False, "message": "User not found"},
        )

    # Save uploaded files if provided
    if photo and photo.filename:
        photo_filename = await save_uploaded_photo(user.id, photo)
        if photo_filename:
            user.photo = photo_filename

    if resume and resume.filename:
        resume_filename = await save_uploaded_resume(user.id, resume)
        if resume_filename:
            user.resume = resume_filename

    # Update personal details
    if name is not None:
        user.name = name.strip()
    if email is not None:
        normalized_email = email.strip().lower()
        existing_email = (
            db.query(User)
            .filter(User.email == normalized_email, User.id != user.id)
            .first()
        )
        if existing_email:
            return JSONResponse(
                status_code=status.HTTP_400_BAD_REQUEST,
                content={"success": False, "message": "Email already registered"},
            )
        user.email = normalized_email
    if phone is not None:
        user.phone = phone.strip()
    if college is not None:
        user.college = college.strip()
    if course is not None:
        user.course = course.strip()
    if skills is not None:
        user.skills = skills.strip()

    db.commit()
    db.refresh(user)

    return {"success": True, "message": "Profile updated successfully"}


# ============================================================================
# Aptitude Endpoints
# ============================================================================

@router.get("/aptitude/learn")
def get_aptitude_learn(db: Session = Depends(get_db)):
    """Curated learning resources and tutorial links for aptitude."""
    items = db.query(LearningResource).filter(LearningResource.category == "aptitude").all()
    if items:
        return {item.title: item.url for item in items}
    return _read_json_file("aptitude_learn.json", {})


@router.get("/aptitude/practice")
def get_aptitude_practice(db: Session = Depends(get_db)):
    """Chapter-wise aptitude practice questions."""
    items = db.query(PracticeQuestion).filter(PracticeQuestion.category == "aptitude").all()
    if items:
        result = {}
        for item in items:
            result.setdefault(item.chapter, []).append(item.to_dict())
        return result
    return _read_json_file("aptitude_practice.json", {})


@router.get("/aptitude/mock")
def get_aptitude_mock(db: Session = Depends(get_db)):
    """Aptitude mock test sets categorized by difficulty level."""
    items = (
        db.query(MockTest)
        .filter(MockTest.category == "aptitude")
        .order_by(MockTest.set_index.asc())
        .all()
    )
    if items:
        result = {}
        for item in items:
            result.setdefault(item.level, {}).setdefault("sets", []).append(item.to_dict())
        return result
    return _read_json_file("aptitude_mock.json", {})


# ============================================================================
# Coding Endpoints
# ============================================================================

@router.get("/coding/learn")
def get_coding_learn(db: Session = Depends(get_db)):
    """Programming languages learning resources and documentation."""
    items = db.query(LearningResource).filter(LearningResource.category == "coding").all()
    if items:
        return {item.title: item.url for item in items}
    return _read_json_file("coding_learn.json", {})


@router.get("/coding/practice")
def get_coding_practice(db: Session = Depends(get_db)):
    """Language-wise coding practice questions."""
    items = db.query(PracticeQuestion).filter(PracticeQuestion.category == "coding").all()
    if items:
        result = {}
        for item in items:
            result.setdefault(item.chapter, []).append(item.to_dict())
        return result
    return _read_json_file("coding_practice.json", {})


@router.get("/coding/mock")
def get_coding_mock(db: Session = Depends(get_db)):
    """Coding mock test sets categorized by difficulty."""
    items = (
        db.query(MockTest)
        .filter(MockTest.category == "coding")
        .order_by(MockTest.set_index.asc())
        .all()
    )
    if items:
        result = {}
        for item in items:
            result.setdefault(item.level, {}).setdefault("sets", []).append(item.to_dict())
        return result
    return _read_json_file("coding_mock.json", {})


LANGUAGE_METADATA = {
    "Python": {"icon": "🐍", "color": "#3776AB"},
    "Java": {"icon": "☕", "color": "#007396"},
    "C": {"icon": "©️", "color": "#A8B9CC"},
    "C++": {"icon": "⚡", "color": "#00599C"},
    "JavaScript": {"icon": "📜", "color": "#F7DF1E"},
    "PHP": {"icon": "🐘", "color": "#777BB4"},
    "CSharp": {"icon": "#️⃣", "color": "#239120", "displayName": "C#"},
    "Frontend": {"icon": "🎨", "color": "#FF6B6B"},
    "Backend": {"icon": "⚙️", "color": "#4ECDC4"},
    "SQL": {"icon": "🗄️", "color": "#336791"},
}


@router.get("/coding/challenges")
def get_coding_challenges(db: Session = Depends(get_db)):
    """Coding challenges across 10 programming languages."""
    items = db.query(CodingChallenge).all()
    if items:
        result = {}
        for item in items:
            lang = item.language
            if lang not in result:
                meta = LANGUAGE_METADATA.get(lang, {"icon": "💻", "color": "#3b82f6"})
                result[lang] = {
                    "icon": meta.get("icon", "💻"),
                    "color": meta.get("color", "#3b82f6"),
                    "easy": [],
                    "moderate": [],
                    "hard": [],
                }
                if "displayName" in meta:
                    result[lang]["displayName"] = meta["displayName"]
            diff = (item.difficulty or "easy").lower()
            if diff not in ("easy", "moderate", "hard"):
                diff = "easy"
            result[lang][diff].append(item.to_dict())
        return result
    return _read_json_file("coding_challenges.json", {})


# ============================================================================
# Interview Endpoints
# ============================================================================

@router.get("/interview/hr")
def get_interview_hr(db: Session = Depends(get_db)):
    """Common HR interview questions and behavioral prompts."""
    items = (
        db.query(InterviewQuestion)
        .filter(InterviewQuestion.category == "hr")
        .order_by(InterviewQuestion.display_order.asc(), InterviewQuestion.id.asc())
        .all()
    )
    if items:
        return [item.question for item in items]
    return _read_json_file("interview_hr.json", [])


@router.get("/interview/technical")
def get_interview_technical(db: Session = Depends(get_db)):
    """Subject-wise technical interview questions."""
    items = (
        db.query(InterviewQuestion)
        .filter(InterviewQuestion.category == "technical")
        .order_by(InterviewQuestion.display_order.asc(), InterviewQuestion.id.asc())
        .all()
    )
    if items:
        result = {}
        for item in items:
            subj = item.subject or "General"
            result.setdefault(subj, []).append(item.question)
        return result
    return _read_json_file("interview_technical.json", {})


# ============================================================================
# Help & Support Endpoints
# ============================================================================

@router.get("/faqs")
def get_faqs(db: Session = Depends(get_db)):
    """Frequently Asked Questions."""
    items = db.query(FAQ).all()
    if items:
        return [item.to_dict() for item in items]
    return _read_json_file("faqs.json", [])


@router.post("/help/contact", response_model=HelpQueryResponse)
def submit_help_contact(req: HelpQueryCreate, db: Session = Depends(get_db)):
    """Submit a contact or support query to MySQL."""
    if not req.name or not req.email or not req.message:
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={"success": False, "message": "Name, email, and message are required"},
        )

    query = HelpQuery(
        id=generate_uuid(),
        name=req.name.strip(),
        email=req.email.strip().lower(),
        subject=req.subject or "No subject",
        message=req.message.strip(),
    )
    db.add(query)
    db.commit()
    db.refresh(query)

    return {
        "success": True,
        "message": "Query submitted successfully",
        "query_id": query.id,
    }
