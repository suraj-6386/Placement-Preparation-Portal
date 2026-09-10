# Placement Preparation Portal

A full-stack Python web application designed for campus placement preparation, featuring quantitative aptitude, multi-language coding practice and challenges, technical/HR interview preparation, user profiles with file uploads, and secure authentication (MySQL + bcrypt + Google Sign-In).

Built with **Python**, **FastAPI**, **MySQL**, **SQLAlchemy**, **REST APIs**, and **vanilla HTML/CSS/JavaScript**.

---

## Table of Contents

- [Project Overview](#project-overview)
- [Key Features](#key-features)
- [Technology Stack](#technology-stack)
- [Project Architecture & Structure](#project-architecture--structure)
- [Authentication Flow](#authentication-flow)
- [Prerequisites](#prerequisites)
- [Step-by-Step Installation & Setup](#step-by-step-installation--setup)
- [MySQL Database Setup](#mysql-database-setup)
- [Environment Variables (.env)](#environment-variables-env)
- [Google OAuth Setup (Optional)](#google-oauth-setup-optional)
- [How to Run the Project](#how-to-run-the-project)
- [How to Run on a New Device](#how-to-run-on-a-new-device)
- [REST API Reference](#rest-api-reference)
- [Troubleshooting & FAQs](#troubleshooting--faqs)

---

## Project Overview

The **Placement Preparation Portal** is a production-grade web application built to streamline student placement preparation. It eliminates outdated file-based data stores (such as JSON user stores) and implements a robust relational database layer with MySQL and SQLAlchemy ORM, complemented by a clean FastAPI REST API architecture.

---

## Key Features

1. **User Authentication & Session Management**:
   - Secure account registration with email and username uniqueness validation.
   - Password hashing using native **bcrypt** (salt rounds = 12).
   - Session tokens generated with cryptographically secure random bytes (`secrets.token_hex(32)`) stored in the MySQL `sessions` table.
   - **Google Sign-In**: Integrated with Google Identity Services (GIS) and backend ID token verification using `google-auth`.
   - Safe session invalidation upon logout.

2. **User Profile Management**:
   - View and update personal information (name, college, course, skills, phone).
   - Profile photo upload (`PNG`, `JPG`, `JPEG`, `WEBP`) with filename sanitization and local storage.
   - Resume upload (`PDF`, `DOC`, `DOCX`).

3. **Quantitative Aptitude Module**:
   - Curated learning resources and external tutorial URLs.
   - Chapter-wise practice questions with interactive answer checking, difficulty filters, and pagination.
   - Timed mock tests categorized by difficulty (Easy, Medium, Hard) with instant score calculation.

4. **Coding Preparation Module**:
   - 10 supported languages (Python, Java, C, C++, JavaScript, PHP, C#, Frontend, Backend, SQL).
   - Language-specific practice MCQs and conceptual questions.
   - Interactive coding challenges with problem descriptions, tags, starter code, and sample test cases.

5. **Interview Preparation Module**:
   - Behavioral and HR interview questions with STAR-method guidance.
   - Subject-wise technical interview questions spanning core computer science disciplines (OS, DBMS, Data Structures, Networks, Python, Java, etc.).

6. **Help & Support Desk**:
   - Searchable Frequently Asked Questions (FAQs).
   - Contact form storing user queries directly in the MySQL `help_queries` table.

7. **Modern Responsive UI**:
   - Vanilla CSS styling with light and dark mode toggle.
   - Fully responsive design on desktop, tablet, and mobile devices.

8. **Personal Dashboard & Progress Tracking**:
   - Authenticated progress across profile setup, aptitude, coding, challenges, interviews, and resume readiness.
   - Recent activity, seven-day momentum, recommendations, and achievement milestones.

9. **Resume Score / AI Review**:
   - Gemini-powered resume scoring for PDF, DOC, and DOCX uploads.
   - ATS/readability analysis, strengths, weaknesses, missing sections, and specific suggestions.

---

## Technology Stack

- **Backend**: Python 3.10+, FastAPI (ASGI via Uvicorn)
- **Database & ORM**: MySQL 8.0+, SQLAlchemy 2.0+, PyMySQL
- **Security & Auth**: Bcrypt, Google Auth (`google-auth`, Google Identity Services)
- **Validation**: Pydantic v2 (with email validation)
- **Frontend**: HTML5, Vanilla CSS3, JavaScript (ES6+), Bootstrap 5, Bootstrap Icons

---

## Project Architecture & Structure

```
PPP Python/
├── backend/
│   ├── app.py              # Main FastAPI application entry point, CORS, static file routes
│   ├── config.py           # Environment configuration (pydantic/dotenv settings)
│   ├── database.py         # SQLAlchemy engine, sessionmaker, Base, get_db(), init_db()
│   ├── models.py           # SQLAlchemy database models (User, SessionModel, HelpQuery, etc.)
│   ├── schemas.py          # Pydantic request/response validation schemas
│   ├── auth.py             # Bcrypt hashing, token utilities, Google token verification
│   ├── routes.py           # REST API endpoints (Auth, Google OAuth, Profile, Aptitude, Coding, Interview, Help)
│   ├── dataset/            # JSON dataset files (used as initial content & DB fallback)
│   └── userdata/           # User upload directories
│       ├── profile_images/ # Stored user profile pictures
│       └── resumes/        # Stored user resume documents
├── frontend/
│   ├── index.html          # Portal home page
│   ├── dashboard.html      # Authenticated progress dashboard
│   ├── aptitude.html       # Aptitude module page
│   ├── coding.html         # Coding practice & challenges page
│   ├── interview.html      # Interview preparation page
│   ├── interview-technical-questions.html # Technical Q&A details
│   ├── profile.html        # User profile page
│   ├── help.html           # Help desk & FAQs page
│   ├── auth-modals.html    # Login & Register modal dialogs
│   └── assets/
│       ├── css/            # Custom styles and themes
│       └── js/             # Client-side logic & API integration
├── database/
│   └── init.sql            # MySQL schema creation script
├── .env                    # Environment variables (DB credentials, secret keys)
├── .gitignore              # Git ignore rules
├── requirements.txt        # Python package dependencies
├── update.txt              # Concise manual steps & credentials checklist
└── README.md               # Project documentation (this file)
```

---

## Authentication Flow

### Standard Registration & Login:
1. **Registration**: Frontend sends `POST /api/register` with `{ name, email, username, password, ... }`. The backend validates the inputs, hashes the password via `bcrypt.hashpw()`, and inserts a new row into the `users` table.
2. **Login**: Frontend sends `POST /api/login` with `{ username, password }`. The backend queries the user, verifies the password using `bcrypt.checkpw()`, generates a 64-character hex session token via `secrets.token_hex(32)`, and inserts it into the `sessions` table.
3. **Session Persistence**: The frontend stores the token in `localStorage.authToken` and includes it in subsequent profile and logout requests.
4. **Logout**: Frontend sends `POST /api/logout` with `{ token }`. The backend deletes the token from the `sessions` table.

### Google Sign-In Flow:
1. The frontend renders the Google Sign-In button via the official Google Identity Services SDK (`https://accounts.google.com/gsi/client`).
2. Upon user selection, Google returns a signed ID token (JWT) to the client.
3. Frontend sends `POST /api/auth/google` with `{ credential: "<jwt_token>" }`.
4. Backend verifies the token's cryptographic signature and audience using `google.oauth2.id_token.verify_oauth2_token()`.
5. Backend checks if the user's Google email exists in the MySQL `users` table:
   - If found: existing account is logged in.
   - If not found: a new account is registered automatically using the Google name, email, and profile picture.
6. A session token is issued in MySQL `sessions`, and the user is logged in.

---

## Prerequisites

- **Python 3.10** or higher
- **MySQL Server 8.0+** (running locally or remotely)
- **pip** package manager

---

## Step-by-Step Installation & Setup

### 1. Clone or Open the Project
Open a terminal in the root directory of the project:
```bash
cd "PPP Python"
```

### 2. Create and Activate a Virtual Environment
```bash
# Windows
python -m venv venv
venv\Scripts\activate

# macOS / Linux
python3 -m venv venv
source venv/bin/activate
```

### 3. Install Required Dependencies
```bash
pip install -r requirements.txt
```

---

## MySQL Database Setup

1. Start your local MySQL service (e.g., through MySQL Workbench, XAMPP, Services app, or command line).
2. Connect to MySQL and run the initialization script:
```bash
mysql -u root -p < database/init.sql
```
Or execute the SQL manually in MySQL Workbench / MySQL CLI:
```sql
CREATE DATABASE IF NOT EXISTS skillprep_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE skillprep_db;
```
*(The tables will also be automatically verified and created by SQLAlchemy when the application starts.)*

---

## Environment Variables (.env)

Ensure a `.env` file exists in the root folder with the following configuration:

```env
# Application Settings
APP_NAME=Placement Preparation Portal
APP_ENV=development
DEBUG=True
HOST=127.0.0.1
PORT=8000

# Security
SECRET_KEY=skillprep_super_secret_session_key_change_in_production
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440

# MySQL Database Settings
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_mysql_password_here
DB_NAME=skillprep_db

# Full Database URL (Optional: Overrides above DB settings)
DATABASE_URL=mysql+pymysql://root:your_mysql_password_here@127.0.0.1:3306/skillprep_db

# Upload Directories
UPLOAD_FOLDER_IMAGES=userdata/profile_images
UPLOAD_FOLDER_RESUMES=userdata/resumes

# Resume Review (server-side only; never add this key to frontend files)
GEMINI_API_KEY=your-gemini-api-key
GEMINI_MODEL=gemini-3.6-flash
RESUME_MAX_FILE_SIZE=5242880
RESUME_MAX_TEXT_LENGTH=30000

# Google OAuth 2.0 Settings
BASE_URL=http://localhost:8000
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
```

> **Note:** Update `DB_PASSWORD` to match your local MySQL root password.

---

## Google OAuth Setup

To enable live Google Sign-In:
1. Visit the [Google Cloud Console](https://console.cloud.google.com/).
2. Navigate to **APIs & Services > OAuth consent screen**.
3. Select **External**, fill in the App Name (e.g., "Placement Preparation Portal"), and enter your email.
4. Navigate to **Credentials > Create Credentials > OAuth client ID**.
5. Select **Web application**.
6. Set **Authorized JavaScript origins**:
   - The value of `BASE_URL` (for example, `http://localhost:8000` locally)
7. Set **Authorized redirect URIs**:
   - The value of `BASE_URL` followed by `/auth/google/callback`
8. Copy the generated **Client ID** and **Client Secret**.
9. Paste into `.env`:
   ```env
   BASE_URL=http://localhost:8000
   GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=your-google-client-secret
   ```
10. Click the "Continue with Google" button on the portal to sign in.

---

## How to Run the Project

From the **project root directory**, simply run:

```bash
python app.py
```

Open your browser and navigate to:
**[http://localhost:8000](http://localhost:8000)**

### Render Deployment

The Render web service uses the root `app.py` entrypoint and this start command:

```bash
uvicorn app:app --host 0.0.0.0 --port $PORT
```

Render supplies `PORT` automatically. Set `APP_ENV=production`, `BASE_URL` to
your Render service URL (for example, `https://your-app.onrender.com`), the
Aiven `DATABASE_URL`, and the Google OAuth variables in the Render environment;
do not commit production credentials or rely on local `.env` values.

---

## How to Run on a New Device

To set up this project from scratch on an entirely new computer:

1. **Install Python 3.10+** (Ensure "Add Python to PATH" is checked during install).
2. **Install MySQL Server 8.0+** and remember your `root` password.
3. **Clone / copy** the `PPP Python` folder to the computer.
4. Open a command prompt inside the project root folder:
   ```bash
   python -m venv venv
   venv\Scripts\activate
   pip install -r requirements.txt
   ```
5. Create the database:
   ```bash
   mysql -u root -p < database/init.sql
   ```
6. Edit the `.env` file with your MySQL root password:
   ```env
   DB_PASSWORD=your_password
   DATABASE_URL=mysql+pymysql://root:your_password@127.0.0.1:3306/skillprep_db
   ```
7. Start the application from the **project root**:
   ```bash
   python app.py
   ```
8. Visit `http://localhost:8000` in any web browser.

---

## REST API Reference

| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `POST` | `/api/register` | Register a new user account | No |
| `POST` | `/api/login` | Login with username and password | No |
| `POST` | `/api/auth/google` | Authenticate with Google ID token | No |
| `GET` | `/api/auth/google/client-id` | Retrieve Google OAuth Client ID | No |
| `POST` | `/api/logout` | Invalidate current session token | No |
| `GET` | `/api/profile` | Retrieve user profile information | Yes (Token) |
| `POST` | `/api/profile/update` | Update profile info, photo, and resume | Yes (Token) |
| `GET` | `/api/dashboard` | Get authenticated progress, KPIs, activity, and recommendations | Yes (Token) |
| `POST` | `/api/activity` | Record a validated user learning activity | Yes (Token) |
| `GET` | `/api/aptitude/learn` | Aptitude learning resource links | No |
| `GET` | `/api/aptitude/practice` | Chapter-wise aptitude practice questions | No |
| `GET` | `/api/aptitude/mock` | Aptitude mock test question sets | No |
| `GET` | `/api/coding/learn` | Programming language tutorial links | No |
| `GET` | `/api/coding/practice` | Language-wise coding practice MCQs | No |
| `GET` | `/api/coding/mock` | Coding mock tests by difficulty | No |
| `GET` | `/api/coding/challenges` | Multi-language coding challenges | No |
| `GET` | `/api/interview/hr` | Common HR interview questions | No |
| `GET` | `/api/interview/technical` | Subject-wise technical interview questions | No |
| `GET` | `/api/faqs` | Frequently Asked Questions | No |
| `POST` | `/api/help/contact` | Submit contact / support inquiry | No |

---

## Troubleshooting & FAQs

- **Error: `Can't connect to MySQL server`**:
  Make sure your MySQL service is running (`net start MySQL80` or via Windows Services). Verify host, port, and password in `.env`.
- **Error: `Access denied for user 'root'@'localhost'`**:
  Your password in `.env` does not match your MySQL root password. Correct the `DB_PASSWORD` and `DATABASE_URL` values.
- **Port 8000 already in use**:
  Change the `PORT` value in your `.env` file (e.g., `PORT=8080`) and re-run `python app.py`.
- **Google Sign-In shows alert**:
  Google Sign-In is pre-wired on both frontend and backend. To enable live Google account authentication, provide a valid `GOOGLE_CLIENT_ID` in `.env`.
