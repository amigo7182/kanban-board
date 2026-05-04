from fastapi import APIRouter, Depends, HTTPException
from supabase import Client

from database import get_supabase
from schemas.labels import LabelCreate

router = APIRouter(prefix="/labels", tags=["labels"])


@router.get("")
def get_labels(supabase: Client = Depends(get_supabase)):
    response = supabase.table("labels").select("*").order("created_at").execute()
    return response.data


@router.post("", status_code=201)
def create_label(label: LabelCreate, supabase: Client = Depends(get_supabase)):
    response = supabase.table("labels").insert(label.model_dump()).execute()
    if not response.data:
        raise HTTPException(status_code=500, detail="Failed to create label")
    return response.data[0]


@router.delete("/{label_id}", status_code=204)
def delete_label(label_id: str, supabase: Client = Depends(get_supabase)):
    supabase.table("labels").delete().eq("id", label_id).execute()
