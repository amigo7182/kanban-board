# Kanban Board

A full-stack Kanban task management app built with **Next.js 16**, **FastAPI**, and **Supabase**.

## Features

- Drag-and-drop task management across four columns (To Do → In Progress → Review → Done)
- Guest accounts — anonymous sign-in via Supabase Auth; each user sees only their own data
- Team members — add members with custom colours, assign them to tasks
- Labels — create custom labels, assign multiple to a task, filter the board by label
- Delete with undo — 5-second grace period to undo a deletion
- Task Activity Log — every status change, rename, priority change, and assignment is recorded and shown in a slide-in drawer and a dedicated Activity page

---

## Prerequisites

| Tool | Version |
|------|---------|
| Node.js | 18 + |
| Python | 3.11 + |
| A Supabase project | — |

---

## 1 — Supabase Setup

1. Create a free project at [supabase.com](https://supabase.com).
2. In your project go to **Authentication → Providers** and enable **Anonymous**.
3. Go to **SQL Editor → New query**, paste the contents of `supabase-schema.sql`, and run it.
4. Copy your project credentials from **Project Settings → API**:
   - **Project URL** → `SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_URL`
   - **anon / public key** → `SUPABASE_ANON_KEY` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`

---

## 2 — Backend Setup

```bash
cd backend
python -m venv .venv
source .venv/bin/activate      # Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

Create `backend/.env`:

```env
SUPABASE_URL=https://<your-project>.supabase.co
SUPABASE_ANON_KEY=<your-anon-key>
```

Start the server:

```bash
uvicorn main:app --reload
# API available at http://localhost:8000
# Interactive docs at http://localhost:8000/docs
```

---

## 3 — Frontend Setup

```bash
cd frontend
npm install
```

Create `frontend/.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://<your-project>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
NEXT_PUBLIC_API_URL=http://localhost:8000
```

Start the dev server:

```bash
npm run dev
# App available at http://localhost:3000
```

---

## Project Structure

```
kanban-board-app/
├── supabase-schema.sql       # All table definitions + RLS policies
├── README.md
│
├── backend/
│   ├── main.py               # App entry point, CORS, router registration
│   ├── database.py           # Supabase dependency (JWT → RLS context)
│   ├── requirements.txt
│   ├── API.md                # Full API design document
│   ├── schemas/
│   │   ├── tasks.py
│   │   ├── team_members.py
│   │   └── labels.py
│   └── routers/
│       ├── tasks.py          # CRUD + activity diff logging
│       ├── team_members.py
│       ├── labels.py
│       └── activity.py
│
└── frontend/
    ├── src/
    │   ├── app/
    │   │   ├── layout.tsx        # Root layout with sidebar + providers
    │   │   ├── page.tsx          # Board page
    │   │   └── activity/
    │   │       └── page.tsx      # Global activity log page
    │   ├── components/
    │   │   ├── app-sidebar.tsx
    │   │   ├── auth-provider.tsx
    │   │   ├── task-detail-drawer.tsx
    │   │   ├── team-dialog.tsx
    │   │   ├── label-dialog.tsx
    │   │   └── ui/
    │   │       └── kanban-board.tsx
    │   ├── contexts/
    │   │   ├── team-context.tsx
    │   │   └── label-context.tsx
    │   └── lib/
    │       ├── api.ts            # All fetch calls to the backend
    │       ├── activity-utils.ts # timeAgo, describeActivity helpers
    │       └── supabase.ts       # Browser Supabase client singleton
    └── package.json
```

---

## Architecture

```
Browser
  └── Next.js (App Router)
        ├── Supabase Auth  →  anonymous JWT on first load
        └── fetch()  →  FastAPI (port 8000)
                            └── Supabase PostgREST (RLS enforced via JWT)
```

- The frontend never queries Supabase directly for task/team/label data — all writes and reads go through the FastAPI backend.
- Supabase is used directly in the frontend **only** for authentication (`@supabase/ssr`).
- Every table has `user_id DEFAULT auth.uid()` and RLS policies that restrict all operations to the row owner. The backend forwards the user's JWT on every request so `auth.uid()` resolves correctly.

---

## API Reference

See [`backend/API.md`](backend/API.md) for the full API design document including all endpoints, request/response shapes, error codes, and how the frontend connects to the backend.
