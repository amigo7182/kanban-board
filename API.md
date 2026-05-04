# Kanban API — Design Document

## Overview

The backend is a **FastAPI** application that acts as a thin authenticated proxy to **Supabase**.
Every request must carry a Supabase JWT so that Row Level Security (RLS) is enforced at the database level — the API never reads or writes data on behalf of a user it hasn't verified.

Base URL (local): `http://localhost:8000`

---

## Authentication

All endpoints require an `Authorization` header:

```
Authorization: Bearer <supabase_access_token>
```

The token is the JWT issued by Supabase Auth (anonymous or email sign-in).
The dependency `get_supabase` in `database.py` extracts the token and calls `client.postgrest.auth(token)`, which sets the PostgREST `Authorization` context so that `auth.uid()` resolves correctly inside every RLS policy.

**Error — missing or malformed header**
```json
401  { "detail": "Invalid authorization header" }
```

---

## Error Handling

| HTTP Status | Meaning |
|-------------|---------|
| 400 | Bad request — e.g. PATCH body is empty |
| 401 | Missing or invalid `Authorization` header |
| 404 | Resource not found (or blocked by RLS) |
| 500 | Supabase insert returned no data |

All error bodies follow FastAPI's default shape:
```json
{ "detail": "<human-readable message>" }
```

Activity logging (`task_activity` inserts) is **best-effort** — a logging failure never causes the parent request to fail.

---

## Endpoints

### Tasks

#### `GET /tasks`
Return all tasks belonging to the authenticated user, ordered by creation time.

**Request** — no body.

**Response `200`**
```json
[
  {
    "id": "uuid",
    "title": "Design login screen",
    "status": "in_progress",
    "description": "Figma link attached",
    "priority": "high",
    "due_date": "2025-06-01",
    "assignee_ids": ["uuid-member-1"],
    "label_ids": ["uuid-label-1"],
    "user_id": "uuid-user",
    "created_at": "2025-05-01T10:00:00Z"
  }
]
```

---

#### `POST /tasks`
Create a new task.

**Request body**
```json
{
  "title": "Design login screen",       // required
  "status": "todo",                     // default: "todo"
  "description": "Figma link attached", // optional
  "priority": "high",                   // optional, default: "normal"
  "due_date": "2025-06-01",             // optional, YYYY-MM-DD
  "assignee_ids": ["uuid-member-1"],    // optional
  "label_ids": ["uuid-label-1"]         // optional
}
```

**Response `201`** — the created task object (same shape as GET item).

**Errors**
```
500  Failed to create task
```

---

#### `PATCH /tasks/{task_id}`
Partially update a task. Only provided fields are updated.
Before writing, the current row is fetched so that a diff can be computed and activity entries inserted for every changed field.

**Request body** — all fields optional:
```json
{
  "title": "New title",
  "status": "done",
  "description": "Updated notes",
  "priority": "low",
  "due_date": "2025-07-15",
  "assignee_ids": ["uuid-member-2"],
  "label_ids": []
}
```

**Response `200`** — the updated task object.

**Errors**
```
400  No fields to update  (empty body)
404  Task not found
```

**Activity events generated (written to `task_activity`)**

| Changed field | `type` | `payload` |
|---------------|--------|-----------|
| `status` | `status_change` | `{ "from": "todo", "to": "done" }` |
| `title` | `title_change` | `{ "from": "Old", "to": "New" }` |
| `priority` | `priority_change` | `{ "from": "normal", "to": "high" }` |
| `assignee_ids` | `assignment` | `{ "added": ["uuid"], "removed": [] }` |
| `label_ids` | `label_change` | `{ "added": [], "removed": ["uuid"] }` |

---

#### `DELETE /tasks/{task_id}`
Delete a task. Cascades to `task_activity`.

**Response `204`** — no body.

---

### Team Members

#### `GET /team-members`
Return all team members created by the authenticated user.

**Response `200`**
```json
[
  {
    "id": "uuid",
    "name": "Alice Chen",
    "color": "#6B7280",
    "user_id": "uuid-user",
    "created_at": "2025-05-01T10:00:00Z"
  }
]
```

---

#### `POST /team-members`
Add a team member.

**Request body**
```json
{
  "name": "Alice Chen",   // required
  "color": "#6B7280"      // optional hex colour, default: "#6B7280"
}
```

**Response `201`** — the created member object.

**Errors**
```
500  Failed to create team member
```

---

#### `DELETE /team-members/{member_id}`
Remove a team member.

**Response `204`** — no body.

---

### Labels

#### `GET /labels`
Return all labels created by the authenticated user.

**Response `200`**
```json
[
  {
    "id": "uuid",
    "name": "Bug",
    "color": "#ef4444",
    "user_id": "uuid-user",
    "created_at": "2025-05-01T10:00:00Z"
  }
]
```

---

#### `POST /labels`
Create a label.

**Request body**
```json
{
  "name": "Bug",          // required
  "color": "#ef4444"      // optional hex colour, default: "#3b82f6"
}
```

**Response `201`** — the created label object.

**Errors**
```
500  Failed to create label
```

---

#### `DELETE /labels/{label_id}`
Delete a label.

**Response `204`** — no body.

---

### Activity

#### `GET /tasks/{task_id}/activity`
Return the change history for a single task, newest first.

**Response `200`**
```json
[
  {
    "id": "uuid",
    "task_id": "uuid",
    "user_id": "uuid-user",
    "type": "status_change",
    "payload": { "from": "todo", "to": "in_progress" },
    "created_at": "2025-05-01T11:00:00Z"
  }
]
```

---

#### `GET /activity`
Return the global activity feed for the authenticated user (last 200 entries), newest first.
Includes the parent task title via a Supabase join.

**Response `200`**
```json
[
  {
    "id": "uuid",
    "task_id": "uuid",
    "user_id": "uuid-user",
    "type": "assignment",
    "payload": { "added": ["uuid-member"], "removed": [] },
    "created_at": "2025-05-01T11:05:00Z",
    "tasks": { "title": "Design login screen" }
  }
]
```

---

## How the Frontend Connects

```
Frontend (Next.js)  →  src/lib/api.ts  →  FastAPI backend  →  Supabase (PostgREST + Auth)
```

1. **Auth** — `src/components/auth-provider.tsx` calls `supabase.auth.signInAnonymously()` on first load and stores the session in React context.
2. **Token forwarding** — every function in `src/lib/api.ts` accepts a `token: string` parameter and sets `Authorization: Bearer <token>` on all `fetch` calls.
3. **Token source** — `src/app/page.tsx` reads `session?.access_token` from `AuthContext` and passes it down to `KanbanBoard`. Context hooks (`useTeamContext`, `useLabelContext`) similarly read the token from `AuthContext`.
4. **Base URL** — controlled by the `NEXT_PUBLIC_API_URL` environment variable (defaults to `http://localhost:8000`).
5. **RLS guarantee** — because the JWT is forwarded, every Supabase query runs as the authenticated user. No user can read or write another user's rows.

---

## Project File Structure (Backend)

```
backend/
├── main.py              # FastAPI app, CORS middleware, router registration
├── database.py          # get_supabase dependency (JWT extraction + client init)
├── requirements.txt
├── API.md               # this file
├── schemas/
│   ├── tasks.py         # TaskCreate, TaskUpdate
│   ├── team_members.py  # TeamMemberCreate
│   └── labels.py        # LabelCreate
└── routers/
    ├── tasks.py         # CRUD + activity diff logic
    ├── team_members.py
    ├── labels.py
    └── activity.py      # GET /tasks/{id}/activity, GET /activity
```
