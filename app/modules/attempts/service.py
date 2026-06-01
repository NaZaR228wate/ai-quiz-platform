from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.modules.attempts.models import QuizAttempt, QuizAttemptAnswer
from app.modules.attempts.schemas import AttemptCreate, AttemptRead, QuizAnalyticsRead
from app.modules.courses.models import Course
from app.modules.quizzes.models import Quiz, QuizOption, QuizQuestion
from app.modules.quizzes.service import get_quiz
from app.modules.topics.models import Topic
from app.modules.users.models import User


def create_attempt(db: Session, student: User, quiz_id: int, data: AttemptCreate) -> AttemptRead:
    return create_attempt_for_quiz(db, student, quiz_id, data)


def create_attempt_for_quiz(
    db: Session,
    student: User,
    quiz_id: int,
    data: AttemptCreate,
    session_id: int | None = None,
) -> AttemptRead:
    quiz = db.get(Quiz, quiz_id)
    if quiz is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Quiz not found")

    question_ids = list(db.scalars(select(QuizQuestion.id).where(QuizQuestion.quiz_id == quiz_id)).all())
    if not question_ids:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Quiz has no questions")

    submitted_question_ids = [answer.question_id for answer in data.answers]
    if len(submitted_question_ids) != len(set(submitted_question_ids)):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Duplicate question answers are not allowed")

    invalid_question_ids = set(submitted_question_ids) - set(question_ids)
    if invalid_question_ids:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Question does not belong to quiz")

    option_ids = [answer.selected_option_id for answer in data.answers]
    options = list(db.scalars(select(QuizOption).where(QuizOption.id.in_(option_ids))).all())
    options_by_id = {option.id: option for option in options}

    attempt_answers: list[QuizAttemptAnswer] = []
    score = 0
    for answer in data.answers:
        option = options_by_id.get(answer.selected_option_id)
        if option is None or option.question_id != answer.question_id:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Option does not belong to question")

        is_correct = option.is_correct
        if is_correct:
            score += 1

        attempt_answers.append(
            QuizAttemptAnswer(
                question_id=answer.question_id,
                selected_option_id=answer.selected_option_id,
                is_correct=is_correct,
            )
        )

    attempt = QuizAttempt(
        quiz_id=quiz_id,
        session_id=session_id,
        student_id=student.id,
        score=score,
        total_questions=len(question_ids),
    )
    db.add(attempt)
    db.flush()

    for answer in attempt_answers:
        answer.attempt_id = attempt.id

    db.add_all(attempt_answers)
    db.commit()
    db.refresh(attempt)

    return _build_attempt_read(db, attempt, attempt_answers)


def get_attempt(db: Session, current_user: User, attempt_id: int) -> AttemptRead:
    if current_user.role == "student":
        statement = select(QuizAttempt).where(QuizAttempt.id == attempt_id, QuizAttempt.student_id == current_user.id)
    elif current_user.role == "teacher":
        statement = (
            select(QuizAttempt)
            .join(Quiz, QuizAttempt.quiz_id == Quiz.id)
            .join(Topic, Quiz.topic_id == Topic.id)
            .join(Course, Topic.course_id == Course.id)
            .where(QuizAttempt.id == attempt_id, Course.teacher_id == current_user.id)
        )
    else:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    attempt = db.scalar(statement)
    if attempt is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Attempt not found")

    return _build_attempt_read(db, attempt, _get_attempt_answers(db, attempt.id))


def list_quiz_attempts(db: Session, teacher: User, quiz_id: int) -> list[AttemptRead]:
    quiz = get_quiz(db, teacher, quiz_id)
    attempts = list(db.scalars(select(QuizAttempt).where(QuizAttempt.quiz_id == quiz.id).order_by(QuizAttempt.id)).all())
    if not attempts:
        return []

    attempt_ids = [attempt.id for attempt in attempts]
    answers = list(
        db.scalars(select(QuizAttemptAnswer).where(QuizAttemptAnswer.attempt_id.in_(attempt_ids)).order_by(QuizAttemptAnswer.id)).all()
    )
    answers_by_attempt: dict[int, list[QuizAttemptAnswer]] = {}
    for answer in answers:
        answers_by_attempt.setdefault(answer.attempt_id, []).append(answer)

    return [_build_attempt_read(db, attempt, answers_by_attempt.get(attempt.id, [])) for attempt in attempts]


def get_quiz_analytics(db: Session, teacher: User, quiz_id: int) -> QuizAnalyticsRead:
    quiz = get_quiz(db, teacher, quiz_id)
    total_questions = len(list(db.scalars(select(QuizQuestion.id).where(QuizQuestion.quiz_id == quiz.id)).all()))
    attempts = list(db.scalars(select(QuizAttempt).where(QuizAttempt.quiz_id == quiz.id)).all())

    if not attempts:
        return QuizAnalyticsRead(
            quiz_id=quiz.id,
            attempts_count=0,
            average_score=0,
            average_percent=0,
            total_questions=total_questions,
            best_score=0,
            worst_score=0,
        )

    scores = [attempt.score for attempt in attempts]
    average_score = round(sum(scores) / len(scores), 2)
    average_percent = round((average_score / total_questions) * 100) if total_questions else 0

    return QuizAnalyticsRead(
        quiz_id=quiz.id,
        attempts_count=len(attempts),
        average_score=average_score,
        average_percent=average_percent,
        total_questions=total_questions,
        best_score=max(scores),
        worst_score=min(scores),
    )


def _get_attempt_answers(db: Session, attempt_id: int) -> list[QuizAttemptAnswer]:
    return list(
        db.scalars(
            select(QuizAttemptAnswer).where(QuizAttemptAnswer.attempt_id == attempt_id).order_by(QuizAttemptAnswer.id)
        ).all()
    )


def _build_attempt_read(db: Session, attempt: QuizAttempt, answers: list[QuizAttemptAnswer]) -> AttemptRead:
    question_ids = [answer.question_id for answer in answers]
    correct_option_by_question: dict[int, int] = {}

    if question_ids:
        correct_options = db.scalars(
            select(QuizOption).where(QuizOption.question_id.in_(question_ids), QuizOption.is_correct.is_(True))
        ).all()
        correct_option_by_question = {option.question_id: option.id for option in correct_options}

    answer_items = [
        {
            **answer.__dict__,
            "correct_option_id": correct_option_by_question.get(answer.question_id),
        }
        for answer in answers
    ]

    return AttemptRead.model_validate({**attempt.__dict__, "answers": answer_items})
