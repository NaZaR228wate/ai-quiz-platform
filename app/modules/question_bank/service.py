from fastapi import HTTPException, status
from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.modules.question_bank.models import QuestionBankOption, QuestionBankQuestion
from app.modules.question_bank.schemas import (
    QuestionBankQuestionCreate,
    QuestionBankQuestionRead,
    QuestionBankQuestionUpdate,
    QuizFromQuestionBankCreate,
)
from app.modules.quizzes.models import Quiz, QuizOption, QuizQuestion
from app.modules.topics.service import get_topic
from app.modules.users.models import User


def list_bank_questions(db: Session, teacher: User) -> list[QuestionBankQuestionRead]:
    questions = list(
        db.scalars(
            select(QuestionBankQuestion)
            .where(QuestionBankQuestion.teacher_id == teacher.id)
            .order_by(QuestionBankQuestion.id.desc())
        ).all()
    )
    return _build_question_reads(db, questions)


def create_bank_question(db: Session, teacher: User, data: QuestionBankQuestionCreate) -> QuestionBankQuestionRead:
    question = QuestionBankQuestion(
        teacher_id=teacher.id,
        question_text=data.question_text,
        question_type=data.question_type,
    )
    db.add(question)
    db.flush()
    options = [
        QuestionBankOption(question_id=question.id, option_text=option.option_text, is_correct=option.is_correct)
        for option in data.options
    ]
    db.add_all(options)
    db.commit()
    db.refresh(question)
    return QuestionBankQuestionRead.model_validate({**question.__dict__, "options": options})


def update_bank_question(
    db: Session,
    teacher: User,
    question_id: int,
    data: QuestionBankQuestionUpdate,
) -> QuestionBankQuestionRead:
    question = _get_bank_question(db, teacher, question_id)
    fields = data.model_dump(exclude_unset=True)

    if "question_text" in fields:
        question.question_text = fields["question_text"]
    if "question_type" in fields and fields["question_type"] is not None:
        question.question_type = fields["question_type"]
    if "options" in fields and fields["options"] is not None:
        db.execute(delete(QuestionBankOption).where(QuestionBankOption.question_id == question.id))
        db.flush()
        db.add_all(
            [
                QuestionBankOption(
                    question_id=question.id,
                    option_text=option["option_text"],
                    is_correct=option["is_correct"],
                )
                for option in fields["options"]
            ]
        )

    db.commit()
    db.refresh(question)
    return _build_question_reads(db, [question])[0]


def delete_bank_question(db: Session, teacher: User, question_id: int) -> None:
    question = _get_bank_question(db, teacher, question_id)
    db.execute(delete(QuestionBankOption).where(QuestionBankOption.question_id == question.id))
    db.delete(question)
    db.commit()


def create_quiz_from_bank_questions(
    db: Session,
    teacher: User,
    topic_id: int,
    data: QuizFromQuestionBankCreate,
) -> Quiz:
    topic = get_topic(db, teacher, topic_id)
    bank_questions = list(
        db.scalars(
            select(QuestionBankQuestion)
            .where(QuestionBankQuestion.teacher_id == teacher.id, QuestionBankQuestion.id.in_(data.question_ids))
            .order_by(QuestionBankQuestion.id)
        ).all()
    )
    if len(bank_questions) != len(set(data.question_ids)):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Some question bank items were not found")

    options_by_question = _get_options_by_question(db, [question.id for question in bank_questions])
    quiz = Quiz(topic_id=topic.id, title=data.title, description=data.description)
    db.add(quiz)
    db.flush()

    for bank_question in bank_questions:
        quiz_question = QuizQuestion(
            quiz_id=quiz.id,
            question_text=bank_question.question_text,
            question_type=bank_question.question_type,
        )
        db.add(quiz_question)
        db.flush()
        db.add_all(
            [
                QuizOption(
                    question_id=quiz_question.id,
                    option_text=option.option_text,
                    is_correct=option.is_correct,
                )
                for option in options_by_question.get(bank_question.id, [])
            ]
        )

    db.commit()
    db.refresh(quiz)
    return quiz


def _get_bank_question(db: Session, teacher: User, question_id: int) -> QuestionBankQuestion:
    question = db.scalar(
        select(QuestionBankQuestion).where(
            QuestionBankQuestion.id == question_id,
            QuestionBankQuestion.teacher_id == teacher.id,
        )
    )
    if question is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Question not found")
    return question


def _build_question_reads(db: Session, questions: list[QuestionBankQuestion]) -> list[QuestionBankQuestionRead]:
    options_by_question = _get_options_by_question(db, [question.id for question in questions])
    return [
        QuestionBankQuestionRead.model_validate(
            {**question.__dict__, "options": options_by_question.get(question.id, [])}
        )
        for question in questions
    ]


def _get_options_by_question(db: Session, question_ids: list[int]) -> dict[int, list[QuestionBankOption]]:
    if not question_ids:
        return {}
    options = list(
        db.scalars(
            select(QuestionBankOption)
            .where(QuestionBankOption.question_id.in_(question_ids))
            .order_by(QuestionBankOption.id)
        ).all()
    )
    options_by_question: dict[int, list[QuestionBankOption]] = {}
    for option in options:
        options_by_question.setdefault(option.question_id, []).append(option)
    return options_by_question
