from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.modules.attempts.router import router as attempts_router
from app.modules.ai.router import router as ai_router
from app.modules.auth.router import router as auth_router
from app.modules.courses.router import router as courses_router
from app.modules.health.router import router as health_router
from app.modules.materials.router import router as materials_router
from app.modules.quizzes.router import router as quizzes_router
from app.modules.sessions.router import router as sessions_router
from app.modules.topics.router import router as topics_router


app = FastAPI(title=settings.app_title)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(courses_router)
app.include_router(topics_router)
app.include_router(materials_router)
app.include_router(quizzes_router)
app.include_router(sessions_router)
app.include_router(attempts_router)
app.include_router(ai_router)
app.include_router(health_router)
