from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.modules.ai.schemas import GenerateQuizRequest, GenerateQuizResponse
from app.modules.ai.service import generate_quiz_from_material
from app.modules.auth.dependencies import get_current_user
from app.modules.users.models import User


router = APIRouter(tags=["ai"])


def get_current_teacher(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role != "teacher":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only teachers can generate quizzes")
    return current_user


@router.post("/materials/{material_id}/generate-quiz", response_model=GenerateQuizResponse)
def generate_quiz_from_material_endpoint(
    material_id: int,
    data: GenerateQuizRequest,
    db: Session = Depends(get_db),
    current_teacher: User = Depends(get_current_teacher),
):
    return generate_quiz_from_material(db, current_teacher, material_id, data)
