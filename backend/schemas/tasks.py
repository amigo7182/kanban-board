from pydantic import BaseModel
from typing import Optional, List


class TaskCreate(BaseModel):
    title: str
    status: str = "todo"
    description: Optional[str] = None
    priority: Optional[str] = "normal"
    due_date: Optional[str] = None
    assignee_ids: Optional[List[str]] = None
    label_ids: Optional[List[str]] = None


class TaskUpdate(BaseModel):
    title: Optional[str] = None
    status: Optional[str] = None
    description: Optional[str] = None
    priority: Optional[str] = None
    due_date: Optional[str] = None
    assignee_ids: Optional[List[str]] = None
    label_ids: Optional[List[str]] = None
