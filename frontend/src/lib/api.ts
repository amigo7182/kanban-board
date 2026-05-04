const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

function headers(token: string) {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
}

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ApiTask {
  id: string;
  title: string;
  status: 'todo' | 'in_progress' | 'in_review' | 'done';
  description?: string | null;
  priority?: 'low' | 'normal' | 'high' | null;
  due_date?: string | null;
  assignee_ids?: string[];
  label_ids?: string[];
  user_id: string;
  created_at: string;
}

export interface ApiTeamMember {
  id: string;
  name: string;
  color: string;
  user_id: string;
  created_at: string;
}

export interface ApiLabel {
  id: string;
  name: string;
  color: string;
  user_id: string;
  created_at: string;
}

export interface ApiActivity {
  id: string;
  task_id: string;
  user_id: string;
  type: 'status_change' | 'title_change' | 'priority_change' | 'assignment' | 'label_change';
  payload: Record<string, unknown>;
  created_at: string;
  tasks?: { title: string } | null;
}

// ── Task API ──────────────────────────────────────────────────────────────────

export async function getTasks(token: string): Promise<ApiTask[]> {
  const res = await fetch(`${API_URL}/tasks`, { headers: headers(token) });
  if (!res.ok) throw new Error('Failed to fetch tasks');
  return res.json();
}

export async function createTask(
  token: string,
  data: { title: string; status: string; description?: string; priority?: string; due_date?: string },
): Promise<ApiTask> {
  const res = await fetch(`${API_URL}/tasks`, {
    method: 'POST',
    headers: headers(token),
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to create task');
  return res.json();
}

export async function updateTask(
  token: string,
  id: string,
  data: Partial<{
    title: string;
    status: string;
    description: string;
    priority: string;
    due_date: string;
    assignee_ids: string[];
    label_ids: string[];
  }>,
): Promise<ApiTask> {
  const res = await fetch(`${API_URL}/tasks/${id}`, {
    method: 'PATCH',
    headers: headers(token),
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to update task');
  return res.json();
}

export async function deleteTask(token: string, id: string): Promise<void> {
  const res = await fetch(`${API_URL}/tasks/${id}`, {
    method: 'DELETE',
    headers: headers(token),
  });
  if (!res.ok) throw new Error('Failed to delete task');
}

// ── Team Member API ───────────────────────────────────────────────────────────

export async function getTeamMembers(token: string): Promise<ApiTeamMember[]> {
  const res = await fetch(`${API_URL}/team-members`, { headers: headers(token) });
  if (!res.ok) throw new Error('Failed to fetch team members');
  return res.json();
}

export async function createTeamMember(
  token: string,
  data: { name: string; color: string },
): Promise<ApiTeamMember> {
  const res = await fetch(`${API_URL}/team-members`, {
    method: 'POST',
    headers: headers(token),
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to create team member');
  return res.json();
}

export async function deleteTeamMember(token: string, id: string): Promise<void> {
  const res = await fetch(`${API_URL}/team-members/${id}`, {
    method: 'DELETE',
    headers: headers(token),
  });
  if (!res.ok) throw new Error('Failed to delete team member');
}

// ── Label API ─────────────────────────────────────────────────────────────────

export async function getLabels(token: string): Promise<ApiLabel[]> {
  const res = await fetch(`${API_URL}/labels`, { headers: headers(token) });
  if (!res.ok) throw new Error('Failed to fetch labels');
  return res.json();
}

export async function createLabel(
  token: string,
  data: { name: string; color: string },
): Promise<ApiLabel> {
  const res = await fetch(`${API_URL}/labels`, {
    method: 'POST',
    headers: headers(token),
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to create label');
  return res.json();
}

export async function deleteLabel(token: string, id: string): Promise<void> {
  const res = await fetch(`${API_URL}/labels/${id}`, {
    method: 'DELETE',
    headers: headers(token),
  });
  if (!res.ok) throw new Error('Failed to delete label');
}

// ── Activity API ───────────────────────────────────────────────────────────────

export async function getTaskActivity(token: string, taskId: string): Promise<ApiActivity[]> {
  const res = await fetch(`${API_URL}/tasks/${taskId}/activity`, { headers: headers(token) });
  if (!res.ok) throw new Error('Failed to fetch activity');
  return res.json();
}

export async function getAllActivity(token: string): Promise<ApiActivity[]> {
  const res = await fetch(`${API_URL}/activity`, { headers: headers(token) });
  if (!res.ok) throw new Error('Failed to fetch activity');
  return res.json();
}
