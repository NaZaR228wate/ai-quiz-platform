from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.modules.auth.dependencies import get_current_user
from app.modules.question_bank.schemas import (
    QuestionBankQuestionCreate,
    QuestionBankQuestionRead,
    QuestionBankQuestionUpdate,
    QuizFromQuestionBankCreate,
)
from app.modules.question_bank.service import (
    create_bank_question,
    create_quiz_from_bank_questions,
    delete_bank_question,
    list_bank_questions,
    update_bank_question,
)
from app.modules.quizzes.schemas import QuizRead
from app.modules.users.models import User


router = APIRouter(tags=["question-bank"])


def get_current_teacher(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role != "teacher":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only teachers can manage question bank")
    return current_user


@router.get("/question-bank/questions", response_model=list[QuestionBankQuestionRead])
def list_bank_questions_endpoint(
    db: Session = Depends(get_db),
    current_teacher: User = Depends(get_current_teacher),
):
    return list_bank_questions(db, current_teacher)


@router.post("/question-bank/questions", response_model=QuestionBankQuestionRead, status_code=status.HTTP_201_CREATED)
def create_bank_question_endpoint(
    data: QuestionBankQuestionCreate,
    db: Session = Depends(get_db),
    current_teacher: User = Depends(get_current_teacher),
):
    return create_bank_question(db, current_teacher, data)


@router.patch("/question-bank/questions/{question_id}", response_model=QuestionBankQuestionRead)
def update_bank_question_endpoint(
    question_id: int,
    data: QuestionBankQuestionUpdate,
    db: Session = Depends(get_db),
    current_teacher: User = Depends(get_current_teacher),
):
    return update_bank_question(db, current_teacher, question_id, data)


@router.delete("/question-bank/questions/{question_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_bank_question_endpoint(
    question_id: int,
    db: Session = Depends(get_db),
    current_teacher: User = Depends(get_current_teacher),
):
    delete_bank_question(db, current_teacher, question_id)


@router.post("/topics/{topic_id}/quizzes/from-question-bank", response_model=QuizRead, status_code=status.HTTP_201_CREATED)
def create_quiz_from_bank_questions_endpoint(
    topic_id: int,
    data: QuizFromQuestionBankCreate,
    db: Session = Depends(get_db),
    current_teacher: User = Depends(get_current_teacher),
):
    return create_quiz_from_bank_questions(db, current_teacher, topic_id, data)
