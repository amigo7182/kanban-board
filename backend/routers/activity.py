from fastapi import APIRouter, Depends
from supabase import Client

from database import get_supabase

router = APIRouter(tags=["activity"])


@router.get("/tasks/{task_id}/activity")
def get_task_activity(task_id: str, supabase: Client = Depends(get_supabase)):
    response = (
        supabase.table("task_activity")
        .select("*")
        .eq("task_id", task_id)
        .order("created_at", desc=True)
        .execute()
    )
    return response.data


@router.get("/activity")
def get_all_activity(supabase: Client = Depends(get_supabase)):
    response = (
        supabase.table("task_activity")
        .select("*, tasks(title)")
        .order("created_at", desc=True)
        .limit(200)
        .execute()
    )
    return response.data
