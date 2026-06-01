from datetime import datetime, timezone
import secrets
import string

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.modules.attempts.models import QuizAttempt
from app.modules.attempts.schemas import AttemptCreate, AttemptRead
from app.modules.attempts.service import create_attempt_for_quiz
from app.modules.courses.models import Course
from app.modules.quizzes.models import Quiz
from app.modules.quizzes.models import QuizQuestion
from app.modules.quizzes.service import get_quiz
from app.modules.sessions.models import QuizSession
from app.modules.sessions.schemas import (
    QuizSessionByCodeRead,
    SessionAnalyticsRead,
    SessionAttemptSummaryRead,
    SessionQuizRead,
    TeacherSessionSummaryRead,
)
from app.modules.topics.models import Topic
from app.modules.users.models import User


SESSION_CODE_ALPHABET = string.ascii_uppercase + string.digits


def create_quiz_session(db: Session, teacher: User, quiz_id: int) -> QuizSession:
    quiz = get_quiz(db, teacher, quiz_id)
    session = QuizSession(
        quiz_id=quiz.id,
        teacher_id=teacher.id,
        code=_generate_unique_code(db),
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    return session


def get_session_for_teacher(db: Session, teacher: User, session_id: int) -> QuizSession:
    statement = select(QuizSession).where(QuizSession.id == session_id, QuizSession.teacher_id == teacher.id)
    session = db.scalar(statement)
    if session is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")
    return session


def list_teacher_sessions(db: Session, teacher: User) -> list[TeacherSessionSummaryRead]:
    attempts_count = func.count(QuizAttempt.id)
    statement = (
        select(QuizSession, Quiz, Topic, Course, attempts_count)
        .join(Quiz, QuizSession.quiz_id == Quiz.id)
        .join(Topic, Quiz.topic_id == Topic.id)
        .join(Course, Topic.course_id == Course.id)
        .outerjoin(QuizAttempt, QuizAttempt.session_id == QuizSession.id)
        .where(QuizSession.teacher_id == teacher.id)
        .group_by(QuizSession.id, Quiz.id, Topic.id, Course.id)
        .order_by(QuizSession.status.asc(), QuizSession.created_at.desc())
    )
    rows = db.execute(statement).all()

    return [
        TeacherSessionSummaryRead(
            id=session.id,
            code=session.code,
            quiz_id=session.quiz_id,
            quiz_title=quiz.title,
            course_title=course.title,
            topic_title=topic.title,
            status=session.status,
            created_at=session.created_at,
            closed_at=session.closed_at,
            attempts_count=count,
        )
        for session, quiz, topic, course, count in rows
    ]


def get_active_session_by_code(db: Session, code: str) -> QuizSessionByCodeRead:
    session = db.scalar(select(QuizSession).where(QuizSession.code == code.upper()))
    return _build_active_session_read(db, session)


def get_active_session_for_student(db: Session, session_id: int) -> QuizSessionByCodeRead:
    session = db.get(QuizSession, session_id)
    return _build_active_session_read(db, session)


def _build_active_session_read(db: Session, session: QuizSession | None) -> QuizSessionByCodeRead:
    if session is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")
    if session.status == "closed":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Session is closed")

    quiz = get_quiz_without_teacher(db, session.quiz_id)
    return QuizSessionByCodeRead(
        id=session.id,
        quiz_id=session.quiz_id,
        code=session.code,
        status=session.status,
        quiz=SessionQuizRead(id=quiz.id, title=quiz.title, description=quiz.description),
    )


def create_session_attempt(db: Session, student: User, session_id: int, data: AttemptCreate) -> AttemptRead:
    session = db.get(QuizSession, session_id)
    if session is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")
    if session.status == "closed":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Session is closed")

    existing_attempt = db.scalar(
        select(QuizAttempt).where(QuizAttempt.session_id == session.id, QuizAttempt.student_id == student.id)
    )
    if existing_attempt is not None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You have already submitted this session.",
        )

    return create_attempt_for_quiz(db, student, session.quiz_id, data, session_id=session.id)


def list_session_attempts(db: Session, teacher: User, session_id: int) -> list[SessionAttemptSummaryRead]:
    session = get_session_for_teacher(db, teacher, session_id)
    statement = (
        select(QuizAttempt, User)
        .join(User, QuizAttempt.student_id == User.id)
        .where(QuizAttempt.session_id == session.id)
        .order_by(QuizAttempt.id)
    )
    rows = db.execute(statement).all()

    return [
        SessionAttemptSummaryRead(
            id=attempt.id,
            quiz_id=attempt.quiz_id,
            session_id=session.id,
            student_id=attempt.student_id,
            student_name=user.full_name,
            student_email=user.email,
            score=attempt.score,
            total_questions=attempt.total_questions,
            percent=round((attempt.score / attempt.total_questions) * 100) if attempt.total_questions else 0,
            created_at=attempt.created_at,
        )
        for attempt, user in rows
    ]


def get_session_analytics(db: Session, teacher: User, session_id: int) -> SessionAnalyticsRead:
    session = get_session_for_teacher(db, teacher, session_id)
    attempts = list(db.scalars(select(QuizAttempt).where(QuizAttempt.session_id == session.id)).all())
    total_questions = len(list(db.scalars(select(QuizQuestion.id).where(QuizQuestion.quiz_id == session.quiz_id)).all()))

    if not attempts:
        return SessionAnalyticsRead(
            session_id=session.id,
            quiz_id=session.quiz_id,
            status=session.status,
            students_count=0,
            finished_count=0,
            average_score=0,
            average_percent=0,
            total_questions=total_questions,
            best_score=0,
            worst_score=0,
        )

    scores = [attempt.score for attempt in attempts]
    unique_student_ids = {attempt.student_id for attempt in attempts}
    average_score = round(sum(scores) / len(scores), 2)
    average_percent = round((average_score / total_questions) * 100) if total_questions else 0

    return SessionAnalyticsRead(
        session_id=session.id,
        quiz_id=session.quiz_id,
        status=session.status,
        students_count=len(unique_student_ids),
        finished_count=len(attempts),
        average_score=average_score,
        average_percent=average_percent,
        total_questions=total_questions,
        best_score=max(scores),
        worst_score=min(scores),
    )


def close_session(db: Session, teacher: User, session_id: int) -> QuizSession:
    session = get_session_for_teacher(db, teacher, session_id)
    session.status = "closed"
    session.closed_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(session)
    return session


def reopen_session(db: Session, teacher: User, session_id: int) -> QuizSession:
    session = get_session_for_teacher(db, teacher, session_id)
    session.status = "active"
    session.closed_at = None
    db.commit()
    db.refresh(session)
    return session


def delete_session(db: Session, teacher: User, session_id: int) -> None:
    session = get_session_for_teacher(db, teacher, session_id)
    attempts_count = db.scalar(select(func.count(QuizAttempt.id)).where(QuizAttempt.session_id == session.id)) or 0
    if attempts_count > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete a session with student attempts. Close it instead to preserve results.",
        )

    db.delete(session)
    db.commit()


def get_quiz_without_teacher(db: Session, quiz_id: int):
    from app.modules.quizzes.models import Quiz

    quiz = db.get(Quiz, quiz_id)
    if quiz is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Quiz not found")
    return quiz


def _generate_unique_code(db: Session) -> str:
    for _ in range(20):
        code = "".join(secrets.choice(SESSION_CODE_ALPHABET) for _ in range(6))
        existing_code = db.scalar(select(QuizSession.code).where(QuizSession.code == code))
        if existing_code is None:
            return code

    raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Could not generate session code")
