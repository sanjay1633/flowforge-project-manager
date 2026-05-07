# FlowForge

FlowForge is a role-based project and task tracking web app. Admins can create projects, add team members, create and assign tasks, and track delivery progress. Members can view assigned projects and update task progress.

## Features

- Signup and login with JWT authentication
- Admin and member role-based access control
- Project creation and team membership management
- Add one existing teammate or bulk-add multiple members with name, email, role, and initial password
- Project start dates, deadlines, automatic project status, and progress percentage
- Task creation, assignment, due dates, and status updates
- Dashboard metrics for total, todo, in-progress, completed, overdue, and assigned tasks
- Project health progress bars and completion percentage
- Task search, assignee filters, open/completed/overdue filters, and overdue highlighting
- Project search for quickly finding workspaces
- Jira/Trello-style Kanban board with drag-to-change task status
- Task priorities, labels, story points, inline card editing, and comments
- Bug tracking with issue type, severity, reproduction steps, environment, assignment, comments, and status workflow
- Bug metrics for total bugs, open bugs, and critical open bugs
- Team workload summary by open tasks and story points
- REST API with SQLAlchemy models and SQLite/MySQL-compatible configuration

## Tech Stack

- Frontend: React, Vite, Axios, React Router
- Backend: Flask, Flask SQLAlchemy, Flask JWT Extended, Flask CORS
- Database: SQL database through SQLAlchemy
- Deployment target: Railway

## Local Setup

### Backend

```bash
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
python main.py
```

The backend runs at `http://127.0.0.1:5000`.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

The frontend runs at `http://127.0.0.1:5173`.

For production frontend builds, set `VITE_API_URL` to the deployed backend API URL.

## Railway Deployment

Create two Railway services from the same GitHub repository:

1. Backend service
   - Root directory: `backend`
   - Start command: `gunicorn main:app`
   - Variables:
     - `DATABASE_URL`
     - `SECRET_KEY`
     - `JWT_SECRET_KEY`

2. Frontend service
   - Root directory: `frontend`
   - Build command: `npm run build`
   - Start command: `npm run preview -- --host 0.0.0.0 --port $PORT`
   - Variables:
     - `VITE_API_URL=https://YOUR_BACKEND_DOMAIN/api`

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

## Submission Checklist

- Live URL: add Railway frontend URL
- GitHub repo: add repository URL
- README: this file
- Demo video: record a 2-5 minute walkthrough showing signup, admin project creation with start/deadline dates, automatic project status, bulk member addition, bug reporting with repro steps, bug severity tracking, member assignment, Kanban drag/drop, priority labels, comments, task filters, overdue tracking, status updates, and dashboard metrics
