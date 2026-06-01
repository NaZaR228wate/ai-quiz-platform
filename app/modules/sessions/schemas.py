from datetime import datetime

from pydantic import BaseModel, ConfigDict


class QuizSessionRead(BaseModel):
    id: int
    quiz_id: int
    teacher_id: int
    code: str
    status: str
    created_at: datetime
    closed_at: datetime | None

    model_config = ConfigDict(from_attributes=True)


class SessionQuizRead(BaseModel):
    id: int
    title: str
    description: str | None


class QuizSessionByCodeRead(BaseModel):
    id: int
    quiz_id: int
    code: str
    status: str
    quiz: SessionQuizRead


class TeacherSessionSummaryRead(BaseModel):
    id: int
    code: str
    quiz_id: int
    quiz_title: str
    course_title: str | None
    topic_title: str | None
    status: str
    created_at: datetime
    closed_at: datetime | None
    attempts_count: int


class SessionAttemptSummaryRead(BaseModel):
    id: int
    quiz_id: int
    session_id: int
    student_id: int
    student_name: str | None
    student_email: str
    score: int
    total_questions: int
    percent: int
    created_at: datetime


class SessionAnalyticsRead(BaseModel):
    session_id: int
    quiz_id: int
    status: str
    students_count: int
    finished_count: int
    average_score: float
    average_percent: int
    total_questions: int
    best_score: int
    worst_score: int
