from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class MaterialCreate(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    content_text: str = Field(min_length=1)


class MaterialUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=255)
    content_text: str | None = Field(default=None, min_length=1)


class MaterialRead(BaseModel):
    id: int
    topic_id: int
    title: str
    content_text: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
