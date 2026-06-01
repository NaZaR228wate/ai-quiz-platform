from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class CourseCreate(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    description: str | None = None


class CourseUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=255)
    description: str | None = None


class CourseRead(BaseModel):
    id: int
    teacher_id: int
    title: str
    description: str | None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
