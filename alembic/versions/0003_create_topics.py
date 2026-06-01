"""create topics

Revision ID: 0003_create_topics
Revises: 0002_create_courses
Create Date: 2026-05-30

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "0003_create_topics"
down_revision: Union[str, Sequence[str], None] = "0002_create_courses"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "topics",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("course_id", sa.Integer(), nullable=False),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["course_id"], ["courses.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_topics_course_id"), "topics", ["course_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_topics_course_id"), table_name="topics")
    op.drop_table("topics")
