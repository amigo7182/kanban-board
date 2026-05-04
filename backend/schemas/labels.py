from pydantic import BaseModel


class LabelCreate(BaseModel):
    name: str
    color: str = "#3b82f6"
