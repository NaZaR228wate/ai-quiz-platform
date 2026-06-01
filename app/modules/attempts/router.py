from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.modules.attempts.schemas import AttemptCreate, AttemptRead, QuizAnalyticsRead
from app.modules.attempts.service import create_attempt, get_attempt, get_quiz_analytics, list_quiz_attempts
from app.modules.auth.dependencies import get_current_user
from app.modules.users.models import User


router = APIRouter(tags=["attempts"])


def get_current_student(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role != "student":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only students can pass quizzes")
    return current_user


def get_current_teacher(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role != "teacher":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only teachers can view quiz attempts")
    return current_user


@router.post("/quizzes/{quiz_id}/attempts", response_model=AttemptRead, status_code=status.HTTP_201_CREATED)
def create_attempt_endpoint(
    quiz_id: int,
    data: AttemptCreate,
    db: Session = Depends(get_db),
    current_student: User = Depends(get_current_student),
):
    return create_attempt(db, current_student, quiz_id, data)


@router.get("/attempts/{attempt_id}", response_model=AttemptRead)
def get_attempt_endpoint(
    attempt_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return get_attempt(db, current_user, attempt_id)


@router.get("/quizzes/{quiz_id}/attempts", response_model=list[AttemptRead])
def list_quiz_attempts_endpoint(
    quiz_id: int,
    db: Session = Depends(get_db),
    current_teacher: User = Depends(get_current_teacher),
):
    return list_quiz_attempts(db, current_teacher, quiz_id)


@router.get("/quizzes/{quiz_id}/analytics", response_model=QuizAnalyticsRead)
def get_quiz_analytics_endpoint(
    quiz_id: int,
    db: Session = Depends(get_db),
    current_teacher: User = Depends(get_current_teacher),
):
    return get_quiz_analytics(db, current_teacher, quiz_id)
