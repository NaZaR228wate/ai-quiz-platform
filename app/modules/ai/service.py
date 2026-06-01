from fastapi import HTTPException, status
from openai import OpenAI, OpenAIError
from pydantic import ValidationError
from sqlalchemy.orm import Session

from app.core.config import settings
from app.modules.ai.schemas import GenerateQuizRequest, GenerateQuizResponse, GeneratedQuizPayload
from app.modules.materials.service import get_material
from app.modules.quizzes.models import Quiz, QuizOption, QuizQuestion
from app.modules.users.models import User


def generate_quiz_from_material(
    db: Session,
    teacher: User,
    material_id: int,
    data: GenerateQuizRequest,
) -> GenerateQuizResponse:
    material = get_material(db, teacher, material_id)
    content = material.content_text.strip()
    if not content:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Material content is empty")

    generated_quiz = _generate_quiz_with_openai(material.title, content, data.questions_count)
    _validate_generated_quiz(generated_quiz, data.questions_count)

    return _save_generated_quiz(db, material.id, material.topic_id, generated_quiz)


def _generate_quiz_with_openai(material_title: str, content: str, questions_count: int) -> GeneratedQuizPayload:
    if not settings.openai_api_key:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="OpenAI API key is not configured")

    client = OpenAI(api_key=settings.openai_api_key)
    quiz_title = f"Generated quiz from {material_title}"

    try:
        response = client.responses.parse(
            model=settings.openai_model,
            input=[
                {
                    "role": "system",
                    "content": (
                        "You generate educational quizzes. Return only a valid structured quiz. "
                        "Every question must be single_choice with at least 3 options and exactly 1 correct option."
                    ),
                },
                {
                    "role": "user",
                    "content": (
                        f"Create exactly {questions_count} quiz questions from this material.\n"
                        f"Quiz title must be: {quiz_title}\n"
                        f"Material title: {material_title}\n"
                        f"Material content:\n{content}"
                    ),
                },
            ],
            text_format=GeneratedQuizPayload,
        )
    except (OpenAIError, ValidationError, ValueError) as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="OpenAI returned invalid quiz data",
        ) from exc

    if response.output_parsed is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="OpenAI returned invalid quiz data",
        )

    return response.output_parsed


def _validate_generated_quiz(generated_quiz: GeneratedQuizPayload, questions_count: int) -> None:
    if len(generated_quiz.questions) != questions_count:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="OpenAI returned invalid quiz data",
        )

    for question in generated_quiz.questions:
        if question.question_type != "single_choice":
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="OpenAI returned invalid quiz data",
            )
        if len(question.options) < 3:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="OpenAI returned invalid quiz data",
            )
        correct_count = sum(option.is_correct for option in question.options)
        if correct_count != 1:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="OpenAI returned invalid quiz data",
            )


def _save_generated_quiz(
    db: Session,
    material_id: int,
    topic_id: int,
    generated_quiz: GeneratedQuizPayload,
) -> GenerateQuizResponse:
    quiz = Quiz(
        topic_id=topic_id,
        title=generated_quiz.title,
        description=generated_quiz.description,
    )
    db.add(quiz)
    db.flush()

    for generated_question in generated_quiz.questions:
        question = QuizQuestion(
            quiz_id=quiz.id,
            question_text=generated_question.question_text,
            question_type=generated_question.question_type,
        )
        db.add(question)
        db.flush()

        db.add_all([
            QuizOption(question_id=question.id, option_text=option.option_text, is_correct=option.is_correct)
            for option in generated_question.options
        ])

    db.commit()
    db.refresh(quiz)

    return GenerateQuizResponse(
        quiz_id=quiz.id,
        material_id=material_id,
        title=quiz.title,
        questions_count=len(generated_quiz.questions),
    )


def _build_mock_quiz(material_title: str, content: str, questions_count: int) -> GeneratedQuizPayload:
    quiz_title = f"Generated quiz from {material_title}"
    content_preview = content[:80]
    return GeneratedQuizPayload(
        title=quiz_title,
        description="Mock generated quiz",
        questions=[
            {
                "question_text": f"Question {index} based on material: {content_preview}...",
                "question_type": "single_choice",
                "options": [
                    {"option_text": f"Correct answer {index}", "is_correct": True},
                    {"option_text": f"Wrong answer {index}A", "is_correct": False},
                    {"option_text": f"Wrong answer {index}B", "is_correct": False},
                ],
            }
            for index in range(1, questions_count + 1)
        ],
    )
