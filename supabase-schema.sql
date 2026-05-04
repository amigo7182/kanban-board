-- ─────────────────────────────────────────────────────────────────────────────
-- Kanban Board — Supabase Schema
-- Run this in the Supabase SQL Editor (project → SQL Editor → New query)
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Tasks table
CREATE TABLE public.tasks (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  title        TEXT        NOT NULL,
  status       TEXT        NOT NULL DEFAULT 'todo'
                 CHECK (status IN ('todo', 'in_progress', 'in_review', 'done')),
  user_id      UUID        NOT NULL DEFAULT auth.uid()
                 REFERENCES auth.users (id) ON DELETE CASCADE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Bonus fields
  description  TEXT,
  priority     TEXT        DEFAULT 'normal'
                 CHECK (priority IN ('low', 'normal', 'high')),
  due_date     DATE,
  assignee_ids JSONB       NOT NULL DEFAULT '[]'::jsonb,
  label_ids    JSONB       NOT NULL DEFAULT '[]'::jsonb
);

-- 2. Tasks — Row Level Security
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_own_tasks" ON public.tasks
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "insert_own_tasks" ON public.tasks
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "update_own_tasks" ON public.tasks
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "delete_own_tasks" ON public.tasks
  FOR DELETE USING (auth.uid() = user_id);


-- 3. Team members table
CREATE TABLE public.team_members (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL DEFAULT auth.uid()
               REFERENCES auth.users (id) ON DELETE CASCADE,
  name       TEXT        NOT NULL,
  color      TEXT        NOT NULL DEFAULT '#6B7280',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Team members — Row Level Security
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_own_members" ON public.team_members
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "insert_own_members" ON public.team_members
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "delete_own_members" ON public.team_members
  FOR DELETE USING (auth.uid() = user_id);


-- 5. Labels table
CREATE TABLE public.labels (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL DEFAULT auth.uid()
               REFERENCES auth.users (id) ON DELETE CASCADE,
  name       TEXT        NOT NULL,
  color      TEXT        NOT NULL DEFAULT '#3b82f6',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. Labels — Row Level Security
ALTER TABLE public.labels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_own_labels" ON public.labels
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "insert_own_labels" ON public.labels
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "delete_own_labels" ON public.labels
  FOR DELETE USING (auth.uid() = user_id);


-- 7. Task activity table
CREATE TABLE public.task_activity (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id    UUID        NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id    UUID        NOT NULL DEFAULT auth.uid()
               REFERENCES auth.users(id) ON DELETE CASCADE,
  type       TEXT        NOT NULL,
  payload    JSONB       NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. Task activity — Row Level Security
ALTER TABLE public.task_activity ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_own_activity" ON public.task_activity
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "insert_own_activity" ON public.task_activity
  FOR INSERT WITH CHECK (auth.uid() = user_id);
