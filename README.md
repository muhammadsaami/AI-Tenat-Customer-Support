# SupportPilot — AI Customer Support Platform

A multi-tenant AI-powered customer support platform built with FastAPI.

## Phase 1: Project Scaffolding

This phase establishes the project structure, dependencies, and local development environment.

### Prerequisites

- Python 3.10+
- Docker & Docker Compose
- Git

### Quick Start

1. **Create and activate virtual environment:**

   ```bash
   python -m venv venv
   ./venv/Scripts/Activate.ps1      # Windows PowerShell
   source venv/bin/activate          # macOS/Linux
   ```

2. **Install dependencies:**

   ```bash
   pip install -r requirements.txt
   ```

3. **Set up environment variables:**

   ```bash
   cp .env.example .env
   # Edit .env with your real values
   ```

4. **Start infrastructure services:**

   ```bash
   docker-compose up -d
   ```

5. **Run the application:**

   ```bash
   uvicorn app.main:app --reload --port 8000
   ```

## Project Structure

```
SupportPilot/
├── app/
│   ├── routers/        # API route handlers
│   └── services/       # Business logic layer
├── requirements.txt
├── .env.example
├── docker-compose.yml
└── README.md
```

## Architecture

- **Framework:** FastAPI (async)
- **Database:** PostgreSQL 16 via SQLAlchemy 2.0 (async)
- **Cache:** Redis 7
- **AI:** OpenAI API
- **Auth:** JWT + bcrypt
- **Migrations:** Alembic
- **Multi-tenancy:** Tenant isolation via header + DB row-level security
