from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class AttemptAnswerCreate(BaseModel):
    question_id: int
    selected_option_id: int


class AttemptCreate(BaseModel):
    answers: list[AttemptAnswerCreate] = Field(min_length=1)


class AttemptAnswerRead(BaseModel):
    id: int
    attempt_id: int
    question_id: int
    selected_option_id: int
    is_correct: bool
    correct_option_id: int | None = None

    model_config = ConfigDict(from_attributes=True)


class AttemptRead(BaseModel):
    id: int
    quiz_id: int
    session_id: int | None = None
    student_id: int
    score: int
    total_questions: int
    created_at: datetime
    answers: list[AttemptAnswerRead]

    model_config = ConfigDict(from_attributes=True)


class QuizAnalyticsRead(BaseModel):
    quiz_id: int
    attempts_count: int
    average_score: float
    average_percent: int
    total_questions: int
    best_score: int
    worst_score: int


class AttemptMistakeExplanationRead(BaseModel):
    question_text: str
    incorrect_answer: str
    correct_answer: str
    explanation: str


class AttemptExplanationRead(BaseModel):
    attempt_id: int
    explanations: list[AttemptMistakeExplanationRead]


class AttemptStudyPlanRead(BaseModel):
    attempt_id: int
    weak_topics: list[str]
    what_to_study: list[str]
    recommended_order: list[str]
    practice_advice: list[str]


class WeakTopicRead(BaseModel):
    topic_id: int
    topic_title: str
    average_score: int
    attempts_count: int
