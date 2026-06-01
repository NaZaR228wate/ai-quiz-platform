from fastapi import HTTPException, status
from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.modules.courses.models import Course
from app.modules.quizzes.models import Quiz, QuizOption, QuizQuestion
from app.modules.quizzes.schemas import (
    QuestionCreate,
    QuestionRead,
    QuestionStudentRead,
    QuizCreate,
    QuizUpdate,
)
from app.modules.topics.models import Topic
from app.modules.topics.service import get_topic
from app.modules.users.models import User


def create_quiz(db: Session, teacher: User, topic_id: int, data: QuizCreate) -> Quiz:
    topic = get_topic(db, teacher, topic_id)
    quiz = Quiz(
        topic_id=topic.id,
        title=data.title,
        description=data.description,
    )
    db.add(quiz)
    db.commit()
    db.refresh(quiz)
    return quiz


def list_quizzes(db: Session, teacher: User, topic_id: int) -> list[Quiz]:
    get_topic(db, teacher, topic_id)
    statement = select(Quiz).where(Quiz.topic_id == topic_id).order_by(Quiz.id)
    return list(db.scalars(statement).all())


def get_quiz(db: Session, teacher: User, quiz_id: int) -> Quiz:
    statement = (
        select(Quiz)
        .join(Topic, Quiz.topic_id == Topic.id)
        .join(Course, Topic.course_id == Course.id)
        .where(Quiz.id == quiz_id, Course.teacher_id == teacher.id)
    )
    quiz = db.scalar(statement)
    if quiz is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Quiz not found")
    return quiz


def get_quiz_for_user(db: Session, user: User, quiz_id: int) -> Quiz:
    if user.role == "teacher":
        return get_quiz(db, user, quiz_id)
    if user.role != "student":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    quiz = db.get(Quiz, quiz_id)
    if quiz is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Quiz not found")
    return quiz


def update_quiz(db: Session, teacher: User, quiz_id: int, data: QuizUpdate) -> Quiz:
    quiz = get_quiz(db, teacher, quiz_id)
    fields = data.model_dump(exclude_unset=True)

    if fields.get("title") is not None:
        quiz.title = fields["title"]
    if "description" in fields:
        quiz.description = fields["description"]

    db.commit()
    db.refresh(quiz)
    return quiz


def delete_quiz(db: Session, teacher: User, quiz_id: int) -> None:
    from app.modules.attempts.models import QuizAttempt, QuizAttemptAnswer
    from app.modules.sessions.models import QuizSession

    quiz = get_quiz(db, teacher, quiz_id)
    question_ids = db.scalars(select(QuizQuestion.id).where(QuizQuestion.quiz_id == quiz.id)).all()
    attempt_ids = db.scalars(select(QuizAttempt.id).where(QuizAttempt.quiz_id == quiz.id)).all()

    if attempt_ids:
        db.execute(delete(QuizAttemptAnswer).where(QuizAttemptAnswer.attempt_id.in_(attempt_ids)))
    db.execute(delete(QuizAttempt).where(QuizAttempt.quiz_id == quiz.id))

    if question_ids:
        db.execute(delete(QuizOption).where(QuizOption.question_id.in_(question_ids)))
    db.execute(delete(QuizQuestion).where(QuizQuestion.quiz_id == quiz.id))
    db.execute(delete(QuizSession).where(QuizSession.quiz_id == quiz.id))
    db.delete(quiz)
    db.commit()


def create_question(db: Session, teacher: User, quiz_id: int, data: QuestionCreate) -> QuestionRead:
    quiz = get_quiz(db, teacher, quiz_id)
    question = QuizQuestion(
        quiz_id=quiz.id,
        question_text=data.question_text,
        question_type=data.question_type,
    )
    db.add(question)
    db.flush()

    options = [
        QuizOption(
            question_id=question.id,
            option_text=option.option_text,
            is_correct=option.is_correct,
        )
        for option in data.options
    ]
    db.add_all(options)
    db.commit()
    db.refresh(question)

    return QuestionRead.model_validate({**question.__dict__, "options": options})


def list_questions(db: Session, teacher: User, quiz_id: int) -> list[QuestionRead]:
    quiz = get_quiz(db, teacher, quiz_id)
    return _list_questions_with_options(db, quiz, include_correct_answers=True)


def list_questions_for_user(db: Session, user: User, quiz_id: int) -> list[QuestionRead] | list[QuestionStudentRead]:
    quiz = get_quiz_for_user(db, user, quiz_id)
    return _list_questions_with_options(db, quiz, include_correct_answers=user.role == "teacher")


def _list_questions_with_options(
    db: Session,
    quiz: Quiz,
    include_correct_answers: bool,
) -> list[QuestionRead] | list[QuestionStudentRead]:
    questions = list(
        db.scalars(select(QuizQuestion).where(QuizQuestion.quiz_id == quiz.id).order_by(QuizQuestion.id)).all()
    )
    if not questions:
        return []

    question_ids = [question.id for question in questions]
    options = list(
        db.scalars(select(QuizOption).where(QuizOption.question_id.in_(question_ids)).order_by(QuizOption.id)).all()
    )
    options_by_question: dict[int, list[QuizOption]] = {}
    for option in options:
        options_by_question.setdefault(option.question_id, []).append(option)

    schema = QuestionRead if include_correct_answers else QuestionStudentRead
    return [
        schema.model_validate({**question.__dict__, "options": options_by_question.get(question.id, [])})
        for question in questions
    ]
