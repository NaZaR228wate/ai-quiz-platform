from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.modules.attempts.schemas import AttemptCreate, AttemptRead
from app.modules.auth.dependencies import get_current_user
from app.modules.sessions.schemas import (
    QuizSessionByCodeRead,
    QuizSessionRead,
    SessionAnalyticsRead,
    SessionAttemptSummaryRead,
    TeacherSessionSummaryRead,
)
from app.modules.sessions.service import (
    close_session,
    create_quiz_session,
    create_session_attempt,
    delete_session,
    get_active_session_by_code,
    get_active_session_for_student,
    get_session_analytics,
    get_session_for_teacher,
    list_teacher_sessions,
    list_session_attempts,
    reopen_session,
)
from app.modules.users.models import User


router = APIRouter(tags=["sessions"])


def get_current_teacher(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role != "teacher":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only teachers can manage sessions")
    return current_user


def get_current_student(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role != "student":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only students can submit session attempts")
    return current_user


@router.post("/quizzes/{quiz_id}/sessions", response_model=QuizSessionRead, status_code=status.HTTP_201_CREATED)
def create_quiz_session_endpoint(
    quiz_id: int,
    db: Session = Depends(get_db),
    current_teacher: User = Depends(get_current_teacher),
):
    return create_quiz_session(db, current_teacher, quiz_id)


@router.get("/sessions/code/{code}", response_model=QuizSessionByCodeRead)
def get_session_by_code_endpoint(
    code: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return get_active_session_by_code(db, code)


@router.get("/sessions/my", response_model=list[TeacherSessionSummaryRead])
def list_my_sessions_endpoint(
    db: Session = Depends(get_db),
    current_teacher: User = Depends(get_current_teacher),
):
    return list_teacher_sessions(db, current_teacher)


@router.get("/sessions/{session_id}", response_model=QuizSessionRead)
def get_session_endpoint(
    session_id: int,
    db: Session = Depends(get_db),
    current_teacher: User = Depends(get_current_teacher),
):
    return get_session_for_teacher(db, current_teacher, session_id)


@router.get("/sessions/{session_id}/take", response_model=QuizSessionByCodeRead)
def get_session_take_endpoint(
    session_id: int,
    db: Session = Depends(get_db),
    current_student: User = Depends(get_current_student),
):
    return get_active_session_for_student(db, session_id)


@router.post("/sessions/{session_id}/attempts", response_model=AttemptRead, status_code=status.HTTP_201_CREATED)
def create_session_attempt_endpoint(
    session_id: int,
    data: AttemptCreate,
    db: Session = Depends(get_db),
    current_student: User = Depends(get_current_student),
):
    return create_session_attempt(db, current_student, session_id, data)


@router.get("/sessions/{session_id}/attempts", response_model=list[SessionAttemptSummaryRead])
def list_session_attempts_endpoint(
    session_id: int,
    db: Session = Depends(get_db),
    current_teacher: User = Depends(get_current_teacher),
):
    return list_session_attempts(db, current_teacher, session_id)


@router.get("/sessions/{session_id}/analytics", response_model=SessionAnalyticsRead)
def get_session_analytics_endpoint(
    session_id: int,
    db: Session = Depends(get_db),
    current_teacher: User = Depends(get_current_teacher),
):
    return get_session_analytics(db, current_teacher, session_id)


@router.patch("/sessions/{session_id}/close", response_model=QuizSessionRead)
def close_session_endpoint(
    session_id: int,
    db: Session = Depends(get_db),
    current_teacher: User = Depends(get_current_teacher),
):
    return close_session(db, current_teacher, session_id)


@router.post("/sessions/{session_id}/close", response_model=QuizSessionRead)
def close_session_post_endpoint(
    session_id: int,
    db: Session = Depends(get_db),
    current_teacher: User = Depends(get_current_teacher),
):
    return close_session(db, current_teacher, session_id)


@router.post("/sessions/{session_id}/reopen", response_model=QuizSessionRead)
def reopen_session_endpoint(
    session_id: int,
    db: Session = Depends(get_db),
    current_teacher: User = Depends(get_current_teacher),
):
    return reopen_session(db, current_teacher, session_id)


@router.delete("/sessions/{session_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_session_endpoint(
    session_id: int,
    db: Session = Depends(get_db),
    current_teacher: User = Depends(get_current_teacher),
):
    delete_session(db, current_teacher, session_id)
