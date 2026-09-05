"""
SkillPrep Portal - Pydantic Request & Response Schemas
Provides validation and serialization for REST APIs.
"""
from typing import Any, Dict, Optional, List
from pydantic import BaseModel, EmailStr


# ============================================================================
# Authentication & User Schemas
# ============================================================================

class UserRegisterRequest(BaseModel):
    name: str
    email: EmailStr
    username: str
    password: str
    phone: Optional[str] = ""
    college: Optional[str] = ""
    course: Optional[str] = ""
    skills: Optional[str] = ""


class UserLoginRequest(BaseModel):
    username: str
    password: str


class GoogleAuthRequest(BaseModel):
    credential: str  # Google JWT ID token


class GoogleClientIdResponse(BaseModel):
    client_id: str


class LogoutRequest(BaseModel):
    token: Optional[str] = None


class AuthResponse(BaseModel):
    success: bool
    message: str
    token: Optional[str] = None
    username: Optional[str] = None
    name: Optional[str] = None


class BaseResponse(BaseModel):
    success: bool
    message: str


class UserProfileData(BaseModel):
    id: str
    name: str
    email: str
    username: str
    phone: Optional[str] = ""
    college: Optional[str] = ""
    course: Optional[str] = ""
    skills: Optional[str] = ""
    photo: Optional[str] = ""
    resume: Optional[str] = ""
    created_at: Optional[str] = None


class UserProfileResponse(BaseModel):
    success: bool
    user: Optional[UserProfileData] = None
    message: Optional[str] = None


class ActivityCreate(BaseModel):
    event_type: str
    category: str
    item_key: str
    score: Optional[int] = None
    details: Dict[str, Any] = {}


class InterviewAIRequest(BaseModel):
    question: str
    answer: Optional[str] = ""
    category: Optional[str] = "HR"
    difficulty: Optional[str] = ""


# ============================================================================
# Help & Support Schemas
# ============================================================================

class HelpQueryCreate(BaseModel):
    name: str
    email: EmailStr
    subject: Optional[str] = "No subject"
    message: str


class HelpQueryResponse(BaseModel):
    success: bool
    message: str
    query_id: Optional[str] = None


# ============================================================================
# Content Schemas
# ============================================================================

class FAQItem(BaseModel):
    q: str
    a: str


class QuestionItem(BaseModel):
    id: str
    question: str
    options: List[str]
    answer: str
    difficulty: Optional[str] = None


class ChallengeTestCase(BaseModel):
    input: str
    output: str


class ChallengeProblem(BaseModel):
    id: str
    title: str
    description: str
    difficulty: str
    tags: List[str] = []
    starterCode: str = ""
    testCases: List[ChallengeTestCase] = []
