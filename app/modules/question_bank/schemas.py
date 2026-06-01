from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator


QuestionBankQuestionType = Literal["single_choice", "multiple_choice"]


class QuestionBankOptionCreate(BaseModel):
    option_text: str = Field(min_length=1)
    is_correct: bool = False


class QuestionBankOptionRead(BaseModel):
    id: int
    question_id: int
    option_text: str
    is_correct: bool

    model_config = ConfigDict(from_attributes=True)


class QuestionBankQuestionCreate(BaseModel):
    question_text: str = Field(min_length=1)
    question_type: QuestionBankQuestionType = "single_choice"
    options: list[QuestionBankOptionCreate] = Field(min_length=2)

    @model_validator(mode="after")
    def validate_correct_answers(self):
        correct_count = sum(option.is_correct for option in self.options)
        if self.question_type == "single_choice" and correct_count != 1:
            raise ValueError("single_choice question must have exactly one correct option")
        if self.question_type == "multiple_choice" and correct_count < 1:
            raise ValueError("multiple_choice question must have at least one correct option")
        return self


class QuestionBankQuestionUpdate(BaseModel):
    question_text: str | None = Field(default=None, min_length=1)
    question_type: QuestionBankQuestionType | None = None
    options: list[QuestionBankOptionCreate] | None = Field(default=None, min_length=2)

    @model_validator(mode="after")
    def validate_correct_answers(self):
        if self.options is None:
            return self
        question_type = self.question_type or "single_choice"
        correct_count = sum(option.is_correct for option in self.options)
        if question_type == "single_choice" and correct_count != 1:
            raise ValueError("single_choice question must have exactly one correct option")
        if question_type == "multiple_choice" and correct_count < 1:
            raise ValueError("multiple_choice question must have at least one correct option")
        return self


class QuestionBankQuestionRead(BaseModel):
    id: int
    teacher_id: int
    question_text: str
    question_type: str
    created_at: datetime
    options: list[QuestionBankOptionRead]

    model_config = ConfigDict(from_attributes=True)


class QuizFromQuestionBankCreate(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    description: str | None = None
    question_ids: list[int] = Field(min_length=1)
