# Placement Preparation Portal

A full-stack preparation workspace for aptitude, coding, interview, resume, and placement readiness. It provides secure account authentication, personalized progress tracking, and email verification/password recovery.

## Main Features

- Email or username login with password authentication
- Google OAuth sign-in
- Resend email verification and password recovery
- Aptitude learning, practice, and mock tests
- Coding practice, mock tests, and challenges
- HR and technical interview preparation
- Profile, photo, and resume management
- Resume analysis and progress dashboard
- Responsive light/dark frontend for mobile, tablet, and desktop

## Tech Stack

| Area | Technologies |
|---|---|
| Backend | Python, FastAPI, Uvicorn |
| Database | MySQL, SQLAlchemy, PyMySQL |
| Authentication | bcrypt, secure sessions, Google OAuth / `google-auth` |
| Email | Resend Python SDK |
| Frontend | HTML5, CSS3, vanilla JavaScript, Bootstrap 5, Bootstrap Icons |
| Resume analysis | PyPDF, python-docx, Gemini API |
| Deployment | Render and Aiven MySQL |

## Live Demo

Set the production URL here when publishing the service:

`https://<your-render-service>.onrender.com`

## Project Structure

```text
.
├── app.py                         # Root application entry point
├── backend/
│   ├── app.py                     # FastAPI application and static routes
│   ├── auth.py                    # Password hashing, sessions, Google token helpers
│   ├── config.py                  # Environment configuration
│   ├── database.py                # SQLAlchemy engine and sessions
│   ├── models.py                  # Database models
│   ├── routes.py                  # API endpoints
│   ├── schemas.py                 # Request/response validation
│   ├── dataset/                   # Seed and fallback content
│   └── userdata/                  # Runtime uploads and interview cache
├── database/init.sql              # MySQL schema
├── frontend/                      # HTML pages, CSS, JavaScript, and auth pages
├── render.yaml                    # Render service configuration
├── requirements.txt               # Python dependencies
├── .env                           # Local secrets and environment values, never commit
└── README.md
```

## Local Setup

Prerequisites:

- Python 3.10+
- MySQL 8.0+ or an accessible Aiven MySQL service
- Git and pip

Create an environment and install dependencies:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

Run the application from the project root:

```powershell
python app.py
```

Open `http://127.0.0.1:8000` in a browser.

## Environment Variables

Create `.env` in the project root. Use placeholders locally and enter real values only in your private environment configuration.

```env
APP_NAME=Placement Preparation Portal
APP_ENV=development
DEBUG=False
HOST=127.0.0.1
PORT=8000

SECRET_KEY=<long-random-secret>
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440

DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=<mysql-user>
DB_PASSWORD=<mysql-password>
DB_NAME=skillprep_db
DATABASE_URL=mysql+pymysql://<mysql-user>:<mysql-password>@<mysql-host>:3306/<database-name>
DB_SSL_ENABLED=False

BASE_URL=http://127.0.0.1:8000
GOOGLE_CLIENT_ID=<google-client-id>
GOOGLE_CLIENT_SECRET=<google-client-secret>

APP_BASE_URL=http://127.0.0.1:8000
RESEND_API_KEY=<resend-api-key>
RESEND_FROM_EMAIL=Placement Preparation Portal <noreply@mail.surajgupta.me>

GEMINI_API_KEY=<gemini-api-key>
GEMINI_MODEL=gemini-3.6-flash
```

For production, set `APP_ENV=production`, use the exact public HTTPS service URL for `BASE_URL` and `APP_BASE_URL`, and provide the Render/Aiven database URL and secrets through the Render dashboard.

## MySQL / Aiven Database Setup

For a new local database:

```bash
mysql -u root -p < database/init.sql
```

For Aiven, use the complete MySQL service URI in Render's `DATABASE_URL`. Confirm the database name, username, password, host, port, and required TLS settings in the Aiven console. Do not replace an existing production database or delete data. The application verifies and creates missing SQLAlchemy tables at startup, but existing additive migrations must still be applied when upgrading an older database.

## Google OAuth Configuration

1. Create or select a project in Google Cloud Console.
2. Configure the OAuth consent screen with the name `Placement Preparation Portal`.
3. Create a Web application OAuth client.
4. Add the local and production origins to Authorized JavaScript origins.
5. Add `{BASE_URL}/auth/google/callback` to Authorized redirect URIs.
6. Set `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in the local `.env` or Render environment.

## Resend Email Configuration

Use the verified sender exactly as shown:

```env
RESEND_FROM_EMAIL=Placement Preparation Portal <noreply@mail.surajgupta.me>
```

Requirements:

- Set a valid `RESEND_API_KEY` privately in `.env` and Render.
- Verify `mail.surajgupta.me` in Resend.
- Publish the DNS records Resend provides, including SPF, DKIM, and any required DMARC policy.
- Use `APP_BASE_URL=http://127.0.0.1:8000` only for local testing.
- Use the exact public HTTPS Render URL for production email links.
- Check Resend activity and recipient spam/quarantine folders after accepted sends.

## Render Deployment

`render.yaml` defines the Python web service. Render supplies `PORT` automatically. Configure these environment values in the Render dashboard:

- `APP_ENV=production`
- `DATABASE_URL` for the Aiven MySQL service
- `DB_SSL_CA` if required by the Aiven setup
- `BASE_URL` and `APP_BASE_URL` as the public HTTPS Render URL
- `SECRET_KEY`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL=Placement Preparation Portal <noreply@mail.surajgupta.me>`
- `GEMINI_API_KEY` if resume analysis is enabled

Build command:

```bash
pip install -r requirements.txt
```

Start command:

```bash
uvicorn app:app --host 0.0.0.0 --port $PORT
```

## Important Manual Steps

- Apply required additive database migrations before using email verification or password reset on an older database.
- Restart locally after changing `.env`.
- Redeploy or restart Render after changing environment values.
- Confirm the startup diagnostics show configured email and database settings without exposing secrets.
- Test registration, email verification, email/username login, forgot password, reset password, Google OAuth, uploads, and the main learning pages.

## Security Notes

- Never commit `.env`, API keys, passwords, OAuth secrets, database credentials, or uploaded user files.
- Rotate credentials immediately if they are exposed.
- Use a unique random production `SECRET_KEY`.
- Keep production database access restricted and TLS-enabled where required.
- Reset tokens are short-lived, single-use, hashed before storage, and removed when email delivery fails.

## Testing

Run backend compilation and frontend syntax checks:

```powershell
python -B -m compileall -q backend app.py
Get-ChildItem frontend -Recurse -Filter *.js | ForEach-Object { node --check $_.FullName }
```

Responsive checks should cover 320px, 375px, 430px, 768px, 1024px, 1440px, and 1920px widths.

## Future Scope

- Add automated API and end-to-end browser tests with isolated test data.
- Add delivery webhooks and bounce/complaint handling for email observability.
- Add formal database migrations for schema versioning.
- Add background jobs for resume analysis and large content imports.
