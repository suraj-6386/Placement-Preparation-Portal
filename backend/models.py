"""
SkillPrep Portal - SQLAlchemy Database Models
Maps application entities to MySQL tables.
"""
from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship
from database import Base


class User(Base):
    """
    User model storing account and profile information in MySQL.
    """
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, index=True)
    name = Column(String(150), nullable=False)
    email = Column(String(150), unique=True, index=True, nullable=False)
    username = Column(String(100), unique=True, index=True, nullable=False)
    password = Column(String(255), nullable=False)
    phone = Column(String(50), default="")
    college = Column(String(200), default="")
    course = Column(String(150), default="")
    skills = Column(Text, default="")
    photo = Column(String(255), default="")
    resume = Column(String(255), default="")
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    sessions = relationship(
        "SessionModel", back_populates="user", cascade="all, delete-orphan"
    )

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name or "",
            "email": self.email or "",
            "username": self.username or "",
            "phone": self.phone or "",
            "college": self.college or "",
            "course": self.course or "",
            "skills": self.skills or "",
            "photo": self.photo or "",
            "resume": self.resume or "",
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class SessionModel(Base):
    """
    Session model storing active login tokens in MySQL.
    """
    __tablename__ = "sessions"

    id = Column(Integer, primary_key=True, autoincrement=True)
    token = Column(String(64), unique=True, index=True, nullable=False)
    user_id = Column(
        String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=True
    )
    username = Column(String(100), index=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="sessions")

    def to_dict(self):
        return {
            "id": self.id,
            "token": self.token,
            "user_id": self.user_id,
            "username": self.username,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class HelpQuery(Base):
    """
    Help & Contact Query model storing support messages.
    """
    __tablename__ = "help_queries"

    id = Column(String(36), primary_key=True, index=True)
    name = Column(String(150), nullable=False)
    email = Column(String(150), nullable=False)
    subject = Column(String(255), default="No subject")
    message = Column(Text, nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "email": self.email,
            "subject": self.subject or "No subject",
            "message": self.message,
            "timestamp": self.timestamp.isoformat() if self.timestamp else None,
        }


class FAQ(Base):
    """
    Frequently Asked Questions model.
    """
    __tablename__ = "faqs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    question = Column(Text, nullable=False)
    answer = Column(Text, nullable=False)

    def to_dict(self):
        return {
            "q": self.question,
            "a": self.answer,
        }


class InterviewQuestion(Base):
    """
    Interview Questions (HR & Technical) model.
    """
    __tablename__ = "interview_questions"

    id = Column(Integer, primary_key=True, autoincrement=True)
    category = Column(String(50), nullable=False, index=True)  # 'hr' or 'technical'
    subject = Column(String(100), nullable=True, index=True)   # 'C', 'Java', 'Python', etc.
    question = Column(Text, nullable=False)
    display_order = Column(Integer, default=0)

    def to_dict(self):
        return {
            "id": self.id,
            "category": self.category,
            "subject": self.subject,
            "question": self.question,
            "display_order": self.display_order,
        }


class LearningResource(Base):
    """
    Curated learning resources and external tutorial URLs.
    """
    __tablename__ = "learning_resources"

    id = Column(Integer, primary_key=True, autoincrement=True)
    category = Column(String(50), nullable=False, index=True)  # 'aptitude' or 'coding'
    title = Column(String(150), nullable=False)
    url = Column(String(500), nullable=False)

    def to_dict(self):
        return {
            "title": self.title,
            "url": self.url,
        }


class PracticeQuestion(Base):
    """
    Chapter-wise aptitude and coding practice questions.
    """
    __tablename__ = "practice_questions"

    id = Column(String(50), primary_key=True, index=True)
    category = Column(String(50), nullable=False, index=True)  # 'aptitude' or 'coding'
    chapter = Column(String(100), nullable=False, index=True)  # e.g., 'Number System', 'Python'
    question = Column(Text, nullable=False)
    options = Column(JSON, nullable=False)                      # List of option strings
    answer = Column(String(500), nullable=False)
    difficulty = Column(String(20), nullable=True)             # 'Easy', 'Moderate', 'Hard'

    def to_dict(self):
        item = {
            "id": self.id,
            "question": self.question,
            "options": self.options if isinstance(self.options, list) else [],
            "answer": self.answer,
        }
        if self.difficulty:
            item["difficulty"] = self.difficulty
        return item


class MockTest(Base):
    """
    Mock test question sets categorized by difficulty level.
    """
    __tablename__ = "mock_tests"

    id = Column(Integer, primary_key=True, autoincrement=True)
    category = Column(String(50), nullable=False, index=True)  # 'aptitude' or 'coding'
    level = Column(String(20), nullable=False, index=True)     # 'easy', 'medium', 'hard'
    set_index = Column(Integer, nullable=False, default=0)
    questions = Column(JSON, nullable=False)                   # List of question dicts

    def to_dict(self):
        return self.questions if isinstance(self.questions, list) else []


class CodingChallenge(Base):
    """
    Curated coding challenges across 10 programming languages.
    """
    __tablename__ = "coding_challenges"

    id = Column(String(50), primary_key=True, index=True)
    language = Column(String(50), nullable=False, index=True)
    difficulty = Column(String(20), nullable=False, index=True)  # 'easy', 'moderate', 'hard'
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=False)
    tags = Column(JSON, nullable=True)                           # List of tag strings
    starter_code = Column(Text, nullable=True)
    test_cases = Column(JSON, nullable=True)                     # List of {input, output} dicts

    def to_dict(self):
        return {
            "id": self.id,
            "title": self.title,
            "description": self.description,
            "difficulty": self.difficulty.capitalize(),
            "tags": self.tags if isinstance(self.tags, list) else [],
            "starterCode": self.starter_code or "",
            "testCases": self.test_cases if isinstance(self.test_cases, list) else [],
        }
