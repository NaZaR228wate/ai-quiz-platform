from fastapi import HTTPException, status
from openai import OpenAI, OpenAIError
from pydantic import ValidationError
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.modules.attempts.models import QuizAttempt, QuizAttemptAnswer
from app.modules.attempts.schemas import (
    AttemptCreate,
    AttemptExplanationRead,
    AttemptStudyPlanRead,
    AttemptRead,
    QuizAnalyticsRead,
    WeakTopicRead,
)
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


def get_weak_topics(db: Session, teacher: User) -> list[WeakTopicRead]:
    statement = (
        select(Topic, QuizAttempt)
        .select_from(QuizAttempt)
        .join(Quiz, QuizAttempt.quiz_id == Quiz.id)
        .join(Topic, Quiz.topic_id == Topic.id)
        .join(Course, Topic.course_id == Course.id)
        .where(Course.teacher_id == teacher.id)
    )
    rows = db.execute(statement).all()
    grouped_topics: dict[int, dict[str, object]] = {}

    for topic, attempt in rows:
        topic_data = grouped_topics.setdefault(
            topic.id,
            {
                "topic_title": topic.title,
                "scores": [],
            },
        )
        scores = topic_data["scores"]
        if isinstance(scores, list):
            scores.append(round((attempt.score / attempt.total_questions) * 100) if attempt.total_questions else 0)

    weak_topics = [
        WeakTopicRead(
            topic_id=topic_id,
            topic_title=str(topic_data["topic_title"]),
            average_score=round(sum(topic_data["scores"]) / len(topic_data["scores"])),
            attempts_count=len(topic_data["scores"]),
        )
        for topic_id, topic_data in grouped_topics.items()
        if isinstance(topic_data["scores"], list) and topic_data["scores"]
    ]

    return sorted(weak_topics, key=lambda topic: (topic.average_score, -topic.attempts_count, topic.topic_title))[:5]


def generate_attempt_explanation(db: Session, current_user: User, attempt_id: int) -> AttemptExplanationRead:
    get_attempt(db, current_user, attempt_id)
    attempt = db.get(QuizAttempt, attempt_id)
    if attempt is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Attempt not found")

    mistakes = _build_attempt_mistakes(db, attempt.id)
    if not mistakes:
        return AttemptExplanationRead(attempt_id=attempt.id, explanations=[])

    if not settings.openai_api_key:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="OpenAI API key is not configured")

    client = OpenAI(api_key=settings.openai_api_key)

    try:
        response = client.responses.parse(
            model=settings.openai_model,
            input=[
                {
                    "role": "system",
                    "content": (
                        "You are a helpful tutor. Explain quiz mistakes in simple student-friendly language. "
                        "Return short explanations only. Do not add extra questions."
                    ),
                },
                {
                    "role": "user",
                    "content": (
                        "Explain why each selected answer is incorrect and why the correct answer is right. "
                        "Keep each explanation under 45 words.\n"
                        f"Return attempt_id: {attempt.id}.\n"
                        f"Mistakes:\n{mistakes}"
                    ),
                },
            ],
            text_format=AttemptExplanationRead,
        )
    except (OpenAIError, ValidationError, ValueError) as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="OpenAI returned invalid explanation data",
        ) from exc

    if response.output_parsed is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="OpenAI returned invalid explanation data",
        )

    return AttemptExplanationRead(attempt_id=attempt.id, explanations=response.output_parsed.explanations)


def generate_attempt_study_plan(db: Session, current_user: User, attempt_id: int) -> AttemptStudyPlanRead:
    get_attempt(db, current_user, attempt_id)
    attempt = db.get(QuizAttempt, attempt_id)
    if attempt is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Attempt not found")

    if not settings.openai_api_key:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="AI study plan is not configured. Please add OPENAI_API_KEY.",
        )

    quiz = db.get(Quiz, attempt.quiz_id)
    topic = db.get(Topic, quiz.topic_id) if quiz is not None else None
    mistakes = _build_attempt_mistakes(db, attempt.id)
    percent = round((attempt.score / attempt.total_questions) * 100) if attempt.total_questions else 0
    client = OpenAI(api_key=settings.openai_api_key)

    try:
        response = client.responses.parse(
            model=settings.openai_model,
            input=[
                {
                    "role": "system",
                    "content": (
                        "You are a helpful tutor. Create a short, practical study plan from quiz results. "
                        "Return structured JSON only. Keep items concise and student-friendly."
                    ),
                },
                {
                    "role": "user",
                    "content": (
                        f"Attempt id: {attempt.id}\n"
                        f"Quiz title: {quiz.title if quiz else 'Unknown quiz'}\n"
                        f"Topic: {topic.title if topic else 'Unknown topic'}\n"
                        f"Score: {attempt.score}/{attempt.total_questions} ({percent}%)\n"
                        f"Incorrect answers: {mistakes if mistakes else 'No incorrect answers. Recommend review and next practice.'}\n"
                        "Generate weak_topics, what_to_study, recommended_order, and practice_advice."
                    ),
                },
            ],
            text_format=AttemptStudyPlanRead,
        )
    except (OpenAIError, ValidationError, ValueError) as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="AI returned invalid study plan data. Please try again.",
        ) from exc

    if response.output_parsed is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="AI returned invalid study plan data. Please try again.",
        )

    return AttemptStudyPlanRead(
        attempt_id=attempt.id,
        weak_topics=response.output_parsed.weak_topics,
        what_to_study=response.output_parsed.what_to_study,
        recommended_order=response.output_parsed.recommended_order,
        practice_advice=response.output_parsed.practice_advice,
    )


def _get_attempt_answers(db: Session, attempt_id: int) -> list[QuizAttemptAnswer]:
    return list(
        db.scalars(
            select(QuizAttemptAnswer).where(QuizAttemptAnswer.attempt_id == attempt_id).order_by(QuizAttemptAnswer.id)
        ).all()
    )


def _build_attempt_mistakes(db: Session, attempt_id: int) -> list[dict[str, str]]:
    answers = _get_attempt_answers(db, attempt_id)
    mistakes: list[dict[str, str]] = []

    for answer in answers:
        if answer.is_correct:
            continue

        question = db.get(QuizQuestion, answer.question_id)
        selected_option = db.get(QuizOption, answer.selected_option_id)
        correct_option = db.scalar(
            select(QuizOption).where(QuizOption.question_id == answer.question_id, QuizOption.is_correct.is_(True))
        )
        if question is None or selected_option is None or correct_option is None:
            continue

        mistakes.append(
            {
                "question_text": question.question_text,
                "incorrect_answer": selected_option.option_text,
                "correct_answer": correct_option.option_text,
            }
        )

    return mistakes


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
