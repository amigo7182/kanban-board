from fastapi import APIRouter, Depends, HTTPException
from supabase import Client

from database import get_supabase
from schemas.tasks import TaskCreate, TaskUpdate

router = APIRouter(prefix="/tasks", tags=["tasks"])


@router.get("")
def get_tasks(supabase: Client = Depends(get_supabase)):
    response = supabase.table("tasks").select("*").order("created_at").execute()
    return response.data


@router.post("", status_code=201)
def create_task(task: TaskCreate, supabase: Client = Depends(get_supabase)):
    payload = task.model_dump(exclude_none=True)
    response = supabase.table("tasks").insert(payload).execute()
    if not response.data:
        raise HTTPException(status_code=500, detail="Failed to create task")
    return response.data[0]


@router.patch("/{task_id}")
def update_task(task_id: str, task: TaskUpdate, supabase: Client = Depends(get_supabase)):
    payload = task.model_dump(exclude_none=True)
    if not payload:
        raise HTTPException(status_code=400, detail="No fields to update")

    # Fetch current task for change diffing
    current_res = supabase.table("tasks").select("*").eq("id", task_id).execute()
    if not current_res.data:
        raise HTTPException(status_code=404, detail="Task not found")
    current = current_res.data[0]

    response = supabase.table("tasks").update(payload).eq("id", task_id).execute()
    if not response.data:
        raise HTTPException(status_code=404, detail="Task not found")

    # Build activity entries for each changed field
    activity_entries = []
    if "status" in payload and payload["status"] != current.get("status"):
        activity_entries.append({
            "task_id": task_id,
            "type": "status_change",
            "payload": {"from": current.get("status"), "to": payload["status"]},
        })
    if "title" in payload and payload["title"] != current.get("title"):
        activity_entries.append({
            "task_id": task_id,
            "type": "title_change",
            "payload": {"from": current.get("title"), "to": payload["title"]},
        })
    if "priority" in payload and payload["priority"] != current.get("priority"):
        activity_entries.append({
            "task_id": task_id,
            "type": "priority_change",
            "payload": {"from": current.get("priority"), "to": payload["priority"]},
        })
    if "assignee_ids" in payload:
        prev   = set(current.get("assignee_ids") or [])
        next_  = set(payload["assignee_ids"])
        added   = list(next_ - prev)
        removed = list(prev - next_)
        if added or removed:
            activity_entries.append({
                "task_id": task_id,
                "type": "assignment",
                "payload": {"added": added, "removed": removed},
            })
    if "label_ids" in payload:
        prev   = set(current.get("label_ids") or [])
        next_  = set(payload["label_ids"])
        added   = list(next_ - prev)
        removed = list(prev - next_)
        if added or removed:
            activity_entries.append({
                "task_id": task_id,
                "type": "label_change",
                "payload": {"added": added, "removed": removed},
            })

    try:
        if activity_entries:
            supabase.table("task_activity").insert(activity_entries).execute()
    except Exception:
        pass  # activity logging is best-effort

    return response.data[0]


@router.delete("/{task_id}", status_code=204)
def delete_task(task_id: str, supabase: Client = Depends(get_supabase)):
    supabase.table("tasks").delete().eq("id", task_id).execute()
