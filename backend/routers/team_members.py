from fastapi import APIRouter, Depends, HTTPException
from supabase import Client

from database import get_supabase
from schemas.team_members import TeamMemberCreate

router = APIRouter(prefix="/team-members", tags=["team-members"])


@router.get("")
def get_team_members(supabase: Client = Depends(get_supabase)):
    response = supabase.table("team_members").select("*").order("created_at").execute()
    return response.data


@router.post("", status_code=201)
def create_team_member(member: TeamMemberCreate, supabase: Client = Depends(get_supabase)):
    response = supabase.table("team_members").insert(member.model_dump()).execute()
    if not response.data:
        raise HTTPException(status_code=500, detail="Failed to create team member")
    return response.data[0]


@router.delete("/{member_id}", status_code=204)
def delete_team_member(member_id: str, supabase: Client = Depends(get_supabase)):
    supabase.table("team_members").delete().eq("id", member_id).execute()
