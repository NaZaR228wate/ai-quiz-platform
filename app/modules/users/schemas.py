from datetime import datetime

from pydantic import BaseModel, ConfigDict


class UserRead(BaseModel):
    id: int
    email: str
    full_name: str | None
    role: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
