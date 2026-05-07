# FlowForge

FlowForge is a role-based project and task management web app for teams that need to organize projects, assign work, track progress, and manage bugs from one dashboard.

Admins can create projects, add members, assign tasks, review workload, and monitor project health. Members can view assigned projects, update task status, comment on work, and report bugs.

## Features

- JWT-based signup and login
- Admin and member role-based access control
- Project creation with start dates, deadlines, status, and progress tracking
- Team member management, including bulk member creation
- Task creation, assignment, priority, labels, story points, due dates, and comments
- Kanban-style board with drag-to-change task status
- Project search, task search, assignee filters, open/completed filters, and overdue highlighting
- Bug tracking with issue type, severity, reproduction steps, environment, assignee, comments, and workflow status
- Dashboard metrics for total, pending, in-progress, completed, overdue, and assigned tasks
- Team workload summary by open tasks and story points
- REST API built with Flask and SQLAlchemy

## Tech Stack

- Frontend: React, Vite, React Router, Axios
- Backend: Flask, Flask SQLAlchemy, Flask Migrate, Flask JWT Extended, Flask CORS
- Database: SQLite for local development, MySQL-compatible database support through SQLAlchemy
- Deployment: Vercel for the frontend, Railway or another Python host for the backend

## Project Structure

```text
flowforge/
  backend/        Flask API, models, routes, migrations
  frontend/       React + Vite client app
  vercel.json     Vercel build config for the frontend
```

## Local Setup

### Backend

```bash
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
flask --app main db upgrade
python main.py
```

The backend runs at:

```text
http://127.0.0.1:5000
```

### Frontend

```bash
cd frontend
npm install
copy .env.example .env
npm run dev
```

The frontend runs at:

```text
http://127.0.0.1:5173
```

## Environment Variables

Backend `.env`:

```env
DATABASE_URL=sqlite:///flowforge.db
SECRET_KEY=change-me
JWT_SECRET_KEY=change-me
```

Frontend `.env`:

```env
VITE_API_URL=http://127.0.0.1:5000/api
```

For production, set `VITE_API_URL` to your deployed backend API URL, for example:

```env
VITE_API_URL=https://your-backend-domain.com/api
```

## Deployment

### Frontend on Vercel

This repository includes `vercel.json`, so Vercel can build the frontend from the repo root.

Use these settings:

- Framework preset: Vite
- Build command: handled by `vercel.json`
- Output directory: handled by `vercel.json`
- Environment variable: `VITE_API_URL=https://YOUR_BACKEND_DOMAIN/api`

If the deployed site shows `403 Forbidden`, check **Settings > Deployment Protection** in Vercel and disable Vercel Authentication for public demos.

### Backend on Railway

Create a Railway service from the same repository:

- Root directory: `backend`
- Start command: `gunicorn main:app`
- Environment variables:
  - `DATABASE_URL`
  - `SECRET_KEY`
  - `JWT_SECRET_KEY`

Run database migrations after deployment if your host does not run them automatically:

```bash
flask --app main db upgrade
```

## API Overview

- `POST /api/auth/signup`
- `POST /api/auth/login`
- `GET /api/auth/users`
- `GET /api/projects/`
- `POST /api/projects/`
- `PUT /api/projects/:id`
- `GET /api/projects/:id/members`
- `POST /api/projects/:id/members`
- `POST /api/projects/:id/members/bulk`
- `GET /api/tasks/project/:projectId`
- `POST /api/tasks/project/:projectId`
- `PUT /api/tasks/:taskId/status`
- `PUT /api/tasks/:taskId`
- `PUT /api/tasks/:taskId/assign`
- `POST /api/tasks/:taskId/comments`
- `GET /api/dashboard/`

## Build Check

To verify the frontend production build locally:

```bash
cd frontend
npm run build
```

The generated files are written to `frontend/dist`.
