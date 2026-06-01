from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator


class QuizCreate(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    description: str | None = None


class QuizUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=255)
    description: str | None = None


class QuizRead(BaseModel):
    id: int
    topic_id: int
    title: str
    description: str | None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class OptionCreate(BaseModel):
    option_text: str = Field(min_length=1)
    is_correct: bool = False


class OptionRead(BaseModel):
    id: int
    question_id: int
    option_text: str
    is_correct: bool

    model_config = ConfigDict(from_attributes=True)


class OptionStudentRead(BaseModel):
    id: int
    question_id: int
    option_text: str

    model_config = ConfigDict(from_attributes=True)


class QuestionCreate(BaseModel):
    question_text: str = Field(min_length=1)
    question_type: Literal["single_choice"] = "single_choice"
    options: list[OptionCreate] = Field(min_length=2)

    @model_validator(mode="after")
    def validate_single_choice(self):
        correct_count = sum(option.is_correct for option in self.options)
        if self.question_type == "single_choice" and correct_count != 1:
            raise ValueError("single_choice question must have exactly one correct option")
        return self


class QuestionRead(BaseModel):
    id: int
    quiz_id: int
    question_text: str
    question_type: str
    created_at: datetime
    options: list[OptionRead]

    model_config = ConfigDict(from_attributes=True)


class QuestionStudentRead(BaseModel):
    id: int
    quiz_id: int
    question_text: str
    question_type: str
    created_at: datetime
    options: list[OptionStudentRead]

    model_config = ConfigDict(from_attributes=True)
