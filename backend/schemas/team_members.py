from pydantic import BaseModel


class TeamMemberCreate(BaseModel):
    name: str
    color: str = "#6B7280"
