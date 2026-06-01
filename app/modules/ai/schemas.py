from typing import Literal

from pydantic import BaseModel, Field


class GenerateQuizRequest(BaseModel):
    questions_count: int = Field(ge=1, le=10)


class GenerateQuizResponse(BaseModel):
    quiz_id: int
    material_id: int
    title: str
    questions_count: int


class GeneratedQuizOption(BaseModel):
    option_text: str
    is_correct: bool


class GeneratedQuizQuestion(BaseModel):
    question_text: str
    question_type: Literal["single_choice"]
    options: list[GeneratedQuizOption]


class GeneratedQuizPayload(BaseModel):
    title: str
    description: str
    questions: list[GeneratedQuizQuestion]
