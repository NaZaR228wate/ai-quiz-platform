from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.modules.auth.dependencies import get_current_user
from app.modules.quizzes.schemas import QuestionCreate, QuestionRead, QuestionStudentRead, QuizCreate, QuizRead, QuizUpdate
from app.modules.quizzes.service import (
    create_question,
    create_quiz,
    delete_quiz,
    get_quiz_for_user,
    list_questions_for_user,
    list_quizzes,
    update_quiz,
)
from app.modules.users.models import User


router = APIRouter(tags=["quizzes"])


def get_current_teacher(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role != "teacher":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only teachers can manage quizzes")
    return current_user


@router.post("/topics/{topic_id}/quizzes", response_model=QuizRead, status_code=status.HTTP_201_CREATED)
def create_quiz_endpoint(
    topic_id: int,
    data: QuizCreate,
    db: Session = Depends(get_db),
    current_teacher: User = Depends(get_current_teacher),
):
    return create_quiz(db, current_teacher, topic_id, data)


@router.get("/topics/{topic_id}/quizzes", response_model=list[QuizRead])
def list_quizzes_endpoint(
    topic_id: int,
    db: Session = Depends(get_db),
    current_teacher: User = Depends(get_current_teacher),
):
    return list_quizzes(db, current_teacher, topic_id)


@router.get("/quizzes/{quiz_id}", response_model=QuizRead)
def get_quiz_endpoint(
    quiz_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return get_quiz_for_user(db, current_user, quiz_id)


@router.patch("/quizzes/{quiz_id}", response_model=QuizRead)
def update_quiz_endpoint(
    quiz_id: int,
    data: QuizUpdate,
    db: Session = Depends(get_db),
    current_teacher: User = Depends(get_current_teacher),
):
    return update_quiz(db, current_teacher, quiz_id, data)


@router.delete("/quizzes/{quiz_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_quiz_endpoint(
    quiz_id: int,
    db: Session = Depends(get_db),
    current_teacher: User = Depends(get_current_teacher),
):
    delete_quiz(db, current_teacher, quiz_id)


@router.post("/quizzes/{quiz_id}/questions", response_model=QuestionRead, status_code=status.HTTP_201_CREATED)
def create_question_endpoint(
    quiz_id: int,
    data: QuestionCreate,
    db: Session = Depends(get_db),
    current_teacher: User = Depends(get_current_teacher),
):
    return create_question(db, current_teacher, quiz_id, data)


@router.get("/quizzes/{quiz_id}/questions", response_model=list[QuestionRead] | list[QuestionStudentRead])
def list_questions_endpoint(
    quiz_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return list_questions_for_user(db, current_user, quiz_id)
