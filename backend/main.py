from dotenv import load_dotenv
from pathlib import Path

load_dotenv(Path(__file__).parent.parent / ".env")

import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routers import tasks, team_members, labels, activity

app = FastAPI(title="Kanban API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(tasks.router)
app.include_router(team_members.router)
app.include_router(labels.router)
app.include_router(activity.router)
